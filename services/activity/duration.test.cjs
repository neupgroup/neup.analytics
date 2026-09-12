const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('duration updates latest matching pageview without inserting activities', async () => {
  const rows = [];
  const activity = {
    create: async ({ data }) => { const row = { ...data, duration: 0 }; rows.push(row); return row; },
    findFirst: async ({ where }) => rows.slice().reverse().find(row => row.projectId === where.projectId && row.contextId === where.contextId && new URL(row.pageUrl).origin === where.OR[0].pageUrl),
    updateMany: async ({ where, data }) => {
      const row = rows.find(row => row.id === where.id && row.duration < where.duration.lt);
      if (row) Object.assign(row, data);
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/activity/createActivity.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, URL, crypto: require('node:crypto'), require: name => {
    if (name.includes('database/prisma')) return { prisma: { $transaction: fn => fn({ activity }) } };
    return { getFreshIpMapsByAddress: async () => {} };
  } });
  const base = { identifierId: 'session', contextId: 'context', pageUrl: 'https://example.com/a', moreDetails: { viewId: 'view-a' } };
  await exports.createActivities('project', [{ ...base, type: 'pageview' }, { ...base, type: 'duration', duration: 500 }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].duration, 500);
  await exports.createActivities('project', [8000, 1000, 8000].map(duration => ({ ...base, type: 'duration', duration })));
  assert.equal(rows[0].duration, 8000);
  await exports.createActivities('project', [{ ...base, type: 'click' }, { ...base, type: 'duration', duration: 12000 }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].duration, 8000, 'latest click blocks duration');
  await exports.createActivities('project', [{ ...base, type: 'pageview', moreDetails: { viewId: 'view-b' } }, { ...base, type: 'duration', duration: 16000 }]);
  assert.equal(rows[2].duration, 0, 'stale view cannot modify new view');
  await exports.createActivities('other-project', [{ ...base, type: 'duration', duration: 20000 }]);
  assert.equal(rows.length, 3);
});
