
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import h337 from 'heatmap.js';
// import { useDoc, useCollection, useFirestore, useMemoFirebase, WithId } from '@/firebase';
// import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@neup/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@neup/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { makeAppPath } from '@neup/core/appconfig';

type InteractionEvent =
  | { type: 'mousemove'; x?: number | null; y?: number | null; timestamp: number }
  | { type: 'click'; x?: number | null; y?: number | null; element?: string | null; timestamp: number }
  | { type: 'scroll'; scrollX?: number | null; scrollY?: number | null; timestamp: number }
  | { type: string; timestamp: number };

type Interaction = {
  id: string;
  createdAt: string;
  userId?: string | null;
  pageId?: string | null;
  pagePath?: string;
  windowWidth?: number | null;
  windowHeight?: number | null;
  window?: { width?: number | null; height?: number | null } | null;
  events: InteractionEvent[];
};

type Page = {
  id: string;
  content: string;
  pagePath: string;
};

function getInteractionWindow(interaction: Interaction) {
    const width = interaction.windowWidth ?? interaction.window?.width ?? 0;
    const height = interaction.windowHeight ?? interaction.window?.height ?? 0;

    return {
        width: Number.isFinite(width) && width > 0 ? width : 1920,
        height: Number.isFinite(height) && height > 0 ? height : 1080,
    };
}

function getEventPoint(event: InteractionEvent) {
    const x = 'x' in event ? event.x : null;
    const y = 'y' in event ? event.y : null;

    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }

    return { x, y };
}

function getScrollY(event: InteractionEvent) {
    const scrollY = 'scrollY' in event ? event.scrollY : null;

    return typeof scrollY === 'number' && Number.isFinite(scrollY) ? scrollY : null;
}

const HeatmapPlaceholder = () => (
    <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border bg-muted/20">
        <Skeleton className="h-full w-full" />
    </div>
)

export function HeatmapDisplay({ pageId }: { pageId: string }) {
    const [scaledDimensions, setScaledDimensions] = useState({ width: 0, height: 0, scale: 1 });
    const [page, setPage] = useState<Page | null>(null);
    const [interactions, setInteractions] = useState<Interaction[] | null>(null);
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [isLoadingInteractions, setIsLoadingInteractions] = useState(true);
    const [pageError, setPageError] = useState<Error | null>(null);
    const [interactionsError, setInteractionsError] = useState<Error | null>(null);
    
    const heatmapClickRef = useRef<HTMLDivElement>(null);
    const heatmapMoveRef = useRef<HTMLDivElement>(null);
    const heatmapScrollRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoadingPage(true);
            try {
                const res = await fetch(makeAppPath(`/bridge/api.v1/pages/${pageId}`));
                if (!res.ok) throw new Error('Failed to load page');
                const data = await res.json();
                setPage(data);
            } catch (err: any) {
                setPageError(err);
            } finally {
                setIsLoadingPage(false);
            }
        };

        const fetchInteractions = async () => {
            setIsLoadingInteractions(true);
            try {
                const res = await fetch(makeAppPath(`/bridge/api.v1/pages/${pageId}/interactions`));
                if (!res.ok) throw new Error('Failed to load interactions');
                const data = await res.json();
                setInteractions(data);
            } catch (err: any) {
                setInteractionsError(err);
            } finally {
                setIsLoadingInteractions(false);
            }
        };

        fetchPage();
        fetchInteractions();
    }, [pageId]);

    const isLoading = isLoadingPage || isLoadingInteractions;
    const error = pageError || interactionsError;

    // Memoize processed heatmap data
    const heatmapData = useMemo(() => {
        if (!interactions) return { click: [], move: [], scroll: { data: [], max: 0, docHeight: 0 } };

        const clickData: { x: number; y: number; value: number }[] = [];
        const moveData: { x: number; y: number; value: number }[] = [];
        
        let docHeight = 0;

        interactions.forEach(interaction => {
            const viewport = getInteractionWindow(interaction);

            if (viewport.height > docHeight) {
                docHeight = viewport.height;
            }
            interaction.events.forEach(event => {
                if (event.type === 'click') {
                    const point = getEventPoint(event);
                    if (point) {
                        clickData.push({ ...point, value: 50 });
                    }
                } else if (event.type === 'mousemove') {
                    const point = getEventPoint(event);
                    if (point) {
                        moveData.push({ ...point, value: 5 });
                    }
                } else if (event.type === 'scroll') {
                    const scrollY = getScrollY(event);
                    if (scrollY !== null) {
                        docHeight = Math.max(docHeight, scrollY + viewport.height);
                    }
                }
            });
        });

        const scrollData: { x: number; y: number; value: number }[] = [];
        if (docHeight > 0) {
            const bucketCount = 100; // Create 100 vertical buckets for the heatmap
            const bucketSize = docHeight / bucketCount;
            const scrollCounts = new Array(bucketCount).fill(0);
            let totalViews = interactions.length > 0 ? interactions.length : 1;

            interactions.forEach(interaction => {
                const viewport = getInteractionWindow(interaction);
                const maxScrollY = interaction.events
                    .filter(e => e.type === 'scroll')
                    .reduce((max, e) => Math.max(max, getScrollY(e) ?? 0), 0);

                const scrolledBuckets = Math.floor((maxScrollY + viewport.height) / bucketSize);

                for (let i = 0; i < Math.min(scrolledBuckets, bucketCount); i++) {
                    scrollCounts[i]++;
                }
            });

            let maxBucketValue = 0;
            for(let i=0; i < bucketCount; i++) {
                const percentage = (scrollCounts[i] / totalViews) * 100;
                if(percentage > maxBucketValue) maxBucketValue = percentage;

                scrollData.push({
                    x: scaledDimensions.width / 2, // Center the heatmap point
                    y: (i * bucketSize) + (bucketSize / 2),
                    value: percentage,
                })
            }
             return { click: clickData, move: moveData, scroll: { data: scrollData, max: maxBucketValue, docHeight: docHeight } };
        }
        
        return { click: clickData, move: moveData, scroll: { data: [], max: 0, docHeight: 0 } };
    }, [interactions, scaledDimensions.width]);


    useEffect(() => {
        const calculateScale = () => {
            if (iframeRef.current && page) {
                const containerWidth = iframeRef.current.parentElement?.offsetWidth || 1280;
                const recordedViewports = (interactions ?? []).map(getInteractionWindow);
                const recordingWidth = Math.max(1920, ...recordedViewports.map(viewport => viewport.width));
                const recordingHeight = Math.max(1080, ...recordedViewports.map(viewport => viewport.height));
                const scale = containerWidth / recordingWidth;
                
                setScaledDimensions({
                    width: recordingWidth,
                    height: recordingHeight,
                    scale,
                });
            }
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [page, interactions]);


    useEffect(() => {
        if (isLoading || !page || !heatmapData) return;
        
        const hasContainerHeight = heatmapClickRef.current && heatmapClickRef.current.clientHeight > 0;
        if (!hasContainerHeight) return;

        // Clear previous heatmaps
        if (heatmapClickRef.current) heatmapClickRef.current.innerHTML = '';
        if (heatmapMoveRef.current) heatmapMoveRef.current.innerHTML = '';
        if (heatmapScrollRef.current) heatmapScrollRef.current.innerHTML = '';

        // Click heatmap
        if (heatmapClickRef.current && heatmapData.click.length > 0) {
            const clickHeatmap = h337.create({ container: heatmapClickRef.current, radius: 25, maxOpacity: 0.6, backgroundColor: 'rgba(0,0,0,0)' });
            clickHeatmap.setData({ max: 100, data: heatmapData.click });
        }
        
        // Movement heatmap
        if (heatmapMoveRef.current && heatmapData.move.length > 0) {
            const moveHeatmap = h337.create({ container: heatmapMoveRef.current, radius: 20, maxOpacity: 0.5, blur: 0.9, backgroundColor: 'rgba(0,0,0,0)' });
            moveHeatmap.setData({ max: 50, data: heatmapData.move });
        }
        
        // Scroll heatmap
        if (heatmapScrollRef.current && heatmapData.scroll.data.length > 0) {
            const scrollHeatmap = h337.create({ 
                container: heatmapScrollRef.current, 
                radius: 100,
                maxOpacity: 0.8,
                blur: 0.95,
                backgroundColor: 'rgba(0,0,0,0)',
                gradient: {
                    '.1': 'rgba(0,0,255,0)',
                    '.25': 'rgba(0,0,255,.5)',
                    '.5': 'rgba(0,255,0,.5)',
                    '.75': 'rgba(255,255,0,.5)',
                    '1': 'rgba(255,0,0,.5)'
                }
            });
            scrollHeatmap.setData({ max: heatmapData.scroll.max, data: heatmapData.scroll.data });
        }

    }, [isLoading, page, heatmapData, scaledDimensions]);

    if (isLoading) {
        return <HeatmapPlaceholder />;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error loading heatmap data</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        )
    }

    if (!page) {
         return (
            <Alert>
                <AlertTitle>Page Not Found</AlertTitle>
                <AlertDescription>The snapshot for this page could not be found. It may have been deleted.</AlertDescription>
            </Alert>
        )
    }
    
    if (interactions?.length === 0) {
         return (
            <Alert>
                <AlertTitle>No Interaction Data</AlertTitle>
                <AlertDescription>There are no recorded user interactions for this page yet.</AlertDescription>
            </Alert>
        )
    }


    const iframeHeight = heatmapData.scroll.docHeight > 0 ? heatmapData.scroll.docHeight : scaledDimensions.height;
    const containerHeight = iframeHeight * scaledDimensions.scale;


    return (
        <Tabs defaultValue="click" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="click">Click Heatmap</TabsTrigger>
                <TabsTrigger value="scroll">Scroll Heatmap</TabsTrigger>
                <TabsTrigger value="movement">Movement Heatmap</TabsTrigger>
            </TabsList>

            <div 
                className="relative mt-4 w-full overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/20 shadow-inner"
                style={{ height: containerHeight > 3000 ? '1500px' : `${containerHeight}px` }}
            >
                <iframe
                    ref={iframeRef}
                    srcDoc={page.content}
                    className="pointer-events-none relative border-0"
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="no"
                    style={{
                        width: `${scaledDimensions.width}px`,
                        height: `${iframeHeight}px`,
                        transform: `scale(${scaledDimensions.scale})`,
                        transformOrigin: 'top left',
                    }}
                />
                <div className="absolute inset-0 pointer-events-none" 
                     style={{
                        transform: `scale(${scaledDimensions.scale})`,
                        transformOrigin: 'top left',
                        width: `${scaledDimensions.width}px`,
                        height: `${iframeHeight}px`,
                     }}
                >
                    <TabsContent value="click" forceMount>
                        <div ref={heatmapClickRef} className="w-full h-full" />
                    </TabsContent>
                    <TabsContent value="scroll" forceMount>
                        <div ref={heatmapScrollRef} className="w-full h-full" />
                    </TabsContent>
                    <TabsContent value="movement" forceMount>
                        <div ref={heatmapMoveRef} className="w-full h-full" />
                    </TabsContent>
                </div>
            </div>
        </Tabs>
    );
}
