const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,Intl,setTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return {style:{},value:'0',close(){}}}}});
for(const f of ['app','role-priorities','fellowship','constraints','search','background'])vm.runInContext(fs.readFileSync('public/'+f+'.js','utf8'),ctx);
const e=s=>vm.runInContext(s,ctx);
e(`let zero={comp:0,repeats:0,playerPreferences:0,preferredComp:0,constraintsSevere:0,constraintsHard:0,constraintsSoft:0,uncovered:0,parallelBalance:0,diversity:0,uneven:0};`);
const orders={gearing:['comp','constraintsSevere','joint','constraintsHard','preferredComp','constraintsSoft'],quality:['comp','preferredComp','constraintsHard','constraintsSoft','joint']};
for(const [mode,tiers] of Object.entries(orders)){
 e(`lockPriority='${mode}'`);
 for(let i=0;i<tiers.length;i++)for(let j=i+1;j<tiers.length;j++){
 const key=t=>t==='joint'?'playerPreferences':t;
 assert(e(`betterSchedule(selectionObjective({...zero,${key(tiers[j])}:1000000000}),selectionObjective({...zero,${key(tiers[i])}:1}))`),`${mode}: ${tiers[i]} before ${tiers[j]}`);
 }
}
// Severe shortfalls beat huge preference/lock cost; mild hard deficit can still lose to joint gearing cost.
e(`lockPriority='gearing'`);
assert(e(`betterSchedule(selectionObjective({...zero,playerPreferences:1e12}),selectionObjective({...zero,constraintsSevere:0.01}))`),'severe before joint');
assert(e(`betterSchedule(selectionObjective({...zero,constraintsHard:0.1}),selectionObjective({...zero,playerPreferences:1}))`),'joint before mild hard');
assert(e(`betterSchedule(selectionObjective({...zero,constraintsHard:0.1}),selectionObjective({...zero,constraintsHard:0.6}))`),'lower continuous hard wins on ties');
e(`size=1;duration=1;constraints=[];fellowshipSetup=emptyFellowshipSetup();rolePriorities={};template={Tank:[0,0],Healer:[1,1],Debuffer:[0,0],Buffer:[0,0]};runs=[{id:1,source:0,time:18,label:'One'},{id:2,source:1,time:19,label:'Two'}];players=[{id:'heal',name:'Heal',max:2,available:[true,true],choices:[{c:'Minstrel',spec:'Blue',role:'Healer'}]},{id:'dps',name:'DPS',max:2,available:[true,true],choices:[{c:'Hunter',spec:'Red',role:'DPS'}]}];`);
for(const mode of Object.keys(orders)){
 e(`lockPriority='${mode}';teams=assign(runs)`);
 assert.equal(e('scheduleMetrics(teams).comp'),0,mode);assert.equal(e('lockedPlayerCount(teams)'),1,mode);assert(e('scheduleFeasible(teams)'));
}
// Preferred staffing wins over heal-cut presence in quality mode; eligibility only requires required comp.
e(`runs=runs.slice(0,1);template.Healer=[0,0];template.Buffer=[0,1];players=[{id:'flex',name:'Flex',max:1,available:[true],preferredClasses:['Brawler'],choices:[{c:'Captain',spec:'Red',role:'Buffer'},{c:'Brawler',spec:'Red',role:'DPS'}]}];let presence=newRule('presence');presence.config={className:'Brawler',spec:'Red',minimum:1};constraints=[presence];`);
e(`lockPriority='quality';teams=assign(runs)`);assert.equal(e('teams[0].members[0].c'),'Captain');assert(e('recommendationEligibility(teams).eligible'));assert(e('recommendationEligibility(teams).preferredDeficit>0||recommendationEligibility(teams).constraintsHard>0||recommendationEligibility(teams).constraintsSoft>0'));
e(`lockPriority='gearing';teams=assign(runs)`);assert.equal(e('teams[0].members[0].c'),'Brawler');assert(e('recommendationEligibility(teams).eligible'));
e(`lockPriority='gearing';teams=assign(runs)`);assert.equal(e('teams[0].members[0].c'),'Brawler');
// Suggest schedule off: no alternate search or apply.
e(`template.Healer=[1,1];lockPriority='gearing';teams=assign(runs);dirty=false;suggestSchedule=false;recommendedConfiguration=findRecommendedConfiguration(teams,200);let before=JSON.stringify(runs);applyRecommendedConfiguration()`);
assert.equal(e('recommendedConfiguration'),null);assert.equal(e('JSON.stringify(runs)'),e('before'));assert.equal(e('recommendedConfigurationHTML()'),'');
// Correctness ranks empty teams worse; covering more players still wins on soft ties.
e(`size=1;template={Tank:[0,0],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};constraints=[];fellowshipSetup=emptyFellowshipSetup();lockPriority='gearing';let one=[{id:1,source:0,time:18,label:'One',members:[{id:'a',name:'A',c:'Hunter',spec:'Red',role:'DPS'}]}],two=[{id:1,source:0,time:18,label:'One',members:[{id:'a',name:'A',c:'Hunter',spec:'Red',role:'DPS'}]},{id:2,source:0,time:18,label:'One · Group 2',group:2,members:[{id:'b',name:'B',c:'Champion',spec:'Red',role:'DPS'}]}],empty=[{id:1,source:0,time:18,label:'One',members:[]}];`);
assert(e('scheduleCorrectness(empty)>scheduleCorrectness(one)'));
assert(e('betterRecommendedConfiguration(configurationSummary(two),configurationSummary(one))'));
// Neutral classes are ordinary choices, even when a different class is starred.
e(`constraints=[];template.Healer=[0,0];template.Buffer=[0,0];let neutral={...players[0],c:'Brawler',spec:'Red',role:'DPS'};players[0].preferredClasses=['Captain'];teams=[{...runs[0],members:[neutral]}]`);
assert.equal(e('assignmentNotes(neutral,teams[0]).length'),0);
e(`players[0].deprioritizedClasses=['Brawler']`);assert(e('assignmentNotes(neutral,teams[0]).some(n=>n.includes("Deprioritized"))'));
assert.equal(e('repairCandidates(teams,Date.now()-1).length'),0);
// Changing run slots remaps both availability and tentative status, including inherited extra runs.
e(`players[0].available=[true,false,true];players[0].tentativeRuns=[false,false,true];runs=[{id:1,source:0,time:18,label:'A'},{id:2,source:2,time:20,label:'B'}];setScheduleCounts(3,1)`);
assert.equal(e('players[0].tentativeRuns.join(",")'),'false,true,true');
// Actual schedule optimum on a small enumerated fixture, rather than only score-vector assertions.
e(`size=1;constraints=[];rolePriorities={};template={Tank:[0,0],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};runs=runs.slice(0,2);players=[{id:'alt',name:'Alt',max:2,available:[true,true],choices:[{c:'Hunter',spec:'Red',role:'DPS'},{c:'Champion',spec:'Red',role:'DPS'}]},{id:'early',name:'Early',max:2,available:[true,false],choices:[{c:'Burglar',spec:'Red',role:'DPS'}]}];let exactSchedules=[];for(let p of players)for(let c of choicesFor(p,runs[0]))for(let q of players)for(let d of choicesFor(q,runs[1])){let s=[{...runs[0],members:[{...p,...c}]},{...runs[1],members:[{...q,...d}]}];if(scheduleFeasible(s))exactSchedules.push(s)}`);
for(const mode of Object.keys(orders)){
 e(`lockPriority='${mode}';var actual=assign(runs);var optimum=exactSchedules.map(scheduleObjective).sort((a,b)=>betterSchedule(a,b)?-1:betterSchedule(b,a)?1:0)[0];`);
 assert(e('!betterSchedule(optimum,scheduleObjective(actual))'),mode);
}
console.log('Passed: all mode priority pairs, required repeat fallback, perfect preferred comp, recommendation gates, neutral notes, deadlines, tentative remap and exhaustive small-schedule optimum.');

e(`planningWorker={terminate(){this.terminated=true}};var editedWorker=planningWorker;var priorJob=planningJob;optimize()`);assert(e('editedWorker.terminated&&planningJob===priorJob+1&&dirty'));console.log('Passed: edits invalidate active worker results.');

// Legacy modes migrate to two canonical modes; regenerated unlocked plans use the new joint preference/lock policy.
e(`size=6;hasGenerated=false;teams=[];let migrationSession=compactSessionSnapshot()`);
for(const [legacy,expected] of [['unlocked','gearing'],['comp','gearing'],['perfect','quality'],['gearing','gearing'],['quality','quality'],[undefined,'gearing']]){
 ctx.legacy=legacy;e(`var restoreModeSession=JSON.parse(JSON.stringify(migrationSession));restoreModeSession.settings.lockPriority=legacy;restoreSession(restoreModeSession);`);
 assert.equal(e('lockPriority'),expected);assert.equal(e('compactSessionSnapshot().settings.lockPriority'),expected);
 e(`delete globalThis.legacy`);
}
assert.equal((e('lockPriorityControls()').match(/<option /g)||[]).length,2);
assert(!e('lockPriorityControls().includes("Prioritize locks")'));
console.log('Passed: legacy session modes migrate; exports use canonical modes; exactly two UI choices.');

e(`hasGenerated=true;dirty=false;migrationSession=compactSessionSnapshot();migrationSession.settings.lockPriority='unlocked';restoreSession(migrationSession)`);assert(e('dirty'));assert.equal(e('lockPriority'),'gearing');
console.log('Passed: generated legacy Locks plan requires regeneration after migration.');
