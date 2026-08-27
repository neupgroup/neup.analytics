'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  Settings2,
  Camera,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePathname, useSearchParams } from 'next/navigation';
import { getAppLogo, getName } from '@/neupsys';
import { NavButton } from '@/component/ui/navbutton';
import { useProjectNavigationGuard } from '@/core/hooks/useProjectNavigationGuard';

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
  const selectedProject = searchParams.get('selectedProject') ?? searchParams.get('projectId');
  const guardProjectNavigation = useProjectNavigationGuard(selectedProject);

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href={createSidebarHref('/home', selectedProject)}
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Image
              src={getAppLogo()}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 transition-all group-hover:scale-110"
            />
            <span className="sr-only">{getName()}</span>
          </Link>

          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <NavButton
                  asChild
                  active={pathname === item.href}
                  onClick={item.href === '/projects' ? undefined : (event) => guardProjectNavigation(event, item.label)}
                  className="h-9 w-9 md:h-8 md:w-8"
                >
                  <Link href={createSidebarHref(item.href, selectedProject)}>
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </NavButton>
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
              <NavButton
                asChild
                active={pathname === '/config'}
                onClick={(event) => guardProjectNavigation(event, 'Config')}
                className="h-9 w-9 md:h-8 md:w-8"
              >
                <Link href={createSidebarHref('/config', selectedProject)}>
                  <Settings2 className="h-5 w-5" />
                  <span className="sr-only">Config</span>
                </Link>
              </NavButton>
            </TooltipTrigger>

            <TooltipContent side="right">
              Config
            </TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
