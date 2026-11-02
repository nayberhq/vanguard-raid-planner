const fs=require('fs'),vm=require('vm'),assert=require('assert'),zlib=require('zlib');
const context=vm.createContext({Blob,DecompressionStream,TextDecoder,Uint8Array,atob,validateSession(d){assert.equal(d.format,'vanguard-raid-planner-session')}});
vm.runInContext(fs.readFileSync('public/grima-import.js','utf8'),context);
const u=n=>{let out=[];n=BigInt(n);do{let b=Number(n&127n);n>>=7n;out.push(b|(n?128:0))}while(n);return Buffer.from(out)};
const id=n=>{let b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b};
const str=s=>{const b=Buffer.from(s);return Buffer.concat([u(b.length),b])};
const bytes=(flags=1,mask=1n,count=1)=>Buffer.concat([Buffer.from('GS1'),id('1566673606899933224'),u(12),u(10800),str('Folly'),u(count),id('9007199254740993'),str('Éowyn'),u(mask),Buffer.from([flags])]);
const decode=async b=>{context.token=zlib.deflateSync(b).toString('base64url');return vm.runInContext('decodeGrimaSnapshot(token)',context)};
(async()=>{
 const d=await decode(bytes());assert.equal(d.players[0].id,'9007199254740993');assert.equal(d.players[0].name,'Éowyn');assert.equal(d.players[0].primary,true);assert.equal(d.settings.duration,3);assert.equal(d.players[0].choices[0].c,'Beorning');
 for(const b of [Buffer.from('GS2'),bytes().subarray(0,-1),Buffer.concat([bytes(),Buffer.from([0])]),bytes(2),bytes(1,1n<<48n),bytes(1,1n,2001),Buffer.from('GS1')])await assert.rejects(()=>decode(b));
 const legacy=await decode(Buffer.from(JSON.stringify({format:'vanguard-raid-planner-session',players:[]})));assert.equal(legacy.players.length,0);
 console.log('Passed: GS1 IDs, names, priority, defaults; truncated/unknown/trailing/oversized payloads rejected; legacy JSON supported.');
})().catch(e=>{console.error(e);process.exitCode=1});
