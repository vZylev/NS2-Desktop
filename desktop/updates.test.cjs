const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {createUpdates, assetNames, newer, checksums} = require('./updates.cjs');
const repo = 'https://github.com/vZylev/NS2-Desktop';
const payload = Buffer.from('verified package fixture');
const digest = crypto.createHash('sha256').update(payload).digest('hex');
async function fixture(t, {metadata, sums = digest, body = payload, request: custom, ...options} = {}) {
  const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-update-test-'));
  t.after(() => fs.rm(dataRoot, {recursive: true, force: true}));
  const version = '0.8.0', names = assetNames(version, options.platform || 'win32', options.arch || 'x64');
  const release = {tag_name: 'v' + version, html_url: repo + '/releases/tag/v' + version, draft: false, prerelease: false,
    assets: [...names, 'SHA256SUMS'].map(name => ({name, size: payload.length, browser_download_url: repo + '/releases/download/v' + version + '/' + name}))};
  if (metadata) metadata(release);
  const calls = [];
  const request = async url => {
    calls.push(url);
    if (custom) return custom(url, release);
    if (url.includes('api.github.com')) return Response.json(release);
    if (url.endsWith('SHA256SUMS')) return new Response(names.map(name => sums + '  ' + name).join('\n'));
    return new Response(body);
  };
  return {dataRoot, calls, release, names, updater: createUpdates({dataRoot, currentVersion: '0.7.0', platform: 'win32', arch: 'x64', ...options, request})};
}
test('release versions and package formats select the native architecture without downgrades', () => {
  assert.equal(newer('0.10.0', '0.9.9'), true); assert.equal(newer('0.7.0', '0.7.0'), false); assert.equal(newer('0.6.9', '0.7.0'), false);
  assert.throws(() => newer('0.8.0-beta.1', '0.7.0'));
  assert.equal(assetNames('0.8.0', 'linux', 'x64').length, 4);
  assert.ok(assetNames('0.8.0', 'darwin', 'arm64').every(name => name.includes('arm64')));
  assert.deepEqual(assetNames('0.8.0', 'win32', 'arm64'), []);
});
test('checksums reject duplicate, traversal and malformed entries', () => {
  assert.equal(checksums(digest + '  package.exe\n').get('package.exe'), digest);
  for (const text of [digest + '  ../package', digest + '  same\n' + digest + '  same', '']) assert.throws(() => checksums(text));
});
test('a release download is exposed only after complete size and SHA-256 verification', async t => {
  const {updater, names} = await fixture(t);
  assert.equal((await updater.check()).status, 'available');
  const state = await updater.download(names[0]);
  assert.equal(state.status, 'downloaded'); assert.equal(state.busy, false);
  assert.deepEqual(await fs.readFile(state.file), payload);
  assert.deepEqual(await fs.readdir(path.dirname(state.file)), [names[0]]);
  await assert.rejects(updater.download('../untrusted.exe'), /updateMissingPackage/);
});
test('bad hashes, truncated or oversized downloads leave no usable package or partial files', async t => {
  for (const overrides of [{sums: '0'.repeat(64)}, {body: payload.subarray(0, 5)}, {body: Buffer.concat([payload, payload])}]) {
    const {updater, names, dataRoot} = await fixture(t, overrides);
    await updater.check(); const state = await updater.download(names[0]);
    assert.equal(state.status, 'failed'); assert.equal(state.file, ''); assert.equal(state.busy, false);
    assert.deepEqual(await fs.readdir(path.join(dataRoot, 'updates')), []);
  }
});
test('release checks reject substituted download URLs, duplicate assets, drafts and unavailable architectures', async t => {
  for (const metadata of [r => {r.assets[0].browser_download_url = 'https://evil.example/app';},
    r => {r.assets.push(r.assets[0]);}, r => {r.draft = true;}, r => {r.prerelease = true;}, r => {r.assets.pop();}]) {
    const {updater, calls} = await fixture(t, {metadata});
    assert.equal((await updater.check()).status, 'failed'); assert.equal(calls.length, 1);
  }
  const {updater} = await fixture(t, {platform: 'linux', arch: 'arm64'});
  assert.equal((await updater.check()).error, 'updateMissingPackage');
});
test('checking an older published release is idle and does not offer a downgrade', async t => {
  const {updater} = await fixture(t, {currentVersion: '0.9.0'});
  const state = await updater.check(); assert.equal(state.status, 'current'); assert.equal(state.busy, false); assert.deepEqual(state.packages, []);
});
test('offline update failures are recoverable and concurrent operations are rejected', async t => {
  let resolve;
  const pending = new Promise(r => {resolve = r;});
  const {updater} = await fixture(t, {request: async () => {await pending; throw Error('offline');}});
  const first = updater.check(); assert.equal(updater.busy, true);
  await assert.rejects(updater.check(), /updateBusy/);
  await assert.rejects(updater.download('x'), /updateBusy/);
  resolve(); assert.equal((await first).status, 'failed'); assert.equal(updater.busy, false);
  assert.equal((await updater.check()).status, 'failed');
});
