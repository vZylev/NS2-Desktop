const PREFIX = 'NS2_PROGRESS ';
const KINDS = new Set(['phase', 'connected', 'prepared', 'wave', 'retry', 'memory-ready', 'report', 'error', 'heartbeat']);

function progressLine(event) {return PREFIX + JSON.stringify(event);}
function emitProgress(event) {console.log(progressLine(event));}
function parseProgress(line) {
  if (!line.startsWith(PREFIX) || line.length > 4096) return null;
  try {
    const value = JSON.parse(line.slice(PREFIX.length));
    if (!value || !KINDS.has(value.kind)) return null;
    const event = {kind: value.kind};
    for (const key of ['profile', 'message', 'outcome'])
      if (typeof value[key] === 'string') event[key] = value[key].slice(0, key === 'message' ? 800 : 160);
    return event;
  } catch {return null;}
}

function fromAcquisition(row) {
  if (!row || typeof row !== 'object') return null;
  if (['connected', 'prepared', 'memory-ready'].includes(row.stage))
    return {kind: row.stage, profile: row.profile};
  if (row.stage === 'field-copy-retry') return {kind: 'retry', profile: row.name};
  if (row.stage === 'bounded-failure') return {kind: 'error', message: row.error};
  if (typeof row.profile === 'string' && Array.isArray(row.rows))
    return {kind: 'wave', profile: row.profile, outcome: row.triggerAborted ? 'aborted' :
      !row.restored ? 'heap-drift' : !row.allPending ? 'timing-miss' : 'observed'};
  return null;
}

function forwardLine(line) {
  if (line.startsWith(PREFIX)) return !!parseProgress(line);
  // Keep large structured reports in run.log; display ordinary operation messages in every mode.
  return !!line.trim() && line.length <= 4096 && !/^\s*[\[{]/.test(line);
}

module.exports = {emitProgress, progressLine, parseProgress, fromAcquisition, forwardLine};
