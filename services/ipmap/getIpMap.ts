import { Prisma, prisma } from '@neup/core/database/prisma';

const IPMAP_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

type IpMapRecord = Awaited<ReturnType<typeof prisma.ipMap.findFirst>>;

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();

  return normalized ? normalized : undefined;
}

function normalizeIpAddress(value: string | null | undefined): string | undefined {
  return readString(value);
}

export function isDevelopmentIpAddress(ipAddress: string): boolean {
  const normalized = ipAddress.trim().toLowerCase();

  return (
    normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '0.0.0.0'
    || normalized.startsWith('192.168.')
    || normalized.startsWith('10.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    || normalized.startsWith('fd')
    || normalized.startsWith('fc')
    || normalized.startsWith('fe80:')
  );
}

function inferIpType(ipAddress: string): 'ip4' | 'ip6' | 'dev' {
  if (isDevelopmentIpAddress(ipAddress)) {
    return 'dev';
  }

  return ipAddress.includes(':') ? 'ip6' : 'ip4';
}

function isIpMapFresh(lastUpdated: Date): boolean {
  return Date.now() - lastUpdated.getTime() < IPMAP_REFRESH_INTERVAL_MS;
}

function parseGeoLocation(loc: string | undefined): Prisma.InputJsonValue | undefined {
  if (!loc) {
    return undefined;
  }

  const [latitudeRaw, longitudeRaw] = loc.split(',');
  const latitude = Number.parseFloat(latitudeRaw ?? '');
  const longitude = Number.parseFloat(longitudeRaw ?? '');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { loc };
  }

  return {
    loc,
    latitude,
    longitude,
  };
}

function buildDevelopmentIpMap(ipAddress: string): Prisma.IpMapCreateInput {
  return {
    ipAddress,
    ipType: 'dev',
    ipInfo: {
      ip: ipAddress,
      source: 'local',
    },
    moreDetails: {
      source: 'ipinfo.io',
      lookupSkipped: true,
      reason: 'development_ip_address',
    },
    lastUpdated: new Date(),
  };
}

async function fetchIpInfo(ipAddress: string): Promise<Prisma.IpMapCreateInput> {
  const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ipAddress)}`, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  let payload: Record<string, unknown> | null = null;

  try {
    payload = await response.json() as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reason = readString(payload?.error) ?? response.statusText;

    throw new Error(`ipinfo lookup failed: ${reason}`);
  }

  return {
    ipAddress,
    ipType: inferIpType(ipAddress),
    city: readString(payload?.city),
    region: readString(payload?.region),
    country: readString(payload?.country),
    geoLocation: parseGeoLocation(readString(payload?.loc)),
    ipInfo: (payload ?? {
      ip: ipAddress,
    }) as Prisma.InputJsonValue,
    moreDetails: {
      source: 'ipinfo.io',
      hostname: readString(payload?.hostname),
      organization: readString(payload?.org),
      postal: readString(payload?.postal),
      timezone: readString(payload?.timezone),
    },
    lastUpdated: new Date(),
  };
}

async function persistIpMap(
  existing: NonNullable<IpMapRecord> | null,
  data: Prisma.IpMapCreateInput
) {
  if (!existing) {
    return prisma.ipMap.create({
      data,
    });
  }

  await prisma.ipMap.updateMany({
    where: {
      ipAddress: existing.ipAddress,
    },
    data: {
      ipType: data.ipType,
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      geoLocation: data.geoLocation ?? Prisma.JsonNull,
      ipInfo: data.ipInfo ?? Prisma.JsonNull,
      moreDetails: data.moreDetails ?? Prisma.JsonNull,
      lastUpdated: data.lastUpdated as Date,
    },
  });

  return prisma.ipMap.findFirst({
    where: {
      ipAddress: existing.ipAddress,
    },
    orderBy: {
      lastUpdated: 'desc',
    },
  });
}

async function createFailedLookupIpMap(
  existing: NonNullable<IpMapRecord> | null,
  ipAddress: string,
  error: unknown
) {
  const message = error instanceof Error ? error.message : 'Unknown IP lookup error';
  const data: Prisma.IpMapCreateInput = {
    ipAddress,
    ipType: inferIpType(ipAddress),
    ipInfo: {
      ip: ipAddress,
    },
    moreDetails: {
      source: 'ipinfo.io',
      error: message,
    },
    lastUpdated: new Date(),
  };

  return persistIpMap(existing, data);
}

export async function getFreshIpMap(ipAddress: string | null | undefined) {
  const normalizedIpAddress = normalizeIpAddress(ipAddress);

  if (!normalizedIpAddress) {
    return null;
  }

  const existing = await prisma.ipMap.findFirst({
    where: {
      ipAddress: normalizedIpAddress,
    },
    orderBy: {
      lastUpdated: 'desc',
    },
  });

  if (existing && isIpMapFresh(existing.lastUpdated)) {
    return existing;
  }

  try {
    const data = inferIpType(normalizedIpAddress) === 'dev'
      ? buildDevelopmentIpMap(normalizedIpAddress)
      : await fetchIpInfo(normalizedIpAddress);

    return await persistIpMap(existing, data);
  } catch (error) {
    if (existing) {
      return existing;
    }

    return createFailedLookupIpMap(existing, normalizedIpAddress, error);
  }
}

export async function getFreshIpMapsByAddress(
  ipAddresses: Array<string | null | undefined>
) {
  const uniqueIpAddresses = Array.from(
    new Set(
      ipAddresses
        .map(normalizeIpAddress)
        .filter((value): value is string => Boolean(value))
    )
  );

  const ipMaps = await Promise.all(
    uniqueIpAddresses.map(async (ipAddress) => {
      const ipMap = await getFreshIpMap(ipAddress);

      return ipMap ? [ipAddress, ipMap] as const : null;
    })
  );

  return new Map(
    ipMaps.filter((entry): entry is readonly [string, NonNullable<IpMapRecord>] => Boolean(entry))
  );
}

export function formatIpMapLocation(ipMap: Pick<NonNullable<IpMapRecord>, 'city' | 'region' | 'country'> | null | undefined) {
  const parts = [ipMap?.city, ipMap?.region, ipMap?.country]
    .filter(Boolean)
    .map(String);

  return parts.length > 0 ? parts.join(', ') : null;
}

export function getIpLocationLabel(
  ipMap: Pick<NonNullable<IpMapRecord>, 'city' | 'region' | 'country' | 'ipType'> | null | undefined,
  ipAddress: string | null | undefined
) {
  const normalizedIpAddress = normalizeIpAddress(ipAddress);

  if (ipMap?.ipType === 'dev') {
    return null;
  }

  if (normalizedIpAddress && isDevelopmentIpAddress(normalizedIpAddress)) {
    return null;
  }

  return formatIpMapLocation(ipMap);
}
