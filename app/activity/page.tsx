import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity as ActivityIcon,
  ArrowLeft,
} from 'lucide-react';
import { prisma } from '@/core/database/prisma';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type ActivityPageProps = {
  searchParams: Promise<{
    selectedProject?: string;
  }>;
};

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const params = await searchParams;
  const selectedProject = params.selectedProject?.trim();

  if (!selectedProject) {
    redirect('/projects');
  }

  const project = await prisma.project.findUnique({
    where: {
      id: selectedProject,
    },
    select: {
      id: true,
      path: true,
      type: true,
    },
  });

  if (!project) {
    redirect('/projects');
  }

  const activities = await prisma.activity.findMany({
    where: {
      projectId: project.id,
    },
    orderBy: {
      activityOn: 'desc',
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="mt-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <ActivityIcon className="h-3.5 w-3.5" />
            Activity
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Activity
          </h1>

          <p className="mt-2 text-muted-foreground">
            View activity collected for the selected project.
          </p>
        </div>
      </div>

      {/* Selected Project */}
      <Card>
        <CardHeader>
          <CardTitle>{project.path}</CardTitle>

          <CardDescription>
            {project.type} · {activities.length} activity
            {activities.length === 1 ? '' : ' records'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {activities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <ActivityIcon className="mx-auto h-10 w-10 text-muted-foreground" />

              <h2 className="mt-4 text-lg font-semibold">
                No activity yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                No activity records have been collected for this project.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Identifier
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      Page URL
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      IP
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      Referral
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      User Agent
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      Activity On
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {activities.map((activity) => (
                    <tr
                      key={activity.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {activity.identifierId}
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <span className="block truncate">
                          {activity.pageUrl}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {activity.ip ?? '—'}
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <span className="block truncate text-muted-foreground">
                          {activity.referral ?? '—'}
                        </span>
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <span className="block truncate text-muted-foreground">
                          {activity.userAgent ?? '—'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {new Intl.DateTimeFormat('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(activity.activityOn))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5">
            <Button asChild variant="outline">
              <Link href="/projects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                View Projects
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}