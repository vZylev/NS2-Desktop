const fs = require('node:fs/promises');
const path = require('node:path');
const {a} = require('../shared/rpc.cjs');
const {run} = require('../shared/stages.cjs');
const {connect} = require('./tools/fs-memory.cjs');
const runtime = require('./ro/runtime.cjs');
const {emitProgress} = require('../shared/progress.cjs');
const {read, save, local, hash} = runtime;
const check = (ok, message) => {if (!ok) throw Error(message);};

async function main() {
  check(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--dump-firmware',
    'Usage: pipeline.cjs [--dump-firmware]');
  const dumpFirmware = process.argv[2] === '--dump-firmware';
  if (JSON.parse(process.env.NS2_GAME_OPTIONS || 'null')?.mode === 'session') {
    process.env.NS2_FIRMWARE_DUMP_DIR = path.resolve(__dirname, '../system-code');
    await fs.mkdir(process.env.NS2_FIRMWARE_DUMP_DIR, {recursive: true});
  }
  const file = path.join(__dirname, 'pipeline.json');
  const record = {session: a.session, started: new Date().toISOString(), stages: []};
  await fs.writeFile(file, JSON.stringify(record) + '\n', {flag: 'wx', mode: 0o600});
  async function stage(name, action) {
    console.log(name);
    emitProgress({kind: 'phase', profile: name});
    const row = {name, started: new Date().toISOString(), status: 'running'};
    record.stages.push(row); await save(file, record);
    try {
      row.result = await action(); row.status = 'complete';
      return row.result;
    } catch (error) {row.status = 'failed'; row.error = error.stack; throw error;}
    finally {row.finished = new Date().toISOString(); await save(file, record);}
  }
  const script = (folder, name, args = [], timeout) =>
    stage(folder + '/' + name, () => run(path.join(__dirname, folder), name, args, timeout));
  let acquisition;
  try {
    console.log('1/4 Checking the console');
    await script('app', 'map');
    await script('app', 'inspect-mounts');
    await stage('Remove recorded scratch from prior launches', () => require('./cleanup-scratch.cjs').main());
    const app = await script('app', 'qualify');
    check(app.verified && app.cleanedUp, 'Application worker qualification failed');
    console.log('2/4 Acquiring FS memory');
    await stage('FS read, write and restoration', async () => {
      acquisition = await require('./acquire.cjs').start();
      return {report: acquisition.report, proof: acquisition.proof};
    });
    console.log('3/4 Starting the native helper');
    const captured = await read(acquisition.report);
    if (!captured.retainedMemory?.captures?.some(c => c.length === 0x4d8000))
      await script('retained', 'find-metadata', [acquisition.supervisorReport]);
    await script('ro', 'install-retained');
    await stage('FS layout', () => require('./ro/layout.cjs').main());
    await stage('Owned FS root', () => require('./ro/objects.cjs').main('root'));
    await stage('Owned FS notifier', () => require('./ro/objects.cjs').main('notifier'));
    const layout = await read(local(a.session, '-layout.json'));
    await script('ro', 'test-sm', [String(layout.sdk + 0x12a0)]);
    await script('ro', 'copy-loader-root', [String(layout.target.entry)]);
    await script('ro', 'prepare-workers');
    const donor = await stage('RO payload and current console policy', async () => {
      const memory = await connect(), sm = await read(local(a.session, '-sm-proof.json'));
      const monitor = await memory.request({command: 'root-native-sm-service', handle: sm.export.handle, name: 'pm:dmnt'});
      check(!monitor.result && !monitor.transport, 'PM monitor did not open');
      const loader = await read(local(a.session, '-loader-root-copy.json'));
      const code = await memory.request({command: 'root-native-code-open', handle: loader.copy.handle, title: '0x0400000000000037'});
      check(!code.result, 'Native RO CodeFS did not open');
      for (const name of ['main.npdm', 'main'])
        await memory.request({command: 'root-native-file-capture', handle: code.handle, name});
      const result = await memory.request({command: 'root-native-donor-prepare'});
      check(result.ready && result.files.every(item => item.verified), 'The payload files did not verify');
      return result;
    });
    await script('ro', 'bind-sessions');
    await script('ro', 'prepare-event');
    const gate = await script('ro', 'test-gate');
    check(gate.verified && gate.restored, 'The native request gate did not qualify');
    const launch = await script('ro', 'launch', [], 300000);
    check(launch.imageAccepted && launch.restored && launch.pid, 'PM did not accept the payload');
    const activation = await stage('Start RO payload', () => runtime.activate(launch.file));
    const proof = await stage('RO instruction challenges', () => runtime.probe(activation.pid));
    const handoff = await stage('Restore Loader session', () => runtime.handoff());
    const payload = donor.files.find(item => item.name === 'main');
    check(payload.sha256 === hash(await fs.readFile(path.join(__dirname, 'ro/payload/main'))), 'Payload changed during launch');
    await save(runtime.executionFile, {verified: true, session: a.session, report: acquisition.report,
      pid: proof.pid, programId: '0400000000000037', payloadSha256: payload.sha256,
      proof: proof.file, launch: launch.file, identity: activation.file, handoff: handoff.file});
    console.log('4/4 Running the FS demo');
    await script('process', 'bind-notifier');
    const mapping = await script('process', 'qualify');
    check(mapping.verified && mapping.cleanup?.finished, 'Native process mapping did not qualify and clean up');
    const execution = await stage('FS instruction challenges', () => require('./process/fs-execute.cjs').main());
    check(execution.verified && execution.restored, 'FS execution or restoration did not verify');
    if (dumpFirmware) {
      console.log('Firmware: beginning read-only system-program CodeFS capture');
      record.firmwareDump = await stage('Enumerate and capture installed system code',
        () => require('./firmware-dump.cjs').main(execution.file));
    }
    if (process.env.NS2_GAME_OPTIONS && process.env.NS2_GAME_OPTIONS !== 'null') {
      const mode = JSON.parse(process.env.NS2_GAME_OPTIONS).mode;
      const label = mode === 'session' ? 'Session tools ready' : mode === 'extract' ? 'OunceCake RomFS/ExeFS browser and extraction' :
        mode === 'browse' ? 'Console file browser' : 'Game content inventory/export';
      console.log('Files: ' + label);
      record.gameExport = await stage(label,
        () => ['browse', 'extract', 'session'].includes(JSON.parse(process.env.NS2_GAME_OPTIONS).mode) ?
          require('./file-browser.cjs').main(execution.file) : require('./game-export.cjs').main(execution.file));
    }
    const cleanup = await stage('Release FS resources', async () => {
      const memory = await connect();
      const donor = await memory.request({command: 'root-native-donor-cleanup'});
      check(donor.cleanedUp, 'Donor files did not clean up');
      return {...await acquisition.retire(), donor};
    });
    const result = {...execution, cleanup, started: record.started, completed: new Date().toISOString()};
    await save(path.join(__dirname, 'fs-execution-current.json'), result);
    record.verified = true; record.result = result;
  } catch (error) {
    record.error = error.stack;
    if (acquisition) {
      try {
        const latest = await read(acquisition.report);
        // Before promotion, the acquisition still owns its original restoration
        // path. Later failures may have native state that needs a console reboot.
        if (!latest.nativeRo && !latest.retainedMemory?.promoted)
          record.failureCleanup = await acquisition.retire();
        else await acquisition.abandon();
      } catch (cleanupError) {
        record.cleanupError = cleanupError.stack;
        await acquisition.abandon();
      }
    }
    throw error;
  } finally {record.finished = new Date().toISOString(); await save(file, record);}
}

module.exports = {main};
if (require.main === module) main().catch(error => {console.error(error.stack); process.exitCode = 1;});
