const REVIEW_CONFIG=Object.freeze({
  url:'https://mlxboidajkqyayxjdcvh.supabase.co',
  publishableKey:'sb_publishable_fA2sw0bUz0DipHRI07y1bA_gbLEwz5L'
});

const state={accessToken:null,busy:false};
const $=(selector,root=document)=>root.querySelector(selector);

function setStatus(element,message,type=''){
  element.className='status'+(type?' '+type:'');
  element.textContent=message;
}

async function api(url,{body,auth=true}={}){
  const response=await fetch(url,{
    method:'POST',
    headers:{
      apikey:REVIEW_CONFIG.publishableKey,
      'Content-Type':'application/json',
      ...(auth&&state.accessToken?{Authorization:'Bearer '+state.accessToken}:{})
    },
    body:JSON.stringify(body||{}),
    cache:'no-store',
    credentials:'omit'
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(payload.error||'REQUEST_FAILED');
    error.status=response.status;
    throw error;
  }
  return payload;
}

function humanDate(value){
  if(!value)return 'Not recorded';
  return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
}

function text(value,fallback='Not specified'){
  return typeof value==='string'&&value.trim()?value.trim():fallback;
}

function list(value){
  return Array.isArray(value)&&value.length?value.join(', '):'None selected';
}

function addFact(listElement,label,value){
  const wrapper=document.createElement('div');
  const term=document.createElement('dt');term.textContent=label;
  const detail=document.createElement('dd');detail.textContent=value;
  wrapper.append(term,detail);listElement.append(wrapper);
}

function addRequirement(container,label,value){
  const row=document.createElement('p');
  const title=document.createElement('strong');title.textContent=label+': ';
  row.append(title,document.createTextNode(value));container.append(row);
}

function renderCard(item,index){
  const card=$('#reviewCardTemplate').content.firstElementChild.cloneNode(true);
  const image=$('img',card);image.src=item.result.signed_url;
  $('.concept-number',card).textContent='Queue item '+String(index+1).padStart(2,'0');
  $('.concept-title',card).textContent=text(item.concept.direction,'Selected concept');
  const stateBadge=$('.review-state',card);
  if(item.review){stateBadge.textContent=item.review.status;stateBadge.classList.add(item.review.status)}

  const facts=$('.facts',card);
  addFact(facts,'Project type',text(item.project.project_type));
  addFact(facts,'Design direction',text(item.project.design_direction));
  addFact(facts,'Planning budget',text(item.project.planning_budget));
  addFact(facts,'Timing',text(item.project.timing));
  addFact(facts,'Property status',text(item.project.property_status));
  addFact(facts,'Retention expires',humanDate(item.project.retention_expires_at));

  const requirements=$('.requirements',card);
  addRequirement(requirements,'Preserve',list(item.project.preserve_items));
  addRequirement(requirements,'Change',list(item.project.change_items));
  addRequirement(requirements,'Must have',list(item.project.must_have_items));
  addRequirement(requirements,'Vision',text(item.project.vision_notes));
  addRequirement(requirements,'Accessibility',text(item.project.accessibility_requirements));
  addRequirement(requirements,'Source truth',text(item.project.source_truth));

  const form=$('.review-form',card);
  if(item.review){
    const selected=$(`input[value="${item.review.status}"]`,form);if(selected)selected.checked=true;
    $('textarea',form).value=item.review.notes||'';
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const submit=$('.submit-review',form),status=$('.card-status',form);
    const data=new FormData(form),reviewStatus=String(data.get('status')||'');
    if(!reviewStatus){setStatus(status,'Choose GREEN, YELLOW, or RED.','error');return}
    submit.disabled=true;setStatus(status,'Saving controlled review…');
    try{
      const result=await api(REVIEW_CONFIG.url+'/functions/v1/review-concept',{body:{
        concept_id:item.concept.id,status:reviewStatus,notes:String(data.get('notes')||'')
      }});
      stateBadge.className='review-state '+result.review.status;
      stateBadge.textContent=result.review.status;
      setStatus(status,'Review saved. '+result.meaning+'.','success');
    }catch(error){
      setStatus(status,error.message==='NOT_AUTHORIZED'?'This account is not authorized to review concepts.':'The review could not be saved. No project data was changed.','error');
    }finally{submit.disabled=false}
  });
  return card;
}

async function loadQueue(){
  const status=$('#queueStatus'),queue=$('#queue'),button=$('#refreshButton');
  button.disabled=true;setStatus(status,'Loading the private review queue…');queue.replaceChildren();
  try{
    const result=await api(REVIEW_CONFIG.url+'/functions/v1/review-queue');
    if(!result.queue.length){
      const empty=document.createElement('div');empty.className='empty';
      empty.innerHTML='<h3>No selected concepts are awaiting review.</h3><p>The panel is secure and ready. A concept appears here only after a Studio user selects a completed result.</p>';
      queue.append(empty);setStatus(status,'Private queue loaded: 0 selected concepts.');return;
    }
    result.queue.forEach((item,index)=>queue.append(renderCard(item,index)));
    setStatus(status,'Private queue loaded: '+result.count+' selected concept'+(result.count===1?'':'s')+'.','success');
  }catch(error){
    if(error.message==='NOT_AUTHORIZED')signOut('This account is not authorized for the private reviewer panel.');
    else setStatus(status,'The reviewer queue could not be loaded. No project data was changed.','error');
  }finally{button.disabled=false}
}

async function signOut(message='Signed out. No credentials were retained.'){
  const token=state.accessToken;state.accessToken=null;
  $('#queuePanel').hidden=true;$('#signOutButton').hidden=true;$('#loginPanel').hidden=false;
  $('#password').value='';
  setStatus($('#loginStatus'),message,message.startsWith('This account')?'error':'');
  if(token){fetch(REVIEW_CONFIG.url+'/auth/v1/logout',{method:'POST',headers:{apikey:REVIEW_CONFIG.publishableKey,Authorization:'Bearer '+token},cache:'no-store',credentials:'omit'}).catch(()=>{})}
}

$('#loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('#loginButton'),status=$('#loginStatus');button.disabled=true;
  setStatus(status,'Verifying reviewer authorization…');
  try{
    const session=await api(REVIEW_CONFIG.url+'/auth/v1/token?grant_type=password',{auth:false,body:{
      email:$('#email').value.trim(),password:$('#password').value
    }});
    if(!session.access_token)throw new Error('NOT_AUTHORIZED');
    state.accessToken=session.access_token;$('#password').value='';
    $('#loginPanel').hidden=true;$('#queuePanel').hidden=false;$('#signOutButton').hidden=false;
    await loadQueue();
  }catch(error){
    state.accessToken=null;$('#password').value='';
    setStatus(status,'Sign-in failed or this account is not authorized.','error');
  }finally{button.disabled=false}
});

$('#refreshButton').addEventListener('click',loadQueue);
$('#signOutButton').addEventListener('click',()=>signOut());
