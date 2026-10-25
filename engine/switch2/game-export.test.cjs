const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {capture, decodeChunk} = require('./game-export.cjs');
const {dispatch, contentInfos} = require('./ro/game-content.cjs');
const {parseGameOptions} = require('../shared/game-options.cjs');
const {pack} = require('../../pack-game.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const id = '0123456789abcdef0123456789abcdef';

async function directory(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-games-test-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  return dir;
}

test('game arguments reject missing IDs, invalid storage, and ambiguous flags', () => {
  assert.equal(parseGameOptions(['--dump-firmware']), null);
  assert.deepEqual(parseGameOptions(['--dump-game', '010000000000000A', '--storage', '4', '--version', '3', '192.168.1.2']),
    {options: {mode: 'dump', title: '0x010000000000000a', storage: 4, version: 3}, hostArgs: ['192.168.1.2']});
  for (const args of [['--probe-game'], ['--list-games', '--storage', '3'],
    ['--dump-game', '010000000000000a', '--version', '-1'], ['--list-games', '--dump-firmware']])
    assert.throws(() => parseGameOptions(args));
});

test('NCM content size keeps its fifth byte and rejects malformed counts', () => {
  const bytes = Buffer.alloc(24); Buffer.from(id, 'hex').copy(bytes);
  bytes.writeUIntLE(0x102030405, 16, 5); bytes[21] = 2; bytes[22] = 1; bytes[23] = 3;
  assert.deepEqual(contentInfos(bytes, 1), [{id, size: 0x102030405, attributes: 2, type: 1, idOffset: 3}]);
  assert.throws(() => contentInfos(bytes, 2));
  assert.throws(() => contentInfos(bytes, -1));
});

test('capture verifies multiple blocks, the final short block, and disk contents', async t => {
  const dir = await directory(t), bytes = crypto.randomBytes(0x10000 + 31), calls = [];
  const memory = {async request(request) {
    calls.push(request);
    const part = bytes.subarray(request.offset, request.offset + request.length);
    return {result: 0, ...request, base64: part.toString('base64'), sha256: hash(part)};
  }};
  const entry = await capture(memory, {handle: 4}, {id, size: bytes.length}, dir, false);
  assert.deepEqual(calls.map(call => call.length), [0x10000, 31]);
  assert.deepEqual(await fs.readFile(entry.file), bytes);
  assert.equal(entry.sha256, hash(bytes)); assert.equal(entry.completeContent, true);
});

test('a failed transfer preserves partial evidence and issues no more requests', async t => {
  const dir = await directory(t); let calls = 0;
  await assert.rejects(capture({request: async () => {calls++; throw Error('uncertain transport');}},
    {handle: 4}, {id, size: 10}, dir, false), /uncertain/);
  assert.equal(calls, 1);
  assert.equal((await fs.stat(path.join(dir, id + '.nca.partial'))).size, 0);
  await assert.rejects(fs.stat(path.join(dir, id + '.nca')), {code: 'ENOENT'});
  assert.throws(() => decodeChunk({result: 0, id, offset: 0, length: 1, base64: 'YQ==', sha256: 'bad'}, id, 0, 1), /hash/);
});

test('a probe rejects inconsistent repeated reads without publishing a sample', async t => {
  const dir = await directory(t); let calls = 0;
  const memory = {async request(request) {
    const bytes = Buffer.alloc(request.length, ++calls);
    return {...request, result: 0, base64: bytes.toString('base64'), sha256: hash(bytes)};
  }};
  await assert.rejects(capture(memory, {handle: 4}, {id, size: 100}, dir, true), /Repeated/);
  assert.equal(calls, 2);
  await assert.rejects(fs.stat(path.join(dir, id + '.sample')), {code: 'ENOENT'});
});

test('game reader validates metadata size and read bounds and closes owned storage', async () => {
  const payload = Buffer.from('NCM content'), handles = new Set([7]), closed = [];
  let output;
  const state = {worker: {joined: true}, services: [{name: 'ncm', handle: 7}]};
  const context = {save: async () => {}, s: {base: 0x100000, bytes: 0x10000, threads: new Set(), handles,
    async write(at, bytes) {output = bytes;},
    async readOwned(at, size) {return output.subarray(0, size);},
    async close(handle) {assert.ok(handles.has(handle)); handles.delete(handle); closed.push(handle);},
    async ipc(label, handle, command, input, options) {
      if (handle === 7) {
        assert.equal(input[0], 4);
        const child = command === 5 ? 9 : 10; handles.add(child);
        return {result: 0, moves: [child], copies: []};
      }
      if (handle === 9) {
        assert.equal(command, 4); assert.equal(input.readUInt32LE(), 0);
        assert.equal(input.readBigUInt64LE(8), 0x010000000000000an);
        assert.equal(input.readUInt32LE(16), 12); assert.equal(input[20], 0x80);
        output = Buffer.alloc(512 * 24); Buffer.from(id, 'hex').copy(output);
        output.writeUIntLE(payload.length, 16, 5); output[22] = 1;
        const data = Buffer.alloc(4); data.writeInt32LE(1);
        return {result: 0, data};
      }
      assert.equal(handle, 10);
      if (command === 14) {
        assert.equal(input.toString('hex'), id);
        const data = Buffer.alloc(8); data.writeBigInt64LE(BigInt(payload.length));
        return {result: 0, data};
      }
      assert.equal(command, 18); assert.equal(input.subarray(0, 16).toString('hex'), id);
      assert.equal(input.readBigInt64LE(16), 0n);
      assert.equal(options.receive[0].size, payload.length); output = payload;
      return {result: 0};
    }}};
  const reader = await dispatch(context, {command: 'root-native-game-open', handle: 7, storage: 4,
    key: {id: '0x010000000000000a', version: 12, type: 0x80, installType: 0}}, state);
  assert.deepEqual(closed, [9]);
  const reply = await dispatch(context, {command: 'root-native-game-read', handle: reader.handle,
    id, offset: 0, length: payload.length}, state);
  assert.deepEqual(decodeChunk(reply, id, 0, payload.length), payload);
  await assert.rejects(dispatch(context, {command: 'root-native-game-read', handle: reader.handle,
    id, offset: payload.length, length: 1}, state), /range/);
  await dispatch(context, {command: 'root-native-game-close', handle: reader.handle}, state);
  assert.deepEqual(closed, [9, 10]); assert.equal(state.gameReaders.length, 0);
});

test('an uncertain NCM inventory request is never followed by a native close', async () => {
  const calls = [];
  const context = {s: {threads: new Set(), handles: new Set([7]), base: 0x100000, bytes: 0x10000,
    async write() {}, async ipc(label, handle, command) {
      calls.push(command);
      if (calls.length === 1) return {result: 0, moves: [9], copies: []};
      throw Error('uncertain transport');
    }, async close() {assert.fail('close after uncertain IPC');}}, save: async () => {}};
  await assert.rejects(dispatch(context, {command: 'root-native-game-inventory', handle: 7, storage: 4},
    {worker: {joined: true}, services: [{name: 'ncm', handle: 7}]}), /uncertain/);
  assert.deepEqual(calls, [5, 5]);
});

test('offline PFS0 contains the verified bytes and refuses incomplete or changed exports', async t => {
  const dir = await directory(t), bytes = Buffer.from('synthetic game content');
  await fs.writeFile(path.join(dir, id + '.nca'), bytes);
  const report = {format: 'ncm-content-set', mode: 'dump', complete: true, completeContentSet: true,
    contents: [{id, size: bytes.length}], files: [{id, size: bytes.length, captured: bytes.length,
      completeContent: true, sha256: hash(bytes)}]};
  const journal = path.join(dir, 'game-export.json'), output = path.join(dir, 'game.pfs0');
  await fs.writeFile(journal, JSON.stringify(report));
  const result = await pack(journal, output), archive = await fs.readFile(output);
  assert.equal(result.completeGameImage, false); assert.equal(archive.subarray(0, 4).toString(), 'PFS0');
  const start = 16 + archive.readUInt32LE(4) * 24 + archive.readUInt32LE(8);
  assert.equal(archive.readBigUInt64LE(16), 0n);
  assert.equal(archive.readBigUInt64LE(24), BigInt(bytes.length));
  assert.deepEqual(archive.subarray(start), bytes);
  await assert.rejects(pack(journal, path.join(dir, 'game.nsp')), /NSP\/XCI/);
  await fs.writeFile(path.join(dir, id + '.nca'), Buffer.alloc(bytes.length));
  await assert.rejects(pack(journal, path.join(dir, 'changed.pfs0')), /hash differs/);
  await assert.rejects(fs.stat(path.join(dir, 'changed.pfs0')), {code: 'ENOENT'});
  report.completeContentSet = false; await fs.writeFile(journal, JSON.stringify(report));
  await assert.rejects(pack(journal, path.join(dir, 'incomplete.pfs0')), /completed content-set/);
});
