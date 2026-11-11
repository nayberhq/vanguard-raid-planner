// Immutable GS1 class/spec order; roles are reconstructed, never guessed.
const grimaSignupChoices=[{"c":"Beorning","spec":"Blue","role":"Tank"},{"c":"Beorning","spec":"Yellow","role":"Healer"},{"c":"Beorning","spec":"Red","role":"DPS"},{"c":"Brawler","spec":"Blue","role":"Tank"},{"c":"Brawler","spec":"Red","role":"DPS"},{"c":"Burglar","spec":"Yellow","role":"Debuffer"},{"c":"Burglar","spec":"Red","role":"DPS"},{"c":"Burglar","spec":"Blue","role":"DPS"},{"c":"Captain","spec":"Yellow","role":"Tank"},{"c":"Captain","spec":"Blue","role":"Healer"},{"c":"Captain","spec":"Red","role":"Buffer"},{"c":"Champion","spec":"Blue","role":"Tank"},{"c":"Champion","spec":"Red","role":"DPS"},{"c":"Champion","spec":"Yellow","role":"DPS"},{"c":"Guardian","spec":"Blue","role":"Tank"},{"c":"Guardian","spec":"Red","role":"DPS"},{"c":"Hunter","spec":"Blue","role":"DPS"},{"c":"Hunter","spec":"Red","role":"DPS"},{"c":"Hunter","spec":"Yellow","role":"Debuffer"},{"c":"Lore-master","spec":"Blue","role":"Buffer"},{"c":"Lore-master","spec":"Red","role":"DPS"},{"c":"Lore-master","spec":"Yellow","role":"Debuffer"},{"c":"Mariner","spec":"Blue","role":"Buffer"},{"c":"Mariner","spec":"Yellow","role":"Debuffer"},{"c":"Mariner","spec":"Red","role":"DPS"},{"c":"Minstrel","spec":"Blue","role":"Healer"},{"c":"Minstrel","spec":"Red","role":"DPS"},{"c":"Rune-keeper","spec":"Blue","role":"Healer"},{"c":"Rune-keeper","spec":"Red","role":"DPS"},{"c":"Rune-keeper","spec":"Yellow","role":"DPS"},{"c":"Warden","spec":"Blue","role":"Tank"},{"c":"Warden","spec":"Red","role":"DPS"}];
function decodeCompactGrima(bytes){
 let offset=3;const fail=()=>{throw Error('Invalid compact Grima signup snapshot.')};
 if(bytes[2]!==49)throw Error('Unsupported Grima signup version.');
 const byte=()=>{if(offset>=bytes.length)fail();return bytes[offset++]};
 const uint=()=>{let n=0n;for(let i=0;i<8;i++){const b=byte();n|=BigInt(b&127)<<BigInt(i*7);if(!(b&128)){if(n>BigInt(Number.MAX_SAFE_INTEGER))fail();return Number(n)}}fail()};
 const id=()=>{let n=0n;for(let i=0;i<8;i++)n|=BigInt(byte())<<BigInt(i*8);return n.toString()};
 const string=()=>{const n=uint();if(n>bytes.length-offset)fail();const s=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(offset,offset+n));offset+=n;return s};
 const grimaEventId=id(),size=uint(),seconds=uint(),label=string(),count=uint();
 if(count>2000)fail();const players=[];
 for(let i=0;i<count;i++){
  const playerId=id(),name=string(),mask=BigInt(uint()),flags=byte();
  if(flags>1||mask>>BigInt(grimaSignupChoices.length))fail();
  const choices=grimaSignupChoices.filter((c,j)=>(mask&(1n<<BigInt(j)))!==0n).map(c=>({...c}));
  players.push({id:playerId,name,choices,available:[true],max:1,primary:flags===1});
 }
 if(offset!==bytes.length)fail();
 return {format:'vanguard-raid-planner-session',version:6,grimaEventId,players,runs:[{id:1,time:0,label,source:0}],template:{Tank:[0,0],Healer:[0,0],Debuffer:[0,0],Buffer:[0,0]},settings:{size,duration:seconds/3600,fair:true,suggestSchedule:false,lockPriority:'gearing',recommendationRunLimit:1},teams:[],recommendations:[],hasGenerated:false,dirty:false,message:''};
}
// Grima snapshots are carried in the fragment, not sent to the Pages host.
async function decodeGrimaSnapshot(token){
 if(!/^[A-Za-z0-9_-]+$/.test(token)||token.length>20000)throw Error('Invalid Grima link.');
 let base=token.replace(/-/g,'+').replace(/_/g,'/');base+='='.repeat((4-base.length%4)%4);
 let bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));
 let reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
 let chunks=[],length=0;
 try{while(true){let {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2000000)throw Error('Grima snapshot is too large.');chunks.push(value)}}finally{await reader.cancel()}
 let all=new Uint8Array(length),offset=0;for(let chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
 let data=all[0]===71&&all[1]===83?decodeCompactGrima(all):JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));validateSession(data);return data;
}
const grimaBackupKey='vanguard-before-grima-import';
async function encodeGrimaSnapshot(data){
 validateSession(data);
 const stream=new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('deflate'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 const token=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(token.length>20000)throw Error('This session is too large for a link. Export Session JSON instead.');
 return token;
}
function loadGrimaData(data){
 validateSession(data);
 // Save the previous plan before replacing it; storage failure leaves it untouched.
 const previous=typeof recoveryPending!=='undefined'&&recoveryPending?recoveryPending.session:compactSessionSnapshot();
 localStorage.setItem(grimaBackupKey,JSON.stringify(previous));
 restoreSession(data);
 if(typeof recoveryPending!=='undefined')recoveryPending=null;
 if(typeof saveBrowserRecovery==='function')saveBrowserRecovery();
 toast('Grima signups loaded. Previous plan is available on the Import tab.');
}
function undoGrimaImport(){
 try{const raw=localStorage.getItem(grimaBackupKey);if(!raw)throw Error('No previous plan saved.');const data=JSON.parse(raw);validateSession(data);restoreSession(data);if(typeof recoveryPending!=='undefined')recoveryPending=null;if(typeof saveBrowserRecovery==='function')saveBrowserRecovery();localStorage.removeItem(grimaBackupKey)}catch(e){toast(e.message)}
}
async function receiveGrimaSnapshot(){
 const params=new URLSearchParams(location.hash.slice(1));
 if(!params.has('grima'))return;
 const token=params.get('grima');
 params.delete('grima');
 history.replaceState(null,'',location.pathname+location.search+(params.size?'#'+params:''));
 try{loadGrimaData(await decodeGrimaSnapshot(token))}
 catch(e){toast('Could not load this Grima link: '+e.message+'. Import the JSON file instead.')}
}
async function loadGrimaLink(){
 const status=document.getElementById('grimalinkstatus');
 try{const url=new URL(document.getElementById('grimalink').value);const token=new URLSearchParams(url.hash.slice(1)).get('grima');loadGrimaData(await decodeGrimaSnapshot(token||''))}catch(e){status.textContent='Could not load link: '+e.message}
}
async function createGrimaLink(){
 try{const token=await encodeGrimaSnapshot(compactSessionSnapshot());const url=new URL(location.href);url.hash='grima='+token;const field=document.getElementById('grimalink');field.value=url.href;field.focus();field.select();document.getElementById('grimalinkstatus').textContent='Link ready to copy. It contains the current roster and plan.'}catch(e){document.getElementById('grimalinkstatus').textContent=e.message}
}
function grimaImportMarkup(){return `<section class="panel" style="margin-bottom:20px"><h2>Grima planner link</h2><p class="muted">Open a Grima export link to load signups automatically, or paste one here. Links contain a snapshot of the roster; share only with your raid organizers.</p><label class="field"><span>Planner URL</span><input id="grimalink" type="url" placeholder="https://nayberhq.github.io/vanguard-raid-planner/#grima=…"></label><p class="rosteractions"><button class="primary" onclick="loadGrimaLink()">Load link</button><button onclick="createGrimaLink()">Create link from current plan</button><button onclick="undoGrimaImport()">Restore plan before Grima import</button></p><p id="grimalinkstatus" role="status"></p></section>`}
if(typeof window!=='undefined'){render();receiveGrimaSnapshot();}

// Return only the assignments Grima consumes, not the entire editable session.
function grimaReturnPlan(){
 if(!hasGenerated||dirty)throw Error('Generate an up-to-date plan first.');
 if(!teams.length||teams.length>16)throw Error('Grima supports plans with 1–16 teams.');
 return {format:'vanguard-raid-planner-session',version:6,
  ...(grimaEventId?{grimaEventId}:{}),hasGenerated:true,dirty:false,
  teams:teams.map(t=>({label:t.label,time:t.time,
   members:t.members.map(member=>{
    let row={id:member.id,c:member.c,spec:member.spec,role:member.role};
    if(String(member.id).startsWith('manual-')){
     let label=typeof member.name==='string'?member.name.trim():'';
     if(!label&&typeof players!=='undefined'){
      let person=players.find(p=>p.id===member.id);
      if(person&&typeof person.name==='string')label=person.name.trim();
     }
     if(label)row.name=label.slice(0,80);
    }
    return row;
   }),
   grimaFellowships:(t.fellowships?.length?t.fellowships:assignFellowships(t.members))
    .filter(g=>g.length).map(g=>g.map(p=>p.id))
  }))};
}
async function grimaPlanCode(data=grimaReturnPlan()){
 const stream=new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('deflate'));
 const packed=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const b of packed)binary+=String.fromCharCode(b);
 const code='grimaplan:'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(code.length>4000)throw Error('This plan exceeds Discord’s paste limit. Download the Grima JSON below and attach it with /planner-import.');
 return code;
}
function downloadGrimaPlan(data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='grima-plan.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function openGrimaReturn(){
 let data;
 try{data=grimaReturnPlan()}catch(e){toast(e.message);return}
 document.getElementById('grimareturn')?.remove();
 const dialog=document.createElement('dialog');dialog.id='grimareturn';dialog.setAttribute('aria-labelledby','grimareturntitle');
 dialog.innerHTML='<h2 id="grimareturntitle">Return plan to Grima</h2><p>In the Discord event post, click 📥 Raid Import in the leader row, then paste the code. You need the configured raid leader role.</p><p id="grimareturnstatus" role="status">Preparing your plan code…</p><textarea id="grimareturncode" readonly aria-label="Grima plan code"></textarea><div class="rosteractions"><button id="grimacopy" disabled>Copy code</button><button id="grimadownload">Download Grima JSON</button><button id="grimaclose">Close</button></div><p class="muted">For a JSON file, use /planner-import in the event thread, attach grima-plan.json as session, and enter the revision shown on the current roster card (0 if there is no plan yet). Use /roster-show to check the revision.</p>';
 document.body.append(dialog);dialog.showModal();
 const status=dialog.querySelector('#grimareturnstatus'),area=dialog.querySelector('#grimareturncode'),copy=dialog.querySelector('#grimacopy');
 dialog.querySelector('#grimaclose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('#grimadownload').onclick=()=>downloadGrimaPlan(data);
 copy.onclick=async()=>{
  area.focus();area.select();area.setSelectionRange(0,area.value.length);
  try{await navigator.clipboard.writeText(area.value);status.textContent='Copied. Return to Discord → 📥 Raid Import and paste the code.'}
  catch(e){
   let copied=false;try{copied=document.execCommand('copy')}catch(_){}
   status.textContent=copied?'Copied. Return to Discord → 📥 Raid Import and paste the code.':'Code selected. Press Ctrl+C (Cmd+C on Mac), or use Copy on mobile, then paste into Raid Import.';
  }
 };
 try{area.value=await grimaPlanCode(data);copy.disabled=false;status.textContent='Ready to copy · '+area.value.length+' / 4000 characters.'}
 catch(e){area.hidden=true;status.textContent=e.message+' JSON download remains available.'}
}
if(typeof window!=='undefined'){
 const button=document.createElement('button');button.id='grimareturnbutton';button.textContent='Return plan to Grima';button.style.cssText='position:fixed;bottom:12px;right:12px;z-index:100';
 button.onclick=openGrimaReturn;document.body.append(button);
}
