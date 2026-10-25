const test = require('node:test');
const assert = require('node:assert/strict');
const {fromAcquisition, parseProgress, progressLine, forwardLine} = require('./progress.cjs');

test('acquisition events distinguish measurements, timing misses and native aborts without claiming success', () => {
  assert.deepEqual(fromAcquisition({stage: 'prepared', profile: 'positive'}), {kind: 'prepared', profile: 'positive'});
  const row = {profile: 'positive', rows: [], restored: true, allPending: true};
  assert.deepEqual(fromAcquisition(row), {kind: 'wave', profile: 'positive', outcome: 'observed'});
  assert.equal(fromAcquisition({...row, triggerAborted: true}).outcome, 'aborted');
  assert.equal(fromAcquisition({...row, allPending: false}).outcome, 'timing-miss');
  assert.equal(fromAcquisition({...row, restored: false}).outcome, 'heap-drift');
  assert.deepEqual(fromAcquisition({stage: 'bounded-failure', error: 'EPERM'}), {kind: 'error', message: 'EPERM'});
  assert.equal(fromAcquisition(null), null);
});

test('the root runner forwards compact progress and report errors but not raw memory reports', () => {
  for (const event of [{kind: 'heartbeat'}, {kind: 'prepared', profile: 'extent-present'},
    {kind: 'report', message: 'Report: EPERM; retrying local rename'}]) {
    const line = progressLine(event);
    assert.equal(forwardLine(line), true); assert.deepEqual(parseProgress(line), event);
  }
  for (const line of ['inspect mounts', 'copy loader', 'Games: inventory', 'Firmware: verifying'])
    assert.equal(forwardLine(line), true);
  assert.equal(forwardLine(''), false);
  assert.equal(forwardLine('Report: published after 2 rename attempts.'), true);
  assert.equal(forwardLine('Error: Report replacement failed after 10 attempts (EPERM)'), true);
  assert.equal(forwardLine('{"profile":"positive","rows":[1,2,3]}'), false);
  assert.equal(forwardLine('NS2_PROGRESS {broken'), false);
  assert.equal(forwardLine(progressLine({kind: 'unknown'})), false);
  assert.equal(parseProgress('NS2_PROGRESS null'), null);
  const parsed = parseProgress(progressLine({kind: 'phase', profile: 'a'.repeat(1000), ignored: 'private'}));
  assert.equal(parsed.profile.length, 160); assert.equal(parsed.ignored, undefined);
});
