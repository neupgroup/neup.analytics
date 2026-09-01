import { NextResponse } from 'next/server';
import { prisma } from '#/core/database/prisma';

export async function GET() {
  const users = await prisma.user.findMany({
    where: { isLive: true },
    orderBy: { lastSeen: 'desc' },
    take: 20,
  });

  const usersWithPage = await Promise.all(
    users.map(async (user) => {
      const pageSnapshot = user.pagePath
        ? await prisma.pageSnapshot.findFirst({
            where: { pagePath: user.pagePath },
            orderBy: { recordedOn: 'desc' },
          })
        : null;

      return {
        ...user,
        pageSnapshot: pageSnapshot
          ? {
              id: pageSnapshot.id,
              pagePath: pageSnapshot.pagePath,
              content: pageSnapshot.content,
            }
          : null,
      };
    })
  );

  return NextResponse.json(usersWithPage);
}
