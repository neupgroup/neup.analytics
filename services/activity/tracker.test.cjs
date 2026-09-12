const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('browser tracker records navigation and visible duration, retries rejected events, and respects essentials', async () => {
  const source = fs.readFileSync('app/bridge/sdk.v1/tracker/route.ts', 'utf8').split('String.raw`')[1].split('`;')[0];
  const listeners = {};
  const requests = [];
  let now = 1000;
  let accepted = false;
  const location = new URL('https://example.com/first');
  const attrs = { 'data-project-id': 'project', 'data-context-id': 'v1.signed', 'data-collect': 'pageview' };
  const script = { src: 'https://analytics.example.com/analytics/bridge/sdk.v1/tracker', dataset: {}, getAttribute: name => attrs[name] };
  const document = { currentScript: script, visibilityState: 'visible', referrer: '', addEventListener: (name, fn) => { listeners[name] = fn; } };
  const storage = new Map();
  const window = {
    location, crypto: { randomUUID: () => 'session' },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setTimeout: () => 1, clearTimeout() {},
    addEventListener: (name, fn) => { listeners[name] = fn; },
    history: { pushState(_state, _title, path) { location.href = new URL(path, location).href; }, replaceState() {} },
  };
  vm.runInNewContext(source, { window, document, location, URL, Promise, Blob,
    Date: { now: () => now }, console,
    navigator: { userAgent: 'test' },
    fetch: async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: accepted, status: accepted ? 201 : 403 }; },
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  accepted = true;
  now = 6000;
  window.neupAnalytics.flush();
  await settle();
  assert.equal(requests[1][0].type, 'pageview', 'failed initial view is retried');
  assert.equal(requests[1].find(event => event.type === 'duration').timeSpent, 5000);
  now = 8000;
  window.history.pushState({}, '', '/second');
  await settle();
  assert.equal(requests[2].find(event => event.type === 'duration').pageUrl, 'https://example.com/first');
  assert.equal(requests[2].find(event => event.type === 'pageview').pageUrl, 'https://example.com/second');
  now = 10000;
  document.visibilityState = 'hidden';
  listeners.visibilitychange();
  await settle();
  now = 20000;
  document.visibilityState = 'visible';
  listeners.visibilitychange();
  now = 21000;
  window.neupAnalytics.flush();
  await settle();
  assert.equal(requests.at(-1)[0].timeSpent, 1000, 'hidden time is excluded');
  assert.equal(listeners.click, undefined);
  assert.ok(requests.flat().every(event => ['pageview', 'duration'].includes(event.type)));
});
