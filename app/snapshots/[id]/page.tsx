'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Skeleton } from '#/components/ui/skeleton';

type Snapshot = {
  id: string;
  pageUrl: string;
  data: string;
  details: {
    title?: string | null;
    pagePath?: string | null;
    capturedBy?: string | null;
    capturedAt?: string | null;
    contentType?: string | null;
    status?: number | null;
  } | null;
  createdOn: string;
  size: number;
};

type ViewportPreset = {
  label: string;
  width: number;
  height: number;
};

const viewportPresets: ViewportPreset[] = [
  { label: '4K', width: 4000, height: 2000 },
  { label: 'Desktop', width: 1920, height: 1080 },
  { label: 'Laptop', width: 1440, height: 900 },
  { label: 'Tablet', width: 1024, height: 1366 },
];

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SnapshotPreviewPanel({ snapshot }: { snapshot: Snapshot }) {
  const [viewport, setViewport] = useState<ViewportPreset>(viewportPresets[0]);
  const [scale, setScale] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;

    const updateScale = () => {
      const bounds = element.getBoundingClientRect();
      const chromeHeight = 84;
      const padding = 32;
      const availableWidth = Math.max(bounds.width - padding, 0);
      const availableHeight = Math.max(bounds.height - padding - chromeHeight, 0);
      const nextScale = Math.min(
        availableWidth / viewport.width,
        availableHeight / viewport.height,
        1
      );

      setScale(Number.isFinite(nextScale) ? nextScale : 1);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(element);

    return () => observer.disconnect();
  }, [viewport.height, viewport.width]);

  return (
    <div
      ref={previewRef}
      className="mx-auto flex h-[min(78vh,900px)] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-slate-950 p-4 shadow-2xl shadow-slate-950/20"
    >
      <style>{`
        .snapshot-viewport-shell {
          width: ${viewport.width * scale}px;
          height: ${viewport.height * scale}px;
          max-width: 100%;
          max-height: 100%;
        }

        .snapshot-viewport-frame {
          width: ${viewport.width}px;
          height: ${viewport.height}px;
          transform: scale(${scale});
          transform-origin: top left;
        }
      `}</style>

      <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Snapshot browser
        </span>
        <span>Static render</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-400/90" />
            <span className="h-3 w-3 rounded-full bg-amber-400/90" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
          </div>

          <div className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-slate-200">
            <p className="truncate">{snapshot.pageUrl}</p>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300">
            {viewport.width} × {viewport.height}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 py-6">
          {snapshot.data ? (
            <div
              className="snapshot-viewport-shell relative overflow-hidden rounded-lg bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.75)]"
            >
              <iframe
                srcDoc={snapshot.data}
                title={snapshot.details?.title || snapshot.pageUrl || 'Snapshot viewer'}
                className="snapshot-viewport-frame pointer-events-none absolute left-0 top-0 border-0 bg-white"
                sandbox=""
              />
            </div>
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900 px-6 text-center text-sm text-slate-400">
              Snapshot HTML is empty.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {viewportPresets.map((preset) => {
          const isActive = preset.label === viewport.label;

          return (
            <Button
              key={preset.label}
              htmlType="button"
              variant={isActive ? 'solid' : 'outlined'}
              size="sm"
              onClick={() => setViewport(preset)}
            >
              {preset.label} {preset.width}×{preset.height}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function SnapshotDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/snapshots/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load snapshot');
        }

        setSnapshot(data.snapshot ?? null);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSnapshot();
  }, [id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                <CardTitle className="font-headline truncate">
                  {snapshot?.details?.title || snapshot?.pageUrl || 'Snapshot'}
                </CardTitle>
                <CardDescription>
                  {snapshot ? `${formatTimestamp(snapshot.createdOn)} · ${formatSize(snapshot.size)}` : 'Saved snapshot viewer'}
                </CardDescription>
              </>
            )}
          </div>

          {snapshot?.pageUrl && (
            <Link variant="tinted" size="sm" className="shrink-0" href={snapshot.pageUrl} target="_blank" rel="noreferrer">
                Open site
                <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          )}
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load snapshot</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && !snapshot && (
            <Alert>
              <AlertTitle>Not found</AlertTitle>
              <AlertDescription>No snapshot was found with this ID.</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-[60vh] w-full rounded-lg" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            </div>
          )}

          {!isLoading && snapshot && (
            <div className="space-y-4">
              <SnapshotPreviewPanel snapshot={snapshot} />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">URL</p>
                  <p className="mt-1 break-all text-sm">{snapshot.pageUrl}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Captured</p>
                  <p className="mt-1 text-sm">{formatTimestamp(snapshot.createdOn)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Size</p>
                  <p className="mt-1 text-sm">{formatSize(snapshot.size)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                  <p className="mt-1 text-sm">{snapshot.details?.capturedBy || 'unknown'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
