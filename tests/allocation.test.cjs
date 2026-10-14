const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,Intl,setTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return {style:{},value:'0',close(){}}}}});
for(const f of ['app','role-priorities','fellowship','constraints','search','allocation'])vm.runInContext(fs.readFileSync('public/'+f+'.js','utf8'),ctx);
const e=s=>vm.runInContext(s,ctx);
e(`size=1;duration=1;constraints=[];rolePriorities={};template={Tank:[0,0],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};fellowshipSetup=emptyFellowshipSetup();fellowshipSetup.enabled=false;
let make=(id,primary,cs)=>({id,name:id,primary,available:Array(5).fill(true),choices:cs.map(c=>({c,spec:'Red',role:'DPS'}))});
players=[make('primary',true,['Hunter','Champion','Burglar','Warden']),make('other',false,['Mariner','Rune-keeper'])];runs=Array.from({length:5},(_,i)=>({id:i+1,source:i,time:18+i,label:'Run '+(i+1)}));
let drafted=assign(runs);`);
assert(e('validateAllocation(drafted).valid'));
assert.equal(e('drafted.flatMap(t=>t.members).filter(p=>p.id==="primary").length'),4,'Primary fourth seat beats another second seat');
assert.equal(e('drafted.flatMap(t=>t.members).filter(p=>p.id==="other").length'),1);
assert.equal(e('lockedPlayerCount(drafted)'),0);
// Coverage before Primary extras; scarce late role forces early choices to move.
e(`players=[{id:'flex',name:'Flex',primary:true,available:[true,true],choices:[{c:'Warden',spec:'Blue',role:'Tank'},{c:'Hunter',spec:'Red',role:'DPS'}]},{id:'early',name:'Early',available:[true,false],choices:[{c:'Guardian',spec:'Blue',role:'Tank'}]}];template.Tank=[1,1];runs=runs.slice(0,2);let scarce=assign(runs);`);
assert(e('validateAllocation(scarce).valid'));
assert.equal(e('scarce[0].members[0].id'),'early');
assert.equal(e('scarce[1].members[0].id'),'flex');
assert.equal(e('lockedPlayerCount(scarce)'),0);
// Eligibility explains exclusions; repeats and overlap are independent.
e(`let candidate={...players[0],...players[0].choices[0]};let occupied=[{...runs[0],members:[candidate]}];`);
assert(e('queryEligibility({run:runs[0],schedule:occupied,allowLocks:true}).excluded.some(x=>x.id==="flex"&&x.reason==="overlap")'));
assert(e('queryEligibility({run:runs[1],schedule:occupied}).excluded.some(x=>x.id==="flex"&&x.reason==="character-repeat")'));
e(`players[0].inexperiencedClasses=['Warden'];`);
assert(e('queryEligibility({run:runs[1],schedule:occupied,allowLocks:true}).excluded.some(x=>x.id==="flex"&&x.reason==="inexperienced-repeat")'));
// Impossible role coverage is pruned without alleging full infeasibility.
e(`players=[make('dps',true,['Hunter'])];`);
assert.equal(e('allocationCanComplete(runs.map(t=>({...t,members:[]})),false)'),false);
// Exhaustive oracle: compare all complete assignments for a tiny schedule.
e(`template.Tank=[0,0];players=[make('p',true,['Hunter','Champion']),make('q',false,['Burglar','Mariner'])];ensureRosterCharacters();let exact=[];for(let p of players)for(let c of choicesFor(p,runs[0]))for(let q of players)for(let d of choicesFor(q,runs[1])){let s=[{...runs[0],members:[{...p,...c}]},{...runs[1],members:[{...q,...d}]}];if(validateAllocation(s).valid)exact.push(s)}let optimum=exact.map(allocationObjective).sort((a,b)=>betterSchedule(a,b)?-1:betterSchedule(b,a)?1:0)[0];let actual=assign(runs);`);
assert(e('!betterSchedule(optimum,allocationObjective(actual))'));
// Old sessions migrate without changing the flag's meaning.
e(`let old={id:'legacy',kinsman:true};migratePrimary(old);`);
assert(e('old.primary===true&&!Object.hasOwn(old,"kinsman")'));
assert(e('lockPriorityControls().includes("Primary")&&!lockPriorityControls().includes("Kin")'));
// Worker budgets remain bounded on a realistic multi-choice roster.
e(`size=12;template={Tank:[1,1],Healer:[1,2],Debuffer:[1,2],Buffer:[1,1]};players=Array.from({length:30},(_,i)=>({id:'real'+i,name:'R'+i,primary:i<12,available:[true,true],choices:[opts[i%opts.length],opts[(i+7)%opts.length]]}));runs=[{id:1,source:0,time:18,label:'A'},{id:2,source:1,time:20,label:'B'}];quickScheduleCheck=true;let began=Date.now();let realistic=assign(runs,false);let elapsed=Date.now()-began;quickScheduleCheck=false;`);
assert(e('elapsed<1500'),'quick global allocation remains bounded');
assert(e('scheduleFeasible(realistic)'));
console.log('Passed: absolute Primary extras, first-run coverage, scarce-role routing, eligibility reasons, exhaustive tiny optimum, migration and bounded realistic allocation.');
