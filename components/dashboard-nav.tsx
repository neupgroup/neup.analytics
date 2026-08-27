'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  Box,
  LineChart,
  GitFork,
  Map,
  PlaySquare,
  Users,
  Eye,
  Settings2,
  BarChart,
  FileText,
  Camera,
} from 'lucide-react';
import { NavButton } from '@/component/ui/navbutton';
import { useProjectNavigationGuard } from '@/core/hooks/useProjectNavigationGuard';

const navItems = [
  { href: '/home', label: 'Home', icon: LineChart },
  { href: '/projects', label: 'Projects', icon: Box },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/journeys', label: 'Journeys', icon: GitFork },
  { href: '/heatmaps', label: 'Heatmaps', icon: Map },
  { href: '/replays', label: 'Replays', icon: PlaySquare },
  { href: '/pages', label: 'Pages', icon: FileText },
  { href: '/snapshots', label: 'Snapshots', icon: Camera },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/live', label: 'Live View', icon: Eye },
  { href: '/reports', label: 'Reports', icon: BarChart },
  { href: '/config', label: 'Config', icon: Settings2 },
];

function createDashboardHref(path: string, selectedProject: string | null): string {
  if (!selectedProject) {
    return path;
  }

  const params = new URLSearchParams();
  params.set('selectedProject', selectedProject);
  return `${path}?${params.toString()}`;
}

export function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProject = searchParams.get('selectedProject') ?? searchParams.get('projectId');
  const guardProjectNavigation = useProjectNavigationGuard(selectedProject);

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => (
        <NavButton
          key={item.href}
          asChild
          active={pathname === item.href}
          onClick={item.href === '/projects' ? undefined : (event) => guardProjectNavigation(event, item.label)}
          className="w-full justify-start gap-3 px-3 py-2"
        >
          <Link href={createDashboardHref(item.href, selectedProject)}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        </NavButton>
      ))}
    </nav>
  );
}
