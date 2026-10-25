(() => {
'use strict';
// The editor stays usable without sign-in. Cloud sync starts only after email verification.
let connected=null, version=0, saveTimer=null, inFlight=false, dirty=false, failed=false, generation=0;
let ui=null, bridge=null;
const $=s=>document.querySelector(s);
const status=(text,bad=false)=>{
 if(!ui)return;
 $('#cloudStatus').textContent=text;
 $('#cloudStatus').classList.toggle('error',bad);
};
async function fetchJSON(url,options={}){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.error||'Cloud service unavailable.'),{status:r.status});
 return data;
}
const escape=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 if(!ui)return;
 if(!connected){
  ui.innerHTML='<div class="cloud-bar-top"><div><strong>Save & continue later</strong><p>Verify your email to keep your wedding draft across devices.</p></div><button type="button" id="cloudLoginToggle">Sign in</button></div><div id="cloudLoginPanel" class="cloud-login" hidden><label>Email address<input type="email" id="cloudEmail" autocomplete="email" placeholder="you@example.com" maxlength="254"></label><button id="cloudSend" type="button">Send verification code</button><div id="cloudCodeBox" hidden><label>6-digit email code<input id="cloudCode" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"></label><button id="cloudVerify" type="button">Verify & continue</button></div></div><p id="cloudStatus" role="status" aria-live="polite"></p>';
  $('#cloudLoginToggle').addEventListener('click',()=>{$('#cloudLoginPanel').hidden=!$('#cloudLoginPanel').hidden;});
  $('#cloudSend').addEventListener('click',sendCode);
  $('#cloudVerify').addEventListener('click',verifyCode);
 }else{
  ui.innerHTML='<div class="cloud-bar-top"><div><strong>Cloud draft connected</strong><p>'+escape(connected)+' · Resume on any device</p></div><button type="button" id="cloudSignOut">Sign out</button></div><p id="cloudStatus" role="status" aria-live="polite"></p><button type="button" id="cloudSaveNow" class="cloud-save-button">Save now</button>';
  $('#cloudSignOut').addEventListener('click',signOut);
  $('#cloudSaveNow').addEventListener('click',()=>{dirty=true;flush();});
 }
}
async function sendCode(){
 const email=$('#cloudEmail').value.trim();const button=$('#cloudSend');
 button.disabled=true;status('Sending verification code…');
 try{
  await fetchJSON('/api/customer/send-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  $('#cloudCodeBox').hidden=false;status('A code was sent. Check your inbox.');
 }catch(e){status(e.message,true);}
 finally{button.disabled=false;}
}
async function verifyCode(){
 const email=$('#cloudEmail').value.trim(),code=$('#cloudCode').value.trim();
 const button=$('#cloudVerify');button.disabled=true;status('Verifying…');
 try{
  const data=await fetchJSON('/api/customer/verify-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code})});
  connected=data.email;version=0;generation++;render();await recoverDraft();
 }catch(e){status(e.message,true);}
 finally{button.disabled=false;}
}
async function recoverDraft(){
 try{
  const result=await fetchJSON('/api/customer/draft');
  if(!result.exists){
   version=0;dirty=true;status('Email verified. Saving your current draft…');schedule();
   return;
  }
  version=result.version;
  // Choose the existing cloud copy for this verified identity.
  bridge.restore(result.draft,result.step);
  status('Your saved wedding website is restored. Last saved '+new Date(result.updatedAt).toLocaleString()+'.');
 }catch(e){status('Signed in, but cloud draft could not be loaded: '+e.message,true);}
}
function schedule(){
 if(!connected||!bridge)return;
 dirty=true;clearTimeout(saveTimer);
 saveTimer=setTimeout(flush,1100);
 status('Unsaved changes…');
}
async function flush(){
 if(!connected||!bridge||!dirty||inFlight)return;
 clearTimeout(saveTimer);
 const payload=bridge.snapshot();
 // Local-only uploads remain in browser storage; don't overwrite cloud draft with unsupported content.
 if(payload.draft.background?.image?.startsWith('data:')){
  status('Background image is only saved on this device until cloud uploads are enabled.',true);return;
 }
 const own=generation;
 dirty=false;inFlight=true;status('Saving to cloud…');
 try{
  const result=await fetchJSON('/api/customer/draft',{
   method:'PUT',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({...payload,version})
  });
  if(own!==generation)return;
  version=result.version;failed=false;
  status(dirty?'New changes pending…':'All changes saved to cloud ✓');
 }catch(e){
  dirty=true;failed=true;
  status(e.status===409?'Another device changed this draft. Sign out and sign back in to reload before editing.':
    'Cloud sync unavailable. Your changes are still saved locally. '+e.message,true);
 }finally{
  inFlight=false;
  if(dirty&&!failed&&own===generation)schedule();
 }
}
async function signOut(){
 clearTimeout(saveTimer);
 if(inFlight){status('Complete the current save before signing out.',true);return;}
 if(dirty&&!failed)await flush();
 if(inFlight)return;
 try{await fetchJSON('/api/customer/session',{method:'DELETE'});}catch{}
 connected=null;version=0;generation++;dirty=false;failed=false;render();
 status('Signed out. Browser-local draft is still available.');
}
async function init(options){
 bridge=options;
 ui=$('#cloudDraftBar');
 if(!ui)return;
 render();
 try{
  const session=await fetchJSON('/api/customer/session');
  if(!session.authenticated)return;
  connected=session.email;version=0;generation++;render();await recoverDraft();
 }catch(e){status('Cloud sign-in is unavailable. You can continue editing locally.',true);}
}
window.VowCloudDrafts={init,changed:schedule,save:flush};
})();