import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { MockDatabase, ApiError, simulateApiErrorAtom, apiLatencyAtom, useToast } from '@jtl/shared';
import type { TodoItem, CreateTodoInput } from '../types/todo';

export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (userId?: string | null) => [...todoKeys.lists(), { userId: userId ?? 'all' }] as const,
};

export function useTodos(userId?: string | null) {
  // NOTE: reads intentionally do NOT receive `simulateApiErrorAtom`. The error simulator is
  // scoped to mutations so the refetch after a failed mutation (onSettled) can never fail too.
  const latency = useAtomValue(apiLatencyAtom);

  return useQuery<TodoItem[], Error>({
    queryKey: todoKeys.list(userId),
    queryFn: () => MockDatabase.getTodos(userId || undefined, { latency }),
    // Never blank the list while a (re)fetch is in flight or after one fails. Equivalent to
    // `(previousData) => previousData`. Consumers can read `isPlaceholderData` to dim the list.
    placeholderData: keepPreviousData,
  });
}

interface MutationContext {
  previousList?: TodoItem[];
  previousAll?: TodoItem[];
  queryKey: ReturnType<typeof todoKeys.list>;
  /** Only set when the global list is a cache entry distinct from `queryKey`. */
  allKey?: ReturnType<typeof todoKeys.list>;
  tempId: string;
}

export function useCreateTodo(activeFilterUserId?: string | null) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const simulateError = useAtomValue(simulateApiErrorAtom);
  const latency = useAtomValue(apiLatencyAtom);

  return useMutation<TodoItem, Error, CreateTodoInput, MutationContext>({
    mutationFn: async (input: CreateTodoInput) => {
      const created = await MockDatabase.createTodo(input, {
        latency,
        simulateError,
      });
      return created;
    },

    // --- OPTIMISTIC UPDATE ---
    onMutate: async (newTodoInput: CreateTodoInput) => {
      const targetQueryKey = todoKeys.list(activeFilterUserId);
      const allQueryKey = todoKeys.list(null);

      // When no user filter is active, targetQueryKey and allQueryKey resolve to the SAME
      // cache entry (['todos','list',{userId:'all'}]). The global list must only be handled
      // separately when the two keys are actually distinct; otherwise the optimistic item
      // would be inserted twice (duplicate React keys -> orphaned "Syncing..." DOM node).
      const hasDistinctAllKey = Boolean(activeFilterUserId);

      // 1. Cancel any outgoing queries so they do not overwrite our optimistic state
      await queryClient.cancelQueries({ queryKey: targetQueryKey });
      if (hasDistinctAllKey) {
        await queryClient.cancelQueries({ queryKey: allQueryKey });
      }

      // 2. Snapshot the previous cache value(s) for rollback
      const previousList = queryClient.getQueryData<TodoItem[]>(targetQueryKey);
      const previousAll = hasDistinctAllKey
        ? queryClient.getQueryData<TodoItem[]>(allQueryKey)
        : undefined;

      // 3. Construct the optimistic item (random suffix avoids tempId collisions on rapid submits)
      const tempId = `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticItem: TodoItem = {
        id: tempId,
        title: newTodoInput.title.trim(),
        assigneeId: newTodoInput.assigneeId,
        completed: false,
        createdAt: new Date().toISOString(),
        isOptimistic: true, // Marker for visual indicator (e.g. "Syncing...")
      };

      // 4. Optimistically update the target list if it matches the assignee or no filter
      if (!activeFilterUserId || activeFilterUserId === newTodoInput.assigneeId) {
        queryClient.setQueryData<TodoItem[]>(targetQueryKey, (old = []) => [
          optimisticItem,
          ...old,
        ]);
      }

      // Also update the global list, but only when it is a different cache entry
      if (hasDistinctAllKey) {
        queryClient.setQueryData<TodoItem[]>(allQueryKey, (old = []) => [
          optimisticItem,
          ...old,
        ]);
      }

      // 5. Return context object with snapshots and keys for rollback
      return {
        previousList,
        previousAll,
        queryKey: targetQueryKey,
        allKey: hasDistinctAllKey ? allQueryKey : undefined,
        tempId,
      };
    },

    // --- ROLLBACK ON ERROR ---
    onError: (err, _variables, context) => {
      // Non-blocking feedback; the list stays fully visible while the rollback happens.
      toast.error(
        err instanceof ApiError
          ? `Failed to create ToDo (${err.status} Error) — Optimistic change rolled back.`
          : 'Failed to create ToDo (500 Error) — Optimistic change rolled back.',
        { description: err.message }
      );

      if (!context) return;

      const removeOptimistic = (old: TodoItem[] | undefined) =>
        old?.filter((t) => t.id !== context.tempId);

      // Roll back target list (fallback: strip the optimistic item if nothing was cached)
      if (context.previousList !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousList);
      } else {
        queryClient.setQueryData<TodoItem[] | undefined>(context.queryKey, removeOptimistic);
      }

      // Roll back global list only if it was a distinct key
      if (context.allKey) {
        if (context.previousAll !== undefined) {
          queryClient.setQueryData(context.allKey, context.previousAll);
        } else {
          queryClient.setQueryData<TodoItem[] | undefined>(context.allKey, removeOptimistic);
        }
      }
    },

    // --- RE-SYNC ON SETTLED ---
    onSettled: () => {
      // Always re-sync with server state truth. Safe after a failed mutation because the
      // simulated-error switch only affects mutations, never the read that this triggers.
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}

export function useToggleTodo() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const simulateError = useAtomValue(simulateApiErrorAtom);
  const latency = useAtomValue(apiLatencyAtom);

  return useMutation<TodoItem, Error, string>({
    mutationFn: async (id: string) => {
      return MockDatabase.toggleTodo(id, { latency, simulateError });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? `Failed to update ToDo (${err.status} Error).`
          : 'Failed to update ToDo.',
        { description: err.message }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}
