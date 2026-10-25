const STALL_MS = 90000;
const HEARTBEAT_MS = 30000;
function createProgress() {
  return {lastProgressAt: null, lastSupervisorAt: null, waves: 0, events: []};
}
function recordProgress(progress, event, now) {
  if (event.kind === 'heartbeat') {progress.lastSupervisorAt = now; return;}
  if (!['report', 'error'].includes(event.kind)) progress.lastProgressAt = now;
  if (event.kind === 'wave') progress.waves++;
  progress.events.push({...event, at: new Date(now).toISOString()});
  if (progress.events.length > 8) progress.events.shift();
}
function progressView(progress, {now, active, stage}) {
  const idleMs = progress.lastProgressAt === null ? null : Math.max(0, now - progress.lastProgressAt);
  return {...progress, idleSeconds: idleMs === null ? null : Math.floor(idleMs / 1000),
    stalled: !!active && !!stage && idleMs !== null && idleMs >= STALL_MS,
    supervisorResponsive: progress.lastSupervisorAt !== null && now - progress.lastSupervisorAt < HEARTBEAT_MS};
}
module.exports = {createProgress, recordProgress, progressView};
