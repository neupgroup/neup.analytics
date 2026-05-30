'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <Link href="/snapshots" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Snapshots
      </Link>

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
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <a href={snapshot.pageUrl} target="_blank" rel="noreferrer">
                Open site
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
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
              <div className="overflow-hidden rounded-lg border bg-muted/20 shadow-inner">
                {snapshot.data ? (
                  <iframe
                    srcDoc={snapshot.data}
                    title={snapshot.details?.title || snapshot.pageUrl || 'Snapshot viewer'}
                    className="h-[75vh] w-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex min-h-[50vh] items-center justify-center text-center text-sm text-muted-foreground">
                    <div>
                      <FileText className="mx-auto mb-3 h-10 w-10" />
                      Snapshot HTML is empty.
                    </div>
                  </div>
                )}
              </div>

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
