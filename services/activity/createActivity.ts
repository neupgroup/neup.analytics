import { Prisma, prisma } from '@/core/database/prisma';

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
  location?: Prisma.InputJsonValue | null;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
  referral?: string;
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
    activityOn: readDate(data.activityOn) ?? new Date(),
    moreDetails: data.moreDetails ?? undefined,
    agent: data.agent ?? undefined,
    location: data.location ?? undefined,
    ip: data.ip?.trim() || undefined,
    userAgent: data.userAgent?.trim() || undefined,
    pageUrl: data.pageUrl?.trim() || undefined,
    referral: data.referral?.trim() || undefined,
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
      type: readString(record.type),
      timeSpent: readInteger(record.timeSpent),
      timespent: readInteger(record.timespent),
      activityOn: readDate(record.activityOn),
      moreDetails: readJsonValue(record.moreDetails),
      agent: readJsonValue(record.agent),
      location: readJsonValue(record.location),
      ip: readString(record.ip),
      userAgent: readString(record.userAgent) ?? readString(record.user_agent),
      pageUrl: readString(record.pageUrl) ?? readString(record.page_url),
      referral: readString(record.referral),
    };
  });
}

export async function createActivity(data: CreateActivityInput) {
  const normalized = normalizeActivityInput(data);

  return prisma.activity.create({
    data: normalized,
  });
}

export async function createActivities(projectId: string, data: ActivityEventInput[]) {
  return prisma.$transaction(
    data.map((item) =>
      prisma.activity.create({
        data: normalizeActivityInput({
          ...item,
          projectId,
        }),
      })
    )
  );
}
