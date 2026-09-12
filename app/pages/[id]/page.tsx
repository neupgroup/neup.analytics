'use client';

import { use, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { Skeleton } from '@neup/components/ui/skeleton';
import { ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';
import { makeAppPath } from '@neup/core/appconfig';
import { Button } from '@neup/components/ui/button';

type PageSnapshot = {
  pagePath: string;
  recordedOn: string;
  content: string;
  siteId: string;
  version: number;
  interactionsCount: number;
};

const devicePreviews = [
  { name: 'Desktop', width: 1280, height: 720, icon: Monitor },
  { name: 'Tablet', width: 768, height: 1024, icon: Tablet },
  { name: 'Mobile', width: 375, height: 667, icon: Smartphone },
];

export function PageDetailSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading page snapshot">
      <CardHeader className="space-y-2"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-3">
        {devicePreviews.map((device) => <div key={device.name} className="space-y-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-[260px] w-full rounded-lg" /></div>)}
      </CardContent>
    </Card>
  );
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

export default function PageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState<PageSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLivePage, setShowLivePage] = useState(false);
  const [liveContent, setLiveContent] = useState<string | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPage() {
      try {
        const response = await fetch(makeAppPath(`/bridge/api.v1/pages/${encodeURIComponent(id)}`));
        if (!response.ok) throw new Error(response.status === 404 ? 'Page snapshot not found.' : 'Failed to load page snapshot.');
        const data = await response.json() as PageSnapshot;
        if (!cancelled) setPage(data);
      } catch (fetchError) {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : 'Failed to load page snapshot.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPage();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Page Snapshot</h1>
        <p className="mt-2 text-muted-foreground">Review the captured page across common device sizes.</p>
      </div>

      {isLoading ? <PageDetailSkeleton /> : error ? (
        <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      ) : !page ? (
        <Alert><AlertTitle>Not Found</AlertTitle><AlertDescription>No page snapshot was found with this ID.</AlertDescription></Alert>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="font-headline">{page.pagePath}</CardTitle>
                <CardDescription>Recorded on {formatTimestamp(page.recordedOn)} from site {page.siteId}</CardDescription>
              </div>
              <Button variant="tinted" size="sm" onClick={async () => {
                if (showLivePage) { setShowLivePage(false); return; }
                setIsLoadingLive(true);
                try {
                  const response = await fetch(makeAppPath(`/bridge/api.v1/pages/${encodeURIComponent(id)}/live`));
                  if (!response.ok) throw new Error('Unable to load the live page.');
                  const data = await response.json() as { html: string };
                  setLiveContent(data.html);
                  setShowLivePage(true);
                } catch (liveError) {
                  setError(liveError instanceof Error ? liveError.message : 'Unable to load the live page.');
                } finally { setIsLoadingLive(false); }
              }} disabled={isLoadingLive}>{isLoadingLive ? 'Loading live page…' : showLivePage ? 'Show snapshot' : 'Load page live'}<ExternalLink className="ml-2 h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {devicePreviews.map((device) => (
              <div key={device.name}>
                <div className="mb-2 flex items-center gap-2"><device.icon className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">{device.name}</h3><p className="text-sm text-muted-foreground">({device.width}px)</p></div>
                <div className="overflow-hidden rounded-lg border bg-muted/20 shadow-inner">
                  <iframe srcDoc={showLivePage && liveContent !== null ? liveContent : page.content} style={{ width: `${device.width}px`, height: `${device.height}px`, transform: `scale(${100 / (device.width / 340)}%)`, transformOrigin: 'top left' }} className="border-0" sandbox="allow-scripts allow-same-origin" title={`${device.name} preview`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
