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
assert(e('lockPriorityControls().includes("Perfect comp")&&!lockPriorityControls().includes("Kin")'));
// Worker budgets remain bounded on a realistic multi-choice roster.
e(`size=12;template={Tank:[1,1],Healer:[1,2],Debuffer:[1,2],Buffer:[1,1]};players=Array.from({length:30},(_,i)=>({id:'real'+i,name:'R'+i,primary:i<12,available:[true,true],choices:[opts[i%opts.length],opts[(i+7)%opts.length]]}));runs=[{id:1,source:0,time:18,label:'A'},{id:2,source:1,time:20,label:'B'}];quickScheduleCheck=true;let began=Date.now();let realistic=assign(runs,false);let elapsed=Date.now()-began;quickScheduleCheck=false;`);
assert(e('elapsed<1500'),'quick global allocation remains bounded');
assert(e('scheduleFeasible(realistic)'));
// Experience unit scale and 40% relax floor: Inexp=0, default=0.5, Exp=1.
e(`players=[{id:'i',name:'I',available:[true],inexperiencedClasses:['Hunter'],choices:[{c:'Hunter',spec:'Red',role:'DPS'}]},{id:'e',name:'E',available:[true],experiencedClasses:['Champion'],choices:[{c:'Champion',spec:'Red',role:'DPS'}]},...Array.from({length:5},(_,i)=>({id:'d'+i,name:'D'+i,available:[true],choices:[{c:'Burglar',spec:'Red',role:'DPS'}]}))];
let inexp={...players[0],...players[0].choices[0]},exp={...players[1],...players[1].choices[0]},defs=players.slice(2).map(p=>({...p,...p.choices[0]}));`);
assert.equal(e('experienceUnitValue(inexp)'),0);
assert.equal(e('experienceUnitValue(exp)'),1);
assert.equal(e('experienceUnitValue(defs[0])'),0.5);
assert.equal(e('EXPERIENCE_RELAX_FLOOR'),0.4);
assert.equal(e('experienceMeetsRelaxFloor([inexp,...defs])'),true,'Inexp+five defaults averages above 40%');
assert.equal(e('experienceMeetsRelaxFloor([inexp,defs[0]])'),false,'Inexp+default pair averages 25%');
assert.equal(e('experienceMeetsRelaxFloor([inexp,exp])'),true);
// Soft-locked Primary Exp tank should yield to unlocked Secondary Inexp when the raid stays at/above 40%.
e(`size=6;duration=1;constraints=[];rolePriorities={};template={Tank:[1,1],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};fellowshipSetup=emptyFellowshipSetup();fellowshipSetup.enabled=false;lockPriority='gearing';
players=[
 {id:'prim',name:'Prim',primary:true,available:[true,true],max:2,experiencedClasses:['Guardian'],choices:[{c:'Guardian',spec:'Blue',role:'Tank'}]},
 {id:'sec',name:'Sec',available:[true,true],max:2,inexperiencedClasses:['Warden'],choices:[{c:'Warden',spec:'Blue',role:'Tank'}]},
 ...Array.from({length:5},(_,i)=>({id:'a'+i,name:'A'+i,available:[true,false],max:1,choices:[{c:'Hunter',spec:'Red',role:'DPS'}]})),
 ...Array.from({length:5},(_,i)=>({id:'b'+i,name:'B'+i,available:[false,true],max:1,choices:[{c:'Champion',spec:'Red',role:'DPS'}]}))
];
runs=[{id:1,source:0,time:18,label:'A'},{id:2,source:1,time:19,label:'B'}];
ensureRosterCharacters();
let seat=p=>({...p,...p.choices.find(c=>!c.flexible)||p.choices[0]});
let softLocked=[{...runs[0],members:[seat(players[0]),...players.slice(2,7).map(seat)]},{...runs[1],members:[{...seat(players[0]),repeated:true},...players.slice(7,12).map(seat)]}];
allocationIndex=compileAllocationModel(runs);
let unlocked=relaxExperienceUnlock(softLocked,Date.now()+2000);`);
assert.equal(e('lockedPlayerCount(softLocked)'),1);
assert.equal(e('lockedPlayerCount(unlocked)'),0,'relaxed experience unlock removes the soft lock');
assert(e('unlocked[1].members.some(m=>m.id==="sec")'),'Secondary Inexp fills the tank seat instead of Primary soft lock');
assert(e('scheduleMeetsExperienceRelaxFloor(unlocked)'));
// Below-floor unlocks are rejected: size-1 Inexp tank averages 0%.
e(`size=1;template={Tank:[1,1],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};
players=[
 {id:'prim',name:'Prim',primary:true,available:[true,true],max:2,experiencedClasses:['Guardian'],choices:[{c:'Guardian',spec:'Blue',role:'Tank'}]},
 {id:'sec',name:'Sec',available:[true,true],max:2,inexperiencedClasses:['Warden'],choices:[{c:'Warden',spec:'Blue',role:'Tank'}]}
];
runs=[{id:1,source:0,time:18,label:'A'},{id:2,source:1,time:19,label:'B'}];
ensureRosterCharacters();
seat=p=>({...p,...p.choices.find(c=>!c.flexible)||p.choices[0]});
softLocked=[{...runs[0],members:[seat(players[0])]},{...runs[1],members:[{...seat(players[0]),repeated:true}]}];
allocationIndex=compileAllocationModel(runs);
let kept=relaxExperienceUnlock(softLocked,Date.now()+2000);`);
assert.equal(e('lockedPlayerCount(kept)'),1,'soft lock retained when unlocked Inexp would fall below 40%');
assert(e('kept[1].members[0].id==="prim"'));
console.log('Passed: absolute Primary extras, first-run coverage, scarce-role routing, eligibility reasons, exhaustive tiny optimum, migration, experience relax unlock and bounded realistic allocation.');
