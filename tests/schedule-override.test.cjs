const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,Intl,setTimeout(){},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return {style:{},value:'0',close(){}}}}});
for(const f of ['app','role-priorities','fellowship','constraints','search','allocation'])vm.runInContext(fs.readFileSync('public/'+f+'.js','utf8'),ctx);
const e=s=>vm.runInContext(s,ctx);


e(`size=6;duration=0.5;constraints=[];rolePriorities={};template={Tank:[0,0],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]};fellowshipSetup=emptyFellowshipSetup();fellowshipSetup.enabled=false;players=[];recommendationRunLimit=5;runs=Array.from({length:5},(_,i)=>({id:i+1,source:i,time:18+i*duration,label:'Run '+(i+1)}));let configured=JSON.stringify(runs);dirty=false;recommendedConfiguration={runs:runs.slice(0,4),teams:[]};applyRecommendedConfiguration();`);
assert.equal(e('runs.length'),4);assert.equal(e('configuredRunCount()'),5);
assert(e('planningControls().includes("<strong>5</strong>")'));
assert(e('teamScheduleControls().includes("override of 5 configured runs")'));
e(`let saved=sessionSnapshot();restoreSession(JSON.parse(JSON.stringify(saved)));`);
assert.equal(e('runs.length'),4);assert.equal(e('configuredRunCount()'),5);
e(`calculateTeams();`);
assert(e('JSON.stringify(runs)===configured && scheduleOverrideBase===null'));
// Worker receives the configured schedule, not the temporary accepted shape.
e(`dirty=false;recommendedConfiguration={runs:runs.slice(0,2),teams:[]};applyRecommendedConfiguration();`);
vm.runInContext(fs.readFileSync('public/background.js','utf8'),ctx);
e(`showPlanningBusy=function(){};let posted;var Worker=class{postMessage(data){posted=data}terminate(){}};generateTeams();`);
assert.equal(e('posted.runs.length'),5);assert.equal(e('runs.length'),5);
// Changing the setting decrements five to four, rather than the override's two to one.
e(`players=[];dirty=false;recommendedConfiguration={runs:runs.slice(0,2),teams:[]};applyRecommendedConfiguration();changeRunCount(-1);`);
assert.equal(e('configuredRunCount()'),4);assert.equal(e('runs.length'),4);
console.log('Passed: accepted override preserves settings, session round-trip, synchronous regeneration, worker input and manual count edits.');
// Team +/- controls change active override and leave settings untouched.
e(`players=[];runs=Array.from({length:5},(_,i)=>({id:i+1,source:i,time:18+i*duration,label:'Run '+(i+1)}));scheduleOverrideBase=null;recommendationRunLimit=5;tab='Team';changeOverrideRunCount(-1);`);
assert.equal(e('runs.length'),4);assert.equal(e('configuredRunCount()'),5);
assert(e('teamScheduleControls().includes("changeOverrideRunCount")'));
e(`changeOverrideRunCount(1);`);assert.equal(e('runs.length'),5);assert.equal(e('configuredRunCount()'),5);
e(`changeOverrideRunCount(-1);players=[{id:'stub',available:Array(5).fill(true),choices:[]}];generateTeams({keepOverride:true});`);
assert.equal(e('posted.runs.length'),4);assert.equal(e('configuredRunCount()'),5);
e(`generateTeams();`);assert.equal(e('posted.runs.length'),5);
console.log('Passed: Team overrides retain Settings and worker receives override on adjustment, configured schedule on Regenerate.');
