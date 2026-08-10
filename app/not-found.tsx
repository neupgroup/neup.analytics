'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Card className="w-full max-w-md border-border/50 bg-card shadow-xl">
        <CardContent className="flex flex-col items-center pt-8 pb-10 px-6">
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-12 w-12 animate-[spin_20s_linear_infinite]" />
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-primary"></span>
            </div>
          </div>
          
          <h1 className="font-headline text-6xl font-extrabold tracking-tight text-primary mb-2">
            404
          </h1>
          
          <h2 className="font-headline text-2xl font-bold text-foreground mb-4">
            Page Not Found
          </h2>
          
          <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>

          <Button asChild className="w-full group" size="lg">
            <Link href="/dashboard" className="flex items-center justify-center gap-2">
              Back to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
