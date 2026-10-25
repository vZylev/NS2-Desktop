const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {EventEmitter, once} = require('node:events');
const {PassThrough} = require('node:stream');
const {buildArgs, createApp} = require('./server.cjs');
const {I18N} = require('./app.js');
const {endpointPath} = require('../engine/shared/local-endpoint.cjs');

test('both UI languages cover every text key and the first visit defaults to English', async () => {
  assert.deepEqual(Object.keys(I18N.en).sort(), Object.keys(I18N.es).sort());
  const html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
  assert.match(html, /<html lang="en">/); assert.match(html, /<strong>vZyle<\/strong>/);
  for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g))
    for (const language of ['en', 'es']) assert.ok(I18N[language][key], language + ': ' + key);
});

test('UI options produce bounded runner arguments without invoking a shell', () => {
  assert.deepEqual(buildArgs({mode: 'demo', host: '192.168.1.10'}), ['192.168.1.10']);
  assert.deepEqual(buildArgs({mode: 'dump', host: '192.168.1.10', title: '010000000000000a', storage: 5, version: '12'}),
    ['--dump-game', '010000000000000a', '--storage', '5', '--version', '12', '192.168.1.10']);
  for (const input of [{mode: 'shell', host: '127.0.0.1'}, {mode: 'demo', host: '1.2.3.4;echo'},
    {mode: 'dump', host: '127.0.0.1', title: '../file'},
    {mode: 'inventory', host: '127.0.0.1', storage: 3}]) assert.throws(() => buildArgs(input));
});

test('UI pairing choice reaches the runner and rejects unknown modes', () => {
  assert.deepEqual(buildArgs({mode: 'demo', host: '192.168.1.117', pairing: 'single'}),
    ['--single-console', '192.168.1.117']);
  assert.deepEqual(buildArgs({mode: 'demo', host: '192.168.1.117', pairing: 'session'}),
    ['192.168.1.117']);
  assert.deepEqual(buildArgs({mode: 'dump', title: '010000000000000a', storage: 4,
    host: '192.168.1.117', pairing: 'single'}),
    ['--dump-game', '010000000000000a', '--storage', '4', '--single-console', '192.168.1.117']);
  assert.throws(() => buildArgs({mode: 'demo', host: '127.0.0.1', pairing: 'auto'}), /invalidPairing/);
});

test('local UI authenticates mutations, serializes runs, and preserves the START command', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-ui-test-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  let spawned;
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  const app = await createApp({port: 0, dataRoot: directory, runner(...args) {spawned = args; return child;}});
  t.after(() => {child.stdout.end(); child.stderr.end(); app.server.closeAllConnections(); app.server.close();});
  const base = new URL(app.url).origin;
  const headers = {authorization: 'Bearer ' + app.token, 'Content-Type': 'application/json'};
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/api/state')).status, 401);
  assert.equal((await fetch(base + '/api/start', {method: 'POST', headers: {...headers, origin: 'https://other.example'}, body: '{}'})).status, 403);
  assert.equal((await fetch(base + '/api/start', {method: 'POST', headers, body: JSON.stringify({mode: 'demo', host: '127.0.0.1', pairing: 'single'})})).status, 200);
  assert.equal(spawned[0], process.execPath); assert.equal(spawned[2].windowsHide, true);
  assert.deepEqual(spawned[1].slice(1), ['--single-console', '127.0.0.1']);
  assert.equal(spawned[2].env.NS2_DATA_ROOT, directory);
  assert.equal((await fetch(base + '/api/start', {method: 'POST', headers, body: '{}'})).status, 400);
  assert.equal((await fetch(base + '/api/quit', {method: 'POST', headers, body: '{}'})).status, 409);
  child.stdout.write('  V=START(39380,127,0,0,1,0,0,0,0)\nRun folder: C:\\NS2\\runs\\example\n1/4 Checking the console\n');
  await new Promise(setImmediate);
  const state = await (await fetch(base + '/api/state', {headers})).json();
  assert.equal(state.command, 'V=START(39380,127,0,0,1,0,0,0,0)');
  assert.equal(state.runFolder, 'C:\\NS2\\runs\\example'); assert.equal(state.status, 'running');
  child.emit('close', 0);
  assert.equal((await (await fetch(base + '/api/state', {headers})).json()).status, 'complete');
});

test('local endpoints use a random Windows named pipe and a working Unix socket', async t => {
  const first = endpointPath('C:\\Temp\\long directory', 'win32');
  assert.match(first, /^\\\\\.\\pipe\\ns2-[0-9a-f]{32}$/);
  assert.notEqual(first, endpointPath('C:\\Temp', 'win32'));
  if (process.platform === 'win32') return;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-endpoint-test-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const server = net.createServer(socket => socket.end('ok'));
  const endpoint = endpointPath(directory); server.listen(endpoint); await once(server, 'listening');
  t.after(() => server.close());
  const socket = net.createConnection(endpoint); socket.setEncoding('utf8');
  const [reply] = await once(socket, 'data'); assert.equal(reply, 'ok'); socket.destroy();
});
