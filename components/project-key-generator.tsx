'use client';

import { useState } from 'react';
import { Check, Clipboard, KeyRound, ShieldOff } from 'lucide-react';
import { Button } from '@neup/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@neup/components/ui/alert-dialog';
import { revokeProjectKey, generateProjectKey } from '@/app/config/actions';

export function ProjectKeyGenerator({ projectId, hasProjectKey }: { projectId: string; hasProjectKey: boolean }) {
  const [projectKey, setProjectKey] = useState<string>();
  const [keyExists, setKeyExists] = useState(hasProjectKey);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  async function generateKey() {
    setError(undefined);
    setCopied(false);

    try {
      const secret = await generateProjectKey(projectId);
      setProjectKey(secret);
      setKeyExists(true);
    } catch {
      setError('The project key could not be generated.');
    }
  }

  const config = projectKey
    ? `NEUP_ANALYTICS_PROJECT_ID="${projectId}"\nNEUP_ANALYTICS_PROJECT_KEY="${projectKey}"`
    : '';

  async function copyConfig() {
    if (!config) return;
    await navigator.clipboard.writeText(config);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function revokeKey() {
    setError(undefined);
    try {
      await revokeProjectKey(projectId);
      setProjectKey(undefined);
      setKeyExists(false);
      setCopied(false);
      setRevokeDialogOpen(false);
    } catch {
      setError('The key could not be revoked. Please try again.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {projectKey ? (
          <Button variant="tinted" preIcon={copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} onClick={copyConfig}>
            {copied ? 'Copied' : 'Copy config'}
          </Button>
        ) : !keyExists ? (
          <Button variant="solid" preIcon={<KeyRound className="h-4 w-4" />} onClick={generateKey}>
            Generate project key
          </Button>
        ) : null}
        {keyExists && (
          <Button variant="solid" convey="danger" preIcon={<ShieldOff className="h-4 w-4" />} onClick={() => setRevokeDialogOpen(true)}>
            Revoke project key
          </Button>
        )}
      </div>

      {projectKey && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-muted-foreground">{config}</pre>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!keyExists && !projectKey && (
        <p className="text-xs text-muted-foreground">Generate a key to create project credentials.</p>
      )}
      {projectKey && (
        <p className="text-xs text-muted-foreground">Save this secret in your server environment before leaving this page. Never put it in a NEXT_PUBLIC variable or browser code.</p>
      )}

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this project key?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing context tokens signed with this key will no longer be accepted. You will need to generate a new key for this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep key</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={revokeKey}>
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
