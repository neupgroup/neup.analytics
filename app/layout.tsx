import type {Metadata} from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { Toaster } from '#/components/ui/toast';
import { cn } from '#/core/utils';
import { SessionProvider, type SessionUser } from '#/core/providers/session';
import { ProgressBar } from '#/components/element/progressbar';
import { Suspense } from 'react';
import { DashboardLayoutWrapper } from '@/components/dashboard-layout-wrapper';
import account from '#/logica/account';
import { getAppLogo, getDescription, getName } from '@/neupsys';

export const metadata: Metadata = {
  title: getName(),
  description: getDescription(),
  icons: {
    icon: getAppLogo('favicon'),
    apple: getAppLogo('apple-touch-icon'),
  },
};

async function getInitialUser(): Promise<SessionUser | null> {
  const authAccountToken = (await cookies()).get('auth_account')?.value ?? null;
  const authentication = await account.self.isAuthenticated('local', authAccountToken);

  if (!authentication.authenticated || !authAccountToken) {
    return null;
  }

  const lookup = await account.lookup.current.get(authAccountToken, [
    'accountId',
    'neupid',
    'displayName',
    'displayImage',
  ]);

  if (!lookup.ok || !lookup.body.success) {
    return null;
  }

  return {
    accountId: lookup.body.accountId ?? null,
    neupId: lookup.body.neupid ?? null,
    displayName: lookup.body.displayName ?? null,
    displayImage: lookup.body.displayImage ?? null,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getInitialUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" />
      </head>
      <body className={cn("antialiased")}>
        <SessionProvider initialUser={initialUser}>
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
