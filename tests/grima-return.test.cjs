const fs=require('fs'),vm=require('vm'),assert=require('assert'),zlib=require('zlib');
const ctx=vm.createContext({console,Blob,CompressionStream,Response,Uint8Array,btoa});
vm.runInContext(fs.readFileSync('public/grima-import.js','utf8'),ctx);
ctx.hasGenerated=true;ctx.dirty=false;ctx.grimaEventId='1566670178362589284';
ctx.teams=Array.from({length:9},(_,n)=>({label:'Run '+(n+1),time:n,
 members:Array.from({length:n===8?8:24},(_,i)=>({id:String(1566670178362589284n+BigInt(n*24+i)*987654321n),c:'Guardian',spec:'Blue',role:'Tank',name:'Large name and unused roster preferences'.repeat(20)}))}));
ctx.assignFellowships=members=>Array.from({length:Math.ceil(members.length/6)},(_,i)=>members.slice(i*6,i*6+6));
(async()=>{
const data=vm.runInContext('grimaReturnPlan()',ctx),code=await vm.runInContext('grimaPlanCode()',ctx);
assert(code.length<=4000);assert.equal(data.teams.reduce((n,t)=>n+t.members.length,0),200);
const decoded=JSON.parse(zlib.inflateSync(Buffer.from(code.slice(10),'base64url')));
assert.deepEqual(decoded,JSON.parse(JSON.stringify(data)));
assert(!('players' in data));assert.equal(data.version,6);
assert.equal(data.teams[0].grimaFellowships.length,4);
assert(!('name' in data.teams[0].members[0]));
if(process.env.GRIMA_RETURN_OUTPUT)fs.writeFileSync(process.env.GRIMA_RETURN_OUTPUT,JSON.stringify({data,code}));
ctx.dirty=true;assert.throws(()=>vm.runInContext('grimaReturnPlan()',ctx),/up-to-date/);
ctx.dirty=false;ctx.hasGenerated=false;assert.throws(()=>vm.runInContext('grimaReturnPlan()',ctx),/up-to-date/);
ctx.hasGenerated=true;ctx.teams=[];assert.throws(()=>vm.runInContext('grimaReturnPlan()',ctx),/1–16/);
console.log('Passed Grima return: 200 assignments, '+code.length+' characters, exact IDs/specs/fellowships, minimal v6 payload and stale-plan rejection.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Exercise desktop/mobile-independent DOM handlers, including denied clipboard.
(async()=>{
 const fields={},make=()=>({value:'',textContent:'',disabled:false,hidden:false,focus(){this.focused=true},select(){this.selected=true},setSelectionRange(a,b){this.selection=[a,b]},click(){this.clicked=true}});
 const dialog={setAttribute(){},querySelector(id){return fields[id]??=make()},showModal(){this.open=true},close(){this.open=false;this.onclose?.()},addEventListener(name,fn){if(name==='close')this.onclose=fn},remove(){this.removed=true}};
 const ui=vm.createContext({console,Blob,CompressionStream,Response,Uint8Array,btoa,setTimeout(fn){fn()},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},navigator:{clipboard:{async writeText(){throw Error('Denied')}}},document:{getElementById(){return null},createElement(type){return type==='dialog'?dialog:make()},body:{append(){}},execCommand(){return false}},toast(message){throw Error(message)}});
 vm.runInContext(fs.readFileSync('public/grima-import.js','utf8'),ui);
 ui.hasGenerated=true;ui.dirty=false;ui.grimaEventId='100';
 ui.teams=[{label:'Run',time:0,members:[{id:'9007199254740993',c:'Guardian',spec:'Blue',role:'Tank'}]}];
 ui.assignFellowships=members=>[members];
 await vm.runInContext('openGrimaReturn()',ui);
 assert(dialog.open);assert(!fields['#grimacopy'].disabled);
 assert(fields['#grimareturncode'].value.startsWith('grimaplan:'));
 await fields['#grimacopy'].onclick();
 assert(fields['#grimareturncode'].selected);
 assert(fields['#grimareturnstatus'].textContent.includes('Ctrl+C'));
 fields['#grimadownload'].onclick();
 vm.runInContext("grimaPlanCode=async()=>{throw Error('Paste limit exceeded')}",ui);
 await vm.runInContext('openGrimaReturn()',ui);
 assert(fields['#grimareturncode'].hidden);
 assert(fields['#grimareturnstatus'].textContent.includes('JSON download remains available'));
 assert.equal(typeof fields['#grimadownload'].onclick,'function');
 fields['#grimaclose'].onclick();assert(dialog.removed);
 console.log('Passed return dialog: opens, copy-denied selection fallback, JSON download, oversized error fallback, close.');
})().catch(e=>{console.error(e);process.exitCode=1});
