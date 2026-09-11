'use client';

import React from 'react';
import { LinkButton } from '@neup/components/ui/link-button';
import { Compass, ArrowRight } from 'lucide-react';
import { Button } from '@neup/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-12 w-12 animate-[spin_20s_linear_infinite]" />
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-primary"></span>
          </div>
        </div>

        <h1 className="mb-2 font-headline text-6xl font-extrabold tracking-tight text-primary">
          404
        </h1>

        <h2 className="mb-4 font-headline text-2xl font-bold text-foreground">
          Page Not Found
        </h2>

        <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <LinkButton variant="solid" className="group flex w-full items-center justify-center gap-2" size="lg" href="/home">
            Back to Home
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </LinkButton>
      </div>
    </div>
  );
}
