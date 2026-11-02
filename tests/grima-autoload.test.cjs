const fs=require('fs'),vm=require('vm'),assert=require('assert');
const storage={},els={};
const ctx=vm.createContext({console,Intl,Blob,Response,CompressionStream,DecompressionStream,TextDecoder,Uint8Array,atob,btoa,URL,URLSearchParams,setTimeout(){},localStorage:{getItem(k){return storage[k]??null},setItem(k,v){storage[k]=v},removeItem(k){delete storage[k]}},document:{getElementById(id){return els[id]??={style:{},value:'',showModal(){},close(){}}}},location:{hash:new URL(fs.readFileSync('tests/fixtures/grima-link.txt','utf8')).hash,pathname:'/',search:'?keep=1'},history:{replaceState(a,b,url){ctx.cleaned=url}}});
for(const name of ['app','role-priorities','fellowship','constraints','search','allocation','background','session-recovery','grima-import'])vm.runInContext(fs.readFileSync(`public/${name}.js`,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{
 run('recoveryPending={session:compactSessionSnapshot()};recoveryActive=true');
 const previous=run('JSON.stringify(recoveryPending.session)');
 await run('receiveGrimaSnapshot()');
 assert.equal(ctx.cleaned,'/?keep=1');assert.equal(run('players[0].id'),'9007199254740993');assert.equal(run('players[0].name'),'Éowyn');assert.equal(run('grimaEventId'),'100');assert.equal(run('tab'),'Roster');assert.equal(run('recoveryPending'),null);
 assert.equal(storage['vanguard-before-grima-import'],previous);
 assert.equal(JSON.parse(storage['vanguard-session-recovery-v1']).session.grimaEventId,'100');
 const token=await run('encodeGrimaSnapshot(compactSessionSnapshot())');ctx.token=token;
 assert.equal((await run('decodeGrimaSnapshot(token)')).grimaEventId,'100');
 run('undoGrimaImport()');assert.equal(run('players.length'),JSON.parse(previous).players.length);
 ctx.location.hash='#grima=bad!';const snapshot=()=>run('JSON.stringify({...compactSessionSnapshot(),exportedAt:null})');const before=snapshot();await run('receiveGrimaSnapshot()');assert.equal(snapshot(),before);
 ctx.data=JSON.parse(fs.readFileSync('tests/fixtures/grima-signups.json','utf8'));ctx.localStorage.setItem=()=>{throw Error('Storage full')};assert.throws(()=>run('loadGrimaData(data)'),/Storage full/);assert.equal(snapshot(),before);
 console.log('Passed: actual Python export auto-loads, preserves Unicode/IDs, backs up recovery, restores previous plan, round-trips URL, and leaves plan intact on invalid links/storage failure.');
})().catch(e=>{console.error(e);process.exitCode=1});
