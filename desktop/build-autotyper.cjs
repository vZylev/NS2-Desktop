// Build the pinned USB text sender; it never installs or loads the kernel driver.
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const execute = promisify(execFile);
async function buildAutotyper(root, output) {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw Error('Autotyper build requires Apple Silicon macOS');
  const source = path.join(root, 'desktop/vendor/mac2jb'), lib = path.join(source, 'vendor/libusbd');
  await fs.mkdir(output, {recursive: true});
  const sdk = (await execute('xcrun', ['--sdk', 'macosx', '--show-sdk-path'])).stdout.trim();
  const common = ['-arch', 'arm64', '-isysroot', sdk, '-O2', '-Wall', '-fstack-protector-all', '-I', path.join(lib, 'include'), '-I', path.join(lib, 'src')];
  const dylib = path.join(output, 'libusbd.dylib'), helper = path.join(output, 'mac2jb-send');
  await execute('clang', [...common, '-shared', '-Wl,-install_name,@rpath/libusbd.dylib', '-Wl,-undefined,dynamic_lookup',
    '-lpthread', '-framework', 'CoreFoundation', '-framework', 'IOKit', '-o', dylib,
    ...['src/libusbd.c', 'src/plat/macos/impl.c', 'src/plat/macos/alt_IOUSBDeviceControllerLib.c'].map(file => path.join(lib, file))], {maxBuffer: 8 * 1024 * 1024});
  await execute('clang', [...common, '-std=c11', '-D_POSIX_C_SOURCE=200809L', '-DMAC2JB_GUI',
    path.join(source, 'sender.c'), '-L', output, '-lusbd', '-Wl,-rpath,@executable_path',
    '-framework', 'CoreFoundation', '-framework', 'IOKit', '-o', helper], {maxBuffer: 8 * 1024 * 1024});
  // Keep the imported sender unchanged. Replace only the session-record reader
  // in the generated build copy so it accepts this application's pairing token.
  const commands = path.join(output, 'ns2-commands.c');
  let commandSource = await fs.readFile(path.join(source, 'commands.c'), 'utf8');
  const begin = commandSource.indexOf('static int load_active_start(');
  const end = commandSource.indexOf('static bool approve(', begin);
  if (begin < 0 || end < begin) throw Error('Command sender adapter no longer matches');
  commandSource = commandSource.slice(0, begin) + await fs.readFile(path.join(root, 'desktop/native-src/active-command.h'), 'utf8') + '\n' + commandSource.slice(end);
  commandSource = commandSource.replace('int main(int argc, char **argv) {', `int main(int argc, char **argv) {
    if (argc == 2 && !strcmp(argv[1], "--validate-start-only")) {
        char command[512]; return load_active_start(command, sizeof(command)) == 0 ? 0 : 1;
    }`);
  await fs.writeFile(commands, commandSource);
  const commandHelper = path.join(output, 'ns2-commands');
  await execute('clang', [...common, '-std=c11', '-D_POSIX_C_SOURCE=200809L', '-DMAC2JB_GUI', '-I', source,
    commands, '-L', output, '-lusbd', '-Wl,-rpath,@executable_path',
    '-framework', 'CoreFoundation', '-framework', 'IOKit', '-o', commandHelper], {maxBuffer: 8 * 1024 * 1024});
  for (const file of [dylib, helper, commandHelper]) {
    await execute('codesign', ['--force', '--sign', '-', file]);
    await execute('codesign', ['--verify', '--strict', file]);
  }
  // This validates our exact bootstrap and dynamic-library loading without USB IO.
  await execute(helper, [path.join(root, 'bootstrap.bas'), '--dry-run'], {timeout: 15000});
  await execute(commandHelper, ['--dry-run'], {timeout: 15000});
  return [['desktop/native/mac2jb-send', helper], ['desktop/native/ns2-commands', commandHelper], ['desktop/native/libusbd.dylib', dylib]];
}
module.exports = {buildAutotyper};
