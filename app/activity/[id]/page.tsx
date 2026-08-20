import { redirect } from 'next/navigation';
import { prisma } from '@/core/database/prisma';
import { formatReadableDateTime } from '@/core/helpers/date';
import { presentActivity } from '@/services/activity/presentActivity';

type ActivityDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    selectedProject?: string;
  }>;
};

export default async function ActivityDetailPage({
  params,
  searchParams,
}: ActivityDetailPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selectedProject = resolvedSearchParams.selectedProject?.trim();

  if (!selectedProject) {
    redirect('/projects');
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id,
      projectId: selectedProject,
    },
  });

  if (!activity) {
    redirect(`/activity?selectedProject=${encodeURIComponent(selectedProject)}`);
  }

  const presentation = presentActivity(activity);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Activity
        </h1>

        <p className="mt-2 text-muted-foreground">
          View the activity record details for the selected project.
        </p>
      </div>

      <div className="space-y-0">
        <div className="rounded-t-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Page URL
          </p>

          <p className="mt-1 break-all text-sm text-slate-950">
            {activity.pageUrl}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Date
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {formatReadableDateTime(activity.activityOn)}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Type
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {presentation.type}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Agent Type
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {presentation.agentType}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Identifier
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.identifierId}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            IP
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.ip ?? '—'}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Referral
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.referral ?? '—'}
          </p>
        </div>

        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            User Agent
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.userAgent ?? '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
