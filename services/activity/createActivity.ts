import { Prisma, prisma } from '@neup/core/database/prisma';
import { getFreshIpMapsByAddress } from '@/services/ipmap/getIpMap';

type ActivityEventInput = {
  id?: string;
  identifier?: string;
  identifierId?: string;
  type?: string;
  timeSpent?: number;
  timespent?: number;
  activityOn?: Date | string;
  moreDetails?: Prisma.InputJsonValue | null;
  agent?: Prisma.InputJsonValue | null;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
  referral?: string;
  contextId?: string;
  geoLocation?: string;
  url?: string;
  path?: string;
  referrer?: string;
  timestamp?: Date | string;
};

type CreateActivityInput = ActivityEventInput & {
  projectId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function readInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function readDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

function readJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value as Prisma.InputJsonValue;
  }

  if (typeof value === 'object') {
    return value as Prisma.InputJsonValue;
  }

  return undefined;
}

function isLocalDevelopmentOrigin(originUrl: URL): boolean {
  return (
    process.env.NODE_ENV !== 'production'
    && ['localhost', '127.0.0.1', '[::1]'].includes(originUrl.hostname)
  );
}

function isLocalUrl(url: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

export function isProjectOriginAllowed(
  projectPath: string,
  requestOrigin: string,
  collectorUrl?: string
): boolean {
  const normalizedPath = projectPath.trim();
  const normalizedOrigin = requestOrigin.trim();

  if (!normalizedPath || !normalizedOrigin || normalizedOrigin === 'null') {
    return false;
  }

  try {
    const originUrl = new URL(normalizedOrigin);
    const collectionUrl = collectorUrl ? new URL(collectorUrl) : undefined;

    if (
      isLocalDevelopmentOrigin(originUrl)
      || (collectionUrl && isLocalUrl(originUrl) && isLocalUrl(collectionUrl))
    ) {
      return true;
    }

    const hasConfiguredProtocol = /^https?:\/\//i.test(normalizedPath);
    const projectUrl = new URL(
      hasConfiguredProtocol ? normalizedPath : `https://${normalizedPath}`
    );

    const isConfiguredHostname =
      originUrl.hostname === projectUrl.hostname
      || originUrl.hostname.endsWith(`.${projectUrl.hostname}`);
    const hasMatchingPort = originUrl.port === projectUrl.port;

    return hasConfiguredProtocol
      ? projectUrl.protocol === originUrl.protocol
        && isConfiguredHostname
        && hasMatchingPort
      : isConfiguredHostname && hasMatchingPort;
  } catch {
    return false;
  }
}

function normalizeActivityInput(data: CreateActivityInput): Prisma.ActivityUncheckedCreateInput {
  const identifierId = data.identifierId ?? data.identifier;

  if (!identifierId?.trim()) {
    throw new Error('identifier is required');
  }

  if (!data.projectId.trim()) {
    throw new Error('project is required');
  }

  const timeSpent = data.timeSpent ?? data.timespent;

  return {
    id: data.id?.trim() || crypto.randomUUID().replace(/-/g, ''),
    identifierId: identifierId.trim(),
    type: data.type?.trim() || undefined,
    timeSpent:
      typeof timeSpent === 'number' && Number.isInteger(timeSpent)
        ? timeSpent
        : undefined,
    moreDetails: data.moreDetails ?? undefined,
    agent: data.agent ?? undefined,
    ip: data.ip?.trim() || undefined,
    userAgent: data.userAgent?.trim() || undefined,
    contextId: data.contextId?.trim() || undefined,
    geoLocation: data.geoLocation?.trim() || undefined,
    pageUrl: data.pageUrl?.trim() || data.url?.trim() || undefined,
    referral: data.referral?.trim() || data.referrer?.trim() || undefined,
    activityOn: readDate(data.activityOn ?? data.timestamp) ?? new Date(),
    projectId: data.projectId.trim(),
  };
}

export function parseActivityEvents(input: unknown): ActivityEventInput[] {
  const items = Array.isArray(input) ? input : [input];

  return items.map((item) => {
    const record = asRecord(item);

    if (!record) {
      throw new Error('Each activity event must be a JSON object');
    }

    return {
      id: readString(record.id),
      identifier: readString(record.identifier),
      identifierId: readString(record.identifierId),
      type: readString(record.type) ?? readString(record.event),
      timeSpent: readInteger(record.timeSpent),
      timespent: readInteger(record.timespent),
      activityOn: readDate(record.activityOn),
      moreDetails: readJsonValue(record.moreDetails),
      agent: readJsonValue(record.agent),
      ip: readString(record.ip),
      userAgent: readString(record.userAgent) ?? readString(record.user_agent),
      pageUrl: readString(record.pageUrl) ?? readString(record.page_url) ?? readString(record.url),
      referral: readString(record.referral) ?? readString(record.referrer),
      contextId: readString(record.contextId),
      geoLocation: readString(record.geoLocation),
      url: readString(record.url),
      path: readString(record.path),
      referrer: readString(record.referrer),
      timestamp: readDate(record.timestamp),
    };
  });
}

export function isHeartbeatActivityEvent(event: ActivityEventInput): boolean {
  return event.type?.trim().toLowerCase() === 'heartbeat';
}

export function getRecordableActivityEvents(
  events: ActivityEventInput[]
): ActivityEventInput[] {
  return events.filter((event) => !isHeartbeatActivityEvent(event));
}

export async function createActivity(data: CreateActivityInput) {
  const normalized = normalizeActivityInput(data);
  await getFreshIpMapsByAddress([normalized.ip]);

  return prisma.activity.create({
    data: normalized,
  });
}

export async function createActivities(projectId: string, data: ActivityEventInput[]) {
  const recordableEvents = getRecordableActivityEvents(data);
  const normalizedEvents = recordableEvents.map((item) =>
    normalizeActivityInput({
      ...item,
      projectId,
    })
  );

  await getFreshIpMapsByAddress(normalizedEvents.map((item) => item.ip));

  return prisma.$transaction(
    normalizedEvents.map((item) =>
      prisma.activity.create({
        data: item,
      })
    )
  );
}
