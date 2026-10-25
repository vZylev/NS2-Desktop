// OunceCake mounting with direct PC transfers through the existing session.
const path = require('node:path');
const crypto = require('node:crypto');
const {titleId} = require('./ouncecake/engine/protocol.cjs');
const check = (ok, message) => {if (!ok) throw Error(message);};
function gamePath(value) {
  check(typeof value === 'string' && value.startsWith('/') && !/[\\\0]/.test(value) &&
    !value.split('/').some(x => x === '..' || x === '.') && Buffer.byteLength(value) <= 4096, 'Invalid game path');
  return value.replace(/\/+$/, '') || '/';
}
function createIndex(prepared, game) {
  const rows = new Map([['/', {path: '/', type: 0, size: '0'}]]);
  function directory(filename) {
    if (rows.has(filename)) {check(rows.get(filename).type === 0, 'File/directory collision'); return;}
    directory(path.posix.dirname(filename));
    rows.set(filename, {path: filename, name: path.posix.basename(filename), type: 0, size: '0'});
  }
  for (const view of prepared.views) {
    directory(gamePath(view.path));
    for (const entry of view.entries) {
      const filename = gamePath(view.path + gamePath(entry.path));
      const source = prepared.sources[view.mount];
      check(source && [0, 1].includes(source.kind), 'Unsupported OunceCake source');
      check(Number.isSafeInteger(entry.size) && entry.size >= 0, 'Invalid OunceCake file size');
      if (entry.type === 'directory') directory(filename);
      else {
        check(entry.type === 'file' && !rows.has(filename), 'Duplicate or invalid game entry');
        directory(path.posix.dirname(filename));
        rows.set(filename, {path: filename, name: path.posix.basename(filename), type: 1, size: String(entry.size),
          source, sourcePath: entry.path, offset: entry.offset || 0,
          metadata: {titleId: game.title, title: game.name || null, titleSource: game.name ? 'console-control-metadata' : null,
            contentId: view.source.contentId, contentTitleId: view.source.contentTitle || game.title,
            version: view.source.version, storage: view.source.storage,
            section: view.path, selection: view.source.selection || 'base', origin: 'OunceCake-mounted-filesystem'}});
      }
    }
  }
  const children = new Map();
  for (const row of rows.values()) {
    if (row.path === '/') continue;
    const parent = path.posix.dirname(row.path);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(row);
  }
  return {rows, children};
}
function createBackend(run, dependencies = {}) {
  const attach = dependencies.attach || require('./ouncecake/engine/session.cjs').attachGame;
  const discover = dependencies.discover || require('./ouncecake/engine/content.cjs').discoverGames;
  const prepare = dependencies.prepare || require('./ouncecake/engine/mounts.cjs').prepareGame;
  let attachment, games = [], index, selected, absentSources = [];
  async function ensure() {return attachment ||= await attach(run);}
  async function close() {
    if (attachment) {await attachment.close(); attachment = null;}
    index = null; selected = null; absentSources = [];
  }
  async function request(command, input = {}) {
    if (command === 'games') {games = await discover(await ensure()); return {games};}
    if (command === 'select') {
      const title = titleId(input.title);
      await close();
      const candidate = games.find(game => game.title === title) || {title, name: null};
      const prepared = await prepare({attachment: await ensure(), title, keepDlcOpen: true});
      index = createIndex(prepared, candidate); selected = candidate; absentSources = prepared.absentSources || [];
      return {selected, files: [...index.rows.values()].filter(row => row.type === 1).length, absentSources};
    }
    if (command === 'close') {await close(); return {closed: true};}
    if (command === 'mount') return {source: 'game', available: !!index, result: index ? 0 : 'Select a game first'};
    check(index, 'Select a game first');
    const filename = gamePath(input.path), row = index.rows.get(filename);
    if (!row) throw Object.assign(Error('Game path unavailable'), {unavailable: true});
    if (command === 'list') {
      check(row.type === 0, 'Not a game directory');
      const offset = input.offset ?? 0;
      check(Number.isSafeInteger(offset) && offset >= 0, 'Invalid directory offset');
      const children = index.children.get(filename) || [], slice = children.slice(offset, offset + 128);
      return {entries: slice.map(({name, type, size, metadata}) => ({name, type, size, metadata})),
        next: offset + slice.length < children.length ? offset + slice.length : null};
    }
    check(row.type === 1, 'Not a game file');
    const size = Number(row.size);
    if (command === 'size') return {size};
    check(command === 'read', 'Unknown game browser command');
    const {offset, length} = input;
    check(Number.isSafeInteger(offset) && offset >= 0 && Number.isInteger(length) && length > 0 && length <= 0x10000 && offset + length <= size, 'Invalid game file range');
    const a = await ensure(); let bytes;
    if (row.source.kind === 0) bytes = await a.filesystem.readStorage(a.s, row.source.handle, row.offset + offset, length);
    else {
      const opened = await a.filesystem.openFile(a.s, row.source.handle, row.sourcePath);
      check(!opened.result && opened.handle, 'Game file could not open');
      bytes = await a.filesystem.readFile(a.s, opened.handle, offset, length);
      await a.s.close(opened.handle);
    }
    check(bytes.length === length, 'Short OunceCake file read');
    return {size, offset, length, base64: bytes.toString('base64'), sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  }
  return {request, close, get selected() {return selected;}, get entries() {return index ? [...index.rows.values()] : [];},
    get absentSources() {return absentSources;}, validatePath: gamePath};
}
module.exports = {createBackend, createIndex, gamePath};
