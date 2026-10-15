# AI Journey — Engineering Judgment & Overrides

This document reflects on how AI was directed, where it added significant leverage, where its initial suggestions were challenged or overridden, and the human judgment applied throughout the process.

---

## 1. Where AI Excelled
- **Monorepo Scaffolding & Wiring**: Rapidly authoring interconnected `package.json`, `tsconfig.json` project references, and `pnpm-workspace.yaml` files with zero manual typo mistakes.
- **TanStack Query Optimistic Update Logic**: Implementing the overall `onMutate` -> `onError` -> `onSettled` cache mutation lifecycle with cancel queries, previous cache snapshots, and rollback semantics. Caveat: the first version had a real edge-case bug (the same cache key updated twice when no filter was active), which the AI did not catch and the human found in QA; see section 3.
- **Accessible UI Component Creation**: Generating accessible form primitives (`Button`, `Input`, `Select`, `Alert`, `Badge`) with ARIA attributes (`aria-invalid`, `aria-describedby`, error announcements). (The initial `react-hook-form` wiring of these primitives was later removed; see section 3.)

---

## 2. Key Human Overrides & Critical Technical Challenges

### A. The Tailwind CSS v4 Upgrade
- **AI Initial Stance**: Defaulted to proposing Tailwind CSS v3 with traditional `tailwind.config.js` and PostCSS configuration.
- **Human Challenge**: Asked why v3 should be used when Tailwind v4 (specifically 4.x) was already available and superior.
- **Judgment Applied**: The human correctly pushed for modern tooling. We replaced legacy JS config files with `@tailwindcss/vite` and utilized Tailwind v4's native `@source` directive in `index.css`:
  ```css
  @import "tailwindcss";
  @source "../../packages/*/src/**/*.{ts,tsx}";
  ```
  This simplified the build configuration, showcased forward-looking frontend judgment, and produced a cleaner repo.

### B. Architectural Justification: Jotai vs. Zustand
- **Context**: The candidate paused to question why the take-home specification called for Jotai over Zustand.
- **Judgment Applied**: Instead of blind adherence, we analyzed the monorepo implications. Zustand's centralized single-store paradigm encourages merging domain state into a single global state object, subtly coupling `packages/users` and `packages/todos`. In contrast, Jotai's atomic model allowed defining standalone atoms in `packages/shared` (`selectedUserIdAtom`, `simulateApiErrorAtom`) without declaring a global store schema, preserving strict package boundaries and preventing the global state "dumping ground" anti-pattern.

### C. Reviewer-Centric UX for Testing Rollbacks
- **Problem**: In most take-homes, evaluators have to artificially simulate network failure (e.g. going offline in DevTools or editing source code).
- **Judgment Applied**: We introduced an interactive **"Simulation Tools"** toolbar in the application header. Evaluators can toggle **"Simulate API Error"** and adjust latency with a slider. Submitting a ToDo immediately displays the optimistic item with a pulsing **"Syncing..."** badge, and when the simulated 500 error triggers, the item rolls back cleanly and surfaces an informative error banner.

### D. TypeScript & Environment Refinements
- **Encountered**: The AI initially used Node.js `process.env.NODE_ENV` inside a client-side Vite application.
- **Correction**: Replaced with Vite-native `import.meta.env.DEV` and added `"types": ["vite/client"]` to `tsconfig.json`, strictly adhering to modern bundler standards.

---

## 3. Manual QA Interventions: Two Bugs the AI (and the Compiler) Missed

The first implementation type-checked and built cleanly (`pnpm run build` green). Manual QA by the human engineer then exposed two defects that only show up when exercising real flows. In both cases the human identified the root cause and prescribed the fix; this section records exactly what happened.

### E. Opaque Slot + `react-hook-form`: Two Sources of Truth
- **Symptom (human-observed)**: On first load of `/todos`, choosing any user in the Assignee dropdown still failed validation with "Please select or provide an assignee". Switching the User Filter to `usr-2` and back to "All Users" left `react-hook-form` stuck on `usr-2`, so subsequent submissions were assigned to the wrong user regardless of what the dropdown showed.
- **Root cause (human-diagnosed)**: `CreateTodoForm` owned its value in `useForm`, but `<UserSelect />` was injected as an opaque `React.ReactNode` without being registered or controlled by the form. The visible control and the form value were independent. The sync effect (`if (defaultAssigneeId) setValue(...)`) also never fired for `null`, so the form could never "forget" a previous filter.
- **Why the AI got it wrong**: It optimized for the *package-boundary* requirement (todos must not import users) and reached for an opaque slot and a popular form library, without checking that an opaque `ReactNode` cannot participate in an external library's state. The design was plausible and type-correct, but it hid a state-ownership gap. It also over-engineered: a form library for two fields.
- **Human override**: Remove `react-hook-form` and `@hookform/resolvers` from the entire monorepo; use controlled `useState` + `zod.safeParse()`; and replace the opaque slot with a controlled render prop `renderAssignee({ value, onChange, error, disabled })` so the injected control is fully controlled by the form's state, including when `defaultAssigneeId` resets to `null`.
- **Result**: One source of truth for each field. The package boundary is intact (`packages/todos` still does not import `packages/users`; `apps/web` supplies `UserSelect` via the render prop). Two dependencies were removed and the forms got simpler, not more complex.
- **Lesson**: A boundary-preserving abstraction must carry *state* across the boundary, not just markup. And "don't add a library until the problem needs it."

### F. Duplicate Optimistic Insert when `targetQueryKey === allQueryKey`
- **Symptom (human-observed)**: With the "All Users" filter, a created ToDo could leave an orphaned DOM node displaying "Syncing..." until a page reload.
- **Root cause (human-diagnosed)**: With `activeFilterUserId === null`, `todoKeys.list(activeFilterUserId)` and `todoKeys.list(null)` both resolve to `['todos','list',{userId:'all'}]`. `onMutate` wrote the optimistic item to `targetQueryKey` and then *unconditionally* wrote the same item (same `tempId`) to `allQueryKey`: the same entry, so the array contained it twice. `TodoList` rendered duplicate `key={todo.id}`s and React's reconciliation broke when the mutation settled, orphaning a node.
- **Why the AI got it wrong**: It treated "filtered list" and "global list" as always distinct and never reasoned about the degenerate case where they alias. Neither TypeScript nor the build can detect aliasing of two runtime values.
- **Human override**: Only snapshot/update/roll back `allQueryKey` when `Boolean(activeFilterUserId)` is true, i.e. when the two keys are genuinely different.
- **Result**: Implemented as `hasDistinctAllKey`; the rollback context's `allKey` is optional and only present in that case. While there, the AI added two small guards: a random suffix on `tempId` (`Date.now()` alone can collide on fast double submits and cause the identical duplicate-key failure), and a rollback fallback that strips the item by `tempId` when no cache snapshot existed.
- **Lesson**: Optimistic updates over multiple cache entries need an explicit uniqueness/aliasing check. Item identity (`tempId`) must be unique *within each list*.

### G. Process Takeaway
Green builds are not evidence of correctness. Both bugs were caught by a human walking through realistic sequences (select -> change filter -> reset filter -> submit), not by static checks. The most valuable human contributions in this project were (1) diagnosing root causes precisely rather than asking the AI to "fix the error", and (2) choosing the *simpler* architecture over the AI's more elaborate one. Recommended follow-up (documented in the README testing strategy): regression tests for both scenarios.

---

## 4. UX Testing: Cascading Refetch Failure & Toast Feedback

During manual verification of the optimistic rollback scenario, the human engineer uncovered a third critical bug that severely degraded the rollback UX, accompanied by an invasive error presentation.

### H. Cascading Query Failure on Rollback (`onSettled` -> `getTodos` 500 cascade)
- **Symptom (human-observed)**: When "Simulate API Error" was enabled, creating a ToDo triggered the rollback, but immediately afterward the entire existing task list disappeared and was replaced by a destructive full-width error banner ("Error loading ToDos").
- **Root cause (human-diagnosed)**: In `useCreateTodo`, `onSettled` calls `queryClient.invalidateQueries({ queryKey: todoKeys.all })` to re-sync with server state. However, the AI had passed `simulateApiErrorAtom` into *both* `createTodo` and `getTodos`. Thus, the background refetch triggered by `onSettled` also failed with a 500 error! Furthermore, `TodoList` had `!isError` guards preventing it from rendering cached data if the query entered an error state.
- **Why the AI got it wrong**: The AI designed the error simulation as a naive global boolean flag rather than recognizing that in an optimistic rollback simulation, only the *mutation* is supposed to fail. The subsequent read query must succeed to establish server truth.
- **Human override**: 
  1. Scope error simulation exclusively to mutations at the type level (`ReadOptions` without `simulateError` vs `MutationOptions`).
  2. Configure `placeholderData: keepPreviousData` in `useTodos` so background refetches never destroy existing cached items.
- **Result**: Refetches succeed normally, and cached tasks remain visible throughout the rollback lifecycle.

### I. Non-Destructive Floating Toasts vs Invasive Inline Alerts
- **Symptom (human-observed)**: Showing giant static `<Alert>` banners inside `CreateTodoForm` and replacing `TodoList` with error banners cluttered forms and destroyed view continuity.
- **Root cause**: The AI fell back to simple local component alerts instead of a proper application-wide notification system.
- **Human override**: Replace invasive inline banners with a floating, accessible Toast notification system (`toastsAtom`, `useToast()`, `<ToastViewport />`) in `@jtl/shared`.
- **Result**: When an optimistic mutation fails, a floating toast appears (`"Failed to create ToDo (500 Error) — optimistic change rolled back"`), while the form and task list remain clean, intact, and interactive.

---

## 5. Architectural Boundaries: Global Persona State vs. Local Shareable View State

During manual UX review, a classic frontend state management antipattern was identified and corrected.

### J. Local List Filter Mutating Global Active User Context (The Antipattern)
- **Symptom (human-observed)**: When an evaluator navigated to `/todos` and used the "Filter by User" dropdown to view a specific teammate's tasks, the app-wide "Active User" persona badge in the header instantly mutated to that user. Selecting "All Users" cleared the active user persona entirely.
- **Root cause (human-diagnosed)**: In `apps/web/src/routes/todos/index.tsx`, the dropdown's `onChange` was directly wired to `setSelectedUserId(e.target.value || null)`, mutating Jotai's `selectedUserIdAtom`. The AI had conflated two distinct state domains:
  1. **Global Persona / Identity (`selectedUserIdAtom`)**: An application-wide session context that represents "who is currently operating the system" (set intentionally via the "Select" button in `/users` or the profile switcher).
  2. **Page-Level View State (`search.userId`)**: A localized, shareable, and bookmarkable filter on a specific list view (`/todos?userId=...`).
- **Why the AI got it wrong**: The AI opted for the path of least resistance: since `selectedUserIdAtom` was already present in Jotai, it reused the atom as a two-way binding for the page dropdown. It failed to consider the architectural blast radius: changing a local view filter triggered side-effects across unrelated components (the header bar, default task assignees, and active user indicators in the directory).
- **Human override**:
  - Enforce strict separation between URL search params and global atoms.
  - Read `selectedUserIdAtom` as read-only (`useAtomValue`) in `TodosPage`.
  - Bind the dropdown strictly to TanStack Router search params (`navigate({ search: ... })`) so filter adjustments remain purely in the URL query string (`/todos?userId=usr-2`).
  - Precedence: When `search.userId` is present in the URL, filter the list by that ID. When absent, default to `null` (All Users), while pre-filling task creation with `effectiveUserId || activeUserId`.
- **Result**: Complete state isolation. A user can freely filter and inspect any team member's tasks without side-effects on their global active identity. The URL is 100% shareable and bookmarkable, and the browser Back/Forward buttons work seamlessly with the filter history.
- **Lesson**: Global client state (atoms/stores) must never be used as a shortcut for URL state. If a piece of UI state represents *what the user is currently looking at* (filters, tabs, search queries, pagination), it belongs in the URL (TanStack Router). If it represents *session-wide context* (who is logged in, notifications, theme, developer simulation tools), it belongs in distributed atomic state (Jotai).

---

## 6. Monorepo Styling Compilation, Scoped Inputs, and Toast UX

In the third QA pass, three subtle integration details were uncovered and resolved.

### K. Tailwind CSS v4 `@source` Nesting Depth in Turborepo
- **Symptom**: The primary button in `CreateTodoForm` rendered white text against a white background, and toast elements rendered unpositioned and unstyled.
- **Root cause**: In `apps/web/src/index.css`, `@source "../../packages/*/src/**/*.{ts,tsx}"` was written with 2 levels of `../` instead of 3. Relative to `apps/web/src`, `../../` reached `apps/packages` (which does not exist). Tailwind CSS v4 silently skipped scanning sibling monorepo packages. As a result, utility classes used only inside package components (like `bg-indigo-600` in `@jtl/shared/Button` or toast notification classes) were pruned from the final CSS output.
- **Human override & Resolution**: Fixed the glob path to `../../../packages/*/src/**/*.{ts,tsx}`. Tailwind immediately scanned all package sources, increasing stylesheet size from 24KB to 36KB and restoring full styling contrast.
- **Lesson**: Monorepo bundlers and CSS scanners must be configured with exact relative path depths from the stylesheet location, or styles in shared design system packages will fail to compile.

### L. Context-Aware Input Scoping on Deep-Linked Routes (`/users/:userId`)
- **Symptom**: When visiting `/users/:userId` to view a user's profile, the embedded task form allowed typing or selecting any arbitrary user ID as assignee.
- **Root cause**: The AI treated `CreateTodoForm` as a static component with a simple default, rather than modeling route context constraints. On a user detail route, task assignment should be locked to that user.
- **Human override**: Enhanced `CreateTodoForm` with `fixedAssigneeId`, `fixedAssigneeLabel`, and `readOnlyAssignee` props. When locked, it replaces the editable input with a high-contrast read-only badge (`Assigned to: @username [Locked in user view]` with a lock icon) and submits `assigneeId: fixedAssigneeId`.
- **Lesson**: Components rendered across both generic routes (`/todos`) and scoped deep-links (`/users/:id`) must adapt their affordances to the page context.

### M. Global Toast Viewport Orchestration and Collision Avoidance
- **Symptom**: During simulated 500 error testing, the rollback toast did not appear visibly.
- **Root cause**: Besides the Tailwind scanning issue that stripped toast positioning rules, `TanStackRouterDevtools` was docked to `bottom-right`, covering the exact coordinate area of the toast container.
- **Human override**: Docked DevTools to `bottom-left`, ensured `ToastViewport` is positioned with high `z-50` elevation at `bottom-4 right-4 sm:bottom-6 sm:right-6`, configured automatic dismissal at 4.5 seconds, and styled the toast cards with high-contrast borders and shadows.
- **Lesson**: Floating HUD overlays (toasts, devtools, chat widgets) require conscious spatial orchestration to avoid z-index and viewport coordinate collisions.

---

## 7. In-Place Directory Feedback vs. Eager Auto-Navigation

During flow testing of the User creation interface, a common frontend navigation anti-pattern was caught and revised.

### N. Eager Auto-Redirect on Mutation (The Anti-Pattern)
- **Symptom**: Creating a user triggered an automatic navigation to `/users/:userId`. When testing with "Simulate API Error" active, this triggered a jarring navigation glitch as the application attempted to navigate while the mutation was failing with 500.
- **Root cause**: The AI treated form completion as an automatic redirect prompt (`onSuccess: handleNavigateToDetail(user.id)`), mimicking a typical CRUD workflow without considering the reviewer persona or error test harness. Forcing navigation away from `/users` destroyed the directory context, prevented reviewers from verifying directory reactivity in real-time, and broke error simulation UX.
- **Why in-place feedback is superior**:
  1. **Directory Verification**: The reviewer stays on `/users` and witnesses the new user prepended immediately to the top of the directory with identical high-contrast card styling (`bg-white border border-slate-200 rounded-xl p-4 shadow-xs`).
  2. **Error Resilience**: When an error occurs (such as simulated 500 failure), the user remains on `/users` with their typed input preserved in the input field, accompanied by a non-blocking error toast (`Failed to create user (500 Internal Server Error)`).
  3. **Explicit User Agency**: If the reviewer wishes to inspect the created user's detail page, each card provides a dedicated high-contrast "View Details" button.
- **Lesson**: Destructive or jarring auto-redirections should be avoided in management interfaces. Prefer in-place reactive updates with toast confirmations and preserved form state on error.



