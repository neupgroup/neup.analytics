'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  LineChart,
  GitFork,
  Map,
  PlaySquare,
  Users,
  Eye,
  Settings,
  BarChart,
  FileText,
  Camera,
} from 'lucide-react';
import { cn } from '@/core/utils';

const navItems = [
  { href: '/home', label: 'Home', icon: LineChart },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/journeys', label: 'Journeys', icon: GitFork },
  { href: '/heatmaps', label: 'Heatmaps', icon: Map },
  { href: '/replays', label: 'Replays', icon: PlaySquare },
  { href: '/pages', label: 'Pages', icon: FileText },
  { href: '/snapshots', label: 'Snapshots', icon: Camera },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/live', label: 'Live View', icon: Eye },
  { href: '/reports', label: 'Reports', icon: BarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground transition-all hover:text-primary',
            pathname === item.href && 'bg-muted text-primary'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

    
