const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {normalizeCatalog} = require('./catalog.cjs');
const {createApp} = require('./server.cjs');

test('catalog validates every entry and normalizes IDs without guessing names', () => {
  const value = normalizeCatalog({'0x010000000000000A': {name: ' Example '}});
  assert.equal(value['010000000000000a'], 'Example');
  for (const invalid of [null, [], {'bad':'Name'}, {'010000000000000a':''},
    {'010000000000000a':'line\nbreak'}, {'010000000000000a':'a'.repeat(301)},
    {'010000000000000a':'One','0x010000000000000a':'Two'}]) assert.throws(() => normalizeCatalog(invalid));
});

test('catalog API requires authentication, persists imports and preserves catalog after invalid import', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-catalog-'));
  const apps = [];
  t.after(async () => {for (const app of apps) {app.server.closeAllConnections(); app.server.close();} await fs.rm(directory,{recursive:true,force:true});});
  const app = await createApp({dataRoot:directory,port:0}); apps.push(app);
  const url = new URL('/api/catalog',app.url);
  const headers = {authorization:'Bearer '+app.token,'Content-Type':'application/json'};
  assert.equal((await fetch(url)).status,401);
  assert.deepEqual(await (await fetch(url,{headers})).json(),{});
  const catalog = {'010000000000000a':'Example <b>literal</b>'};
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(catalog)})).status,200);
  assert.equal((await fetch(url,{method:'POST',headers,body:'{"bad":"Oops"}'})).status,400);
  assert.deepEqual(await (await fetch(url,{headers})).json(),catalog);
  const second = await createApp({dataRoot:directory,port:0}); apps.push(second);
  assert.deepEqual(await (await fetch(new URL('/api/catalog',second.url),{headers:{authorization:'Bearer '+second.token}})).json(),catalog);
});
