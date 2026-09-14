const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('browser tracker records navigation and visible duration, retries rejected events, and respects essentials', async () => {
  const source = fs.readFileSync('app/bridge/sdk.v1/tracker/route.ts', 'utf8').split('String.raw`')[1].split('`;')[0];
  const listeners = {};
  const requests = [];
  let now = 1000;
  let accepted = true;
  const timers = [];
  const location = new URL('https://example.com/first');
  const attrs = { 'data-project-id': 'project', 'data-context-id': 'v1.signed', 'data-collect': 'pageview' };
  const script = { src: 'https://analytics.example.com/analytics/bridge/sdk.v1/tracker', dataset: {}, getAttribute: name => attrs[name] };
  const document = { currentScript: script, visibilityState: 'visible', referrer: '', addEventListener: (name, fn) => { listeners[name] = fn; } };
  const storage = new Map();
  const window = {
    location, crypto: { randomUUID: () => 'session' },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    addEventListener: (name, fn) => { listeners[name] = fn; },
    history: { pushState(_state, _title, path) { location.href = new URL(path, location).href; }, replaceState() {} },
  };
  vm.runInNewContext(source, { window, document, location, URL, Promise, Blob,
    Date: { now: () => now }, console,
    navigator: { userAgent: 'test' },
    fetch: async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: accepted, status: accepted ? 201 : 503 }; },
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  assert.equal(timers[0].delay, 500);
  accepted = true;
  for (const deadline of [500, 1000, 2000, 4000, 8000, 12000, 16000, 20000, 25000, 30000, 35000, 40000, 45000, 50000]) {
    now = 1000 + deadline;
    timers.at(-1).fn();
    await settle();
    assert.equal(requests.at(-1).find(event => event.type === 'duration').duration, deadline);
  }
  now = 52000;
  window.history.pushState({}, '', '/timing-reset');
  await settle();
  assert.equal(timers.at(-1).delay, 500);
  // Test a fresh view after exercising the complete schedule.
  now = 53000;
  window.history.pushState({}, '', '/first');
  await settle();
  requests.length = 0;
  accepted = false;
  window.neupAnalytics.pageview();
  await settle();
  accepted = true;
  now = 58000;
  window.neupAnalytics.flush();
  await settle();
  assert.equal(requests[1][0].type, 'pageview', 'failed initial view is retried');
  assert.equal(requests[1].find(event => event.type === 'duration').duration, 5000);
  now = 60000;
  window.history.pushState({}, '', '/second');
  await settle();
  assert.equal(requests[2].find(event => event.type === 'duration').pageUrl, 'https://example.com/first');
  assert.equal(requests[2].find(event => event.type === 'pageview').pageUrl, 'https://example.com/second');
  now = 62000;
  document.visibilityState = 'hidden';
  listeners.visibilitychange();
  await settle();
  now = 72000;
  document.visibilityState = 'visible';
  listeners.visibilitychange();
  now = 73000;
  window.neupAnalytics.flush();
  await settle();
  assert.equal(requests.at(-1)[0].duration, 3000, 'cumulative duration excludes hidden time');
  listeners.click({ target: { closest: () => ({}) } });
  await settle();
  const count = requests.length;
  now += 10000;
  window.neupAnalytics.flush();
  await settle();
  assert.equal(requests.length, count, 'link click stops duration');
  assert.ok(requests.flat().every(event => ['pageview', 'duration'].includes(event.type)));
});

function harness({ stored = [], collect = 'none', respond = () => Promise.resolve({ ok: true, status: 201 }) } = {}) {
  const source = fs.readFileSync('app/bridge/sdk.v1/tracker/route.ts', 'utf8').split('String.raw`')[1].split('`;')[0];
  const listeners = {};
  const requests = [];
  const timers = [];
  const storage = new Map([['session_event_buffer:project', JSON.stringify(stored)]]);
  const location = new URL('https://example.com/');
  let now = 1000;
  const document = {
    currentScript: { src: 'https://analytics.example.com/bridge/sdk.v1/tracker', dataset: {},
      getAttribute: key => ({ 'data-project-id': 'project', 'data-collect': collect })[key] },
    visibilityState: 'visible', referrer: '',
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
  };
  const window = {
    location, crypto: { randomUUID: () => 'session' },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; },
    clearTimeout() {}, addEventListener: document.addEventListener,
    history: { pushState() {}, replaceState() {} },
  };
  const context = vm.createContext({ window, document, location, URL, Promise, Blob,
    Date: { now: () => now }, console: { warn() {}, error: console.error }, navigator: { userAgent: 'test' },
    fetch: (_url, options) => { requests.push(options); return respond(options); },
  });
  const run = () => vm.runInContext(source, context);
  run();
  return { window, document, requests, timers, storage, run,
    advance: ms => { now += ms; },
    fire: name => (listeners[name] || []).forEach(fn => fn()),
    buffer: () => JSON.parse(storage.get('session_event_buffer:project')),
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('UTF-8 batches stay bounded, drain in order, and routine fetch avoids keepalive', async () => {
  const h = harness();
  for (let i = 0; i < 40; i++) h.window.neupAnalytics.track({ type: 'input', value: '🙂'.repeat(1500), key: String(i) });
  h.window.neupAnalytics.flush();
  await settle();
  while (h.buffer().length) {
    h.timers.at(-1).fn();
    await settle();
  }
  assert.ok(h.requests.length > 2);
  assert.ok(h.requests.every(r => Buffer.byteLength(r.body) <= 48 * 1024 && r.keepalive === false));
  assert.deepEqual(h.requests.flatMap(r => JSON.parse(r.body).map(e => e.moreDetails.key)), Array.from({ length: 40 }, (_, i) => String(i)));
});

test('exit requests retain the lock and duplicate installation adds no requests', async () => {
  let complete;
  const h = harness({ respond: () => new Promise(resolve => { complete = resolve; }) });
  h.window.neupAnalytics.track({ type: 'click' });
  h.document.visibilityState = 'hidden';
  h.fire('visibilitychange');
  h.fire('pagehide');
  h.run();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].keepalive, true);
  assert.ok(h.window.__neupAnalyticsTransport.pendingBytes > 0);
  complete({ ok: true, status: 201 });
  await settle();
  assert.equal(h.window.__neupAnalyticsTransport.pendingBytes, 0);
  assert.equal(h.buffer().length, 0);
});

test('transient failures back off; permanent rejections do not poison the queue', async () => {
  let status = 503;
  const h = harness({ respond: async () => ({ ok: false, status }) });
  h.window.neupAnalytics.track({ type: 'click' });
  h.window.neupAnalytics.flush();
  await settle();
  h.window.neupAnalytics.flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.timers.at(-1).delay, 5000);
  h.advance(5000);
  h.timers.at(-1).fn();
  await settle();
  assert.equal(h.timers.at(-1).delay, 10000);
  status = 403;
  h.advance(10000);
  h.timers.at(-1).fn();
  await settle();
  assert.equal(h.buffer().length, 0);
});

test('oversized restored events are skipped and stored queues are capped', async () => {
  const h = harness({ stored: [{ type: 'input', value: 'x'.repeat(60000) }, { type: 'click' }] });
  await settle();
  assert.equal(JSON.parse(h.requests[0].body)[0].type, 'click');
  for (let i = 0; i < 700; i++) h.window.neupAnalytics.track({ type: 'input', value: 'x'.repeat(1000) });
  assert.ok(h.buffer().length <= 500);
  assert.ok(Buffer.byteLength(h.storage.get('session_event_buffer:project')) <= 256 * 1024);
});

test('server 413 splits batches and discards a rejected single event', async () => {
  const h = harness({ respond: async () => ({ ok: false, status: 413 }) });
  h.window.neupAnalytics.track({ type: 'click' });
  h.window.neupAnalytics.track({ type: 'click' });
  h.window.neupAnalytics.flush();
  await settle();
  h.advance(5000);
  h.timers.at(-1).fn();
  await settle();
  assert.equal(JSON.parse(h.requests[1].body).length, 1);
  assert.equal(h.buffer().length, 1);
});

test('hiding during a routine request does not resend its batch or lose newer events', async () => {
  let complete;
  const h = harness({ respond: () => new Promise(resolve => { complete = resolve; }) });
  h.window.neupAnalytics.track({ type: 'click', key: 'first' });
  h.window.neupAnalytics.flush();
  h.window.neupAnalytics.track({ type: 'click', key: 'second' });
  h.document.visibilityState = 'hidden';
  h.fire('visibilitychange');
  h.fire('pagehide');
  assert.equal(h.requests.length, 1);
  complete({ ok: true, status: 201 });
  await settle();
  assert.equal(h.buffer().length, 1);
  assert.equal(h.buffer()[0].key, 'second');
  h.document.visibilityState = 'visible';
  h.fire('visibilitychange');
  h.timers.at(-1).fn();
  assert.equal(h.requests.length, 2);
  complete({ ok: true, status: 201 });
  await settle();
  assert.equal(h.buffer().length, 0);
});
