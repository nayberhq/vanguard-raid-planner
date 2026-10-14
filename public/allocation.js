// Global allocation: eligibility is shared; only the independent configured checks certify a team.
// The previous allocator supplies starting incumbents, not the final policy.
let allocationIndex=null;
function compileAllocationModel(schedule){
 const options=new Map();for(const run of schedule)options.set(run.id,{source:run.source,time:run.time,byPlayer:new Map(players.map(p=>[p.id,choicesFor(p,run)]))});
 return {options,roles:Object.entries(template).map(([role,[minimum,preferred]])=>({role,minimum,preferred,maximum:roleHardMax(role)})),presence:constraints.filter(r=>r.enabled&&r.strength==='hard'&&r.type==='presence'&&r.scope==='each_raid')};
}
function queryEligibility({run,schedule=[],allowLocks=false,playerId=null,role=null}){
 const members=[],excluded=[];
 for(const p of players){
  if(playerId!==null&&p.id!==playerId)continue;
  let reason=null;
  if(!availableForRun(p,run))reason='unavailable';
  else if(schedule.some(t=>Math.abs(t.time-run.time)+1e-8<duration&&t.members.some(m=>m.id===p.id)))reason='overlap';
  if(reason){excluded.push({id:p.id,reason});continue}
  let offered=false;
  const indexed=allocationIndex?.options.get(run.id);
  const choices=indexed&&indexed.source===run.source&&indexed.time===run.time?indexed.byPlayer.get(p.id)||[]:choicesFor(p,run);
  for(const choice of choices){
   if(role&&choice.role!==role)continue;
   const m={...p,...choice},key=characterKey(m),prior=schedule.reduce((n,t)=>n+t.members.filter(x=>characterKey(x)===key).length,0);
   if(prior&&(!allowLocks||experienceState(p,m.c)==='inexperienced')){excluded.push({id:p.id,charId:m.charId,spec:m.spec,reason:experienceState(p,m.c)==='inexperienced'?'inexperienced-repeat':'character-repeat'});continue}
   members.push({...m,repeated:prior>0});offered=true;
  }
  if(!offered&&!excluded.some(x=>x.id===p.id))excluded.push({id:p.id,reason:'no-selected-option'});
 }
 members.sort((a,b)=>allocationDraftTier(a,schedule)-allocationDraftTier(b,schedule));
 return {members,excluded};
}
function allocationParticipation(schedule){
 const counts=new Map();for(const t of schedule)for(const m of t.members)counts.set(m.id,(counts.get(m.id)||0)+1);
 let primaryMissing=0,otherMissing=0,primaryExtra=0,otherExtra=0;
 for(const p of players){const n=counts.get(p.id)||0;if(!n){if(isPrimary(p))primaryMissing++;else otherMissing++}else if(isPrimary(p))primaryExtra+=n-1;else otherExtra+=n-1}
 return {primaryMissing,otherMissing,primaryExtra,otherExtra};
}
function secondaryLockedAssignments(schedule){let seen=new Set(),count=0;for(let t of schedule)for(let m of t.members){let key=characterKey(m);if(seen.has(key)&&!isPrimary(m))count++;seen.add(key)}return count}
function allocationObjective(schedule){
 const m=scheduleMetrics(schedule),p=allocationParticipation(schedule),locks=lockedPlayerCount(schedule);
 // Hard validity, first seats, lock avoidance, absolute Primary extras, quality.
 const hard=m.comp+m.constraintsHard;
 const worstPreferred=Math.max(0,...schedule.map(t=>Object.entries(template).reduce((n,[role,[min,pref]])=>n+Math.max(0,pref-t.members.filter(p=>p.role===role).length),0)+evaluateFellowshipSetup(assignFellowships(t.members)).reduce((n,r)=>n+(r.preferredDeficit??(r.strength==='soft'?r.deficit:0)??0),0)));
 const worstExperience=Math.max(0,...schedule.map(t=>experienceDeficitPenalty(t.members,size)));
 const quality=[worstPreferred,m.preferredComp,m.constraintsSoft,worstExperience,m.experienceRaidConcentration,m.experienceFellowshipConcentration];
 const fine=lockPriority==='quality'?[...quality,m.playerPreferences]:[worstPreferred,m.preferredComp,m.constraintsSoft,m.playerPreferences,worstExperience,m.experienceRaidConcentration,m.experienceFellowshipConcentration];
 return [hard,p.primaryMissing,p.otherMissing,locks,secondaryLockedAssignments(schedule),m.repeats,(m.defaultLocks||0)*DEFAULT_LOCK_COST-(m.experiencedLocks||0)*EXPERIENCED_LOCK_DISCOUNT,-p.primaryExtra,-p.otherExtra,
  ...fine,m.diversity,m.uneven];
}
function validateAllocation(schedule){
 const individual=scheduleFeasible(schedule)&&!hasInexperiencedSoftLock(schedule);
 const deficit=scheduleHardDeficit(schedule);
 return {valid:individual&&deficit<=1e-8,individual,hardDeficit:deficit};
}
// A matching bound: remaining people must be able to cover remaining required
// roles and free seats. This is necessary, not sufficient (targeting is global).
function allocationCanComplete(schedule,allowLocks){
 for(const t of schedule){
  if(!rolesWithinHardCaps(t.members))return false;
  const free=size-t.members.length;if(free<0)return false;if(!free){if(constraints.some(r=>r.enabled&&r.strength==='hard'&&r.scope==='each_raid'&&r.type==='contribution_target'&&!resultForMembers(r,t.members).pass))return false;continue;}
  const pool=queryEligibility({run:t,schedule,allowLocks}).members;
  if(raidLeaderDeficit(t.members)&&!pool.some(isRaidLeader))return false;
  for(const r of allocationIndex?.presence||constraints.filter(r=>r.enabled&&r.strength==='hard'&&r.type==='presence'&&r.scope==='each_raid')){
   const matches=m=>(r.config.className==='Any'||m.c===r.config.className)&&(r.config.spec==='Any'||m.spec===r.config.spec);
   const have=t.members.filter(matches).length,possible=new Set(pool.filter(matches).map(m=>m.id)).size;
   if(have+Math.min(free,possible)<r.config.minimum)return false;
  }
  const byPerson=new Map();for(const c of pool){if(c.role!=='DPS'&&t.members.filter(m=>m.role===c.role).length>=roleHardMax(c.role))continue;let roles=byPerson.get(c.id);if(!roles)byPerson.set(c.id,roles=new Set());roles.add(c.role)}
  if(byPerson.size<free)return false;
  const slots=[];for(const [role,[min]] of Object.entries(template))for(let n=t.members.filter(m=>m.role===role).length;n<min;n++)slots.push(role);
  if(slots.length>free)return false;while(slots.length<free)slots.push(null);
  const owned=new Map();
  function match(slot,seen){for(const [id,roles] of byPerson){if(seen.has(id)||slots[slot]&&!roles.has(slots[slot]))continue;seen.add(id);if(!owned.has(id)||match(owned.get(id),seen)){owned.set(id,slot);return true}}return false}
  for(let i=0;i<slots.length;i++)if(!match(i,new Set()))return false;
 }
 return true;
}
function allocationDraftTier(m,schedule){
 const n=schedule.reduce((count,t)=>count+t.members.filter(p=>p.id===m.id).length,0);
 if(m.repeated)return isPrimary(m)?4:5;
 return n?(isPrimary(m)?2:3):(isPrimary(m)?0:1);
}
// Bounded global CSP. All runs remain open; scarce required roles branch first.
function searchAllocation(initial,{allowLocks=false,deadline,nodeLimit=5000,onSolution}){
 let nodes=0,exhausted=true;
 function visit(schedule){
  if(++nodes>nodeLimit||Date.now()>=deadline){exhausted=false;return}
  if(!allocationCanComplete(schedule,allowLocks))return;
  let chosen=null,pool=null;
  for(let i=0;i<schedule.length;i++){
   const t=schedule[i];if(t.members.length===size)continue;
   const eligible=queryEligibility({run:t,schedule,allowLocks}).members.filter(m=>m.role==='DPS'||t.members.filter(p=>p.role===m.role).length<roleHardMax(m.role));
   const deficits=Object.entries(template).filter(([r,[min]])=>t.members.filter(m=>m.role===r).length<min);
   const roles=deficits.length?deficits.map(([r])=>r):[null];
   for(const role of roles){const candidates=role?eligible.filter(m=>m.role===role):eligible;
    if(pool===null||candidates.length<pool.length){chosen=i;pool=candidates}}
  }
  if(chosen===null){if(validateAllocation(schedule).valid)onSolution(schedule);return}
  pool.sort((a,b)=>allocationDraftTier(a,schedule)-allocationDraftTier(b,schedule)||playerPreferenceCost(a,a.c)-playerPreferenceCost(b,b.c)||String(a.id).localeCompare(String(b.id))||characterKey(a).localeCompare(characterKey(b))||a.spec.localeCompare(b.spec));
  for(const candidate of pool){if(Date.now()>=deadline||nodes>nodeLimit){exhausted=false;break}
   const next=schedule.map((t,i)=>i===chosen?{...t,members:[...t.members,candidate]}:t);visit(next);
  }
 }
 visit(initial);return {nodes,exhausted};
}
// Repair numerical raid targets using eligible replacements, then validate all rules.
function repairAllocationTargets(schedule,deadline,protectedIds=new Set()){
 let current=schedule,score=allocationObjective(current);
 const rules=constraints.filter(r=>r.enabled&&r.strength==='hard'&&r.scope==='each_raid'&&r.type==='contribution_target');
 if(!rules.length)return current;
 for(let pass=0;pass<4&&Date.now()<deadline;pass++){
  let changed=false;
  for(let ti=0;ti<current.length&&Date.now()<deadline;ti++){
   const t=current[ti],before=rules.reduce((n,r)=>n+resultForMembers(r,t.members).deficit,0);if(before<=1e-8)continue;
   let proposals=[];
   for(let i=0;i<t.members.length&&Date.now()<deadline;i++){
    if(protectedIds.has(t.members[i].id))continue;
    let remaining=t.members.filter((_,j)=>j!==i),context=current.map((r,j)=>j===ti?{...r,members:remaining}:r);
    for(let candidate of queryEligibility({run:t,schedule:context,allowLocks:true,role:t.members[i].role}).members){
     let members=[...remaining,candidate],after=rules.reduce((n,r)=>n+resultForMembers(r,members).deficit,0);
     if(after>=before-1e-8)continue;
     const next=current.map((r,j)=>j===ti?{...r,members}:r);
     proposals.push({next,after,missing:uncovered(next).length,locks:lockedPlayerCount(next),secondaryLocks:secondaryLockedAssignments(next)});
    }
   }
   proposals.sort((a,b)=>a.after-b.after||a.missing-b.missing||a.locks-b.locks||a.secondaryLocks-b.secondaryLocks);
   for(let {next} of proposals.slice(0,12)){
    if(Date.now()>=deadline)break;let candidateScore=allocationObjective(next);
    if(scheduleFeasible(next)&&!hasInexperiencedSoftLock(next)&&betterSchedule(candidateScore,score)){current=next;score=candidateScore;changed=true;break}
   }
  }
  if(!changed)break;
 }
 return current;
}
function repairAllocationRoleChain(schedule,deadline){
 const rules=constraints.filter(r=>r.enabled&&r.strength==='hard'&&r.scope==='each_raid'&&r.type==='contribution_target');
 let proposals=[];
 for(let ti=0;ti<schedule.length&&Date.now()<deadline;ti++){
  const t=schedule[ti],before=rules.reduce((n,r)=>n+resultForMembers(r,t.members).deficit,0);if(before<=1e-8)continue;
  for(let i=0;i<t.members.length&&Date.now()<deadline;i++)for(let j=0;j<t.members.length&&Date.now()<deadline;j++){
   if(i===j||t.members[i].role===t.members[j].role)continue;
   const remaining=t.members.filter((_,k)=>k!==i&&k!==j),context=schedule.map((r,k)=>k===ti?{...r,members:remaining}:r);
   for(let provider of queryEligibility({run:t,schedule:context,allowLocks:true,playerId:t.members[j].id,role:t.members[i].role}).members){
    const withProvider=[...remaining,provider];
    if(rules.reduce((n,r)=>n+resultForMembers(r,withProvider).deficit,0)>=before-1e-8)continue;
    const context2=schedule.map((r,k)=>k===ti?{...r,members:withProvider}:r);
    for(let replacement of queryEligibility({run:t,schedule:context2,allowLocks:true,role:t.members[j].role}).members){
     const members=[...withProvider,replacement],after=rules.reduce((n,r)=>n+resultForMembers(r,members).deficit,0);if(after>1e-8)continue;
     const next=schedule.map((r,k)=>k===ti?{...r,members}:r);proposals.push({next,missing:uncovered(next).length,locks:lockedPlayerCount(next),secondaryLocks:secondaryLockedAssignments(next)});
    }
   }
  }
 }
 proposals.sort((a,b)=>a.missing-b.missing||a.locks-b.locks||a.secondaryLocks-b.secondaryLocks);
 for(let {next} of proposals.slice(0,12)){if(Date.now()>=deadline)break;if(validateAllocation(next).valid)return next}
 return schedule;
}
function repairAllocationCoverage(schedule,deadline){
 let current=schedule,score=allocationObjective(current);
 if(!validateAllocation(current).valid)return current;
 for(let missing of uncovered(current)){
  if(Date.now()>=deadline)break;
  let counts=new Map();current.flatMap(t=>t.members).forEach(m=>counts.set(m.id,(counts.get(m.id)||0)+1));
  let proposals=[];
  for(let ti=0;ti<current.length;ti++)for(let i=0;i<current[ti].members.length;i++){
   let t=current[ti],old=t.members[i];if(counts.get(old.id)<2)continue;
   let remaining=t.members.filter((_,j)=>i!==j),context=current.map((r,j)=>j===ti?{...r,members:remaining}:r);
   for(let m of queryEligibility({run:t,schedule:context,allowLocks:true,playerId:missing.id,role:old.role}).members){
    let next=current.map((r,j)=>j===ti?{...r,members:[...remaining,m]}:r);
    let deficit=constraints.filter(r=>r.enabled&&r.strength==='hard'&&r.scope==='each_raid'&&r.type==='contribution_target').reduce((n,r)=>n+resultForMembers(r,next[ti].members).deficit,0);
    proposals.push({next,deficit,locks:lockedPlayerCount(next),secondaryLocks:secondaryLockedAssignments(next)});
   }
  }
  proposals.sort((a,b)=>a.deficit-b.deficit||a.locks-b.locks||a.secondaryLocks-b.secondaryLocks);
  for(let {next} of proposals.slice(0,16)){
   if(Date.now()>=deadline)break;
   next=repairAllocationTargets(next,deadline,new Set([missing.id]));if(!validateAllocation(next).valid)next=repairAllocationRoleChain(next,deadline);let nextScore=allocationObjective(next);
   if(validateAllocation(next).valid&&betterSchedule(nextScore,score)){current=next;score=nextScore;break}
  }
 }
 return current;
}
// Before keeping soft locks, try unlocked same-role replacements that keep experience averages at/above EXPERIENCE_RELAX_FLOOR.
function relaxExperienceUnlock(schedule,deadline=Infinity){
 if(!schedule?.length||lockedPlayerCount(schedule)<=0)return schedule;
 let current=schedule.map(t=>({...t,members:t.members.slice()})),score=allocationObjective(current);
 for(let pass=0;pass<6&&Date.now()<deadline&&lockedPlayerCount(current)>0;pass++){
  let changed=false,seen=new Map();
  for(let ti=0;ti<current.length&&Date.now()<deadline;ti++){
   let t=current[ti];
   for(let i=0;i<t.members.length&&Date.now()<deadline;i++){
    let locked=t.members[i],key=characterKey(locked),prior=seen.get(key)||0;
    seen.set(key,prior+1);
    if(!prior)continue;
    let remaining=t.members.filter((_,j)=>j!==i),context=current.map((r,j)=>j===ti?{...r,members:remaining}:r);
    let proposals=[];
    for(let candidate of queryEligibility({run:t,schedule:context,allowLocks:false,role:locked.role}).members){
     if(Date.now()>=deadline)break;
     let members=[...remaining,candidate],next=current.map((r,j)=>j===ti?{...r,members}:r);
     if(!scheduleFeasible(next)||hasInexperiencedSoftLock(next))continue;
     if(typeof scheduleMeetsExperienceRelaxFloor==='function'&&!scheduleMeetsExperienceRelaxFloor(next))continue;
     if(scheduleHardDeficit(next)>1e-8)continue;
     proposals.push({next,score:allocationObjective(next),locks:lockedPlayerCount(next),secondaryLocks:secondaryLockedAssignments(next),primary:isPrimary(candidate)?1:0});
    }
    proposals.sort((a,b)=>a.locks-b.locks||a.secondaryLocks-b.secondaryLocks||a.primary-b.primary||(betterSchedule(a.score,b.score)?-1:betterSchedule(b.score,a.score)?1:0));
    for(let proposal of proposals.slice(0,12)){
     if(betterSchedule(proposal.score,score)){current=proposal.next;score=proposal.score;changed=true;break}
    }
    if(changed)break;
   }
   if(changed)break;
  }
  if(!changed)break;
  current=refreshScheduleDetails(current.map(t=>({...t,members:t.members.slice()})));
  score=allocationObjective(current);
 }
 return current;
}
function assign(schedule,refine=true){
 ensureRosterCharacters();syncUnifiedRoles();
 const saved={confirmedOnly,noRepeatSearch,freshCharacterCounts,selectionDeadline,constraintContext,allocationIndex};
 const deadline=Math.min(selectionDeadline,Date.now()+(quickScheduleCheck?300:6000));
 let best=null,bestScore=null;
 function consider(candidate){const canonical=candidate.slice().sort((a,b)=>a.time-b.time||a.id-b.id),score=allocationObjective(canonical);if(!best||betterSchedule(score,bestScore)){best=canonical.map(t=>({...t,members:t.members.slice()}));bestScore=score}}
 try{
  confirmedOnly=false;noRepeatSearch=false;freshCharacterCounts=null;
  // Retain a fast closest-comp incumbent, then replace with better global drafts.
  selectionDeadline=Math.min(deadline,Date.now()+(quickScheduleCheck?80:900));
  consider(legacyAssign(schedule,false));
  selectionDeadline=deadline;allocationIndex=compileAllocationModel(schedule);
  consider(repairAllocationTargets(best,Math.min(deadline,Date.now()+(quickScheduleCheck?100:1000))));
  consider(repairAllocationCoverage(best,Math.min(deadline,Date.now()+(quickScheduleCheck?100:900))));
  selectionDeadline=deadline;noRepeatSearch=false;freshCharacterCounts=null;allocationIndex=compileAllocationModel(schedule);
  const empty=schedule.map(t=>({...t,members:[]}));
  if(typeof planningProgress==='function')planningProgress('Drafting Primary first seats, other first seats, and unlocked additional runs…');
  const unlockedEnd=Math.min(deadline,Date.now()+(quickScheduleCheck?80:1800));
  searchAllocation(empty,{allowLocks:false,deadline:unlockedEnd,nodeLimit:quickScheduleCheck?300:5000,onSolution:consider});
  if(lockedPlayerCount(best)>0){
   if(typeof planningProgress==='function')planningProgress('Relaxing experience to 40% averages to avoid soft locks…');
   consider(relaxExperienceUnlock(best,Math.min(deadline,Date.now()+(quickScheduleCheck?80:700))));
  }
  const valid=validateAllocation(best).valid;
  if(!valid||lockedPlayerCount(best)>0){
   searchAllocation(empty,{allowLocks:true,deadline:Math.min(deadline,Date.now()+(quickScheduleCheck?60:900)),nodeLimit:quickScheduleCheck?300:5000,onSolution:consider});
   if(lockedPlayerCount(best)>0)consider(relaxExperienceUnlock(best,Math.min(deadline,Date.now()+(quickScheduleCheck?80:700))));
  }
  consider(repairAllocationCoverage(best,Math.min(deadline,Date.now()+(quickScheduleCheck?100:900))));
  if(lockedPlayerCount(best)>0)consider(relaxExperienceUnlock(best,Math.min(deadline,Date.now()+(quickScheduleCheck?60:500))));
  // Large-neighbourhood repair reopens several coupled assignments at once.
  // Primary/coverage and scarce-role seats can move across the entire evening.
  if(refine&&Date.now()<deadline){
   for(let pass=0;pass<4&&Date.now()<deadline;pass++){
    const removed=new Set(),seed=best.map(t=>({...t,members:t.members.slice()}));
    for(const t of seed){
     const ranked=t.members.map((m,i)=>({m,i})).sort((a,b)=>(isPrimary(a.m)-isPrimary(b.m))||(b.m.repeated-a.m.repeated)||((pass%2)?a.m.role.localeCompare(b.m.role):String(a.m.id).localeCompare(String(b.m.id))));
     for(const {m} of ranked.slice(0,Math.max(1,Math.floor(6/seed.length))))removed.add(m.id);
    }
    for(const t of seed)t.members=t.members.filter(m=>!removed.has(m.id));
    searchAllocation(seed,{allowLocks:lockedPlayerCount(best)>0,deadline:Math.min(deadline,Date.now()+450),nodeLimit:3000,onSolution:consider});
   }
   if(lockedPlayerCount(best)>0)consider(relaxExperienceUnlock(best,Math.min(deadline,Date.now()+(quickScheduleCheck?60:500))));
  }
  best=annotateConstraints(refreshScheduleDetails(best));
  const check=validateAllocation(best);
  for(const t of best){t.valid=t.valid&&check.individual;t.allocationStatus=check.valid?'valid':'partial';t.searchStatus='best-found'}
  return best;
 }finally{confirmedOnly=saved.confirmedOnly;noRepeatSearch=saved.noRepeatSearch;freshCharacterCounts=saved.freshCharacterCounts;selectionDeadline=saved.selectionDeadline;constraintContext=saved.constraintContext;allocationIndex=saved.allocationIndex}
}
