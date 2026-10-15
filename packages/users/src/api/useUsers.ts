import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { MockDatabase, ApiError, simulateApiErrorAtom, apiLatencyAtom, useToast } from '@jtl/shared';
import type { User, CreateUserInput } from '../types/user';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers() {
  // Reads intentionally ignore the error simulator (scoped to mutations only).
  const latency = useAtomValue(apiLatencyAtom);

  return useQuery<User[], Error>({
    queryKey: userKeys.lists(),
    queryFn: () => MockDatabase.getUsers({ latency }),
  });
}

export function useUser(id: string | null | undefined) {
  const latency = useAtomValue(apiLatencyAtom);

  return useQuery<User | null, Error>({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      return MockDatabase.getUserById(id, { latency });
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const simulateError = useAtomValue(simulateApiErrorAtom);
  const latency = useAtomValue(apiLatencyAtom);

  return useMutation<User, Error, CreateUserInput>({
    mutationFn: async (input: CreateUserInput) => {
      const newUser = await MockDatabase.createUser(input.username, { latency, simulateError });
      return newUser;
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError && err.status === 500
          ? 'Failed to create user (500 Internal Server Error)'
          : err instanceof ApiError
          ? `Failed to create user (${err.status} Error).`
          : 'Failed to create user (500 Internal Server Error)',
        { description: err.message }
      );
    },
    onSuccess: (newUser) => {
      toast.success(`User @${newUser.username} created successfully.`);
      // Prepend to top of user list in query cache so immediate UI state matches persisted sorted order
      queryClient.setQueryData<User[]>(userKeys.lists(), (old = []) => [
        newUser,
        ...old.filter((u) => u.id !== newUser.id),
      ]);
      // Invalidate users list for server synchronization
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // Pre-populate individual user cache
      queryClient.setQueryData(userKeys.detail(newUser.id), newUser);
    },
  });
}
