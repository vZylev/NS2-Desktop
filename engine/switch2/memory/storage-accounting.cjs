// Observed general-heap costs, not firmware identifiers or layout guarantees.
// 13616 is the original capture; 14992 recurs in the supplied 5dq4k3t.7z runs.
const STORAGE_ALLOCATION_BYTES = Object.freeze([13616, 14992]);
const check = (ok, message) => {if (!ok) throw Error(message);};

function accountWave(baseline, after, createPin) {
  check(Number.isSafeInteger(baseline) && baseline >= 0 &&
    Number.isSafeInteger(after) && after >= 0 && typeof createPin === 'boolean',
  'Invalid gap allocation counters');
  const difference = baseline - after;
  return {baseline, after, newPersistentBytes: createPin ? difference : 0,
    // Once the pin is retained it is already in the next group's baseline.
    // Later waves must return to that baseline exactly, with no allowance.
    restored: createPin ? STORAGE_ALLOCATION_BYTES.includes(difference) : difference === 0};
}

function qualifyPin(row) {
  const pin = row.rows.find(item => item.role === 'pin');
  const canary = row.rows.find(item => item.role === 'canary');
  check(pin && canary && !pin.result && canary.startUs < pin.startUs &&
    pin.startUs <= pin.endUs && pin.endUs < canary.endUs,
  'Pinning storage was not created while the canary was pending');
  const bytes = row.baseline - row.after;
  check(row.newPersistentBytes === bytes && STORAGE_ALLOCATION_BYTES.includes(bytes),
    'Pinning allocation cost changed: observed ' + bytes +
    ' bytes; supported observations: ' + STORAGE_ALLOCATION_BYTES.join(', '));
  return bytes;
}

function qualifyCandidate(bytes, pinBytes) {
  check(STORAGE_ALLOCATION_BYTES.includes(pinBytes), 'Pinning allocation was not qualified');
  check(bytes === pinBytes, 'Candidate allocation cost differs: observed ' + bytes +
    ' bytes; expected ' + pinBytes + ' bytes from this session\'s pin');
}

module.exports = {STORAGE_ALLOCATION_BYTES, accountWave, qualifyPin, qualifyCandidate};
