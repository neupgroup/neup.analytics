'use client';

import { use, useMemo } from "react";
// import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
// import { doc, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Page = {
    id: string;
    page_path: string;
    recorded_on: Timestamp;
    content: string;
    version: number;
    site_id: string;
}

const devicePreviews = [
    { name: 'Desktop', width: 1280, height: 720, icon: Monitor },
    { name: 'Tablet', width: 768, height: 1024, icon: Tablet },
    { name: 'Mobile', width: 375, height: 667, icon: Smartphone },
];

export default function PageDetailPage({ params }: { params: { id: string } }) {
    const { id } = use(Promise.resolve(params));
    // TODO: Replace with Prisma-based data fetching
    // const page = null;
    // const isLoading = false;
    // const error = null;
    // const formatTimestamp = (timestamp: Date | null | undefined) => timestamp ? timestamp.toLocaleString() : 'N/A';

    return (
        <div className="space-y-4">
            <Card>
                 <CardHeader>
                    {isLoading ? (
                        <div className="space-y-2">
                             <Skeleton className="h-8 w-3/4" />
                             <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : (
                        <>
                            <CardTitle className="font-headline">
                                Page Snapshot: {page?.page_path}
                            </CardTitle>
                            <CardDescription>
                                Recorded on {formatTimestamp(page?.recorded_on)} from site {page?.site_id}
                            </CardDescription>
                        </>
                    )}
                </CardHeader>
                <CardContent>
                    {error && (
                         <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                There was an error loading this page snapshot: {error.message}
                            </AlertDescription>
                        </Alert>
                    )}
                     {!isLoading && !page && !error && (
                         <Alert>
                            <AlertTitle>Not Found</AlertTitle>
                            <AlertDescription>
                                No page snapshot was found with this ID.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         {devicePreviews.map(device => (
                            <div key={device.name}>
                                <div className="flex items-center gap-2 mb-2">
                                    <device.icon className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="font-semibold">{device.name}</h3>
                                    <p className="text-sm text-muted-foreground">({device.width}px)</p>
                                </div>
                                {isLoading ? (
                                    <Skeleton style={{ height: `${device.height / 2}px`, width: '100%' }} />
                                ) : page ? (
                                     <div className="border rounded-lg overflow-hidden shadow-inner bg-muted/20">
                                        <iframe
                                            srcDoc={page.content}
                                            style={{ width: `${device.width}px`, height: `${device.height}px`, transform: `scale(${100 / (device.width / 340)}%)`, transformOrigin: 'top left' }}
                                            className="border-0"
                                            sandbox="allow-scripts allow-same-origin"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
