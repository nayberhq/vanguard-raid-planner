// Manual changes edit the committed plan; regeneration deliberately rebuilds it.
let assignmentEditor=null;
function replacementOptions(runId,memberId=null){
 const raid=teams.find(t=>t.id===runId);
 if(!raid||memberId&&!raid.members.some(m=>m.id===memberId)||!memberId&&raid.members.length>=size)return [];
 const occupied=new Set(teams.filter(t=>t.id===raid.id||Math.abs(t.time-raid.time)<1e-8).flatMap(t=>t.members.map(m=>m.id)));
 const context=teams.map(t=>t.id===raid.id?{...t,members:t.members.filter(m=>m.id!==memberId)}:t);
 const result=[];
 for(const p of players){
  if(occupied.has(p.id)&&p.id!==memberId)continue;
  const selected=choicesFor(p,raid);
  for(const c of p.choices){
   let reason='';
   const candidate={...p,...c};
   if(!availableForRun(p,raid))reason='Unavailable for this run';
   else if(context.some(t=>Math.abs(t.time-raid.time)+1e-8<duration&&t.members.some(m=>m.id===p.id)))reason='In an overlapping run';
   else if(context.some(t=>t.members.some(m=>characterKey(m)===characterKey(candidate))))reason='Character locked to another run';
   else if(c.flexible||!selected.some(x=>x.charId===c.charId&&x.spec===c.spec&&x.role===c.role))reason='Spec not selected for this run';
   result.push({member:candidate,reason});
  }
 }
 return result.sort((a,b)=>(b.member.id===memberId)-(a.member.id===memberId)||a.member.name.localeCompare(b.member.name)||roleOrder.indexOf(a.member.role)-roleOrder.indexOf(b.member.role));
}
function openAssignmentEditor(runId,memberId=null){
 const raid=teams.find(t=>t.id===runId);if(!raid)return;
 assignmentEditor={runId,memberId,options:replacementOptions(runId,memberId)};
 let dialog=document.getElementById('assignmenteditor');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='assignmenteditor';dialog.setAttribute('aria-labelledby','assignmenteditortitle');dialog.addEventListener('close',()=>{assignmentEditor=null});document.body.append(dialog)}
 const current=raid.members.find(m=>m.id===memberId);
 dialog.innerHTML=`<div class="toolbar"><h2 id="assignmenteditortitle">${current?'Edit '+esc(current.name):'Fill empty spot'}</h2><button type="button" aria-label="Close assignment editor" onclick="document.getElementById('assignmenteditor').close()">×</button></div><p>${esc(raid.label)} · Choose a player and class/spec. Change the current player’s class/spec or choose a replacement. Other players already in this run are hidden. Locked choices are disabled.</p><label class="field"><span>Find a player, class or role</span><input id="assignmentsearch" type="search" oninput="filterAssignmentOptions(this.value)"></label><div id="assignmentoptions"></div><p class="muted">Changes are saved in this plan. Regenerating builds a new assignment.</p>`;
 filterAssignmentOptions('');dialog.showModal();document.getElementById('assignmentsearch').focus();
}
function filterAssignmentOptions(query){
 if(!assignmentEditor)return;
 const q=query.trim().toLowerCase();
 const html=assignmentEditor.options.map(({member:m,reason},i)=>{
  if(![m.name,m.c,m.spec,m.role].join(' ').toLowerCase().includes(q))return '';
  return `<button type="button" class="assignmentoption" ${reason?'disabled':''} onclick="chooseAssignment(${i})" title="${esc(reason||'Assign '+m.name)}">${icon(m)}<span><strong>${esc(m.name)}</strong><small>${esc(m.spec+' '+m.c+' · '+m.role)}</small>${reason?`<small>${esc(reason)}</small>`:''}</span></button>`;
 }).join('');
 document.getElementById('assignmentoptions').innerHTML=html||'<p>No matching players. Add signups in Roster to expand the list.</p>';
}
function chooseAssignment(index){
 if(!assignmentEditor)return false;
 const {runId,memberId,options}=assignmentEditor,chosen=options[index];if(!chosen)return false;
 // Recheck current state rather than trusting the dialog snapshot.
 const match=replacementOptions(runId,memberId).find(o=>o.member.id===chosen.member.id&&characterKey(o.member)===characterKey(chosen.member)&&o.member.spec===chosen.member.spec&&o.member.role===chosen.member.role);
 if(!match||match.reason){toast(match?.reason||'This assignment is no longer available.');return false}
 rememberRosterEdit('assignment replacement',true);
 const raid=teams.find(t=>t.id===runId);
 if(memberId)raid.members=raid.members.map(m=>m.id===memberId?match.member:m);
 else raid.members.push(match.member);
 document.getElementById('assignmenteditor')?.close();assignmentEditor=null;
 finishManualRosterEdit();toast(match.member.name+' assigned.');return true;
}
function removeTeamMember(runId,memberId){
 const raid=teams.find(t=>t.id===runId),member=raid?.members.find(m=>m.id===memberId);
 if(!member)return false;
 rememberRosterEdit('team removal',true);
 raid.members=raid.members.filter(m=>m.id!==memberId);
 finishManualRosterEdit();
 toast(member.name+' removed from '+raid.label+'. Still in the signup roster.');
 return true;
}
function finishManualRosterEdit(){
 if(typeof planningWorker!=='undefined'&&planningWorker){planningJob++;stopPlanning()}
 allocationIndex=null;fellowshipSearchCache.clear();
 recommendedConfiguration=null;recommendedConfigurationStatus=null;recommendations=[];parallelStatus={};
 refreshScheduleDetails(teams);annotateConstraints(teams);
 // Remove cached suggestions that reference assignments before this edit.
 for(const t of teams){t.alternatives={};t.valid=t.valid&&rolesWithinHardCaps(t.members)}
 noteAction('Plan edited manually · regenerate to rebuild assignments');
 render();
}
