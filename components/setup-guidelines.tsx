'use client';

import { useEffect, useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import styles from './setup-guidelines.module.css';
import { defaultTrackingOptions, trackingFields, type TrackingOptions } from '@/components/tracking-options';

function buildAnalyticsCode(projectId: string, tracking: TrackingOptions) {
  return `import crypto from "node:crypto";
import { cookies, headers } from "next/headers";

async function getTrackedServerCookies(): Promise<Record<string, string>> {
  const selected: string[] = ${JSON.stringify(tracking.serverCookies ?? [])};
  const all = ${Boolean(tracking.allServerCookies)};
  const cookieStore = await cookies();
  return Object.fromEntries(cookieStore.getAll().filter(({ name }) => all || selected.includes(name)).map(({ name, value }) => [name, value]));
}

function generateTraceId(): string {
  return \`\${Date.now()}.\${crypto.randomBytes(24).toString("hex")}\`;
}

function projectSecret(): Buffer {
  const secret = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Configure NEUP_ANALYTICS_PROJECT_KEY with a generated project secret.");
  return Buffer.from(secret, "hex");
}
function generateContextId(traceId: string): string {
  return crypto.createHmac("sha256", projectSecret()).update(traceId).digest("hex");
}
function signContextId(contextId: string): string {
  const signature = crypto.createHmac("sha256", projectSecret()).update("neup-context:v1:" + contextId).digest("hex");
  return "v1." + contextId + "." + signature;
}

export async function getAnalyticsContext() {
  const cookieStore = await cookies();
  let traceId = cookieStore.get("_neuptraceid")?.value;
  if (!traceId) {
    traceId = generateTraceId();
    cookieStore.set({ name: "_neuptraceid", value: traceId, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  }
  const contextId = generateContextId(traceId);
  return { traceId, contextId, signedContextId: signContextId(contextId), projectId: "${projectId}" };
}

export async function logPageActivity(contextId: string, pageUrl: string): Promise<void> {
  const projectKey = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!projectKey) return;
  const { traceId } = await getAnalyticsContext();
  const requestHeaders = await headers();
  try {
    await fetch("https://neupgroup.com/analytics/bridge/api.v1/activity?project=${encodeURIComponent(projectId)}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _neuptraceid: traceId, contextId: signContextId(contextId), moreDetails: { serverCookies: await getTrackedServerCookies() }, pageUrl, agent: requestHeaders.get("user-agent") ?? "", ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "" }),
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
    "https://neupgroup.com/analytics/bridge/api.v1/activity?project=${encodeURIComponent(projectId)}",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity, data, contextId: signContextId(contextId), _neuptraceid: traceId, moreDetails: { serverCookies: await getTrackedServerCookies() }, agent: requestHeaders.get("user-agent") ?? "", ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "" }),
      cache: "no-store",
    },
  );
}

export async function logClientActivity(activity: string, data?: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") return;
  await fetch("https://neupgroup.com/analytics/bridge/api.v1/activity?project=${encodeURIComponent(projectId)}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activity, data, agent: navigator.userAgent, pageUrl: window.location.href }),
    keepalive: true,
  });
}
`;
}

function buildLayoutCode(projectId: string, tracking: TrackingOptions) {
  return `import { headers } from "next/headers";
import { getAnalyticsContext, logPageActivity } from "@/analytics";

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
          src="https://neupgroup.com/analytics/bridge/sdk.v1/tracker"
          data-context-id={signedContextId}
          data-project-id="${projectId}"
          data-collect="${tracking.essentials ? 'pageview' : 'none'}"
          data-cookie-keys={${JSON.stringify(JSON.stringify(tracking.allCookies ? '*' : tracking.cookies))}}
          data-server-fields={JSON.stringify(${JSON.stringify(trackingFields(tracking), null, 2)})}
          defer
        />
      </body>
    </html>
  );
}`;
}

export type SetupExample = { title: string; description: string; code: string };

export function buildLanguageExamples(language: string, projectId: string, tracking: TrackingOptions = defaultTrackingOptions): SetupExample[] {
  const fields = JSON.stringify(trackingFields(tracking));
  const phpFields = '[' + tracking.serverFields.map((name) => `'${name}' => '--valuegoeshere--'`).join(', ') + ']';
  const serverCookieKeys = JSON.stringify(tracking.serverCookies ?? []);
  const allServerCookies = Boolean(tracking.allServerCookies);
  const phpCookieKeys = '[' + (tracking.serverCookies ?? []).map((name) => `'${name}'`).join(', ') + ']';
  const endpoint = `https://neupgroup.com/analytics/bridge/api.v1/activity?project=${encodeURIComponent(projectId)}`;
  const sdk = 'https://neupgroup.com/analytics/bridge/sdk.v1/tracker';
  const browser = `const response = await fetch("/analytics-context", { credentials: "same-origin", cache: "no-store" });
if (!response.ok) throw new Error("Analytics context unavailable");
const { signedContextId, serverFields } = await response.json();
if (!document.querySelector('script[data-neup-sdk]')) {
  const script = document.createElement("script");
  script.src = "${sdk}";
  script.dataset.neupSdk = "true";
  script.dataset.projectId = "${projectId}";
  script.dataset.contextId = signedContextId;
  script.dataset.collect = "${tracking.essentials ? 'pageview' : 'none'}";
  script.dataset.cookieKeys = ${JSON.stringify(JSON.stringify(tracking.allCookies ? '*' : tracking.cookies))};
  script.dataset.serverFields = JSON.stringify(serverFields || {});
  script.defer = true;
  document.body.appendChild(script);
}`;
  const node = `// npm install express cookie-parser
// Set NEUP_ANALYTICS_PROJECT_KEY on the server. Use HTTPS in production.
import express from "express";
import cookieParser from "cookie-parser";
import { randomBytes, createHmac } from "node:crypto";

const app = express();
app.use(cookieParser());
const secret = process.env.NEUP_ANALYTICS_PROJECT_KEY;
if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Invalid project secret");
const key = Buffer.from(secret, "hex");
app.get("/analytics-context", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    let traceId = req.cookies._neuptraceid;
    if (typeof traceId !== "string" || !/^[a-f0-9]{64}$/.test(traceId)) {
      traceId = randomBytes(32).toString("hex");
      res.cookie("_neuptraceid", traceId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    }
    const contextId = createHmac("sha256", key).update(traceId).digest("hex");
    const signature = createHmac("sha256", key).update("neup-context:v1:" + contextId).digest("hex");
    const signedContextId = "v1." + contextId + "." + signature;
    const response = await fetch("${endpoint}", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pageview", contextId: signedContextId, _neuptraceid: traceId,
        moreDetails: { serverCookies: Object.fromEntries(Object.entries(req.cookies).filter(([name]) => ${allServerCookies} || ${serverCookieKeys}.includes(name))) } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Analytics registration failed");
    res.json({ signedContextId, serverFields: ${fields} });
  } catch {
    res.status(503).json({ error: "Analytics unavailable" });
  }
});
app.listen(3000);
// Mount this route on the same origin as your site (or proxy /analytics-context).
`;
  const server: SetupExample = { title: '1. Add the server context endpoint', description: 'Node.js 20+ with Express. Configure the project secret and register this server’s outbound IP in project settings. Never expose this endpoint with permissive cross-origin access.', code: node };
  const client = (code: string, description = 'Run once in the browser. The same-origin server endpoint supplies the signed token; the secret stays on the server.'): SetupExample => ({ title: '2. Load the interactions SDK', description, code });
  if (language === 'javascript') return [server, client(`async function startAnalytics() {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`)];
  if (language === 'typescript') return [{ ...server, description: server.description + ' Save as server.ts; install @types/express and @types/cookie-parser and run with tsx.' }, client(`async function startAnalytics(): Promise<void> {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`)];
  if (language === 'react') return [server, client(`import { useEffect } from "react";
let started = false;
export function Analytics() {
  useEffect(() => {
    if (started) return;
    started = true;
    async function start() {
${browser}
    }
    void start().catch(() => { started = false; });
  }, []);
  return null;
}
// Render <Analytics /> once in your app shell.`)];
  if (language === 'vue') return [server, client(`<script setup>
import { onMounted } from "vue";
onMounted(() => {
  async function start() {
${browser}
  }
  void start().catch(console.error);
});
</script>
<template><span hidden /></template>
<!-- Mount this component once in App.vue. -->`)];
  if (language === 'angular') return [server, client(`import { Component, afterNextRender } from "@angular/core";
@Component({ selector: "app-analytics", standalone: true, template: "" })
export class AnalyticsComponent {
  constructor() {
    afterNextRender(() => {
      async function start() {
${browser}
      }
      void start().catch(console.error);
    });
  }
}
// Import AnalyticsComponent and render <app-analytics /> in your root component.`)];
  if (language === 'python') return [{ title: '1. Add the Flask server endpoint', description: 'pip install flask requests. Set the project secret and register your outbound server IP. Mount on your website origin.', code: `import os, re, secrets, hmac, hashlib
import requests
from flask import Flask, request, jsonify
app = Flask(__name__)
secret = os.environ["NEUP_ANALYTICS_PROJECT_KEY"]
if not re.fullmatch(r"[a-f0-9]{64}", secret):
    raise ValueError("Invalid project secret")
key = bytes.fromhex(secret)

@app.get("/analytics-context")
def analytics_context():
    trace = request.cookies.get("_neuptraceid", "")
    if not re.fullmatch(r"[a-f0-9]{64}", trace):
        trace = secrets.token_hex(32)
    context = hmac.new(key, trace.encode(), hashlib.sha256).hexdigest()
    signature = hmac.new(key, ("neup-context:v1:" + context).encode(), hashlib.sha256).hexdigest()
    token = "v1." + context + "." + signature
    try:
        server_cookies = {name: value for name, value in request.cookies.items() if ${allServerCookies ? 'True' : 'False'} or name in ${serverCookieKeys}}
        upstream = requests.post("${endpoint}", json={"type": "pageview", "contextId": token, "_neuptraceid": trace, "moreDetails": {"serverCookies": server_cookies}}, timeout=5)
        upstream.raise_for_status()
    except requests.RequestException:
        return jsonify(error="Analytics unavailable"), 503
    response = jsonify(signedContextId=token, serverFields=${fields})
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie("_neuptraceid", trace, httponly=True, secure=True, samesite="Lax", path="/")
    return response
# Use HTTPS. Serve your existing site with this app or proxy the route.
` }, client(`async function startAnalytics() {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`)];
  if (language === 'ruby') return [{ title: '1. Add the Sinatra endpoint', description: 'Install sinatra and a Rack server, use HTTPS, configure the server secret and register its outbound IP.', code: `require 'sinatra'
require 'openssl'
require 'securerandom'
require 'json'
require 'net/http'

secret = ENV.fetch('NEUP_ANALYTICS_PROJECT_KEY')
raise 'Invalid project secret' unless /\\A[a-f0-9]{64}\\z/.match?(secret)
key = [secret].pack('H*')
get '/analytics-context' do
  content_type :json
  headers 'Cache-Control' => 'no-store'
  begin
    trace = request.cookies['_neuptraceid'].to_s
    trace = SecureRandom.hex(32) unless /\\A[a-f0-9]{64}\\z/.match?(trace)
    context = OpenSSL::HMAC.hexdigest('SHA256', key, trace)
    token = 'v1.' + context + '.' + OpenSSL::HMAC.hexdigest('SHA256', key, 'neup-context:v1:' + context)
    uri = URI('${endpoint}')
    message = Net::HTTP::Post.new(uri)
    message['Content-Type'] = 'application/json'
    server_cookies = request.cookies.select { |name, _value| ${allServerCookies} || ${serverCookieKeys}.include?(name) }
    message.body = JSON.generate(type: 'pageview', contextId: token, _neuptraceid: trace, moreDetails: { serverCookies: server_cookies })
    upstream = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 5) { |http| http.request(message) }
    raise 'Registration failed' unless upstream.is_a?(Net::HTTPSuccess)
    response.set_cookie('_neuptraceid', value: trace, path: '/', httponly: true, secure: true, same_site: :lax)
    JSON.generate(signedContextId: token, serverFields: JSON.parse('${fields}'))
  rescue StandardError
    halt 503, JSON.generate(error: 'Analytics unavailable')
  end
end` }, client(`async function startAnalytics() {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`)];
  const phpCore = `$secret = getenv('NEUP_ANALYTICS_PROJECT_KEY');
if (!is_string($secret) || !preg_match('/^[a-f0-9]{64}$/', $secret)) {
    throw new RuntimeException('Invalid project secret');
}
$key = hex2bin($secret);
$trace = $_COOKIE['_neuptraceid'] ?? '';
if (!is_string($trace) || !preg_match('/^[a-f0-9]{64}$/', $trace)) $trace = bin2hex(random_bytes(32));
$context = hash_hmac('sha256', $trace, $key);
$token = 'v1.' . $context . '.' . hash_hmac('sha256', 'neup-context:v1:' . $context, $key);`;
  if (language === 'php') return [{ title: '1. Serve /analytics-context with PHP', description: 'PHP 8+ with cURL. Route /analytics-context to this file on your HTTPS website. Set the server secret and outbound IP.', code: `<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
try {
${phpCore}
$serverCookies = ${allServerCookies ? '$_COOKIE' : `array_intersect_key($_COOKIE, array_flip(${phpCookieKeys}))`};
$curl = curl_init('${endpoint}');
curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['type' => 'pageview', 'contextId' => $token, '_neuptraceid' => $trace, 'moreDetails' => ['serverCookies' => (object) $serverCookies]], JSON_THROW_ON_ERROR)]);
$result = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
if ($result === false || $status < 200 || $status >= 300) throw new RuntimeException('Registration failed');
setcookie('_neuptraceid', $trace, ['path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
echo json_encode(['signedContextId' => $token, 'serverFields' => (object) ${phpFields}], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    http_response_code(503);
    echo json_encode(['error' => 'Analytics unavailable']);
}` }, client(`async function startAnalytics() {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`)];
  if (language === 'laravel') return [{ title: '1. Configure the secret', description: 'Add this entry inside the returned array in config/services.php, then rebuild your configuration cache. Use HTTPS and register the server outbound IP.', code: `'neup' => ['key' => env('NEUP_ANALYTICS_PROJECT_KEY')],` }, { title: '2. Add to routes/web.php', description: 'Laravel manages cookie encryption. The raw trace exists only inside your server handler.', code: `use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Http;
use Illuminate\\Support\\Facades\\Route;

Route::get('/analytics-context', function (Request $request) {
    try {
        $secret = config('services.neup.key');
        if (!is_string($secret) || !preg_match('/^[a-f0-9]{64}$/', $secret)) abort(503);
        $key = hex2bin($secret);
        $trace = $request->cookie('_neuptraceid');
        if (!is_string($trace) || !preg_match('/^[a-f0-9]{64}$/', $trace)) $trace = bin2hex(random_bytes(32));
        $context = hash_hmac('sha256', $trace, $key);
        $token = 'v1.' . $context . '.' . hash_hmac('sha256', 'neup-context:v1:' . $context, $key);
        Http::timeout(5)->post('${endpoint}', [
            'type' => 'pageview', 'contextId' => $token, '_neuptraceid' => $trace,
            'moreDetails' => ['serverCookies' => (object) ${allServerCookies ? '$request->cookies->all()' : `array_intersect_key($request->cookies->all(), array_flip(${phpCookieKeys}))`}],
        ])->throw();
        return response()->json(['signedContextId' => $token, 'serverFields' => (object) ${phpFields}])->header('Cache-Control', 'no-store')
            ->cookie('_neuptraceid', $trace, 0, '/', null, true, true, false, 'lax');
    } catch (\\Throwable $error) {
        return response()->json(['error' => 'Analytics unavailable'], 503);
    }
});` }, { ...client(`async function startAnalytics() {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`), title: '3. Load the SDK in your Blade page or frontend JavaScript' }];
  return [{ title: '1. Implement the server protocol', description: 'Use the standard HMAC-SHA256 implementation in your language. Keep the secret on the server and configure its outbound IP in analytics.', code: `GET /analytics-context (same-origin, Cache-Control: no-store)
1. Read the HttpOnly _neuptraceid cookie; create 32 random bytes encoded as hex if absent.
2. key = hexDecode(NEUP_ANALYTICS_PROJECT_KEY) // exactly 32 bytes
3. contextId = lowercaseHex(HMAC_SHA256(key, UTF8(traceId)))
4. signature = lowercaseHex(HMAC_SHA256(key, UTF8("neup-context:v1:" + contextId)))
5. token = "v1." + contextId + "." + signature
6. POST ${endpoint}
   Content-Type: application/json
   {"type":"pageview","contextId":token,"_neuptraceid":traceId,"moreDetails":{"serverCookies":serverCookies}}
   serverCookies = ${allServerCookies ? 'all cookies available on the incoming server request' : `only existing request cookies with keys in ${serverCookieKeys}`}
   Never include serverCookies in the response to the browser.
7. After a successful response, set the HttpOnly, Secure, SameSite=Lax trace cookie.
8. Respond to the browser with {"signedContextId":token,"serverFields":${fields}}.
On upstream failure, return 503. Never return the secret or raw trace ID.` }, client(`async function startAnalytics() {\n${browser}\n}\nvoid startAnalytics().catch(console.error);`)];
}

export function SetupGuidelines({ projectId, tracking = defaultTrackingOptions, startStep = 1 }: { projectId: string; tracking?: TrackingOptions; startStep?: number }) {
  const [language, setLanguage] = useState('');
  const [copied, setCopied] = useState<number>();
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => {
      setLanguage(window.localStorage.getItem('neup-config-framework') ?? '');
      setCopied(undefined);
      setError('');
    };
    update();
    window.addEventListener('neup-config-framework-change', update);
    return () => window.removeEventListener('neup-config-framework-change', update);
  }, []);
  if (!language) return <p className="text-sm text-muted-foreground">Choose a language or framework above to see its setup scripts.</p>;
  const examples: SetupExample[] = language === 'nextjs' ? [
    { title: 'Add the following file to your application', description: 'Create analytics.ts in the folder mapped to @/*. Keep this file server-side.', code: buildAnalyticsCode(projectId, tracking) },
    { title: 'Add the following to your RootLayout or Main Layout.tsx', description: 'Add this to the layout that runs on the server.', code: buildLayoutCode(projectId, tracking) },
  ] : buildLanguageExamples(language, projectId, tracking);
  return <div className="space-y-6">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {examples.map((example, index) => <section key={example.title} className="space-y-2">
      <h3 className="text-base font-semibold">{startStep + index}. {example.title.replace(/^\d+\.\s*/, '')}</h3>
      <p className="text-sm text-muted-foreground">{example.description}</p>
      <div className="relative rounded-xl border bg-muted/20 p-4 pr-16">
      <button type="button" aria-label={copied === index ? 'Code copied' : 'Copy code'} title={copied === index ? 'Copied' : 'Copy code'} className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={async () => {
        try {
          await navigator.clipboard.writeText(example.code);
          setCopied(index);
          setError('');
        } catch { setError('Clipboard unavailable. Select and copy the code below.'); }
      }}>{copied === index ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}</button>
      <pre tabIndex={0} aria-label={`${example.title.replace(/^\d+\.\s*/, '')} code`} className={`${styles.codeViewport} whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}><code>{example.code}</code></pre>
      </div>
    </section>)}
  </div>;
}
