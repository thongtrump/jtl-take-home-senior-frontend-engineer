import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@jtl/shared';
import { Users, CheckSquare, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center sm:text-left space-y-2 pb-6 border-b border-slate-200">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Team Workspace
        </h1>
        <p className="text-base text-slate-600">
          Manage team members and coordinate tasks across your organization.
        </p>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users Card */}
        <Card className="hover:shadow-md transition-all border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <div className="p-2.5 w-fit bg-indigo-100 text-indigo-700 rounded-xl">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="mt-4 text-xl">Users Directory</CardTitle>
            <CardDescription>
              Register new team members, inspect user profiles, and manage active context.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/users">
              <Button className="w-full">
                Explore Users <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ToDos Card */}
        <Card className="hover:shadow-md transition-all border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <div className="p-2.5 w-fit bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="mt-4 text-xl">ToDo Tasks</CardTitle>
            <CardDescription>
              Create, assign, and track tasks with real-time feedback and user filtering.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/todos">
              <Button variant="secondary" className="w-full">
                Explore ToDos <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
