// Read-only access through the retained FS root. Never accepts arbitrary handles.
const crypto = require('node:crypto');
const check = (ok, message) => {if (!ok) throw Error(message);};
function validatePath(value) {
  check(typeof value === 'string' && value.startsWith('/') && !value.includes('\0') &&
    !value.includes('\\') && !value.split('/').includes('..') && Buffer.byteLength(value) < 0x301, 'Invalid filesystem path');
  return value;
}
async function dispatch({s, report, save}, request, state, io) {
  const {pathMethod, domain} = io || {pathMethod: require('../app/filesystem.cjs').pathMethod, domain: require('../app/domain.cjs')};
  check(!s.threads.size && state.worker?.joined, 'File browsing requires an idle native worker');
  const command = request.command.slice('root-native-browser-'.length);
  state.browserMounts ||= [];
  if (command === 'close') {
    for (const mount of state.browserMounts) if (s.handles.has(mount.handle)) await s.close(mount.handle);
    state.browserMounts = []; await save(); return {closed: true};
  }
  if (command === 'mount') {
    const source = request.source;
    check(['sd', 'user', 'system'].includes(source), 'Invalid filesystem source');
    const previous = state.browserMounts.find(x => x.source === source && s.handles.has(x.handle));
    if (previous) return previous;
    const root = report.ownedRoot?.clones[0];
    check(report.ownedRoot?.initialized && s.handles.has(root), 'Owned FS root is unavailable');
    const input = Buffer.alloc(4); input.writeUInt32LE(source === 'user' ? 30 : 31);
    const reply = source === 'sd' ? await s.ipc('Browser OpenSdCardFileSystem', root, 18) :
      await pathMethod(s, root, 11, '/', input);
    if (reply.result) return {source, available: false, result: reply.canonicalResult};
    const mount = {source, available: true, handle: domain.oneHandle(reply)};
    state.browserMounts.push(mount); await save(); return mount;
  }
  const mount = state.browserMounts.find(x => x.source === request.source && s.handles.has(x.handle));
  check(mount, 'Filesystem is not mounted');
  const filename = validatePath(request.path);
  if (command === 'list') {
    const offset = request.offset ?? 0;
    check(Number.isSafeInteger(offset) && offset >= 0, 'Invalid directory offset');
    const mode = Buffer.alloc(4); mode.writeUInt32LE(3);
    const opened = await pathMethod(s, mount.handle, 9, filename, mode);
    if (opened.result) return {unavailable: 'Directory unavailable: ' + opened.canonicalResult};
    const handle = domain.oneHandle(opened), entries = [];
    let seen = 0, more = false;
    for (;;) {
      const reply = await s.ipc('Browser ReadDirectory', handle, 0, Buffer.alloc(0),
        {receive: [{address: s.base + 0x4000, size: 4 * 0x310, mode: 0}]});
      check(!reply.result, 'Directory read failed');
      const count = Number(reply.data.readBigUInt64LE());
      check(count >= 0 && count <= 4, 'Invalid directory count');
      if (!count) break;
      const bytes = await s.readOwned(s.base + 0x4000, count * 0x310);
      for (let i = 0; i < count; i++) {
        if (seen++ < offset) continue;
        if (entries.length === 128) {more = true; break;}
        const entry = bytes.subarray(i * 0x310, (i + 1) * 0x310);
        const name = entry.subarray(0, 0x301).toString('utf8').split('\0')[0];
        check(name && !/[\\/]/.test(name) && !['.', '..'].includes(name), 'Invalid directory entry');
        entries.push({name, type: entry[0x304], size: entry.readBigUInt64LE(0x308).toString()});
      }
      if (more) break;
    }
    await s.close(handle); return {entries, next: more ? offset + entries.length : null};
  }
  check(command === 'read' || command === 'size', 'Unknown browser command');
  const mode = Buffer.alloc(4); mode.writeUInt32LE(1);
  const opened = await pathMethod(s, mount.handle, 8, filename, mode);
  if (opened.result) return {unavailable: 'File unavailable: ' + opened.canonicalResult};
  const handle = domain.oneHandle(opened);
  const sizeReply = await s.ipc('Browser GetSize', handle, 4);
  check(!sizeReply.result, 'File size failed');
  const size = Number(sizeReply.data.readBigUInt64LE());
  check(Number.isSafeInteger(size) && size >= 0, 'File size exceeds supported range');
  if (command === 'size') {await s.close(handle); return {size};}
  const {offset, length} = request;
  check(Number.isSafeInteger(offset) && offset >= 0 && Number.isInteger(length) && length > 0 &&
    length <= 0x10000 && offset + length <= size, 'Invalid read range');
  const input = Buffer.alloc(24); input.writeBigUInt64LE(BigInt(offset), 8); input.writeBigUInt64LE(BigInt(length), 16);
  const reply = await s.ipc('Browser ReadFile', handle, 0, input,
    {receive: [{address: s.base + 0x4000, size: length, mode: 1}]});
  check(!reply.result && reply.data.readBigUInt64LE() === BigInt(length), 'File read failed or was short');
  const bytes = await s.readOwned(s.base + 0x4000, length);
  await s.close(handle);
  return {size, offset, length, base64: bytes.toString('base64'), sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
}
module.exports = {dispatch, validatePath};
