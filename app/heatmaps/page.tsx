
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/component/ui/card";
// import { useCollection, useFirestore, useMemoFirebase, WithId } from "@/firebase";
// import { collection, query, orderBy, Timestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/component/ui/select";
import { HeatmapDisplay } from '@/components/dashboard/heatmap-display';
import { Skeleton } from '@/component/ui/skeleton';
import { Search } from 'lucide-react';

type Page = {
    id: string;
    pagePath: string;
    recordedOn: string;
    version: number;
    siteId?: string | null;
    content?: string;
}

export default function HeatmapsPage() {
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [uniquePages, setUniquePages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/pages');
                if (!res.ok) throw new Error('Failed to load pages');
                const data = await res.json();
                setUniquePages(data || []);
            } catch (err: any) {
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPages();
    }, []);

    const handlePageChange = (pageId: string) => {
        setSelectedPageId(pageId || null);
    };
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Heatmaps</CardTitle>
                    <CardDescription>Visualize where users click, move, and scroll on your pages.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <Select onValueChange={handlePageChange} disabled={isLoading || !uniquePages || uniquePages.length === 0}>
                            <SelectTrigger className="w-full sm:w-[300px]">
                                <SelectValue placeholder="Select a page to analyze" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading && <SelectItem value="loading" disabled>Loading pages...</SelectItem>}
                                {uniquePages.map((page) => (
                                    <SelectItem key={page.id} value={page.id}>
                                        {page.page_path}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Other filters could go here */}
                   </div>

                   {isLoading && (
                        <div className="space-y-4">
                            <Skeleton className="h-9 w-full sm:w-[300px]" />
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                   )}
                   
                   {!isLoading && !selectedPageId && (
                       <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
                            <Search className="h-16 w-16 mb-4" />
                            <h3 className="text-xl font-bold font-headline mb-2">Select a Page</h3>
                            <p>Choose a page from the dropdown above to view its heatmap.</p>
                       </div>
                   )}

                   {selectedPageId && <HeatmapDisplay pageId={selectedPageId} />}
                </CardContent>
            </Card>
        </div>
    );
}
