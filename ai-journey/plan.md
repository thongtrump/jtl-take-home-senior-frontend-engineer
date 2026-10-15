# AI Journey — Architectural & Implementation Plan

## 1. Project Context & Objectives
- **Role**: Senior Software Engineer (Frontend)
- **Monorepo Directory**: Repository root (migrated from initial `senior-frontend-engineer/` scaffold)
- **Core Requirements**:
  - React + TypeScript + Vite organized as a Turborepo monorepo.
  - Clear package boundaries: feature packages (`packages/users`, `packages/todos`) must not depend on each other directly; shared logic goes through `packages/shared`.
  - TanStack Router with file-based routing (`/users`, `/users/:id`, `/todos`).
  - TanStack Query data fetching with resilient error, loading, and caching states.
  - **Optimistic update with automatic rollback** specifically for creating ToDoItems.
  - Cross-cutting UI state managed deliberately via Jotai without creating a dumping ground.
  - Styling via Tailwind CSS v4.
  - Accessible, semantic forms with validation (controlled React state + Zod `safeParse()`; ~~React Hook Form~~ dropped after QA, see `judgment.md`).

---

## 2. Monorepo Package Topology

```
                   ┌─────────────────┐
                   │    apps/web     │  (Vite, TanStack Router, App Shell)
                   └────────┬────────┘
             ┌──────────────┴──────────────┐
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ packages/users  │           │ packages/todos  │  (Domain Features)
    └────────┬────────┘           └────────┬────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
                   ┌─────────────────┐
                   │ packages/shared │  (Primitives, Atoms, Mock DB, Types)
                   └─────────────────┘
```

### Dependency Inversion Pattern
To satisfy the strict requirement that `packages/todos` does NOT depend on `packages/users`, the assignee selector in `CreateTodoForm` is implemented via a **controlled render prop**: `renderAssignee({ value, onChange, error, disabled })`. The composition root in `apps/web` renders `UserSelect` (from `packages/users`) from that callback, maintaining 100% decoupling between feature modules while keeping the control synchronized with the form state.

> **Revision (post-QA):** the first iteration used an opaque `ReactNode` slot plus `react-hook-form`. The injected control was never registered with the form, so state desynchronized. Replaced by the `renderAssignee` render prop above and controlled `useState` + Zod `safeParse()`. See [`judgment.md`](./judgment.md).

---

## 3. Implementation Phases

| Phase | Description | Deliverables |
| :--- | :--- | :--- |
| **Phase 1: Foundation** | Setup Turborepo, workspace configs, root package.json, TypeScript base configs. | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` |
| **Phase 2: Shared Foundation** | Shared UI primitives (Button, Input, Select, Card, Badge, Alert, Spinner), Jotai atoms, query client factory, and mock DB engine. | `packages/shared/*` |
| **Phase 3: User Feature** | User types, Zod schema, TanStack Query hooks, `CreateUserForm`, `UserList`, `UserDetailView`, `UserSelect`. | `packages/users/*` |
| **Phase 4: ToDos Feature** | ToDo types, Zod schema, TanStack Query hooks with **optimistic update & rollback**, `CreateTodoForm`, `TodoList`. | `packages/todos/*` |
| **Phase 5: Web Application** | TanStack Router setup, layout with navigation & reviewer simulation toolbar, routes (`/`, `/users`, `/users/$userId`, `/todos`). | `apps/web/*` |
| **Phase 6: Verification & Docs** | Full compilation check across monorepo (`turbo run build`), dev/preview server test, and curated AI journey documentation. | `README.md`, `ai-journey/*` |
| **Phase 7: Manual QA & Remediation** | Human-led QA found two defects (assignee form-state desync; duplicate optimistic cache insert). Removed `react-hook-form`/`@hookform/resolvers`, moved to controlled `useState` + Zod `safeParse()`, replaced the opaque slot with a controlled `renderAssignee` render prop, and guarded the global-list cache update behind `Boolean(activeFilterUserId)`. | `packages/todos/*`, `packages/users/*`, `apps/web/src/routes/todos/index.tsx`, docs |
| **Phase 8: Cascading Refetch & Toast UX Overhaul** | Human-led UX testing uncovered cascading refetch crashes when `onSettled` re-fetched during simulated errors. Scoped `simulateError` strictly to mutations at type level, added `placeholderData: keepPreviousData`, and built non-blocking floating Toast notifications (`useToast`, `ToastViewport`) to keep task lists intact during rollbacks. | `packages/shared/*`, `packages/todos/*`, `packages/users/*`, `apps/web/*`, docs |
| **Phase 9: State Boundary Decoupling & User Card UX** | Decoupled local page-level task filters from global Jotai active user persona. Migrated filter dropdown to TanStack Router URL search params (`/todos?userId=...`), styled User Card "View Details" action with high-contrast accessibility, and preserved clean state isolation. | `apps/web/src/routes/todos/index.tsx`, `packages/users/src/components/UserList.tsx`, docs |
| **Phase 10: Styling Compilation, Scoped Inputs, and Toast Polish** | Corrected Tailwind CSS v4 `@source` nesting depth for cross-package compilation (restoring button contrast and toast positioning), added locked assignee scoping on `/users/:userId` with dedicated badge, adjusted toast auto-dismiss to 4.5s, and docked DevTools to bottom-left to avoid overlay collisions. | `apps/web/src/index.css`, `packages/todos/src/components/CreateTodoForm.tsx`, `apps/web/src/routes/users/$userId.tsx`, `packages/shared/src/*`, docs |
| **Phase 11: In-Place User Creation & Ordering Polish** | Removed premature auto-navigation on user creation to stay on `/users` directory, prepended newly created users to the query cache for immediate sorted order, and preserved typed form inputs on simulated 500 errors. | `apps/web/src/routes/users/index.tsx`, `packages/users/src/api/useUsers.ts`, `packages/users/src/components/UserList.tsx`, docs |
| **Phase 12: Final Polish & Rule Compliance Audit** | Audited all 8 assessment criteria, removed developer jargon from action buttons ('Create ToDo', 'Explore ToDos'), removed tutorial cards and explanatory bloat from `/todos` and `/`, and verified clean production build across all workspaces. | `packages/todos/*`, `apps/web/*`, docs |




