const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {once, EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
const {createApp, launchDesktop} = require('./server.cjs');

function api(app, route, method = 'GET', body) {
  const url = new URL(app.url);
  return fetch(url.origin + '/api/' + route, {method,
    headers: {authorization: 'Bearer ' + url.hash.slice(1), 'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body)});
}

async function setup(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-instances-'));
  const apps = [];
  t.after(async () => {
    // A successful replacement is created internally, so close the registry's
    // current owner as well as the objects directly created by each test.
    try {
      const saved = JSON.parse(await fs.readFile(path.join(directory, 'desktop-session.json')));
      await api(saved, 'quit', 'POST');
    } catch {}
    for (const app of apps) {app.server.closeAllConnections(); app.server.close();}
    await fs.rm(directory, {recursive: true, force: true});
  });
  return {directory, apps};
}

test('each opening gets a fresh URL; waiting windows cannot run jobs or overwrite the owner', async t => {
  const {directory, apps} = await setup(t);
  const opened = [], opener = url => opened.push(url);
  const first = await createApp({dataRoot: directory, port: 0, launchBrowser: true, opener}); apps.push(first);
  const port = first.server.address().port;
  const saved = await fs.readFile(path.join(directory, 'desktop-session.json'), 'utf8');
  const second = await launchDesktop({dataRoot: directory, port, opener}); apps.push(second);
  const third = await launchDesktop({dataRoot: directory, port, opener}); apps.push(third);
  assert.equal(new Set(opened).size, 3);
  assert.equal(new Set(opened.map(url => new URL(url).searchParams.get('launch'))).size, 3);
  assert.equal(await fs.readFile(path.join(directory, 'desktop-session.json'), 'utf8'), saved);
  const state = await (await api(second, 'state')).json();
  assert.equal(state.standby, true); assert.equal(state.previousInstance.active, false);
  assert.equal(state.appVersion, require('../package.json').version);
  assert.equal((await api(second, 'start', 'POST', {mode: 'demo', host: '127.0.0.1'})).status, 400);
  const page = await fetch(second.url);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.equal(page.headers.get('pragma'), 'no-cache');
  const html = await page.text();
  assert.match(html, /id="instance-notice"/); assert.match(html, /id="takeover"/);
  assert.match(html, /src="\/app.js\?build=/); assert.match(html, /href="\/style.css\?build=/);
  assert.equal((await api(second, 'quit', 'POST')).status, 200);
  assert.equal((await api(first, 'state')).status, 200);
});

test('the replacement button can close an older application that has no version or takeover support', async t => {
  const {directory, apps} = await setup(t);
  const token = 'a'.repeat(64);
  let quitCalls = 0;
  const legacy = http.createServer((req, res) => {
    if (req.headers.authorization !== 'Bearer ' + token) {res.writeHead(401); res.end('{}'); return;}
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/state') res.end(JSON.stringify({active: false, status: 'idle'}));
    else if (req.url === '/api/quit' && req.method === 'POST') {
      quitCalls++; res.end(JSON.stringify({closed: true})); legacy.close();
    } else {res.writeHead(404); res.end('{}');}
  });
  legacy.listen(0, '127.0.0.1'); await once(legacy, 'listening');
  apps.push({server: legacy});
  const port = legacy.address().port;
  await fs.writeFile(path.join(directory, 'desktop-session.json'), JSON.stringify({url: 'http://127.0.0.1:' + port + '/#' + token}));
  const next = await launchDesktop({dataRoot: directory, port, launchBrowser: false}); apps.push(next);
  const origin = new URL(next.url).origin;
  assert.equal((await fetch(origin + '/api/takeover', {method: 'POST'})).status, 401);
  assert.equal((await fetch(origin + '/api/takeover', {method: 'POST',
    headers: {authorization: 'Bearer ' + next.token, origin: 'https://example.com'}})).status, 403);
  assert.equal(quitCalls, 0);
  const response = await api(next, 'takeover', 'POST'); assert.equal(response.status, 200);
  const replacement = await response.json();
  assert.equal(quitCalls, 1);
  assert.equal(Number(new URL(replacement.url).port), port);
  assert.ok(new URL(replacement.url).searchParams.get('launch'));
  const state = await (await api(replacement, 'state')).json();
  assert.equal(state.standby, false); assert.equal(state.appVersion, require('../package.json').version);
  assert.equal((await fetch(new URL(replacement.url).origin + '/api/state',
    {headers: {authorization: 'Bearer ' + token}})).status, 401);
});

test('replacement waits for an active console job and succeeds after it completes', async t => {
  const {directory, apps} = await setup(t);
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  t.after(() => {child.emit('close', 0); child.stdout.end(); child.stderr.end();});
  const first = await createApp({dataRoot: directory, port: 0, runner: () => child}); apps.push(first);
  assert.equal((await api(first, 'start', 'POST', {mode: 'demo', host: '127.0.0.1'})).status, 200);
  const next = await launchDesktop({dataRoot: directory, port: first.server.address().port, launchBrowser: false}); apps.push(next);
  assert.equal((await (await api(next, 'state')).json()).previousInstance.active, true);
  const denied = await api(next, 'takeover', 'POST');
  assert.equal(denied.status, 409); assert.equal((await denied.json()).error, 'otherInstanceBusy');
  assert.equal((await (await api(first, 'state')).json()).active, true);
  child.emit('close', 0);
  assert.equal((await (await api(next, 'state')).json()).previousInstance.active, false);
  assert.equal((await api(next, 'takeover', 'POST')).status, 200);
});

test('a waiting window can activate after the old application was closed separately', async t => {
  const {directory, apps} = await setup(t);
  const first = await createApp({dataRoot: directory, port: 0}); apps.push(first);
  const next = await launchDesktop({dataRoot: directory, port: first.server.address().port, launchBrowser: false}); apps.push(next);
  await api(first, 'quit', 'POST');
  assert.equal((await (await api(next, 'state')).json()).previousInstance, null);
  const response = await api(next, 'takeover', 'POST'); assert.equal(response.status, 200);
  assert.equal((await (await api(await response.json(), 'state')).json()).standby, false);
});
