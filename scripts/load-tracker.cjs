const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Evaluate only local SDK source modules to assemble their exported script strings.
function loadTrackerModule(filename) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (!name.startsWith('.')) throw new Error('Expected a relative SDK module');
    return loadTrackerModule(path.resolve(path.dirname(filename), name + '.ts'));
  } });
  return exports;
}
module.exports = { loadTrackerModule };
