#!/usr/bin/env python3
"""Package the tested Windows executable and all tracked source for GitHub Actions."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def digest(file):
    value = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def main():
    version = json.loads((ROOT / 'package.json').read_text())['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', version):
        raise ValueError('Invalid release version')
    executable = ROOT / 'dist/NS2-Desktop.exe'
    expected = (ROOT / 'dist/NS2-Desktop.exe.sha256').read_text().split()[0]
    if digest(executable) != expected:
        raise ValueError('Executable checksum does not match the completed build')
    manifest = json.loads((ROOT / '.build/win-x64/manifest.json').read_text())
    if manifest['version'] != version or manifest['nodeVersion'] != (ROOT / '.node-version').read_text().strip():
        raise ValueError('Build manifest does not match this source version')
    output = ROOT / 'dist/release'
    # Refuse stale files rather than accidentally releasing an earlier executable.
    if output.exists() and any(output.iterdir()):
        raise ValueError('dist/release must be empty before packaging')
    output.mkdir(parents=True, exist_ok=True)
    shutil.copy2(executable, output / ('NS2-Desktop-' + version + '.exe'))
    shutil.copy2(ROOT / 'dist/NODE-LICENSE.txt', output / 'NODE-LICENSE.txt')
    shutil.copy2(ROOT / 'engine/switch2/ouncecake/LICENSE', output / 'OUNCECAKE-LICENSE.txt')
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    excluded = {'.git', '.build', 'dist', 'node_modules', 'runs', 'dumps'}
    sources = sorted(name for name in tracked if name and name != 'SHA256SUMS'
                     and not any(part in excluded for part in Path(name).parts))
    for required in ['.github/workflows/build.yml', '.node-version', 'engine/switch2/ouncecake/LICENSE']:
        if required not in sources:
            raise ValueError('Required source file is not tracked by Git: ' + required)
    checksums = []
    archive = output / ('ns2jb-' + version + '-source.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for name in sources:
            file = ROOT / name
            if not file.is_file() or file.is_symlink():
                raise ValueError('Expected a regular tracked source file: ' + name)
            bundle.write(file, 'ns2jb-main/' + name)
            checksums.append(digest(file) + '  ' + name + '\n')
        bundle.writestr('ns2jb-main/SHA256SUMS', ''.join(checksums))
    manifest['commit'] = os.environ.get('GITHUB_SHA') or subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    manifest['runId'] = os.environ.get('GITHUB_RUN_ID')
    (output / 'build-info.json').write_text(json.dumps(manifest, indent=2) + '\n')
    files = sorted(output.iterdir())
    (output / 'SHA256SUMS').write_text(''.join(digest(file) + '  ' + file.name + '\n' for file in files))
    print('Packaged NS2 Desktop ' + version + ' in ' + str(output))


if __name__ == '__main__':
    main()
