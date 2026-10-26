// Exercise the packaged runtime and authenticated UI on each native CI runner.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {spawn, execFile} = require('node:child_process');
const {promisify} = require('node:util');
const assert = require('node:assert/strict');
async function main() {
  const executable = path.resolve(process.argv[2]);
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-smoke-'));
  const env = {...process.env, NS2_DESKTOP_HOME: home};
  let child;
  try {
    const {stdout} = await promisify(execFile)(executable, ['--self-test'], {env, timeout: 120000});
    assert.ok(stdout.includes('v' + (await fs.readFile(path.join(__dirname, '../.node-version'), 'utf8')).trim()));
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      const folder = (await fs.readdir(home)).find(name => name.startsWith('app-darwin-arm64-'));
      assert.ok(folder);
      const app = path.join(home, folder);
      const result = await promisify(execFile)(path.join(app, 'desktop/native/mac2jb-send'), [path.join(app, 'bootstrap.bas'), '--dry-run'], {timeout: 15000});
      assert.match(result.stdout, /no USB device created and no keys sent/);
    }
    child = spawn(executable, ['--no-browser'], {env, stdio: ['ignore', 'pipe', 'pipe']});
    let output = '', stderr = '', failure;
    child.stdout.on('data', chunk => {output += chunk;});
    child.stderr.on('data', chunk => {stderr += chunk;});
    child.on('error', error => {failure = error;});
    const exited = new Promise(resolve => child.once('close', resolve));
    let match;
    for (let i = 0; i < 600 && !match; i++) {
      if (failure) throw failure;
      if (child.exitCode !== null) throw Error('Launcher stopped: ' + stderr);
      match = /NS2 Desktop: (http:\/\/127\.0\.0\.1:[^\s]+)/.exec(output);
      if (!match) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(match, 'Packaged UI did not start: ' + stderr);
    const url = new URL(match[1]);
    const headers = {authorization: 'Bearer ' + url.hash.slice(1), connection: 'close'};
    const stateResponse = await fetch(url.origin + '/api/state', {headers, signal: AbortSignal.timeout(10000)});
    assert.equal(stateResponse.status, 200);
    const state = await stateResponse.json();
    assert.equal(state.appVersion, require('../package.json').version);
    assert.equal((await fetch(url.origin + '/', {signal: AbortSignal.timeout(10000)})).status, 200);
    assert.equal((await fetch(url.origin + '/api/quit', {method: 'POST', headers, signal: AbortSignal.timeout(10000)})).status, 200);
    let timer;
    try {
      assert.equal(await Promise.race([exited, new Promise((_, reject) => {timer = setTimeout(() => reject(Error('Packaged UI did not exit')), 15000);})]), 0);
    } finally {clearTimeout(timer);}
    console.log('Packaged runtime and UI smoke test passed: ' + path.basename(executable));
  } finally {
    if (child && child.exitCode === null) child.kill();
    await fs.rm(home, {recursive: true, force: true, maxRetries: 5, retryDelay: 250});
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
