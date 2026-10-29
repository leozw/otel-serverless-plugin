import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = fs.existsSync(path.join(root, 'nodejs/package.json')) ? path.join(root, 'nodejs') : root;
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(command + ' ' + args.join(' ') + ': ' + result.stdout + result.stderr);
  return result.stdout;
}
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (run('git', ['status', '--porcelain']).trim()) throw new Error('Maintenance artifact requires clean committed source');
const sourceCommit = run('git', ['rev-parse', 'HEAD']).trim();
const pkg = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json')));
if (!pkg.version.includes('-rc.')) throw new Error('Only review RC artifacts are allowed by this builder');
const output = path.join(root, 'maintenance/artifacts'); fs.mkdirSync(output, { recursive: true });
const graph = JSON.parse(run('npm', ['ls', '--all', '--json'], packageDir));
fs.writeFileSync(path.join(output, 'graph.json'), JSON.stringify(graph, null, 2) + '\n');
for (const args of [['audit', '--json'], ['audit', '--omit=dev', '--json']]) {
  const audit = JSON.parse(run('npm', args, packageDir));
  if (audit.metadata.vulnerabilities.total) throw new Error('Declared graph advisories block maintenance artifact');
  fs.writeFileSync(path.join(output, args.includes('--omit=dev') ? 'audit-prod.json' : 'audit-all.json'), JSON.stringify(audit, null, 2) + '\n');
}
fs.writeFileSync(path.join(output, 'tests.log'), run('npm', ['test'], packageDir));
const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', output], packageDir))[0];
const artifact = path.join(output, packed.filename);
const receipt = { sourceCommit, identity: pkg.name, version: pkg.version, node: process.version, platform: process.platform, arch: process.arch, lockSha256: sha256(path.join(packageDir, 'package-lock.json')), artifact: { file: packed.filename, bytes: fs.statSync(artifact).size, sha256: sha256(artifact) }, publishAllowed: false, compatibility: 'Baseline fixtures and scoped package consumer only; complete integration acceptance remains required', historicalBinariesQualified: false, awsMutations: 0 };
fs.writeFileSync(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
