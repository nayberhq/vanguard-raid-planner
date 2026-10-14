const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,Intl,setTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return {style:{},value:'0',close(){}}}}});
for(const f of ['app','role-priorities','fellowship','constraints','search','allocation'])vm.runInContext(fs.readFileSync('public/'+f+'.js','utf8'),ctx);
const e=s=>vm.runInContext(s,ctx);
e(`size=1;duration=1;constraints=[];rolePriorities={};template={Tank:[0,0],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};fellowshipSetup=emptyFellowshipSetup();fellowshipSetup.enabled=false;
players=[{id:'a-secondary',name:'Secondary',available:[true,true,true],max:3,experiencedClasses:['Champion'],choices:[{c:'Champion',spec:'Red',role:'DPS'}]},{id:'z-primary',name:'Primary',primary:true,available:[true,true,true],max:3,choices:[{c:'Hunter',spec:'Red',role:'DPS'}]}];runs=Array.from({length:3},(_,i)=>({id:i+1,source:i,time:18+i,label:'Run '+(i+1)}));let generated=assign(runs);`);
assert(e('validateAllocation(generated).valid'));
assert.equal(e('generated.flatMap(t=>t.members).filter(m=>m.primary).length'),2);
assert.equal(e('new Set(generated.flatMap(t=>t.members.map(m=>m.id))).size'),2);
e(`let occupied=runs.slice(0,2).map((r,i)=>({...r,members:[{...players[i],...players[i].choices[0]}]}));let pool=queryEligibility({run:runs[2],schedule:occupied,allowLocks:true}).members;`);
assert(e('pool[0].primary && pool[0].repeated'));
assert(e('allocationDraftTier(pool[0],occupied)===4 && allocationDraftTier(pool[1],occupied)===5'));
// An inexperienced Primary repeat is still ineligible; Secondary fallback remains available.
e(`players[1].inexperiencedClasses=['Hunter'];allocationIndex=null;let banned=queryEligibility({run:runs[2],schedule:occupied,allowLocks:true});`);
assert(e('banned.members.every(m=>!m.primary) && banned.members.length===1'));
assert(e('banned.excluded.some(x=>x.id==="z-primary"&&x.reason==="inexperienced-repeat")'));
console.log('Passed: Primary soft locks precede Secondary locks despite preference/experience/id ordering, both get first runs, ineligible Primary repeats do not block Secondary fallback.');
