(() => {
'use strict';
const $ = selector => document.querySelector(selector);
const state = {items:[],selected:null};
const show = page => {
 for(const id of ['loginView','dashboard','detail']) $('#'+id).hidden = id !== page;
 $('#logout').hidden=page==='loginView';
};
const notice=(message='')=>{$('#notice').textContent=message;};
const date=(value)=>{const d=new Date(value);return Number.isNaN(+d)?'':d.toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});};
const statusBadge=(value)=>{const span=document.createElement('span');span.className='status'+(value==='approved'?' approved':'');span.textContent=value==='approved'?'Published':value==='pending'?'Pending':value;return span;};
async function api(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 const data=await response.json().catch(()=>({}));
 if(response.status===401){show('loginView');throw Error('Session expired or invalid. Sign in again.');}
 if(!response.ok)throw Error(data.error||'Request failed. Please retry.');
 return data;
}
function render(){
 const term=$('#search').value.trim().toLowerCase(),filter=$('#filter').value;
 $('#total').textContent=state.items.length;
 $('#pending').textContent=state.items.filter(x=>x.status==='pending').length;
 $('#approved').textContent=state.items.filter(x=>x.status==='approved').length;
 const list=$('#requests');list.replaceChildren();
 const matches=state.items.filter(x=>(filter==='all'||x.status===filter)&&
  [x.contact_name,x.email,x.phone,x.slug,x.id].some(v=>String(v||'').toLowerCase().includes(term)));
 $('#empty').hidden=matches.length>0;
 for(const item of matches){
  const b=document.createElement('button');b.type='button';b.className='request';
  const left=document.createElement('span'),name=document.createElement('strong'),meta=document.createElement('small');
  name.textContent=item.contact_name||'Customer';
  meta.textContent=(item.email||'')+' · '+date(item.created_at);
  left.append(name,meta);b.append(left,statusBadge(item.status));
  b.addEventListener('click',()=>showDetail(item.id));list.append(b);
 }
}
async function refresh(){
 notice('');
 const data=await api('/api/admin/requests');
 state.items=Array.isArray(data.requests)?data.requests:[];
 render();show('dashboard');
}
function field(parent,label,value){
 const p=document.createElement('p'),strong=document.createElement('strong');
 strong.textContent=label+': ';p.append(strong,document.createTextNode(value==null||value===''?'—':String(value)));parent.append(p);
}
async function showDetail(id){
 try{
  notice('');const row=await api('/api/admin/requests/'+encodeURIComponent(id));
  state.selected=row;
  const wedding=row.wedding||{};
  $('#couple').textContent=[wedding.partner1,wedding.partner2].filter(Boolean).join(' & ')||'Wedding request';
  $('#requestInfo').textContent='Received '+date(row.created_at)+' · Ref: '+row.id;
  $('#status').replaceWith(statusBadge(row.status));
  const badge=$('.detailhead .status');badge.id='status';
  const contact=$('#contactInfo');contact.replaceChildren();
  field(contact,'Name',row.contact_name);field(contact,'Email',row.email);field(contact,'Phone',row.phone);
  const info=$('#weddingInfo');info.replaceChildren();
  field(info,'Theme',wedding.theme);
  for(const [i,event] of (wedding.events||[]).entries()){
   field(info,'Event '+(i+1),[event.name,event.date,event.time,event.venue].filter(Boolean).join(' · '));
  }
  field(info,'Website slug',row.slug);
  $('#message').textContent=row.message||'No additional message.';
  const approved=row.status==='approved';
  $('#approvalControls').hidden=approved;$('#publishedControls').hidden=!approved;
  if(approved)updateLink(row.slug);
  show('detail');
 }catch(e){notice(e.message);}
}
function updateLink(slug){
 const url=location.origin+'/s/'+encodeURIComponent(slug);
 $('#publishedLink').href=url;
 $('#copyLink').dataset.url=url;
}
async function approve(){
 const row=state.selected;if(!row||row.status!=='pending')return;
 if(!window.confirm('Approve this request and publish the customer wedding website?'))return;
 const button=$('#approveButton');button.disabled=true;notice('Approving website…');
 try{
  const result=await api('/api/admin/requests/'+encodeURIComponent(row.id)+'/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!result.approved)throw Error('Approval was not confirmed.');
  notice('Website published successfully.');
  await showDetail(row.id);
 }catch(e){notice(e.message);}
 finally{button.disabled=false;}
}
$('#loginForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('#loginButton');button.disabled=true;notice('');
 try{
  const token=$('#adminKey').value;
  await api('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
  $('#adminKey').value='';
  await refresh();
 }catch(e){notice(e.message);}
 finally{button.disabled=false;}
});
$('#refresh').addEventListener('click',()=>refresh().catch(e=>notice(e.message)));
$('#search').addEventListener('input',render);
$('#filter').addEventListener('change',render);
$('#back').addEventListener('click',()=>{show('dashboard');render();notice('');});
$('#approveButton').addEventListener('click',approve);
$('#copyLink').addEventListener('click',()=>{navigator.clipboard.writeText($('#copyLink').dataset.url).then(()=>notice('Website link copied.')).catch(()=>notice('Could not copy link.'));});
$('#logout').addEventListener('click',async()=>{
 try{await fetch('/api/admin/session',{method:'DELETE',credentials:'same-origin'});}catch{}
 state.items=[];state.selected=null;show('loginView');notice('Signed out.');
});
api('/api/admin/session').then(()=>refresh()).catch(()=>show('loginView'));
})();