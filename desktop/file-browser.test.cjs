const test = require('node:test');
const assert = require('node:assert/strict');
const {dispatch, validatePath} = require('../engine/switch2/ro/browser.cjs');
const {buildArgs} = require('./server.cjs');

test('browser accepts paths without TitleIDs and rejects traversal', () => {
  assert.deepEqual(buildArgs({mode: 'browse', host: '192.168.1.10'}), ['--browse-files', '192.168.1.10']);
  assert.equal(validatePath('/Nintendo/Contents'), '/Nintendo/Contents');
  for (const value of ['../a', '/a/../b', '/a\0b', '/a\\b', '/' + 'a'.repeat(769)]) assert.throws(() => validatePath(value));
});

test('browser paginates past 128 files and preserves exact sizes', async t => {
  const io = {pathMethod: async () => ({result: 0}), domain: {oneHandle: () => 20}};
  let cursor = 0, last = 0, closes = 0;
  const s = {base: 0x100000, threads: new Set(), handles: new Set([10]), write: async () => {},
    close: async () => {closes++;},
    ipc: async () => {
      last = cursor; const count = Math.min(4, 131 - cursor); cursor += count;
      const data = Buffer.alloc(8); data.writeBigUInt64LE(BigInt(count)); return {result: 0, data};
    },
    readOwned: async (_, length) => {
      const bytes = Buffer.alloc(length);
      for (let i = 0; i < length / 0x310; i++) {
        bytes.write('file-' + (last + i), i * 0x310); bytes[i * 0x310 + 0x304] = 1;
        bytes.writeBigUInt64LE(9007199254740993n, i * 0x310 + 0x308);
      }
      return bytes;
    }};
  const state = {worker: {joined: true}, browserMounts: [{source: 'sd', handle: 10}]};
  const input = {command: 'root-native-browser-list', source: 'sd', path: '/'};
  const first = await dispatch({s}, input, state, io);
  assert.equal(first.entries.length, 128); assert.equal(first.next, 128);
  assert.equal(first.entries[0].size, '9007199254740993');
  cursor = 0;
  const second = await dispatch({s}, {...input, offset: first.next}, state, io);
  assert.deepEqual(second.entries.map(x => x.name), ['file-128', 'file-129', 'file-130']);
  assert.equal(second.next, null); assert.equal(closes, 2);
});

test('browser downloads multiple blocks and empty files, recovers from unavailable paths and finishes', async t => {
  const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
  const crypto = require('node:crypto');
  const {main} = require('../engine/switch2/file-browser.cjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-browser-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const directory = path.join(root, 'switch2'); await fs.mkdir(directory);
  const proof = path.join(root, 'proof.json');
  await fs.writeFile(proof, JSON.stringify({session: 'test', report: 'report', verified: true,
    trials: [{verified: true, restored: true}, {verified: true, restored: true}]}));
  const bytes = Buffer.alloc(70000, 37);
  const memory = {info: {session: 'test'}, reportFile: 'report', request: async input => {
    if (input.command.endsWith('-close')) return {closed: true};
    if (input.command.endsWith('-mount')) return {available: true};
    if (input.command.endsWith('-list')) return {entries: [], next: null};
    if (input.path === '/missing') return {unavailable: 'File unavailable'};
    const content = input.path === '/empty' ? Buffer.alloc(0) : bytes;
    if (input.command.endsWith('-size')) return {size: content.length};
    const block = content.subarray(input.offset, input.offset + input.length);
    return {size: content.length, offset: input.offset, length: input.length, base64: block.toString('base64'),
      sha256: crypto.createHash('sha256').update(block).digest('hex')};
  }};
  const running = main(proof, {directory, memory});
  let endpoint;
  for (let i = 0; i < 100 && !endpoint; i++) {
    try {endpoint = JSON.parse(await fs.readFile(path.join(directory, 'browser-endpoint.json')));}
    catch {await new Promise(resolve => setTimeout(resolve, 10));}
  }
  assert.ok(endpoint);
  const call = async input => {
    const response = await fetch('http://127.0.0.1:' + endpoint.port, {method: 'POST',
      headers: {authorization: 'Bearer ' + endpoint.token}, body: JSON.stringify(input)});
    return response.json();
  };
  t.after(async () => {try {await call({action: 'finish'});} catch {} await running;});
  assert.match((await call({action: 'download', source: 'sd', path: '/missing'})).error, /unavailable/);
  for (const filename of ['/file', '/empty']) {
    const result = await call({action: 'download', source: 'sd', path: filename});
    assert.ok(result.file, JSON.stringify(result));
    assert.deepEqual(await fs.readFile(result.file), filename === '/empty' ? Buffer.alloc(0) : bytes);
    assert.equal(JSON.parse(await fs.readFile(result.file + '.json')).path, filename);
  }
  const inventory = await call({action: 'structure'});
  assert.equal(inventory.complete, true);
  const structure = JSON.parse(await fs.readFile(inventory.file));
  assert.deepEqual(structure.storages.map(item => item.source), ['sd', 'user', 'system']);
  assert.deepEqual(await call({action: 'finish'}), {finished: true});
  assert.equal((await running).complete, true);
  await assert.rejects(fs.stat(path.join(directory, 'browser-endpoint.json')), {code: 'ENOENT'});
});

test('desktop exposes browser readiness and authenticates the console proxy', async t => {
  const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
  const http = require('node:http'), {EventEmitter} = require('node:events'), {PassThrough} = require('node:stream');
  const {createApp} = require('./server.cjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-browser-ui-'));
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  const app = await createApp({dataRoot: root, port: 0, runner: () => child});
  const base = new URL(app.url).origin, headers = {authorization: 'Bearer ' + app.token};
  const remote = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer console-secret');
    req.resume(); req.on('end', () => res.end(JSON.stringify({entries: [], next: null})));
  });
  await new Promise(resolve => remote.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    child.stdout.end(); child.stderr.end();
    app.server.closeAllConnections(); app.server.close(); remote.closeAllConnections(); remote.close();
    await fs.rm(root, {recursive: true, force: true});
  });
  assert.equal((await fetch(base + '/api/browser')).status, 401);
  assert.deepEqual(await (await fetch(base + '/api/browser', {headers})).json(), {ready: false});
  await fetch(base + '/api/start', {method: 'POST', headers, body: JSON.stringify({mode: 'browse', host: '127.0.0.1'})});
  const run = path.join(root, 'runs/switch2-test'); await fs.mkdir(path.join(run, 'switch2'), {recursive: true});
  app.state.runFolder = run;
  await fs.writeFile(path.join(run, 'switch2/browser-endpoint.json'), JSON.stringify({port: remote.address().port, token: 'console-secret'}));
  assert.deepEqual(await (await fetch(base + '/api/browser', {headers})).json(), {ready: true});
  const response = await fetch(base + '/api/browser', {method: 'POST', headers,
    body: JSON.stringify({action: 'list', source: 'sd', path: '/'})});
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), {entries: [], next: null});
});
