import { prisma } from '#/core/database/prisma';

type ListApplicationsResult =
  | {
      ok: true;
      applications: Awaited<ReturnType<typeof prisma.application.findMany>>;
    }
  | {
      ok: false;
      applications: [];
      message: string;
    };

function isDatabaseAuthenticationError(error: unknown): boolean {
  return error instanceof Error
    && error.message.includes('Authentication failed against the database server');
}

export async function listApplications(): Promise<ListApplicationsResult> {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      ok: true,
      applications,
    };
  } catch (error) {
    if (isDatabaseAuthenticationError(error)) {
      return {
        ok: false,
        applications: [],
        message: 'Database authentication failed for the configured DATABASE_URL.',
      };
    }

    throw error;
  }
}
