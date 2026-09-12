'use server';

import { generateProjectSecret } from '@/services/activity/context-token';
import { prisma } from '@neup/core/database/prisma';
import { cookies } from 'next/headers';
import account from '@neup/logica/account';

async function requireAuthentication() {
  const auth = await account.self.isAuthenticated('remote', (await cookies()).get('auth_account')?.value);
  if (!auth.authenticated) throw new Error('Authentication required');
}

export async function generateProjectKey(projectId: string) {
  await requireAuthentication();
  if (!projectId.trim()) throw new Error('Project ID is required.');
  const projectSecret = generateProjectSecret();
  const result = await prisma.project.updateMany({ where: { id: projectId.trim(), projectSecret: null }, data: { projectSecret } });
  if (result.count !== 1) throw new Error('Project key already exists or project was not found.');
  return projectSecret;
}

export async function revokeProjectKey(projectId: string) {
  await requireAuthentication();
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    throw new Error('Project ID is required.');
  }

  await prisma.project.update({
    where: { id: normalizedProjectId },
    data: { projectSecret: null },
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
