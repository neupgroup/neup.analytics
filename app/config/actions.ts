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

export async function revokeProjectVerifierKey(projectId: string) {
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    throw new Error('Project ID is required.');
  }

  await prisma.project.update({
    where: { id: normalizedProjectId },
    data: { verifierKey: null },
  });
}

export async function saveProjectIpAddress(projectId: string, ipAddress: string) {
  const normalizedProjectId = projectId.trim();
  const normalizedIpAddress = ipAddress.trim();

  if (!normalizedProjectId) {
    throw new Error('Project ID is required.');
  }

  if (normalizedIpAddress.length > 48) {
    throw new Error('Server address must be 48 characters or fewer.');
  }

  await prisma.project.update({
    where: { id: normalizedProjectId },
    data: { ipAddress: normalizedIpAddress || null },
  });
}
