const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
const {createProgress, recordProgress, progressView} = require('./progress.cjs');
const {progressText} = require('./app.js');
const {createApp} = require('./server.cjs');
const {progressLine} = require('../engine/shared/progress.cjs');

test('heartbeats and file warnings cannot hide a lack of console progress', () => {
  const p = createProgress();
  recordProgress(p, {kind: 'phase', profile: 'acquire'}, 1000);
  recordProgress(p, {kind: 'heartbeat'}, 91000);
  recordProgress(p, {kind: 'report', message: 'EPERM retry'}, 91000);
  const view = progressView(p, {now: 91000, active: true, stage: '2/4 Acquiring FS memory'});
  assert.equal(view.stalled, true); assert.equal(view.idleSeconds, 90); assert.equal(view.supervisorResponsive, true);
  assert.equal(p.events.length, 2);
  assert.equal(progressView(p, {now: 121000, active: true, stage: '2/4 Acquiring FS memory'}).supervisorResponsive, false);
  for (const [active, stage] of [[false, '2/4 Acquiring FS memory'], [true, '']])
    assert.equal(progressView(p, {now: 121000, active, stage}).stalled, false);
  recordProgress(p, {kind: 'prepared', profile: 'extent-present'}, 121000);
  assert.equal(progressView(p, {now: 121000, active: true, stage: '2/4 Acquiring FS memory'}).stalled, false);
});

test('recent activity stays bounded and both languages describe measurements accurately', () => {
  const p = createProgress();
  for (let i = 0; i < 20; i++) recordProgress(p, {kind: 'wave', profile: 'positive', outcome: 'observed'}, i * 1000);
  assert.equal(p.waves, 20); assert.equal(p.events.length, 8);
  assert.match(progressText(p.events[0], 'es'), /Iteración registrada: positive.*medición registrada/);
  assert.match(progressText(p.events[0], 'en'), /Iteration recorded: positive.*measurement recorded/);
  assert.match(progressText({kind: 'report', message: 'EPERM'}, 'es'), /Guardando informe local: EPERM/);
});

test('desktop streams stage 2 activity, shows stalls and clears them when progress returns', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-live-progress-'));
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  let now = 1000;
  const app = await createApp({dataRoot: directory, port: 0, runner: () => child, now: () => now});
  t.after(async () => {
    child.stdout.end(); child.stderr.end(); app.server.closeAllConnections(); app.server.close();
    await fs.rm(directory, {recursive: true, force: true});
  });
  const base = new URL(app.url).origin;
  const headers = {authorization: 'Bearer ' + app.token, 'Content-Type': 'application/json'};
  const state = async () => (await fetch(base + '/api/state', {headers})).json();
  await fetch(base + '/api/start', {method: 'POST', headers, body: JSON.stringify({mode: 'demo', host: '127.0.0.1'})});
  child.stdout.write('2/4 Acquiring FS memory\n' + progressLine({kind: 'prepared', profile: 'positive'}) + '\n' +
    progressLine({kind: 'wave', profile: 'positive', outcome: 'observed'}) + '\n');
  await new Promise(setImmediate);
  let current = await state();
  assert.equal(current.progress.waves, 1); assert.equal(current.progress.stalled, false);
  assert.ok(current.lines.some(line => line.text.includes('positive')));
  now = 91000;
  child.stdout.write(progressLine({kind: 'heartbeat'}) + '\n');
  child.stderr.write('Report: EPERM; retrying local rename\n');
  await new Promise(setImmediate);
  current = await state();
  assert.equal(current.progress.stalled, true); assert.equal(current.progress.supervisorResponsive, true);
  assert.equal(current.progress.events.at(-1).kind, 'report');
  assert.ok(current.lines.every(line => !line.text.includes('heartbeat')));
  child.stdout.write(progressLine({kind: 'prepared', profile: 'extent-present'}) + '\n');
  await new Promise(setImmediate);
  assert.equal((await state()).progress.stalled, false);
  for (const message of ['1/4 Checking application', '3/4 Starting helper', '4/4 Running operation',
    'Games: inventory received', 'Games: reading sample', 'Games: writing file', 'Firmware: verifying file']) {
    now += 100000;
    child.stdout.write(message + '\n');
    await new Promise(setImmediate);
    current = await state();
    assert.equal(current.progress.stalled, false);
    assert.equal(current.progress.events.at(-1).message, message);
    assert.ok(current.lines.some(line => line.text === message));
  }
  now += 100000; child.emit('close', 1);
  current = await state();
  assert.equal(current.status, 'failed'); assert.equal(current.progress.stalled, false);
});

 test('lack of activity is reported in every numbered stage', () => {
  for (const stage of ['1/4 Checking', '2/4 Preparing', '3/4 Starting', '4/4 Running']) {
    const p = createProgress();
    recordProgress(p, {kind: 'detail', message: 'Working'}, 1000);
    assert.equal(progressView(p, {now: 91000, active: true, stage}).stalled, true);
    recordProgress(p, {kind: 'detail', message: 'Next operation'}, 91000);
    assert.equal(progressView(p, {now: 91000, active: true, stage}).stalled, false);
  }
});
