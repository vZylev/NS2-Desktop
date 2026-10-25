// Export the NCM-listed content set. This is not an NSP/XCI or a cartridge image.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {createReadStream} = require('node:fs');
const {writeAtomic} = require('../shared/atomic-file.cjs');
const check = (ok, message) => {if (!ok) throw Error(message);};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFile(file, 'utf8').then(JSON.parse);

function decodeChunk(reply, id, offset, length) {
  check(reply.result === 0 && reply.id === id && reply.offset === offset && reply.length === length &&
    typeof reply.base64 === 'string', 'Game content read failed or returned a different range');
  const bytes = Buffer.from(reply.base64, 'base64');
  check(bytes.length === length && hash(bytes) === reply.sha256, 'Game block length or hash differs');
  return bytes;
}

async function diskHash(file) {
  const digest = crypto.createHash('sha256');
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  return digest.digest('hex');
}

async function capture(memory, reader, content, directory, sample, progress = () => {}) {
  const length = sample ? Math.min(content.size, 4096) : content.size;
  const space = await fs.statfs(directory);
  check(BigInt(space.bavail) * BigInt(space.bsize) >= BigInt(length) + 16n * 1024n * 1024n,
    'Insufficient computer disk space for content ' + content.id);
  const file = path.join(directory, content.id + (sample ? '.sample' : '.nca'));
  const temporary = file + '.partial';
  const out = await fs.open(temporary, 'wx', 0o600);
  const digest = crypto.createHash('sha256');
  try {
    for (let offset = 0; offset < length;) {
      const n = Math.min(0x10000, length - offset);
      const reply = await memory.request({command: 'root-native-game-read', handle: reader.handle,
        id: content.id, offset, length: n});
      const bytes = decodeChunk(reply, content.id, offset, n);
      if (sample) {
        const repeated = await memory.request({command: 'root-native-game-read', handle: reader.handle,
          id: content.id, offset, length: n});
        check(decodeChunk(repeated, content.id, offset, n).equals(bytes),
          'Repeated game-content sample differs');
      }
      const written = await out.write(bytes, 0, n, offset);
      check(written.bytesWritten === n, 'Local game-content write was short');
      digest.update(bytes); offset += n;
      if (offset === length || offset % (4 * 1024 * 1024) === 0) progress(offset, length);
    }
    await out.sync();
  } finally {await out.close();}
  const sha256 = digest.digest('hex');
  check((await fs.stat(temporary)).size === length && await diskHash(temporary) === sha256,
    'Game content disk readback differs');
  await fs.link(temporary, file); await fs.unlink(temporary);
  return {...content, file, captured: length, sha256, completeContent: length === content.size};
}

async function exportOne(fsProofFile, options, outputDirectory, attachedMemory) {
  check(options && ['inventory', 'probe', 'dump'].includes(options.mode), 'Game options are missing');
  const memory = attachedMemory || await require('./tools/fs-memory.cjs').connect();
  const proof = await read(fsProofFile);
  check(proof.session === memory.info.session && proof.report === memory.reportFile && proof.verified &&
    proof.trials?.length === 2 && proof.trials.every(row => row.verified && row.restored),
    'FS execution and restoration must verify before game access');
  const directory = outputDirectory || path.join(__dirname, '../games');
  // When running from a copied engine this resolves inside the individual run.
  await fs.mkdir(directory, {recursive: true, mode: 0o700});
  const file = path.join(directory, 'game-export.json');
  const journal = {session: memory.info.session, mode: options.mode, started: new Date().toISOString(),
    format: 'ncm-content-set', completeGameImage: false,
    limitations: ['No NSP/XCI packaging, tickets, keys, or cartridge partitions',
      'Only full installed metadata entries exposed by NCM; each version/type is separate',
      'Content-meta archives are not guaranteed to be included by ListContentInfo'],
    inventories: [], files: [], complete: false};
  const save = async () => {
    await writeAtomic(file, JSON.stringify(journal, null, 2) + '\n');
  };
  await fs.writeFile(file, JSON.stringify(journal), {flag: 'wx', mode: 0o600});
  try {
    const initial = await memory.request({command: 'root-native-info'});
    const sm = initial.services?.find(item => item.name === 'pm:shell')?.sm;
    check(sm, 'Verified service manager is missing');
    const lookup = await memory.request({command: 'root-native-sm-service', handle: sm, name: 'ncm'});
    check(!lookup.transport && !lookup.result && lookup.moves?.length === 1, 'NCM lookup failed');
    const handle = lookup.moves[0];
    for (const storage of options.storage ? [options.storage] : [4, 5, 2]) {
      const inventory = await memory.request({command: 'root-native-game-inventory', handle, storage});
      journal.inventories.push(inventory); await save();
      console.log('Games: storage ' + storage + ': ' + (inventory.available ?
        inventory.lists.reduce((n, list) => n + list.keys.length, 0) + ' metadata entries' :
        'unavailable (' + inventory.result + ')'));
      for (const list of inventory.lists || []) for (const key of list.keys)
        console.log('Games: ' + key.id + ' version=' + key.version + ' type=0x' +
          key.type.toString(16) + ' storage=' + storage);
    }
    if (options.mode !== 'inventory') {
      const matches = journal.inventories.flatMap(inventory => (inventory.lists || []).flatMap(list =>
        list.keys.filter(key => key.id === options.title &&
          (options.version === undefined || key.version === options.version))
          .map(key => ({storage: inventory.storage, key}))));
      check(journal.inventories.every(item => !item.available || item.complete),
        'Inventory is incomplete; select a storage with a complete inventory');
      check(matches.length === 1, matches.length ?
        'Title has multiple versions or storage locations; use --storage and --version to select one' :
        'Requested title was not found in accessible full-content metadata');
      journal.selected = matches[0]; await save();
      const reader = await memory.request({command: 'root-native-game-open', handle, ...matches[0]});
      check(reader.available && reader.handle, 'Selected game content storage is unavailable');
      journal.contents = reader.contents; await save();
      if (options.mode === 'dump') {
        const total = reader.contents.reduce((n, content) => n + BigInt(content.size), 0n);
        const space = await fs.statfs(directory);
        check(BigInt(space.bavail) * BigInt(space.bsize) >= total + 16n * 1024n * 1024n,
          'Insufficient computer disk space for the selected content set');
      }
      for (const content of reader.contents) {
        const entry = await capture(memory, reader, content, directory, options.mode === 'probe',
          (done, total) => console.log('Games: ' + content.id + ' ' + done + '/' + total + ' bytes'));
        journal.files.push(entry); await save();
      }
      // A failed/uncertain transfer exits above without issuing another native request.
      check((await memory.request({command: 'root-native-game-close', handle: reader.handle})).closed,
        'Game content reader did not close');
      journal.completeContentSet = options.mode === 'dump' && journal.files.length === reader.contents.length &&
        journal.files.every(item => item.completeContent);
    }
    await memory.request({command: 'root-native-close-handle', handle});
    journal.complete = journal.inventories.some(item => item.available) &&
      journal.inventories.every(item => !item.available || item.complete);
    journal.completed = new Date().toISOString(); await save();
    console.log('Games: report ' + file);
    return {file, directory, complete: journal.complete, completeContentSet: !!journal.completeContentSet,
      completeGameImage: false};
  } catch (error) {journal.error = error.message; await save(); throw error;}
}

async function main(fsProofFile) {
  const options = JSON.parse(process.env.NS2_GAME_OPTIONS || 'null');
  if (!options?.titles) return exportOne(fsProofFile, options);
  return require('../shared/export-batch.cjs').exportBatch(options, path.join(__dirname, '../games'),
    (single, directory) => exportOne(fsProofFile, single, directory));
}

module.exports = {main, exportOne, capture, decodeChunk, diskHash};
