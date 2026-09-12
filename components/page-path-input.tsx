'use client';

import { useState } from 'react';
import { Input } from '@neup/components/ui/input';

function cleanDomain(value: string) {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '').split('/')[0];
}

function getPreviewValue(value: string, projectPath: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/')) {
    return `${cleanDomain(projectPath)}${trimmed}`;
  }

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return `${cleanDomain(projectPath)}/${trimmed}`;
  }
}

function belongsToProject(value: string, projectPath: string) {
  if (value.trim().startsWith('/')) return true;
  try {
    const pageUrl = new URL(value.includes('://') ? value : `https://${value}`);
    const projectUrl = new URL(projectPath.includes('://') ? projectPath : `https://${projectPath}`);
    return pageUrl.hostname === projectUrl.hostname || pageUrl.hostname.endsWith(`.${projectUrl.hostname}`);
  } catch {
    return false;
  }
}

export function PagePathInput({ projectPath, defaultValue, serverError = false }: { projectPath: string; defaultValue: string; serverError?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const previewValue = getPreviewValue(value, projectPath);
  const canAdd = belongsToProject(value, projectPath);

  return (
    <>
      <Input
        id="pageName"
        name="pageName"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="/pricing or pricing"
        maxLength={48}
        required
      />
      {previewValue && (serverError || !canAdd)
        ? <p className="text-sm text-destructive">This page does not belongs to this project, It cannot be added</p>
        : previewValue && <p className="text-sm text-muted-foreground">You're adding "{previewValue}"</p>}
    </>
  );
}
