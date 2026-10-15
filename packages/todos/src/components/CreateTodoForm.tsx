import React, { useEffect, useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@jtl/shared';
import { createTodoSchema, type TodoItem } from '../types/todo';
import { useCreateTodo } from '../api/useTodos';
import { CheckSquare, Lock } from 'lucide-react';

/**
 * Props handed to the injected assignee control. The control is fully controlled by
 * CreateTodoForm's state, so there is exactly one source of truth for `assigneeId`.
 */
export interface AssigneeRenderProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export interface CreateTodoFormProps {
  defaultAssigneeId?: string | null;
  activeFilterUserId?: string | null;
  /**
   * When provided, locks the assignee to this user ID (e.g. on user detail page).
   * Disables editing and displays a read-only lock indicator.
   */
  fixedAssigneeId?: string;
  /**
   * Optional custom display label when the assignee is locked (e.g. "@username").
   */
  fixedAssigneeLabel?: string;
  /**
   * When true, disables changing the assignee control.
   */
  readOnlyAssignee?: boolean;
  /**
   * Render prop for the assignee picker, supplied by the composition layer.
   * This preserves strict package boundaries: packages/todos has ZERO direct dependency
   * on packages/users, yet the injected control stays synchronized with the form state.
   */
  renderAssignee?: (props: AssigneeRenderProps) => React.ReactNode;
  onSuccess?: (todo: TodoItem) => void;
}

type FieldErrors = { title?: string; assigneeId?: string };

export function CreateTodoForm({
  defaultAssigneeId,
  activeFilterUserId,
  fixedAssigneeId,
  fixedAssigneeLabel,
  readOnlyAssignee,
  renderAssignee,
  onSuccess,
}: CreateTodoFormProps) {
  const isLocked = Boolean(fixedAssigneeId) || Boolean(readOnlyAssignee);
  const initialAssignee = fixedAssigneeId ?? defaultAssigneeId ?? '';
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(initialAssignee);
  const targetAssigneeId = fixedAssigneeId ?? assigneeId;
  const [errors, setErrors] = useState<FieldErrors>({});

  const createMutation = useCreateTodo(activeFilterUserId);

  // Keep the assignee in sync with the default, INCLUDING when it resets to null
  // (e.g. the page filter going back to "All Users") or when fixedAssigneeId changes.
  useEffect(() => {
    if (fixedAssigneeId) {
      setAssigneeId(fixedAssigneeId);
    } else {
      setAssigneeId(defaultAssigneeId ?? '');
    }
    setErrors((prev) => ({ ...prev, assigneeId: undefined }));
  }, [defaultAssigneeId, fixedAssigneeId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
  };

  const handleAssigneeChange = (value: string) => {
    setAssigneeId(value);
    if (errors.assigneeId) setErrors((prev) => ({ ...prev, assigneeId: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const targetAssigneeId = fixedAssigneeId ?? assigneeId;
    const parsed = createTodoSchema.safeParse({ title, assigneeId: targetAssigneeId });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        title: fieldErrors.title?.[0],
        assigneeId: fieldErrors.assigneeId?.[0],
      });
      return;
    }
    setErrors({});

    try {
      // Optimistic update kicks in instantly inside onMutate!
      const created = await createMutation.mutateAsync(parsed.data);
      setTitle('');
      onSuccess?.(created);
    } catch {
      // Error state and rollback are handled by the mutation hook & displayed via toast
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Create ToDo Item</CardTitle>
            <CardDescription>
              Add a new task to the team list.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="ToDo Title"
            required
            placeholder="e.g. Write integration test suite"
            helperText="At least 3 characters describing the task."
            value={title}
            onChange={handleTitleChange}
            error={errors.title}
          />

          {isLocked ? (
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-slate-700">Assignee</span>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 shadow-xs">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="font-medium text-slate-600">Assigned to:</span>
                  <span className="font-semibold text-slate-900">
                    {fixedAssigneeLabel || (targetAssigneeId ? `@${targetAssigneeId}` : 'Current User')}
                  </span>
                </div>
                <Badge variant="neutral" className="text-[10px] font-bold tracking-wider text-slate-500">
                  Locked in user view
                </Badge>
              </div>
            </div>
          ) : renderAssignee ? (
            renderAssignee({
              value: assigneeId,
              onChange: handleAssigneeChange,
              error: errors.assigneeId,
              disabled: createMutation.isPending,
            })
          ) : (
            <Input
              label="Assignee User ID"
              required
              placeholder="e.g. usr-1"
              helperText="Enter the ID of the assigned user."
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              error={errors.assigneeId}
            />
          )}

          <Button
            type="submit"
            className="w-full sm:w-auto"
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Create ToDo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
