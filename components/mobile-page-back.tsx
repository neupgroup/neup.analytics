'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { url } from '@/core/link';

function resolveBackPath(pathname: string): string | null {
  const normalizedPathname = pathname === '/' ? '/home' : pathname;

  if (normalizedPathname === '/home') {
    return null;
  }

  const segments = normalizedPathname.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return '/home';
  }

  return `/${segments.slice(0, -1).join('/')}`;
}

export function MobilePageBack() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const backPath = resolveBackPath(pathname);

  if (!backPath) {
    return null;
  }

  const selectedProject = searchParams.get('selectedProject');
  const href = url(backPath).addParam('selectedProject', selectedProject).get();

  return (
    <div className="md:hidden">
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
    </div>
  );
}
