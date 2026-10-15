import { useTodos, useToggleTodo } from '../api/useTodos';
import { Card, Badge, Spinner, Button } from '@jtl/shared';
import { CheckCircle2, Circle, Clock, CheckSquare } from 'lucide-react';
import type { TodoItem } from '../types/todo';

export interface TodoListProps {
  userId?: string | null;
  title?: string;
  subtitle?: string;
  /**
   * Optional custom resolver to render the user's username given an assigneeId.
   * Passed from composition layer to preserve package independence.
   */
  renderAssigneeName?: (assigneeId: string) => React.ReactNode;
}

export function TodoList({
  userId,
  title = 'Assigned ToDo Items',
  subtitle,
  renderAssigneeName,
}: TodoListProps) {
  const { data: todos, isLoading, isError, isPlaceholderData, refetch } = useTodos(userId);
  const toggleMutation = useToggleTodo();

  const handleToggle = (todo: TodoItem) => {
    // Disable toggling while optimistic
    if (todo.isOptimistic) return;
    toggleMutation.mutate(todo.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
          {todos && (
            <Badge variant="neutral" className="ml-1">
              {todos.length} {todos.length === 1 ? 'task' : 'tasks'}
            </Badge>
          )}
        </div>
      </div>
      {subtitle && <p className="text-xs text-slate-500 -mt-2">{subtitle}</p>}

      {isLoading && (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Spinner size="md" label="Loading todos..." />
          <p className="mt-2 text-xs text-slate-500 font-medium">Fetching ToDo list...</p>
        </Card>
      )}

      {/*
        Only when the very first load failed (nothing cached to show) do we render an error state.
        If data exists, a failed background refetch must NEVER replace or hide the list.
      */}
      {isError && !todos && (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm font-medium text-slate-700">Couldn&apos;t load ToDos.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {!isLoading && todos?.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-slate-500 font-medium">
            {userId ? 'No ToDo items assigned to this user yet.' : 'No ToDo items found.'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Create a task to get started.
          </p>
        </Card>
      )}

      {!isLoading && todos && todos.length > 0 && (
        <div
          className={`space-y-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
          role="list"
          aria-busy={isPlaceholderData}
        >
          {todos.map((todo) => {
            const isOptimistic = !!todo.isOptimistic;

            return (
              <div
                key={todo.id}
                role="listitem"
                className={`flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                  isOptimistic
                    ? 'border-indigo-300 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(todo)}
                    disabled={isOptimistic || toggleMutation.isPending}
                    aria-label={
                      todo.completed ? 'Mark task as incomplete' : 'Mark task as completed'
                    }
                    className={`mt-0.5 sm:mt-0 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isOptimistic ? 'cursor-not-allowed opacity-40' : ''
                    }`}
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400 hover:text-indigo-600" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium tracking-tight truncate ${
                        todo.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>
                        Assignee:{' '}
                        <span className="font-mono text-slate-600">
                          {renderAssigneeName ? renderAssigneeName(todo.assigneeId) : todo.assigneeId}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{new Date(todo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isOptimistic ? (
                    <Badge variant="purple" pulse className="gap-1 shadow-xs">
                      <Clock className="h-3 w-3 animate-spin" aria-hidden="true" />
                      Syncing...
                    </Badge>
                  ) : todo.completed ? (
                    <Badge variant="success">Done</Badge>
                  ) : (
                    <Badge variant="neutral">Open</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
