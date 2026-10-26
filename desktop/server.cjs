const {sdSupport} = require('./sd-support.cjs');
const {history, runPath} = require('./history.cjs');
const {diagnostics} = require('./diagnostics.cjs');
const {normalizeCatalog} = require('./catalog.cjs');
const {writeAtomic} = require('../engine/shared/atomic-file.cjs');
const {parseTitles} = require('../engine/shared/game-options.cjs');
// Local browser UI. The original runner still owns the full console lifecycle.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const http = require('node:http');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const readline = require('node:readline');
const {addresses} = require('../run.cjs');
const {parseProgress} = require('../engine/shared/progress.cjs');
const {createProgress, recordProgress, progressView} = require('./progress.cjs');
const ROOT = path.resolve(__dirname, '..');
const APP_VERSION = require('../package.json').version;
const BUILD_ID = process.env.NS2_BUILD_ID || 'source';
const MODES = new Set(['demo', 'inventory', 'probe', 'dump', 'firmware', 'browse', 'extract', 'session']);

async function existingInstance(dataRoot, port) {
  try {
    const saved = JSON.parse(await fs.readFile(path.join(dataRoot, 'desktop-session.json')));
    const url = new URL(saved.url);
    const token = url.hash.slice(1);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || Number(url.port) !== port ||
        url.username || url.password || !/^[0-9a-f]{64}$/.test(token)) return null;
    const response = await fetch(url.origin + '/api/state', {
      headers: {authorization: 'Bearer ' + token, connection: 'close'}, signal: AbortSignal.timeout(1500)});
    if (!response.ok) return null;
    const state = await response.json();
    if (typeof state.active !== 'boolean') return null;
    return {origin: url.origin, token, state};
  } catch {return null;}
}

function buildArgs(input) {
  if (!input || !MODES.has(input.mode) || !net.isIPv4(input.host || ''))
    throw Error('invalidHost');
  const args = [];
  if (input.pairing !== undefined && !['single', 'session'].includes(input.pairing))
    throw Error('invalidPairing');
  if (input.mode === 'session') args.push('--session');
  if (input.mode === 'extract') args.push('--extract-files');
  if (input.mode === 'browse') args.push('--browse-files');
  if (input.mode === 'firmware') args.push('--dump-firmware');
  if (input.mode === 'inventory') args.push('--list-games');
  if (['probe', 'dump'].includes(input.mode)) {
    let titles;
    try {titles = parseTitles(input.title);} catch {throw Error('invalidTitle');}
    args.push(input.mode === 'probe' ? '--probe-game' : '--dump-game', titles.join(','));
  }
  if (['inventory', 'probe', 'dump'].includes(input.mode) && input.storage) {
    if (!['2', '4', '5'].includes(String(input.storage))) throw Error('invalidStorage');
    args.push('--storage', String(input.storage));
  }
  if (['probe', 'dump'].includes(input.mode) && input.version !== '' && input.version !== undefined) {
    if (!/^\d+$/.test(String(input.version)) || Number(input.version) > 0xffffffff) throw Error('invalidVersion');
    args.push('--version', String(input.version));
  }
  if (input.pairing === 'single') args.push('--single-console');
  args.push(input.host);
  return args;
}

function openExternal(target, folder = false) {
  const command = process.platform === 'win32' ? (folder ? 'explorer.exe' : 'rundll32.exe') :
    process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' && !folder ? ['url.dll,FileProtocolHandler', target] : [target];
  const child = spawn(command, args, {detached: true, stdio: 'ignore', windowsHide: true});
  child.on('error', error => console.error('No se pudo abrir automáticamente: ' + error.message));
  child.unref();
}

async function jsonBody(req, limit = 8192) {
  req.setEncoding('utf8');
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > limit) throw Error('Solicitud demasiado grande.');
  }
  return JSON.parse(body || '{}');
}

async function createApp({dataRoot = process.env.NS2_DATA_ROOT || ROOT, port = 39381,
  runner = spawn, launchBrowser = false, opener = openExternal,
  standby = false, primaryPort = 39381, now = Date.now, autotyper = null, updates = null} = {}) {
  dataRoot = path.resolve(dataRoot);
  await fs.mkdir(dataRoot, {recursive: true, mode: 0o700});
  const token = crypto.randomBytes(32).toString('hex');
  const updater = updates || require('./updates.cjs').createUpdates({dataRoot});
  const typer = autotyper || require('./autotyper.cjs').createAutotyper({dataRoot});
  let child = null, lastSuccessfulHost = '', nextId = 0, closing = false, takingOver = false, boundPort = port;
  let historyWrite = Promise.resolve(), zipBusy = false, lastInput = null;
  const state = {titles: [], historyError: '', status: 'idle', stage: '', command: '', runFolder: '', lines: [],
    started: null, finished: null, error: '', mode: '', dataRoot, progress: createProgress()};
  function persistHistory() {
    if (!state.runFolder) return;
    const snapshot = {started: state.started, finished: state.finished, mode: state.mode,
      titles: state.titles, status: state.status};
    const folder = state.runFolder;
    historyWrite = historyWrite.then(async () => {
      const directory = await runPath(dataRoot, path.basename(folder));
      if (await fs.realpath(folder) !== directory) throw Error('invalidRun');
      await writeAtomic(path.join(directory, 'desktop-summary.json'), JSON.stringify(snapshot, null, 2) + '\n');
    }).catch(error => {state.historyError = error.message;});
  }
  function append(line) {
    const originalLine = line;
    const event = parseProgress(line) || (line.trim() ? {kind: line.startsWith('Report: ') ? 'report' :
      /^(Error: |Warning: )/.test(line) ? 'error' : 'detail', message: line.slice(0, 800)} : null);
    if (event) {
      recordProgress(state.progress, event, now());
      if (event.kind === 'heartbeat') return;
      if (parseProgress(originalLine)) line = 'Activity: ' + event.kind + (event.profile ? ' — ' + event.profile : '') +
        (event.outcome ? ' — ' + event.outcome : '') + (event.message ? ' — ' + event.message : '');
    }
    state.lines.push({id: ++nextId, text: line});
    if (state.lines.length > 600) state.lines.shift();
    const command = line.trim().match(/^V=START\([0-9,]+\)$/);
    if (command) {state.command = command[0]; state.status = 'waiting';}
    if (line.startsWith('Run folder: ')) {state.runFolder = line.slice(12); persistHistory();}
    if (originalLine === 'Files: browser ready') {state.toolsReady = true; state.toolsBusy = false;}
    if (originalLine === 'Session: operation started') state.toolsBusy = true;
    if (originalLine === 'Session: operation finished') state.toolsBusy = false;
    if (originalLine.startsWith('Connected.')) {state.status = 'running'; state.consoleConnected = true;}
    if (/^[1-4]\/4 /.test(line)) {
      state.stage = line; state.status = 'running'; state.progress.lastProgressAt = now();
    }
  }
  function start(input) {
    if (typer.busy) throw Error('autoBusy');
    if (standby) throw Error('otherInstanceOpen');
    if (closing) throw Error('applicationClosing');
    if (child) throw Error('alreadyActive');
    const args = buildArgs(input);
    lastInput = {...input};
    Object.assign(state, {status: 'starting', stage: '', command: '', runFolder: '', lines: [],
      started: new Date().toISOString(), finished: null, error: '', consoleConnected: false, commandsAttempted: false, toolsReady: false, toolsBusy: false, mode: input.mode, progress: createProgress(),
      titles: ['probe', 'dump'].includes(input.mode) ? parseTitles(input.title) : [], historyError: ''});
    lastSuccessfulHost = input.host;
    child = runner(process.execPath, [path.join(ROOT, 'run.cjs'), ...args],
      {cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {...process.env, NS2_DATA_ROOT: dataRoot}});
    const current = child;
    for (const stream of [child.stdout, child.stderr])
      readline.createInterface({input: stream}).on('line', append);
    child.once('error', error => {
      state.error = error.message; append(error.message); state.status = 'failed';
    });
    child.once('close', code => {
      if (child !== current) return;
      if (typer.snapshot().kind === 'commands') typer.stop();
      child = null; state.finished = new Date().toISOString();
      state.status = code === 0 && !state.error ? 'complete' : 'failed';
      if (state.status === 'failed' && !state.error)
        state.error = state.consoleConnected ? 'La sesión se detuvo; revisá los registros antes de reconectar la consola.' : 'No se pudo iniciar la conexión. Podés reintentar.';
      persistHistory();
    });
  }
  const server = http.createServer(async (req, res) => {
    const origin = 'http://127.0.0.1:' + boundPort;
    const send = (status, value, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'Expires': '0',
        ...(closing ? {Connection: 'close'} : {}),
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"});
      res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
    };
    try {
      if (req.headers.host !== '127.0.0.1:' + boundPort ||
        req.headers.origin && req.headers.origin !== origin) return send(403, {error: 'invalidOrigin'});
      if (closing) return send(410, {error: 'applicationClosing'});
      const url = new URL(req.url, origin);
      const assets = {'/': ['index.html', 'text/html; charset=utf-8'], '/usb-help': ['usb-help.html', 'text/html; charset=utf-8'],
        '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8']};
      if (req.method === 'GET' && assets[url.pathname]) {
        const [name, type] = assets[url.pathname];
        let content = await fs.readFile(path.join(__dirname, name));
        if (name === 'index.html') content = content.toString()
          .replace('href="/style.css"', 'href="/style.css?build=' + encodeURIComponent(BUILD_ID) + '"')
          .replace('src="/app.js"', 'src="/app.js?build=' + encodeURIComponent(BUILD_ID) + '"');
        return send(200, content, type);
      }
      if (req.headers.authorization !== 'Bearer ' + token) return send(401, {error: 'missingSession'});
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const previous = standby ? await existingInstance(dataRoot, primaryPort) : null;
        return send(200, {...state, addresses: addresses(), selectedHost: lastSuccessfulHost,
          progress: progressView(state.progress, {now: now(), active: !!child && state.status === 'running' && (!state.toolsReady || state.toolsBusy), stage: state.stage}),
          appVersion: APP_VERSION, buildId: BUILD_ID.slice(0, 12), standby, takingOver,
          previousInstance: previous ? {active: previous.state.active,
            appVersion: previous.state.appVersion || '', buildId: previous.state.buildId || ''} : null,
          canRetrySession: !!lastInput && !child && !typer.busy && state.status === 'failed' && !state.consoleConnected && !state.commandsAttempted,
          canTypeCommands: !!child && state.status === 'waiting' && !state.consoleConnected && !state.commandsAttempted,
          updates: updater.snapshot(), recovery: state.status === 'failed' ? (state.consoleConnected || state.commandsAttempted ? 'recoveryConsole' : 'recoveryConnection') : '',
          active: !!child || typer.busy || updater.busy, consoleActive: !!child, autotyper: typer.snapshot(), lines: state.lines.filter(line => line.id > Number(url.searchParams.get('after') || 0))});
      }
      if (url.pathname === '/api/updates' && req.method === 'POST') {
        if (standby || closing || takingOver) return send(409, {error: 'otherInstanceOpen'});
        const input = await jsonBody(req);
        if (input.action === 'check') return send(200, await updater.check());
        if (input.action === 'download') return send(200, await updater.download(input.name));
        if (input.action === 'open') {
          const file = updater.snapshot().file;
          if (!file) return send(409, {error: 'updateMissingPackage'});
          opener(path.dirname(file), true); return send(200, {opened: true});
        }
        return send(400, {error: 'updateInvalidAction'});
      }
      if (url.pathname === '/api/autotyper') {
        if (req.method === 'GET') return send(200, typer.snapshot());
        if (req.method === 'POST') {
          if (standby || closing || takingOver) return send(409, {error: 'otherInstanceOpen'});
          const input = await jsonBody(req);
          if (input.action === 'stop') return send(200, typer.stop());
          if (input.action === 'commands') {
            if (!child || state.status !== 'waiting' || state.consoleConnected || state.commandsAttempted) return send(409, {error: 'autoInvalidSession'});
            const current = child, command = state.command;
            return send(200, await typer.start(input, {pid: current.pid, command,
              isCurrent: () => child === current && state.command === command && state.status === 'waiting' && !state.commandsAttempted,
              onStarted: () => {state.commandsAttempted = true;}}));
          }
          if (input.action === 'check' && (!child || state.status === 'waiting')) return send(200, await typer.check());
          if (child) return send(409, {error: 'alreadyActive'});
          if (input.action === 'start') return send(200, await typer.start(input));
          return send(400, {error: 'autoInvalidAction'});
        }
      }
      if (url.pathname === '/api/browser' && ['GET', 'POST'].includes(req.method)) {
        let endpoint;
        if (child && ['browse', 'extract', 'session'].includes(state.mode) && state.runFolder) {
          try {endpoint = JSON.parse(await fs.readFile(path.join(state.runFolder, 'switch2/browser-endpoint.json')));}
          catch (error) {if (error.code !== 'ENOENT') throw error;}
        }
        if (req.method === 'GET' && (!endpoint || url.searchParams.get('details') !== '1')) return send(200, {ready: !!endpoint});
        if (!endpoint) return send(409, {error: 'browserNotReady'});
        const input = req.method === 'POST' ? await jsonBody(req) : null;
        // Large console downloads may take hours before returning their saved path.
        // Avoid fetch's shorter response-header deadline for this local operation.
        const response = await new Promise((resolve, reject) => {
          const proxy = http.request({hostname: '127.0.0.1', port: endpoint.port, method: req.method,
            headers: {authorization: 'Bearer ' + endpoint.token, 'Content-Type': 'application/json'}}, reply => {
            let body = '';
            reply.setEncoding('utf8'); reply.on('error', reject);
            reply.on('data', chunk => {
              body += chunk;
              if (body.length > 1024 * 1024) proxy.destroy(Error('Browser reply too large'));
            });
            reply.on('end', () => {
              try {resolve({status: reply.statusCode, value: JSON.parse(body)});} catch (error) {reject(error);}
            });
          });
          proxy.setTimeout(86400000, () => proxy.destroy(Error('Browser operation timed out')));
          proxy.on('error', reject); proxy.end(input === null ? undefined : JSON.stringify(input));
        });
        return send(response.status, response.value);
      }
      if (req.method === 'GET' && url.pathname === '/api/bootstrap')
        return send(200, await fs.readFile(path.join(ROOT, 'bootstrap.bas')), 'text/plain; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/api/sd-support') {
        await historyWrite; return send(200, await sdSupport(dataRoot));
      }
      if (req.method === 'GET' && url.pathname === '/api/history') {
        await historyWrite;
        return send(200, {runs: await history(dataRoot, child ? state.runFolder : ''), error: state.historyError});
      }
      if (req.method === 'POST' && url.pathname === '/api/open-title') {
        const {id, title} = await jsonBody(req);
        const runs = await history(dataRoot, child ? state.runFolder : '');
        const entry = runs.find(run => run.id === id)?.titles.find(row => row.title === title);
        if (!entry) return send(404, {error: 'invalidTitle'});
        let directory = await runPath(dataRoot, id, entry.folder ? title : undefined);
        if (!entry.folder) directory = path.join(directory, 'games');
        if (await fs.realpath(directory) !== directory || !(await fs.stat(directory)).isDirectory()) throw Error('invalidRun');
        opener(directory, true); return send(200, {opened: true});
      }
      if (req.method === 'GET' && url.pathname === '/api/logs') {
        if (zipBusy) return send(409, {error: 'logsBusy'});
        zipBusy = true;
        try {
          const directory = await runPath(dataRoot, url.searchParams.get('run'));
          const bytes = await diagnostics(directory);
          res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(directory) + '-logs.zip"');
          return send(200, bytes, 'application/zip');
        } finally {zipBusy = false;}
      }
      if (req.method === 'GET' && url.pathname === '/api/catalog') {
        try {return send(200, normalizeCatalog(JSON.parse(await fs.readFile(path.join(dataRoot, 'title-names.json'), 'utf8'))));}
        catch (error) {if (error.code === 'ENOENT') return send(200, {}); throw error;}
      }
      if (req.method === 'POST' && url.pathname === '/api/catalog') {
        if ((child && state.mode !== 'session') || standby) return send(409, {error: 'alreadyActive'});
        const catalog = normalizeCatalog(await jsonBody(req, 4 * 1024 * 1024));
        await writeAtomic(path.join(dataRoot, 'title-names.json'), JSON.stringify(catalog, null, 2) + '\n');
        return send(200, {count: Object.keys(catalog).length});
      }
      if (req.method === 'POST' && url.pathname === '/api/retry') {
        if (child) return send(409, {error: 'alreadyActive'});
        if (!lastInput || state.consoleConnected || state.commandsAttempted || state.status !== 'failed') return send(409, {error: 'sessionReconnectNeeded'});
        start(lastInput); return send(200, {started: true});
      }
      if (req.method === 'POST' && url.pathname === '/api/start') {start(await jsonBody(req)); return send(200, {started: true});}
      if (req.method === 'POST' && url.pathname === '/api/cancel-waiting') {
        if (!child || state.status !== 'waiting' || state.consoleConnected || typer.busy || !child.connected) return send(409, {error: 'alreadyActive'});
        await new Promise((resolve, reject) => child.send({action: 'cancel-waiting'}, error => error ? reject(error) : resolve()));
        return send(200, {requested: true});
      }
      if (req.method === 'POST' && url.pathname === '/api/output') {openExternal(dataRoot, true); return send(200, {opened: true});}
      if (req.method === 'POST' && url.pathname === '/api/usb-logs') {
        const directory = path.join(dataRoot, 'usb-logs'); await fs.mkdir(directory, {recursive: true, mode: 0o700});
        opener(directory, true); return send(200, {opened: true});
      }
      if (req.method === 'POST' && url.pathname === '/api/quit') {
        if (typer.busy) return send(409, {error: 'autoBusy'});
        if (updater.busy) return send(409, {error: 'updateBusy'});
        if (child) return send(409, {error: 'alreadyActive'});
        closing = true;
        send(200, {closed: true}); server.close(); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/takeover') {
        if (!standby || closing || takingOver) return send(409, {error: 'otherInstanceOpen'});
        takingOver = true;
        try {
          // Re-read the registry on every click: another new window may have
          // replaced the original instance since this page was opened.
          const previous = await existingInstance(dataRoot, primaryPort);
          if (previous) {
            if (previous.state.active) return send(409, {error: 'otherInstanceBusy'});
            const response = await fetch(previous.origin + '/api/quit', {method: 'POST',
              headers: {authorization: 'Bearer ' + previous.token, connection: 'close'}, signal: AbortSignal.timeout(2000)});
            if (response.status === 409) return send(409, {error: 'otherInstanceBusy'});
            if (!response.ok || !(await response.json()).closed)
              return send(409, {error: 'otherInstanceUnavailable'});
          }
          let replacement;
          for (let attempt = 0; attempt < 10; attempt++) {
            try {
              replacement = await createApp({dataRoot, port: primaryPort, runner, opener});
              break;
            } catch (error) {
              if (error.code !== 'EADDRINUSE') throw error;
              if (attempt === 9) return send(409, {error: 'otherInstanceUnavailable'});
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          closing = true;
          send(200, {url: replacement.url});
          server.close(); return;
        } finally {takingOver = false;}
      }
      send(404, {error: 'Recurso inexistente.'});
    } catch (error) {send(400, {error: error.message});}
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(port, '127.0.0.1', resolve);
  });
  server.once('close', () => typer.stop());
  boundPort = server.address().port;
  const url = 'http://127.0.0.1:' + boundPort + '/?launch=' + crypto.randomUUID() + '#' + token;
  const sessionFile = path.join(dataRoot, 'desktop-session.json');
  if (!standby) await fs.writeFile(sessionFile, JSON.stringify({url, pid: process.pid,
    appVersion: APP_VERSION, buildId: BUILD_ID}), {mode: 0o600});
  console.log('NS2 Desktop: ' + url);
  console.log('Resultados: ' + dataRoot);
  if (launchBrowser) opener(url);
  return {server, url, token, state, get active() {return !!child || typer.busy || updater.busy;}};
}

async function launchDesktop({dataRoot, port = 39381, launchBrowser = true, opener = openExternal, runner = spawn}) {
  try {return await createApp({dataRoot, port, launchBrowser, opener, runner});}
  catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    // Serve this executable's UI on a separate port instead of silently
    // reopening an older executable. Only the primary instance may run jobs.
    return createApp({dataRoot, port: 0, primaryPort: port, standby: true, launchBrowser, opener, runner});
  }
}

async function main() {
  const dataRoot = process.env.NS2_DATA_ROOT || (process.platform === 'win32' ?
    path.join(process.env.LOCALAPPDATA || os.homedir(), 'NS2 Desktop', 'data') : ROOT);
  await launchDesktop({dataRoot, launchBrowser: !process.argv.includes('--no-browser')});
}

module.exports = {buildArgs, createApp, launchDesktop, existingInstance};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
