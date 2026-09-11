'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@neup/core/database/prisma';

function parseSites(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map((site) => site.trim())
    .filter(Boolean);
}

export async function createApplication(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const sites = parseSites(formData.get('sites'));
  const details = String(formData.get('details') ?? '').trim();

  if (!name) {
    throw new Error('Name is required.');
  }

  if (sites.length === 0) {
    throw new Error('At least one base path is required.');
  }

  await prisma.application.create({
    data: {
      name,
      sites,
      details: details || null,
      status: 'setup',
    },
  });

  redirect('/properties/add?created=1');
}