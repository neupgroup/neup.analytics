import { NextRequest, NextResponse } from 'next/server';
import account from '@/logica/account';
import { prisma } from '@/core/database/prisma';

function createAuthStartUrl(request: NextRequest): string {
  const authUrl = new URL('https://neupgroup.com/account/auth/start');

  authUrl.searchParams.set('authenticatesTo', request.nextUrl.href);

  return authUrl.toString();
}

function createProjectsUrl(request: NextRequest): string {
  return new URL('/projects', request.url).toString();
}

function canAccessWithoutSelectedProject(pathname: string): boolean {
  return (
    pathname === '/projects'
    || pathname.startsWith('/projects/')
    || pathname.startsWith('/api/')
    || pathname.startsWith('/bridge/')
    || pathname.startsWith('/analytics/bridge/')
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
