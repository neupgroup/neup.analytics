import { prisma } from '@neup/core/database/prisma';

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type TouchSessionInput = {
  identifierId: string;
  projectId: string;
  now?: Date;
};

export async function touchSession({
  identifierId,
  projectId,
  now = new Date(),
}: TouchSessionInput) {
  return prisma.$transaction(async (tx) => {
    const activeSession = await tx.session.findFirst({
      where: {
        identifierId,
        projectId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!activeSession) {
      return tx.session.create({
        data: {
          identifierId,
          projectId,
          startedAt: now,
          lastActivityAt: now,
        },
      });
    }

    const inactiveFor = now.getTime() - activeSession.lastActivityAt.getTime();

    if (inactiveFor >= SESSION_TIMEOUT_MS) {
      const endedAt = activeSession.lastActivityAt;

      const duration = Math.max(
        0,
        Math.floor(
          (endedAt.getTime() - activeSession.startedAt.getTime()) / 1000
        )
      );

      await tx.session.update({
        where: {
          id: activeSession.id,
        },
        data: {
          endedAt,
          duration,
        },
      });

      return tx.session.create({
        data: {
          identifierId,
          projectId,
          startedAt: now,
          lastActivityAt: now,
        },
      });
    }

    return tx.session.update({
      where: {
        id: activeSession.id,
      },
      data: {
        lastActivityAt: now,
      },
    });
  });
}
