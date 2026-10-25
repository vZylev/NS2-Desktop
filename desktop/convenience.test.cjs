const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {inflateRawSync} = require('node:zlib');
const {history,runPath} = require('./history.cjs');
const {diagnostics,crc32} = require('./diagnostics.cjs');
const {createApp} = require('./server.cjs');
const {EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
async function setup(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-convenience-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const run=path.join(root,'runs/switch2-example');
  await fs.mkdir(path.join(run,'games/010000000000000a'),{recursive:true});
  return {root,run};
}
async function json(file,value) {await fs.writeFile(file,JSON.stringify(value));}

test('history preserves per-title completion, errors and pending work; stale running is interrupted',async t=>{
  const {root,run}=await setup(t);
  await json(path.join(run,'desktop-summary.json'),{mode:'dump',status:'failed',started:'2026-10-25T00:00:00Z'});
  await json(path.join(run,'games/game-export-batch.json'),{titles:[
    {title:'0x010000000000000a',status:'complete'},
    {title:'0x010000000000000b',status:'failed',error:'Read failed'},
    {title:'0x010000000000000c',status:'pending'},
    {title:'0x010000000000000d',status:'running'}]});
  const [row]=await history(root);
  assert.equal(row.status,'failed');
  assert.deepEqual(row.titles.map(x=>x.status),['complete','failed','pending','interrupted']);
  assert.equal((await history(root,run))[0].titles[3].status,'running');
  await assert.rejects(runPath(root,'../outside'));
  await fs.symlink(os.tmpdir(),path.join(root,'runs/switch2-link'),'dir');
  await assert.rejects(runPath(root,'switch2-link'));
});

test('ZIP roundtrips UTF-8 names and binary-safe logs, excluding exports, credentials and links',async t=>{
  const {run}=await setup(t);
  await fs.writeFile(path.join(run,'log-é.log'),'progress ñ\n');
  await fs.writeFile(path.join(run,'connection.json'),'secret');
  await fs.writeFile(path.join(run,'connect.txt'),'secret');
  await fs.writeFile(path.join(run,'games/content.nca'),'content');
  await fs.symlink(path.join(run,'connection.json'),path.join(run,'secret.log'));
  const zip=await diagnostics(run), files=new Map();let offset=0;
  while(zip.readUInt32LE(offset)===0x04034b50) {
    const length=zip.readUInt16LE(offset+26),size=zip.readUInt32LE(offset+18);
    const name=zip.subarray(offset+30,offset+30+length).toString();
    const data=inflateRawSync(zip.subarray(offset+30+length,offset+30+length+size));
    assert.equal(crc32(data),zip.readUInt32LE(offset+14));files.set(name,data.toString());
    offset+=30+length+size;
  }
  assert.equal(zip.readUInt32LE(offset),0x02014b50);
  assert.equal(files.get('log-é.log'),'progress ñ\n');
  assert.deepEqual([...files.keys()].sort(),['diagnostics-info.json','log-é.log']);
  assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
});

test('history, folder opening and ZIP API require auth and use recorded folders',async t=>{
  const {root,run}=await setup(t), opened=[];
  await json(path.join(run,'games/game-export-batch.json'),{titles:[{title:'010000000000000a',status:'complete'}]});
  const app=await createApp({dataRoot:root,port:0,opener:(...args)=>opened.push(args)});
  t.after(()=>{app.server.closeAllConnections();app.server.close();});
  const headers={authorization:'Bearer '+app.token,'Content-Type':'application/json'};
  const url=route=>new URL('/api/'+route,app.url);
  assert.equal((await fetch(url('history'))).status,401);
  assert.equal((await (await fetch(url('history'),{headers})).json()).runs.length,1);
  const body=JSON.stringify({id:'switch2-example',title:'010000000000000a'});
  assert.equal((await fetch(url('open-title'),{method:'POST',headers,body})).status,200);
  assert.deepEqual(opened,[[await fs.realpath(path.join(run,'games/010000000000000a')),true]]);
  assert.equal((await fetch(url('open-title'),{method:'POST',headers,body:JSON.stringify({id:'switch2-example',title:'../../outside'})})).status,404);
  const zip=await fetch(url('logs?run=switch2-example'),{headers});
  assert.equal(zip.status,200);assert.equal(zip.headers.get('content-type'),'application/zip');
  assert.equal((await fetch(url('logs?run=../outside'),{headers})).status,400);
});

test('desktop persists selected pending titles and final status on exit',async t=>{
  const {root,run}=await setup(t);
  const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
  const app=await createApp({dataRoot:root,port:0,runner:()=>child});
  t.after(()=>{child.stdout.end();child.stderr.end();app.server.closeAllConnections();app.server.close();});
  const headers={authorization:'Bearer '+app.token,'Content-Type':'application/json'};
  await fetch(new URL('/api/start',app.url),{method:'POST',headers,body:JSON.stringify({mode:'dump',host:'127.0.0.1',title:'010000000000000a,010000000000000b'})});
  child.stdout.write('Run folder: '+run+'\n');await new Promise(setImmediate);child.emit('close',1);
  const result=await (await fetch(new URL('/api/history',app.url),{headers})).json();
  assert.equal(result.runs[0].status,'failed');
  assert.deepEqual(result.runs[0].titles.map(x=>x.status),['pending','pending']);
  const stored=JSON.parse(await fs.readFile(path.join(run,'desktop-summary.json')));
  assert.equal(stored.status,'failed');assert.equal(stored.titles.length,2);
});

test('history and persisted status accept a canonical alias of the data root', async t => {
  const {root, run} = await setup(t);
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'ns2-alias-'));
  t.after(() => fs.rm(parent, {recursive: true, force: true}));
  const alias = path.join(parent, 'data');
  await fs.symlink(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const aliasedRun = path.join(alias, 'runs/switch2-example');
  await json(path.join(run, 'desktop-summary.json'), {status: 'running'});
  assert.equal((await history(alias, aliasedRun))[0].status, 'running');
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  const app = await createApp({dataRoot: alias, port: 0, runner: () => child});
  t.after(() => {child.stdout.end(); child.stderr.end(); app.server.closeAllConnections(); app.server.close();});
  const headers = {authorization: 'Bearer ' + app.token, 'Content-Type': 'application/json'};
  await fetch(new URL('/api/start', app.url), {method: 'POST', headers,
    body: JSON.stringify({mode: 'demo', host: '127.0.0.1'})});
  child.stdout.write('Run folder: ' + aliasedRun + '\n');
  await new Promise(setImmediate); child.emit('close', 1);
  const report = await (await fetch(new URL('/api/history', app.url), {headers})).json();
  assert.equal(report.runs[0].status, 'failed');
  assert.equal(JSON.parse(await fs.readFile(path.join(run, 'desktop-summary.json'))).status, 'failed');
});
