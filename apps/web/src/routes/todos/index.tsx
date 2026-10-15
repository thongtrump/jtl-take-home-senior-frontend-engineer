import { createFileRoute } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { selectedUserIdAtom } from '@jtl/shared';
import { useUsers, UserSelect } from '@jtl/users';
import { CreateTodoForm, TodoList } from '@jtl/todos';
import { Filter } from 'lucide-react';
import { z } from 'zod';

const todosSearchSchema = z.object({
  userId: z.string().optional(),
});

export const Route = createFileRoute('/todos/')({
  validateSearch: todosSearchSchema,
  component: TodosPage,
});

function TodosPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeUserId = useAtomValue(selectedUserIdAtom);
  const { data: users } = useUsers();

  // The active filter is driven purely by the URL search param (?userId=...).
  // Local page-level filtering is cleanly decoupled from the global Jotai active user persona.
  const effectiveUserId = search.userId || null;

  // Helper to resolve usernames for the TodoList items without coupling the packages
  const userMap = new Map((users ?? []).map((u) => [u.id, u.username]));
  const renderAssigneeName = (assigneeId: string) => {
    const username = userMap.get(assigneeId);
    return username ? `@${username}` : assigneeId;
  };

  return (
    <div className="space-y-8">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ToDo Items Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and track team tasks across the organization.
          </p>
        </div>

        {/* Filter by User Dropdown - Bound to TanStack Router URL Search Params */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Filter by User:</span>
          <select
            value={search.userId || ''}
            onChange={(e) => {
              const newUserId = e.target.value;
              navigate({
                search: (prev) => ({
                  ...prev,
                  userId: newUserId || undefined,
                }),
              });
            }}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium"
            aria-label="Filter tasks by user"
          >
            <option value="">All Users (Showing everything)</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                @{u.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Form on Left, List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create ToDo Form */}
        <div className="lg:col-span-1">
          <CreateTodoForm
            defaultAssigneeId={effectiveUserId || activeUserId}
            activeFilterUserId={effectiveUserId}
            // Render prop: UserSelect from @jtl/users is fully controlled by CreateTodoForm's state
            renderAssignee={({ value, onChange, error, disabled }) => (
              <UserSelect
                label="Assignee"
                name="assigneeId"
                placeholder="Choose assignee user..."
                required
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={error}
                disabled={disabled}
              />
            )}
          />
        </div>

        {/* Right Column: Live ToDo List */}
        <div className="lg:col-span-2">
          <TodoList
            userId={effectiveUserId}
            title={
              effectiveUserId
                ? `Tasks for @${userMap.get(effectiveUserId) || effectiveUserId}`
                : 'All Team Tasks'
            }
            subtitle={
              effectiveUserId
                ? 'Filtered by selected user'
                : 'Showing all tasks across the system'
            }
            renderAssigneeName={renderAssigneeName}
          />
        </div>
      </div>
    </div>
  );
}
