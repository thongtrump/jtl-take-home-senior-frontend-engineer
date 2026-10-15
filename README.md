> ### 📌 Candidate's Architectural Note
> Following an initial conversation with [Tobias](https://github.com/tobilen), I was informed that JTL's requirements for the role had shifted toward an experienced Senior/Staff Engineer who independently owns technical planning and system architecture, and that my background was perceived as more accustomed to executing against a predefined ticket backlog. As a result, I was not moved forward to the take-home phase.
> 
> However, because I have a genuine passion for frontend platform architecture and discovered JTL's public [take-home challenge repository](https://github.com/jtl-software/take-home-tasks/tree/main), I chose to take full ownership and build the entire solution regardless.
> 
> Rather than "working off a backlog of tickets," this repository demonstrates my actual ability to take an open-ended specification from scratch, design decoupled monorepo package boundaries, eliminate subtle state desynchronization and query-cache race conditions, critically audit and override AI suggestions, and deliver a production-grade, accessible solution with comprehensive documentation.
> 
> Whether or not this changes the hiring decision, taking initiative and engineering this platform was a thoroughly rewarding exercise in technical ownership.

# JTL Senior Frontend Engineer — Take-Home Solution

A modular monolith frontend application built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **TanStack Router**, **TanStack Query**, and **Jotai**, managed as a **Turborepo** monorepo using **pnpm workspaces**.

---

## Quick Start

### Prerequisites
- Node.js `^20.0.0 || ^22.0.0 || ^24.0.0`
- pnpm `^9.0.0 || ^10.0.0` (Corepack enabled: `corepack enable`)

### 1. Installation
From the root directory:
```bash
pnpm install
```

### 2. Development Mode
Run the local Vite development server with hot module replacement:
```bash
pnpm run dev
```
The application will be running at [http://localhost:3000](http://localhost:3000).

### 3. Production Build
Verify TypeScript compilation and package bundle generation across all workspaces with Turborepo caching:
```bash
pnpm run build
```

To preview the production bundle locally:
```bash
pnpm --filter web preview
```

---

## Architectural Decisions & Monorepo Structure

The monorepo is divided into four isolated packages under a strict dependency hierarchy:

```
                   ┌─────────────────┐
                   │    apps/web     │  (Composition Root, TanStack Router, App Shell)
                   └────────┬────────┘
             ┌──────────────┴──────────────┐
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ packages/users  │           │ packages/todos  │  (Feature Modules: Independent)
    └────────┬────────┘           └────────┬────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
                   ┌─────────────────┐
                   │ packages/shared │  (Shared UI Primitives, Atoms, Mock DB, Types)
                   └─────────────────┘
```

### Why we split the monorepo this way:
1. **Strict Feature Independence**: `packages/users` and `packages/todos` **never** import each other directly. In real-world enterprise applications, features often have different ownership teams, independent release rhythms, and distinct bounded contexts.
2. **Dependency Inversion via a Controlled Render Prop**: Because `todos` needs an assignee picker, rather than coupling `packages/todos` to `packages/users`, `CreateTodoForm` exposes `renderAssignee({ value, onChange, error, disabled })`. The composition root (`apps/web`) renders the `UserSelect` component from that callback. Because the control receives `value`/`onChange` from the form's own state, it is 100% controlled: there is a single source of truth for the assignee, and it stays in sync when the default assignee changes or resets to `null`. (An earlier iteration passed an opaque `ReactNode` slot, which silently desynchronized from the form state; see [`ai-journey/judgment.md`](./ai-journey/judgment.md).)
3. **Dedicated Shared Foundation (`@jtl/shared`)**: Houses reusable design system primitives (`Button`, `Input`, `Select`, `Card`, `Badge`, `Alert`, `Spinner`), shared Jotai atoms, query client configurations, and common entity types.
4. **Thin Shippable App Shell (`apps/web`)**: Contains zero domain business logic. Its sole responsibility is route orchestration, layout scaffolding, and global provider composition.

---

## Key Technical Implementations

### 1. Data Resilience & Optimistic Updates (TanStack Query)
- **Immediate Feedback**: Submitting a new ToDo in `packages/todos` runs an optimistic update inside TanStack Query's `onMutate`:
  - Outgoing queries on `['todos', ...]` are canceled to avoid overwriting pending state.
  - Previous cache state is snapshotted for rollback.
  - An optimistic item with a temporary ID and an `isOptimistic: true` flag is immediately prepended to the cache.
  - The UI renders the item instantly with a subtle pulsing **"Syncing..."** badge.
- **Rollback on Failure**: If the mutation rejects (e.g. server returns 500), `onError` restores the snapshotted cache instantly, removing the optimistic item and firing a floating, non-blocking toast notification (`"Failed to create ToDo (500 Error) — optimistic change rolled back"`).
- **Mutation-Scoped Error Simulator & Cascade Prevention**: The "Simulate API Error" switch is strictly scoped to **mutations** at the type level (`MutationOptions` vs `ReadOptions`). Previously, when `onSettled` invalidated `['todos']`, the subsequent background refetch also failed, wiping out the entire task list. With mutation-scoped failure and `placeholderData: keepPreviousData`, the task list remains completely visible and intact while the rollback occurs.
- **Distinct-Key Guard**: With no user filter, the "filtered" list key and the "all todos" list key are the *same* cache entry. `useCreateTodo` therefore only cancels/snapshots/updates/rolls back the global list when `Boolean(activeFilterUserId)` is true, so the optimistic item is never inserted twice (duplicate React keys would otherwise leave an orphaned "Syncing..." node).
- **Interactive Reviewer Tools**: A **"Simulation Tools"** panel in the application header lets reviewers toggle **"Simulate API Error"** and adjust artificial latency (100ms–2000ms) with one click to easily verify optimistic creation and rollback handling.

### 2. Cross-Cutting UI State (Jotai)
Rather than turning state into a centralized "dumping ground" (a common pitfall with Redux or monolithic Zustand stores), Jotai is used strictly for distributed atomic concerns:
- `selectedUserIdAtom`: Tracks the session-level active user identity/persona across the entire application (set intentionally via the "Select" button on `/users` or the header). Crucially, this is decoupled from local page-level filters.
- `toastsAtom` / `pushToastAtom` / `dismissToastAtom`: Global, accessible notification queue rendered via `<ToastViewport />` at the root layout. Non-blocking and write-only so calling components do not re-render.
- `simulateApiErrorAtom` & `apiLatencyAtom`: Global mock engine controls accessible across all views.
- **Clear Architectural Separation: Server State vs. URL State vs. Global Identity**:
  - **Server State**: All entity caching, invalidation, and data fetching are owned 100% by TanStack Query.
  - **URL Search Params (Shareable View State)**: Page-level filters (such as "Filter by User" on `/todos?userId=...`) are owned strictly by TanStack Router URL search params. Changing a list filter navigates the URL without mutating the global persona context.
  - **Global Client State (Session Context)**: Jotai owns only cross-cutting session persona (`selectedUserIdAtom`), floating toasts (`toastsAtom`), and test simulation toggles.

### 3. Type-Safe Routing (TanStack Router)
- Utilizes modern file-based routing via `@tanstack/router-plugin/vite`.
- Route hierarchy:
  - `/` — Architectural overview dashboard with navigation cards.
  - `/users` — User directory with search filter, high-contrast user cards, and creation form.
  - `/users/:userId` — Deep-linked user profile with their specific task list embedded.
  - `/todos` — Dedicated task management with type-safe URL search params (`?userId=...`), assignee filter, and creation form.
- **Type-Safe Search Parameters (`validateSearch`)**: The `/todos` route validates `?userId=...` with Zod (`todosSearchSchema`), guaranteeing shareable, bookmarkable deep-linking while keeping local filter state isolated from global Jotai persona atoms.
- Automatic route code-splitting generated at build time (`dist/assets/_userId-*.js`, `dist/assets/index-*.js`).

### 4. Styling & Accessibility (Tailwind CSS v4)
- Employs the latest **Tailwind CSS v4** engine powered by `@tailwindcss/vite` (zero `tailwind.config.js` or PostCSS overhead).
- Uses `@source` directives to scan sibling monorepo packages.
- All form inputs adhere to WCAG accessibility: semantic `<label htmlFor="...">`, `aria-invalid`, `aria-describedby` linking error text to inputs, and visible keyboard focus rings.

### 5. Forms & Validation (controlled state + Zod)
Both forms have only 1-2 fields, so they use plain controlled React `useState` and validate on submit with Zod's `schema.safeParse()` (schemas live next to each feature's types). Field errors are surfaced through `aria-invalid` / `aria-describedby` and cleared as the user edits. A form library (e.g. `react-hook-form`) was deliberately **not** used: it adds a second source of truth that is hard to keep in sync with externally-rendered controls, for no benefit at this size.

### 6. In-Place Directory Feedback Pattern (User Creation)
User creation on `/users` deliberately avoids premature automatic navigation. Instead, it follows an **in-place feedback pattern**:
- Submitting a user prepends the new user immediately to the top of the directory cache (`setQueryData`), matching the server's descending `createdAt` sort order without layout shifts or reload jumps.
- On success, the form input resets and a success toast announces the creation (`User @username created successfully`). The newly registered user appears at the top of the list with a high-contrast 'View Details' button.
- On failure (such as when testing with "Simulate API Error" active), the user remains on `/users`, typed input is preserved so reviewers don't have to retype, and an error toast (`Failed to create user (500 Internal Server Error)`) alerts the user without disrupting the page view.

---

## Reflections

### Performance Considerations
- **Isolated Re-renders**: Forms are tiny (1-2 fields), so plain controlled `useState` is cheap and keeps each form's state local to the form component. Atomic Jotai subscriptions ensure only components reading `selectedUserIdAtom` re-render when the active user changes.
- **Cache Invalidation & Query Deduplication**: Queries use structured query keys (`userKeys`, `todoKeys`). Stale time is configured to 60 seconds with a 5-minute garbage collection window to prevent redundant network round-trips during navigation.
- **Automatic Code Splitting**: TanStack Router splits each route into its own asynchronous chunk, ensuring the initial bundle only ships the minimum JavaScript needed for the current view.

### Testing Strategy (Production Roadmap)
If preparing this codebase for enterprise production, the testing pyramid would encompass:
1. **Unit & Contract Testing (Vitest)**:
   - Zod schema validation tests verifying boundary cases (e.g. username regex, character limits).
   - Mock database behavior verifying CRUD operations, sorting, and error simulation.
2. **Component & Hook Integration Testing (React Testing Library + MSW)**:
   - Testing `useCreateTodo` optimistic updates: assert the cache updates synchronously, verifies error rollback when MSW returns 500.
   - **Regression (duplicate optimistic insert)**: with no user filter, after `onMutate` the cached list contains the `tempId` exactly once; with a user filter, both the filtered and the global list contain it once; rollback restores both.
   - **Regression (cascading query failure on rollback)**: when a mutation fails and `onSettled` invalidates `['todos']`, assert `getTodos` succeeds (mutation failure does not leak into reads) and existing cached items remain visible (`placeholderData: keepPreviousData`).
   - **Regression (assignee desync)**: render `CreateTodoForm` with `renderAssignee`, pick a user, assert no assignee validation error on submit; then change `defaultAssigneeId` from `usr-2` to `null` and assert the control resets and submit is blocked until a user is chosen.
   - Form accessibility testing: checking `aria-invalid` and error announcement rendering when invalid data is submitted.
3. **End-to-End Testing (Playwright)**:
   - Complete user flow: create user -> set as active user -> navigate to `/todos` -> verify assignee is preselected -> create ToDo -> toggle error simulation -> verify non-blocking toast appears and tasks list remains completely visible.

---

## AI Journey Deliverables

As required by the take-home guidelines, the complete documentation of how AI was used, directed, and evaluated during this project is maintained in the [`ai-journey/`](./ai-journey/) directory:
- [`ai-journey/plan.md`](./ai-journey/plan.md) — The detailed design breakdown and implementation plan.
- [`ai-journey/prompts.md`](./ai-journey/prompts.md) — Curated instructions and dialogue walkthrough.
- [`ai-journey/toolchain.md`](./ai-journey/toolchain.md) — Toolchain, models, skills, and MCP tools utilized.
- [`ai-journey/judgment.md`](./ai-journey/judgment.md) — Engineering judgment: where AI was guided, challenged, and overridden.
