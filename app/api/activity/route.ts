import { NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';
import { presentActivity } from '@/services/activity/presentActivity';
import { getFreshIpMapsByAddress, getIpLocationLabel } from '@/services/ipmap/getIpMap';

const PAGE_SIZE = 50;
const QUERY_BATCH_SIZE = 100;

function optionalParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = optionalParam(searchParams.get('selectedProject'));

  if (!projectId) return NextResponse.json({ message: 'selectedProject is required' }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ message: 'Project not found' }, { status: 404 });

  const activityType = optionalParam(searchParams.get('activityType'))?.toLowerCase();
  const agentType = optionalParam(searchParams.get('agentType'))?.toLowerCase();
  const offsetParam = Number.parseInt(searchParams.get('offset') ?? '0', 10);
  let offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
  const accepted: Array<{
    id: string; pageUrl: string | null; ip: string | null; activityOn: Date;
    type: string; typeLabel: string; agentType: string; agentTypeLabel: string; locationLabel: string | null;
  }> = [];
  let exhausted = false;

  const where = {
    projectId: project.id,
    pageUrl: optionalParam(searchParams.get('pageUrl')),
    identifierId: optionalParam(searchParams.get('identifier')),
    userAgent: optionalParam(searchParams.get('userAgent')),
    referral: optionalParam(searchParams.get('referral')),
    ip: optionalParam(searchParams.get('ip')),
  };

  while (accepted.length < PAGE_SIZE && !exhausted) {
    const activities = await prisma.activity.findMany({
      where,
      orderBy: [{ activityOn: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: QUERY_BATCH_SIZE,
      select: { id: true, type: true, agent: true, pageUrl: true, userAgent: true, ip: true, activityOn: true },
    });
    offset += activities.length;
    exhausted = activities.length < QUERY_BATCH_SIZE;

    for (const activity of activities) {
      const presentation = presentActivity(activity);
      if (activityType && presentation.type !== activityType) continue;
      if (agentType && presentation.agentType.toLowerCase() !== agentType) continue;
      accepted.push({
        id: activity.id,
        pageUrl: activity.pageUrl,
        ip: activity.ip,
        activityOn: activity.activityOn,
        type: presentation.type,
        typeLabel: presentation.typeLabel,
        agentType: presentation.agentType.toLowerCase(),
        agentTypeLabel: presentation.agentTypeLabel,
        locationLabel: null,
      });
      if (accepted.length === PAGE_SIZE) break;
    }
  }

  const ipMapsByAddress = await getFreshIpMapsByAddress(accepted.map((activity) => activity.ip));
  const data = accepted.map((activity) => ({
    ...activity,
    activityOn: activity.activityOn.toISOString(),
    locationLabel: getIpLocationLabel(ipMapsByAddress.get(activity.ip ?? ''), activity.ip),
  }));

  return NextResponse.json({ data, nextOffset: exhausted ? null : offset });
}
