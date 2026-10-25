const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {exportBatch} = require('../engine/shared/export-batch.cjs');
const {parseTitles, parseGameOptions} = require('../engine/shared/game-options.cjs');
const {buildArgs} = require('./server.cjs');
const a = '010000000000000a', b = '010000000000000b';

test('multiple titles survive UI and CLI parsing, normalize and deduplicate', () => {
  for (const mode of ['probe', 'dump']) {
    const args = buildArgs({mode, host: '127.0.0.1', title: `${a}\n0x${b.toUpperCase()},${a}`, storage: 4, version: '12'});
    const {options, hostArgs} = parseGameOptions(args);
    assert.deepEqual(options, {mode, title: '0x' + a, titles: ['0x' + a, '0x' + b], storage: 4, version: 12});
    assert.deepEqual(hostArgs, ['127.0.0.1']);
  }
  for (const value of ['', '../bad', a + ',bad', Array(65).fill(a).join(','), null])
    assert.throws(() => parseTitles(value));
  assert.deepEqual(parseTitles(`${a};${a}`), [a]);
});

async function temporary(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'title-batch-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  return directory;
}

test('batch exports sequentially into separate folders and preserves individual reports', async t => {
  const directory = await temporary(t), calls = [], messages = [];
  let active = 0;
  const result = await exportBatch({mode: 'dump', titles: [a, b, a], storage: 5}, directory, async (options, target) => {
    assert.equal(active++, 0); assert.equal(options.titles, undefined); assert.equal(options.storage, 5);
    calls.push(options.title);
    await fs.mkdir(target);
    const file = path.join(target, 'game-export.json');
    await fs.writeFile(file, JSON.stringify({title: options.title}));
    active--;
    return {complete: true, completeContentSet: true, file};
  }, message => messages.push(message));
  assert.deepEqual(calls, ['0x' + a, '0x' + b]);
  assert.equal(result.complete, true); assert.equal(result.completeContentSet, true);
  const journal = JSON.parse(await fs.readFile(result.file));
  assert.deepEqual(journal.titles.map(row => row.status), ['complete', 'complete']);
  for (const row of journal.titles) assert.equal(JSON.parse(await fs.readFile(row.result.file)).title, row.title);
  assert.ok(messages.some(message => message.includes('title 2/2')));
});

test('failed or incomplete exports stop the queue and keep completed titles', async t => {
  for (const failsByThrowing of [true, false]) {
    const directory = await temporary(t), calls = [];
    await assert.rejects(exportBatch({mode: 'dump', titles: [a, b, '010000000000000c']}, directory, async options => {
      calls.push(options.title);
      if (calls.length === 2) {
        if (failsByThrowing) throw Error('Transfer stopped');
        return {complete: true, completeContentSet: false};
      }
      return {complete: true, completeContentSet: true};
    }, () => {}));
    const journal = JSON.parse(await fs.readFile(path.join(directory, 'game-export-batch.json')));
    assert.deepEqual(journal.titles.map(row => row.status), ['complete', 'failed', 'pending']);
    assert.equal(journal.complete, false); assert.equal(calls.length, 2);
  }
});
