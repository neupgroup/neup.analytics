'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/component/ui/card";
// import { useFirestore, useMemoFirebase } from "@/firebase";
// import { collection, query, orderBy, Timestamp, limit, startAfter, getDocs, Query, DocumentData, QuerySnapshot } from "firebase/firestore";
import Link from "next/link";
import { Skeleton } from "@/component/ui/skeleton";
import { PlaySquare, Clock, Laptop, Smartphone, User, ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/component/ui/button";

// Define interaction type
type Interaction = {
  id: string;
  createdAt: string;
  userId: string | null;
  pagePath: string;
  windowWidth: number;
  windowHeight: number;
  _count: { events: number };
};

const REPLAYS_PER_PAGE = 10;

export default function ReplaysPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [page, setPage] = useState(1);
  // pagination cursors removed; server-side paging by page number
  const [isLastPage, setIsLastPage] = useState(false);

  const fetchInteractions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/replays?page=${page}&limit=${REPLAYS_PER_PAGE}`);
      if (!res.ok) throw new Error('Failed to load replays');
      const data = await res.json();
      setInteractions(data.interactions || []);
      const total = data.total || 0;
      setIsLastPage(page * REPLAYS_PER_PAGE >= total);
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);


  const handleNext = () => {
    if (!isLastPage) {
        setPage(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setPage(prev => Math.max(1, prev - 1));
    setIsLastPage(false); // We can always go back
  };

  const formatTimestamp = (timestamp: string | null | undefined) =>
    timestamp ? new Date(timestamp).toLocaleString() : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Session Replays</CardTitle>
        <CardDescription>Watch detailed playbacks of user interaction sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
            <p className="font-semibold">An error occurred while fetching replays.</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && interactions.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
            <PlaySquare className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-bold font-headline mb-2">No Recordings Found</h3>
            <p>It looks like there are no user session recordings yet. Interactions on the landing page will be recorded here.</p>
          </div>
        )}

        <div className="space-y-4">
          {interactions.map(interaction => (
            <Link href={`/replays/${interaction.id}`} key={interaction.id} className="block">
              <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {interaction.windowWidth > 768
                        ? <Laptop className="h-5 w-5 text-muted-foreground" />
                        : <Smartphone className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-semibold">{interaction.pagePath}</p>
                      <p className="text-sm text-muted-foreground">{interaction._count.events} interactions</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{interaction.userId === 'anonymous' || !interaction.userId ? 'Anonymous' : interaction.userId.substring(0,6)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimestamp(interaction.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="tertiary" onClick={handlePrevious} disabled={page <= 1 || isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="tertiary"
            onClick={handleNext}
            disabled={isLastPage || isLoading}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
