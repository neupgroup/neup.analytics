import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity as ActivityIcon,
} from 'lucide-react';
import { prisma } from '@/core/database/prisma';
import { formatReadableDateTime } from '@/core/helpers/date';
import { url } from '@/core/link';
import { presentActivity } from '@/services/activity/presentActivity';

type ActivityPageProps = {
  searchParams: Promise<{
    selectedProject?: string;
    activityType?: string;
    agentType?: string;
    pageUrl?: string;
  }>;
};

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const params = await searchParams;
  const selectedProject = params.selectedProject?.trim();
  const selectedActivityType = params.activityType?.trim().toLowerCase();
  const selectedAgentType = params.agentType?.trim().toLowerCase();
  const selectedPageUrl = params.pageUrl?.trim();

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

  const presentedActivities = activities
    .map((activity) => ({
      activity,
      presentation: presentActivity(activity),
    }))
    .filter(({ activity, presentation }) => {
      if (selectedActivityType && presentation.type !== selectedActivityType) {
        return false;
      }

      if (selectedAgentType && presentation.agentType.toLowerCase() !== selectedAgentType) {
        return false;
      }

      if (selectedPageUrl && activity.pageUrl !== selectedPageUrl) {
        return false;
      }

      return true;
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Activity
        </h1>

        <p className="mt-2 text-muted-foreground">
          View activity collected for the selected project.
        </p>
      </div>

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
      ) : presentedActivities.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">
            No matching activity
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            No activity records match the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {presentedActivities.map(({ activity, presentation }, index) => (
            <div
              key={activity.id}
              className={`block border border-slate-200 bg-white px-5 py-4 transition-colors duration-200 ease-out hover:bg-sky-50 ${
                index === 0 ? 'rounded-t-xl' : 'rounded-none border-t-0'
              } ${
                index === presentedActivities.length - 1 ? 'rounded-b-xl' : ''
              }`}
            >
              <p className="break-all text-sm text-slate-950">
                <Link
                  href={url('/activity')
                    .addParam('selectedProject', project.id)
                    .addParam('activityType', presentation.type)
                    .addParam('agentType', selectedAgentType)
                    .addParam('pageUrl', selectedPageUrl)
                    .get()}
                  className="font-medium text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4"
                >
                  {presentation.typeLabel}
                </Link>{' '}
                on{' '}
                <Link
                  href={url('/activity')
                    .addParam('selectedProject', project.id)
                    .addParam('activityType', selectedActivityType)
                    .addParam('agentType', selectedAgentType)
                    .addParam('pageUrl', activity.pageUrl)
                    .get()}
                  className="text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4"
                >
                  {activity.pageUrl}
                </Link>{' '}
                from{' '}
                <Link
                  href={url('/activity')
                    .addParam('selectedProject', project.id)
                    .addParam('activityType', selectedActivityType)
                    .addParam('agentType', presentation.agentType.toLowerCase())
                    .addParam('pageUrl', selectedPageUrl)
                    .get()}
                  className="text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4"
                >
                  {presentation.agentTypeLabel}
                </Link>
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {formatReadableDateTime(activity.activityOn)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
