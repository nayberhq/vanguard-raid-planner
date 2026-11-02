// Grima snapshots are carried in the fragment, not sent to the Pages host.
async function decodeGrimaSnapshot(token){
 if(!/^[A-Za-z0-9_-]+$/.test(token)||token.length>20000)throw Error('Invalid Grima link.');
 let base=token.replace(/-/g,'+').replace(/_/g,'/');base+='='.repeat((4-base.length%4)%4);
 let bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));
 let reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
 let chunks=[],length=0;
 try{while(true){let {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2000000)throw Error('Grima snapshot is too large.');chunks.push(value)}}finally{await reader.cancel()}
 let all=new Uint8Array(length),offset=0;for(let chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
 let data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));validateSession(data);return data;
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

async function grimaPlanCode(){
 const data=compactSessionSnapshot();
 if(!data.hasGenerated||data.dirty)throw Error('Generate an up-to-date plan first.');
 const stream=new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('deflate'));
 const packed=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const b of packed)binary+=String.fromCharCode(b);
 const code='grimaplan:'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(code.length>4000)throw Error('This plan is too large for a paste code. Export Session JSON and use /planner-import.');
 return code;
}
if(typeof window!=='undefined'){
 const button=document.createElement('button');button.textContent='Return plan to Grima';button.style.cssText='position:fixed;bottom:12px;right:12px;z-index:100';
 button.onclick=async()=>{
  try{
   const code=await grimaPlanCode();
   const dialog=document.createElement('dialog'),text=document.createElement('p'),area=document.createElement('textarea'),copy=document.createElement('button'),close=document.createElement('button');
   text.textContent='Copy this code, return to Discord, click Vanguard → Import plan code, and paste it.';
   area.value=code;area.readOnly=true;area.style.cssText='width:90%;height:120px';copy.textContent='Copy code';close.textContent='Close';
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(code);text.textContent='Copied. Paste into Grima’s Import plan code dialog.'}catch(e){area.focus();area.select();text.textContent='Use your device’s Copy action on the selected code.'}};
   close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.append(text,area,copy,close);document.body.append(dialog);dialog.showModal();
  }catch(e){toast(e.message)}
 };
 document.body.append(button);
}
