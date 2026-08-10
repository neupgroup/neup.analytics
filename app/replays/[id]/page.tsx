'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  User,
  Clock,
  Play,
  Pause,
  RotateCcw,
  MousePointer2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/core/utils';

type InteractionEvent =
  | { type: 'mousemove'; x: number; y: number; timestamp: number }
  | { type: 'click'; x: number; y: number; element: string; timestamp: number }
  | { type: 'scroll'; scrollX: number; scrollY: number; timestamp: number }
  | { type: 'touch'; x: number; y: number; timestamp: number }
  | { type: 'input'; element: string; value: string; timestamp: number }
  | { type: 'keydown'; key: string; element: string; timestamp: number };

type Interaction = {
  id: string;
  createdAt: string;
  userId: string | null;
  pagePath: string;
  page?: { pagePath?: string } | null;
  pageId?: string | null;
  windowWidth: number;
  windowHeight: number;
  events: InteractionEvent[];
};

type Page = {
  id: string;
  content: string;
};

type ClickIndicator = {
  x: number;
  y: number;
  id: number;
};

const ReplayLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="w-full aspect-video rounded-lg" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function ReplayDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [scaledDimensions, setScaledDimensions] = useState({
    width: 0,
    height: 0,
    scale: 1,
  });
  const [clickIndicators, setClickIndicators] = useState<ClickIndicator[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  const replayContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const cursorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(true);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReplay = async () => {
      setIsLoadingInteraction(true);
      setError(null);
      try {
        const res = await fetch(`/api/replays/${id}`);
        if (!res.ok) throw new Error('Failed to load replay');
        const data = await res.json();
        setInteraction(data.interaction ?? data);
        setPage(data.page ?? data.pageSnapshot ?? null);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoadingInteraction(false);
        setIsLoadingPage(false);
      }
    };
    fetchReplay();
  }, [id]);

  useEffect(() => {
    const calculateScale = () => {
      if (replayContainerRef.current && interaction) {
        const containerWidth = replayContainerRef.current.offsetWidth;
        const containerHeight = replayContainerRef.current.offsetHeight;

        const recordingWidth = interaction.windowWidth;
        const recordingHeight = interaction.windowHeight;

        const scaleX = containerWidth / recordingWidth;
        const scaleY = containerHeight / recordingHeight;

        const scale = Math.min(scaleX, scaleY, 1);

        setScaledDimensions({
          width: recordingWidth * scale,
          height: recordingHeight * scale,
          scale,
        });
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [interaction]);

  const totalDuration =
    interaction?.events && interaction.events.length > 0
      ? interaction.events[interaction.events.length - 1].timestamp
      : 0;

  const animatePlayback = useCallback(
    () => {
      if (!isPlaying || !interaction) {
        return;
      }
      
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const newTime = currentTime + delta;
      
      if (newTime >= totalDuration) {
        setCurrentTime(totalDuration);
        setIsPlaying(false);
        return;
      }
      
      setCurrentTime(newTime);
      setPlaybackProgress((newTime / totalDuration) * 100);

      const events = interaction.events;
      const currentEventIndex = events.findIndex(e => e.timestamp > newTime);
      const prevEvent = currentEventIndex > 0 ? events[currentEventIndex - 1] : null;

      if (prevEvent) {
        const nextEvent = events[currentEventIndex];

        if( (prevEvent.type === 'mousemove' || prevEvent.type === 'touch') && nextEvent && (nextEvent.type === 'mousemove' || nextEvent.type === 'touch')){
            const timeIntoSegment = newTime - prevEvent.timestamp;
            const segmentDuration = nextEvent.timestamp - prevEvent.timestamp;
            const progressInSegment = segmentDuration > 0 ? timeIntoSegment / segmentDuration : 0;

            const cursorX = prevEvent.x + (nextEvent.x - prevEvent.x) * progressInSegment;
            const cursorY = prevEvent.y + (nextEvent.y - prevEvent.y) * progressInSegment;

            if(cursorRef.current){
                cursorRef.current.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
            }
        } else if (prevEvent.type === 'mousemove' || prevEvent.type === 'touch') {
            if(cursorRef.current){
                cursorRef.current.style.transform = `translate(${prevEvent.x}px, ${prevEvent.y}px)`;
            }
        }

        if (prevEvent.type === 'scroll' && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.scrollTo(prevEvent.scrollX, prevEvent.scrollY);
        }
        
        if (prevEvent.type === 'click') {
          // Check if this click event is already in the indicators
          if (!clickIndicators.some(c => c.id === prevEvent.timestamp)) {
              setClickIndicators((prev) => [
                ...prev,
                { x: prevEvent.x, y: prevEvent.y, id: prevEvent.timestamp },
              ]);
              setTimeout(() => setClickIndicators((prev) => prev.filter(c => c.id !== prevEvent.timestamp)), 1000);
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animatePlayback);
    },
    [interaction, isPlaying, currentTime, totalDuration, clickIndicators]
  );
  
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animatePlayback);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animatePlayback]);


  const handlePlay = () => {
    if (!interaction || interaction.events.length === 0 || isPlaying) return;
    if (playbackProgress >= 100) {
      handleReplay();
      return;
    }
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReplay = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackProgress(0);
    setClickIndicators([]);
    if(iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.scrollTo(0,0);
    }
    setTimeout(() => {
        if(totalDuration > 0) setIsPlaying(true)
    }, 100);
  };


  const formatTimestamp = (timestamp: string | null | undefined) =>
    timestamp ? new Date(timestamp).toLocaleString() : 'N/A';

  const isLoading = isLoadingInteraction || isLoadingPage;

  const getDeviceIcon = (width: number) => {
    if (width >= 1024) return <Monitor className="h-5 w-5" />;
    if (width >= 768) return <Tablet className="h-5 w-5" />;
    return <Smartphone className="h-5 w-5" />;
  };

  return (
    <div className="space-y-8">
      <Link
        href="/replays"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Session Replays
      </Link>

      {isLoading && <ReplayLoader />}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error loading this session replay: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !interaction && !error && (
        <Alert>
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>
            No session replay was found with this ID.
          </AlertDescription>
        </Alert>
      )}

      {interaction && (
        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <h2 className="font-bold text-xl mb-2">{interaction.page?.pagePath ?? interaction.pagePath}</h2>
            <div
              id="replay-container"
              ref={replayContainerRef}
              className="relative w-full overflow-hidden border rounded-lg bg-muted/20 shadow-inner flex items-center justify-center"
              style={{
                height: 'calc(90vh - 20rem)',
                maxHeight: 'calc(90vh - 20rem)',
              }}
            >
              {page?.content ? (
                <div
                    className="relative overflow-hidden"
                    style={{
                        width: `${scaledDimensions.width}px`,
                        height: `${scaledDimensions.height}px`,
                    }}
                >
                    <iframe
                        ref={iframeRef}
                        srcDoc={page.content}
                        className="w-full h-full border-0 relative pointer-events-none"
                        sandbox="allow-scripts allow-same-origin"
                        scrolling="no"
                        id="replay-iframe"
                        style={{
                          width: `${interaction.windowWidth}px`,
                          height: `${interaction.windowHeight}px`,
                          transform: `scale(${scaledDimensions.scale})`,
                          transformOrigin: 'top left',
                        }}
                    />

                    <div
                        className="absolute inset-0 pointer-events-none"
                        id="replay-overlay"
                        style={{
                          width: `${interaction.windowWidth}px`,
                          height: `${interaction.windowHeight}px`,
                          transform: `scale(${scaledDimensions.scale})`,
                          transformOrigin: 'top left',
                        }}
                    >
                        {clickIndicators.map(click => (
                        <div key={click.id} className="absolute w-4 h-4 rounded-full bg-primary/50 animate-ping"
                             style={{
                               left: click.x - 8,
                               top: click.y - 8,
                             }} />
                        ))}
                        <div ref={cursorRef}
                             className={cn("absolute top-0 left-0", isPlaying ? "opacity-100" : "opacity-0")}
                        >
                            <MousePointer2 className="h-6 w-6 text-primary -translate-x-1 -translate-y-1" />
                        </div>
                    </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">Page snapshot not available.</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 p-2 rounded-lg border bg-card">
              {isPlaying ? (
                <Button onClick={handlePause} variant="outline" size="icon">
                  <Pause className="h-5 w-5 fill-current" />
                </Button>
              ) : (
                <Button onClick={handlePlay} variant="outline" size="icon" disabled={totalDuration === 0}>
                  <Play className="h-5 w-5" />
                </Button>
              )}
              <Button onClick={handleReplay} variant="outline" size="icon" disabled={totalDuration === 0}>
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Progress value={playbackProgress} className="flex-1"/>
              <span className="text-sm text-muted-foreground font-mono w-24 text-center">
                {Math.floor(currentTime / 1000)}s / {Math.floor(totalDuration/1000)}s
              </span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <strong>User:</strong>
                <span className="ml-auto">
                  {!interaction.userId || interaction.userId === 'anonymous'
                    ? 'Anonymous'
                    : interaction.userId.substring(0, 6)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDeviceIcon(interaction.windowWidth)}
                <strong>Window:</strong>
                <span className="ml-auto">
                  {interaction.windowWidth} x {interaction.windowHeight}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                 <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                <strong>Interactions:</strong>
                <span className="ml-auto">{interaction.events.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <strong>Recorded On:</strong>
                <span className="ml-auto">{formatTimestamp(interaction.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
