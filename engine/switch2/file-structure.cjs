// Stream a read-only inventory; file contents are never requested.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {validatePath} = require('./ro/browser.cjs');

function metadata(filename, catalog) {
  const ids = [...new Set((filename.match(/(?:^|[^0-9a-f])(?:0x)?([0-9a-f]{16})(?=$|[^0-9a-f])/gi) || [])
    .map(value => value.match(/(?:0x)?([0-9a-f]{16})$/i)?.[1].toLowerCase()).filter(Boolean))];
  const name = path.posix.basename(filename);
  return {extension: path.posix.extname(name) || null,
    contentId: /^([0-9a-f]{32})(?:\.cnmt)?\.nca$/i.exec(name)?.[1].toLowerCase() || null,
    titleCandidates: ids.map(id => ({id, title: Object.hasOwn(catalog, id) ? catalog[id] : null,
      idSource: 'path-heuristic', titleSource: Object.hasOwn(catalog, id) ? 'local-catalog' : null}))};
}

async function exportStructure({request, output, catalog = {}, progress = () => {}, sources = ['sd', 'user', 'system'], pathValidator = validatePath, context}) {
  await fs.mkdir(output, {recursive: true});
  const file = path.join(output, 'structure-' + crypto.randomUUID() + '.json');
  const temporary = file + '.partial';
  const handle = await fs.open(temporary, 'wx', 0o600);
  const summary = {files: 0, directories: 0, totalFileBytes: '0', errors: 0};
  const storages = [];
  let first = true, fatal, currentSource = null, currentPath = '/';
  const write = text => handle.writeFile(text, 'utf8');
  const row = async value => {
    await write((first ? '' : ',\n') + JSON.stringify(value)); first = false;
  };
  const recordError = async (source, filename, message) => {
    summary.errors++;
    await row({record: 'error', source, path: filename, error: message});
  };
  try {
    await write(JSON.stringify({schemaVersion: 1, started: new Date().toISOString(),
      scope: {sources, root: '/', recursive: true}, context,
      metadataNotes: ['Sizes are exact decimal byte strings; directory sizes are not measured.',
        'Title IDs inferred from paths are candidates, not verified title associations. Names come from the local catalog when available.',
        'Console title metadata, when present, is labeled console-control-metadata. Timestamps and file contents are not exported. This is a live traversal, not an atomic snapshot.']}).slice(0, -1) + ',\n"entries":[\n');
    try {
      for (const source of sources) {
        currentSource = source; currentPath = '/';
        const mount = await request('mount', {source});
        const storage = {source, available: !!mount.available, complete: false}; storages.push(storage);
        const errorsBefore = summary.errors;
        if (!mount.available) {
          await recordError(source, '/', 'Storage unavailable: ' + mount.result); continue;
        }
        const stack = ['/'];
        while (stack.length) {
          const folder = stack.pop(); currentPath = folder;
          let offset = 0;
          do {
            let listing;
            try {
              pathValidator(folder);
              listing = await request('list', {source, path: folder, offset});
            } catch (error) {
              if (error.nativeUncertain) throw error;
              if (!error.unavailable && error.message !== 'Invalid filesystem path') throw error;
              await recordError(source, folder, error.message); break;
            }
            for (const entry of listing.entries) {
              if (!entry.name || /[\\/\0]/.test(entry.name) || ['.', '..'].includes(entry.name)) throw Error('Invalid inventory entry name');
              const filename = folder.replace(/\/$/, '') + '/' + entry.name;
              const directory = entry.type === 0, isFile = entry.type === 1;
              if (isFile && !/^\d+$/.test(entry.size)) throw Error('Invalid inventory size');
              await row({record: 'entry', source, path: filename, parent: folder, name: entry.name,
                type: directory ? 'directory' : isFile ? 'file' : 'unknown', nativeType: entry.type,
                sizeBytes: isFile ? String(entry.size) : null, metadata: {...metadata(filename, catalog), ...entry.metadata}});
              if (directory) {summary.directories++; stack.push(filename);}
              else if (isFile) {summary.files++; summary.totalFileBytes = (BigInt(summary.totalFileBytes) + BigInt(entry.size)).toString();}
              else await recordError(source, filename, 'Unknown entry type; not traversed');
            }
            const next = listing.next;
            if (next !== null && (!Number.isSafeInteger(next) || next <= offset)) throw Error('Directory pagination did not advance');
            offset = next;
            progress({...summary, source, path: folder});
          } while (offset !== null);
        }
        storage.complete = summary.errors === errorsBefore;
      }
    } catch (error) {
      fatal = error;
      await recordError(currentSource, currentPath, error.message);
    }
    const complete = !fatal && storages.length === sources.length && storages.every(item => item.complete);
    await write('\n],\n' + JSON.stringify({completed: new Date().toISOString(), complete, storages, summary}).slice(1));
    await handle.sync();
  } finally {await handle.close();}
  await fs.rename(temporary, file);
  if (fatal) {fatal.message += ' (Partial inventory: ' + file + ')'; throw fatal;}
  return {file, complete: storages.every(item => item.complete), summary};
}
module.exports = {exportStructure, metadata};
