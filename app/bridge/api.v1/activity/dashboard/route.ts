import { NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';
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
    id: string; pageUrl: string | null; ip: string | null; duration: number; activityOn: Date;
    type: string; typeLabel: string; agentType: string; agentTypeLabel: string; locationLabel: string | null;
    country: string | null; region: string | null; area: string | null;
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
  const country = optionalParam(searchParams.get('country'));
  const region = optionalParam(searchParams.get('region'));
  const area = optionalParam(searchParams.get('area'));

  const matches = (value: string | null | undefined, expected: string | undefined) =>
    !expected || value?.trim().toLowerCase() === expected.toLowerCase();

  while (accepted.length < PAGE_SIZE && !exhausted) {
    const activities = await prisma.activity.findMany({
      where,
      orderBy: [{ activityOn: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: QUERY_BATCH_SIZE,
      select: { id: true, type: true, agent: true, pageUrl: true, userAgent: true, ip: true, duration: true, activityOn: true },
    });
    offset += activities.length;
    exhausted = activities.length < QUERY_BATCH_SIZE;

    const ipMapsByAddress = await getFreshIpMapsByAddress(activities.map((activity) => activity.ip));
    for (const activity of activities) {
      const presentation = presentActivity(activity);
      if (activityType && presentation.type !== activityType) continue;
      if (agentType && presentation.agentType.toLowerCase() !== agentType) continue;
      const ipMap = ipMapsByAddress.get(activity.ip ?? '');
      if (!matches(ipMap?.country, country) || !matches(ipMap?.region, region)) continue;
      if (area && `${ipMap?.city ?? ''}, ${ipMap?.region ?? ''}, ${ipMap?.country ?? ''}`.toLowerCase() !== area.toLowerCase()) continue;
      accepted.push({
        id: activity.id,
        pageUrl: activity.pageUrl,
        ip: activity.ip,
        duration: activity.duration,
        activityOn: activity.activityOn,
        type: presentation.type,
        typeLabel: presentation.typeLabel,
        agentType: presentation.agentType.toLowerCase(),
        agentTypeLabel: presentation.agentTypeLabel,
        locationLabel: getIpLocationLabel(ipMap, activity.ip),
        country: ipMap?.country ?? null,
        region: ipMap?.region ?? null,
        area: ipMap?.city ? `${ipMap.city}, ${ipMap.region ?? ''}, ${ipMap.country ?? ''}`.replace(/,\s*,/g, ',').replace(/,\s*$/, '') : null,
      });
      if (accepted.length === PAGE_SIZE) break;
    }
  }

  const data = accepted.map((activity) => ({
    ...activity,
    activityOn: activity.activityOn.toISOString(),
    locationLabel: activity.locationLabel,
  }));

  return NextResponse.json({ data, nextOffset: exhausted ? null : offset });
}
