// Browser-only recovery; no cookies, network requests or server persistence.
const recoveryKey='vanguard-session-recovery-v1';
let recoveryPending=null,recoverySavedAt=null,recoveryError='',recoveryTimer=null,recoveryActive=false;
let rosterUndo=[];
function rememberRosterEdit(label){rosterUndo.push({label,players:JSON.parse(JSON.stringify(players))});if(rosterUndo.length>20)rosterUndo.shift()}
function undoRosterEdit(){let edit=rosterUndo.pop();if(!edit)return;if(edit.label==='availability change'){for(let before of edit.players){let current=players.find(p=>p.id===before.id);if(current)current.available=before.available.slice()}}else{edit.players.forEach((before,index)=>{if(!players.some(p=>p.id===before.id))players.splice(Math.min(index,players.length),0,before)})}removedPlayer=null;optimize();toast('Undid '+edit.label)}
function recoveryMarkup(){return `<section class="panel" style="margin-bottom:20px"><h2>Browser recovery</h2><p class="muted">Your plan is automatically saved in this browser on this device. Export a session to move it elsewhere.</p>${recoveryPending?`<p>A previous session was saved ${esc(new Date(recoveryPending.savedAt).toLocaleString())}. Restore or discard it to resume automatic saving.</p><button class="primary" onclick="recoverBrowserSession()">Restore previous session</button> <button onclick="discardBrowserRecovery()">Discard recovery</button>`:`<small id="recoverystatus" role="status">${recoveryStatusText()}</small>`}</section>`}
function recoveryStatusText(){return recoveryError?esc(recoveryError):recoverySavedAt?'Saved locally · '+esc(new Date(recoverySavedAt).toLocaleTimeString()):'Local recovery ready'}
function saveBrowserRecovery(){if(!recoveryActive||recoveryPending)return;try{let savedAt=new Date().toISOString();localStorage.setItem(recoveryKey,JSON.stringify({savedAt,session:compactSessionSnapshot()}));recoverySavedAt=savedAt;recoveryError=''}catch(e){recoveryError='Could not save locally. Export a session to keep your plan.'}let el=document.getElementById('recoverystatus');if(el)el.innerHTML=recoveryStatusText()}
function scheduleBrowserRecovery(){if(!recoveryActive||recoveryPending)return;clearTimeout(recoveryTimer);recoveryTimer=setTimeout(saveBrowserRecovery,350)}
function recoverBrowserSession(){if(!recoveryPending)return;let saved=recoveryPending;try{validateSession(saved.session);restoreSession(saved.session);recoveryPending=null;rosterUndo=[];recoverySavedAt=saved.savedAt;render();toast('Previous browser session recovered')}catch(e){recoveryError='Could not restore this recovery: '+e.message;toast(recoveryError)}}
function discardBrowserRecovery(){try{localStorage.removeItem(recoveryKey);recoveryPending=null;recoverySavedAt=null;render()}catch(e){toast('Could not clear browser recovery')}}
if(typeof window!=='undefined'){
 recoveryActive=true;
 try{let raw=localStorage.getItem(recoveryKey);if(raw){let saved=JSON.parse(raw);validateSession(saved.session);recoveryPending=saved}}catch(e){recoveryError='Previous recovery could not be read. Import a saved session instead.'}
 const originalRender=render;render=function(){originalRender();scheduleBrowserRecovery()};
 window.addEventListener('pagehide',saveBrowserRecovery);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveBrowserRecovery()});
 render();
}
