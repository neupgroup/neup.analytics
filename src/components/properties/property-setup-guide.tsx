'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, CheckCircle2, Code2, ShieldCheck } from 'lucide-react';

type CollectionOption = {
  key: string;
  label: string;
  description: string;
};

const COLLECTION_OPTIONS: CollectionOption[] = [
  { key: 'pageview', label: 'Page views', description: 'Track which pages are viewed and in what order.' },
  { key: 'clicks', label: 'Clicks', description: 'Capture buttons, links, and other clickable targets.' },
  { key: 'scrolls', label: 'Scroll depth', description: 'Measure how far users move through each page.' },
  { key: 'inputs', label: 'Form inputs', description: 'Record form interaction without password values.' },
  { key: 'keyboard', label: 'Keyboard actions', description: 'Capture navigation keys and meaningful key presses.' },
  { key: 'errors', label: 'Errors', description: 'Collect runtime and promise failures.' },
  { key: 'performance', label: 'Performance', description: 'Capture page load and timing metrics.' },
  { key: 'dom', label: 'DOM changes', description: 'Record dynamic UI mutations for replay.' },
];

const DEFAULT_SELECTED = COLLECTION_OPTIONS.reduce<Record<string, boolean>>((acc, option) => {
  acc[option.key] = option.key !== 'keyboard';
  return acc;
}, {});

function buildSnippet(propertyId: string, collectorEndpoint: string, selected: Record<string, boolean>) {
  const enabled = Object.entries(selected)
    .filter(([, value]) => value)
    .map(([key]) => key);
  // Derive hosted sdk URL from the collector endpoint (same origin)
  let sdkUrl = collectorEndpoint.replace(/\/api\/collect.*$/i, '/sdk.js');
  if (sdkUrl.startsWith('/')) {
    // Make absolute using current app origin (this runs client-side)
    try {
      sdkUrl = window.location.protocol + '//' + window.location.host + sdkUrl;
    } catch (e) {
      // leave as-is if window is unavailable
    }
  }

  return `<script async src="${sdkUrl}" data-site-id="${propertyId}" data-collect="${enabled.join(',')}"></script>`;
}

export function PropertySetupGuide({
  propertyId,
  collectorEndpoint,
}: {
  propertyId: string;
  collectorEndpoint: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>(DEFAULT_SELECTED);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const selectedLabels = useMemo(
    () => COLLECTION_OPTIONS.filter((option) => selected[option.key]).map((option) => option.label),
    [selected]
  );

  const snippet = useMemo(
    () => buildSnippet(propertyId, collectorEndpoint, selected),
    [collectorEndpoint, propertyId, selected]
  );

  const toggleOption = (key: string) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const verifyInstallation = () => {
    setVerifyMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/properties/${propertyId}/verify`, { method: 'POST' });
      const data = await response.json();

      if (data.verified) {
        setVerified(true);
        setVerifyMessage('Snippet verified. The guide will disappear after refresh.');
        router.refresh();
        return;
      }

        setVerified(false);
        let msg = data.message || 'No collector traffic found yet.';
        if (data.installed) {
          msg = 'Installed successfully. ' + msg;
        }
        if (data.diagnostics) {
          const d = data.diagnostics;
          msg += ` (${d.pageSnapshotCount} pages, ${d.interactionCount} total interactions`;
          if (d.lastInteractionAt) msg += `, last: ${new Date(d.lastInteractionAt).toLocaleString()}`;
          msg += ')';
        }
        setVerifyMessage(msg);
    });
  };

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Setup guide
        </CardTitle>
        <CardDescription>
          Follow these steps to connect a website and hide this guide once the collector starts receiving data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Step 1. What do you want to collect?</p>
              <p className="text-muted-foreground">Choose the signals the SDK should send.</p>
            </div>
            <Badge variant="secondary">{selectedLabels.length} selected</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {COLLECTION_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <Checkbox checked={selected[option.key]} onCheckedChange={() => toggleOption(option.key)} />
                <span className="space-y-1">
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Step 2. Generated snippet</p>
              <p className="text-muted-foreground">This code reflects the selections above and points to the collector for this property.</p>
            </div>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-muted-foreground">
              {snippet}
            </pre>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div>
            <p className="font-medium">Step 3. Verify the addition</p>
            <p className="text-muted-foreground">Once the snippet is live on the external site, verify that this property is receiving traffic.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={verifyInstallation} disabled={isPending}>
              {isPending ? 'Verifying...' : 'Verify installation'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {verified && <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Completed</Badge>}
          </div>
          {verifyMessage && <p className="text-xs text-muted-foreground">{verifyMessage}</p>}
        </div>
      </CardContent>
    </Card>
  );
}