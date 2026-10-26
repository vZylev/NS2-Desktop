const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
const {createAutotyper, senderEnvironment} = require('./autotyper.cjs');
const {createApp} = require('./server.cjs');
const tick = () => new Promise(setImmediate);
const root = path.resolve(__dirname, '..');
function fixture(t, overrides = {}) {
  const child = new EventEmitter(); child.pid = 12345;
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  const calls = [], signals = [], confirmations = [];
  child.stdin.on('data', bytes => confirmations.push(bytes.toString()));
  const typer = createAutotyper({root, platform: 'darwin', arch: 'arm64',
    helperAvailable: async () => true, probeDriver: async () => true, diagnose: async () => ({os: 'fixture', sip: 'unknown', controllers: []}),
    runner: (...args) => {calls.push(args); return child;}, signal: (...args) => signals.push(args), ...overrides});
  t.after(() => {child.stdout.end(); child.stderr.end(); child.stdin.end(); child.emit('close', 1);});
  return {typer, child, calls, signals, confirmations};
}
const input = {confirmed: true, delayMs: 50, controller: 'auto'};

test('autotyper removes inherited worker/controller state and bounds USB controller choices', () => {
  const base = {PATH: '/bin', MAC2JB_CONTROLLER: 'auto', MAC2JB_AUTO_WORKER: '1', MAC2JB_READY_FD: '1'};
  const automatic = senderEnvironment(base, 'auto');
  assert.equal(automatic.PATH, '/bin');
  for (const key of ['MAC2JB_CONTROLLER', 'MAC2JB_AUTO_WORKER', 'MAC2JB_READY_FD']) assert.equal(automatic[key], undefined);
  assert.equal(senderEnvironment(base, 'usb-drd15').MAC2JB_CONTROLLER, 'usb-drd15');
  for (const controller of ['usb-drd16', 'usb-drd-1', 'usb-drd0;echo', '../x']) assert.throws(() => senderEnvironment(base, controller));
  assert.equal(base.MAC2JB_AUTO_WORKER, '1');
});

test('unsupported platforms and missing prerequisites never launch a sender', async t => {
  for (const overrides of [{platform: 'win32'}, {platform: 'linux'}, {arch: 'x64'},
    {helperAvailable: async () => false}, {probeDriver: async () => false},
    {probeDriver: async () => {throw Error('Driver query denied');}}]) {
    const {typer, calls} = fixture(t, overrides);
    await assert.rejects(typer.start(input), /autoNotReady/);
    assert.equal(calls.length, 0); assert.equal(typer.busy, false);
  }
});

test('autotyper sends the bundled bootstrap only, records progress and never submits RUN commands', async t => {
  const {typer, child, calls, confirmations} = fixture(t);
  const ready = await typer.check(); assert.equal(ready.status, 'ready');
  const bytes = await fs.readFile(path.join(root, 'bootstrap.bas'));
  assert.equal(ready.preview.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  await typer.start({...input, file: '/untrusted', commands: ['RUN']});
  assert.deepEqual(calls[0][1], [path.join(root, 'bootstrap.bas'), '--delay-ms', '50']);
  assert.equal(calls[0][2].detached, true); assert.equal(calls[0][2].shell, undefined);
  assert.deepEqual(confirmations, ['\n']);
  assert.equal(typer.busy, true);
  await assert.rejects(typer.start(input), /autoBusy/);
  child.stdout.write('MAC2JB_GUI ' + JSON.stringify({type: 'line-complete', completed: 1, total: ready.preview.lines}) + '\n');
  await tick(); assert.equal(typer.snapshot().completed, 1); assert.equal(typer.snapshot().status, 'typing');
  child.stdout.write('MAC2JB_GUI {broken}\n');
  child.stdout.write('MAC2JB_GUI {"type":"line-complete","completed":999999,"total":1}\n');
  await tick(); assert.equal(typer.snapshot().completed, 1);
  child.emit('close', 0); assert.equal(typer.snapshot().status, 'finished'); assert.equal(typer.busy, false);
});

test('typing requires a fresh confirmation, supported speed and a fresh driver check', async t => {
  let driverLoaded = true;
  const {typer, calls} = fixture(t, {probeDriver: async () => driverLoaded});
  await typer.check(); driverLoaded = false;
  await assert.rejects(typer.start(input), /autoNotReady/);
  for (const invalid of [{...input, confirmed: false}, {...input, delayMs: 1}, {...input, delayMs: 0}, {...input, controller: 'shell'}])
    await assert.rejects(typer.start(invalid));
  assert.equal(calls.length, 0);
});

test('stop signals the whole sender group and preserves partial-transfer status until it exits', async t => {
  const {typer, child, calls, signals} = fixture(t);
  await typer.start(input);
  assert.equal(typer.stop().status, 'stopping');
  assert.deepEqual(signals, [[-12345, 'SIGINT']]);
  assert.equal(typer.busy, true);
  await assert.rejects(typer.start(input), /autoBusy/);
  typer.stop(); assert.equal(signals.length, 1);
  child.emit('close', 0); assert.equal(typer.snapshot().status, 'stopped');
  assert.equal(typer.busy, false); assert.equal(calls.length, 1);
});

test('a spawn failure releases the busy state without claiming successful typing', async t => {
  const {typer, child} = fixture(t);
  await typer.start(input); child.emit('error', Error('Cannot execute sender'));
  assert.equal(typer.busy, false); assert.equal(typer.snapshot().status, 'failed');
  child.emit('close', 0); assert.equal(typer.snapshot().status, 'failed');
});

test('concurrent starts cannot race past driver preflight', async t => {
  let release;
  const pending = new Promise(resolve => {release = resolve;});
  const {typer, calls} = fixture(t, {probeDriver: () => pending});
  const first = typer.start(input);
  await assert.rejects(typer.start(input), /autoBusy/);
  release(true); await first; assert.equal(calls.length, 1);
});

test('autotyper API enforces authentication and serializes USB typing with console sessions and shutdown', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-autotype-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const {typer, child} = fixture(t);
  const engine = new EventEmitter(); engine.stdout = new PassThrough(); engine.stderr = new PassThrough();
  const app = await createApp({dataRoot: directory, port: 0, autotyper: typer, runner: () => engine});
  t.after(() => {engine.stdout.end(); engine.stderr.end(); app.server.closeAllConnections(); app.server.close();});
  const headers = {authorization: 'Bearer ' + app.token, 'Content-Type': 'application/json'};
  const call = (route, body) => fetch(new URL('/api/' + route, app.url), {method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined});
  assert.equal((await fetch(new URL('/api/autotyper', app.url))).status, 401);
  assert.equal((await call('autotyper', {action: 'start', ...input})).status, 200);
  assert.equal((await (await call('state')).json()).active, true);
  assert.equal((await call('start', {mode: 'demo', host: '127.0.0.1'})).status, 400);
  assert.equal((await call('quit', {})).status, 409);
  await call('autotyper', {action: 'stop'}); child.emit('close', 1);
  assert.equal((await call('start', {mode: 'demo', host: '127.0.0.1'})).status, 200);
  assert.equal((await call('autotyper', {action: 'start', ...input})).status, 409);
  engine.emit('close', 0);
});

test('vendored mac2jb sender and libusbd sources match the pinned upstream checksums', async () => {
  const directory = path.join(__dirname, 'vendor/mac2jb');
  const upstream = JSON.parse(await fs.readFile(path.join(directory, 'UPSTREAM.json')));
  for (const [file, sha256] of Object.entries(upstream.files))
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(directory, file))).digest('hex'), sha256, file);
  assert.ok(upstream.files['vendor/libusbd/LICENSE-APSL-2.0.txt']);
});

test('connection command validation preserves all pairing arguments and rejects injected or malformed text', () => {
  const {validateCommand} = require('./autotyper.cjs');
  const valid = 'V=START(39380,192,168,1,10,281474976710655,2,3,4)';
  assert.equal(validateCommand(valid), valid);
  for (const command of ['V=START(39380,192,168,1,10)', valid + '\nRUN', valid.replace(',192,', ',256,'),
    valid.replace('281474976710655', '281474976710656'), valid.replace(',2,', ',,'), valid.replace('39380', '1234')])
    assert.throws(() => validateCommand(command), /autoInvalidSession/);
});

test('command typing binds to a fresh live host, reports waits and saves a durable USB log', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-command-test-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const {typer, child, calls} = fixture(t, {dataRoot: directory, diagnose: async () => ({os: 'fixture', sip: 'unknown', controllers: []})});
  let live = true, started = 0;
  const command = 'V=START(39380,192,168,1,10,1,2,3,4)';
  const session = {pid: process.pid, command, isCurrent: () => live, onStarted: () => {started++;}};
  await typer.start({...input, waitMs: 5000}, session);
  assert.equal(started, 1); assert.match(calls[0][0], /ns2-commands$/);
  assert.ok(calls[0][1].includes('--auto')); assert.ok(calls[0][1].includes('5000'));
  const record = calls[0][2].env.NS2_ACTIVE_COMMAND_FILE;
  assert.equal(await fs.readFile(record, 'utf8'), process.pid + '\n' + command + '\n');
  child.stdout.write('Sending: ' + command + '\nMAC2JB_GUI {"type":"command-complete","completed":2,"total":4}\nMAC2JB_GUI {"type":"wait","remainingMs":1000,"label":"RUN"}\n');
  await tick(); assert.equal(typer.snapshot().completed, 2); assert.equal(typer.snapshot().wait.remainingMs, 1000);
  typer.stop(); child.emit('close', 0); await typer.flushLogs();
  assert.equal(typer.snapshot().status, 'stopped'); assert.equal(typer.snapshot().wait, null);
  assert.match(await fs.readFile(typer.snapshot().logFile, 'utf8'), /Sending: V=START/);
  live = false; await assert.rejects(typer.start(input, session), /autoInvalidSession/);
  assert.equal(calls.length, 1);
});

test('a host that expires during USB preflight never receives command input', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-stale-host-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  let live = true;
  const {typer, calls} = fixture(t, {dataRoot: directory, probeDriver: async () => {live = false; return true;}, diagnose: async () => ({})});
  await assert.rejects(typer.start(input, {pid: process.pid, command: 'V=START(39380,127,0,0,1,0,0,0,0)', isCurrent: () => live, onStarted: () => assert.fail()}), /autoInvalidSession/);
  assert.equal(calls.length, 0); assert.equal(typer.busy, false);
});

test('the HTTP command action uses only the current host and permits at most one attempt', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-command-api-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const {typer, child, calls} = fixture(t, {dataRoot: directory, diagnose: async () => ({})});
  const engine = new EventEmitter(); engine.pid = process.pid; engine.stdout = new PassThrough(); engine.stderr = new PassThrough();
  const app = await createApp({dataRoot: directory, port: 0, autotyper: typer, runner: () => engine});
  t.after(() => {engine.stdout.end(); engine.stderr.end(); app.server.closeAllConnections(); app.server.close();});
  const headers = {authorization: 'Bearer ' + app.token, 'Content-Type': 'application/json'};
  const call = (route, body) => fetch(new URL('/api/' + route, app.url), {method: 'POST', headers, body: JSON.stringify(body)});
  assert.equal((await call('autotyper', {action: 'commands', ...input})).status, 409);
  await call('start', {mode: 'session', host: '127.0.0.1'});
  engine.stdout.write('V=START(39380,127,0,0,1,1,2,3,4)\n'); await tick();
  assert.equal((await call('autotyper', {action: 'commands', ...input, command: 'RUN', pid: 1})).status, 200);
  assert.match(await fs.readFile(calls[0][2].env.NS2_ACTIVE_COMMAND_FILE, 'utf8'), /1,2,3,4/);
  child.emit('close', 0);
  assert.equal((await call('autotyper', {action: 'commands', ...input})).status, 409);
  engine.emit('close', 1);
  assert.equal((await call('retry', {})).status, 409);
});
