'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Save } from 'lucide-react';
import { saveProjectIpAddress } from '@/app/config/actions';
import { Button } from '@neup/components/ui/button';
import { Input } from '@neup/components/ui/input';

export function ServerAddressForm({ projectId, initialIpAddress }: { projectId: string; initialIpAddress: string }) {
  const [ipAddress, setIpAddress] = useState(initialIpAddress);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const hasLocalhost = ipAddress.split(',').some((address) => address.trim().toLowerCase() === 'localhost');

  async function saveAddress() {
    setSaved(false);
    setError(undefined);
    try {
      await saveProjectIpAddress(projectId, ipAddress);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The server address could not be saved.');
    }
  }

  function addDevSupport() {
    const addresses = ipAddress.split(',').map((address) => address.trim()).filter(Boolean);
    if (!addresses.some((address) => address.toLowerCase() === 'localhost')) {
      setIpAddress([...addresses, 'localhost'].join(', '));
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <Input
          value={ipAddress}
          onChange={(event) => setIpAddress(event.target.value)}
          placeholder="203.0.113.10, 203.0.113.11"
          maxLength={48}
          aria-label="Server IP address"
        />
        {hasLocalhost && (
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Once development is complete, remove localhost to help ensure your key is not compromised.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="tinted" onClick={addDevSupport} preIcon={<AlertTriangle />}>
            Add Dev Support
          </Button>
          <Button variant="solid" onClick={saveAddress} preIcon={saved ? <Check /> : <Save />}>
          {saved ? 'Saved' : 'Save address'}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
