'use client';

import { useState } from 'react';
import { Check, Clipboard, KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@neup/components/ui/button';
import { saveProjectVerifierKey } from '@/app/config/actions';

function toBase64(bytes: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

export function ProjectKeyGenerator({ projectId }: { projectId: string }) {
  const [privateKey, setPrivateKey] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="solid" preIcon={privateKey ? <RefreshCw className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />} onClick={generateKey}>
          {privateKey ? 'Generate new key' : 'Generate Ed25519 key'}
        </Button>
        {config && (
          <Button variant="tinted" preIcon={copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} onClick={copyConfig}>
            {copied ? 'Copied' : 'Copy config'}
          </Button>
        )}
      </div>

      {privateKey && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-muted-foreground">{config}</pre>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">The private key is shown only once in this browser session. Save it in your environment or config file before leaving this page.</p>
    </div>
  );
}
