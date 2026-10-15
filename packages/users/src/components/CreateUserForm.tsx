import React, { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@jtl/shared';
import { createUserSchema, type User } from '../types/user';
import { useCreateUser } from '../api/useUsers';
import { UserPlus } from 'lucide-react';

export interface CreateUserFormProps {
  onSuccess?: (user: User) => void;
}

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | undefined>();

  const createUserMutation = useCreateUser();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (usernameError) setUsernameError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsed = createUserSchema.safeParse({ username });
    if (!parsed.success) {
      setUsernameError(parsed.error.flatten().fieldErrors.username?.[0]);
      return;
    }
    setUsernameError(undefined);

    try {
      const createdUser = await createUserMutation.mutateAsync(parsed.data);
      setUsername('');
      onSuccess?.(createdUser);
    } catch {
      // Handled by mutation error state
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>Register a new user in the system</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Username"
            required
            placeholder="e.g. ada_lovelace"
            helperText="3-30 characters, alphanumeric and underscores only."
            value={username}
            onChange={handleChange}
            error={usernameError}
          />

          <Button
            type="submit"
            className="w-full sm:w-auto"
            isLoading={createUserMutation.isPending}
            disabled={createUserMutation.isPending}
          >
            Create User
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
