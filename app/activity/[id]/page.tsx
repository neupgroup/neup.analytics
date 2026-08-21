import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/core/database/prisma';
import { makeAppPath } from '@/core/appconfig';
import { formatReadableDateTime } from '@/core/helpers/date';
import { url } from '@/core/helpers/link/url';
import { presentActivity } from '@/services/activity/presentActivity';
import { formatIpMapLocation, getFreshIpMap } from '@/services/ipmap/getIpMap';

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
    redirect(makeAppPath('/projects'));
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id,
      projectId: selectedProject,
    },
  });

  if (!activity) {
    redirect(url('/activity', '/').addParam('selectedProject', selectedProject).get());
  }

  const presentation = presentActivity(activity);
  const ipMap = await getFreshIpMap(activity.ip);
  const ipLocation = formatIpMapLocation(ipMap);
  const filterHref = (key: string, value: string | null | undefined) => url('/activity', '/')
    .addParam('selectedProject', selectedProject)
    .addParam(key, value ?? undefined)
    .get();
  const filterLinkClassName = 'text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4';

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
            {activity.pageUrl ? (
              <Link
                href={filterHref('pageUrl', activity.pageUrl)}
                className={filterLinkClassName}
              >
                {activity.pageUrl}
              </Link>
            ) : '—'}
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
            <Link
              href={filterHref('activityType', presentation.type)}
              className={filterLinkClassName}
            >
              {presentation.type}
            </Link>
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Agent Type
          </p>

          <p className="mt-1 text-sm text-slate-700">
            <Link
              href={filterHref('agentType', presentation.agentType.toLowerCase())}
              className={filterLinkClassName}
            >
              {presentation.agentType}
            </Link>
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Identifier
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            <Link
              href={filterHref('identifier', activity.identifierId)}
              className={filterLinkClassName}
            >
              {activity.identifierId}
            </Link>
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            IP
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.ip ? (
              <Link
                href={filterHref('ip', activity.ip)}
                className={filterLinkClassName}
              >
                {activity.ip}
              </Link>
            ) : '—'}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            IP Information
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {ipLocation ?? '—'}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            IP Last Updated
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {ipMap ? formatReadableDateTime(ipMap.lastUpdated) : '—'}
          </p>
        </div>

        <div className="border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Referral
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.referral ? (
              <Link
                href={filterHref('referral', activity.referral)}
                className={filterLinkClassName}
              >
                {activity.referral}
              </Link>
            ) : '—'}
          </p>
        </div>

        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            User Agent
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {activity.userAgent ? (
              <Link
                href={filterHref('userAgent', activity.userAgent)}
                className={filterLinkClassName}
              >
                {activity.userAgent}
              </Link>
            ) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
