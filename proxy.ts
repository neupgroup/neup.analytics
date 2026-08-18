import { NextRequest, NextResponse } from 'next/server';
import account from '@/logica/account';

function createAuthStartUrl(request: NextRequest): string {
  const authUrl = new URL('https://neupgroup.com/account/auth/start');

  authUrl.searchParams.set('authenticatesTo', request.nextUrl.href);

  return authUrl.toString();
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // The Activity API is a public analytics collection endpoint.
  // It is authenticated using the Project token in the request body,
  // not through a NeupID browser session.
  if (
    pathname === '/bridge/api.v1/activity' ||
    pathname === '/analytics/bridge/api.v1/activity'
  ) {
    return NextResponse.next();
  }

  const authAccountToken = request.cookies.get('auth_account')?.value;

  const auth = await account.self.isAuthenticated(
    'remote',
    authAccountToken
  );

  if (auth.authenticated) {
    return NextResponse.next();
  }

  return NextResponse.redirect(createAuthStartUrl(request));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};