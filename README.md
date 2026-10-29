# otel-serverless-plugin (Legacy Alias)

This is the historical `leozw/otel-serverless-plugin`, package `otel-serverless-plugin@1.0.7`. It is **not** the current [elven-observability/elven-serverless-plugin](https://github.com/elven-observability/elven-serverless-plugin). This candidate changes no package version, publishes nothing and sets `private: true` to block accidental publication from the wrong repository. A registry deprecation has not been performed.

## Safe Compatibility Adapter

The existing `before:package:initialize` hook and `custom.otelLayerPlugin` configuration entrypoint remain. The plugin emits a migration notice and requires explicit validated `layers`. Historical hard-coded public ARNs, credentials, placeholder endpoints and runtime hooks are no longer silently injected.

```yaml
plugins:
  - otel-serverless-plugin

custom:
  otelLayerPlugin:
    layers:
      - ${param:reviewedNodeLayerArn}
    execWrapper: /opt/bootstrap
    endpoint: ${param:otelEndpoint}
```

`execWrapper` is optional and must match the supplied layer; this plugin does not infer compatible layer paths. Function/provider environment values always win, including `NODE_OPTIONS`, sampler, exporter endpoint, resource attributes, credentials and `AWS_LAMBDA_EXEC_WRAPPER`. Existing provider/function layers are retained and additions are idempotent. No preload is added to `NODE_OPTIONS`. Legacy explicit `tenant`, `token`, `loki_url`, `endpoint` values remain supported only as defaults when the corresponding environment key is absent. Use deployment-time secret resolution rather than plaintext credentials.

Only resolved Node.js zip functions on the AWS provider are modified. Containers, non-Node/custom/unresolved runtimes, unresolved environment/layer shapes, `otel: false` functions and `enabled: false` plugin configuration are left unchanged. This is conservative filtering, **not** proof of layer region/runtime/architecture compatibility. Operators must validate ARNs and the AWS five-layer/size limits before packaging. The adapter does not invoke AWS.

## Migration And Checks

Migrate new applications to the canonical plugin after reviewing its runtime/layer contract. Do not install both plugins together. Removing this legacy alias or publishing its deprecation is a separate release-owner action; this candidate does neither.

```sh
npm ci --ignore-scripts
npm test
```

Tests use Serverless-shaped fixtures, not a deployed service. Real Serverless package output, CloudFormation inheritance, Linux/AWS runtimes and layer acceptance remain release gates. No `serverless deploy` is part of validation.

- [Elven Git documentation](https://github.com/elvenworks-ps/docs.elven.works)
- [AWS runtime wrappers](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html)
- [AWS Node.js handlers](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)
- [Canonical plugin repository](https://github.com/elven-observability/elven-serverless-plugin)
