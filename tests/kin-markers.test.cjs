const fs=require('fs'),vm=require('vm'),assert=require('assert');
const storage={},els={};
const ctx=vm.createContext({console,Intl,Blob,Response,CompressionStream,DecompressionStream,TextDecoder,Uint8Array,atob,btoa,URL,URLSearchParams,setTimeout(){},localStorage:{getItem(k){return storage[k]??null},setItem(k,v){storage[k]=v},removeItem(k){delete storage[k]}},document:{getElementById(id){return els[id]??={style:{},value:'',showModal(){},close(){}}}},location:{hash:new URL(fs.readFileSync('tests/fixtures/grima-link.txt','utf8')).hash,pathname:'/',search:'?keep=1'},history:{replaceState(a,b,url){ctx.cleaned=url}}});
for(const name of ['app','role-priorities','fellowship','constraints','search','allocation','background','session-recovery','grima-import'])vm.runInContext(fs.readFileSync(`public/${name}.js`,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);

const marker='<:net_vanguard_591528:1566670178362589284>';
ctx.marker=marker;
run("let named=normalizeSignupName({id:'1',name:marker+' Éowyn'});let plain=normalizeSignupName({id:'2',name:'<:smile:1234> Frodo'});let animated=normalizeSignupName({id:'3',name:'<a:net_other_123:98765> Sam'});");
assert.equal(run('named.name'),'Éowyn');assert.equal(run('named.primary'),true);assert.equal(run('plain.name'),'Frodo');assert.equal(run('!!plain.primary'),false);assert.equal(run('animated.primary'),true);
run("setRHEvents([{signUps:[{userId:'1',name:marker+' Éowyn',className:'Warden'},{userId:'2',name:'Frodo',className:'Hunter'}]}]);applyRH()");
assert.equal(run('players[0].name'),'Éowyn');assert.equal(run('players[0].primary'),true);assert.equal(run('isPrimary(players[1])'),false);
// Re-import must not erase either detected or manually assigned primary flags.
run("players[1].primary=true;setRHEvents([{signUps:[{userId:'1',name:marker+' Éowyn',className:'Warden'},{userId:'2',name:'Frodo',className:'Hunter'}]}]);applyRH()");
assert.equal(run('players.every(isPrimary)'),true);
run("setRHEvents([{signUps:[{userId:'2',name:marker+' Frodo',className:'Hunter'},{userId:'3',name:marker+' Sam',className:'Guardian'}]}]);players[1].primary=false;applyRHAppend()");
assert.equal(run('players.find(p=>p.id===\'2\').primary'),true);assert.equal(run('players.find(p=>p.id===\'3\').primary'),true);assert.equal(run('players.find(p=>p.id===\'3\').name'),'Sam');
run("let legacy=sessionSnapshot();legacy.players[0].name=marker+' Éowyn';legacy.players[0].primary=false;restoreSession(legacy)");
assert.equal(run('players[0].name'),'Éowyn');assert.equal(run('players[0].primary'),true);
run('restoreSession(compactSessionSnapshot())');assert.equal(run('players[0].primary'),true);
console.log('Passed: kin markers stripped and prioritized in replacement, append, legacy/session imports; other emojis do not grant priority; Unicode and manual flags preserved.');
