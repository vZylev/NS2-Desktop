const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {createBackend, createIndex, gamePath} = require('../engine/switch2/ouncecake-adapter.cjs');
const {exportGame, localPath} = require('../engine/switch2/browser-transfer.cjs');
const {exportStructure} = require('../engine/switch2/file-structure.cjs');
const {readRomfs} = require('../engine/switch2/ouncecake/engine/mounts.cjs');
const {buildArgs} = require('./server.cjs');

function fixture() {
  const title = '0100000000000001';
  const source = {contentId: 'a'.repeat(32), version: 0, storage: 4};
  const prepared = {sources: [{handle: 10, kind: 0}, {handle: 20, kind: 1}, {handle: 30, kind: 0}],
    absentSources: [], views: [
      {path: '/base/romfs', mount: 0, source, entries: [{path: '/empty', type: 'directory', size: 0},
        {path: '/data.bin', type: 'file', size: 5, offset: 100}]},
      {path: '/base/exefs', mount: 1, source, entries: [{path: '/main', type: 'file', size: 4}]},
      {path: '/dlc/0100000000001001/1/romfs', mount: 2, source: {...source, selection: 'dlc', version: 1},
        entries: [{path: '/zero', type: 'file', size: 0, offset: 200}]}]};
  const calls = [];
  const attachment = {s: {close: async handle => calls.push(['close', handle])},
    close: async () => calls.push(['cleanup']), filesystem: {
      readStorage: async (s, handle, offset, size) => {calls.push(['storage', handle, offset, size]); return Buffer.from('hello').subarray(offset - 100, offset - 100 + size);},
      openFile: async (s, handle, filename) => {calls.push(['open', handle, filename]); return {result: 0, handle: 21};},
      readFile: async (s, handle, offset, size) => {calls.push(['file', handle, offset, size]); return Buffer.from('MAIN').subarray(offset, offset + size);}
    }};
  const backend = createBackend('/unused', {attach: async () => attachment,
    discover: async () => [{title, name: 'Test Game', storages: [4]}],
    prepare: async options => {assert.equal(options.keepDlcOpen, true); return prepared;}});
  return {backend, calls, title, prepared};
}
async function mounted() {
  const f = fixture(); await f.backend.request('games'); await f.backend.request('select', {title: f.title}); return f;
}
async function output(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-oz-'));
  t.after(() => fs.rm(folder, {recursive: true, force: true})); return folder;
}
test('OunceCake mode uses existing session and exposes mounted files with actual console title metadata', async () => {
  assert.deepEqual(buildArgs({mode: 'extract', host: '192.168.1.2'}), ['--extract-files', '192.168.1.2']);
  const {backend, calls} = await mounted();
  const root = await backend.request('list', {path: '/'});
  assert.deepEqual(root.entries.map(row => row.name), ['base', 'dlc']);
  const listing = await backend.request('list', {path: '/base/romfs'});
  assert.equal(listing.entries[1].metadata.title, 'Test Game');
  assert.equal(listing.entries[1].metadata.titleSource, 'console-control-metadata');
  const read = await backend.request('read', {path: '/base/romfs/data.bin', offset: 1, length: 3});
  assert.equal(Buffer.from(read.base64, 'base64').toString(), 'ell');
  assert.ok(calls.some(row => row[0] === 'storage' && row[2] === 101));
  const code = await backend.request('read', {path: '/base/exefs/main', offset: 0, length: 4});
  assert.equal(Buffer.from(code.base64, 'base64').toString(), 'MAIN');
  assert.ok(calls.some(row => row[0] === 'close' && row[1] === 21));
  await backend.close(); assert.equal((await backend.request('mount')).available, false);
});
test('complete extraction preserves RomFS/ExeFS/DLC layout, empty directories, zero-byte files and hashes', async t => {
  const {backend} = await mounted(), folder = await output(t);
  const result = await exportGame(backend, folder);
  assert.equal(result.complete, true); assert.equal(result.files, 3);
  assert.equal(await fs.readFile(path.join(result.directory, 'base/romfs/data.bin'), 'utf8'), 'hello');
  assert.equal(await fs.readFile(path.join(result.directory, 'base/exefs/main'), 'utf8'), 'MAIN');
  assert.equal((await fs.stat(path.join(result.directory, 'dlc/0100000000001001/1/romfs/zero'))).size, 0);
  assert.ok((await fs.stat(path.join(result.directory, 'base/romfs/empty'))).isDirectory());
  const report = JSON.parse(await fs.readFile(result.file));
  assert.equal(report.files[0].sha256, crypto.createHash('sha256').update('hello').digest('hex'));
  assert.equal(report.game.name, 'Test Game');
});
test('game structure export carries verified selection and source metadata without content reads', async t => {
  const {backend, calls} = await mounted(), folder = await output(t);
  const result = await exportStructure({request: backend.request, output: folder, sources: ['game'],
    pathValidator: gamePath, context: {engine: 'OunceCake', game: backend.selected}});
  const report = JSON.parse(await fs.readFile(result.file));
  assert.equal(report.complete, true); assert.equal(report.summary.files, 3);
  assert.equal(report.entries.find(row => row.name === 'data.bin').metadata.title, 'Test Game');
  assert.ok(!calls.some(row => ['storage', 'file'].includes(row[0])));
});
test('invalid paths and Windows collisions cannot escape or overwrite extraction output', async t => {
  for (const filename of ['/../escape', '/a/../escape', '/a\\b', '/a\0b']) {
    assert.throws(() => gamePath(filename)); assert.throws(() => localPath(filename));
  }
  assert.equal(localPath('/base/romfs/CON'), 'base/romfs/%5fCON');
  assert.equal(localPath('/base/romfs/a:b'), 'base/romfs/a%3ab');
  const {backend, prepared, title} = fixture();
  prepared.views[0].entries.push({path: '/DATA.BIN', type: 'file', size: 1, offset: 100});
  await backend.request('select', {title});
  const folder = await output(t);
  await assert.rejects(exportGame(backend, folder), /collision/);
  const directories = await fs.readdir(folder);
  const report = JSON.parse(await fs.readFile(path.join(folder, directories[0], 'extraction.json')));
  assert.equal(report.complete, false); assert.equal(report.files.length, 0);
  assert.throws(() => createIndex({sources: prepared.sources, views: [{...prepared.views[0], entries: [{path: '/../escape', type: 'file', size: 1}]}]}, {title}));
});
test('short reads preserve a partial report instead of announcing complete extraction', async t => {
  const {backend} = await mounted(), folder = await output(t);
  const request = async (command, input) => {
    if (command === 'read') return {size: 5, offset: 0, length: 5, base64: '', sha256: ''};
    return backend.request(command, input);
  };
  await assert.rejects(exportGame({...backend, request}, folder), /verification/);
  const directories = await fs.readdir(folder);
  const report = JSON.parse(await fs.readFile(path.join(folder, directories[0], 'extraction.json')));
  assert.equal(report.complete, false); assert.equal(report.files.length, 0);
});
test('upstream RomFS parser reads an internal file and rejects short reads and cycles', async () => {
  const bytes = Buffer.alloc(0xa5);
  [0x50,0x50,0,0x50,24,0x68,0,0x68,36,0xa0].forEach((value,i) => bytes.writeBigUInt64LE(BigInt(value),i*8));
  bytes.writeUInt32LE(0xffffffff,0x54); bytes.writeUInt32LE(0xffffffff,0x58);
  bytes.writeUInt32LE(0,0x5c); bytes.writeUInt32LE(0xffffffff,0x60);
  bytes.writeUInt32LE(0xffffffff,0x6c); bytes.writeBigUInt64LE(0n,0x70); bytes.writeBigUInt64LE(5n,0x78);
  bytes.writeUInt32LE(0xffffffff,0x80); bytes.writeUInt32LE(1,0x84); bytes.write('x',0x88); bytes.write('hello',0xa0);
  const read = async (offset,length) => bytes.subarray(offset,offset+length);
  assert.deepEqual(await readRomfs(read, bytes.length), [{path: '/x', type: 'file', size: 5, offset: 0xa0}]);
  await assert.rejects(readRomfs(async () => Buffer.alloc(0), bytes.length), /short read/);
  bytes.writeUInt32LE(0,0x6c);
  await assert.rejects(readRomfs(read, bytes.length), /cycle/);
});

test('authenticated browser serves OunceCake selection, structure, full extraction and cleanup end to end', async t => {
  const folder = await output(t), directory = path.join(folder, 'switch2'); await fs.mkdir(directory);
  const {backend, calls} = fixture();
  const proofFile = path.join(folder, 'proof.json');
  await fs.writeFile(proofFile, JSON.stringify({session: 'test', report: 'report', verified: true,
    trials: [{verified: true, restored: true}, {verified: true, restored: true}]}));
  const running = require('../engine/switch2/file-browser.cjs').main(proofFile, {
    directory, gameBackend: backend, memory: {info: {session: 'test'}, reportFile: 'report'}});
  let endpoint;
  for (let i = 0; i < 100 && !endpoint; i++) {
    try {endpoint = JSON.parse(await fs.readFile(path.join(directory, 'browser-endpoint.json')));}
    catch {await new Promise(resolve => setTimeout(resolve, 10));}
  }
  assert.ok(endpoint);
  const call = async input => {
    const response = await fetch('http://127.0.0.1:' + endpoint.port, {method: 'POST',
      headers: {authorization: 'Bearer ' + endpoint.token}, body: JSON.stringify(input)});
    return {status: response.status, value: await response.json()};
  };
  t.after(async () => {try {await call({action: 'finish'});} catch {} await running;});
  const games = (await call({action: 'games'})).value.games;
  assert.equal(games[0].name, 'Test Game');
  const selected = await call({action: 'select', title: games[0].title});
  assert.equal(selected.status, 200); assert.equal(selected.value.files, 3);
  const listing = await call({action: 'list', source: 'game', path: '/base/exefs'});
  assert.equal(listing.value.entries[0].name, 'main');
  const inventory = await call({action: 'structure'});
  assert.equal(inventory.value.complete, true);
  const extraction = await call({action: 'extract-all'});
  assert.equal(extraction.value.complete, true); assert.equal(extraction.value.files, 3);
  const single = await call({action: 'download', source: 'game', path: '/base/exefs/main'});
  assert.equal(await fs.readFile(single.value.file, 'utf8'), 'MAIN');
  assert.equal((await call({action: 'finish'})).status, 200);
  assert.equal((await running).complete, true);
  assert.ok(calls.some(row => row[0] === 'cleanup'));
});
