'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Page = {
    id: string;
    pagePath: string;
    recordedOn: string;
    content: string;
    version: number;
    siteId: string;
};

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-48 w-full rounded-lg" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pages.map((page) => (
                        <Card key={page.id} className="flex flex-col">
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <CardTitle className="text-base font-semibold">{page.pagePath}</CardTitle>
                                    <CardDescription className="text-xs">Version {page.version}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow aspect-video relative border-t border-b overflow-hidden">
                                <iframe srcDoc={page.content} className="w-full h-full scale-[0.5] origin-top-left" sandbox="allow-scripts allow-same-origin" scrolling="no" />
                                <div className="absolute inset-0 bg-transparent" title="Page preview"></div>
                            </CardContent>
                            <CardFooter className="flex-col items-start pt-4">
                                <p className="text-xs text-muted-foreground">Recorded on: {formatTimestamp(page.recordedOn)}</p>
                                <Button asChild variant="outline" size="sm" className="w-full mt-4">
                                    <Link href={`/pages/${page.id}`}>
                                        View Details
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
