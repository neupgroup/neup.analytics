import { Link } from '@neup/components/ui/link';
import { redirect } from 'next/navigation';
import { X } from 'lucide-react';
import { ActivityFeed } from '@/components/activity-feed';
import { prisma } from '@neup/core/database/prisma';
import { makeAppPath } from '@neup/core/appconfig';
import { url } from '@neup/core/helpers/link/url';

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

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const selectedProject = params.selectedProject?.trim();
  if (!selectedProject) redirect(makeAppPath('/projects'));

  const project = await prisma.project.findUnique({ where: { id: selectedProject }, select: { id: true } });
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="mt-2 text-muted-foreground">View activity collected for the selected project.</p>
      </div>
      {activeFilters.length > 0 ? <div className="flex flex-wrap gap-2">{activeFilters.map((filter) => <Link key={filter.key} href={activityHref(project.id, Object.fromEntries(Object.entries(filters).filter(([key]) => key !== filter.key)))}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700"><span>{filter.key}: {filter.value}</span><X className="h-3.5 w-3.5" /></Link>)}</div> : null}
      <ActivityFeed selectedProject={project.id} filters={filters} />
    </div>
  );
}
