const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, encodeURIComponent, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}
const options = load('components/tracking-options.ts');
const examples = load('components/analytics-language-examples.ts', { '@/components/tracking-options': options });

test('language snippets embed cookie choices and named server placeholders', () => {
  const selected = { essentials: true, allCookies: false, cookies: ['language', 'theme'], serverFields: ['account_plan'] };
  for (const language of ['javascript', 'typescript', 'react', 'vue', 'angular', 'python', 'php', 'laravel', 'ruby', 'other']) {
    const code = examples.buildLanguageExamples(language, 'project-123', selected).map((part) => part.code).join('\n');
    assert.ok(code.includes('account_plan') && code.includes('--valuegoeshere--'), language);
    assert.ok(code.includes('language') && code.includes('theme'), language);
    assert.ok(code.includes('script.dataset.collect = "pageview"'), language);
    assert.ok(code.includes('script.dataset.serverFields'), language);
  }
  const code = examples.buildLanguageExamples('javascript', 'project-123', { ...selected, essentials: false, allCookies: true }).map((part) => part.code).join('\n');
  assert.ok(code.includes('script.dataset.collect = "none"'));
  assert.ok(code.includes('script.dataset.cookieKeys = "\\\"*\\\""'));
});

test('tracker reads only selected cookies, handles values and all-cookie selection', () => {
  const source = fs.readFileSync('app/bridge/sdk.v1/tracker/route.ts', 'utf8');
  const helper = source.slice(source.indexOf('    function trackedCookies()'), source.indexOf("    var geoLocation ="));
  const sandbox = { cookieKeys: ['theme'], document: { cookie: 'theme=dark%20mode; auth=secret; equals=a=b' } };
  vm.createContext(sandbox);
  vm.runInContext(helper, sandbox);
  assert.equal(JSON.stringify(sandbox.trackedCookies()), '{"theme":"dark mode"}');
  sandbox.cookieKeys = [];
  assert.equal(JSON.stringify(sandbox.trackedCookies()), '{}');
  sandbox.cookieKeys = '*';
  assert.equal(sandbox.trackedCookies().equals, 'a=b');
  assert.equal(sandbox.trackedCookies().auth, 'secret');
  assert.ok(source.includes("collect.indexOf('geolocation') !== -1"));
});

test('server-cookie selections are independent and never enter browser responses', async () => {
  for (const allServerCookies of [false, true]) {
    const selected = { ...options.defaultTrackingOptions, allServerCookies, serverCookies: ['language', 'missing'] };
    const snippets = examples.buildLanguageExamples('javascript', 'project-123', selected);
    let handler;
    let payload;
    let response;
    const app = { use() {}, listen() {}, get(_path, callback) { handler = callback; } };
    const code = ts.transpileModule(snippets[0].code, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, {
      exports: {}, Buffer, AbortSignal,
      process: { env: { NEUP_ANALYTICS_PROJECT_KEY: 'ab'.repeat(32) } },
      require(name) {
        if (name === 'express') return () => app;
        if (name === 'cookie-parser') return () => () => {};
        return require(name);
      },
      fetch: async (_url, request) => { payload = JSON.parse(request.body); return { ok: true }; },
    });
    await handler({ cookies: { language: 'en', auth: 'private-cookie', _neuptraceid: 'aa'.repeat(32) } }, {
      set() {}, cookie() {}, json(value) { response = value; }, status() { throw new Error('Unexpected registration error'); },
    });
    assert.equal(payload.moreDetails.serverCookies.language, 'en');
    assert.equal(payload.moreDetails.serverCookies.auth, allServerCookies ? 'private-cookie' : undefined);
    assert.equal(payload.moreDetails.serverCookies.missing, undefined);
    assert.equal(JSON.stringify(response).includes('private-cookie'), false);
    assert.equal(JSON.stringify(response).includes('serverCookies'), false);
    assert.equal(snippets[1].code.includes('serverCookies'), false);
    for (const language of ['python', 'php', 'laravel', 'ruby', 'other']) {
      const source = examples.buildLanguageExamples(language, 'project-123', selected).map((part) => part.code).join('\n');
      assert.ok(source.includes('serverCookies'), language);
      assert.ok(source.includes('moreDetails'), language);
    }
  }
});
