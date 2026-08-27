import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, Globe, MousePointerClick, Radar, Users } from 'lucide-react';
import { ActivityCard } from '@/components/activity-card';
import { ActivitySet } from '@/components/activity-set';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/component/ui/card';
import { formatReadableDateTime } from '@/core/helpers/date';
import { makeAppPath } from '@/core/appconfig';
import { url } from '@/core/helpers/link/url';
import { presentActivity } from '@/services/activity/presentActivity';
import { getIpLocationLabel } from '@/services/ipmap/getIpMap';
import { getProjectDashboard } from '@/services/projects/getProjectDashboard';
import { Skeleton } from '@/component/ui/skeleton';
import { Suspense } from 'react';

type DashboardPageProps = {
  searchParams?: Promise<{
    selectedProject?: string;
  }>;
};

function MetricSkeleton() {
  return <Skeleton className="h-28 w-full rounded-lg" />;
}

export function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading home">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => <MetricSkeleton key={index} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64 w-full rounded-lg lg:col-span-2" /><Skeleton className="h-64 w-full rounded-lg" /></div>
      <div className="grid gap-4 lg:grid-cols-3">{[...Array(3)].map((_, index) => <Skeleton key={index} className="h-48 w-full rounded-lg" />)}</div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatTypeLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function activityHref(params: {
  selectedProject: string;
  activityType?: string;
  agentType?: string;
  pageUrl?: string;
}) {
  return url('/activity', '/')
    .addParam('selectedProject', params.selectedProject)
    .addParam('activityType', params.activityType)
    .addParam('agentType', params.agentType)
    .addParam('pageUrl', params.pageUrl)
    .get();
}

function activityDetailHref(activityId: string, selectedProject: string) {
  return url(`/activity/${activityId}`, '/')
    .addParam('selectedProject', selectedProject)
    .get();
}

export default function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Home</h1>
        <p className="text-muted-foreground">Live project data for the selected project.</p>
      </div>
      <Suspense fallback={<HomeSkeleton />}>
        <DashboardData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DashboardData({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const selectedProject = params?.selectedProject?.trim();

  if (!selectedProject) {
    redirect(makeAppPath('/projects'));
  }

  const dashboard = await getProjectDashboard(selectedProject);

  if (!dashboard) {
    redirect(makeAppPath('/projects'));
  }

  const maxTrendCount = Math.max(...dashboard.activityTrend.map((day) => day.count), 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {formatNumber(dashboard.totals.totalActivities)}
            </div>
            <p className="text-xs text-muted-foreground">Captured records for this project</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {formatNumber(dashboard.totals.uniqueVisitors)}
            </div>
            <p className="text-xs text-muted-foreground">Unique identifiers seen so far</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Pages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {formatNumber(dashboard.totals.uniquePages)}
            </div>
            <p className="text-xs text-muted-foreground">Distinct URLs recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {formatNumber(dashboard.totals.activeToday)}
            </div>
            <p className="text-xs text-muted-foreground">Activity records collected today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Activity Trend</CardTitle>
            <CardDescription>Recorded events for the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.activityTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="grid grid-cols-7 gap-3 sm:grid-cols-14">
                {dashboard.activityTrend.map((day) => (
                  <div key={day.dateKey} className="flex flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-end rounded-md bg-slate-100 p-1">
                      <div
                        className="w-full rounded-sm bg-sky-500"
                        style={{
                          height: `${Math.max((day.count / maxTrendCount) * 100, day.count > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-900">{formatNumber(day.count)}</p>
                      <p className="text-[11px] text-slate-500">{day.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-lg">
              <Radar className="h-5 w-5 text-primary" />
              <span>Project Snapshot</span>
            </CardTitle>
            <CardDescription>Current project metadata from the database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Path</p>
              <p className="font-medium text-foreground break-all">{dashboard.project.path}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium text-foreground">{dashboard.project.type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium text-foreground">
                {formatReadableDateTime(dashboard.project.createdOn)}
              </p>
            </div>
            <div className="pt-2">
              <Link href={`/activity?selectedProject=${dashboard.project.id}`} className="text-sm font-medium text-sky-700 hover:underline">
                Open full activity feed
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">Top Pages</CardTitle>
            <CardDescription>Most recorded URLs for this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page URLs recorded yet.</p>
            ) : (
              dashboard.topPages.map((page) => (
                <div key={page.pageUrl} className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground break-all">{page.pageUrl}</p>
                    <p className="text-sm text-muted-foreground">{formatNumber(page.count)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">Activity Types</CardTitle>
            <CardDescription>Distribution of recorded activity types.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.topActivityTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity types recorded yet.</p>
            ) : (
              dashboard.topActivityTypes.map((item) => (
                <div key={item.type} className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{formatTypeLabel(item.type)}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(item.count)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">Agents</CardTitle>
            <CardDescription>Where this project traffic is coming from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No user agents recorded yet.</p>
            ) : (
              dashboard.topAgents.map((item) => (
                <div key={item.agent} className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.agent}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(item.count)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-headline text-lg">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">
            Latest records stored for the selected project.
          </p>
        </div>

        {dashboard.recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ActivitySet>
            {dashboard.recentActivities.map((activity) => {
              const presentation = presentActivity(activity);

              return (
                <ActivityCard
                  key={activity.id}
                  title={presentation.typeLabel}
                  titleHref={activityHref({
                    selectedProject: dashboard.project.id,
                    activityType: presentation.type,
                  })}
                  pageLabel={activity.pageUrl ?? 'Unknown page'}
                  pageHref={activityHref({
                    selectedProject: dashboard.project.id,
                    pageUrl: activity.pageUrl ?? undefined,
                  })}
                  agentLabel={presentation.agentTypeLabel}
                  agentHref={activityHref({
                    selectedProject: dashboard.project.id,
                    agentType: presentation.agentType.toLowerCase(),
                  })}
                  locationLabel={getIpLocationLabel(activity.ipMap, activity.ip)}
                  timestamp={formatReadableDateTime(activity.activityOn)}
                  detailHref={activityDetailHref(activity.id, dashboard.project.id)}
                />
              );
            })}
          </ActivitySet>
        )}
      </div>
    </div>
  );
}
