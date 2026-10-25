const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {parseTitles} = require('../shared/game-options.cjs');
// Track only resources opened by this operation. Never close an uncertain request.
function trackedMemory(memory) {
  const resources = new Map(); let uncertain = false;
  const request = async input => {
    let result;
    try {result = await memory.request(input);} catch (error) {
      if (/^Code file did not open: \d+$/.test(error.message)) throw error;
      uncertain = true; error.nativeUncertain = true; throw error;
    }
    if (input.command === 'root-native-sm-service' && !result.result && !result.transport)
      for (const handle of result.moves || []) resources.set(handle, 'root-native-close-handle');
    if (input.command === 'root-native-game-open' && result.available && result.handle)
      resources.set(result.handle, 'root-native-game-close');
    if (input.command === 'root-native-code-open' && !result.result && result.handle)
      resources.set(result.handle, 'root-native-code-close');
    if (['root-native-close-handle', 'root-native-game-close', 'root-native-code-close'].includes(input.command) && result.closed)
      resources.delete(input.handle);
    return result;
  };
  return {memory: {...memory, request}, async cleanup() {
    if (uncertain) return;
    for (const [handle, command] of [...resources].reverse()) await request({command, handle});
  }};
}
function gameOptions(input) {
  if (!['inventory', 'probe', 'dump'].includes(input.action)) throw Error('Invalid game operation');
  const options = {mode: input.action};
  if (input.action !== 'inventory') options.titles = parseTitles(input.title).map(title => '0x' + title);
  if (input.storage !== '' && input.storage !== undefined) {
    if (!['2', '4', '5'].includes(String(input.storage))) throw Error('invalidStorage');
    options.storage = Number(input.storage);
  }
  if (input.version !== '' && input.version !== undefined) {
    if (!/^\d+$/.test(String(input.version)) || Number(input.version) > 0xffffffff) throw Error('invalidVersion');
    options.version = Number(input.version);
  }
  return options;
}
function createActions({memory, proofFile, directory, exportOne, firmware}) {
  exportOne ||= require('./game-export.cjs').exportOne;
  return async input => {
    if (input.action === 'verify') {
      let state;
      try {state = await memory.request({command: 'root-native-info'});}
      catch (error) {error.nativeUncertain = true; throw error;}
      if (!state.worker?.joined) throw Object.assign(Error('Native worker is not idle'), {nativeUncertain: true});
      return {verified: true, file: proofFile};
    }
    const options = input.action === 'firmware' ? null : gameOptions(input);
    const output = path.join(directory, '../operations', input.action + '-' + crypto.randomUUID());
    await fs.mkdir(output, {recursive: true});
    const owned = trackedMemory(memory);
    let result, failure;
    try {
      if (input.action === 'firmware') result = await (firmware || require('./firmware-dump.cjs').main)(proofFile,
        {memory: owned.memory, subdirectory: path.basename(output)});
      else if (options.mode === 'inventory') result = await exportOne(proofFile, options, output, owned.memory);
      else result = await require('../shared/export-batch.cjs').exportBatch(options, output,
        (single, folder) => exportOne(proofFile, single, folder, owned.memory));
    } catch (error) {failure = error;}
    try {await owned.cleanup();} catch (error) {error.nativeUncertain = true; failure = error;}
    if (failure) throw failure;
    return result;
  };
}
module.exports = {createActions, trackedMemory, gameOptions};
