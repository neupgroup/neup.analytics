import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity as ActivityIcon,
  X,
} from 'lucide-react';
import { ActivityCard } from '@/components/activity-card';
import { ActivitySet } from '@/components/activity-set';
import { prisma } from '@/core/database/prisma';
import { formatReadableDateTime } from '@/core/helpers/date';
import { makeAppPath } from '@/core/appconfig';
import { url } from '@/core/helpers/link/url';
import { presentActivity } from '@/services/activity/presentActivity';
import { getFreshIpMapsByAddress, getIpLocationLabel } from '@/services/ipmap/getIpMap';

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
  }>;
};

function activityHref(params: {
  selectedProject: string;
  activityType?: string;
  agentType?: string;
  pageUrl?: string;
  identifier?: string;
  userAgent?: string;
  referral?: string;
  ip?: string;
}) {
  return url('/activity', '/')
    .addParam('selectedProject', params.selectedProject)
    .addParam('activityType', params.activityType)
    .addParam('agentType', params.agentType)
    .addParam('pageUrl', params.pageUrl)
    .addParam('identifier', params.identifier)
    .addParam('userAgent', params.userAgent)
    .addParam('referral', params.referral)
    .addParam('ip', params.ip)
    .get();
}

function activityDetailHref(activityId: string, selectedProject: string) {
  return url(`/activity/${activityId}`, '/')
    .addParam('selectedProject', selectedProject)
    .get();
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const params = await searchParams;
  const selectedProject = params.selectedProject?.trim();
  const selectedActivityType = params.activityType?.trim().toLowerCase();
  const selectedAgentType = params.agentType?.trim().toLowerCase();
  const selectedPageUrl = params.pageUrl?.trim();
  const selectedIdentifier = params.identifier?.trim();
  const selectedUserAgent = params.userAgent?.trim();
  const selectedReferral = params.referral?.trim();
  const selectedIp = params.ip?.trim();

  if (!selectedProject) {
    redirect(makeAppPath('/projects'));
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
    redirect(makeAppPath('/projects'));
  }

  const activities = await prisma.activity.findMany({
    where: {
      projectId: project.id,
    },
    orderBy: {
      activityOn: 'desc',
    },
  });
  const ipMapsByAddress = await getFreshIpMapsByAddress(
    activities.map((activity) => activity.ip)
  );

  const presentedActivities = activities
    .map((activity) => ({
      activity,
      presentation: presentActivity(activity),
      ipMap: activity.ip ? ipMapsByAddress.get(activity.ip) : null,
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

      if (selectedIdentifier && activity.identifierId !== selectedIdentifier) {
        return false;
      }

      if (selectedUserAgent && activity.userAgent !== selectedUserAgent) {
        return false;
      }

      if (selectedReferral && activity.referral !== selectedReferral) {
        return false;
      }

      if (selectedIp && activity.ip !== selectedIp) {
        return false;
      }

      return true;
    });

  const activeFilters = [
    selectedActivityType
      ? {
          key: 'activityType',
          label: `Type: ${selectedActivityType}`,
          href: activityHref({
            selectedProject: project.id,
            agentType: selectedAgentType,
            pageUrl: selectedPageUrl,
            identifier: selectedIdentifier,
            userAgent: selectedUserAgent,
            referral: selectedReferral,
            ip: selectedIp,
          }),
        }
      : null,
    selectedPageUrl
      ? {
          key: 'pageUrl',
          label: `URL: ${selectedPageUrl}`,
          href: activityHref({
            selectedProject: project.id,
            activityType: selectedActivityType,
            agentType: selectedAgentType,
            identifier: selectedIdentifier,
            userAgent: selectedUserAgent,
            referral: selectedReferral,
            ip: selectedIp,
          }),
        }
      : null,
    selectedAgentType
      ? {
          key: 'agentType',
          label: `Agent: ${selectedAgentType}`,
          href: activityHref({
            selectedProject: project.id,
            activityType: selectedActivityType,
            pageUrl: selectedPageUrl,
            identifier: selectedIdentifier,
            userAgent: selectedUserAgent,
            referral: selectedReferral,
            ip: selectedIp,
          }),
        }
      : null,
    selectedIdentifier
      ? {
          key: 'identifier',
          label: `Identifier: ${selectedIdentifier}`,
          href: activityHref({
            selectedProject: project.id,
            activityType: selectedActivityType,
            agentType: selectedAgentType,
            pageUrl: selectedPageUrl,
            userAgent: selectedUserAgent,
            referral: selectedReferral,
            ip: selectedIp,
          }),
        }
      : null,
    selectedUserAgent
      ? {
          key: 'userAgent',
          label: `User Agent: ${selectedUserAgent}`,
          href: activityHref({
            selectedProject: project.id,
            activityType: selectedActivityType,
            agentType: selectedAgentType,
            pageUrl: selectedPageUrl,
            identifier: selectedIdentifier,
            referral: selectedReferral,
            ip: selectedIp,
          }),
        }
      : null,
    selectedReferral
      ? {
          key: 'referral',
          label: `Referral: ${selectedReferral}`,
          href: activityHref({
            selectedProject: project.id,
            activityType: selectedActivityType,
            agentType: selectedAgentType,
            pageUrl: selectedPageUrl,
            identifier: selectedIdentifier,
            userAgent: selectedUserAgent,
            ip: selectedIp,
          }),
        }
      : null,
    selectedIp
      ? {
          key: 'ip',
          label: `IP: ${selectedIp}`,
          href: activityHref({
            selectedProject: project.id,
            activityType: selectedActivityType,
            agentType: selectedAgentType,
            pageUrl: selectedPageUrl,
            identifier: selectedIdentifier,
            userAgent: selectedUserAgent,
            referral: selectedReferral,
          }),
        }
      : null,
  ].filter((filter): filter is { key: string; label: string; href: string } => Boolean(filter));

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

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Link
              key={filter.key}
              href={filter.href}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200"
            >
              <span>{filter.label}</span>
              <X className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      ) : null}

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
        <ActivitySet>
          {presentedActivities.map(({ activity, presentation, ipMap }) => (
            <ActivityCard
              key={activity.id}
              title={presentation.typeLabel}
              titleHref={activityHref({
                selectedProject: project.id,
                activityType: presentation.type,
                agentType: selectedAgentType,
                pageUrl: selectedPageUrl,
                identifier: selectedIdentifier,
                userAgent: selectedUserAgent,
                referral: selectedReferral,
                ip: selectedIp,
              })}
              pageLabel={activity.pageUrl ?? 'Unknown page'}
              pageHref={activityHref({
                selectedProject: project.id,
                activityType: selectedActivityType,
                agentType: selectedAgentType,
                pageUrl: activity.pageUrl ?? undefined,
                identifier: selectedIdentifier,
                userAgent: selectedUserAgent,
                referral: selectedReferral,
                ip: selectedIp,
              })}
              agentLabel={presentation.agentTypeLabel}
              agentHref={activityHref({
                selectedProject: project.id,
                activityType: selectedActivityType,
                agentType: presentation.agentType.toLowerCase(),
                pageUrl: selectedPageUrl,
                identifier: selectedIdentifier,
                userAgent: selectedUserAgent,
                referral: selectedReferral,
                ip: selectedIp,
              })}
              locationLabel={getIpLocationLabel(ipMap, activity.ip)}
              timestamp={formatReadableDateTime(activity.activityOn)}
              detailHref={activityDetailHref(activity.id, project.id)}
            />
          ))}
        </ActivitySet>
      )}
    </div>
  );
}
