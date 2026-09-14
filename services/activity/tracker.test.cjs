const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function trackerSource() {
  if (process.env.TRACKER_MINIFIED === '1') {
    return require('../../scripts/load-tracker.cjs').loadTrackerModule('app/bridge/sdk.v1/tracker/minified.client.ts').clientSource;
  }
  return require('../../scripts/load-tracker.cjs').loadTrackerModule('app/bridge/sdk.v1/tracker/expanded.client.ts').clientSource;
}

test('browser tracker records navigation and visible duration, retries rejected events, and respects essentials', async () => {
  const source = trackerSource();
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
  assert.equal(timers[0].delay, 1000);
  accepted = true;
  for (const deadline of [1000, 2000, 4000, 8000, 16000, 20000, 24000, 28000, 32000, 36000, 40000, 44000, 48000, 52000]) {
    assert.equal(timers.at(-1).delay, 1000 + deadline - now);
    now = 1000 + deadline;
    timers.at(-1).fn();
    await settle();
    assert.equal(requests.at(-1).find(event => event.type === 'duration').duration, deadline);
  }
  now = 54000;
  window.history.pushState({}, '', '/timing-reset');
  await settle();
  assert.equal(timers.at(-1).delay, 1000);
  // Test a fresh view after exercising the complete schedule.
  now = 55000;
  window.history.pushState({}, '', '/first');
  await settle();
  requests.length = 0;
  accepted = false;
  window.neupAnalytics.pageview();
  await settle();
  accepted = true;
  now = 60000;
  window.neupAnalytics.flush();
  await settle();
  assert.equal(requests[1][0].type, 'pageview', 'failed initial view is retried');
  assert.equal(requests[1].find(event => event.type === 'duration').duration, 5000);
  now = 62000;
  window.history.pushState({}, '', '/second');
  await settle();
  assert.equal(requests[2].find(event => event.type === 'duration').pageUrl, 'https://example.com/first');
  assert.equal(requests[2].find(event => event.type === 'pageview').pageUrl, 'https://example.com/second');
  now = 64000;
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

function harness({ stored = [], collect = 'none', sourceOverride, urlCollect, respond = () => Promise.resolve({ ok: true, status: 201 }) } = {}) {
  const source = sourceOverride || trackerSource();
  const listeners = {};
  const requests = [];
  const timers = [];
  const storage = new Map([['session_event_buffer:project', JSON.stringify(stored)]]);
  const location = new URL('https://example.com/');
  let now = 1000;
  const document = {
    currentScript: { src: 'https://analytics.example.com/bridge/sdk.v1/tracker' + (urlCollect === undefined ? '' : '?collect=' + encodeURIComponent(urlCollect)), dataset: {},
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
    fire: (name, event) => (listeners[name] || []).forEach(fn => fn(event)),
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

function eventTarget(tagName, { privateField = false, link = false, field = false } = {}) {
  return {
    tagName, nodeType: 1, href: 'https://example.com/destination?token=secret#private',
    closest(selector) { return selector === 'a[href],area[href]' ? (link ? this : null) : (privateField ? this : null); },
    contains: () => false, matches: () => field,
  };
}

test('all eight event modules deliver events with throttling and redacted content', async () => {
  const h = harness({ collect: 'all' });
  await settle();
  const input = eventTarget('INPUT', { field: true });
  const div = eventTarget('DIV');
  const link = eventTarget('A', { link: true });
  h.fire('keydown', { target: input, key: 's' });
  h.fire('keydown', { target: input, key: 'Enter' });
  h.fire('input', { target: input, type: 'input' });
  h.fire('input', { target: input, type: 'input' });
  h.fire('mousemove', { target: div, clientX: 15, clientY: 20 });
  h.fire('mousemove', { target: div, clientX: 16, clientY: 21 });
  h.fire('mouseover', { target: link });
  h.fire('mouseover', { target: link, relatedTarget: null });
  h.window.getSelection = () => ({ isCollapsed: false, anchorNode: div, focusNode: div, toString: () => 'private text' });
  h.fire('selectionchange');
  h.fire('selectionchange');
  h.fire('click', { target: link, clientX: 5, clientY: 8 });
  await settle();
  const events = h.requests.flatMap(request => JSON.parse(request.body));
  for (const type of ['pageview', 'keydown', 'input', 'mousemove', 'click', 'linkhover', 'linkclick', 'selection']) {
    assert.ok(events.some(event => event.type === type), `missing ${type}`);
  }
  for (const type of ['input', 'mousemove', 'linkhover', 'selection']) assert.equal(events.filter(event => event.type === type).length, 1);
  assert.deepEqual(events.filter(event => event.type === 'keydown').map(event => event.moreDetails.key), ['[redacted]', 'Enter']);
  assert.equal(events.find(event => event.type === 'linkclick').moreDetails.targetUrl, 'https://example.com/destination');
  assert.ok(h.requests.every(request => !request.body.includes('private text') && !request.body.includes('token=secret')));
});

test('private fields are excluded and individual event flags remain independent', async () => {
  const h = harness({ collect: 'keyboard,forms,selection' });
  const target = eventTarget('INPUT', { privateField: true, field: true });
  h.fire('keydown', { target, key: 'Enter' });
  h.fire('input', { target, type: 'input' });
  h.window.getSelection = () => ({ isCollapsed: false, anchorNode: target, focusNode: target });
  h.fire('selectionchange');
  h.fire('mousemove', { target: eventTarget('DIV'), clientX: 1, clientY: 1 });
  h.window.neupAnalytics.flush();
  assert.equal(h.requests.length, 0);
  h.fire('input', { target: eventTarget('INPUT', { field: true }), type: 'change' });
  h.timers[0].fn();
  await settle();
  assert.equal(JSON.parse(h.requests[0].body)[0].type, 'input', 'interaction-only configuration flushes on schedule');
});

test('copy-content records copy actions without clipboard text and excludes private targets', async () => {
  for (const collect of ['copy-content', 'all']) {
    const h = harness({ collect });
    await settle();
    const target = eventTarget('DIV');
    const privateField = eventTarget('INPUT', { privateField: true });
    const event = { target, get clipboardData() { throw new Error('Clipboard must not be read'); } };
    h.window.getSelection = () => ({ anchorNode: target, focusNode: target, toString() { throw new Error('Text must not be read'); } });
    h.fire('copy', event);
    h.fire('copy', { target: privateField });
    h.window.getSelection = () => ({ anchorNode: target, focusNode: privateField });
    h.fire('copy', event);
    h.window.neupAnalytics.flush();
    await settle();
    const copies = h.requests.flatMap(request => JSON.parse(request.body)).filter(event => event.type === 'copy-content');
    assert.equal(copies.length, 1);
    assert.equal(copies[0].moreDetails.action, 'copy');
    assert.equal(copies[0].moreDetails.element, 'div');
  }
  const disabled = harness({ collect: 'none' });
  disabled.fire('copy', { target: eventTarget('DIV') });
  assert.equal(disabled.buffer().length, 0);
});

test('selected SDK responses contain only requested listeners and discard old unselected events', async () => {
  const sdk = require('../../scripts/load-tracker.cjs').loadTrackerModule('app/bridge/sdk.v1/tracker/minified.client.ts');
  const source = sdk.buildClientSource('pageview');
  assert.doesNotMatch(source, /NEUP_MODULE_|addEventListener\("(?:keydown|input|mousemove|mouseover|selectionchange|copy)"/);
  assert.ok(source.length < sdk.buildClientSource('all').length);
  const h = harness({ collect: 'all', urlCollect: 'pageview', sourceOverride: source,
    stored: [{ type: 'copy-content' }, { type: 'pageview' }] });
  await settle();
  h.fire('copy', { target: eventTarget('DIV') });
  h.window.neupAnalytics.track({ type: 'copy-content' });
  h.fire('keydown', { target: eventTarget('DIV'), key: 'Enter' });
  h.advance(1000);
  h.timers.at(-1).fn();
  await settle();
  assert.ok(h.requests.flatMap(request => JSON.parse(request.body)).every(event => ['pageview', 'duration'].includes(event.type)));
  const copySource = sdk.buildClientSource('copy');
  const copy = harness({ collect: 'copy-content', urlCollect: 'copy', sourceOverride: copySource });
  copy.fire('copy', { target: eventTarget('DIV') });
  copy.window.neupAnalytics.flush();
  await settle();
  assert.equal(JSON.parse(copy.requests[0].body)[0].type, 'copy-content');
  assert.doesNotMatch(sdk.buildClientSource('unknown,none,all'), /addEventListener\("copy"/);
});

test('legacy script loader forwards selection and preserves context and project attributes', async () => {
  const ts = require('typescript');
  const sdk = require('../../scripts/load-tracker.cjs').loadTrackerModule('app/bridge/sdk.v1/tracker/minified.client.ts');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/bridge/sdk.v1/tracker/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, URL, Response, require: () => sdk });
  const response = await exports.GET(new Request('https://example.com/bridge/sdk.v1/tracker'));
  let inserted;
  const attributes = [{ name: 'data-collect', value: 'pageview' }, { name: 'data-context-id', value: 'signed' }, { name: 'data-project-id', value: 'project' }];
  const current = { src: 'https://example.com/bridge/sdk.v1/tracker', attributes, getAttribute: name => attributes.find(attr => attr.name === name)?.value,
    parentNode: { insertBefore: script => { inserted = script; } } };
  vm.runInNewContext(await response.text(), { URL, document: { currentScript: current, createElement: () => ({ setAttribute(name, value) { this[name] = value; } }) } });
  assert.equal(new URL(inserted.src).searchParams.get('collect'), 'pageview');
  assert.equal(inserted['data-context-id'], 'signed');
  assert.equal(inserted['data-project-id'], 'project');
  const selected = await exports.GET(new Request(inserted.src));
  assert.equal(await selected.text(), sdk.buildClientSource('pageview'));
});
