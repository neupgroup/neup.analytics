'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity as ActivityIcon } from 'lucide-react';
import { ActivityCard } from '@/components/activity-card';
import { ActivitySet } from '@/components/activity-set';
import { Card, CardContent } from '#/components/ui/card';
import { Skeleton } from '#/components/ui/skeleton';
import { makeAppPath } from '#/core/appconfig';
import { formatReadableDateTime } from '#/core/helpers/date';

type ActivityItem = {
  id: string; pageUrl: string | null; activityOn: string; type: string; typeLabel: string;
  agentType: string; agentTypeLabel: string; locationLabel: string | null;
};

type ActivityFeedProps = { selectedProject: string; filters: Record<string, string | undefined> };

function activityHref(projectId: string, filters: Record<string, string | undefined>) {
  const params = new URLSearchParams({ selectedProject: projectId });
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return `/activity?${params.toString()}`;
}

function ActivitySkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <ActivitySet>
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="border-2 border-slate-200 bg-white shadow-none">
          <CardContent className="space-y-2 px-5 py-4">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
        </Card>
      ))}
    </ActivitySet>
  );
}

function LoadTrigger({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) onVisible(); }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} className="h-px" aria-hidden="true" />;
}

export function ActivityFeed({ selectedProject, filters }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadStartedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (requestInFlightRef.current || isLoading || nextOffset === null) return;
    requestInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ selectedProject, offset: String(nextOffset) });
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const activityApiPath = makeAppPath(
        '/api/activity',
        process.env.NEXT_PUBLIC_APP_BASEPATH || null,
      );
      const response = await fetch(`${activityApiPath}?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load activity.');
      const result = await response.json() as { data: ActivityItem[]; nextOffset: number | null };
      setItems((current) => [...current, ...result.data]);
      setNextOffset(result.nextOffset);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load activity.');
    } finally {
      requestInFlightRef.current = false;
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, [filters, isLoading, nextOffset, selectedProject]);

  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    void loadMore();
  }, [loadMore]);

  const getHref = (extra: Record<string, string | undefined>) => activityHref(selectedProject, { ...filters, ...extra });
  if (!hasLoaded || (isLoading && items.length === 0)) return <ActivitySkeletonRows />;
  if (error && items.length === 0) return <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">{error}</p>;
  if (items.length === 0) return <div className="rounded-lg border border-dashed p-10 text-center"><ActivityIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">No activity yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">No activity records match the current filters.</p></div>;

  const triggerIndex = Math.max(items.length - 20, 0);
  return <div>
    <ActivitySet>
      {items.map((activity, index) => <div key={activity.id}>
        {index === triggerIndex && nextOffset !== null ? <LoadTrigger onVisible={loadMore} /> : null}
        <ActivityCard
          className={`border-2 ${index > 0 ? 'border-t-0' : ''} ${index === 0 ? 'rounded-tl-xl rounded-tr-xl' : ''} ${index === items.length - 1 ? 'rounded-bl-xl rounded-br-xl' : ''}`}
          title={activity.typeLabel}
          titleHref={getHref({ activityType: activity.type })}
          pageLabel={activity.pageUrl ?? 'Unknown page'}
          pageHref={getHref({ pageUrl: activity.pageUrl ?? undefined })}
          agentLabel={activity.agentTypeLabel}
          agentHref={getHref({ agentType: activity.agentType })}
          locationLabel={activity.locationLabel}
          timestamp={formatReadableDateTime(activity.activityOn)}
          detailHref={`/activity/${activity.id}?selectedProject=${encodeURIComponent(selectedProject)}`}
        />
      </div>)}
    </ActivitySet>
    {isLoading ? <div className="mt-3"><ActivitySkeletonRows count={3} /></div> : null}
    {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    {nextOffset === null && !isLoading ? <p className="pt-4 text-center text-sm text-muted-foreground">All activity loaded.</p> : null}
  </div>;
}
