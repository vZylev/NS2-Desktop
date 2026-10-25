const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {exportStructure, metadata} = require('../engine/switch2/file-structure.cjs');
async function fixture(t) {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-structure-'));
  t.after(() => fs.rm(output, {recursive: true, force: true})); return output;
}
test('structure walks every storage and page, includes empty folders and exact sizes with title provenance', async t => {
  const output = await fixture(t), calls = [];
  const title = '0100000000000001';
  const request = async (command, input) => {
    calls.push({command, ...input});
    if (command === 'mount') return {available: true};
    assert.equal(command, 'list');
    if (input.source !== 'sd') return {entries: [], next: null};
    if (input.path === '/' && input.offset === 0) return {entries: [{name: title, type: 0, size: '0'}], next: 1};
    if (input.path === '/') return {entries: [{name: 'empty', type: 0, size: '0'}], next: null};
    if (input.path === '/empty') return {entries: [], next: null};
    return {entries: [{name: 'data.bin', type: 1, size: '9007199254740993'}, {name: 'zero', type: 1, size: '0'}], next: null};
  };
  const result = await exportStructure({request, output, catalog: {[title]: 'Example title'}});
  const report = JSON.parse(await fs.readFile(result.file));
  assert.equal(result.complete, true); assert.equal(report.complete, true);
  assert.deepEqual(report.summary, {files: 2, directories: 2, totalFileBytes: '9007199254740993', errors: 0});
  const entry = report.entries.find(row => row.name === 'data.bin');
  assert.equal(entry.parent, '/' + title); assert.equal(entry.path, '/' + title + '/data.bin');
  assert.equal(entry.sizeBytes, '9007199254740993');
  assert.deepEqual(entry.metadata.titleCandidates, [{id: title, title: 'Example title', idSource: 'path-heuristic', titleSource: 'local-catalog'}]);
  assert.equal(report.entries.find(row => row.name === 'empty').sizeBytes, null);
  assert.deepEqual(calls.filter(x => x.command === 'mount').map(x => x.source), ['sd', 'user', 'system']);
  assert.ok(calls.some(x => x.path === '/' && x.offset === 1));
});
test('unavailable storage and folders are recorded without hiding successful siblings', async t => {
  const output = await fixture(t);
  const request = async (command, input) => {
    if (command === 'mount') return {available: input.source !== 'system', result: 123};
    if (input.path === '/blocked') throw Object.assign(Error('Access denied'), {unavailable: true});
    return {entries: input.source === 'sd' ? [{name: 'blocked', type: 0, size: '0'}, {name: 'ok', type: 1, size: '12'}] : [], next: null};
  };
  const result = await exportStructure({request, output});
  const report = JSON.parse(await fs.readFile(result.file));
  assert.equal(result.complete, false); assert.equal(report.summary.errors, 2);
  assert.equal(report.summary.files, 1); assert.equal(report.storages[1].complete, true);
  assert.ok(report.entries.some(row => row.record === 'error' && row.path === '/blocked'));
  assert.ok(report.entries.some(row => row.record === 'error' && row.source === 'system'));
});
test('uncertain native failure stops requests and preserves a valid incomplete inventory', async t => {
  const output = await fixture(t); let calls = 0;
  await assert.rejects(exportStructure({output, request: async command => {
    calls++;
    if (command === 'mount') return {available: true};
    throw Object.assign(Error('Transport lost'), {nativeUncertain: true});
  }}), error => error.nativeUncertain && /Partial inventory:/.test(error.message));
  assert.equal(calls, 2);
  const files = await fs.readdir(output); assert.equal(files.length, 1); assert.ok(files[0].endsWith('.json'));
  const report = JSON.parse(await fs.readFile(path.join(output, files[0])));
  assert.equal(report.complete, false); assert.equal(report.summary.errors, 1);
});
test('metadata never treats a 32-digit content ID as a title ID', () => {
  const result = metadata('/Contents/0123456789abcdef0123456789abcdef.nca', {});
  assert.equal(result.contentId, '0123456789abcdef0123456789abcdef');
  assert.deepEqual(result.titleCandidates, []);
  assert.deepEqual(metadata('/0100000000000001/file', {}).titleCandidates[0], {
    id: '0100000000000001', title: null, idSource: 'path-heuristic', titleSource: null});
});
