const fs = require('node:fs/promises');
const {constants} = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const {spawn, execFile} = require('node:child_process');
const {promisify} = require('node:util');
const execute = promisify(execFile);
const GUIDE = '/usb-help';
const os = require('node:os');
function senderEnvironment(base, controller) {
  if (controller !== 'auto' && !/^usb-drd(?:[0-9]|1[0-5])$/.test(controller)) throw Error('autoInvalidController');
  const env = {...base, MAC2JB_ENUMERATION_TIMEOUT_SECONDS: '15'};
  for (const key of ['MAC2JB_CONTROLLER', 'MAC2JB_AUTO_WORKER', 'MAC2JB_READY_FD', 'NS2_ACTIVE_COMMAND_FILE']) delete env[key];
  if (controller !== 'auto') env.MAC2JB_CONTROLLER = controller;
  return env;
}
function validateCommand(command) {
  if (typeof command !== 'string' || !/^V=START\([0-9]+(?:,[0-9]+){8}\)$/.test(command)) throw Error('autoInvalidSession');
  const values = command.slice(8, -1).split(',').map(Number);
  if (values.length !== 9 || values[0] !== 39380 || values.some(n => !Number.isSafeInteger(n) || n < 0) ||
      values.slice(1, 5).some(n => n > 255) || values.slice(5).some(n => n > 2 ** 48 - 1)) throw Error('autoInvalidSession');
  return command;
}
async function systemDiagnostics() {
  const result = {os: os.release(), sip: 'unknown', controllers: []};
  try {result.sip = (await execute('/usr/bin/csrutil', ['status'], {timeout: 5000})).stdout.trim();} catch {}
  try {
    const text = (await execute('/usr/sbin/ioreg', ['-p', 'IOService', '-w', '0'], {timeout: 5000, maxBuffer: 4 * 1024 * 1024})).stdout;
    result.controllers = [...new Set(text.match(/usb-drd(?:[0-9]|1[0-5])\b/g) || [])];
  } catch {}
  return result;
}
function createAutotyper({dataRoot = null, diagnose = systemDiagnostics, root = path.resolve(__dirname, '..'), platform = process.platform, arch = process.arch,
  runner = spawn, signal = (pid, name) => process.kill(pid, name),
  helperAvailable = async file => {try {await fs.access(file, constants.X_OK); await fs.access(path.join(path.dirname(file), 'libusbd.dylib')); return true;} catch {return false;}},
  probeDriver = async () => {
    const {stdout} = await execute('/usr/bin/kmutil', ['showloaded', '--list-only'], {timeout: 10000, maxBuffer: 2 * 1024 * 1024});
    return /\busbgadget\b/i.test(stdout);
  }} = {}) {
  const supported = platform === 'darwin' && arch === 'arm64';
  const helper = path.join(root, 'desktop/native/mac2jb-send'), commandHelper = path.join(root, 'desktop/native/ns2-commands'), bootstrap = path.join(root, 'bootstrap.bas');
  let logWrites = Promise.resolve(), logBytes = 0;
  let child = null, operation = false, checking = null, stopping = false, stopTimer, transferTimer;
  const state = {supported, status: supported ? 'unchecked' : 'unsupported', helperPresent: false,
    kind: 'bootstrap', commandsPresent: false, diagnostic: null, logFile: '', logError: '', wait: null,
    driverLoaded: false, completed: 0, total: 0, preview: null, error: '', logs: [], guide: GUIDE};
  function snapshot() {return {...state, logs: [...state.logs], busy: operation || !!checking};}
  function persist(line) {
    if (!state.logFile || logBytes > 4 * 1024 * 1024) return;
    const file = state.logFile, bytes = new Date().toISOString() + ' ' + line + '\n'; logBytes += Buffer.byteLength(bytes);
    logWrites = logWrites.then(() => fs.appendFile(file, bytes)).catch(error => {state.logError = error.message;});
  }
  function log(line) {
    line = String(line).slice(0, 2000);
    persist(line);
    state.logs.push(line); if (state.logs.length > 80) state.logs.shift();
    if (line.startsWith('MAC2JB_GUI ')) {
      try {
        const event = JSON.parse(line.slice(11));
        if (['line-start', 'line-complete', 'command-start', 'command-complete'].includes(event.type) && Number.isInteger(event.completed) &&
            event.completed >= 0 && event.completed <= state.total && event.total === state.total) {
          state.completed = event.completed; state.wait = null;
          if (!stopping) state.status = 'typing';
        }
        if (event.type === 'wait' && Number.isInteger(event.remainingMs) && event.remainingMs >= 0 && event.remainingMs <= 120000)
          state.wait = {remainingMs: event.remainingMs, label: String(event.label).slice(0, 40)};
      } catch {}
    }
  }
  async function inspect() {
    state.error = '';
    if (!supported) {state.status = 'unsupported'; return snapshot();}
    state.status = 'checking'; state.driverLoaded = false;
    state.helperPresent = await helperAvailable(helper);
    state.commandsPresent = await helperAvailable(commandHelper);
    if (!state.helperPresent) {state.status = 'missing-helper'; return snapshot();}
    try {
      const bytes = await fs.readFile(bootstrap);
      if (!bytes.length || bytes.length > 1024 * 1024) throw Error('Invalid bundled bootstrap');
      const text = bytes.toString('utf8');
      state.preview = {bytes: bytes.length, lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
      state.driverLoaded = await probeDriver();
      state.diagnostic = await diagnose();
      state.status = state.driverLoaded ? 'ready' : 'missing-driver';
    } catch (error) {state.status = 'check-failed'; state.error = error.message;}
    return snapshot();
  }
  async function check() {
    if (operation) return snapshot();
    if (!checking) checking = inspect().finally(() => {checking = null;});
    await checking; return snapshot();
  }
  async function start(input, session = null) {
    if (operation || checking) throw Error('autoBusy');
    if (input.confirmed !== true) throw Error('autoConfirmRequired');
    if (![50, 100, 200].includes(input.delayMs)) throw Error('autoInvalidDelay');
    const env = senderEnvironment(process.env, input.controller || 'auto');
    const waitMs = input.waitMs ?? 3000;
    if (![3000, 5000, 10000].includes(waitMs)) throw Error('autoInvalidDelay');
    if (session) {
      validateCommand(session.command);
      if (!dataRoot || !Number.isInteger(session.pid) || session.pid <= 1 || !session.isCurrent()) throw Error('autoInvalidSession');
    }
    operation = true;
    try {
      await inspect();
      if (state.status !== 'ready' || session && !state.commandsPresent) throw Error('autoNotReady');
      stopping = false; state.kind = session ? 'commands' : 'bootstrap'; state.status = 'starting'; state.completed = 0; state.total = session ? 4 : state.preview.lines;
      state.wait = null; state.logError = ''; state.logFile = ''; logBytes = 0;
      let directory;
      if (dataRoot) {
        const parent = path.join(dataRoot, 'usb-logs'); await fs.mkdir(parent, {recursive: true, mode: 0o700});
        directory = await fs.mkdtemp(path.join(parent, state.kind + '-'));
        state.logFile = path.join(directory, 'typing.log');
        await fs.writeFile(state.logFile, '', {flag: 'wx', mode: 0o600});
      }
      if (session) {
        if (!session.isCurrent()) throw Error('autoInvalidSession');
        env.NS2_ACTIVE_COMMAND_FILE = path.join(directory, 'active-command');
        await fs.writeFile(env.NS2_ACTIVE_COMMAND_FILE, session.pid + '\n' + session.command + '\n', {flag: 'wx', mode: 0o600});
        if (!session.isCurrent()) throw Error('autoInvalidSession');
      }
      state.logs = []; state.error = '';
      const args = session ? ['--auto', '--gui-events', '--delay-ms', String(input.delayMs),
        '--load-wait-ms', String(waitMs), '--run-wait-ms', String(waitMs), '--remove-wait-ms', String(waitMs),
        '--load-confirm-wait-ms', '1000', '--enumeration-timeout', '15'] : [bootstrap, '--delay-ms', String(input.delayMs)];
      const current = runner(session ? commandHelper : helper, args,
        {cwd: root, env, detached: true, stdio: ['pipe', 'pipe', 'pipe']});
      child = current;
      if (session) session.onStarted();
      log('Started ' + state.kind + ' transfer; delay ' + input.delayMs + ' ms.');
      const finish = (code, error) => {
        if (child !== current) return;
        clearTimeout(stopTimer); clearTimeout(transferTimer); child = null; operation = false;
        if (error) state.error = error.message;
        state.wait = null;
        if (env.NS2_ACTIVE_COMMAND_FILE) fs.rm(env.NS2_ACTIVE_COMMAND_FILE, {force: true}).catch(() => {});
        state.status = stopping ? 'stopped' : code === 0 && !error && !state.error ? 'finished' : 'failed';
        log('Transfer ' + state.status + '; completed ' + state.completed + '/' + state.total + (state.error ? '; ' + state.error : ''));
      };
      for (const stream of [current.stdout, current.stderr]) readline.createInterface({input: stream}).on('line', log);
      current.once('error', error => finish(null, error));
      current.once('close', code => finish(code));
      current.stdin.on('error', error => {state.error = error.message;});
      // The UI checkbox and explicit Start action replace the sender's Enter prompt.
      current.stdin.end('\n');
      transferTimer = setTimeout(() => {log('Transfer time limit reached; stopping.'); stop();}, 60 * 60 * 1000);
      transferTimer.unref();
      return snapshot();
    } catch (error) {
      operation = false;
      if (env.NS2_ACTIVE_COMMAND_FILE) await fs.rm(env.NS2_ACTIVE_COMMAND_FILE, {force: true}).catch(() => {});
      if (state.status === 'starting') {state.status = 'failed'; state.error = error.message;}
      throw error;
    }
  }
  function stop() {
    if (!child || stopping) return snapshot();
    stopping = true; state.status = 'stopping';
    const current = child;
    try {signal(-current.pid, 'SIGINT');} catch (error) {if (error.code !== 'ESRCH') state.error = error.message;}
    stopTimer = setTimeout(() => {
      if (child !== current) return;
      try {signal(-current.pid, 'SIGKILL');} catch (error) {if (error.code !== 'ESRCH') state.error = error.message;}
    }, 5000);
    stopTimer.unref();
    return snapshot();
  }
  return {snapshot, check, start, stop, flushLogs: () => logWrites, get busy() {return operation || !!checking;}};
}
module.exports = {createAutotyper, senderEnvironment, validateCommand, systemDiagnostics};
