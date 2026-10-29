# Isolated Release Candidate: NOT Drop-In

This document describes the isolated private base PR, not the current public-source maintenance work in maintenance/README.md. At that private checkpoint all historical paths were unchanged. This maintenance branch intentionally fixes the existing otel-serverless-plugin API under its own identity; it does not substitute the private adapter or modify canonical elven-serverless-plugin. No old ARN is repointed or endorsed. Existing users receive no change until a reviewed release.

Hardened code exists only under `candidate/`. Its private identity is `@elven-observability/serverless-config-adapter-candidate@0.0.0-rc.20261029.1`. This is a local artifact identity, not a published npm name or a stable major-version decision. Parent decides a new public identity/version, migration and release after review. No merge/publish/deploy is authorized.

## Known Incompatibilities

- Historical automatic layer ARNs, default endpoint/tenant/token, always-on sampler and NODE_OPTIONS/preload/exec-wrapper defaults are not reproduced.
- Explicit validated layers/execWrapper and runtime selection are required. Unsupported/unresolved runtimes and opt-outs are skipped; five-layer count is enforced.
- This private configuration adapter is not the old otel-serverless-plugin package and not the parent-owned canonical elven-serverless-plugin. No old alias registry deprecation, replacement or pin update is performed.

These losses are not excused by preserved result/error identity or zero scanner findings. Existing paths are immutable instead of silently replacing their behavior. Candidates target maintained Node 22.15+ / 24 only; Node14/16/18/20 support is not guaranteed for this new artifact. Node14 is explicitly EOL, not a required candidate qualification target. Original API paths were not edited to implement that retirement.

## Functional Candidate Artifacts

```sh
cd candidate
npm ci --ignore-scripts
npm test
npm run release-candidate
```

Release candidate generation requires a clean checkout and supported Node runtime. It runs tests/build, writes a private npm tarball, and emits `candidate/dist/release-candidate.json` with source commit, graph/lock and artifact digests. This mechanism cannot publish, merge, create tags or call AWS. Consumers must inspect the receipt and migrate explicitly. The container qualification harness in the parent evidence verifies actual package installation/export and staged layer behavior. Container/RIE evidence is not live AWS acceptance or proof for old published artifacts.

For ESM/Winston-dependent existing consumers, stay on the immutable old path until an explicitly approved compatible implementation or migration is independently accepted. Do not advertise all users as fixed.

- [Elven Git documentation](https://github.com/elvenworks-ps/docs.elven.works)
- [AWS runtime wrappers](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html)
- [AWS Node.js handler contract](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)
