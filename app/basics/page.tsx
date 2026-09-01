import {
  Clock,
  Globe2,
  Laptop,
  MapPin,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import { prisma } from '#/core/database/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { ProgressBar } from '#/components/element/progressbar';
import { Skeleton } from '#/components/ui/skeleton';
import { Suspense } from 'react';

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-lg" />)}</div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56 w-full rounded-lg" /><Skeleton className="h-56 w-full rounded-lg" /></div>
    </div>
  );
}

type InteractionSummary = {
  id: string;
  userId: string | null;
  windowWidth: number;
  windowHeight: number;
  userAgent: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  events: { timestamp: number; value: string | null }[];
};

type CountRow = {
  label: string;
  count: number;
  description?: string;
};

function classifyDevice(interaction: InteractionSummary) {
  const ua = interaction.userAgent?.toLowerCase() ?? '';

  if (/ipad|tablet|kindle|silk|playbook/.test(ua)) return 'Tablet';
  if (/mobi|iphone|android.*mobile|windows phone/.test(ua)) return 'Mobile';
  if (interaction.windowWidth > 0 && interaction.windowWidth < 640) return 'Mobile';
  if (interaction.windowWidth >= 640 && interaction.windowWidth < 1024) return 'Tablet';
  if (interaction.windowWidth >= 1024) return 'Desktop';

  return 'Unknown';
}

function getDeviceIcon(label: string) {
  if (label === 'Mobile') return Smartphone;
  if (label === 'Tablet') return Tablet;
  if (label === 'Desktop') return Laptop;
  return MonitorSmartphone;
}

function increment(map: Map<string, CountRow>, label: string, description?: string) {
  const existing = map.get(label);

  if (existing) {
    existing.count += 1;
    return;
  }

  map.set(label, { label, count: 1, description });
}

function getPercent(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  if (minutes <= 0) return `${remainder}s`;
  if (minutes < 60) return `${minutes}m ${remainder}s`;

  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  return `${hours}h ${leftoverMinutes}m`;
}

function getSessionDurationSeconds(interaction: InteractionSummary) {
  const heartbeatDurations = interaction.events
    .filter((event) => event.value && /^\d+$/.test(event.value))
    .map((event) => Number(event.value) / 1000)
    .filter((value) => Number.isFinite(value));

  if (heartbeatDurations.length > 0) {
    return Math.max(...heartbeatDurations);
  }

  const timestamps = interaction.events
    .map((event) => event.timestamp)
    .filter((value) => Number.isFinite(value));

  if (timestamps.length < 2) return 0;

  return Math.max(...timestamps) - Math.min(...timestamps);
}

function getLocationLabel(interaction: InteractionSummary) {
  const parts = [interaction.city, interaction.region, interaction.country]
    .filter(Boolean)
    .map(String);

  if (parts.length > 0) return parts.join(', ');
  if (interaction.ip) return interaction.ip;
  return 'Unknown location';
}

function getGeoLabel(interaction: InteractionSummary) {
  if (interaction.latitude == null || interaction.longitude == null) {
    return null;
  }

  const latitude = interaction.latitude.toFixed(2);
  const longitude = interaction.longitude.toFixed(2);

  return {
    label: `${latitude}, ${longitude}`,
    description: getLocationLabel(interaction),
  };
}

export default function BasicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-normal">Basics</h1>
        <p className="text-muted-foreground">
          Core audience, location, and session-time analytics from collected traffic.
        </p>
      </div>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <BasicsData />
      </Suspense>
    </div>
  );
}

async function BasicsData() {
  const interactions = await prisma.interaction.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      windowWidth: true,
      windowHeight: true,
      userAgent: true,
      ip: true,
      city: true,
      region: true,
      country: true,
      latitude: true,
      longitude: true,
      events: {
        select: {
          timestamp: true,
          value: true,
        },
      },
    },
  });

  const totalSessions = interactions.length;
  const knownUsers = new Set(interactions.map((item) => item.userId).filter(Boolean)).size;
  const peopleCount = knownUsers || totalSessions;
  const deviceMap = new Map<string, CountRow>();
  const ipLocationMap = new Map<string, CountRow>();
  const geoLocationMap = new Map<string, CountRow>();
  const sessionDurations = interactions.map(getSessionDurationSeconds);
  const totalTimeSeconds = sessionDurations.reduce((total, value) => total + value, 0);
  const averageSessionSeconds = totalSessions ? totalTimeSeconds / totalSessions : 0;

  for (const interaction of interactions) {
    const device = classifyDevice(interaction);
    const viewport =
      interaction.windowWidth && interaction.windowHeight
        ? `${interaction.windowWidth} x ${interaction.windowHeight}`
        : undefined;

    increment(deviceMap, device, viewport);
    increment(ipLocationMap, getLocationLabel(interaction), interaction.ip ?? undefined);

    const geo = getGeoLabel(interaction);
    if (geo) {
      increment(geoLocationMap, geo.label, geo.description);
    }
  }

  const deviceRows = Array.from(deviceMap.values()).sort((a, b) => b.count - a.count);
  const ipLocationRows = Array.from(ipLocationMap.values()).sort((a, b) => b.count - a.count);
  const geoLocationRows = Array.from(geoLocationMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-headline text-2xl font-bold">{formatNumber(peopleCount)}</div>
            <p className="text-xs text-muted-foreground">
              {knownUsers ? 'Known users with recorded sessions' : 'Anonymous sessions counted as people'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-headline text-2xl font-bold">
              {formatDuration(totalTimeSeconds)}
            </div>
            <p className="text-xs text-muted-foreground">
              Summed from heartbeat and event timing data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Session</CardTitle>
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-headline text-2xl font-bold">
              {formatDuration(averageSessionSeconds)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {formatNumber(totalSessions)} recorded sessions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
            Devices
          </CardTitle>
          <CardDescription>How many users are coming from each device type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deviceRows.length ? (
            deviceRows.map((row) => {
              const Icon = getDeviceIcon(row.label);
              const percent = getPercent(row.count, totalSessions);

              return (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        {row.description ? (
                          <p className="truncate text-xs text-muted-foreground">
                            Recent viewport {row.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatNumber(row.count)}</p>
                      <p className="text-xs text-muted-foreground">{percent}%</p>
                    </div>
                  </div>
                  <ProgressBar value={percent} />
                </div>
              );
            })
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No device data has been collected yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Globe2 className="h-5 w-5 text-muted-foreground" />
              Location by IP
            </CardTitle>
            <CardDescription>Users grouped by IP-derived city, region, and country.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ipLocationRows.length ? (
              ipLocationRows.slice(0, 10).map((row) => {
                const percent = getPercent(row.count, totalSessions);

                return (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.label}</p>
                        {row.description ? (
                          <p className="truncate text-xs text-muted-foreground">IP {row.description}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatNumber(row.count)}</p>
                        <p className="text-xs text-muted-foreground">{percent}%</p>
                      </div>
                    </div>
                  <ProgressBar value={percent} />
                  </div>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No IP location data has been collected yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              Location by Geo
            </CardTitle>
            <CardDescription>Users grouped by captured latitude and longitude.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {geoLocationRows.length ? (
              geoLocationRows.slice(0, 10).map((row) => {
                const percent = getPercent(row.count, totalSessions);

                return (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.label}</p>
                        {row.description ? (
                          <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatNumber(row.count)}</p>
                        <p className="text-xs text-muted-foreground">{percent}%</p>
                      </div>
                    </div>
                  <ProgressBar value={percent} />
                  </div>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No geo coordinate data has been collected yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
