import { NextRequest, NextResponse } from 'next/server';
import { checkAuthSession } from '@/logica/account/auth';
import baseJson from '@/logica/base.json';

function createAuthStartUrl(request: NextRequest): string {
    const baseUrl = baseJson.neupid.endsWith('/')
      ? baseJson.neupid
      : `${baseJson.neupid}/`;
  
    const authUrl = new URL('auth/start', baseUrl);
  
    authUrl.searchParams.set(
      'authenticatesTo',
      request.nextUrl.href,
    );
  
    return authUrl.toString();
  }

export async function proxy(request: NextRequest) {
  const authAccountToken = request.cookies.get('auth_account')?.value;

  const auth = await checkAuthSession({
    authAccountToken,
    hostname: request.nextUrl.hostname,
  });

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