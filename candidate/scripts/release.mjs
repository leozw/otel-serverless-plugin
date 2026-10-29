import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'release.json')));
const pkgDir = path.resolve(root, config.packageDir);
const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json')));
const [major, minor] = process.versions.node.split('.').map(Number);
if (!((major === 22 && minor >= 15) || major === 24)) throw new Error('Candidate release requires maintained Node22.15+ or Node24');
if (!pkg.private || pkg.name !== config.identity || pkg.version !== config.version || config.publishAllowed !== false || config.dropIn !== false) throw new Error('Private candidate identity/release guard failed');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
if (git(['status', '--porcelain'])) throw new Error('Release candidate requires clean tracked/untracked source');
const sourceCommit = git(['rev-parse', 'HEAD']);
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const execute = (args, log) => {
  const output = execFileSync('npm', args, { cwd: pkgDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  if (log) fs.writeFileSync(path.join(dist, log), output);
  return output;
};
execute(['test'], 'tests.log');
if (config.buildScript) execute(['run', config.buildScript], 'build.log');
if (git(['status', '--porcelain'])) throw new Error('Build modified source; commit reviewed generated source before release');
const packed = JSON.parse(execute(['pack', '--ignore-scripts', '--json', '--pack-destination', dist]));
const artifacts = [];
function describe(file, kind) {
  const b = fs.readFileSync(file);
  artifacts.push({ file: path.basename(file), kind, bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') });
}
describe(path.join(dist, packed[0].filename), 'npm-private-tarball');
if (config.layerZip) {
  const target = path.join(dist, config.identity.split('/').pop() + '-' + config.version + '-' + process.platform + '-' + process.arch + '.zip');
  fs.copyFileSync(path.join(root, config.layerZip), target);
  describe(target, 'lambda-layer-candidate');
}
const lock = fs.readFileSync(path.join(pkgDir, 'package-lock.json'));
const receipt = { format: 1, identity: config.identity, version: config.version, sourceCommit, sourceClean: true, platform: process.platform, architecture: process.arch, node: process.version, lockSha256: crypto.createHash('sha256').update(lock).digest('hex'), runtimeTargets: config.runtimeTargets, dropIn: false, legacyPaths: 'IMMUTABLE_NOT_FIXED', publishAllowed: false, awsDeployment: false, signing: 'NOT_ESTABLISHED', artifacts, limitations: config.knownIncompatibilities };
fs.writeFileSync(path.join(dist, 'release-candidate.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
