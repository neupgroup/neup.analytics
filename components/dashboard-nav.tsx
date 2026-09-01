'use client';

import { Link } from '#/components/ui/link';
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
import { useProjectNavigationGuard } from '@/hooks/useProjectNavigationGuard';

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
        <Link
          key={item.href}
          href={createDashboardHref(item.href, selectedProject)}
          onClick={item.href === '/projects' ? undefined : (event) => guardProjectNavigation(event, item.label)}
          className="w-full justify-start gap-3 px-3 py-2"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
