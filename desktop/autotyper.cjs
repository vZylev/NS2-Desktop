const fs = require('node:fs/promises');
const {constants} = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const {spawn, execFile} = require('node:child_process');
const {promisify} = require('node:util');
const execute = promisify(execFile);
const GUIDE = 'https://github.com/cpypwn/mac2jb#readme';
function senderEnvironment(base, controller) {
  if (controller !== 'auto' && !/^usb-drd(?:[0-9]|1[0-5])$/.test(controller)) throw Error('autoInvalidController');
  const env = {...base, MAC2JB_ENUMERATION_TIMEOUT_SECONDS: '15'};
  for (const key of ['MAC2JB_CONTROLLER', 'MAC2JB_AUTO_WORKER', 'MAC2JB_READY_FD']) delete env[key];
  if (controller !== 'auto') env.MAC2JB_CONTROLLER = controller;
  return env;
}
function createAutotyper({root = path.resolve(__dirname, '..'), platform = process.platform, arch = process.arch,
  runner = spawn, signal = (pid, name) => process.kill(pid, name),
  helperAvailable = async file => {try {await fs.access(file, constants.X_OK); await fs.access(path.join(path.dirname(file), 'libusbd.dylib')); return true;} catch {return false;}},
  probeDriver = async () => {
    const {stdout} = await execute('/usr/bin/kmutil', ['showloaded', '--list-only'], {timeout: 10000, maxBuffer: 2 * 1024 * 1024});
    return /\busbgadget\b/i.test(stdout);
  }} = {}) {
  const supported = platform === 'darwin' && arch === 'arm64';
  const helper = path.join(root, 'desktop/native/mac2jb-send'), bootstrap = path.join(root, 'bootstrap.bas');
  let child = null, operation = false, checking = null, stopping = false, stopTimer, transferTimer;
  const state = {supported, status: supported ? 'unchecked' : 'unsupported', helperPresent: false,
    driverLoaded: false, completed: 0, total: 0, preview: null, error: '', logs: [], guide: GUIDE};
  function snapshot() {return {...state, logs: [...state.logs], busy: operation || !!checking};}
  function log(line) {
    line = String(line).slice(0, 2000);
    state.logs.push(line); if (state.logs.length > 80) state.logs.shift();
    if (line.startsWith('MAC2JB_GUI ')) {
      try {
        const event = JSON.parse(line.slice(11));
        if (['line-start', 'line-complete'].includes(event.type) && Number.isInteger(event.completed) &&
            event.completed >= 0 && event.completed <= state.total && event.total === state.total) {
          state.completed = event.completed;
          if (!stopping) state.status = 'typing';
        }
      } catch {}
    }
  }
  async function inspect() {
    state.error = '';
    if (!supported) {state.status = 'unsupported'; return snapshot();}
    state.status = 'checking'; state.driverLoaded = false;
    state.helperPresent = await helperAvailable(helper);
    if (!state.helperPresent) {state.status = 'missing-helper'; return snapshot();}
    try {
      const bytes = await fs.readFile(bootstrap);
      if (!bytes.length || bytes.length > 1024 * 1024) throw Error('Invalid bundled bootstrap');
      const text = bytes.toString('utf8');
      state.preview = {bytes: bytes.length, lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
      state.driverLoaded = await probeDriver();
      state.status = state.driverLoaded ? 'ready' : 'missing-driver';
    } catch (error) {state.status = 'check-failed'; state.error = error.message;}
    return snapshot();
  }
  async function check() {
    if (operation) return snapshot();
    if (!checking) checking = inspect().finally(() => {checking = null;});
    await checking; return snapshot();
  }
  async function start(input) {
    if (operation || checking) throw Error('autoBusy');
    if (input.confirmed !== true) throw Error('autoConfirmRequired');
    if (![50, 100, 200].includes(input.delayMs)) throw Error('autoInvalidDelay');
    const env = senderEnvironment(process.env, input.controller || 'auto');
    operation = true;
    try {
      await inspect();
      if (state.status !== 'ready') throw Error('autoNotReady');
      stopping = false; state.status = 'starting'; state.completed = 0; state.total = state.preview.lines;
      state.logs = []; state.error = '';
      const current = runner(helper, [bootstrap, '--delay-ms', String(input.delayMs)],
        {cwd: root, env, detached: true, stdio: ['pipe', 'pipe', 'pipe']});
      child = current;
      const finish = (code, error) => {
        if (child !== current) return;
        clearTimeout(stopTimer); clearTimeout(transferTimer); child = null; operation = false;
        if (error) state.error = error.message;
        state.status = stopping ? 'stopped' : code === 0 && !error && !state.error ? 'finished' : 'failed';
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
  return {snapshot, check, start, stop, get busy() {return operation || !!checking;}};
}
module.exports = {createAutotyper, senderEnvironment};
