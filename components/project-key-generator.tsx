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
import { revokeProjectVerifierKey, saveProjectVerifierKey } from '@/app/config/actions';

function toBase64(bytes: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

export function ProjectKeyGenerator({ projectId, hasVerifierKey }: { projectId: string; hasVerifierKey: boolean }) {
  const [privateKey, setPrivateKey] = useState<string>();
  const [keyExists, setKeyExists] = useState(hasVerifierKey);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  async function generateKey() {
    setError(undefined);
    setCopied(false);

    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify'],
      ) as CryptoKeyPair;
      const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      await saveProjectVerifierKey(projectId, toBase64(spki));
      setPrivateKey(toBase64(pkcs8));
      setKeyExists(true);
    } catch {
      setError('This browser could not generate an Ed25519 key. Try the latest version of Chrome, Edge, or Firefox.');
    }
  }

  const config = privateKey
    ? `NEUP_ANALYTICS_PROJECT_ID="${projectId}"\nNEUP_ANALYTICS_PROJECT_KEY="${privateKey}"`
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
      await revokeProjectVerifierKey(projectId);
      setPrivateKey(undefined);
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
        {privateKey ? (
          <Button variant="tinted" preIcon={copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} onClick={copyConfig}>
            {copied ? 'Copied' : 'Copy config'}
          </Button>
        ) : !keyExists ? (
          <Button variant="solid" preIcon={<KeyRound className="h-4 w-4" />} onClick={generateKey}>
            Generate Ed25519 key
          </Button>
        ) : null}
        {keyExists && (
          <Button variant="solid" convey="danger" preIcon={<ShieldOff className="h-4 w-4" />} onClick={() => setRevokeDialogOpen(true)}>
            Revoke this key
          </Button>
        )}
      </div>

      {privateKey && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-muted-foreground">{config}</pre>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {privateKey
          ? 'The private key is shown only once in this browser session. Save it in your environment or config file before leaving this page.'
          : keyExists
            ? 'A key already exists and cannot be recovered. Revoke it to generate a new key.'
            : 'Generate a key to create project credentials.'}
      </p>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this project key?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing signatures created with this key will no longer verify. You will need to generate a new key for this project.
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
