// Cross-build a portable SEA using a checksum-verified official Node binary.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const execute = promisify(execFile);
const ROOT = path.resolve(__dirname, '..');
const VERSION = require('node:fs').readFileSync(path.join(ROOT, '.node-version'), 'utf8').trim();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => {if (!ok) throw Error(message);};

function stripCertificate(bytes) {
  check(bytes.toString('ascii', 0, 2) === 'MZ', 'Expected a Windows PE executable');
  const pe = bytes.readUInt32LE(0x3c);
  check(bytes.readUInt32LE(pe) === 0x4550 && bytes.readUInt16LE(pe + 24) === 0x20b, 'Expected a PE32+ executable');
  const security = pe + 24 + 112 + 4 * 8;
  const at = bytes.readUInt32LE(security), size = bytes.readUInt32LE(security + 4);
  bytes.fill(0, security, security + 8);
  return at && at + size === bytes.length ? bytes.subarray(0, at) : bytes;
}

async function download(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(180000)});
  check(response.ok, 'Download failed: ' + response.status + ' ' + url);
  return Buffer.from(await response.arrayBuffer());
}

async function main(args = process.argv.slice(2)) {
  const target = args.length === 2 && args[0] === '--target' ? args[1] : null;
  check(['win-x64', 'linux-x64'].includes(target), 'Usage: node desktop/build.cjs --target win-x64|linux-x64');
  check(process.versions.node === VERSION, 'Use Node ' + VERSION + ' to generate a matching SEA preparation blob');
  const build = path.join(ROOT, '.build', target), dist = path.join(ROOT, 'dist');
  await fs.mkdir(build, {recursive: true}); await fs.mkdir(dist, {recursive: true});
  let runtime;
  if (target === 'win-x64') {
    const file = path.join(build, 'node.exe');
    console.log('Downloading/verifying official Node ' + VERSION + ' for Windows x64…');
    const sums = (await download('https://nodejs.org/dist/v' + VERSION + '/SHASUMS256.txt')).toString();
    const row = sums.split('\n').find(line => line.endsWith('  win-x64/node.exe'));
    check(row, 'Official Windows runtime checksum is missing');
    runtime = await fs.readFile(file).catch(() => null);
    if (!runtime || hash(runtime) !== row.slice(0, 64)) {
      runtime = await download('https://nodejs.org/dist/v' + VERSION + '/win-x64/node.exe');
      check(hash(runtime) === row.slice(0, 64), 'Downloaded Node runtime checksum differs');
      await fs.writeFile(file, runtime);
    }
  } else {
    check(process.platform === 'linux' && process.arch === 'x64', 'Linux smoke build needs Linux x64');
    runtime = await fs.readFile(process.execPath);
  }
  const license = await download('https://raw.githubusercontent.com/nodejs/node/v' + VERSION + '/LICENSE');
  const files = [];
  for (const name of ['run.cjs', 'dump-firmware.cjs', 'pack-game.cjs', 'bootstrap.bas', 'README.md', 'package.json'])
    files.push([name, (await fs.readFile(path.join(ROOT, name))).toString('base64')]);
  async function walk(folder) {
    for (const entry of await fs.readdir(path.join(ROOT, folder), {withFileTypes: true})) {
      const name = folder + '/' + entry.name;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile() && !entry.name.endsWith('.test.cjs') && !['build.cjs', 'launcher.cjs'].includes(entry.name))
        files.push([name, (await fs.readFile(path.join(ROOT, name))).toString('base64')]);
    }
  }
  await walk('engine'); await walk('desktop');
  files.push(['NODE-LICENSE.txt', license.toString('base64')]);
  const compress = bytes => zlib.brotliCompressSync(bytes, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 5}});
  const application = compress(Buffer.from(JSON.stringify(files)));
  await fs.writeFile(path.join(build, 'application.br'), application);
  await fs.writeFile(path.join(build, 'runtime.br'), compress(runtime));
  const manifest = {version: require('../package.json').version, nodeVersion: VERSION,
    target, digest: hash(application), runtimeSha256: hash(runtime)};
  await fs.writeFile(path.join(build, 'manifest.json'), JSON.stringify(manifest));
  const blob = path.join(build, 'sea.blob');
  const config = {main: path.join(__dirname, 'launcher.cjs'), output: blob,
    disableExperimentalSEAWarning: true, useSnapshot: false, useCodeCache: false,
    assets: {manifest: path.join(build, 'manifest.json'), application: path.join(build, 'application.br'),
      runtime: path.join(build, 'runtime.br')}};
  const configFile = path.join(build, 'sea-config.json');
  await fs.writeFile(configFile, JSON.stringify(config));
  console.log('Building embedded application…');
  await execute(process.execPath, ['--experimental-sea-config', configFile], {maxBuffer: 4 * 1024 * 1024});
  const executable = path.join(dist, target === 'win-x64' ? 'NS2-Desktop.exe' : 'NS2-Desktop-linux');
  await fs.writeFile(executable, target === 'win-x64' ? stripCertificate(Buffer.from(runtime)) : runtime, {mode: 0o755});
  console.log('Injecting SEA into ' + executable + '…');
  await require('postject').inject(executable, 'NODE_SEA_BLOB', await fs.readFile(blob),
    {sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'});
  await fs.writeFile(executable + '.sha256', hash(await fs.readFile(executable)) + '  ' + path.basename(executable) + '\n');
  await fs.writeFile(path.join(dist, 'NODE-LICENSE.txt'), license);
  console.log(JSON.stringify({file: executable, bytes: (await fs.stat(executable)).size, ...manifest}, null, 2));
  return executable;
}

module.exports = {stripCertificate};
if (require.main === module) main().catch(error => {console.error(error.stack); process.exitCode = 1;});
