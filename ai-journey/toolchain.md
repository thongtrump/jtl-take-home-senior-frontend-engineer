# AI Journey — Toolchain & Environment

This document lists the AI models, developer tools, skills, and MCP servers utilized throughout the project lifecycle.

---

## 1. AI Assistant & Model
- **Assistant**: Antigravity (Google DeepMind)
- **Model**: `Gemini 3.8 Flash (High)`
- **Role**: Pair programmer and technical design interviewer (`/grill-me`), architecture validator, code generator, and build pipeline troubleshooter.

---

## 2. Slash Commands & Skills
- **/grill-me**: Initiated a rigorous, step-by-step interview traversing every branch of the frontend design tree (monorepo placement, package manager, state primitives, routing strategy, form validation, and optimistic update UX).
- **Interactive Interview Mode (`ask_question`)**: Structured multiple-choice trade-off consultations that ensured alignment before writing a single line of code.

---

## 3. Core Development Toolchain
- **Turborepo 2.x**: High-performance monorepo orchestration tool running concurrent package compilation and build caching.
- **pnpm 10.x**: Fast, disk space-efficient package manager utilizing strict symlinked `node_modules` to prevent phantom dependency leakage across packages.
- **Node.js 24.x**: Runtime environment.
- **Vite 6.x**: Modern frontend build tool and dev server.
- **TanStack Router**: Type-safe routing engine with automatic route code generation and route-level code splitting.
- **TanStack Query 5.x**: Declarative server state manager powering async cache invalidation, background refetching, and synchronous optimistic mutations with rollback.
- **Jotai 2.x**: Primitive and flexible atomic state management for cross-cutting client concerns.
- **Tailwind CSS 4.x (`@tailwindcss/vite`)**: Next-generation utility-first CSS framework integrated directly into Vite without legacy config files.
- **Zod (with controlled React `useState`)**: Schema-based runtime validation via `schema.safeParse()` on submit, with WCAG-compliant error handling. `react-hook-form` and `@hookform/resolvers` were initially used but removed after manual QA (see `judgment.md`).
- **Lucide React**: Clean, accessible iconography.
