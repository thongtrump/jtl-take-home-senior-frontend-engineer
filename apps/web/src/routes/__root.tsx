import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useAtom } from 'jotai';
import {
  selectedUserIdAtom,
  simulateApiErrorAtom,
  apiLatencyAtom,
  Badge,
  ToastViewport,
} from '@jtl/shared';
import { useUsers } from '@jtl/users';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [selectedUserId, setSelectedUserId] = useAtom(selectedUserIdAtom);
  const [simulateError, setSimulateError] = useAtom(simulateApiErrorAtom);
  const [latency, setLatency] = useAtom(apiLatencyAtom);
  const [showDevControls, setShowDevControls] = useState(false);

  const { data: users } = useUsers();
  const selectedUser = users?.find((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Banner: Active Error Simulation Indicator */}
      {simulateError && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-sm animate-pulse">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Simulated Network Error Mode is ACTIVE.</strong> Mutations will fail (500) to demonstrate TanStack Query rollback, while read queries remain protected.
          </span>
          <button
            type="button"
            onClick={() => setSimulateError(false)}
            className="ml-2 underline font-semibold cursor-pointer hover:text-rose-100"
          >
            Turn off
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand / Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5 font-extrabold text-slate-900 text-lg tracking-tight">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
                  <Layers className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="leading-none">
                  <span>JTL</span>
                  <span className="text-indigo-600 ml-1">Monorepo</span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main Navigation">
                <Link
                  to="/users"
                  activeProps={{ className: 'bg-indigo-50 text-indigo-700 font-semibold' }}
                  inactiveProps={{ className: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Users</span>
                </Link>

                <Link
                  to="/todos"
                  activeProps={{ className: 'bg-indigo-50 text-indigo-700 font-semibold' }}
                  inactiveProps={{ className: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <CheckSquare className="h-4 w-4" aria-hidden="true" />
                  <span>ToDos</span>
                </Link>
              </nav>
            </div>

            {/* Right side controls: Active User context & Dev controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Jotai Cross-cutting state: Active User Indicator */}
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg p-1.5 border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium pl-1">Active User:</span>
                {selectedUser ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success" className="font-mono">
                      @{selectedUser.username}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(null)}
                      className="text-slate-400 hover:text-slate-600 px-1 font-bold cursor-pointer"
                      title="Clear active user"
                      aria-label="Clear active user"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 italic pr-1">None selected</span>
                )}
              </div>

              {/* Dev Simulation Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setShowDevControls(!showDevControls)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  simulateError
                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="Open Reviewer & Dev Controls"
              >
                <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Simulation Tools</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Reviewer / Dev Simulation Toolbar */}
        {showDevControls && (
          <div className="border-t border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-800">Reviewer Simulation Panel:</span>
                <span className="text-slate-500">
                  Test optimistic updates, rollback, and cross-cutting Jotai state.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Toggle Error Simulation */}
                <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={simulateError}
                    onChange={(e) => setSimulateError(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className={simulateError ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                    Simulate API Error (Triggers Rollback)
                  </span>
                </label>

                {/* Adjust Latency */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Latency:</span>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={latency}
                    onChange={(e) => setLatency(Number(e.target.value))}
                    className="w-24 cursor-pointer accent-indigo-600"
                    aria-label="Simulated Network Latency in milliseconds"
                  />
                  <span className="font-mono text-slate-500 w-12">{latency}ms</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>JTL Senior Frontend Engineer Take-Home • Turborepo + TanStack Router & Query + Jotai + TailwindCSS v4</p>
      </footer>

      {/* Global Toast Notification Viewport */}
      <ToastViewport />

      {/* TanStack Router Devtools (Development only, docked to bottom-left to not obscure toasts) */}
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </div>
  );
}
