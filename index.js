class OtelLayerPlugin {
  constructor(serverless) {
    this.serverless = serverless;
    this.hooks = {
      "before:package:initialize": this.applyOtelLayer.bind(this),
    };
  }

  applyOtelLayer() {
    const serviceName = this.serverless.service.getServiceName();
    const stage = this.serverless.service.provider.stage || "dev";
    const functions = this.serverless.service.functions;

    const pluginConfig = this.serverless.service.custom?.otelLayerPlugin || {};
    const tenant = pluginConfig.tenant || "default-tenant";
    const token = pluginConfig.token || "";
    const endpoint = pluginConfig.endpoint || "http://otel-endpoint:4318/";
    const region = pluginConfig.region || "us-east-1";
    const loki_url = pluginConfig.loki_url || "https://loki.elvenobservability.com/loki/api/v1/push";

    const otelLayers = pluginConfig.layers || [
      `arn:aws:lambda:${region}:184161586896:layer:opentelemetry-nodejs-0_12_0:1`,
      `arn:aws:lambda:${region}:204595508824:layer:collector-logs-js:159`,
    ];

    Object.keys(functions).forEach((func) => {
      const functionName = `${serviceName}_${stage}_${func}`;

      const environmentVariables = {
        AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
        OTEL_SERVICE_NAME: functionName,
        OTEL_TRACES_SAMPLER: "always_on",
        OTEL_LAMBDA_TRACE_MODE: "capture",
        OTEL_PROPAGATORS: "tracecontext,baggage,xray",
        OTEL_RESOURCE_ATTRIBUTES: `service.name=${functionName},environment=${stage}`,
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
        TENANT_ID: tenant,
        SERVICE_NAME: functionName,
        RESOURCES_ATTRIBUTES: `service=${functionName},environment=${stage}`,
        NODE_OPTIONS: "--require /opt/nodejs/index.js",
        API_TOKEN: token,
        LOKI_URL: loki_url
      };

      if (!functions[func].layers) {
        functions[func].layers = [];
      }
      functions[func].layers.push(...otelLayers);

      if (!functions[func].environment) {
        functions[func].environment = {};
      }
      Object.assign(functions[func].environment, environmentVariables);

      this.serverless.cli.log(`Configuring function: ${functionName}`);
    });
  }
}

module.exports = OtelLayerPlugin;
