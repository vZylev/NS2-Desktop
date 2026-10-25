const test = require('node:test');
const assert = require('node:assert/strict');
const {accountWave, qualifyPin, qualifyCandidate} = require('./storage-accounting.cjs');

// Only counters and timing from 5dq4k3t.7z: no connection tokens, user paths,
// executable captures, or console memory. All five reports stopped on wave 1.
const observations = [
  {run: '4d1GGN', baseline: 3349264, after: 3334272,
    pin: [2798.944, 18434.784], canary: [1695.712, 20001.472], timing: true},
  {run: '6NM0xk', baseline: 3349264, after: 3334272,
    pin: [2798.848, 18317.28], canary: [1700.576, 20553.728], timing: true},
  {run: 'PIsKhH', baseline: 3235152, after: 3220160,
    pin: [2796.704, 19320.96], canary: [1694.208, 20794.176], timing: true},
  {run: 'QQiHFO', baseline: 3349264, after: 3334272,
    pin: [2797.472, 16082.912], canary: [1694.976, 1857.056], timing: false},
  {run: 'yTVrC3', baseline: 3349264, after: 3334272,
    pin: [2798.752, 17806.912], canary: [1695.264, 20928.448], timing: true},
];

function pinRow({baseline, after, pin, canary}) {
  return {...accountWave(baseline, after, true), rows: [
    {role: 'pin', result: 0, startUs: pin[0], endUs: pin[1]},
    {role: 'canary', result: 0, startUs: canary[0], endUs: canary[1]},
  ]};
}

for (const observation of observations) test('replays pin accounting and timing: ' + observation.run, () => {
  const row = pinRow(observation);
  assert.equal(row.newPersistentBytes, 14992);
  assert.equal(row.restored, true);
  // The old accounting classified every supplied observation as unrestored.
  assert.notEqual(observation.after + 13616, observation.baseline);
  if (observation.timing) assert.equal(qualifyPin(row), 14992);
  else assert.throws(() => qualifyPin(row), /while the canary was pending/);
});

test('retains the original 13616-byte profile and requires the same candidate cost', () => {
  const baseline = 3349264;
  const row = pinRow({...observations[0], baseline, after: baseline - 13616});
  assert.equal(row.restored, true);
  const bytes = qualifyPin(row);
  assert.equal(bytes, 13616);
  assert.doesNotThrow(() => qualifyCandidate(13616, bytes));
  assert.throws(() => qualifyCandidate(14992, bytes), /observed 14992.*expected 13616/);
});

test('candidate must match the qualified pin even when both sizes are known', () => {
  const bytes = qualifyPin(pinRow(observations[0]));
  assert.doesNotThrow(() => qualifyCandidate(14992, bytes));
  assert.throws(() => qualifyCandidate(13616, bytes), /observed 13616.*expected 14992/);
  assert.throws(() => qualifyCandidate(14993, bytes), /observed 14993.*expected 14992/);
  assert.throws(() => qualifyCandidate(14992, undefined), /not qualified/);
});

test('unknown costs and inconsistent reports cannot qualify a pin', () => {
  for (const bytes of [0, -16, 13615, 13617, 14991, 14993, 16384]) {
    const row = pinRow({...observations[0], after: observations[0].baseline - bytes});
    assert.equal(row.restored, false);
    assert.throws(() => qualifyPin(row), /Pinning allocation cost changed: observed/);
  }
  const row = pinRow(observations[0]);
  row.newPersistentBytes = 13616;
  assert.throws(() => qualifyPin(row), /Pinning allocation cost changed/);
});

test('later waves require exact restoration without another pin allowance', () => {
  for (const pinBytes of [13616, 14992]) {
    const baseline = 3349264 - pinBytes;
    assert.deepEqual(accountWave(baseline, baseline, false),
      {baseline, after: baseline, newPersistentBytes: 0, restored: true});
    for (const drift of [-14992, -13616, -1, 1, 13616, 14992])
      assert.equal(accountWave(baseline, baseline + drift, false).restored, false);
  }
  for (const bad of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => accountWave(bad, 0, true), /Invalid gap allocation counters/);
});

test('known costs do not excuse failed pins or timing boundary violations', () => {
  for (const change of [
    row => {row.rows[0].result = 1;},
    row => {row.rows[0].startUs = row.rows[1].startUs;},
    row => {row.rows[0].endUs = row.rows[1].endUs;},
    row => {row.rows[0].endUs = row.rows[0].startUs - 1;},
  ]) {
    const row = pinRow(observations[0]);
    change(row);
    assert.throws(() => qualifyPin(row), /while the canary was pending/);
  }
});
