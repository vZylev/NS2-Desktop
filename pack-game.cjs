#!/usr/bin/env node
// Offline PFS0 container of an already verified NCM content set. Not an NSP/XCI.
const fs = require('node:fs/promises');
const path = require('node:path');
const {createReadStream} = require('node:fs');
const crypto = require('node:crypto');
const check = (ok, message) => {if (!ok) throw Error(message);};

function header(entries) {
  const names = entries.map(entry => Buffer.from(entry.name + '\0'));
  const strings = Buffer.concat(names);
  const bytes = Buffer.alloc(16 + entries.length * 24 + strings.length);
  bytes.write('PFS0'); bytes.writeUInt32LE(entries.length, 4); bytes.writeUInt32LE(strings.length, 8);
  let offset = 0n, stringOffset = 0;
  entries.forEach((entry, i) => {
    bytes.writeBigUInt64LE(offset, 16 + i * 24);
    bytes.writeBigUInt64LE(BigInt(entry.size), 24 + i * 24);
    bytes.writeUInt32LE(stringOffset, 32 + i * 24);
    offset += BigInt(entry.size); stringOffset += names[i].length;
  });
  strings.copy(bytes, 16 + entries.length * 24);
  return bytes;
}

async function pack(reportFile, outputFile) {
  check(outputFile.endsWith('.pfs0'), 'Use a .pfs0 output filename; this does not produce NSP/XCI');
  const existing = await fs.lstat(outputFile).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  check(!existing, 'PFS0 output already exists');
  const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
  check(report.format === 'ncm-content-set' && report.mode === 'dump' && report.complete &&
    report.completeContentSet && report.files?.length && report.files.length <= 4096 &&
    report.contents?.length === report.files.length, 'A completed content-set export is required');
  const directory = await fs.realpath(path.dirname(reportFile));
  const ids = new Set();
  const entries = [];
  for (const entry of report.files) {
    check(/^[0-9a-f]{32}$/.test(entry.id) && !ids.has(entry.id) && Number.isSafeInteger(entry.size) &&
      entry.size > 0 && entry.captured === entry.size && entry.completeContent &&
      /^[0-9a-f]{64}$/.test(entry.sha256), 'Invalid or duplicate captured content');
    ids.add(entry.id);
    check(report.contents.some(item => item.id === entry.id && item.size === entry.size),
      'Capture is absent from the content inventory');
    const name = entry.id + '.nca', file = path.join(directory, name);
    const stat = await fs.lstat(file);
    check(stat.isFile() && !stat.isSymbolicLink() && stat.size === entry.size,
      'Captured content is missing, changed, or a symlink');
    entries.push({...entry, name, file});
  }
  const metadata = header(entries), total = entries.reduce((n, entry) => n + BigInt(entry.size), BigInt(metadata.length));
  const space = await fs.statfs(path.dirname(path.resolve(outputFile)));
  check(BigInt(space.bavail) * BigInt(space.bsize) >= total, 'Insufficient disk space for PFS0');
  const temporary = outputFile + '.partial';
  const out = await fs.open(temporary, 'wx', 0o600);
  async function write(bytes) {
    let at = 0;
    while (at < bytes.length) {
      const result = await out.write(bytes, at, bytes.length - at);
      check(result.bytesWritten > 0, 'PFS0 write made no progress');
      at += result.bytesWritten;
    }
  }
  try {
    await write(metadata);
    for (const entry of entries) {
      const digest = crypto.createHash('sha256');
      let copied = 0;
      for await (const bytes of createReadStream(entry.file)) {
        copied += bytes.length; check(copied <= entry.size, 'Captured content grew during packaging');
        digest.update(bytes); await write(bytes);
      }
      check(copied === entry.size && digest.digest('hex') === entry.sha256,
        'Captured content hash differs: ' + entry.name);
    }
    await out.sync();
  } finally {await out.close();}
  await fs.link(temporary, outputFile); await fs.unlink(temporary);
  return {file: path.resolve(outputFile), format: 'PFS0 content archive', entries: entries.length,
    size: total.toString(), completeGameImage: false};
}

module.exports = {pack, header};
if (require.main === module) {
  if (process.argv.length !== 4) {
    console.log('Usage: node pack-game.cjs /path/to/game-export.json output.pfs0');
    process.exitCode = process.argv[2] === '--help' ? 0 : 1;
  } else pack(path.resolve(process.argv[2]), path.resolve(process.argv[3]))
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => {console.error(error.message); process.exitCode = 1;});
}
