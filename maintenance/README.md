# Historical Alias Maintenance Review

Same public identity otel-serverless-plugin, review RC1.0.8-rc.20261029.1. Constructor, Serverless hook, custom.otelLayerPlugin options and default historical layer strings are preserved. Explicit function/provider environment wins; application NODE_OPTIONS is not overwritten, pinned layers are deduplicated and repeated configuration is idempotent.

This is not the canonical elven-serverless-plugin package. No canonical name, ARN or source is changed. Historical default layers remain a compatibility debt and are not newly endorsed or proven safe. Framework fixtures are not a full Serverless/AWS deployment acceptance. No publication/deploy; parent owns credentials/release decision.

- [Elven Git docs](https://github.com/elvenworks-ps/docs.elven.works)
- [AWS Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html)
