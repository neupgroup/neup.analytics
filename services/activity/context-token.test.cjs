const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(source, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText,
    { exports, require, Buffer, process, ...extra });
  return exports;
}
const auth = load(fs.readFileSync('services/activity/context-token.ts', 'utf8'));
test('HMAC derivation matches independent Node computation and tokens reject changes', () => {
  const secret = auth.generateProjectSecret();
  assert.match(secret, /^[a-f0-9]{64}$/);
  const context = auth.deriveContextId(secret, 'trace-a');
  assert.equal(context, require('node:crypto').createHmac('sha256', Buffer.from(secret, 'hex')).update('trace-a').digest('hex'));
  const token = auth.signContextToken(secret, context);
  assert.equal(auth.verifyContextToken(secret, token), context);
  for (const invalid of ['', context, token + '0', token.slice(0, -1), token.replace('v1.', 'v2.'), token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')]) {
    assert.equal(auth.verifyContextToken(secret, invalid), null);
  }
  assert.equal(auth.verifyContextToken(auth.generateProjectSecret(), token), null);
  assert.equal(auth.verifyContextToken(null, token), null);
  assert.equal(auth.matchesTrace(secret, context, 'trace-a'), true);
  assert.equal(auth.matchesTrace(secret, context, 'trace-b'), false);
});
test('both distributed SDK snippets produce server-compatible tokens', () => {
  const secret = auth.generateProjectSecret();
  const sources = [fs.readFileSync('setup/nextjs/analytics.block', 'utf8'), fs.readFileSync('components/setup-guidelines.tsx', 'utf8')];
  for (const source of sources) {
    const helpers = source.slice(source.indexOf('function projectSecret'), source.indexOf('export async function getAnalyticsContext'));
    const sdk = load('import crypto from "node:crypto";\n' + helpers + '\nexport { generateContextId, signContextId };', { process: { env: { NEUP_ANALYTICS_PROJECT_KEY: secret } } });
    const context = sdk.generateContextId('trace-sdk');
    assert.equal(context, auth.deriveContextId(secret, 'trace-sdk'));
    assert.equal(auth.verifyContextToken(secret, sdk.signContextId(context)), context);
  }
});

test('API and browser webhook reject invalid batches before persistence', async () => {
  const secret = auth.generateProjectSecret();
  const contextId = auth.deriveContextId(secret, 'trace-a');
  const token = auth.signContextToken(secret, contextId);
  for (const path of ['app/bridge/api.v1/activity/route.ts', 'app/bridge/webhook.v1/activity/route.ts']) {
    let writes = 0;
    let saved;
    const prisma = {
      project: { findUnique: async () => ({ id: 'project', path: 'https://example.com', ipAddress: null, projectSecret: secret }) },
      analyticsContext: {
        findFirst: async () => ({ traceId: 'trace-a' }),
        upsert: async () => { writes++; },
      },
    };
    const handler = load(fs.readFileSync(path, 'utf8'), { URL, console, require: (id) => {
      if (id === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options.status }) } };
      if (id.includes('database/prisma')) return { prisma };
      if (id.endsWith('context-token')) return auth;
      if (id.endsWith('createActivity')) return {
        parseActivityEvents: (body) => Array.isArray(body) ? body : [body],
        isProjectOriginAllowed: () => true,
        getRecordableActivityEvents: (events) => events,
        createActivities: async (_, events) => { writes++; saved = events; return []; },
      };
      return require(id);
    } });
    const request = (body) => ({ url: 'https://analytics.test/activity?project=project', headers: new Headers({ origin: 'https://example.com' }), json: async () => body });
    for (const body of [
      { contextId: token + 'x' },
      [{ contextId: token }, { contextId: 'bad' }],
      { signed_context_id: 42 },
      { contextId: token, signed_context_id: 'bad' },
      { contextId: auth.signContextToken(auth.generateProjectSecret(), contextId) },
    ]) {
      assert.equal((await handler.POST(request(body))).status, 403);
      assert.equal(writes, 0);
    }
    if (path.includes('api.v1')) {
      assert.equal((await handler.POST(request({ contextId: token, _neuptraceid: 'trace-b' }))).status, 403);
      assert.equal(writes, 0);
    }
    assert.equal((await handler.POST(request({ contextId: token }))).status, 201);
    assert.equal(saved[0].contextId, contextId);
    assert.equal(saved[0].traceId, 'trace-a');
  }
});
