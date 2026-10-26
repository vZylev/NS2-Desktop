// Download verified release packages. Never replace or execute the running app.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const REPOSITORY = 'https://github.com/vZylev/NS2-Desktop';
const API = 'https://api.github.com/repos/vZylev/NS2-Desktop/releases/latest';
function versionParts(value) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) throw Error('updateInvalidRelease');
  const parts = value.split('.').map(Number);
  if (parts.some(n => !Number.isSafeInteger(n))) throw Error('updateInvalidRelease');
  return parts;
}
function newer(candidate, current) {
  const a = versionParts(candidate), b = versionParts(current);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
function assetNames(version, platform, arch) {
  versionParts(version);
  if (platform === 'win32' && arch === 'x64') return [`NS2-Desktop-${version}.exe`];
  if (platform === 'linux' && arch === 'x64') return ['AppImage', 'deb', 'rpm', 'tar.gz'].map(ext => `NS2-Desktop-${version}-linux-x64.${ext}`);
  if (platform === 'darwin' && ['x64', 'arm64'].includes(arch)) return ['dmg', 'app.zip'].map(ext => `NS2-Desktop-${version}-macos-${arch}.${ext}`);
  return [];
}
function checksums(text) {
  const result = new Map();
  for (const line of text.trim().split(/\r?\n/)) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
    if (!match || result.has(match[2])) throw Error('updateInvalidChecksums');
    result.set(match[2], match[1]);
  }
  return result;
}
async function readLimited(response, limit) {
  if (!response.ok) throw Error('updateNetworkError');
  const parts = []; let size = 0;
  for await (const bytes of response.body) {
    size += bytes.length;
    if (size > limit) throw Error('updateTooLarge');
    parts.push(bytes);
  }
  return Buffer.concat(parts);
}
function createUpdates({dataRoot, currentVersion = require('../package.json').version, platform = process.platform,
  arch = process.arch, request = fetch} = {}) {
  let busy = false, release = null;
  const state = {status: 'unchecked', version: '', packages: [], received: 0, total: 0, file: '', error: ''};
  const snapshot = () => ({...state, packages: state.packages.map(item => ({...item})), busy});
  const get = (url, timeout = 15000) => request(url, {signal: AbortSignal.timeout(timeout), headers: {'Accept': 'application/octet-stream', 'User-Agent': 'NS2-Desktop'}});
  async function check() {
    if (busy) throw Error('updateBusy');
    busy = true; state.status = 'checking'; state.error = ''; release = null;
    state.packages = []; state.version = ''; state.file = ''; state.received = 0; state.total = 0;
    try {
      const response = await request(API, {signal: AbortSignal.timeout(15000), headers: {'Accept': 'application/vnd.github+json', 'User-Agent': 'NS2-Desktop'}});
      const value = JSON.parse((await readLimited(response, 2 * 1024 * 1024)).toString());
      const version = String(value.tag_name || '').replace(/^v/, '');
      versionParts(version);
      if (value.draft || value.prerelease || value.tag_name !== 'v' + version || value.html_url !== REPOSITORY + '/releases/tag/v' + version) throw Error('updateInvalidRelease');
      state.version = version;
      if (!newer(version, currentVersion)) {state.status = 'current';}
      else {
      const expected = assetNames(version, platform, arch);
      const assets = new Map();
      for (const item of value.assets || []) {
        if (!expected.includes(item.name) && item.name !== 'SHA256SUMS') continue;
        if (assets.has(item.name) || item.browser_download_url !== REPOSITORY + '/releases/download/v' + version + '/' + item.name ||
          !Number.isSafeInteger(item.size) || item.size < 1 || item.size > 1024 ** 3) throw Error('updateInvalidRelease');
        assets.set(item.name, item);
      }
      if (!assets.has('SHA256SUMS') || !expected.length || expected.some(name => !assets.has(name))) throw Error('updateMissingPackage');
      release = {version, assets}; state.packages = expected.map(name => ({name, bytes: assets.get(name).size}));
      state.status = 'available';
      }
    } catch (error) {state.status = 'failed'; state.error = error.message;}
    finally {busy = false;}
    return snapshot();
  }
  async function download(name) {
    if (busy) throw Error('updateBusy');
    if (!release || !state.packages.some(item => item.name === name)) throw Error('updateMissingPackage');
    busy = true; state.status = 'downloading'; state.error = ''; state.file = ''; state.received = 0;
    let temporary, handle;
    try {
      const item = release.assets.get(name); state.total = item.size;
      const sums = checksums((await readLimited(await get(release.assets.get('SHA256SUMS').browser_download_url), 256 * 1024)).toString());
      if (!sums.has(name)) throw Error('updateInvalidChecksums');
      const directory = path.join(dataRoot, 'updates'); await fs.mkdir(directory, {recursive: true, mode: 0o700});
      temporary = await fs.mkdtemp(path.join(directory, 'download-'));
      const file = path.join(temporary, name), partial = file + '.part';
      handle = await fs.open(partial, 'wx', 0o600);
      const response = await get(item.browser_download_url, 30 * 60 * 1000);
      if (!response.ok) throw Error('updateNetworkError');
      const hash = crypto.createHash('sha256');
      for await (const chunk of response.body) {
        state.received += chunk.length;
        if (state.received > item.size) throw Error('updateSizeMismatch');
        hash.update(chunk); await handle.writeFile(chunk);
      }
      if (state.received !== item.size || hash.digest('hex') !== sums.get(name)) throw Error('updateChecksumMismatch');
      await handle.sync(); await handle.close(); handle = null;
      await fs.rename(partial, file); state.file = file; state.status = 'downloaded'; temporary = null;
    } catch (error) {state.status = 'failed'; state.error = error.message;}
    finally {
      try {if (handle) await handle.close(); if (temporary) await fs.rm(temporary, {recursive: true, force: true});}
      finally {busy = false;}
    }
    return snapshot();
  }
  return {snapshot, check, download, get busy() {return busy;}};
}
module.exports = {createUpdates, assetNames, newer, checksums};
