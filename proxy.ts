import { NextRequest, NextResponse } from 'next/server';
import account from '@neup/logica/account';
import { prisma } from '@neup/core/database/prisma';
import { APP_BASE_PATH, makeAppPath } from '@neup/core/appconfig';

function createAuthStartUrl(request: NextRequest): string {
  const authUrl = new URL('https://neupgroup.com/account/auth/start');

  authUrl.searchParams.set('authenticatesTo', request.nextUrl.href);

  return authUrl.toString();
}

function createProjectsUrl(request: NextRequest): string {
  return new URL(makeAppPath('/projects'), request.url).toString();
}

function normalizeRequestPathname(pathname: string): string {
  if (!APP_BASE_PATH) {
    return pathname;
  }

  if (pathname === APP_BASE_PATH) {
    return '/';
  }

  if (pathname.startsWith(`${APP_BASE_PATH}/`)) {
    return pathname.slice(APP_BASE_PATH.length) || '/';
  }

  return pathname;
}

function canAccessWithoutSelectedProject(pathname: string): boolean {
  const normalizedPathname = normalizeRequestPathname(pathname);

  return (
    normalizedPathname === '/projects'
    || normalizedPathname.startsWith('/projects/')
    || normalizedPathname === '/api'
    || normalizedPathname.startsWith('/api/')
    || normalizedPathname === '/bridge'
    || normalizedPathname.startsWith('/bridge/')
  );
}

async function hasValidSelectedProject(request: NextRequest): Promise<boolean> {
  const selectedProject = request.nextUrl.searchParams.get('selectedProject')?.trim();

  if (!selectedProject) {
    return false;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: selectedProject,
    },
    select: {
      id: true,
    },
  });

  return Boolean(project);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalizedPathname = normalizeRequestPathname(pathname);

  // SDK loading and activity collection must be available to external sites.
  if (
    normalizedPathname === '/bridge/api.v1/activity'
    || normalizedPathname === '/bridge/webhook.v1/activity'
    || normalizedPathname === '/bridge/sdk.v1/record'
  ) {
    return NextResponse.next();
  }

  const authAccountToken = request.cookies.get('auth_account')?.value;

  const auth = await account.self.isAuthenticated(
    'remote',
    authAccountToken
  );

  if (auth.authenticated) {
    if (canAccessWithoutSelectedProject(pathname)) {
      return NextResponse.next();
    }

    if (await hasValidSelectedProject(request)) {
      return NextResponse.next();
    }

    return NextResponse.redirect(createProjectsUrl(request));
  }

  return NextResponse.redirect(createAuthStartUrl(request));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
