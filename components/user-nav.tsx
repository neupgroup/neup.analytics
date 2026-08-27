'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/component/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { useSession } from '@/core/providers/session';

function getDisplayInitial(displayName: string | null, neupId: string | null): string {
  const source = displayName?.trim() || neupId?.trim() || 'U';
  return source.charAt(0).toUpperCase();
}

export function UserNav() {
  const { user } = useSession();

  const displayName = user?.displayName?.trim() || 'User';
  const secondaryText = user?.neupId?.trim() || user?.accountId?.trim() || null;
  const displayInitial = getDisplayInitial(user?.displayName ?? null, user?.neupId ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="plain" className="relative flex h-auto items-center gap-3 rounded-full px-2 py-1.5">
          <div className="hidden text-right sm:block">
            <p className="max-w-40 truncate text-sm font-medium leading-none">{displayName}</p>
            {secondaryText ? (
              <p className="mt-1 max-w-40 truncate text-xs leading-none text-muted-foreground">
                {secondaryText}
              </p>
            ) : null}
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.displayImage ?? undefined} alt={displayName} />
            <AvatarFallback>{displayInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {secondaryText && (
              <p className="text-xs leading-none text-muted-foreground">
                {secondaryText}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
