'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Camera, ExternalLink, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type Snapshot = {
  id: string;
  pageUrl: string;
  data: string;
  details: {
    title?: string | null;
    pagePath?: string | null;
    capturedBy?: string | null;
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

export default function SnapshotsPage() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/snapshots');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load snapshots');
      }

      setSnapshots(data.snapshots || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCapturing(true);

    try {
      const response = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record snapshot');
      }

      setUrl('');
      setSnapshots((current) => [data.snapshot, ...current]);
      toast({
        title: 'Snapshot recorded',
        description: data.snapshot.pageUrl,
      });
    } catch (err: any) {
      toast({
        title: 'Snapshot failed',
        description: err.message || 'Unable to record this URL.',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Snapshots</CardTitle>
          <CardDescription>Record a page snapshot manually by URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="snapshot-url">Page URL</Label>
              <Input
                id="snapshot-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/pricing"
                inputMode="url"
                disabled={isCapturing}
              />
            </div>
            <Button type="submit" disabled={isCapturing || !url.trim()} className="sm:w-auto">
              {isCapturing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Record
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-headline">Recent Snapshots</CardTitle>
            <CardDescription>Manual and automatic snapshots saved in the snapshot table.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSnapshots} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load snapshots</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && snapshots.length === 0 && (
            <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
              <FileText className="mb-4 h-14 w-14" />
              <h3 className="mb-2 font-headline text-xl font-bold">No Snapshots Yet</h3>
              <p>Record a page by URL to save the first snapshot.</p>
            </div>
          )}

          {!isLoading && !error && snapshots.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-card">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex flex-col gap-4 border-b p-4 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md border bg-muted sm:w-32">
                    {snapshot.data ? (
                      <>
                        <iframe
                          srcDoc={snapshot.data}
                          className="h-[160px] w-[256px] origin-top-left scale-50"
                          sandbox="allow-scripts allow-same-origin"
                          scrolling="no"
                        />
                        <div className="absolute inset-0 bg-transparent" title="Snapshot preview" />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {snapshot.details?.title || snapshot.pageUrl}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{snapshot.pageUrl}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatTimestamp(snapshot.createdOn)} · {formatSize(snapshot.size)}
                      {snapshot.details?.capturedBy ? ` · ${snapshot.details.capturedBy}` : ''}
                    </p>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
                    <a href={snapshot.pageUrl} target="_blank" rel="noreferrer">
                      Open
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
