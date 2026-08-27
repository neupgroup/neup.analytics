'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, PanelLeft, LineChart, GitFork, Map, PlaySquare, Users, Eye, Camera } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/component/ui/dropdown-menu';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/component/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { AIChatAssistant } from '@/components/ai-chat-assistant';
import { usePathname, useSearchParams } from 'next/navigation';
import { getAppLogo, getName } from '@/neupsys';
import { NavButton } from '@/component/ui/navbutton';
import { useProjectNavigationGuard } from '@/core/hooks/useProjectNavigationGuard';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/journeys', label: 'Journeys', icon: GitFork },
  { href: '/heatmaps', label: 'Heatmaps', icon: Map },
  { href: '/replays', label: 'Replays', icon: PlaySquare },
  { href: '/snapshots', label: 'Snapshots', icon: Camera },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/live', label: 'Live View', icon: Eye },
];

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProject = searchParams.get('selectedProject') ?? searchParams.get('projectId');
  const guardProjectNavigation = useProjectNavigationGuard(selectedProject);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="tertiary" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/home"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Image
                src={getAppLogo()}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 transition-all group-hover:scale-110"
              />
              <span className="sr-only">{getName()}</span>
            </Link>
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                asChild
                active={pathname.startsWith(item.href)}
                onClick={(event) => guardProjectNavigation(event, item.label)}
                className="w-full justify-start gap-4 px-2.5 text-lg"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </NavButton>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        />
      </div>
      <AIChatAssistant />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="tertiary"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://picsum.photos/seed/user-avatar/32/32" alt="User Avatar" />
              <AvatarFallback>UA</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
