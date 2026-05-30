import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { SessionProvider } from '@/context/session-context';
import { ProgressBar } from '@/components/progress-bar';
import { Suspense } from 'react';

import { DashboardLayoutWrapper } from '@/components/dashboard-layout-wrapper';

export const metadata: Metadata = {
  title: 'Neup.Analytics',
  description: 'Insights into user behavior and performance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Raleway:wght@400;500;700;900&family=Source+Code+Pro:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased")}>
        <SessionProvider>
          <Suspense fallback={null}>
              <ProgressBar />
          </Suspense>
          <DashboardLayoutWrapper>
            {children}
          </DashboardLayoutWrapper>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
