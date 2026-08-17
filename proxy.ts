import { NextRequest, NextResponse } from 'next/server';
import account from '@/logica/account';

function createAuthStartUrl(request: NextRequest): string {
  const authUrl = new URL('https://neupgroup.com/account/auth/start');

  authUrl.searchParams.set('authenticatesTo', request.nextUrl.href);

  return authUrl.toString();
}

export async function proxy(request: NextRequest) {
  const authAccountToken = request.cookies.get('auth_account')?.value;

  const auth = await account.self.isAuthenticated('remote', authAccountToken);

  if (auth.authenticated) {
    return NextResponse.next();
  }

  return NextResponse.redirect(createAuthStartUrl(request));
}

export const config = {
  matcher: [
    /*
     * Run on application routes, but skip Next.js internals and static files.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
