import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { UserDetailView, useUser } from '@jtl/users';
import { TodoList, CreateTodoForm } from '@jtl/todos';

export const Route = createFileRoute('/users/$userId')({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { data: user } = useUser(userId);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <UserDetailView
        userId={userId}
        onBack={() => navigate({ to: '/users' })}
      >
        {/* Composition: Embed ToDo management directly for this user */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            <CreateTodoForm
              fixedAssigneeId={userId}
              fixedAssigneeLabel={user ? `@${user.username}` : undefined}
              activeFilterUserId={userId}
            />
          </div>

          <div>
            <TodoList
              userId={userId}
              title="Assigned Tasks"
              subtitle={
                user
                  ? `Tasks assigned specifically to @${user.username}`
                  : 'Tasks assigned specifically to this user'
              }
            />
          </div>
        </div>
      </UserDetailView>
    </div>
  );
}
