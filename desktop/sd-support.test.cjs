const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {sdSupport}=require('./sd-support.cjs');
const {createApp}=require('./server.cjs');
async function temporary(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-sd-support-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;
}
test('no reports means unknown SD access, never an invented successful write test',async t=>{
  const result=await sdSupport(await temporary(t));
  assert.equal(result.directConsoleSdExport,false);assert.equal(result.reason,'notImplemented');
  assert.equal(result.consoleWriteTestPerformed,false);assert.equal(result.sdWritePermission,'unknown');
  assert.equal(result.sdFreeBytes,null);assert.equal(result.observation,null);
});
test('historical readable or unavailable inventory never implies SD write permission',async t=>{
  const root=await temporary(t),run=path.join(root,'runs/switch2-test'),games=path.join(run,'games');
  await fs.mkdir(games,{recursive:true});
  for(const available of [true,false]) {
    await fs.writeFile(path.join(games,'game-export.json'),JSON.stringify({started:'2026-10-25T00:00:00Z',inventories:[{storage:5,available,complete:available}]}));
    const result=await sdSupport(root);
    assert.equal(result.observation.inventoryAvailable,available);assert.equal(result.observation.run,'switch2-test');
    assert.equal(result.sdWritePermission,'unknown');assert.equal(result.directConsoleSdExport,false);
  }
  await fs.rm(path.join(games,'game-export.json'));
  await fs.mkdir(path.join(games,'010000000000000a'));
  await fs.writeFile(path.join(games,'game-export-batch.json'),JSON.stringify({titles:[{title:'010000000000000a',status:'complete'}]}));
  await fs.writeFile(path.join(games,'010000000000000a/game-export.json'),JSON.stringify({inventories:[{storage:5,available:true}]}));
  assert.equal((await sdSupport(root)).observation.inventoryAvailable,true);
});
test('SD support endpoint is authenticated and does not start a console session',async t=>{
  const root=await temporary(t);let spawned=0;
  const app=await createApp({dataRoot:root,port:0,runner:()=>{spawned++;throw Error('Must not start');}});
  t.after(()=>{app.server.closeAllConnections();app.server.close();});
  const url=new URL('/api/sd-support',app.url);
  assert.equal((await fetch(url)).status,401);
  const result=await (await fetch(url,{headers:{authorization:'Bearer '+app.token}})).json();
  assert.equal(result.currentDestination,'computer');assert.equal(result.consoleWriteTestPerformed,false);assert.equal(spawned,0);
});
