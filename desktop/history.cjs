const fs = require('node:fs/promises');
const path = require('node:path');

async function runPath(dataRoot, id, title) {
  if (!/^switch2-[a-zA-Z0-9_-]+$/.test(id || '')) throw Error('invalidRun');
  if (title !== undefined && !/^[0-9a-f]{16}$/.test(title)) throw Error('invalidTitle');
  const root = await fs.realpath(path.join(dataRoot, 'runs'));
  const run = path.join(root, id);
  const target = title ? path.join(run, 'games', title) : run;
  // Require every component to resolve exactly as expected: no outside/symlink folders.
  if (await fs.realpath(target) !== target || !(await fs.stat(target)).isDirectory()) throw Error('invalidRun');
  return target;
}
async function readJSON(file) {
  try {
    if (await fs.realpath(file) !== path.resolve(file)) return null;
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) return null;
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}
async function history(dataRoot, activeRun = '') {
  const activeDirectory = activeRun ? await fs.realpath(activeRun).catch(() => '') : '';
  const root = path.join(dataRoot, 'runs');
  let dirs;
  try {dirs = await fs.readdir(root, {withFileTypes: true});} catch (error) {if (error.code === 'ENOENT') return []; throw error;}
  const rows = [];
  for (const dir of dirs) {
    if (!dir.isDirectory() || !/^switch2-[a-zA-Z0-9_-]+$/.test(dir.name)) continue;
    const directory = await runPath(dataRoot, dir.name);
    const [session, result, batch, single, stat] = await Promise.all([
      readJSON(path.join(directory, 'desktop-summary.json')), readJSON(path.join(directory, 'result.json')),
      readJSON(path.join(directory, 'games/game-export-batch.json')), readJSON(path.join(directory, 'games/game-export.json')),
      fs.stat(directory)
    ]);
    const active = activeDirectory === directory;
    const titles = (Array.isArray(batch?.titles) ? batch.titles : (single?.selected?.key?.id ? [{title: single.selected.key.id,
      status: single.complete ? 'complete' : single.error ? 'failed' : 'running'}] :
      (Array.isArray(session?.titles) ? session.titles : []).map(title => ({title, status: 'pending'})))).map(row => {
      row ||= {};
      const title = String(row.title).replace(/^0x/i, '').toLowerCase();
      let status = ['pending','running','complete','failed'].includes(row.status) ? row.status : 'unknown';
      if (!active && status === 'running') status = 'interrupted';
      return {title, status, error: row.error || '', folder: !!batch};
    }).filter(row => /^[0-9a-f]{16}$/.test(row.title));
    rows.push({id: dir.name, started: String(session?.started || result?.started || batch?.started || single?.started || stat.mtime.toISOString()),
      mode: session?.mode || batch?.mode || single?.mode || '',
      status: active ? 'running' : session?.status === 'failed' || result?.error || result?.cleanupErrors?.length ? 'failed' :
        session?.status === 'complete' || result?.verified ? 'complete' : 'interrupted', titles});
  }
  return rows.sort((a,b) => b.started.localeCompare(a.started));
}
module.exports = {runPath, history, readJSON};
