import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CreateUserForm, UserList } from '@jtl/users';

export const Route = createFileRoute('/users/')({
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();

  const handleNavigateToDetail = (userId: string) => {
    navigate({
      to: '/users/$userId',
      params: { userId },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Users Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create new users and view existing team members. Select a user to set active app context.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create User Form (in-place feedback, stays on page) */}
        <div className="lg:col-span-1">
          <CreateUserForm />
        </div>

        {/* Right Column: User Directory List */}
        <div className="lg:col-span-2">
          <UserList onNavigateToDetail={handleNavigateToDetail} />
        </div>
      </div>
    </div>
  );
}
