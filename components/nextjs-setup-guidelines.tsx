'use client';

import { useEffect, useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { Button } from '@neup/components/ui/button';

function buildAnalyticsCode(projectId: string) {
  return `import crypto from "node:crypto";
import { cookies, headers } from "next/headers";

const projectId = "${projectId}";

function generateTraceId(): string {
  return \`${Date.now()}.\${crypto.randomBytes(24).toString("hex")}\`;
}

function generateContextId(traceId: string): string {
  const projectKey = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!projectKey) throw new Error("NEUP_ANALYTICS_PROJECT_KEY is not configured.");
  return crypto.createHmac("sha256", projectKey).update(traceId).digest("hex");
}

function signContextId(contextId: string) {
  const projectKey = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!projectKey) throw new Error("NEUP_ANALYTICS_PROJECT_KEY is not configured.");
  return \`\${contextId}.\${crypto.sign(null, Buffer.from(contextId), crypto.createPrivateKey({ key: Buffer.from(projectKey, "base64"), format: "der", type: "pkcs8" })).toString("base64url")}\`;
}

export async function getAnalyticsContext() {
  const cookieStore = await cookies();
  let traceId = cookieStore.get("_neuptraceid")?.value;
  if (!traceId) {
    traceId = generateTraceId();
    cookieStore.set({ name: "_neuptraceid", value: traceId, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  }
  const contextId = generateContextId(traceId);
  return { traceId, contextId, signedContextId: signContextId(contextId), projectId };
}

export async function logPageActivity(contextId: string, pageUrl: string): Promise<void> {
  const projectKey = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!projectKey) return;
  const { traceId } = await getAnalyticsContext();
  const requestHeaders = await headers();
  try {
    await fetch(\`https://neupgroup.com/analytics/bridge/api.v1/activity?project=\${encodeURIComponent(projectId)}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _neuptraceid: traceId, contextId: signContextId(contextId), pageUrl, agent: requestHeaders.get("user-agent") ?? "", ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "" }),
      cache: "no-store",
    });
  } catch {
    // Analytics failures must never break the application.
  }
}

export async function logActivity(activity: string, data?: Record<string, unknown>): Promise<void> {
  const projectKey = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!projectKey) return;
  const { contextId, traceId } = await getAnalyticsContext();
  const requestHeaders = await headers();
  await fetch(
    \`https://neupgroup.com/analytics/bridge/api.v1/activity?project=\${encodeURIComponent(projectId)}\`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity, data, contextId: signContextId(contextId), _neuptraceid: traceId, agent: requestHeaders.get("user-agent") ?? "", ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "" }),
      cache: "no-store",
    },
  );

export async function logClientActivity(activity: string, data?: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") return;
  await fetch(\`https://neupgroup.com/analytics/bridge/api.v1/activity?project=\${encodeURIComponent(projectId)}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activity, data, agent: navigator.userAgent, pageUrl: window.location.href }),
    keepalive: true,
  });
}
`;
}

function buildLayoutCode(projectId: string) {
  return `import { headers } from "next/headers";
import { getAnalyticsContext, logPageActivity } from "@/analytics";

const projectId = "${projectId}";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { contextId, signedContextId } = await getAnalyticsContext();
  const requestHeaders = await headers();
  const pagePath = requestHeaders.get("x-invoke-path") ?? requestHeaders.get("next-url") ?? "/";
  await logPageActivity(contextId, pagePath);

  return (
    <html lang="en">
      <body>
        {children}
        <script
          src="https://neupgroup.com/analytics/sdk.v1/record"
          data-context-id={signedContextId}
          data-project-id={projectId}
          defer
        />
      </body>
    </html>
  );
}`;
}

export function NextJsSetupGuidelines({ projectId }: { projectId: string }) {
  const [isNextJs, setIsNextJs] = useState(false);
  const [copied, setCopied] = useState<string>();

  useEffect(() => {
    const update = (event?: Event) => {
      const selected = event instanceof CustomEvent ? event.detail : window.localStorage.getItem('neup-config-framework');
      setIsNextJs(selected === 'nextjs');
    };
    update();
    window.addEventListener('neup-config-framework-change', update);
    return () => window.removeEventListener('neup-config-framework-change', update);
  }, []);

  if (!isNextJs) return null;

  const analyticsCode = buildAnalyticsCode(projectId);
  const layoutCode = buildLayoutCode(projectId);

  async function copyCode(code: string, key: string) {
    await navigator.clipboard.writeText(code);
    setCopied(key);
    window.setTimeout(() => setCopied(undefined), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">1. Add the following file to your application</h3>
        <p className="text-sm text-muted-foreground">Create <code>analytics.ts</code> inside <code>src</code>, the folder mapped to <code>@/*</code>, or another location you use for custom utilities.</p>
        <div className="relative">
          <Button variant="tinted" size="icon" className="absolute right-3 top-3" onClick={() => copyCode(analyticsCode, 'analytics')} aria-label="Copy analytics.ts code">
            {copied === 'analytics' ? <Check /> : <Clipboard />}
          </Button>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-4 pr-14 font-mono text-xs leading-6 text-muted-foreground">{analyticsCode}</pre>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">2. Add the following to your RootLayout or Main Layout.tsx</h3>
        <p className="text-sm text-muted-foreground">Add this to the layout that runs on the server. If your application has no server-side layout, skip this step.</p>
        <div className="relative">
          <Button variant="tinted" size="icon" className="absolute right-3 top-3" onClick={() => copyCode(layoutCode, 'layout')} aria-label="Copy layout code">
            {copied === 'layout' ? <Check /> : <Clipboard />}
          </Button>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-4 pr-14 font-mono text-xs leading-6 text-muted-foreground">{layoutCode}</pre>
        </div>
      </div>
    </div>
  );
}
