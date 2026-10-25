#!/usr/bin/env python3
"""Package verified native builds; every format is checked before upload."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
TARGETS = ('win-x64', 'linux-x64', 'darwin-x64', 'darwin-arm64')
PINNED = {
    'appimagetool': ('https://github.com/AppImage/appimagetool/releases/download/1.9.1/appimagetool-x86_64.AppImage',
                    'ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0'),
    'appimage-runtime': ('https://github.com/AppImage/type2-runtime/releases/download/20251108/runtime-x86_64',
                         '2fca8b443c92510f1483a883f60061ad09b46b978b2631c807cd873a47ec260d'),
}


def digest(file):
    value = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def run(*args, **kwargs):
    subprocess.run([str(arg) for arg in args], check=True, **kwargs)


def fetch_tool(name):
    url, expected = PINNED[name]
    file = ROOT / '.build/tools' / name
    file.parent.mkdir(parents=True, exist_ok=True)
    if not file.exists() or digest(file) != expected:
        with urllib.request.urlopen(url, timeout=180) as response:
            file.write_bytes(response.read())
    if digest(file) != expected:
        raise ValueError('Packaging tool checksum mismatch: ' + name)
    file.chmod(0o755)
    return file


def licenses(folder):
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'dist/NODE-LICENSE.txt', folder / 'NODE-LICENSE.txt')
    shutil.copy2(ROOT / 'engine/switch2/ouncecake/LICENSE', folder / 'OUNCECAKE-LICENSE.txt')


def binary(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    target.chmod(0o755)


def smoke(executable):
    # The version probe extracts and executes the embedded runtime, too.
    with tempfile.TemporaryDirectory(prefix='ns2-package-check-') as home:
        run(executable, '--self-test', env={**os.environ, 'NS2_DESKTOP_HOME': home}, timeout=120)


def source_archive(output, version):
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    excluded = {'.git', '.build', 'dist', 'node_modules', 'runs', 'dumps', '__pycache__'}
    sources = sorted(name for name in tracked if name and name != 'SHA256SUMS'
                     and not any(part in excluded for part in Path(name).parts))
    for required in ['.github/workflows/build.yml', '.node-version', 'engine/switch2/ouncecake/LICENSE']:
        if required not in sources:
            raise ValueError('Required source file is not tracked: ' + required)
    checksums = []
    with zipfile.ZipFile(output / ('ns2jb-' + version + '-source.zip'), 'w', zipfile.ZIP_DEFLATED) as bundle:
        for name in sources:
            file = ROOT / name
            if not file.is_file() or file.is_symlink():
                raise ValueError('Expected regular source file: ' + name)
            bundle.write(file, 'ns2jb-main/' + name)
            checksums.append(digest(file) + '  ' + name + '\n')
        bundle.writestr('ns2jb-main/SHA256SUMS', ''.join(checksums))


def desktop_entry(executable):
    return ('[Desktop Entry]\nType=Application\nName=NS2 Desktop\n'
            'Comment=Browse and extract console files\nExec=' + executable + '\n'
            'Icon=ns2-desktop\nTerminal=false\nCategories=Utility;\n')


def linux_packages(executable, output, work, version):
    name = 'NS2-Desktop-' + version + '-linux-x64'
    portable = work / name
    binary(executable, portable / 'NS2-Desktop')
    licenses(portable)
    with tarfile.open(output / (name + '.tar.gz'), 'w:gz') as bundle:
        bundle.add(portable, arcname=name)
    unpacked = work / 'tar-check'
    with tarfile.open(output / (name + '.tar.gz')) as bundle:
        bundle.extractall(unpacked)
    smoke(unpacked / name / 'NS2-Desktop')

    root = work / 'root'
    binary(executable, root / 'opt/ns2-desktop/NS2-Desktop')
    licenses(root / 'opt/ns2-desktop')
    (root / 'usr/bin').mkdir(parents=True)
    (root / 'usr/bin/ns2-desktop').symlink_to('/opt/ns2-desktop/NS2-Desktop')
    applications = root / 'usr/share/applications'
    applications.mkdir(parents=True)
    (applications / 'ns2-desktop.desktop').write_text(desktop_entry('ns2-desktop'))
    icons = root / 'usr/share/icons/hicolor/scalable/apps'
    icons.mkdir(parents=True)
    shutil.copy2(ROOT / 'desktop/assets/ns2-desktop.svg', icons)
    debroot = work / 'deb'
    shutil.copytree(root, debroot, symlinks=True)
    (debroot / 'DEBIAN').mkdir()
    (debroot / 'DEBIAN/control').write_text(
        'Package: ns2-desktop\nVersion: ' + version + '\nArchitecture: amd64\n'
        'Maintainer: vZylev <127633586+vZylev@users.noreply.github.com>\n'
        'Section: utils\nPriority: optional\n'
        'Depends: libc6 (>= 2.28), libstdc++6, libgcc-s1, xdg-utils\n'
        'Homepage: https://github.com/vZylev/NS2-Desktop\n'
        'Description: Graphical console file browser and extraction tools\n')
    deb = output / (name + '.deb')
    run('dpkg-deb', '--root-owner-group', '--build', debroot, deb)
    run('dpkg-deb', '--extract', deb, work / 'deb-check')
    smoke(work / 'deb-check/opt/ns2-desktop/NS2-Desktop')

    rpmhome = work / 'rpm'
    rpmhome.mkdir()
    rpm_version, _, prerelease = version.partition('-')
    release = '0.' + re.sub(r'[^A-Za-z0-9.]', '.', prerelease) if prerelease else '1'
    spec = work / 'ns2-desktop.spec'
    spec.write_text('''%global __os_install_post %{nil}
%global _build_id_links none
Name: ns2-desktop
Version: ''' + rpm_version + '''
Release: ''' + release + '''
Summary: Graphical console file browser and extraction tools
License: GPL-2.0-only AND MIT
URL: https://github.com/vZylev/NS2-Desktop
BuildArch: x86_64
AutoReqProv: no
Requires: glibc >= 2.28, libstdc++, libgcc, xdg-utils
%description
NS2 Desktop bundles a browser interface and runtime for console file tools.
%install
mkdir -p "%{buildroot}"
cp -a "%{_sourcedir}/root/." "%{buildroot}/"
%files
/opt/ns2-desktop
/usr/bin/ns2-desktop
/usr/share/applications/ns2-desktop.desktop
/usr/share/icons/hicolor/scalable/apps/ns2-desktop.svg
''')
    run('rpmbuild', '--define', '_topdir ' + str(rpmhome), '--define', '_sourcedir ' + str(work), '-bb', spec)
    built = list(rpmhome.glob('RPMS/x86_64/*.rpm'))
    if len(built) != 1:
        raise ValueError('Expected one RPM')
    rpm = output / (name + '.rpm')
    shutil.copy2(built[0], rpm)
    rpmcheck = work / 'rpm-check'
    rpmcheck.mkdir()
    payload = subprocess.check_output(['rpm2cpio', str(rpm)])
    run('cpio', '-idm', '--quiet', input=payload, cwd=rpmcheck)
    smoke(rpmcheck / 'opt/ns2-desktop/NS2-Desktop')

    appdir = work / 'NS2-Desktop.AppDir'
    binary(executable, appdir / 'usr/bin/NS2-Desktop')
    licenses(appdir / 'usr/share/licenses/ns2-desktop')
    shutil.copy2(ROOT / 'desktop/assets/ns2-desktop.svg', appdir)
    (appdir / 'ns2-desktop.desktop').write_text(desktop_entry('NS2-Desktop'))
    (appdir / 'AppRun').write_text('#!/bin/sh\nHERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec "$HERE/usr/bin/NS2-Desktop" "$@"\n')
    (appdir / 'AppRun').chmod(0o755)
    appimage = output / (name + '.AppImage')
    run(fetch_tool('appimagetool'), '--appimage-extract-and-run', '--runtime-file', fetch_tool('appimage-runtime'),
        appdir, appimage, env={**os.environ, 'ARCH': 'x86_64', 'SOURCE_DATE_EPOCH': '0'})
    appimage.chmod(0o755)
    with tempfile.TemporaryDirectory(prefix='ns2-appimage-check-') as home:
        run(appimage, '--appimage-extract-and-run', '--self-test', env={**os.environ, 'NS2_DESKTOP_HOME': home}, timeout=120)


def mac_packages(executable, output, work, version, target):
    name = 'NS2-Desktop-' + version + '-macos-' + target.split('-')[1]
    stage = work / 'dmg-root'
    app = stage / 'NS2 Desktop.app'
    binary(executable, app / 'Contents/MacOS/NS2-Desktop')
    licenses(app / 'Contents/Resources')
    with (app / 'Contents/Info.plist').open('wb') as file:
        plistlib.dump({'CFBundleName': 'NS2 Desktop', 'CFBundleDisplayName': 'NS2 Desktop',
                      'CFBundleIdentifier': 'io.github.vzylev.ns2desktop', 'CFBundleExecutable': 'NS2-Desktop',
                      'CFBundlePackageType': 'APPL', 'CFBundleShortVersionString': version.split('-')[0],
                      'CFBundleVersion': version.split('-')[0], 'NSHighResolutionCapable': True}, file)
    run('codesign', '--force', '--deep', '--sign', '-', app)
    run('codesign', '--verify', '--deep', '--strict', app)
    run('ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', app, output / (name + '.app.zip'))
    run('ditto', '-x', '-k', output / (name + '.app.zip'), work / 'zip-check')
    smoke(work / 'zip-check/NS2 Desktop.app/Contents/MacOS/NS2-Desktop')
    (stage / 'Applications').symlink_to('/Applications')
    dmg = output / (name + '.dmg')
    run('hdiutil', 'create', '-volname', 'NS2 Desktop', '-srcfolder', stage, '-ov', '-format', 'UDZO', dmg)
    run('hdiutil', 'verify', dmg)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=TARGETS, default='win-x64')
    target = parser.parse_args().target
    version = json.loads((ROOT / 'package.json').read_text())['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', version):
        raise ValueError('Invalid release version')
    executable = ROOT / 'dist' / ('NS2-Desktop.exe' if target == 'win-x64' else 'NS2-Desktop-' + target)
    if digest(executable) != Path(str(executable) + '.sha256').read_text().split()[0]:
        raise ValueError('Executable checksum does not match the completed build')
    manifest = json.loads((ROOT / '.build' / target / 'manifest.json').read_text())
    if manifest['version'] != version or manifest['target'] != target or manifest['nodeVersion'] != (ROOT / '.node-version').read_text().strip():
        raise ValueError('Build manifest does not match this source version and target')
    output = ROOT / 'dist/release' / target
    if output.exists() and any(output.iterdir()):
        raise ValueError('Target release directory must be empty before packaging')
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='package-', dir=ROOT / '.build') as temporary:
        work = Path(temporary)
        if target == 'win-x64':
            shutil.copy2(executable, output / ('NS2-Desktop-' + version + '.exe'))
            licenses(output)
            source_archive(output, version)
        elif target == 'linux-x64':
            linux_packages(executable, output, work, version)
        else:
            mac_packages(executable, output, work, version, target)
    manifest['commit'] = os.environ.get('GITHUB_SHA') or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    manifest['runId'] = os.environ.get('GITHUB_RUN_ID')
    (output / ('build-info-' + target + '.json')).write_text(json.dumps(manifest, indent=2) + '\n')
    files = sorted(output.iterdir())
    (output / ('SHA256SUMS-' + target)).write_text(''.join(digest(file) + '  ' + file.name + '\n' for file in files))
    print('Packaged ' + version + ' for ' + target)


if __name__ == '__main__':
    main()
