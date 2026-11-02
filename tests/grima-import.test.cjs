const fs=require('fs'),vm=require('vm'),assert=require('assert'),zlib=require('zlib');
const context=vm.createContext({Blob,DecompressionStream,TextDecoder,Uint8Array,atob,validateSession(data){assert.equal(data.format,'vanguard-raid-planner-session')}});
vm.runInContext(fs.readFileSync('public/grima-import.js','utf8'),context);
(async()=>{
 const data={format:'vanguard-raid-planner-session',players:[{id:'9007199254740993',name:'Éowyn'}]};
 context.token=zlib.deflateSync(JSON.stringify(data)).toString('base64url');
 const decoded=await vm.runInContext('decodeGrimaSnapshot(token)',context);
 assert.equal(JSON.stringify(decoded),JSON.stringify(data));
 for(const token of ['bad!','a',zlib.deflateSync('not json').toString('base64url'),zlib.deflateSync('x'.repeat(2000001)).toString('base64url')]){
  context.token=token;await assert.rejects(vm.runInContext('decodeGrimaSnapshot(token)',context));
 }
 console.log('Grima bridge: Unicode/Discord IDs preserved; malformed and oversized payloads rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
