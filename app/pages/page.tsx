'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Link } from '#/components/ui/link';
import { Skeleton } from '#/components/ui/skeleton';
import { FileText, Search, ArrowRight } from 'lucide-react';
import { Button } from '#/components/ui/button';

type Page = {
    id: string;
    pagePath: string;
    recordedOn: string;
    content: string;
    version: number;
    siteId: string;
};

export function PagesSkeleton() {
    return (
        <Card aria-busy="true" aria-label="Loading pages">
            <CardHeader className="space-y-2"><Skeleton className="h-6 w-44" /><Skeleton className="h-4 w-96 max-w-full" /></CardHeader>
            <CardContent className="space-y-3">
                {[...Array(4)].map((_, index) => <div key={index} className="flex items-center gap-4 rounded-lg border p-4"><Skeleton className="h-16 w-24 shrink-0 rounded-md" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="h-9 w-28" /></div>)}
            </CardContent>
        </Card>
    );
}

export default function PagesPage() {
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const res = await fetch('/api/pages');
                if (!res.ok) throw new Error('Failed to load pages');
                const data = await res.json();
                setPages(data);
            } catch (err: any) {
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPages();
    }, []);

    const formatTimestamp = (timestamp: string | null | undefined) => (timestamp ? new Date(timestamp).toLocaleString() : 'N/A');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Page Management</CardTitle>
                <CardDescription>View and manage the page snapshots recorded for session replays.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="overflow-hidden rounded-lg border">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
                                <Skeleton className="h-16 w-24 shrink-0 rounded-md" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                                <Skeleton className="h-9 w-28 rounded-md" />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
                        <p className="font-semibold">An error occurred while fetching pages.</p>
                        <p className="text-sm">{error.message}</p>
                    </div>
                )}

                {!isLoading && !error && pages.length === 0 && (
                    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
                        <Search className="h-16 w-16 mb-4" />
                        <h3 className="text-xl font-bold font-headline mb-2">No Pages Recorded</h3>
                        <p>As users visit pages on your site, snapshots will be automatically captured and displayed here.</p>
                    </div>
                )}

                {!isLoading && !error && pages.length > 0 && (
                    <div className="overflow-hidden rounded-lg border bg-card">
                        {pages.map((page) => (
                            <div key={page.id} className="group flex flex-col gap-4 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40 sm:flex-row sm:items-center">
                                <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md border bg-muted sm:w-32">
                                    {page.content ? (
                                        <>
                                            <iframe srcDoc={page.content} className="h-[160px] w-[256px] origin-top-left scale-50" sandbox="allow-scripts allow-same-origin" scrolling="no" />
                                            <div className="absolute inset-0 bg-transparent" title="Page preview"></div>
                                        </>
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <FileText className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <FileText className="mt-0.5 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{page.pagePath}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Version {page.version} - Recorded on {formatTimestamp(page.recordedOn)}
                                        </p>
                                    </div>
                                </div>

                                <Link variant="tinted" size="sm" className="w-full shrink-0 sm:w-auto" href={`/pages/${page.id}`}>
                                        View Details
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
