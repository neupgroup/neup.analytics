'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { LinkButton } from '@neup/components/ui/link-button';
import { Skeleton } from '@neup/components/ui/skeleton';
import { FileText, Search, ArrowRight, Plus } from 'lucide-react';
import { makeAppPath } from '@neup/core/appconfig';

type Page = {
    id: string;
    pagePath: string;
    recordedOn: string;
    content: string;
    version: number;
    siteId: string;
};

type ConfiguredPage = { id: string; pageName: string; description: string; iteration: string };

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
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [configuredPages, setConfiguredPages] = useState<ConfiguredPage[]>([]);
    const selectedProject = useSearchParams().get('selectedProject');

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const res = await fetch(makeAppPath(`/bridge/api.v1/pages?selectedProject=${encodeURIComponent(selectedProject ?? '')}`));
                if (!res.ok) throw new Error('Failed to load pages');
                const data = await res.json();
                setPages(data.pages ?? []);
                setRecommendations(data.recommendations ?? []);
                setConfiguredPages(data.configuredPages ?? []);
            } catch (err: any) {
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPages();
    }, [selectedProject]);

    const formatTimestamp = (timestamp: string | null | undefined) => (timestamp ? new Date(timestamp).toLocaleString() : 'N/A');

    return (
        <div className="space-y-6">
            <div>
                <CardTitle className="font-headline">Page Management</CardTitle>
                <CardDescription>View and manage the page snapshots recorded for session replays.</CardDescription>
            </div>
            <div>
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

                {!isLoading && !error && (
                    <div className="overflow-hidden rounded-lg border bg-card">
                        {recommendations.length === 0 && configuredPages.length === 0 && pages.length === 0 && (
                            <div className="flex items-center gap-4 border-b p-4">
                                <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border bg-muted"><Search className="h-6 w-6 text-muted-foreground" /></div>
                                <div className="min-w-0 flex-1"><p className="text-sm font-medium">No pages found</p><p className="mt-1 text-xs text-muted-foreground">Pages will appear here after activity is recorded.</p></div>
                            </div>
                        )}
                        <div className="border-b">
                            <LinkButton variant="plain" href={`/pages/add?selectedProject=${encodeURIComponent(selectedProject ?? '')}`} className="flex h-auto w-full flex-col items-stretch gap-3 border-0 p-4 text-left hover:bg-muted/40 sm:flex-row sm:items-center">
                                <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border bg-muted"><Plus className="h-6 w-6 text-muted-foreground" /></div>
                                <div className="min-w-0 flex-1"><p className="text-sm font-medium">Create new page</p><p className="mt-1 text-xs text-muted-foreground">Add a page manually to this project.</p></div>
                                <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                            </LinkButton>
                        </div>
                        {recommendations.map((pageName) => (
                            <div key={`recommendation-${pageName}`} className="border-b">
                                <LinkButton variant="plain" href={`/pages/add?page=${encodeURIComponent(pageName)}&selectedProject=${encodeURIComponent(selectedProject ?? '')}`} className="flex h-auto w-full items-center gap-4 rounded-none border-0 p-4 text-left transition-colors hover:bg-muted/40">
                                    <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border bg-muted"><FileText className="h-6 w-6 text-muted-foreground" /></div>
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{pageName}</p><p className="mt-1 text-xs text-muted-foreground">Found in Activity. Click on the card to add</p></div>
                                    <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                                </LinkButton>
                            </div>
                        ))}
                        {configuredPages.map((page) => (
                            <div key={`configured-${page.id}`} className="flex items-center gap-4 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40">
                                <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border bg-muted"><FileText className="h-6 w-6 text-muted-foreground" /></div>
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{page.pageName}</p><p className="mt-1 text-xs text-muted-foreground">Added page · Iteration {page.iteration}</p></div>
                            </div>
                        ))}
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

                                <LinkButton variant="tinted" size="sm" className="w-full shrink-0 sm:w-auto" href={`/pages/${page.id}`}>
                                        View Details
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </LinkButton>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
