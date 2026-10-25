const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {writeAtomic, RENAME_DELAYS_MS} = require('./atomic-file.cjs');
const {reportWriter, RunControl} = require('../switch2/memory/run-control.cjs');

const error = code => Object.assign(new Error('Injected filesystem failure: ' + code), {code});
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-report-lock-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const file = path.join(directory, 'reserved-gap.json');
  await fs.writeFile(file, '{"previous":true}\n');
  return {directory, file};
}

test('Windows lock retries publish one complete snapshot without rewriting it or losing the previous report', async t => {
  const {directory, file} = await fixture(t);
  let writes = 0, renames = 0;
  const delays = [], sources = [], logs = [];
  const bytes = JSON.stringify({profile: 'cache-combined-leak-0-7-0-6', storageAllocationBytes: 14992}) + '\n';
  await writeAtomic(file, bytes, {platform: 'win32', log: text => logs.push(text),
    io: {
      async writeFile(...args) {writes++; return fs.writeFile(...args);},
      async rename(source, destination) {
        sources.push(source); renames++;
        assert.equal(await fs.readFile(source, 'utf8'), bytes);
        if (renames <= 3) throw error(['EPERM', 'EACCES', 'EBUSY'][renames - 1]);
        return fs.rename(source, destination);
      },
    },
    async delay(ms) {
      delays.push(ms);
      assert.deepEqual(JSON.parse(await fs.readFile(file)), {previous: true});
    },
  });
  assert.equal(writes, 1); assert.equal(renames, 4); assert.equal(new Set(sources).size, 1);
  assert.deepEqual(delays, RENAME_DELAYS_MS.slice(0, 3));
  assert.equal(await fs.readFile(file, 'utf8'), bytes);
  assert.deepEqual(await fs.readdir(directory), ['reserved-gap.json']);
  assert.equal(logs.length, 2);
});

test('persistent locks stop at the limit and preserve both old report and pending snapshot', async t => {
  const {file} = await fixture(t);
  let attempts = 0;
  const delays = [];
  let failed;
  await assert.rejects(writeAtomic(file, '{"pending":true}\n', {platform: 'win32', log() {},
    io: {...fs, async rename() {attempts++; throw error('EPERM');}},
    async delay(ms) {delays.push(ms);},
  }), e => {failed = e; return e.code === 'EPERM' && e.cause.code === 'EPERM';});
  assert.equal(attempts, 10); assert.equal(failed.attempts, 10);
  assert.deepEqual(delays, RENAME_DELAYS_MS);
  assert.equal(delays.reduce((a, b) => a + b, 0), 4575);
  assert.match(failed.message, /Pending snapshot kept at/);
  assert.deepEqual(JSON.parse(await fs.readFile(file)), {previous: true});
  assert.deepEqual(JSON.parse(await fs.readFile(failed.temporaryFile)), {pending: true});
  await writeAtomic(file, '{"recovered":true}\n');
  assert.deepEqual(JSON.parse(await fs.readFile(file)), {recovered: true});
  assert.deepEqual(JSON.parse(await fs.readFile(failed.temporaryFile)), {pending: true});
});

test('non-Windows permission failures and unrelated errors are not retried', async t => {
  const {file} = await fixture(t);
  for (const [platform, code] of [['linux', 'EPERM'], ['darwin', 'EACCES'], ['win32', 'ENOSPC'], ['win32', 'ENOENT']]) {
    let renames = 0;
    await assert.rejects(writeAtomic(file, '{}', {platform, log() {},
      io: {...fs, async rename() {renames++; throw error(code);}},
      async delay() {assert.fail('Unexpected retry');},
    }), e => e.code === code && e.attempts === 1);
    assert.equal(renames, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(file)), {previous: true});
  }
});

test('a failed temporary write never attempts replacement', async t => {
  const {file} = await fixture(t);
  await assert.rejects(writeAtomic(file, '{}', {platform: 'win32',
    io: {async writeFile() {throw error('ENOSPC');}, async rename() {assert.fail('Cannot publish a failed write');}},
  }), {code: 'ENOSPC'});
  assert.deepEqual(JSON.parse(await fs.readFile(file)), {previous: true});
});

test('queued report snapshots keep call order and bigint values through a rename retry', async t => {
  const {file} = await fixture(t);
  let state = {value: 1n}, snapshots = 0, renames = 0, writes = 0;
  const published = [];
  const save = reportWriter(file, () => {snapshots++; return state;}, {
    write: (target, bytes) => writeAtomic(target, bytes, {platform: 'win32', log() {}, async delay() {},
      io: {
        async writeFile(...args) {writes++; return fs.writeFile(...args);},
        async rename(source, destination) {
          if (++renames === 1) throw error('EPERM');
          published.push(JSON.parse(await fs.readFile(source)).value);
          await fs.rename(source, destination);
        },
      },
    }),
  });
  const first = save(); state.value = 2n; const second = save(); state.value = 3n;
  await Promise.all([first, second]);
  assert.equal(snapshots, 2); assert.equal(writes, 2); assert.equal(renames, 3);
  assert.deepEqual(published, ['1', '2']);
  assert.deepEqual(JSON.parse(await fs.readFile(file)), {value: '2'});
});

test('the report queue remains usable for an error or cleanup snapshot after a failed publication', async t => {
  const {file} = await fixture(t);
  let state = {phase: 'before'}, blocked = true, failed;
  const save = reportWriter(file, () => state, {
    write: (target, bytes) => writeAtomic(target, bytes, {platform: 'win32', log() {}, async delay() {},
      io: {...fs, async rename(...args) {if (blocked) throw error('EPERM'); return fs.rename(...args);}},
    }),
  });
  await assert.rejects(save(), e => {failed = e; return e.code === 'EPERM';});
  blocked = false; state = {phase: 'cleanup', previousError: failed.code};
  await save();
  assert.deepEqual(JSON.parse(await fs.readFile(file)), state);
  assert.deepEqual(JSON.parse(await fs.readFile(failed.temporaryFile)), {phase: 'before'});
});

test('a transient failure at the recorded RunControl.begin checkpoint does not restart the action', async t => {
  const {file} = await fixture(t);
  let control, rejected = false, commands = 0;
  const save = reportWriter(file, () => control.state, {
    write: (target, bytes) => writeAtomic(target, bytes, {platform: 'win32', log() {}, async delay() {},
      io: {...fs, async rename(...args) {
        if (control.state.active && !rejected) {rejected = true; throw error('EPERM');}
        return fs.rename(...args);
      }},
    }),
  });
  control = new RunControl({id: 'replay-wN9MtU', save});
  await control.start();
  try {
    await control.begin('cache-combined-leak-0-7-0-6');
    commands++;
    await control.end('cache-combined-leak-0-7-0-6');
    assert.equal(rejected, true); assert.equal(commands, 1);
    assert.equal(JSON.parse(await fs.readFile(file)).checkpoint, 'after cache-combined-leak-0-7-0-6');
  } finally {await control.close();}
});
