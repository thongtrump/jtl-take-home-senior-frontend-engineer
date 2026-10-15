import { useAtom } from 'jotai';
import { selectedUserIdAtom, Button, Card, CardHeader, CardTitle, Badge, Spinner, Alert } from '@jtl/shared';
import { useUser } from '../api/useUsers';
import { User as UserIcon, Calendar, Hash, ArrowLeft, CheckCircle2 } from 'lucide-react';
import React from 'react';

export interface UserDetailViewProps {
  userId: string;
  onBack?: () => void;
  children?: React.ReactNode; // For embedding related feature components (like ToDoList)
}

export function UserDetailView({ userId, onBack, children }: UserDetailViewProps) {
  const { data: user, isLoading, isError, error, refetch } = useUser(userId);
  const [selectedUserId, setSelectedUserId] = useAtom(selectedUserIdAtom);

  const isSelected = selectedUserId === userId;

  if (isLoading) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <Spinner size="lg" label="Loading user details..." />
        <p className="mt-3 text-sm text-slate-500 font-medium">Fetching user profile...</p>
      </Card>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to users
          </Button>
        )}
        <Alert
          variant="danger"
          title="User not found or error loading"
          onDismiss={() => refetch()}
        >
          {error?.message || `User with ID "${userId}" does not exist.`}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to users
          </Button>
        )}

        <div className="ml-auto">
          <Button
            size="sm"
            variant={isSelected ? 'secondary' : 'outline'}
            onClick={() => setSelectedUserId(isSelected ? null : user.id)}
          >
            {isSelected ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Active User
              </>
            ) : (
              'Set as Active User'
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                <UserIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl">@{user.username}</CardTitle>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-slate-400" /> {user.id}
                  </span>
                  <span className="flex items-center gap-1 font-sans">
                    <Calendar className="h-3 w-3 text-slate-400" /> Joined{' '}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {isSelected && (
              <Badge variant="success">Active App Context</Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Related feature slot (e.g. Todos assigned to this user) */}
      {children && <div className="space-y-4">{children}</div>}
    </div>
  );
}
