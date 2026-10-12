// Bounded schedule repair: never return a worse fully validated schedule.
function scheduleFeasible(schedule){let characterSeen=new Set();if(noRepeatSearch)for(let t of schedule)for(let m of t.members){let key=characterKey(m);if(characterSeen.has(key))return false;characterSeen.add(key)}let occupied=new Map(),playerIndex=new Map(players.map(p=>[p.id,p]));for(let t of schedule){let ids=new Set();if(t.members.length>size)return false;for(let m of t.members){let p=playerIndex.get(m.id);if(!p||ids.has(m.id)||!availableForRun(p,t)||!choicesFor(p,t).some(c=>c.c===m.c&&c.spec===m.spec&&c.role===m.role&&(!m.charId||c.charId===m.charId)))return false;ids.add(m.id);let times=occupied.get(m.id)||[];if(times.some(time=>Math.abs(time-t.time)+1e-8<duration))return false;times.push(t.time);occupied.set(m.id,times)}}return true}
function searchScheduleKey(schedule){return JSON.stringify(schedule.map(t=>[t.id,t.members.map(m=>[m.id,m.charId||'',m.c,m.spec,m.role]).sort()]))}
function memberExperienceState(m){return typeof experienceState==='function'?experienceState(m,m?.c):'default'}
// Soft experience balance: unsupported inexperience overall and per role. Uses intended capacity.
function experienceDeficitPenalty(members,capacity){
 let cap=Number(capacity);if(!Number.isFinite(cap)||cap<=0||!Array.isArray(members)||!members.length)return 0;
 let seen=new Set(),inexp=0,exp=0,byRole={};
 for(let m of members){
  if(!m)continue;let id=String(m.id);if(seen.has(id))continue;seen.add(id);
  let state=memberExperienceState(m);if(state==='default')continue;
  let role=m.role||'DPS';byRole[role]??={inexp:0,exp:0};
  if(state==='inexperienced'){inexp++;byRole[role].inexp++}else if(state==='experienced'){exp++;byRole[role].exp++}
 }
 let overall=Math.max(0,inexp-exp),penalty=overall*overall/cap;
 for(let role of Object.keys(byRole)){let d=Math.max(0,byRole[role].inexp-byRole[role].exp),slots=Math.max(1,byRole[role].inexp+byRole[role].exp);penalty+=d*d/slots}
 return penalty;
}
function experienceConcentration(groups,capacity){
 if(!Array.isArray(groups)||!groups.length)return 0;
 let total=0;
 for(let i=0;i<groups.length;i++){let cap=Array.isArray(capacity)?Number(capacity[i]):Number(capacity);total+=experienceDeficitPenalty(groups[i],cap)}
 return total;
}
function parallelExperienceConcentration(schedule){
 let byTime=new Map();
 for(let t of schedule||[]){let key=String(t.time);let list=byTime.get(key);if(!list)byTime.set(key,list=[]);list.push(t)}
 let total=0;
 for(let list of byTime.values()){if(list.length<2)continue;total+=experienceConcentration(list.map(t=>t.members),size)}
 return total;
}
function fellowshipExperienceConcentration(schedule){
 let total=0;
 for(let t of schedule||[]){let fellowships=t.fellowships||[];if(fellowships.length<2)continue;total+=experienceConcentration(fellowships,6)}
 return total;
}
function raidExperienceConcentration(schedule){
 return (schedule||[]).reduce((n,t)=>n+experienceDeficitPenalty(t.members,size),0);
}
function severeConstraintDeficit(deficit){return Math.max(0,(Number(deficit)||0)-0.25)}
function scheduleMetrics(schedule,fast=false){
 let groups=schedule.map(t=>({...t,fellowships:assignFellowships(t.members,fast)})),checks=evaluateScheduleRules(groups,fast),deficit=r=>Math.max(1e-6,r.deficit??r.preferredDeficit??1),comp=checks.filter(r=>r.scope==='fellowship_setup'&&r.strength==='hard'&&!r.pass).reduce((n,r)=>n+deficit(r),0),hardChecks=checks.filter(r=>r.scope!=='fellowship_setup'&&r.strength==='hard'&&!r.pass),constraintsHard=hardChecks.reduce((n,r)=>n+deficit(r),0),constraintsSevere=hardChecks.reduce((n,r)=>n+severeConstraintDeficit(deficit(r)),0),constraintsSoft=checks.filter(r=>r.scope!=='fellowship_setup').reduce((n,r)=>n+(r.preferredDeficit??(r.strength==='soft'?r.deficit:0)??0),0),seen=new Map(),used=new Map(),preferredComp=checks.filter(r=>r.scope==='fellowship_setup').reduce((n,r)=>n+(r.preferredDeficit??(r.strength==='soft'?r.deficit:0)??0),0)*4000+scarcityConcentration(schedule)*SCARCITY_CONCENTRATION,repeats=0,inexperiencedLocks=0,experiencedLocks=0,playerPreferences=0,diversity=0;
 for(let t of schedule){comp+=Math.max(0,size-t.members.length)+raidLeaderDeficit(t.members);for(let [role,[min,pref]] of Object.entries(template)){let count=t.members.filter(m=>m.role===role).length;comp+=Math.max(0,min-count);preferredComp+=Math.max(0,pref-count)*6000+Math.pow(Math.max(0,count-Math.max(min,pref)),2)*250000}let counts={},prioritySeen=new Set();for(let m of t.members){counts[m.c]=(counts[m.c]||0)+1;let key=characterKey(m),prior=seen.get(key)||0;repeats+=prior*prior;if(prior){let state=memberExperienceState(m);if(state==='inexperienced')inexperiencedLocks+=prior;else if(state==='experienced')experiencedLocks+=prior}seen.set(key,prior+1);used.set(m.id,(used.get(m.id)||0)+1);playerPreferences+=playerPreferenceCost(m,m.c);preferredComp+=rolePriorityCost(m,prioritySeen)}diversity+=Object.values(counts).reduce((n,v)=>n+Math.pow(Math.max(0,v-1),2)*30000,0)}
 let parallelBalance=schedule.reduce((n,t)=>n+Math.pow(size-t.members.length,2),0);
 return {parallelBalance,comp,constraintsSevere,constraintsHard,constraintsSoft,repeats,inexperiencedLocks,experiencedLocks,uncovered:uncovered(schedule).length,playerPreferences,preferredComp,quality:playerPreferences+preferredComp+diversity,diversity,uneven:players.reduce((n,p)=>n+Math.pow(used.get(p.id)||0,2),0),experienceRaidConcentration:raidExperienceConcentration(schedule)+parallelExperienceConcentration(schedule),experienceFellowshipConcentration:fellowshipExperienceConcentration(groups)};
}
function scheduleHardDeficit(schedule,fast=false){let m=scheduleMetrics(schedule,fast);return m.comp+m.constraintsHard}
function raidCorrectness(raid,fast=false){let m=scheduleMetrics([{...raid,members:raid.members||[]}],fast);return m.comp+m.constraintsHard}
function scheduleCorrectness(schedule,fast=false){return scheduleHardDeficit(schedule,fast)}
// One policy definition for local improvement, global repair and recommendations.
function selectionObjective(m){
 let tail=[m.uncovered,m.experienceRaidConcentration||0,m.experienceFellowshipConcentration||0,m.parallelBalance||0,m.diversity,m.uneven];
 let inexperiencedLocks=(m.inexperiencedLocks||0)*INEXPERIENCED_LOCK_COST,locks=m.playerPreferences+m.repeats*100000+inexperiencedLocks-(m.experiencedLocks||0)*EXPERIENCED_LOCK_DISCOUNT;
 if(lockPriority==='quality')return [m.comp,m.preferredComp+inexperiencedLocks,m.constraintsHard,m.constraintsSoft,locks,...tail];
 return [m.comp,m.constraintsSevere||0,locks,m.constraintsHard,m.preferredComp,m.constraintsSoft,...tail];
}
function scheduleObjective(schedule){return selectionObjective(scheduleMetrics(schedule))}
function localSelectionObjective(members,run,used,characters,fast=false){
 let m=scheduleMetrics([{...run,members}],fast);
 m.repeats=members.reduce((n,p)=>n+Math.pow(characters[characterKey(p)]||0,2),0);
 let priorLocks=state=>members.reduce((n,p)=>n+(memberExperienceState(p)===state?characters[characterKey(p)]||0:0),0);m.inexperiencedLocks=priorLocks('inexperienced');m.experiencedLocks=priorLocks('experienced');
 if(scarcityBids)m.preferredComp+=scarcityExcess(members,scarcityBids);
 let ids=new Set(members.map(p=>p.id));m.uncovered=players.filter(p=>!used[p.id]?.length&&!ids.has(p.id)).length;
 m.uneven=players.reduce((n,p)=>n+Math.pow((used[p.id]?.length||0)+(ids.has(p.id)?1:0),2),0);
 // Schedule-wide constraints include previous runs, rather than treating every local team as a new schedule.
 if(constraints.some(r=>r.enabled&&!['each_raid','each_fellowship'].includes(r.scope))){let full=scheduleMetrics([...constraintContext.filter(t=>t.id!==run.id),{...run,members}],fast);m.constraintsSevere=full.constraintsSevere;m.constraintsHard=full.constraintsHard;m.constraintsSoft=full.constraintsSoft}
 return selectionObjective(m);
}

function betterSchedule(a,b){for(let i=0;i<a.length;i++){if(Math.abs(a[i]-b[i])>1e-8)return a[i]<b[i]}return false}
function repairCandidates(schedule,deadline=Infinity){let proposals=[],playerIndex=new Map(players.map(p=>[p.id,p])),expired=()=>Date.now()>deadline,push=(changes)=>{if(proposals.length>=1200||expired())return;let next=schedule.map((t,i)=>changes.has(i)?{...t,members:changes.get(i)}:t);if(!scheduleFeasible(next))return;let used={},characters={},cheap=0;for(let t of next){cheap+=assignmentScore(t.members,used,characters,null,false);for(let p of t.members){(used[p.id]??=[]).push(t.time);characters[characterKey(p)]=(characters[characterKey(p)]||0)+1}}cheap+=uncovered(next).length*500000;let repeatCounts=new Map(),repeatPenalty=0,inexperiencedLocks=0;for(let t of next)for(let m of t.members){let key=characterKey(m),n=repeatCounts.get(key)||0;repeatPenalty+=n*n;if(n&&memberExperienceState(m)==='inexperienced')inexperiencedLocks+=n;repeatCounts.set(key,n+1)}let hardApprox=next.reduce((n,t)=>n+Math.max(0,size-t.members.length)+raidLeaderDeficit(t.members)+Object.entries(template).reduce((v,[role,[min]])=>v+Math.max(0,min-t.members.filter(m=>m.role===role).length),0),0);let empty=next.reduce((n,t)=>n+Math.max(0,size-t.members.length),0);let preferenceCost=next.reduce((n,t)=>n+t.members.reduce((v,m)=>v+playerPreferenceCost(m,m.c),0),0);let constraintApprox=0,severeConstraintApprox=0;for(let rule of constraints.filter(r=>r.enabled)){let add=d=>{if(rule.strength==='hard'){constraintApprox+=d*100000;severeConstraintApprox+=severeConstraintDeficit(d)}else constraintApprox+=d};if(['each_raid','each_fellowship'].includes(rule.scope)){for(let t of next)for(let r of ruleForRaid(rule,t.members,baseFellowships(t.members),true))add(r.deficit)}else if(rule.scope==='at_least_one_raid')add(Math.min(...next.map(t=>resultForMembers(rule,t.members).deficit)))}proposals.push({next,cheap,constraintApprox,severeConstraintApprox,repeatPenalty,hardApprox,empty,preferenceLocks:preferenceCost+repeatPenalty*100000+inexperiencedLocks*INEXPERIENCED_LOCK_COST})};for(let changes of unlockChanges(schedule,deadline,300))push(changes);for(let a=0;a<schedule.length&&proposals.length<1200&&!expired();a++){let runLimit=Math.min(1200,proposals.length+Math.max(60,Math.floor(1200/schedule.length))),replacementLimit=Math.min(runLimit,proposals.length+Math.max(30,Math.floor(600/schedule.length)));let t=schedule[a],pool=players.filter(p=>availableForRun(p,t)).flatMap(p=>choicesFor(p,t).map((c,rank)=>({...p,...c,rank})));for(let i=0;i<=t.members.length&&proposals.length<replacementLimit&&!expired();i++){if(i===t.members.length&&t.members.length>=size)continue;let occupied=new Set(t.members.filter((_,j)=>j!==i).map(p=>p.id));for(let p of pool){if(proposals.length>=replacementLimit||expired())break;if(occupied.has(p.id)||i<t.members.length&&characterKey(p)===characterKey(t.members[i])&&p.spec===t.members[i].spec)continue;let next=t.members.slice();next[i]=p;push(new Map([[a,next]]))}}for(let b=a+1;b<schedule.length&&proposals.length<runLimit&&!expired();b++){let u=schedule[b];for(let i=0;i<t.members.length&&proposals.length<runLimit&&!expired();i++)for(let j=0;j<u.members.length&&proposals.length<runLimit&&!expired();j++){let p=playerIndex.get(t.members[i].id),q=playerIndex.get(u.members[j].id);if(!p||!q||p.id===q.id)continue;for(let pc of choicesFor(p,u))for(let qc of choicesFor(q,t)){let left=t.members.slice(),right=u.members.slice();left[i]={...q,...qc,rank:q.choices.findIndex(c=>c.c===qc.c&&c.spec===qc.spec)};right[j]={...p,...pc,rank:p.choices.findIndex(c=>c.c===pc.c&&c.spec===pc.spec)};push(new Map([[a,left],[b,right]]))}}}}proposals.sort((a,b)=>a.hardApprox-b.hardApprox||a.severeConstraintApprox-b.severeConstraintApprox||(lockPriority==='gearing'?a.preferenceLocks-b.preferenceLocks:0)||a.constraintApprox-b.constraintApprox||a.cheap-b.cheap);return proposals}
// Moves that trade a repeated character for a fresh one: a free player, the locked player's own alt, a teammate chain, or a parallel-run exchange.
function unlockChanges(schedule,deadline=Infinity,limit=400){
 let counts=new Map(),changes=[],playerIndex=new Map(players.map(p=>[p.id,p])),expired=()=>Date.now()>deadline;
 for(let t of schedule)for(let m of t.members)counts.set(characterKey(m),(counts.get(characterKey(m))||0)+1);
 let as=(p,c)=>({...p,...c,rank:p.choices.findIndex(o=>o.c===c.c&&o.spec===c.spec)}),fresh=(p,run)=>choicesFor(p,run).map(c=>as(p,c)).filter(c=>!counts.has(characterKey(c)));
 let overlaps=(u,t)=>u!==t&&Math.abs(u.time-t.time)+1e-8<duration;
 let push=map=>{if(changes.length>=limit||expired())return;let next=schedule.map((t,k)=>map.has(k)?{...t,members:map.get(k)}:t);if(scheduleFeasible(next))changes.push(map)};
 for(let a=0;a<schedule.length;a++){let t=schedule[a];
  let free=players.filter(p=>availableForRun(p,t)&&!t.members.some(x=>x.id===p.id)&&!schedule.some(u=>overlaps(u,t)&&u.members.some(x=>x.id===p.id))),freeFresh=free.flatMap(p=>fresh(p,t));
  for(let i=0;i<t.members.length;i++){let m=t.members[i],locked=playerIndex.get(m.id);if(!locked||(counts.get(characterKey(m))||0)<2)continue;
   let put=(slot,member,run=a,base=t.members)=>{let next=base.slice();next[slot]=member;return [run,next]};
   for(let c of [...freeFresh,...fresh(locked,t)])push(new Map([put(i,c)]));
   t.members.forEach((p,j)=>{if(j===i)return;let mate=playerIndex.get(p.id);if(!mate)return;for(let c of fresh(mate,t)){let [,moved]=put(i,c);for(let b of [...fresh(locked,t),...freeFresh]){if(changes.length>=limit||expired())return;push(new Map([put(j,b,a,moved)]))}}});
   schedule.forEach((u,b)=>{if(!overlaps(u,t))return;u.members.forEach((p,k)=>{let other=playerIndex.get(p.id);if(!other)return;for(let c of fresh(other,t))for(let back of choicesFor(locked,u).map(o=>as(locked,o)))push(new Map([put(i,c),put(k,back,b,u.members)]))})});
  }
 }
 return changes;
}
function unlockRepair(schedule,deadline){
 if(!schedule.length||!scheduleFeasible(schedule))return schedule;
 let current=schedule,score=scheduleObjective(current);
 while(Date.now()<deadline){let change=null;
  for(let changes of unlockChanges(current,deadline,4000)){if(Date.now()>deadline)break;let next=current.map((t,k)=>changes.has(k)?{...t,members:changes.get(k)}:t),candidate=scheduleObjective(next);if(betterSchedule(candidate,score)){score=candidate;change=next}}
  if(!change)break;current=change}
 return current===schedule?schedule:refreshScheduleDetails(current);
}
function repairShortlist(proposals){let severeFirst=[...proposals].sort((a,b)=>a.hardApprox-b.hardApprox||a.severeConstraintApprox-b.severeConstraintApprox||a.constraintApprox-b.constraintApprox||a.cheap-b.cheap),constraintFirst=[...proposals].sort((a,b)=>a.hardApprox-b.hardApprox||a.constraintApprox-b.constraintApprox||a.cheap-b.cheap),freshFirst=[...proposals].sort((a,b)=>a.hardApprox-b.hardApprox||a.repeatPenalty-b.repeatPenalty||a.cheap-b.cheap);return [...new Set([...proposals.slice(0,16),...severeFirst.slice(0,8),...constraintFirst.slice(0,8),...freshFirst.slice(0,8)])]}
function refreshScheduleDetails(schedule){let characters={};for(let t of schedule){t.members=t.members.map(p=>{let key=characterKey(p),repeated=!!characters[key];characters[key]=(characters[key]||0)+1;return {...p,repeated}});t.shortages=Object.entries(template).filter(([r,v])=>t.members.filter(p=>p.role===r).length<v[0]).map(([r,v])=>({role:r,count:v[0]-t.members.filter(p=>p.role===r).length}));if(raidLeaderDeficit(t.members))t.shortages.push({role:'Raid leader',count:1});t.preferredShortages=Object.entries(template).filter(([r,v])=>t.members.filter(p=>p.role===r).length<v[1]).map(([r,v])=>({role:r,count:v[1]-t.members.filter(p=>p.role===r).length}));t.repeatCount=t.members.filter(p=>p.repeated).length;t.classDuplicates=t.members.length-new Set(t.members.map(p=>p.c)).size;t.members.sort((a,b)=>roleOrder.indexOf(a.role)-roleOrder.indexOf(b.role))}return schedule}
function refineSchedule(schedule){if(typeof planningProgress==='function')planningProgress('Balancing all runs and checking alternate layouts…');if(!schedule.length||!scheduleFeasible(schedule))return schedule;let searchDeadline=Math.min(selectionDeadline,Date.now()+1500),cache=new Map(),objective=s=>{let key=searchScheduleKey(s);if(!cache.has(key))cache.set(key,scheduleObjective(s));return cache.get(key)},best=schedule,bestScore=objective(best);function climb(start,passes){let current=start,score=objective(current);for(let pass=0;pass<passes;pass++){if(Date.now()>searchDeadline)break;let change=null;for(let {next} of repairShortlist(repairCandidates(current,searchDeadline))){if(Date.now()>searchDeadline)break;let candidate=objective(next);if(betterSchedule(candidate,score)){score=candidate;change=next}}if(!change)break;current=change}return {current,score}}
let polished=climb(best,3);best=polished.current;bestScore=polished.score;
// Try alternate basins, allowing an intermediate worse layout but retaining the best result.
let alternatives=Date.now()>searchDeadline?[]:repairCandidates(best,searchDeadline).filter(({next})=>searchScheduleKey(next)!==searchScheduleKey(best));for(let seed of [0,3,11]){if(Date.now()>searchDeadline)break;let candidate=alternatives[seed];if(!candidate)continue;let result=climb(candidate.next,2);if(betterSchedule(result.score,bestScore)){best=result.current;bestScore=result.score}}
best=unlockRepair(best,Date.now()+(quickScheduleCheck?100:500));
return refreshScheduleDetails(best)}
