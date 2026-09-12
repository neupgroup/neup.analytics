import { Link } from '@neup/components/ui/link';
import { redirect } from 'next/navigation';
import { X } from 'lucide-react';
import { Card, CardContent } from '@neup/components/ui/card';
import { ActivityFeed } from '@/components/activity-feed';
import { prisma } from '@neup/core/database/prisma';
import { makeAppPath } from '@neup/core/appconfig';
import { url } from '@neup/core/helpers/link/url';
import { getFreshIpMapsByAddress } from '@/services/ipmap/getIpMap';

type ActivityPageProps = {
  searchParams: Promise<{
    selectedProject?: string;
    activityType?: string;
    agentType?: string;
    pageUrl?: string;
    identifier?: string;
    userAgent?: string;
    referral?: string;
    ip?: string;
    country?: string;
    region?: string;
    area?: string;
  }>;
};

function activityHref(selectedProject: string, filters: Record<string, string | undefined>) {
  const activityUrl = url('/activity', '/').addParam('selectedProject', selectedProject);
  Object.entries(filters).forEach(([key, value]) => activityUrl.addParam(key, value));
  return activityUrl.get();
}

function formatTimeSpent(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!seconds) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `${minutes} minute${minutes === 1 ? '' : 's'} and ${seconds} second${seconds === 1 ? '' : 's'}`;
}

function formatActivityAge(value: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const selectedProject = params.selectedProject?.trim();
  if (!selectedProject) redirect(makeAppPath('/projects'));

  const project = await prisma.project.findUnique({ where: { id: selectedProject }, select: { id: true, type: true } });
  if (!project) redirect(makeAppPath('/projects'));

  const filters = {
    activityType: params.activityType?.trim().toLowerCase(),
    agentType: params.agentType?.trim().toLowerCase(),
    pageUrl: params.pageUrl?.trim(),
    identifier: params.identifier?.trim(),
    userAgent: params.userAgent?.trim(),
    referral: params.referral?.trim(),
    ip: params.ip?.trim(),
    country: params.country?.trim(),
    region: params.region?.trim(),
    area: params.area?.trim(),
  };
  const activeFilters = Object.entries(filters)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({ key, value: value as string }));
  const userSummary = filters.identifier
    ? await Promise.all([
      prisma.activity.aggregate({
        where: { projectId: project.id, identifierId: filters.identifier, type: 'pageview' },
        _count: { _all: true },
        _sum: { duration: true },
      }),
      prisma.activity.findFirst({
        where: { projectId: project.id, identifierId: filters.identifier },
        orderBy: [{ activityOn: 'asc' }, { id: 'asc' }],
        select: { activityOn: true },
      }),
      prisma.activity.findFirst({
        where: { projectId: project.id, identifierId: filters.identifier },
        orderBy: [{ activityOn: 'desc' }, { id: 'desc' }],
        select: { activityOn: true, referral: true },
      }),
    ]).then(([pageviews, firstActivity, lastActivity]) => ({ pageviews, firstActivity, lastActivity }))
    : null;
  const projectNoun = project.type.toLowerCase() === 'application' ? 'application' : 'website';
  const locationInsight = filters.country || filters.region || filters.area
    ? await (async () => {
      const activities = await prisma.activity.findMany({
        where: { projectId: project.id, type: 'pageview' },
        select: { identifierId: true, ip: true },
      });
      const ipMaps = await getFreshIpMapsByAddress(activities.map((activity) => activity.ip));
      const users = new Set<string>();
      for (const activity of activities) {
        const map = ipMaps.get(activity.ip ?? '');
        const countryMatches = !filters.country || map?.country?.toLowerCase() === filters.country.toLowerCase();
        const regionMatches = !filters.region || map?.region?.toLowerCase() === filters.region.toLowerCase();
        const fullLocation = [map?.city, map?.region, map?.country].filter(Boolean).join(', ');
        const areaMatches = !filters.area || fullLocation.toLowerCase() === filters.area.toLowerCase();
        if (countryMatches && regionMatches && areaMatches) users.add(activity.identifierId);
      }
      const locationLabel = filters.area || (filters.region && filters.country ? `${filters.region}, ${filters.country}` : filters.country);
      return locationLabel ? { count: users.size, label: locationLabel } : null;
    })()
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="mt-2 text-muted-foreground">View activity collected for the selected project.</p>
      </div>
      {activeFilters.length > 0 ? <div className="flex flex-wrap gap-2">{activeFilters.map((filter) => <Link key={filter.key} href={activityHref(project.id, Object.fromEntries(Object.entries(filters).filter(([key]) => key !== filter.key)))}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700"><span>{filter.key}: {filter.value}</span><X className="h-3.5 w-3.5" /></Link>)}</div> : null}
      {userSummary?.firstActivity && userSummary.lastActivity ? <Card><CardContent className="px-5 py-4 text-sm text-slate-700">This user viewed <span className="font-semibold">{userSummary.pageviews._count._all} pages</span>, spent <span className="font-semibold">{formatTimeSpent(userSummary.pageviews._sum.duration ?? 0)}</span> on your {projectNoun}, arrived via <span className="font-semibold">{userSummary.lastActivity.referral || 'direct'}</span> <span className="font-semibold">{formatActivityAge(userSummary.firstActivity.activityOn)}</span>, and last opened the site <span className="font-semibold">{formatActivityAge(userSummary.lastActivity.activityOn)}</span>.</CardContent></Card> : null}
      {locationInsight ? <Card><CardContent className="px-5 py-4 text-sm text-slate-700"><span className="font-semibold">{locationInsight.count} users from {locationInsight.label} have visited your {projectNoun}.</span></CardContent></Card> : null}
      <ActivityFeed selectedProject={project.id} filters={filters} />
    </div>
  );
}
