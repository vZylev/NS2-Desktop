const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {main} = require('../engine/switch2/file-browser.cjs');
const {createActions, trackedMemory} = require('../engine/switch2/session-actions.cjs');
const {dumpDirectory} = require('../engine/shared/dump-directory.cjs');
const {buildArgs, createApp} = require('./server.cjs');
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-session-'));
  t.after(() => fs.rm(root, {recursive: true, force: true})); return root;
}
async function session(t, options) {
  const root = await temporary(t), directory = path.join(root, 'switch2'); await fs.mkdir(directory);
  const proof = path.join(root, 'proof.json');
  await fs.writeFile(proof, JSON.stringify({session: 'test', report: 'report', verified: true,
    trials: [{verified: true, restored: true}, {verified: true, restored: true}]}));
  const running = main(proof, {directory, mode: 'session', ...options});
  // Observe immediately: fatal-path tests intentionally reject this promise.
  running.catch(() => {});
  let endpoint;
  for (let i = 0; i < 100 && !endpoint; i++) {
    try {endpoint = JSON.parse(await fs.readFile(path.join(directory, 'browser-endpoint.json')));}
    catch {await new Promise(resolve => setTimeout(resolve, 10));}
  }
  assert.ok(endpoint);
  const call = async input => {
    const response = await fetch('http://127.0.0.1:' + endpoint.port, {method: input ? 'POST' : 'GET',
      headers: {authorization: 'Bearer ' + endpoint.token}, body: input ? JSON.stringify(input) : undefined});
    return {status: response.status, value: await response.json()};
  };
  t.after(async () => {try {await call({action: 'finish'});} catch {} await running.catch(() => {});});
  return {call, running, directory};
}
test('one retained session runs raw files, OunceCake, NCA and firmware; Retry replays only the failed operation', async t => {
  const raw = [], games = [], operations = []; let fail = true, selected = null;
  const memory = {info: {session: 'test'}, reportFile: 'report', request: async input => {
    raw.push(input);
    if (input.command.endsWith('-mount')) return {available: true};
    if (input.command.endsWith('-close')) return {closed: true};
    if (fail) {fail = false; return {unavailable: 'SD not ready'};}
    return {entries: [], next: null};
  }};
  const gameBackend = {validatePath: value => value, get selected() {return selected;}, request: async (command, input) => {
    games.push(command);
    if (command === 'select') {selected = {title: input.title, name: 'Game'}; return {selected};}
    if (command === 'mount') return {available: true};
    return {entries: [], next: null};
  }};
  const {call, running} = await session(t, {memory, gameBackend, actions: async input => {operations.push(input.action); return {complete: true, file: '/report'};}});
  assert.equal((await call({action: 'list', source: 'sd', path: '/', requestId: 'first'})).value.retryable, true);
  assert.equal((await call()).value.retryable, true);
  const retried = await call({action: 'retry', requestId: 'retry1'});
  assert.equal(retried.status, 200); assert.equal(retried.value.retriedRequest.path, '/');
  assert.equal((await call()).value.retryable, false);
  const count = raw.length;
  assert.deepEqual(await call({action: 'retry', requestId: 'retry1'}), retried);
  assert.equal(raw.length, count, 'lost response replay must use cached result');
  assert.equal((await call({action: 'select', title: '0100000000000001'})).status, 200);
  assert.equal((await call({action: 'list', source: 'game', path: '/'})).status, 200);
  assert.equal((await call({action: 'list', source: 'user', path: '/'})).status, 200);
  for (const action of ['verify', 'inventory', 'probe', 'dump', 'firmware']) assert.equal((await call({action})).status, 200);
  assert.deepEqual(operations, ['verify', 'inventory', 'probe', 'dump', 'firmware']);
  assert.equal((await call()).value.selected.name, 'Game');
  assert.equal((await call({action: 'finish'})).value.finished, true);
  await running;
  assert.ok(raw.some(row => row.command === 'root-native-browser-close'));
  assert.ok(games.includes('close'));
});
test('native transport uncertainty disables retry and stops the session', async t => {
  let calls = 0;
  const {call, running} = await session(t, {gameBackend: {request: async () => ({})},
    memory: {info: {session: 'test'}, reportFile: 'report', request: async () => {calls++; throw Error('Transport lost');}}});
  const result = await call({action: 'list', source: 'sd', path: '/'});
  assert.equal(result.status, 400); assert.equal(result.value.retryable, false);
  await assert.rejects(running, /Transport lost/); assert.equal(calls, 1);
});
test('only one operation runs at a time; status remains available during transfers', async t => {
  let release, started;
  const ready = new Promise(resolve => {started = resolve;});
  const wait = new Promise(resolve => {release = resolve;});
  const {call} = await session(t, {gameBackend: {request: async () => ({closed: true})},
    memory: {info: {session: 'test'}, reportFile: 'report', request: async () => ({closed: true})},
    actions: async () => {started(); await wait; return {complete: true};}});
  const pending = call({action: 'inventory'}); await ready;
  assert.equal((await call()).value.busy, true);
  const rejected = await call({action: 'firmware'}); assert.equal(rejected.status, 409); assert.equal(rejected.value.busy, true);
  release(); await pending; assert.equal((await call()).value.busy, false);
});
test('session actions clean up operation-owned handles on a recoverable failure and use fresh destinations', async t => {
  const root = await temporary(t), calls = [], destinations = []; let fail = true;
  const memory = {info: {}, request: async input => {calls.push(input);
    if (input.command === 'root-native-sm-service') return {moves: [10], result: 0};
    if (input.command === 'root-native-game-open') return {handle: 20, available: true};
    return {closed: true};}};
  const actions = createActions({memory, proofFile: '/proof', directory: path.join(root, 'switch2'),
    exportOne: async (proof, options, output, attached) => {
      destinations.push(output);
      await attached.request({command: 'root-native-sm-service'});
      await attached.request({command: 'root-native-game-open'});
      if (fail) {fail = false; throw Error('Disk full');}
      return {complete: true};
    }});
  await assert.rejects(actions({action: 'inventory'}), /Disk full/);
  assert.deepEqual(calls.slice(-2), [{command: 'root-native-game-close', handle: 20}, {command: 'root-native-close-handle', handle: 10}]);
  assert.equal((await actions({action: 'inventory'})).complete, true);
  assert.notEqual(destinations[0], destinations[1]);
  const owned = trackedMemory({request: async () => {throw Error('Lost');}});
  await assert.rejects(owned.memory.request({command: 'root-native-sm-service'}), error => error.nativeUncertain);
  await owned.cleanup();
});
test('firmware attempts use isolated destinations and cannot traverse their output root', async t => {
  const root = await temporary(t), attempts = [];
  const actions = createActions({memory: {request: async () => ({})}, proofFile: '/proof', directory: root,
    firmware: async (proof, options) => {attempts.push(options.subdirectory); return {complete: true};}});
  await actions({action: 'firmware'}); await actions({action: 'firmware'});
  assert.notEqual(attempts[0], attempts[1]);
  assert.equal(dumpDirectory(attempts[0], root), path.join(root, attempts[0]));
  for (const value of ['../outside', '/absolute', 'a/b', 'a\\b']) assert.throws(() => dumpDirectory(value, root));
});
test('UI has one session entry point, Make a program instructions, retry and all requested credits', async () => {
  const html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
  const {I18N} = require('./app.js');
  assert.match(html, /id="mode" type="hidden" value="session"/); assert.doesNotMatch(html, /<select id="mode"/);
  for (const language of ['en', 'es']) {
    assert.match(I18N[language].step1, /Make a program/); assert.doesNotMatch(I18N[language].step1, /Direct/);
    assert.ok(I18N[language].retry);
  }
  for (const name of ['vZyle', 'Aster', 'Hexa', 'pepsipu', 'kurumuz']) assert.ok(html.includes('<strong>' + name + '</strong>'));
  assert.deepEqual(buildArgs({mode: 'session', host: '127.0.0.1'}), ['--session', '127.0.0.1']);
});
test('startup retry reuses options without restarting desktop, but does not replay an uncertain connected run', async t => {
  const {EventEmitter} = require('node:events'), {PassThrough} = require('node:stream');
  const root = await temporary(t), children = [], args = [];
  const app = await createApp({dataRoot: root, port: 0, runner(...input) {
    args.push(input); const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    children.push(child); return child;
  }});
  t.after(() => {for (const child of children) {child.stdout.end(); child.stderr.end();} app.server.closeAllConnections(); app.server.close();});
  const base = new URL(app.url).origin, headers = {authorization: 'Bearer ' + app.token};
  const call = (route, body) => fetch(base + '/api/' + route, {method: 'POST', headers, body: JSON.stringify(body)});
  assert.equal((await call('start', {mode: 'session', host: '127.0.0.1', pairing: 'single'})).status, 200);
  children[0].emit('close', 1);
  assert.equal((await call('retry', {})).status, 200);
  assert.deepEqual(args[0][1], args[1][1]);
  children[1].stdout.write('Connected. Checking the application...\n'); await new Promise(setImmediate);
  children[1].emit('close', 1);
  assert.equal((await call('retry', {})).status, 409); assert.equal(children.length, 2);
});

test('an idle retained session is not reported as stalled while waiting for the next tool', async t => {
  const {EventEmitter} = require('node:events'), {PassThrough} = require('node:stream');
  let now = 1000;
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  const app = await createApp({dataRoot: await temporary(t), port: 0, runner: () => child, now: () => now});
  t.after(() => {child.stdout.end(); child.stderr.end(); app.server.closeAllConnections(); app.server.close();});
  const base = new URL(app.url).origin, headers = {authorization: 'Bearer ' + app.token};
  await fetch(base + '/api/start', {method: 'POST', headers, body: JSON.stringify({mode: 'session', host: '127.0.0.1'})});
  child.stdout.write('Connected.\n4/4 Running the FS demo\nFiles: browser ready\n'); await new Promise(setImmediate);
  now += 120000;
  const idle = await (await fetch(base + '/api/state', {headers})).json();
  assert.equal(idle.toolsReady, true); assert.equal(idle.progress.stalled, false);
  child.stdout.write('Session: operation started\n'); await new Promise(setImmediate); now += 120000;
  const working = await (await fetch(base + '/api/state', {headers})).json();
  assert.equal(working.toolsBusy, true); assert.equal(working.progress.stalled, true);
});

test('license rejection keeps the session usable, cleans partial mounts, and offers Retry', async t => {
  const {createBackend} = require('../engine/switch2/ouncecake-adapter.cjs');
  const {resultError} = require('../engine/switch2/ouncecake/engine/protocol.cjs');
  let attempts = 0, cleanups = 0;
  const gameBackend = createBackend('/unused', {
    attach: async () => ({close: async () => {cleanups++;}}),
    prepare: async () => {
      if (++attempts === 1) throw resultError('Could not prepare /updates/786432/romfs: ES prepare installed title license', 0x691);
      return {views: [], sources: []};
    },
  });
  const memory = {info: {session: 'test'}, reportFile: 'report', request: async input =>
    input.command.endsWith('-mount') ? {available: true} : {entries: [], next: null}};
  const {call, running} = await session(t, {gameBackend, memory});
  const failed = await call({action: 'select', title: '0100000000000001'});
  assert.equal(failed.value.retryable, true); assert.equal(cleanups, 1);
  assert.equal((await call()).value.ready, true);
  assert.equal((await call({action: 'retry'})).status, 200);
  assert.equal((await call({action: 'list', source: 'sd', path: '/'})).status, 200);
  assert.equal((await call({action: 'finish'})).status, 200);
  await running;
});
