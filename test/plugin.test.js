'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Plugin = require('../index');
const fixture = () => ({ service: { getServiceName: () => 'service', provider: { name: 'aws', runtime: 'nodejs18.x', stage: 'prod', environment: { NODE_OPTIONS: '--max-old-space-size=300', API_TOKEN: 'existing', OTEL_SERVICE_NAME: 'provider-name' }, layers: ['provider-layer'] }, functions: { api: { layers: ['own-layer'], environment: { CUSTOM: 'keep', AWS_LAMBDA_EXEC_WRAPPER: '/opt/application' } } }, custom: { otelLayerPlugin: { layers: ['configured-layer', 'own-layer'], token: 'replacement', execWrapper: '/opt/bootstrap' } } }, cli: { log() {} } });

test('preserves provider/function environment, heap and wrapper policies; deduplicates idempotently', () => {
  const serverless = fixture();
  const plugin = new Plugin(serverless);
  plugin.applyOtelLayer();
  const once = JSON.stringify(serverless.service.functions);
  plugin.applyOtelLayer();
  assert.equal(JSON.stringify(serverless.service.functions), once);
  const fn = serverless.service.functions.api;
  assert.deepEqual(fn.layers, ['provider-layer', 'own-layer', 'configured-layer']);
  assert.equal(fn.environment.CUSTOM, 'keep');
  assert.equal(fn.environment.AWS_LAMBDA_EXEC_WRAPPER, '/opt/application');
  assert.equal(fn.environment.NODE_OPTIONS, undefined);
  assert.equal(fn.environment.API_TOKEN, undefined);
  assert.equal(fn.environment.OTEL_SERVICE_NAME, undefined);
  assert.equal(serverless.service.provider.environment.NODE_OPTIONS, '--max-old-space-size=300');
});

test('no historical public ARNs or default credentials/endpoints are injected', () => {
  const s = fixture();
  delete s.service.custom.otelLayerPlugin.layers;
  const before = JSON.stringify(s.service.functions);
  new Plugin(s).applyOtelLayer();
  assert.equal(JSON.stringify(s.service.functions), before);
});

test('non-Node, unresolved, custom runtime, container, opt-out, and unsupported env shapes unchanged', () => {
  for (const extra of [{ runtime: 'python3.12' }, { runtime: 'provided.al2023' }, { runtime: '${param:runtime}' }, { image: 'container' }, { otel: false }, { environment: { Ref: 'Environment' } }, { layers: { Ref: 'Layers' } }]) {
    const s = fixture();
    Object.assign(s.service.functions.api, extra);
    const before = JSON.stringify(s.service.functions);
    new Plugin(s).applyOtelLayer();
    assert.equal(JSON.stringify(s.service.functions), before);
  }
});

test('legacy package name and version stay distinct from canonical package', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.name, 'otel-serverless-plugin');
  assert.equal(pkg.version, '1.0.7');
  assert.equal(pkg.private, true);
});

test('functions exceeding the AWS five-layer limit are left unchanged', () => {
  const s = fixture();
  s.service.custom.otelLayerPlugin.layers = ['a', 'b', 'c', 'd'];
  const before = JSON.stringify(s.service.functions);
  new Plugin(s).applyOtelLayer();
  assert.equal(JSON.stringify(s.service.functions), before);
});

test('explicit per-function sampler, exporter, credentials and NODE_OPTIONS are never overwritten', () => {
  const s = fixture();
  const existing = { NODE_OPTIONS: '--enable-source-maps --max-old-space-size=999', OTEL_TRACES_SAMPLER: 'always_off', OTEL_EXPORTER_OTLP_ENDPOINT: 'https://application.example', OTEL_RESOURCE_ATTRIBUTES: 'custom=keep', API_TOKEN: 'application-token' };
  Object.assign(s.service.functions.api.environment, existing);
  new Plugin(s).applyOtelLayer();
  for (const [key, value] of Object.entries(existing)) assert.equal(s.service.functions.api.environment[key], value);
});

test('global opt-out and non-AWS providers do not mutate functions', () => {
  for (const change of [s => { s.service.custom.otelLayerPlugin.enabled = false; }, s => { s.service.provider.name = 'other'; }]) {
    const s = fixture(); change(s);
    const before = JSON.stringify(s.service.functions);
    new Plugin(s).applyOtelLayer();
    assert.equal(JSON.stringify(s.service.functions), before);
  }
});
