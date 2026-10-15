import { useState } from 'react';
import { useAtom } from 'jotai';
import { selectedUserIdAtom, Button, Input, Card, Badge, Spinner, Alert } from '@jtl/shared';
import { useUsers } from '../api/useUsers';
import { Users, Search, UserCheck, ArrowRight } from 'lucide-react';
import type { User } from '../types/user';

export interface UserListProps {
  onNavigateToDetail?: (userId: string) => void;
}

export function UserList({ onNavigateToDetail }: UserListProps) {
  const { data: users, isLoading, isError, error, refetch } = useUsers();
  const [selectedUserId, setSelectedUserId] = useAtom(selectedUserIdAtom);
  const [search, setSearch] = useState('');

  const filteredUsers = (users ?? []).filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Users Directory</h2>
          {users && (
            <Badge variant="neutral" className="ml-1">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Badge>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter users..."
            className="pl-9 h-9 text-xs"
            aria-label="Filter users by username"
          />
        </div>
      </div>

      {isLoading && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Spinner size="lg" label="Loading users list..." />
          <p className="mt-3 text-sm text-slate-500 font-medium">Fetching registered users...</p>
        </Card>
      )}

      {isError && (
        <Alert
          variant="danger"
          title="Error loading users"
          onDismiss={() => refetch()}
        >
          {error.message}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {!isLoading && !isError && filteredUsers.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500">
            {search ? `No users matching "${search}" found.` : 'No users registered yet.'}
          </p>
        </Card>
      )}

      {!isLoading && !isError && filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list">
          {filteredUsers.map((user: User) => {
            const isSelected = selectedUserId === user.id;

            return (
              <Card
                key={user.id}
                role="listitem"
                className={`rounded-xl p-4 shadow-xs transition-all hover:shadow-md border ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        @{user.username}
                      </span>
                      {isSelected && (
                        <Badge variant="success" className="gap-1">
                          <UserCheck className="h-3 w-3" aria-hidden="true" />
                          Active Context
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant={isSelected ? 'secondary' : 'outline'}
                      onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                      title={isSelected ? 'Deselect active user' : 'Set as active user'}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? 'Active' : 'Select'}
                    </Button>

                    {onNavigateToDetail && (
                      <button
                        type="button"
                        onClick={() => onNavigateToDetail(user.id)}
                        aria-label={`View details for ${user.username}`}
                        className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        View Details
                        <ArrowRight className="h-3.5 w-3.5 ml-1 text-slate-600" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
