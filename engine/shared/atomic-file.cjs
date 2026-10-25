const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

// Ten attempts, with at most 4.575 seconds of backoff. Windows may temporarily
// deny replacement of an open destination. Never unlink or truncate that file.
const RENAME_DELAYS_MS = Object.freeze([25, 50, 100, 200, 400, 800, 1000, 1000, 1000]);
const TRANSIENT_WINDOWS_ERRORS = new Set(['EPERM', 'EACCES', 'EBUSY']);

async function writeAtomic(file, bytes, {io = fs, platform = process.platform,
  delay = ms => new Promise(resolve => setTimeout(resolve, ms)), log = console.warn} = {}) {
  // Each snapshot owns a new temporary file. An exhausted retry keeps it for
  // diagnosis; subsequent saves cannot overwrite that pending snapshot.
  const temporary = file + '.' + process.pid + '.' + randomUUID() + '.tmp';
  await io.writeFile(temporary, bytes, {flag: 'wx', mode: 0o600});
  for (let attempt = 0; ; attempt++) {
    try {
      await io.rename(temporary, file);
      if (attempt) log('Report: published ' + path.basename(file) + ' after ' + (attempt + 1) + ' rename attempts.');
      return;
    } catch (cause) {
      if (platform !== 'win32' || !TRANSIENT_WINDOWS_ERRORS.has(cause.code) || attempt === RENAME_DELAYS_MS.length) {
        const error = new Error('Report replacement failed after ' + (attempt + 1) + ' attempt(s) (' + cause.code +
          '): ' + file + '. Pending snapshot kept at ' + temporary, {cause});
        Object.assign(error, {code: cause.code, temporaryFile: temporary, reportFile: file, attempts: attempt + 1});
        throw error;
      }
      if (!attempt) log('Report: ' + cause.code + ' publishing ' + path.basename(file) +
        '; retrying the local rename without repeating console operations.');
      await delay(RENAME_DELAYS_MS[attempt]);
    }
  }
}

module.exports = {writeAtomic, RENAME_DELAYS_MS};
