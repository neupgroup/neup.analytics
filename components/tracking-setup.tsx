'use client';

import { useState } from 'react';
import { Checkbox } from '@neup/components/ui/checkbox';
import { SetupGuidelines } from '@/components/setup-guidelines';
import { defaultTrackingOptions, type TrackingOptions } from '@/components/tracking-options';

export function TrackingSetup({ projectId }: { projectId: string }) {
  const [options, setOptions] = useState<TrackingOptions>(defaultTrackingOptions);
  const [trackMore, setTrackMore] = useState(false);
  const activeOptions = trackMore ? options : defaultTrackingOptions;
  const [cookie, setCookie] = useState('');
  const [serverCookie, setServerCookie] = useState('');
  const [field, setField] = useState('');
  const [error, setError] = useState('');

  function add(kind: 'cookies' | 'serverCookies' | 'serverFields', value: string) {
    const name = value.trim();
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name)) {
      setError('Use 1–80 letters, numbers, underscores, dots or hyphens.');
      return;
    }
    setOptions((current) => ({ ...current, [kind]: [...new Set([...current[kind], name])] }));
    if (kind === 'cookies') setCookie(''); else if (kind === 'serverCookies') setServerCookie(''); else setField('');
    setError('');
  }

  return <div className="space-y-8">
    <p className="text-sm text-muted-foreground">Install the project secret in your server environment. The browser receives only a signed context token. Add the browser example to a JavaScript module or a module script in your page.</p>
    <section className="space-y-3">
      <h3 className="font-semibold">1. What do you want to track?</h3>
      <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" aria-pressed={!trackMore} onClick={() => { setTrackMore(false); setError(''); }}
        className={`w-full rounded-xl border-2 p-5 text-left transition-colors ${!trackMore ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/50'}`}>
        <span className="block font-medium">Track only the essentials</span>
        <span className="mt-1 block text-sm text-muted-foreground">Page views and session duration. No location permission, clicks, form values or snapshots.</span>
      </button>
      <button type="button" aria-pressed={trackMore} onClick={() => setTrackMore(true)}
        className={`w-full rounded-xl border-2 p-5 text-left transition-colors ${trackMore ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/50'}`}>
        <span className="block font-medium">Track more than essentials</span>
        <span className="mt-1 block text-sm text-muted-foreground">Page views and session duration, plus the cookies and dynamic server fields you choose below.</span>
      </button>
      </div>
    </section>
    {trackMore && <>
    <section className="space-y-3">
      <h3 className="font-semibold">2. Add the cookie fields to track</h3>
      <div className="space-y-3 rounded-xl border p-4">
      <h4 className="text-sm font-medium">Browser-readable cookies</h4>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox className="cursor-pointer" checked={options.allCookies} onCheckedChange={(checked) => setOptions({ ...options, allCookies: checked === true })} />Track all browser-readable cookies</label>
      <p className="text-sm text-muted-foreground">HttpOnly cookies cannot be read by the tracker. Do not select authentication or session secrets; “all” sends every cookie JavaScript can read.</p>
      {!options.allCookies && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); add('cookies', cookie); }}>
        <input aria-label="Cookie key" value={cookie} onChange={(event) => setCookie(event.target.value)} placeholder="Cookie key, e.g. preferred_language" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <button className="rounded-md border px-3 py-2 text-sm" type="submit">Add cookie</button>
      </form>}
      <div className="flex flex-wrap gap-2">{options.cookies.map((name) => <button key={name} type="button" aria-label={`Remove cookie ${name}`} onClick={() => setOptions({ ...options, cookies: options.cookies.filter((key) => key !== name) })} className="rounded-full border px-3 py-1 text-sm">{name} ×</button>)}</div>
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        <h4 className="text-sm font-medium">Server-readable cookies</h4>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox className="cursor-pointer" checked={options.allServerCookies} onCheckedChange={(checked) => setOptions({ ...options, allServerCookies: checked === true })} />Track all server-readable cookies</label>
        <p className="text-sm text-muted-foreground">Read from requests on your server, including HttpOnly cookies. Values are sent directly to analytics for storage and are not added to the browser snippet.</p>
        {options.allServerCookies && <p role="alert" className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">Account and authentication cookies might also be sent and stored if you choose all.</p>}
        {!options.allServerCookies && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); add('serverCookies', serverCookie); }}>
          <input aria-label="Server cookie key" value={serverCookie} onChange={(event) => setServerCookie(event.target.value)} placeholder="Server cookie key" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border px-3 py-2 text-sm">Add server cookie</button>
        </form>}
        <div className="flex flex-wrap gap-2">{options.serverCookies.map((name) => <button key={name} type="button" aria-label={`Remove server cookie ${name}`} onClick={() => setOptions({ ...options, serverCookies: options.serverCookies.filter((key) => key !== name) })} className="rounded-full border px-3 py-1 text-sm">{name} ×</button>)}</div>
      </div>
    </section>
    <section className="space-y-3">
      <h3 className="font-semibold">3. Add non-cookie dynamic fields from your server</h3>
      <p className="text-sm text-muted-foreground">Name each field, then replace <code>--valuegoeshere--</code> in your layout or server example with its dynamic value. These values are visible in the browser, so use only data safe to expose.</p>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); add('serverFields', field); }}>
        <input aria-label="Server field name" value={field} onChange={(event) => setField(event.target.value)} placeholder="Field name, e.g. account_plan" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">Add field</button>
      </form>
      <div className="flex flex-wrap gap-2">{options.serverFields.map((name) => <button key={name} type="button" aria-label={`Remove server field ${name}`} onClick={() => setOptions({ ...options, serverFields: options.serverFields.filter((key) => key !== name) })} className="rounded-full border px-3 py-1 text-sm">{name} ×</button>)}</div>
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </>}
    <div className="pt-6">
      <SetupGuidelines projectId={projectId} tracking={activeOptions} startStep={trackMore ? 4 : 2} />
    </div>
  </div>;
}
