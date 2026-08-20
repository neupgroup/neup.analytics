'use client';

import React from 'react';
import { DashboardNav } from '@/components/dashboard-nav';
import { UserNav } from '@/components/user-nav';
import { NeupIdLogo } from '@/components/neupid-logo';
import { useSession } from '@/core/providers/session';
import { Skeleton } from '@/components/ui/skeleton';
import { MobilePageBack } from '@/components/mobile-page-back';

export function DashboardLayoutWrapper({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background shadow-lg shadow-black/10">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 lg:px-6">
            <NeupIdLogo
              iconHref={process.env.NEXT_PUBLIC_COMPANY_URL || '/'}
              textHref="/home"
            />
            <div className="flex items-center gap-2">
              <div className="text-right">
                <Skeleton className="mb-1 h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </header>
        <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_1fr]">
          <aside className="hidden h-[calc(100vh-4rem)] flex-col border-r lg:sticky lg:top-16 lg:flex">
            <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </aside>
          <main className="min-h-[calc(100vh-4rem)] p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Skeleton className="h-64 w-full" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background shadow-lg shadow-black/10">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 lg:px-6">
          <NeupIdLogo
            iconHref={process.env.NEXT_PUBLIC_COMPANY_URL || '/'}
            textHref="/home"
          />
          <UserNav />
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <aside className="hidden h-[calc(100vh-4rem)] flex-col border-r lg:sticky lg:top-16 lg:flex">
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <DashboardNav />
          </div>
        </aside>
        <main className="min-h-[calc(100vh-4rem)] p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
            <MobilePageBack />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
