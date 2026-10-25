const fs = require('node:fs/promises');
const path = require('node:path');
const {deflateRaw} = require('node:zlib');
const {promisify} = require('node:util');
const compress = promisify(deflateRaw);
const table = Array.from({length:256}, (_,n) => {
  for (let k=0;k<8;k++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {let crc=0xffffffff; for (const b of bytes) crc=table[(crc^b)&255] ^ crc>>>8; return (crc^0xffffffff)>>>0;}
async function diagnostics(directory) {
  const entries = [], local = [], central = []; let total=0, offset=0;
  async function walk(relative='') {
    for (const dirent of await fs.readdir(path.join(directory,relative),{withFileTypes:true})) {
      const name=path.posix.join(relative,dirent.name);
      if (dirent.isSymbolicLink()) continue;
      if (dirent.isDirectory()) {await walk(name); continue;}
      if (!dirent.isFile() || !/\.(log|json|txt)$/.test(name) || /(^|\/)(connection\.json|connect\.txt)$/.test(name)) continue;
      const file=path.join(directory,name), stat=await fs.stat(file);
      if (total+stat.size>64*1024*1024 || entries.length>=10000) throw Error('logsTooLarge');
      const bytes=await fs.readFile(file); total+=bytes.length;
      if (total>64*1024*1024) throw Error('logsTooLarge');
      entries.push([name,bytes]);
    }
  }
  await walk();
  entries.push(['diagnostics-info.json',Buffer.from(JSON.stringify({captured:new Date().toISOString(),
    run:path.basename(directory),note:'Snapshot of logs and reports. Exported content, connection.json and connect.txt are excluded.'},null,2))]);
  for (const [name,bytes] of entries) {
    const filename=Buffer.from(name), data=await compress(bytes), crc=crc32(bytes);
    const header=Buffer.alloc(30); header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);
    header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);
    header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);
    const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);
    header.copy(record,8,6,28);record.writeUInt32LE(offset,42);
    local.push(header,filename,data);central.push(record,filename);offset+=header.length+filename.length+data.length;
  }
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(central.reduce((n,b)=>n+b.length,0),12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,...central,end]);
}
module.exports={diagnostics,crc32};
