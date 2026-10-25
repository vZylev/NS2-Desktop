#!/usr/bin/env node
// Intended purpose: a research and diagnostics tool for an owner-authorized console.
// Memory exploitation describes a technical mechanism, not malicious intent.
// The intended use is non-malicious; this comment does not certify every possible use.
const fs = require('node:fs/promises');
const {createWriteStream} = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const readline = require('node:readline');
const {pairingCode, listen} = require('./engine/lib/connection.cjs');
const {NativeClient} = require('./engine/lib/native.cjs');
const {qualify} = require('./engine/lib/qualify.cjs');
const {serve} = require('./engine/lib/bridge.cjs');
const {parseGameOptions} = require('./engine/shared/game-options.cjs');
const {forwardLine} = require('./engine/shared/progress.cjs');
const TOOL_VERSION = require('./package.json').version;

const port = 39380;
const save = (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
const DUMP_MARKER = '.ns2jb-firmware-dump.json';

async function prepareDumpDirectory(root = path.join(__dirname, 'dumps')) {
  const parent = path.dirname(root);
  const previous = await fs.lstat(root).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (previous) {
    if (!previous.isDirectory() || previous.isSymbolicLink() ||
        previous.dev !== (await fs.stat(parent)).dev)
      throw Error('Refusing to clean a symlink, mount, or non-directory at ' + root);
    const marker = await fs.readFile(path.join(root, DUMP_MARKER), 'utf8').then(JSON.parse).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!marker || marker.kind !== 'ns2jb-system-code-dump' || marker.version !== 1) {
      if ((await fs.readdir(root)).length)
        throw Error('Refusing to clean an unrecognized nonempty dumps directory: ' + root);
    }
    await fs.rm(root, {recursive: true});
  }
  await fs.mkdir(root, {mode: 0o700});
  await fs.writeFile(path.join(root, DUMP_MARKER), JSON.stringify({
    kind: 'ns2jb-system-code-dump', version: 1, started: new Date().toISOString()
  }, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  return {root, cleaned: !!previous};
}

function addresses(interfaces = os.networkInterfaces()) {
  return [...new Set(Object.values(interfaces).flat().filter(a =>
    a.family === 'IPv4' && !a.internal && a.netmask !== '255.255.255.255' &&
    !a.address.startsWith('169.254.')).map(a => a.address))];
}

async function chooseHost(args) {
  if (args.length > 1 || args.length === 1 && !net.isIPv4(args[0]))
    throw Error('Usage: node run.cjs [computer-IP]');
  if (args.length) return args[0];
  const choices = addresses();
  if (choices.length === 1) return choices[0];
  if (!choices.length) throw Error('Connect this computer to the console’s local network.');
  if (!process.stdin.isTTY)
    throw Error('Choose the address on the console’s network: node run.cjs IP\nAvailable: ' + choices.join(', '));
  choices.forEach((address, i) => console.log(`  ${i + 1}. ${address}`));
  const input = require('node:readline/promises').createInterface({input: process.stdin, output: process.stdout});
  try {
    const choice = await input.question('Which computer address can the Switch 2 reach? ');
    if (!/^[1-9][0-9]*$/.test(choice) || !choices[Number(choice) - 1]) throw Error('Choose one of the listed addresses.');
    return choices[Number(choice) - 1];
  } finally {input.close();}
}

function connectCommand(host, token) {
  return `V=START(${[port, ...host.split('.'), ...token].join(',')})`;
}

function parsePairingOptions(args) {
  const flags = args.filter(arg => arg === '--single-console');
  if (flags.length > 1) throw Error('Use --single-console only once');
  return {singleConsole: flags.length === 1, args: args.filter(arg => arg !== '--single-console')};
}

async function sourceDigest() {
  const names = ['run.cjs', 'dump-firmware.cjs', 'pack-game.cjs', 'bootstrap.bas', 'package.json'];
  async function walk(folder) {
    for (const entry of await fs.readdir(path.join(__dirname, folder), {withFileTypes: true})) {
      const name = folder + '/' + entry.name;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) names.push(name);
      else throw Error('Unexpected runtime file: ' + name);
    }
  }
  await walk('engine');
  const entries = [];
  for (const name of names.sort()) entries.push([name,
    crypto.createHash('sha256').update(await fs.readFile(path.join(__dirname, name))).digest('hex')]);
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

async function runEngine(directory, dumpDirectory = null, gameOptions = null) {
  const log = await fs.open(path.join(directory, 'run.log'), 'wx', 0o600);
  const output = createWriteStream(null, {fd: log.fd, autoClose: false});
  try {
    const child = spawn(process.execPath, [path.join(directory, 'switch2/pipeline.cjs'),
      ...(dumpDirectory ? ['--dump-firmware'] : [])],
      {cwd: directory, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
        env: {...process.env, NS2_GAME_OPTIONS: JSON.stringify(gameOptions),
          ...(dumpDirectory ? {NS2_FIRMWARE_DUMP_DIR: dumpDirectory} : {})}});
    child.stdout.pipe(output, {end: false});
    child.stderr.pipe(output, {end: false});
    for (const stream of [child.stdout, child.stderr])
      readline.createInterface({input: stream}).on('line', line => {
        if (forwardLine(line)) console.log(line);
      });
    const code = await new Promise((resolve, reject) => {
      output.once('error', error => {child.kill('SIGTERM'); reject(error);});
      child.once('error', reject); child.once('close', resolve);
    });
    if (code !== 0) throw Error('The run stopped. Keep the runs folder and restart the console before trying again.');
  } finally {
    if (!output.destroyed)
      await new Promise((resolve, reject) => {output.once('error', reject); output.end(resolve);});
    await log.close();
  }
}

async function main(args = process.argv.slice(2)) {
  const pairing = parsePairingOptions(args);
  args = pairing.args;
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node run.cjs [--session | --extract-files | --browse-files | --dump-firmware | --list-games | --probe-game ID | --dump-game ID] [--storage 2|4|5] [--version N] [--single-console] [computer-IP]\n' +
      '--single-console uses 0,0,0,0 for pairing; otherwise a fresh session code is generated.\n' +
      'Switch 2 only. No npm install required. See README.md for the BASIC setup.');
    return;
  }
  const session = args[0] === '--session';
  const extracting = args[0] === '--extract-files';
  const browse = session || extracting || args[0] === '--browse-files';
  if (browse) args = args.slice(1);
  const dumpFirmware = args[0] === '--dump-firmware';
  const game = parseGameOptions(args);
  const host = await chooseHost(game ? game.hostArgs : dumpFirmware ? args.slice(1) : args);
  const outputRoot = process.env.NS2_DATA_ROOT || __dirname;
  if (!path.isAbsolute(outputRoot)) throw Error('NS2_DATA_ROOT must be an absolute directory');
  const token = pairingCode({singleConsole: pairing.singleConsole}), command = connectCommand(host, token);
  console.log('NS2 Desktop ' + TOOL_VERSION + ' · build ' + (process.env.NS2_BUILD_ID || 'source').slice(0, 12));
  const workspace = path.join(outputRoot, 'runs');
  await fs.mkdir(workspace, {recursive: true, mode: 0o700});
  let dumpDirectory;
  if (dumpFirmware) {
    const space = await fs.statfs(workspace);
    if (BigInt(space.bavail) * BigInt(space.bsize) < 512n * 1024n * 1024n)
      throw Error('The optional system-code dump needs at least 512 MiB free on the computer before starting.');
    const prepared = await prepareDumpDirectory(path.join(outputRoot, 'dumps'));
    dumpDirectory = prepared.root;
    if (prepared.cleaned) console.log('Previous system-code dump removed from ' + dumpDirectory);
    console.log('System-code dump folder: ' + dumpDirectory);
  }
  const directory = await fs.mkdtemp(path.join(workspace, 'switch2-'));
  await fs.writeFile(path.join(directory, 'connect.txt'), command + '\n', {mode: 0o600});
  const result = {platform: 2, pairingMode: pairing.singleConsole ? 'single' : 'session',
    toolVersion: TOOL_VERSION, buildId: process.env.NS2_BUILD_ID || 'source',
    sourceSha256: await sourceDigest(), started: new Date().toISOString(), verified: false};
  let native, bridge, failure;
  try {
    const connected = await listen({host, port, token, onWaiting() {
      console.log(`Waiting for Switch 2 at ${host}:${port}.`);
      console.log('In a freshly opened SmileBASIC, load the saved bootstrap and enter:');
      console.log('  RUN\n  REMOVE NSR,&H60000000,&H3FFFFFFF');
      console.log('After the expected Out of memory message, enter:');
      console.log('  ' + command);
      console.log('Run folder: ' + directory);
    }});
    native = new NativeClient(connected.connection, connected.addresses);
    console.log('Connected. Checking the application...');
    result.bootstrap = await qualify(native);
    bridge = await serve(native);
    bridge.keepAwake(result.bootstrap.activity);
    await save(path.join(directory, 'connection.json'), {port: bridge.port, token: bridge.token,
      addresses: {...connected.addresses, session: path.basename(directory), target: 'switch2'}});
    for (const name of ['shared', 'switch2'])
      await fs.cp(path.join(__dirname, 'engine', name), path.join(directory, name), {recursive: true});
    await runEngine(directory, dumpDirectory, browse ? {mode: session ? 'session' : extracting ? 'extract' : 'browse'} : game?.options);
    result.fs = JSON.parse(await fs.readFile(path.join(directory, 'switch2/fs-execution-current.json')));
    if (!result.fs.verified || !result.fs.restored || !result.fs.cleanup?.cleanedUp)
      throw Error('FS execution, restoration, or cleanup did not finish.');
    if (game) {
      result.games = JSON.parse(await fs.readFile(path.join(directory, 'switch2/pipeline.json'))).gameExport;
      if (!result.games?.complete) throw Error('Game inventory/export was incomplete; inspect its game-export.json report.');
    }
    if (dumpFirmware) {
      result.firmwareDump = JSON.parse(await fs.readFile(path.join(dumpDirectory, 'firmware-dump.json')));
      if (!result.firmwareDump.complete || result.firmwareDump.entries.length !== result.firmwareDump.inventory.total)
        throw Error('The system-code dump did not finish.');
    }
    result.verified = true;
  } catch (error) {result.error = error.message; failure = error;}
  finally {
    for (const [name, close] of [['bridge', () => bridge?.close()], ['connection', () => native?.stop()]]) {
      try {await close();}
      catch (error) {(result.cleanupErrors ||= []).push({name, error: error.message}); failure ||= error;}
    }
    result.completed = new Date().toISOString();
    await save(path.join(directory, 'result.json'), result);
  }
  if (failure) throw Error(failure.message + '\nDetails: ' + directory);
  console.log('FS execution verified. Original instructions restored and scratch cleaned up.');
  if (dumpFirmware) console.log('System-program CodeFS dump: ' +
    path.join(dumpDirectory, 'firmware-dump.json'));
  console.log('Restart the console when finished.');
  return result;
}

module.exports = {main, addresses, chooseHost, connectCommand, parsePairingOptions, sourceDigest, prepareDumpDirectory};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
