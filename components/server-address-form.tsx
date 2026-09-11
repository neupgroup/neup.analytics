'use client';

import { useState } from 'react';
import { Check, Save } from 'lucide-react';
import { saveProjectIpAddress } from '@/app/config/actions';
import { Button } from '@neup/components/ui/button';
import { Input } from '@neup/components/ui/input';

export function ServerAddressForm({ projectId, initialIpAddress }: { projectId: string; initialIpAddress: string }) {
  const [ipAddress, setIpAddress] = useState(initialIpAddress);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

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
        <Button variant="solid" onClick={saveAddress} preIcon={saved ? <Check /> : <Save />}>
          {saved ? 'Saved' : 'Save address'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Enter one or more IP addresses, separated by commas. Maximum 48 characters.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
