const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(source, mocks = {}) {
  const exports = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, { exports, Buffer, require, ...mocks });
  return exports;
}

test('expanded and minified server integrations produce the same signed events without browser APIs', async () => {
  const results = [];
  for (const variant of ['expanded', 'minified']) {
    const builder = load(fs.readFileSync(`app/bridge/sdk.v1/tracker/${variant}.server.ts`, 'utf8'), {
      require: name => name === '@/components/tracking-options' ? {} : require(name),
    });
    const source = builder.buildAnalyticsCode('project', { serverCookies: ['selected'], allServerCookies: false });
    assert.doesNotMatch(source, /\b(window|document|navigator|keepalive|logClientActivity)\b/);
    const requests = [];
    const cookieValues = [{ name: '_neuptraceid', value: 'trace-fixed' }, { name: 'selected', value: 'yes' }, { name: 'unselected', value: 'no' }];
    const sdk = load(source, {
      process: { env: { NEUP_ANALYTICS_PROJECT_KEY: 'ab'.repeat(32) } },
      require: name => name === 'next/headers' ? {
        cookies: async () => ({ get: name => cookieValues.find(cookie => cookie.name === name), getAll: () => cookieValues }),
        headers: async () => new Map([['user-agent', 'server-test']]),
      } : require(name),
      fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true }; },
    });
    const context = await sdk.getAnalyticsContext();
    await sdk.logPageActivity(context.contextId, '/example');
    await sdk.logActivity('custom', { count: 1 });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].body.moreDetails.serverCookies, { selected: 'yes' });
    results.push(JSON.stringify({ context, requests }));
  }
  assert.equal(results[0], results[1]);
});
