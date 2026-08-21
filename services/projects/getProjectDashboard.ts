import { prisma } from '@/core/database/prisma';
import { getFreshIpMapsByAddress } from '@/services/ipmap/getIpMap';

type ProjectDashboardDay = {
  label: string;
  dateKey: string;
  count: number;
};

type ProjectDashboardPage = {
  pageUrl: string;
  count: number;
};

type ProjectDashboardType = {
  type: string;
  count: number;
};

type ProjectDashboardAgent = {
  agent: string;
  count: number;
};

type ProjectDashboardActivity = {
  id: string;
  type: string | null;
  userAgent: string | null;
  ip: string | null;
  pageUrl: string | null;
  referral: string | null;
  activityOn: Date;
  ipMap: {
    city: string | null;
    region: string | null;
    country: string | null;
    ipType: string;
  } | null;
};

type ProjectDashboardProject = {
  id: string;
  path: string;
  type: string;
  createdOn: Date;
};

export type ProjectDashboard = {
  project: ProjectDashboardProject;
  totals: {
    totalActivities: number;
    uniqueVisitors: number;
    uniquePages: number;
    activeToday: number;
  };
  activityTrend: ProjectDashboardDay[];
  topPages: ProjectDashboardPage[];
  topActivityTypes: ProjectDashboardType[];
  topAgents: ProjectDashboardAgent[];
  recentActivities: ProjectDashboardActivity[];
};

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getWindowStart(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date;
}

function normalizeAgent(userAgent: string | null): string {
  if (!userAgent) {
    return 'Unknown';
  }

  const normalized = userAgent.toLowerCase();

  if (normalized.includes('bot') || normalized.includes('spider') || normalized.includes('crawler')) {
    return 'Bot';
  }

  if (normalized.includes('iphone') || normalized.includes('android')) {
    return 'Mobile';
  }

  if (normalized.includes('ipad') || normalized.includes('tablet')) {
    return 'Tablet';
  }

  if (normalized.includes('mozilla') || normalized.includes('chrome') || normalized.includes('safari')) {
    return 'Browser';
  }

  if (normalized.includes('curl') || normalized.includes('axios') || normalized.includes('postman')) {
    return 'API';
  }

  return 'Other';
}

function sortEntriesDescending(entries: Map<string, number>) {
  return Array.from(entries.entries()).sort((left, right) => right[1] - left[1]);
}

export async function getProjectDashboard(projectId: string): Promise<ProjectDashboard | null> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      path: true,
      type: true,
      createdOn: true,
    },
  });

  if (!project) {
    return null;
  }

  const trendStart = getWindowStart(14);
  const todayStart = getWindowStart(1);

  const [allActivities, trendActivities, recentActivities, todayActivities] = await Promise.all([
    prisma.activity.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        identifierId: true,
        type: true,
        userAgent: true,
        ip: true,
        pageUrl: true,
        activityOn: true,
      },
    }),
    prisma.activity.findMany({
      where: {
        projectId: project.id,
        activityOn: {
          gte: trendStart,
        },
      },
      select: {
        activityOn: true,
      },
      orderBy: {
        activityOn: 'asc',
      },
    }),
    prisma.activity.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        type: true,
        userAgent: true,
        ip: true,
        pageUrl: true,
        referral: true,
        activityOn: true,
      },
      orderBy: {
        activityOn: 'desc',
      },
      take: 8,
    }),
    prisma.activity.findMany({
      where: {
        projectId: project.id,
        activityOn: {
          gte: todayStart,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  const uniqueVisitors = new Set(
    allActivities.map((activity) => activity.identifierId.trim()).filter(Boolean)
  ).size;
  const recentIpMapsByAddress = await getFreshIpMapsByAddress(
    recentActivities.map((activity) => activity.ip)
  );

  const pageCounts = new Map<string, number>();
  const activityTypeCounts = new Map<string, number>();
  const agentCounts = new Map<string, number>();

  for (const activity of allActivities) {
    if (activity.pageUrl) {
      pageCounts.set(activity.pageUrl, (pageCounts.get(activity.pageUrl) ?? 0) + 1);
    }

    const type = activity.type?.trim() || 'visit';
    activityTypeCounts.set(type, (activityTypeCounts.get(type) ?? 0) + 1);

    const agent = normalizeAgent(activity.userAgent);
    agentCounts.set(agent, (agentCounts.get(agent) ?? 0) + 1);
  }

  const trendCounts = new Map<string, number>();

  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + offset);
    trendCounts.set(getDateKey(date), 0);
  }

  for (const activity of trendActivities) {
    const key = getDateKey(activity.activityOn);
    trendCounts.set(key, (trendCounts.get(key) ?? 0) + 1);
  }

  const activityTrend = Array.from(trendCounts.entries()).map(([dateKey, count]) => {
    const date = new Date(dateKey);

    return {
      label: getDayLabel(date),
      dateKey,
      count,
    };
  });

  return {
    project,
    totals: {
      totalActivities: allActivities.length,
      uniqueVisitors,
      uniquePages: pageCounts.size,
      activeToday: todayActivities.length,
    },
    activityTrend,
    topPages: sortEntriesDescending(pageCounts)
      .slice(0, 5)
      .map(([pageUrl, count]) => ({
        pageUrl,
        count,
      })),
    topActivityTypes: sortEntriesDescending(activityTypeCounts)
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
      })),
    topAgents: sortEntriesDescending(agentCounts)
      .slice(0, 4)
      .map(([agent, count]) => ({
        agent,
        count,
      })),
    recentActivities: recentActivities.map((activity) => ({
      ...activity,
      ipMap: activity.ip ? (recentIpMapsByAddress.get(activity.ip) ?? null) : null,
    })),
  };
}
