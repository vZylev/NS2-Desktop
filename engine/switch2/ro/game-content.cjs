// Read-only NCM operations. Protocol layouts follow switchbrew/libnx ncm.c.
const {listInput, parse} = require('./ncm.cjs');
const crypto = require('node:crypto');
const check = (ok, message) => {if (!ok) throw Error(message);};
const STORAGES = [2, 4, 5];
const TYPES = [0x80, 0x81, 0x82, 0x84];
const CHUNK = 0x10000;

function contentInfos(bytes, count) {
  check(Number.isInteger(count) && count >= 0 && count <= bytes.length / 24,
    'Invalid NCM content count');
  return Array.from({length: count}, (_, i) => {
    const at = i * 24;
    return {id: bytes.subarray(at, at + 16).toString('hex'),
      size: bytes.readUIntLE(at + 16, 5), attributes: bytes[at + 21],
      type: bytes[at + 22], idOffset: bytes[at + 23]};
  });
}

async function dispatch(context, request, state) {
  const {s, save} = context;
  check(!s.threads.size && state.worker?.joined, 'Game access requires an idle native worker');
  const command = request.command.slice('root-native-'.length);
  check(['game-read', 'game-close', 'game-inventory', 'game-open'].includes(command), 'Unknown game operation');
  state.gameReaders ||= [];
  if (command === 'game-read' || command === 'game-close') {
    const reader = state.gameReaders.find(item => item.handle === request.handle);
    check(reader && s.handles.has(reader.handle), 'Game reader is not owned');
    if (command === 'game-close') {
      await s.close(reader.handle);
      state.gameReaders = state.gameReaders.filter(item => item !== reader);
      await save();
      return {closed: true};
    }
    const content = reader.contents.find(item => item.id === request.id);
    const {offset, length} = request;
    check(content && Number.isSafeInteger(offset) && offset >= 0 && Number.isInteger(length) &&
      length > 0 && length <= CHUNK && offset + length <= content.size, 'Invalid game read range');
    const address = s.base + 0x4000;
    check(address + length <= s.base + s.bytes, 'Game buffer exceeds owned allocation');
    const input = Buffer.alloc(24);
    Buffer.from(content.id, 'hex').copy(input); input.writeBigInt64LE(BigInt(offset), 16);
    await s.write(address, Buffer.alloc(length, 0xa5));
    const reply = await s.ipc('NCM ReadContentIdFile', reader.handle, 18, input,
      {receive: [{address, size: length, mode: 0}]});
    // An explicit service failure is returned; transport exceptions propagate.
    if (reply.result) return {result: reply.canonicalResult, id: content.id, offset, length};
    const bytes = await s.readOwned(address, length);
    return {result: 0, id: content.id, offset, length, base64: bytes.toString('base64'),
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  }
  const handle = request.handle;
  check(state.services?.some(item => item.name === 'ncm' && item.handle === handle) &&
    s.handles.has(handle), 'An owned NCM service is required');
  const storage = request.storage;
  check(STORAGES.includes(storage), 'Game storage must be GameCard (2), USER (4), or SD (5)');
  const opened = await s.ipc('NCM OpenContentMetaDatabase game storage', handle, 5, Buffer.from([storage]));
  if (opened.result) return {storage, result: opened.canonicalResult, available: false};
  check(opened.moves.length === 1 && !opened.copies.length, 'NCM database handle differs');
  const database = opened.moves[0], address = s.base + 0x4000;
  check(address + 16384 <= s.base + s.bytes, 'NCM output exceeds owned allocation');
  // Close only after all native operations have completed successfully. An
  // uncertain request must never be followed by another console operation.
  if (command === 'game-inventory') {
    const lists = [];
    for (const type of TYPES) {
      await s.write(address, Buffer.alloc(16384));
      const reply = await s.ipc('NCM List game metadata', database, 5, listInput(type),
        {receive: [{address, size: 16384, mode: 0}]});
      if (reply.result) { lists.push({type, result: reply.canonicalResult, complete: false, keys: []}); continue; }
      lists.push({type, ...parse(reply, await s.readOwned(address, 16384), type)});
    }
    await s.close(database);
    return {storage, available: true, complete: lists.every(item => item.complete), lists};
  }
  check(command === 'game-open', 'Unknown game operation');
  const key = request.key;
  check(key && /^0x[0-9a-f]{16}$/.test(key.id) && TYPES.includes(key.type) && key.installType === 0 &&
    Number.isInteger(key.version) && key.version >= 0 && key.version <= 0xffffffff, 'Invalid game metadata key');
  const input = Buffer.alloc(24);
  input.writeBigUInt64LE(BigInt(key.id), 8); input.writeUInt32LE(key.version, 16); input[20] = key.type;
  const contents = [];
  let finished = false;
  for (let start = 0; start < 4096; start += 512) {
    input.writeInt32LE(start);
    await s.write(address, Buffer.alloc(512 * 24));
    const reply = await s.ipc('NCM ListContentInfo', database, 4, input,
      {receive: [{address, size: 512 * 24, mode: 0}]});
    check(!reply.result && reply.data.length >= 4, 'Game content metadata could not be read');
    const count = reply.data.readInt32LE();
    contents.push(...contentInfos(await s.readOwned(address, 512 * 24), count));
    if (count < 512) { finished = true; break; }
  }
  await s.close(database);
  check(finished && contents.length && new Set(contents.map(item => item.id)).size === contents.length,
    'Game content inventory is empty, duplicated, or truncated');
  const openedStorage = await s.ipc('NCM OpenContentStorage game storage', handle, 4, Buffer.from([storage]));
  if (openedStorage.result) return {storage, available: false, result: openedStorage.canonicalResult, contents};
  check(openedStorage.moves.length === 1 && !openedStorage.copies.length, 'NCM storage handle differs');
  const reader = {handle: openedStorage.moves[0], storage, key, contents};
  state.gameReaders.push(reader); await save();
  // Check actual sizes before allowing any reads using metadata bounds.
  for (const item of contents) {
    const reply = await s.ipc('NCM GetSizeFromContentId', reader.handle, 14, Buffer.from(item.id, 'hex'));
    check(!reply.result && reply.data.length >= 8 && reply.data.readBigInt64LE() === BigInt(item.size) &&
      item.size > 0, 'Stored game content size differs from metadata');
  }
  return {available: true, ...reader};
}

module.exports = {dispatch, contentInfos, CHUNK};
