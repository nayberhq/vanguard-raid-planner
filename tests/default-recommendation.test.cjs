const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,Intl,setTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return {style:{},value:'0',close(){}}}}});
for(const f of ['app','role-priorities','fellowship','constraints','search','allocation'])vm.runInContext(fs.readFileSync('public/'+f+'.js','utf8'),ctx);
const e=s=>vm.runInContext(s,ctx);


vm.runInContext('const bundledDefaultSession='+fs.readFileSync('tests/fixtures/default-session.json','utf8'),ctx);
e(`restoreSession(bundledDefaultSession);let current=assign(runs);let suggested=findRecommendedConfiguration(current);`);
assert(e('players.length===23 && size===12'));
assert(e('suggested && suggested.runCount===4 && suggested.uniquePlayers===23'));
assert(e('validateAllocation(suggested.teams).valid'));
assert(e('suggested.groups.every(g=>g===1) && suggested.runCount===4'));
console.log('Passed: uploaded default yields four hard-valid raids cover all 23 players; no fifth run is added for more locked assignments.');
