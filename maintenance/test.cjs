'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = 'a19df48b63dc738c5200bc907f9e8e523de62d72';
function load(old) {
  const module = { exports: {} };
  vm.runInNewContext(old ? execFileSync('git', ['show', `${baseline}:index.js`], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(path.join(root, 'index.js'), 'utf8'), { module });
  return module.exports;
}
const fixture = () => ({ service: { getServiceName: () => 'service', provider: { stage: 'dev' }, functions: { app: {} }, custom: {} }, cli: { log() {} } });
const json = value => JSON.parse(JSON.stringify(value));
test('constructor, hooks, empty-environment defaults and historical layer pins match baseline', () => {
  const old = fixture(); const current = fixture();
  const a = new (load(true))(old); const b = new (load(false))(current);
  assert.deepEqual(Object.keys(a.hooks), Object.keys(b.hooks));
  a.hooks['before:package:initialize'](); b.hooks['before:package:initialize']();
  assert.deepEqual(json(current.service.functions), json(old.service.functions));
});
test('provider/function environment and pinned layers survive repeated configuration', () => {
  const service = fixture();
  service.service.provider.environment = { NODE_OPTIONS: '--max-old-space-size=777', OTEL_SERVICE_NAME: 'provider' };
  service.service.functions.app = { environment: { API_TOKEN: 'synthetic-user-value', AWS_LAMBDA_EXEC_WRAPPER: '/opt/owned' }, layers: ['pinned'] };
  service.service.custom.otelLayerPlugin = { layers: ['pinned', 'reviewed'] };
  const plugin = new (load(false))(service); plugin.applyOtelLayer(); plugin.applyOtelLayer();
  assert.equal(service.service.functions.app.environment.NODE_OPTIONS, undefined);
  assert.equal(service.service.provider.environment.NODE_OPTIONS, '--max-old-space-size=777');
  assert.equal(service.service.functions.app.environment.API_TOKEN, 'synthetic-user-value');
  assert.equal(service.service.functions.app.environment.AWS_LAMBDA_EXEC_WRAPPER, '/opt/owned');
  assert.deepEqual(json(service.service.functions.app.layers), ['pinned', 'reviewed']);
});
