const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {writeAtomic} = require('../shared/atomic-file.cjs');
const {capture, exportGame} = require('./browser-transfer.cjs');
const {validatePath} = require('./ro/browser.cjs');
async function main(proofFile, options = {}) {
  const memory = options.memory || await require('./tools/fs-memory.cjs').connect();
  const proof = JSON.parse(await fs.readFile(proofFile));
  if (proof.session !== memory.info.session || proof.report !== memory.reportFile || !proof.verified ||
      proof.trials?.length !== 2 || !proof.trials.every(x => x.verified && x.restored)) throw Error('FS proof is missing');
  const token = crypto.randomBytes(32).toString('hex');
  const directory = options.directory || __dirname;
  const mode = options.mode || JSON.parse(process.env.NS2_GAME_OPTIONS || 'null')?.mode;
  const unified = mode === 'session';
  const extracting = mode === 'extract';
  const game = options.gameBackend || (extracting || unified ? require('./ouncecake-adapter.cjs').createBackend(path.resolve(directory, '..')) : null);
  const defaultGame = !!game && !unified;
  const actions = options.actions || (unified ? require('./session-actions.cjs').createActions({memory, proofFile, directory}) : null);
  const registry = path.join(directory, 'browser-endpoint.json');
  const output = path.join(directory, '../downloads');
  await fs.mkdir(output, {recursive: true});
  let busy = false, finish, failure, lastFailure = null;
  const replies = new Map();
  const done = new Promise(resolve => {finish = resolve;});
  const request = async (command, input = {}) => {
    let reply;
    try {reply = game && (input.source === 'game' || defaultGame || ['games', 'select'].includes(command)) ? await game.request(command, input) : await memory.request({...input, command: 'root-native-browser-' + command});}
    catch (error) {if (!error.unavailable && !error.nativeResult) error.nativeUncertain = true; throw error;}
    if (reply.unavailable) throw Object.assign(Error(reply.unavailable), {unavailable: true});
    return reply;
  };
  const server = http.createServer(async (req, res) => {
    const send = (code, value) => {res.writeHead(code, {'Content-Type': 'application/json'}); res.end(JSON.stringify(value));};
    if (req.headers.authorization !== 'Bearer ' + token) return send(401, {error: 'Unauthorized'});
    if (req.method === 'GET') return send(200, {ready: true, busy, selected: game?.selected || null, skippedSources: game?.skippedSources || [], updateVersions: game?.updateVersions || [],
      retryable: !!lastFailure && !lastFailure.uncertain, lastError: lastFailure?.message || '', lastAction: lastFailure?.input.action || ''});
    if (busy) return send(409, {error: 'Browser busy', retryable: false, busy: true});
    busy = true;
    let input, requestId, retriedRequest;
    const respond = (status, value) => {
      if (retriedRequest) value = {...value, retriedRequest};
      if (requestId) {replies.set(requestId, {status, value}); if (replies.size > 64) replies.delete(replies.keys().next().value);}
      send(status, value);
    };
    try {
      let body = ''; for await (const chunk of req) {body += chunk; if (body.length > 8192) throw Error('Request too large');}
      input = JSON.parse(body);
      requestId = input.requestId;
      if (requestId !== undefined && (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(requestId))) throw Error('Invalid request ID');
      if (replies.has(requestId)) {const previous = replies.get(requestId); send(previous.status, previous.value); return;}
      if (input.action === 'retry') {
        if (!lastFailure || lastFailure.uncertain) {send(409, {error: 'This operation requires a new console connection', retryable: false}); return;}
        retriedRequest = lastFailure.input; input = {...lastFailure.input, requestId};
      }
      lastFailure = null;
      console.log('Session: operation started');
      const useGame = input.source === 'game' || defaultGame;
      const pathValidator = useGame && game ? game.validatePath : validatePath;
      if (input.action === 'finish') {
        if (game) await request('close', {source: 'game'});
        if (!defaultGame) await request('close', {source: 'sd'});
        respond(200, {finished: true}); finish(); return;
      }
      if (actions && ['inventory', 'probe', 'dump', 'firmware', 'verify'].includes(input.action)) {
        respond(200, await actions(input)); return;
      }
      if (game && input.action === 'games') {respond(200, await request('games', {})); return;}
      if (game && input.action === 'select') {
        require('./ouncecake/engine/protocol.cjs').titleId(input.title);
        respond(200, await request('select', {title: input.title, source: 'game'})); return;
      }
      if (game && input.action === 'extract-all') {
        if (!game.selected) throw Error('Select a game first');
        respond(200, await exportGame({...game, request}, path.join(directory, '../extracted'),
          (filename, done, total) => console.log('Files: ' + filename + ' ' + done + '/' + total + ' bytes'), {mode: input.extractionMode ?? 'latest', version: input.updateVersion})); return;
      }
      if (input.action === 'structure') {
        let catalog = {};
        const catalogFile = path.join(process.env.NS2_DATA_ROOT || path.resolve(directory, '../../..'), 'title-names.json');
        try {catalog = JSON.parse(await fs.readFile(catalogFile, 'utf8'));}
        catch (error) {if (error.code !== 'ENOENT') throw error;}
        const result = await require('./file-structure.cjs').exportStructure({request,
          output: path.join(directory, '../inventories'), catalog,
          sources: useGame ? ['game'] : undefined, pathValidator,
          context: useGame && game ? {engine: 'OunceCake', game: game.selected, absentSources: game.absentSources, skippedSources: game.skippedSources} : undefined,
          progress: row => console.log('Files: inventory ' + row.source + ':' + row.path +
            ' — ' + row.files + ' files, ' + row.directories + ' folders, ' + row.errors + ' errors')});
        respond(200, result); return;
      }
      if (!['list', 'download'].includes(input.action) || !(unified ? ['game', 'sd', 'user', 'system'] : defaultGame ? ['game'] : ['sd', 'user', 'system']).includes(input.source)) throw Error('Invalid browser operation');
      pathValidator(input.path);
      if (!Number.isSafeInteger(input.offset ?? 0) || (input.offset ?? 0) < 0) throw Error('Invalid directory offset');
      const mount = await request('mount', input);
      if (!mount.available) throw Object.assign(Error('Storage unavailable (permissions or missing media): ' + mount.result), {unavailable: true});
      if (input.action === 'list') {respond(200, await request('list', input)); return;}
      const name = path.posix.basename(input.path).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120) || 'file';
      const file = path.join(output, crypto.randomUUID() + '-' + name);
      const result = await capture(request, input, file,
        (done, total) => console.log('Files: ' + name + ' ' + done + '/' + total + ' bytes'));
      await writeAtomic(file + '.json', JSON.stringify({source: input.source, path: input.path, ...result}));
      respond(200, result);
    } catch (error) {
      lastFailure = {input: input || {}, message: error.message, uncertain: !!error.nativeUncertain};
      respond(400, {error: error.message, retryable: !error.nativeUncertain});
      // Stop after an uncertain native operation; do not issue further console calls.
      if (error.nativeUncertain) {failure = error; finish();}
    } finally {busy = false; console.log('Session: operation finished');}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await writeAtomic(registry, JSON.stringify({port: server.address().port, token}));
  console.log('Files: browser ready');
  await done;
  try {await fs.unlink(registry);}
  catch (error) {if (error.code !== 'ENOENT') failure ||= error;}
  finally {await new Promise(resolve => server.close(resolve));}
  if (failure) throw failure;
  return {complete: true, directory: output};
}
module.exports = {main};
