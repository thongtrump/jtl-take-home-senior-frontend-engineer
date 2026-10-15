# AI Journey — Key Prompts & Dialogue

This document curates the critical interactions, technical questions, and prompts exchanged during the design and development of the take-home task solution.

---

## 1. Initial Assessment & Track Selection
- **Human**: `/grill-me`
- **Agent**: Explored the workspace repository to identify the three take-home tracks (Backend, Frontend, DevOps) and presented a structured decision inquiry.
- **Human**: `Senior Software Engineer (Frontend) — React + TypeScript, Vite, Turborepo monorepo, TanStack`
- **Takeaway**: Confirmed frontend track and initiated the requirement walk-through for the architecture tree.

---

## 2. Monorepo Layout & Package Manager Decision
- **Agent**: Proposed keeping the monorepo root isolated inside `senior-frontend-engineer/` versus the repository root.
- **Human**: Selected `(Recommended) Inside senior-frontend-engineer/` to keep root pristine and maintain original instructions.
- **Agent**: Inquired about package manager (`pnpm` vs `npm` vs `yarn`).
- **Human**: Selected `pnpm` (with `pnpm-workspace.yaml`), optimizing for Turborepo symlinking and strict dependency boundaries.

---

## 3. Mock Data Layer Strategy
- **Agent**: Evaluated three options: In-memory async mock client with localStorage, Mock Service Worker (MSW), or separate mock server process.
- **Human**: Selected `In-memory async API client with artificial latency & localStorage persistence + an interactive "Simulate Error" toggle`.
- **Takeaway**: Zero configuration friction across the monorepo while granting reviewers an explicit UI control to trigger optimistic update rollbacks interactively.

---

## 4. Architectural Deep Dive: Jotai vs Zustand
- **Agent**: Proposed Jotai atom scopes (`selectedUserIdAtom`, `simulateApiErrorAtom`).
- **Human**: *"I don't understand why this take home assignment tell me to do Jotai but not Zustand, is there any difference between them?"*
- **Agent**: Detailed comparative analysis:
  - **Mental Model**: Centralized single store (Zustand) vs distributed fine-grained atomic primitives (Jotai).
  - **Turborepo Boundaries**: Jotai allows defining atomic primitives without declaring a monolithic store schema that couples feature domains.
  - **Complementing TanStack Query**: TanStack Query manages 95% of server state, so a centralized store often becomes an anti-pattern (duplicate cache / state dumping ground). Jotai provides isolated reactive primitives for the remaining 5% of UI state.
- **Human**: Confirmed adopting Jotai for `selectedUserIdAtom` (active user cross-cutting context) and `simulateApiErrorAtom` (global rollback test harness).

---

## 5. Technology Modernization: Tailwind CSS v4
- **Agent**: Proposed Tailwind CSS v3 with Lucide icons.
- **Human**: *"Tailwind css already has v4, the latest is 4.3.3. Why do we have to use v3?"*
- **Agent**: Embraced the modern upgrade! Highlighted that Tailwind CSS v4's `@tailwindcss/vite` plugin eliminates legacy `tailwind.config.js` and `postcss.config.js`, using native `@import "tailwindcss";` and `@source` directives for monorepo package scanning.
- **Human**: Confirmed Tailwind CSS v4.

---

## 6. Package Boundaries & Dependency Inversion Pattern
- **Agent**: Inquired about how to enforce the requirement that `packages/todos` cannot depend on `packages/users`.
- **Human**: Enforced strict isolation: `packages/todos` must not import `packages/users`. Assignee selection is handled via dependency inversion, where the composition root (`apps/web`) injects `UserSelect` from `packages/users`.
- **Architecture**: `CreateTodoForm` exposes a controlled render prop: `renderAssignee?: (props: AssigneeRenderProps) => ReactNode`.

---

## 7. Form Library Decision (initial, later reversed)
- **Agent**: Offered three options for form handling: Zod + React Hook Form, Zod + a lightweight custom hook, or TanStack Form.
- **Human**: Accepted the recommended `Zod + React Hook Form (@hookform/resolvers/zod)`.
- **Outcome**: This decision was **reversed** after manual QA (see section 8). It was over-engineering for 1-2 field forms.

---

## 8. Manual QA & Debugging Intervention (human-led)

After the first build passed (`pnpm run build` green, no type errors), the human engineer performed manual QA in the browser and found two runtime/architectural bugs that neither the type checker nor the build could catch. The human diagnosed root causes and directed the fixes; the agent implemented them.

### Bug 1: Disconnected form state (opaque slot + `react-hook-form` over-engineering)
- **Human report**: On first load of `/todos`, picking *any* user in the Assignee dropdown still produced the validation error "Please select or provide an assignee". Also, switching the top User Filter to `usr-2` and back to "All Users" left the form silently stuck on `usr-2`, so later submissions assigned tasks to the wrong user regardless of what the dropdown displayed.
- **Human diagnosis**: `CreateTodoForm` owned its state via `react-hook-form`, while `<UserSelect />` was injected from `apps/web` as an opaque `React.ReactNode` without being registered or controlled by `useForm`. The visible control and the form's internal value were two unrelated sources of truth. Compounding that, the sync effect only ran `if (defaultAssigneeId) setValue(...)`, so it never reset when the default became `null`.
- **Human direction**:
  1. Remove `react-hook-form` and `@hookform/resolvers` from the whole monorepo (`packages/users` and `packages/todos`), since a form library is unnecessary overhead for 1-2 fields.
  2. Replace with controlled `useState` + direct `zod.safeParse()` validation.
  3. Replace the opaque slot with a controlled render prop: `renderAssignee?: (props: { value: string; onChange: (val: string) => void; error?: string; disabled?: boolean }) => ReactNode`, so the injected `<UserSelect />` is 100% controlled and synchronized with the form state, including when `defaultAssigneeId` resets to `null`.
- **Agent implementation**: Rewrote `CreateTodoForm` and `CreateUserForm` with `useState` and `safeParse`; `useEffect` now sets `assigneeId` to `defaultAssigneeId ?? ''` on every change; `apps/web/src/routes/todos/index.tsx` passes `renderAssignee` and wires `UserSelect`'s `value`/`onChange`/`error`/`disabled` to it. While wiring it, the agent also noticed `UserSelect` spread `{...props}` *after* `disabled`, which let a caller-supplied value clobber the loading-disabled state, and fixed that.

### Bug 2: Duplicate optimistic cache insertion ("Syncing..." stuck forever)
- **Human report**: With the "All Users" filter, a created ToDo sometimes left an orphaned DOM node showing the "Syncing..." badge permanently until page reload.
- **Human diagnosis**: With `activeFilterUserId === null`, `targetQueryKey = todoKeys.list(null)` and `allQueryKey = todoKeys.list(null)` are the **same** key (`['todos','list',{userId:'all'}]`). `onMutate` called `setQueryData` on `targetQueryKey` and then *unconditionally* again on `allQueryKey` with the same `optimisticItem`, so the same `tempId` was inserted twice into one cached array. `TodoList` then rendered duplicate React keys (`key={todo.id}`), and reconciliation broke once the mutation settled and one of them was replaced, leaving an orphaned node.
- **Human direction**: Only cancel/snapshot/update/roll back `allQueryKey` when `Boolean(activeFilterUserId)` is true (i.e. when the two keys are actually distinct).
- **Agent implementation**: Introduced `hasDistinctAllKey = Boolean(activeFilterUserId)` in `useCreateTodo`; the context's `allKey` is now optional and only set in that case. Two small hardening additions beyond the request: `tempId` now has a random suffix (`Date.now()` alone can collide on rapid submits and reproduce the same duplicate-key failure), and `onError` falls back to stripping the item by `tempId` when no snapshot existed.

### Why this matters
Both defects passed the compiler and a clean build. They were found only by a human exercising real flows (filter A -> filter B -> "All", then create). The prompts and verification here are the evidence of that: the AI produced a plausible, type-correct design; the human found where it was wrong, identified the root cause, and chose the simpler architecture.

---

## 9. UX Testing & Cascading Refetch Bug Intervention (human-led)

During further UX testing with "Simulate API Error" enabled, the human reviewer identified a critical cascading failure in the query/mock design and error UX.

### Bug 3: Cascading query failure on rollback (`onSettled` refetch crash)
- **Human report**: When creating a ToDo fails with simulated error, `useCreateTodo`'s `onSettled` calls `queryClient.invalidateQueries({ queryKey: todoKeys.all })`. However, `simulateApiErrorAtom` was passed into *both* `createTodo` (mutation) and `getTodos` (query). As a result, the background refetch triggered by `onSettled` *also* threw a 500 error! This caused `TodoList` to destroy the entire existing list of tasks and replace it with an unclosable full-width error banner ("Error loading ToDos"), completely ruining the view.
- **Human direction**:
  1. In `MockDatabase` / `useTodos.ts`, "Simulate API Error" must ONLY apply to mutations (e.g. creating/updating todos), NEVER to query reads (`getTodos`).
  2. In `useTodos.ts`, configure `placeholderData: keepPreviousData` (TanStack Query v5 pattern) so that even if a background refetch encounters an issue, the UI never destroys existing cached items.

### Bug 4: Invasive Error UX (inline Alert replacing list & cluttering form)
- **Human report**: Displaying large static Alert banners inside `CreateTodoForm` and unclosable error banners replacing `TodoList` is poor UX.
- **Human direction**:
  1. Remove the invasive inline Alert banner inside `CreateTodoForm` and `TodoList`.
  2. Implement a clean, lightweight, non-blocking Toast notification system (`apps/web` or `@jtl/shared`).
  3. When `useCreateTodo` encounters an error (`onError`), fire a floating Toast alert at the bottom-right: `"Failed to create ToDo (500 Error) — Optimistic change rolled back."`
  4. Keep the existing tasks list completely visible and intact when rollback happens.

- **Agent implementation**:
  - Strongly typed `MockDatabase` with `ReadOptions` vs `MutationOptions`, enforcing at compile time that read operations (`getUsers`, `getUserById`, `getTodos`) cannot accept `simulateError`. Created `ApiError` with HTTP status code.
  - Added `placeholderData: keepPreviousData` to `useTodos` and removed `simulateApiErrorAtom` from all read query hooks.
  - Built a floating, accessible Jotai-powered toast notification system in `@jtl/shared` (`toastsAtom`, `useToast()`, `<ToastViewport />`), mounted in `apps/web/src/routes/__root.tsx`.
  - Replaced inline error alerts in `CreateTodoForm` and `TodoList` with non-blocking toasts and non-destructive list rendering.

---

## 10. Decoupling Global User Persona from Local View Filters (human-led)

During UX testing of the User Directory and ToDo pages, the human reviewer identified a significant UX flaw and architectural antipattern: the global "Active User" persona context was coupled directly to the local ToDo page filter.

### Bug 5: Unwanted Global Side-Effect (Local Filter Overwriting Global Identity)
- **Human report**: In `apps/web/src/routes/todos/index.tsx`, changing the "Filter by User" dropdown called `setSelectedUserId(e.target.value || null)`, directly mutating `selectedUserIdAtom`. When an evaluator changed the filter on `/todos` simply to view someone else's tasks, it immediately overwrote the global "Active User" persona badge in the top navigation bar. Selecting "All Users" cleared the Active User entirely!
- **Human diagnosis**:
  - **Active User** (Jotai `selectedUserIdAtom`) is an app-wide identity/persona context set intentionally via the "Select" button in `/users` or the header.
  - **Filter by User** is a page-level view filter that MUST belong strictly to URL Search Params (`/todos?userId=...`) via TanStack Router.
  - Mutating global state in response to a local filter interaction caused unexpected side effects across the entire application and broke URL shareability.
- **Human direction**:
  1. Decouple page filter from Jotai: read `selectedUserId` as read-only context (`useAtomValue(selectedUserIdAtom)`).
  2. Use TanStack Router's `navigate({ search: (prev) => ({ ...prev, userId: newUserId || undefined }) })` when the user changes the filter dropdown.
  3. Precedence: If `search.userId` is defined in the URL, use it as `effectiveUserId`. If undefined, default to `null` (All Users), while pre-filling task creation with `effectiveUserId || activeUserId`.
  4. Changing the dropdown must **never** call `setSelectedUserId` or mutate Jotai state.

### Bug 6: Faint / Low-Contrast "View Details" Button on User Cards
- **Human report**: In the User Directory (`/users`), the button linking to `/users/:userId` next to "Select" had faint, unstyled text that blended into the white card background, making it look broken or invisible.
- **Human direction**: Style the "View Details" link with prominent, accessible, high-contrast button styling (`text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`).

- **Agent implementation**:
  - Updated `UserList.tsx` with high-contrast, accessible button styling, visible text, icon, and proper `aria-label`.
  - Refactored `apps/web/src/routes/todos/index.tsx` to read Jotai as read-only (`useAtomValue`), bind the dropdown strictly to `search.userId || ''`, and navigate URL search params cleanly on change (`navigate({ search: ... })`).
  - Verified with `pnpm run build` across all 4 packages with zero compiler warnings or type errors.

---

## 11. QA Round 3: Form Button Contrast, Scoped Assignee Locking, and Global Toast Orchestration (human-led)

During another round of manual QA, the human reviewer identified three usability and implementation defects:

### Bug 7: Submit Button Contrast & Tailwind Package Boundary Compilation
- **Human report**: In `CreateTodoForm.tsx` (and `@jtl/shared`'s `Button`), the primary submit button rendered white text against a transparent/white background, making the label completely illegible.
- **Human diagnosis & Root cause**: In `apps/web/src/index.css`, `@source "../../packages/*/src/**/*.{ts,tsx}"` was evaluated relative to `apps/web/src`, so it resolved to `apps/packages` (which does not exist). Because of this three-level vs two-level directory nesting discrepancy, Tailwind CSS v4 never scanned sibling workspace packages (`packages/shared`, `packages/todos`, `packages/users`). Classes defined exclusively in packages—such as `bg-indigo-600` on the primary button—were omitted from the built stylesheet.
- **Human direction**: Correct Tailwind CSS v4 `@source` directives to point accurately to `../../../packages/*/src/**/*.{ts,tsx}`, ensuring all design system utility classes compile properly across package boundaries.

### Bug 8: Unscoped Assignee Selection in User Profile View (`/users/:userId`)
- **Human report**: When navigating to a specific user's detail page (`/users/:userId`, e.g., `/users/usr-3`), the embedded ToDo creation form showed an editable text input for Assignee, allowing an evaluator to assign tasks to someone else while viewing user 3's profile.
- **Human diagnosis**: The route `/users/:userId` is a scoped context view. Allowing an arbitrary assignee breaks the mental model of managing tasks strictly for that user.
- **Human direction**: Make `CreateTodoForm` context-aware via `fixedAssigneeId?: string` and `fixedAssigneeLabel?: string`. When rendered on `/users/:userId`, lock the assignee field, display a clear read-only indicator (`Assigned to: @username [Locked in user view]` with a lock icon), and submit with `assigneeId: userId`.

### Bug 9: Toast Visibility & Orchestration during Optimistic Rollback
- **Human report**: When "Simulate API Error" was toggled and a ToDo creation failed, no Toast notification appeared on the screen.
- **Human diagnosis & Root cause**:
  1. Because of the aforementioned Tailwind package scanning issue, the `ToastViewport` container and `ToastItem` lacked styling and fixed positioning utility classes (`fixed`, `bottom-4`, `right-4`, `z-50`, `bg-white`, `border-rose-300`).
  2. The TanStack Router Devtools component was mounted at `position="bottom-right"`, colliding with and covering the toast notification area.
- **Human direction**:
  1. Fix Tailwind compilation so all toast styles and positioning rules compile.
  2. Verify that `useCreateTodo`'s `onError` explicitly triggers `toast.error("Failed to create ToDo (500 Error) — Optimistic change rolled back")`.
  3. Ensure the toast auto-dismisses after 4–5 seconds (`DEFAULT_DURATION_MS = 4500`).
  4. Dock TanStack Router Devtools to `bottom-left` so the bottom-right toast viewport remains unobstructed.

- **Agent implementation**:
  - Fixed relative `@source` path depth in `apps/web/src/index.css`, successfully compiling `bg-indigo-600` and all package classes.
  - Added `fixedAssigneeId`, `fixedAssigneeLabel`, and `readOnlyAssignee` props to `CreateTodoForm`, rendering a locked read-only card with `Lock` icon and `Badge`.
  - Wired `useUser(userId)` into `apps/web/src/routes/users/$userId.tsx` and locked task creation to `@username`.
  - Set toast auto-dismiss duration to `4500ms`, styled `ToastItem` with high-contrast borders and shadows, and docked DevTools to `bottom-left`.
  - Verified with `pnpm run build` across all 4 packages (`FULL TURBO`, 0 errors).

---

## 12. User Directory Flow Refinement: In-Place Feedback, Ordering Consistency, and Error Resilience (human-led)

During QA testing of the User creation flow (`/users`), the human reviewer identified a jarring navigation glitch, list ordering jumps, and form state loss.

### Bug 10: Premature Auto-Redirect on User Creation
- **Human report**: Submitting the user creation form automatically redirected to `/users/:userId`. When "Simulate API Error" was enabled, this either navigated to a broken/404 page or created a jarring navigation glitch as the form tried to navigate while the mutation was failing with 500.
- **Human diagnosis**: Forcing navigation away from `/users` breaks error simulation testing and prevents evaluators from verifying directory reactivity. Creating a user should provide immediate in-place feedback within the directory.
- **Human direction**:
  1. Remove the auto-redirect from `CreateUserForm` in `apps/web/src/routes/users/index.tsx`.
  2. Keep the user on `/users`. On success, reset the input, display a success toast (`User @username created successfully`), and render the new user at the top of the list.
  3. On error (500), stay on `/users`, retain the user's typed input in the form, and fire an error toast (`Failed to create user (500 Internal Server Error)`).

### Bug 11: List Ordering & Styling Inconsistency on User Creation
- **Human report**: When a user was created, it was appended to the bottom of the list without card styling matching existing items. Upon reload, it jumped to the top because `getUsers` sorts descending by `createdAt`.
- **Human diagnosis & Root cause**: `useCreateUser` only called `invalidateQueries({ queryKey: userKeys.lists() })` without updating the query cache with `setQueryData`, causing a temporary ordering mismatch until a background refetch finished. Furthermore, the cards lacked explicit `rounded-xl p-4 shadow-xs border border-slate-200 bg-white` styling.
- **Human direction**:
  1. Prepend `newUser` to the query cache: `setQueryData(userKeys.lists(), (old = []) => [newUser, ...old])`.
  2. Update `MockDatabase.createUser` to `unshift(newUser)` so persisted state immediately matches the sorted descending order.
  3. Explicitly style user cards with `rounded-xl p-4 shadow-xs border border-slate-200 bg-white`.

- **Agent implementation**:
  - Removed auto-navigation from `UsersPage` in `apps/web/src/routes/users/index.tsx`.
  - Updated `useCreateUser` in `packages/users/src/api/useUsers.ts` to prepend new users to the cache and dispatch the exact toast messages on success and failure.
  - Updated `MockDatabase.createUser` to unshift into storage.
  - Hardened user card styling in `UserList.tsx`.
  - Verified with `pnpm run build` across all 4 packages (`FULL TURBO`, 0 errors).

---

## 13. Final Application Polish & Rule Compliance Audit (human-led)

During the final polish review, the human evaluator directed an audit against the 8 primary assessment criteria, the removal of developer jargon from user-facing action buttons, and the elimination of redundant explanatory bloat across the application.

### Human Feedback & Requirements:
1. **Remove "(Optimistic)" and Technical Jargon from Buttons**:
   - In `CreateTodoForm.tsx`: change `"Create ToDo (Optimistic)"` to a clean, standard `"Create ToDo"`.
   - In `apps/web/src/routes/index.tsx`: change `"Explore ToDos & Optimistic Updates"` to `"Explore ToDos"`.
   - Clean up technical jargon in `CardDescription` and empty states (e.g. replace `"Submit an item to see TanStack Query optimistic updates in action"` with `"Add a new task to the team list"`).

2. **Remove Explanatory Bloat**:
   - On `/todos`: remove the 4-step tutorial card (`"How to verify Optimistic Rollback: ..."`) and unused `Sparkles` icon. Reviewers have the dedicated "Simulation Tools" toolbar in the header; intrusive inline documentation clutters the UI.
   - On the Home Page (`/`): simplify the route. Remove the dense 3-column dark evaluation card (`bg-slate-900`) and lengthy bulleted lists. Streamline it into a crisp, high-signal workspace dashboard with clean cards directing to Users and Tasks.

3. **Core Rule Compliance Verification**:
   - **Module boundaries**: Verified that `packages/users` and `packages/todos` never import each other; all shared code passes through `@jtl/shared` and composition is handled at the application shell (`apps/web`) via controlled render props.
   - **Routing**: Verified TanStack Router type safety across path parameters (`/users/$userId`) and search parameters (`/todos?userId=...` validated with Zod).
   - **Data and UX resilience**: Verified optimistic mutation snapshotting, error rollback, toast notifications, and `placeholderData: (previousData) => previousData` to prevent cascading unmounts.
   - **State**: Verified Jotai is used deliberately for cross-cutting session context (`selectedUserIdAtom`), reviewer controls (`simulateApiErrorAtom`, `apiLatencyAtom`), and global toast notifications (`toastsAtom`), with no server cache duplication.
   - **Separation of concerns**: Domain logic, mock database, query hooks, UI presentation, and application composition are strictly compartmentalized.
   - **Accessibility and validation**: Semantic forms, full ARIA attributes (`aria-invalid`, `aria-describedby`, `aria-busy`), and Zod validation schemas.
   - **Judgment & AI journey**: Documented all trade-offs, bug fixes, and AI steering in `README.md` and `ai-journey/`.

- **Agent implementation**:
  - Cleaned button labels and card descriptions in `CreateTodoForm.tsx` and `TodoList.tsx`.
  - Removed the tutorial card and unused imports from `apps/web/src/routes/todos/index.tsx`.
  - Streamlined `apps/web/src/routes/index.tsx` into a modern, uncluttered workspace dashboard.
  - Re-ran production build across all workspaces (`pnpm run build`), confirming 0 errors.




