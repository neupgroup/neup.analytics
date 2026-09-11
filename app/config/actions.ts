'use server';

import { prisma } from '@neup/core/database/prisma';

export async function saveProjectVerifierKey(projectId: string, verifierKey: string) {
  const normalizedProjectId = projectId.trim();
  const normalizedVerifierKey = verifierKey.trim();

  if (!normalizedProjectId || !normalizedVerifierKey) {
    throw new Error('Project ID and verifier key are required.');
  }

  await prisma.project.update({
    where: { id: normalizedProjectId },
    data: { verifierKey: normalizedVerifierKey },
  });
}
