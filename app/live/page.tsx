"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Eye, MousePointer2, User, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/utils';
import { Avatar, AvatarFallback } from '@/component/ui/avatar';

type User = {
  id: string;
  lastSeen: Timestamp;
  page: string;
  isLive: boolean;
  lastInteraction?: InteractionEvent;
};

type InteractionEvent =
  | { type: 'mousemove'; x: number; y: number; timestamp: number }
  | { type: 'click'; x: number; y: number; element: string; timestamp: number };

type Page = {
  id: string;
  content: string;
  page_path: string;
};

const LiveUserCard = ({ user }: { user: any }) => {
  const [scaledDimensions, setScaledDimensions] = useState({ width: 0, height: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [clickIndicator, setClickIndicator] = useState<{ x: number; y: number; id: number } | null>(null);
  const page = user?.pageSnapshot ?? null;

  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current && page) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerWidth * (9 / 16);
        containerRef.current.style.height = `${containerHeight}px`;

        const recordingWidth = 1920;
        const recordingHeight = 1080;

        const scale = containerWidth / recordingWidth;

        setScaledDimensions({ width: recordingWidth * scale, height: recordingHeight * scale, scale });
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [page]);

  useEffect(() => {
    if (!user?.lastInteraction || !cursorRef.current) return;

    const { type, x, y } = user.lastInteraction;
    if (type === 'mousemove') {
      cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
    } else if (type === 'click') {
      cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
      const clickId = Date.now();
      setClickIndicator({ x, y, id: clickId });
      setTimeout(() => setClickIndicator((prev) => (prev?.id === clickId ? null : prev)), 1000);
    }
  }, [user?.lastInteraction]);

  const timeSince = (timestamp: Timestamp) => {
    if (!timestamp) return '...';
    const seconds = Math.floor(
      (new Date().getTime() - timestamp.toDate().getTime()) / 1000
    );
    return `${seconds}s ago`;
  };
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>
                {user.id.substring(5, 7)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-semibold">
                User {user.id.substring(5, 11)}
              </CardTitle>
              <CardDescription className="text-xs">
                Last seen {timeSince(user.lastSeen)}
              </CardDescription>
            </div>
          </div>
          <div
            className={cn('flex items-center gap-1 text-xs font-medium', user.isLive ? 'text-green-500' : 'text-muted-foreground'
            )}
          >
            {user.isLive ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {user.isLive ? 'Live' : 'Offline'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg border bg-muted/20 shadow-inner"
        >
          {isLoadingPage && <Skeleton className="h-full w-full" />}
          {page?.content ? (
            <div
              className="relative overflow-hidden"
              style={{
                width: `${scaledDimensions.width}px`,
                height: `${scaledDimensions.height}px`,
              }}
            >
              <iframe
                srcDoc={page.content}
                className="pointer-events-none relative h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin"
                scrolling="no"
                style={{
                  width: '1920px',
                  height: '1080px',
                  transform: `scale(${scaledDimensions.scale})`,
                  transformOrigin: 'top left',
                }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  width: '1920px',
                  height: '1080px',
                  transform: `scale(${scaledDimensions.scale})`,
                  transformOrigin: 'top left',
                }}
              >
                {clickIndicator && (
                  <div
                    className="absolute h-4 w-4 animate-ping rounded-full bg-primary/50"
                    style={{
                      left: clickIndicator.x - 8,
                      top: clickIndicator.y - 8,
                    }}
                  />
                )}
                <div
                  ref={cursorRef}
                  className="absolute left-0 top-0 text-primary transition-transform duration-100 ease-linear"
                >
                  <MousePointer2 className="h-6 w-6 -translate-x-1 -translate-y-1" />
                </div>
              </div>
            </div>
          ) : (
            !isLoadingPage && (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                Waiting for user to navigate to a recorded page...
              </div>
            )
          )}
        </div>
        <p className="mt-2 truncate text-center text-xs text-muted-foreground">
          {user.page}
        </p>
      </CardContent>
    </Card>
  );
};

export default function LiveViewPage() {
  const [users, setUsers] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live');
        if (!res.ok) throw new Error('Failed to fetch live users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLive();
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Live View</CardTitle>
          <CardDescription>
            Watch anonymized user sessions in real-time. A user is considered live if they have interacted in the last 30 seconds.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-video w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && users && users.length === 0 && (
        <Card>
          <CardContent className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
            <Eye className="mb-4 h-16 w-16" />
            <h3 className="mb-2 text-xl font-bold font-headline">No Active Users</h3>
            <p>There are no users currently live on the site. As soon as someone starts a session, they will appear here.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users?.map((u) => (
          <LiveUserCard key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}
