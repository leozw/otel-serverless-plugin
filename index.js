class OtelLayerPlugin {
  constructor(serverless) {
    this.serverless = serverless;
    this.hooks = {
      "before:package:initialize": this.applyOtelLayer.bind(this),
    };
  }

  applyOtelLayer() {
    const service = this.serverless.service;
    const provider = service.provider || {};
    const config = service.custom?.otelLayerPlugin || {};
    const log = message => this.serverless.cli?.log?.(message);
    log('otel-serverless-plugin is a legacy alias. Migrate to elven-serverless-plugin after reviewing its configuration.');
    if (config.enabled === false || provider.name !== 'aws') return;
    // Historical public ARNs are not a runtime/region/architecture compatibility contract.
    if (!Array.isArray(config.layers) || !config.layers.length || !config.layers.every(layer => typeof layer === 'string' && layer.length > 0)) {
      log('Legacy instrumentation unchanged: explicit, validated otelLayerPlugin.layers required.');
      return;
    }
    const isMap = value => value && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).some(key => key === 'Ref' || key.startsWith('Fn::'));
    if (provider.environment !== undefined && !isMap(provider.environment)) return;
    if (provider.layers !== undefined && !Array.isArray(provider.layers)) return;
    const serviceName = service.getServiceName();
    const stage = provider.stage || 'dev';
    for (const [name, fn] of Object.entries(service.functions || {})) {
      const runtime = fn.runtime || provider.runtime;
      if (fn.otel === false || fn.image || typeof runtime !== 'string' || !/^nodejs\d+\.x$/.test(runtime)) continue;
      if (fn.environment !== undefined && !isMap(fn.environment)) continue;
      if (fn.layers !== undefined && !Array.isArray(fn.layers)) continue;
      const functionName = `${serviceName}_${stage}_${name}`;
      const defaults = {
        OTEL_SERVICE_NAME: functionName,
        OTEL_RESOURCE_ATTRIBUTES: `service.name=${functionName},deployment.environment.name=${stage}`,
      };
      const mappings = { endpoint: 'OTEL_EXPORTER_OTLP_ENDPOINT', tenant: 'TENANT_ID', token: 'API_TOKEN', loki_url: 'LOKI_URL', execWrapper: 'AWS_LAMBDA_EXEC_WRAPPER' };
      for (const [key, env] of Object.entries(mappings)) if (config[key] !== undefined) defaults[env] = config[key];
      const environment = { ...(fn.environment || {}) };
      const inherited = provider.environment || {};
      for (const [key, value] of Object.entries(defaults)) if (!Object.prototype.hasOwnProperty.call(environment, key) && !Object.prototype.hasOwnProperty.call(inherited, key)) environment[key] = value;
      // Serverless function-level layers replace provider layers, so retain both explicitly.
      const layers = [...(provider.layers || []), ...(fn.layers || []), ...config.layers];
      const seen = new Set();
      const merged = layers.filter(layer => { const key = JSON.stringify(layer); if (seen.has(key)) return false; seen.add(key); return true; });
      if (merged.length > 5) { log(`Legacy instrumentation unchanged for ${name}: AWS five-layer limit exceeded.`); continue; }
      fn.layers = merged;
      fn.environment = environment;
      log(`Configured legacy instrumentation for ${name}; layer compatibility remains operator-owned.`);
    }
  }
}

module.exports = OtelLayerPlugin;
