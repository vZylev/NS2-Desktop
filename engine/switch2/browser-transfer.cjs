const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {diskHash} = require('./game-export.cjs');
const {writeAtomic} = require('../shared/atomic-file.cjs');
async function capture(request, input, file, progress = () => {}) {
  const {size} = await request('size', input);
  if (!Number.isSafeInteger(size) || size < 0) throw Error('Invalid download size');
  const space = await fs.statfs(path.dirname(file));
  if (BigInt(space.bavail) * BigInt(space.bsize) < BigInt(size) + 16777216n) throw Error('Insufficient PC disk space');
  const temporary = file + '.' + crypto.randomUUID() + '.partial';
  const handle = await fs.open(temporary, 'wx', 0o600), digest = crypto.createHash('sha256');
  try {
    for (let offset = 0; offset < size;) {
      const length = Math.min(0x10000, size - offset), reply = await request('read', {...input, offset, length});
      const bytes = Buffer.from(reply.base64, 'base64');
      if (reply.size !== size || reply.offset !== offset || bytes.length !== length ||
          crypto.createHash('sha256').update(bytes).digest('hex') !== reply.sha256) throw Error('File block verification failed');
      const written = await handle.write(bytes, 0, length, offset);
      if (written.bytesWritten !== length) throw Error('Short local write');
      digest.update(bytes); offset += length;
      if (offset === size || offset % 4194304 === 0) progress(offset, size);
    }
    await handle.sync();
  } finally {await handle.close();}
  const sha256 = digest.digest('hex');
  if (await diskHash(temporary) !== sha256) throw Error('Local file verification failed');
  await fs.link(temporary, file); await fs.unlink(temporary);
  return {file, size, sha256};
}
function localPath(filename) {
  if (!filename.startsWith('/') || filename.split('/').some(x => ['.', '..'].includes(x)) || /[\\\0]/.test(filename)) throw Error('Invalid extraction path');
  return filename.slice(1).split('/').map(name => {
    let safe = name.replace(/[%<>:"|?*\x00-\x1f]|[. ]$/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = '%5f' + safe;
    if (!safe) throw Error('Empty extraction path component');
    return safe;
  }).join('/');
}
function extractionSelection(entries, mode = 'latest') {
  if (!['latest', 'all'].includes(mode)) throw Error('Invalid extraction mode');
  if (mode === 'all') return {entries, selectedRoot: null, excludedRoots: []};
  const updates = [...new Set(entries.map(row => /^\/updates\/(\d+)(?:\/|$)/.exec(row.path)?.[1]).filter(Boolean))];
  updates.sort((a, b) => BigInt(a) > BigInt(b) ? -1 : BigInt(a) < BigInt(b) ? 1 : 0);
  const selectedRoot = updates.length ? '/updates/' + updates[0] : '/base';
  const roots = ['/base', ...updates.map(version => '/updates/' + version)];
  return {selectedRoot, excludedRoots: roots.filter(root => root !== selectedRoot),
    entries: entries.filter(row => row.path === selectedRoot || row.path.startsWith(selectedRoot + '/') ||
      row.path === '/dlc' || row.path.startsWith('/dlc/'))};
}
async function exportGame(backend, output, progress = () => {}, {mode = 'latest'} = {}) {
  if (!backend.selected) throw Error('Select a game first');
  const selection = extractionSelection(backend.entries, mode);
  await fs.mkdir(output, {recursive: true});
  const directory = await fs.mkdtemp(path.join(output, backend.selected.title + '-'));
  const file = path.join(directory, 'extraction.json');
  const report = {engine: 'OunceCake', mode, selectedRoot: selection.selectedRoot, excludedRoots: selection.excludedRoots, started: new Date().toISOString(), game: backend.selected,
    absentSources: backend.absentSources, skippedSources: backend.skippedSources || [], complete: false, files: [], directories: []};
  const save = () => writeAtomic(file, JSON.stringify(report, null, 2));
  await save();
  try {
    const paths = new Set();
    const entries = selection.entries.filter(row => row.path !== '/').map(row => {
      const relative = localPath(row.path), key = relative.toLowerCase();
      if (paths.has(key)) throw Error('Case-insensitive output path collision: ' + row.path);
      paths.add(key); return {...row, relative};
    });
    const space = await fs.statfs(directory);
    const total = entries.reduce((n, row) => n + (row.type === 1 ? BigInt(row.size) : 0n), 0n);
    if (BigInt(space.bavail) * BigInt(space.bsize) < total + 16777216n) throw Error('Insufficient PC disk space');
    for (const row of entries) {
      const target = path.join(directory, row.relative);
      if (row.type === 0) {await fs.mkdir(target, {recursive: true}); report.directories.push({path: row.path, localPath: row.relative}); continue;}
      await fs.mkdir(path.dirname(target), {recursive: true});
      const result = await capture(backend.request, {source: 'game', path: row.path}, target,
        (done, size) => progress(row.path, done, size));
      report.files.push({path: row.path, localPath: row.relative, sizeBytes: String(result.size), sha256: result.sha256, metadata: row.metadata});
      await save();
    }
    report.complete = report.skippedSources.length === 0; report.completed = new Date().toISOString(); await save();
    return {file, directory, complete: report.complete, skippedSources: report.skippedSources, files: report.files.length};
  } catch (error) {report.error = error.message; await save(); throw error;}
}
module.exports = {capture, exportGame, localPath, extractionSelection};
