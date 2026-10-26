// Embedded SEA entrypoint. Extract a private runtime so subprocesses keep their
// ordinary Node CLI semantics; the application never needs a system Node install.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const sea = require('node:sea');
const {spawn} = require('node:child_process');

async function main() {
  const manifest = JSON.parse(sea.getAsset('manifest', 'utf8'));
  const base = process.env.NS2_DESKTOP_HOME || (process.platform === 'win32' ?
    path.join(process.env.LOCALAPPDATA || os.homedir(), 'NS2 Desktop') : path.join(os.homedir(), '.ns2-desktop'));
  const app = path.join(base, 'app-' + manifest.target + '-' + manifest.digest.slice(0, 16));
  const marker = path.join(app, '.ready');
  const runtimeName = process.platform === 'win32' ? 'node.exe' : 'node';
  const runtime = path.join(app, 'runtime', runtimeName);
  const identity = manifest.digest + ':' + manifest.runtimeSha256;
  let ready = await fs.readFile(marker, 'utf8').catch(() => '');
  if (ready !== identity) {
    console.log('NS2 Desktop — Preparing application / Preparando aplicación…');
    await fs.mkdir(base, {recursive: true, mode: 0o700});
    const temporary = await fs.mkdtemp(path.join(base, '.extract-'));
    try {
      const packed = Buffer.from(sea.getAsset('application'));
      if (crypto.createHash('sha256').update(packed).digest('hex') !== manifest.digest)
        throw Error('Application package checksum differs / El paquete está dañado');
      const files = JSON.parse(zlib.brotliDecompressSync(packed));
      for (const [name, base64] of files) {
        if (name.startsWith('/') || name.includes('\\') || name.split('/').some(part => part === '..' || part === ''))
          throw Error('Invalid embedded path');
        const file = path.join(temporary, ...name.split('/'));
        await fs.mkdir(path.dirname(file), {recursive: true, mode: 0o700});
        await fs.writeFile(file, Buffer.from(base64, 'base64'), {mode: ['desktop/native/mac2jb-send', 'desktop/native/ns2-commands'].includes(name) ? 0o700 : 0o600});
      }
      const runtimeBytes = zlib.brotliDecompressSync(Buffer.from(sea.getAsset('runtime')));
      if (crypto.createHash('sha256').update(runtimeBytes).digest('hex') !== manifest.runtimeSha256)
        throw Error('Runtime checksum differs / El entorno está dañado');
      await fs.mkdir(path.join(temporary, 'runtime'), {mode: 0o700});
      await fs.writeFile(path.join(temporary, 'runtime', runtimeName), runtimeBytes, {mode: 0o700});
      await fs.writeFile(path.join(temporary, '.ready'), identity, {mode: 0o600});
      try {await fs.rename(temporary, app);}
      catch (error) {
        ready = await fs.readFile(marker, 'utf8').catch(() => '');
        if (ready !== identity) throw error;
      }
    } finally {await fs.rm(temporary, {recursive: true, force: true});}
  }
  if (process.argv.includes('--self-test')) {
    const child = spawn(runtime, ['--version'], {stdio: 'inherit', windowsHide: true});
    child.once('error', error => {console.error(error.message); process.exitCode = 1;});
    child.once('close', code => {process.exitCode = code ?? 1;});
    return;
  }
  const child = spawn(runtime, [path.join(app, 'desktop/server.cjs'),
    ...(process.argv.includes('--no-browser') ? ['--no-browser'] : [])],
    {cwd: app, stdio: 'inherit', windowsHide: true, env: {...process.env,
      NS2_DATA_ROOT: path.join(base, 'data'), NS2_BUILD_ID: manifest.digest}});
  child.once('error', error => {console.error(error.message); process.exitCode = 1;});
  child.once('close', code => {process.exitCode = code ?? 1;});
}

main().catch(async error => {
  console.error('NS2 Desktop: ' + error.message);
  if (process.stdin.isTTY) {
    console.error('Press Enter to close / Presioná Enter para cerrar');
    process.stdin.resume(); process.stdin.once('data', () => process.exit(1));
  } else process.exitCode = 1;
});
