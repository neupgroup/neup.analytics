'use client';

import Link from 'next/link';
import {
  Home,
  Box,
  LineChart,
  Activity,
  GitFork,
  Map,
  PlaySquare,
  Users,
  Eye,
  Settings,
  Bot,
  Camera,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/core/utils';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/projects', icon: Box, label: 'Projects' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/journeys', icon: GitFork, label: 'Journeys' },
  { href: '/heatmaps', icon: Map, label: 'Heatmaps' },
  { href: '/replays', icon: PlaySquare, label: 'Replays' },
  { href: '/snapshots', icon: Camera, label: 'Snapshots' },
  { href: '/users', icon: Users, label: 'Users' },
  { href: '/live', icon: Eye, label: 'Live View' },
  { href: '/reports', icon: LineChart, label: 'Reports' },
];

function createSidebarHref(path: string, selectedProject: string | null): string {
  if (!selectedProject) {
    return path;
  }

  const params = new URLSearchParams();
  params.set('selectedProject', selectedProject);
  return `${path}?${params.toString()}`;
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProject = searchParams.get('selectedProject');

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href={createSidebarHref('/home', selectedProject)}
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Bot className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Neup.Analytics</span>
          </Link>

          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={createSidebarHref(item.href, selectedProject)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:h-8 md:w-8',
                    {
                      'bg-accent text-accent-foreground':
                        pathname === item.href,
                    }
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>

              <TooltipContent side="right">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={createSidebarHref('/settings', selectedProject)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:h-8 md:w-8',
                  {
                    'bg-accent text-accent-foreground':
                      pathname === '/settings',
                  }
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>

            <TooltipContent side="right">
              Settings
            </TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
