
const founderDemo=new URLSearchParams(location.search).get('founder_demo')==='1';
const STUDIO_CONFIG=Object.freeze({
  url:'https://mlxboidajkqyayxjdcvh.supabase.co',
  publishableKey:'sb_publishable_fA2sw0bUz0DipHRI07y1bA_gbLEwz5L',
  maxUploadBytes:6*1024*1024,
  maxConcepts:3,
  founderReview:true,
  publicLaunchMode:!founderDemo
});

const state={
  photo:null,style:'Clean Modern',preserve:new Set(),change:new Set(['Tile','Vanity']),must:new Set(),
  selectedConcept:null,accessToken:null,userId:null,projectId:null,sourceAssetId:null,concepts:[],busy:false
};
const $=(s)=>document.querySelector(s);const $$=(s)=>[...document.querySelectorAll(s)];

function setPressed(btn,pressed){btn.setAttribute('aria-pressed',pressed?'true':'false')}
function chipGroup(selector,set){$$(selector).forEach(btn=>{setPressed(btn,btn.classList.contains('active'));btn.addEventListener('click',()=>{const v=btn.dataset.value;if(set.has(v)){set.delete(v);btn.classList.remove('active');setPressed(btn,false)}else{set.add(v);btn.classList.add('active');setPressed(btn,true)}updatePacket()})})}
chipGroup('[data-group="preserve"]',state.preserve);chipGroup('[data-group="change"]',state.change);chipGroup('[data-group="must"]',state.must);
$$('[data-style]').forEach(btn=>{setPressed(btn,btn.classList.contains('active'));btn.addEventListener('click',()=>{$$('[data-style]').forEach(x=>{x.classList.remove('active');setPressed(x,false)});btn.classList.add('active');setPressed(btn,true);state.style=btn.dataset.style;updatePacket()})});

const input=$('#spacePhoto'),drop=$('#dropzone'),preview=$('#photoPreview'),photoLabel=$('#photoLabel');
const generateBtn=$('#generateBtn'),checkoutBtn=$('#checkoutBtn'),deleteBtn=$('#deleteStudioBtn'),statusBox=$('#generationStatus');
const conceptCards=$$('.concept'),reviewPanel=$('#reviewPanel');
if(STUDIO_CONFIG.publicLaunchMode){
  $$('#studio input,#studio select,#studio textarea,#studio button').forEach(control=>{control.disabled=true});
  checkoutBtn.hidden=true;checkoutBtn.style.display='none';
  drop.removeAttribute('tabindex');drop.removeAttribute('role');drop.setAttribute('aria-disabled','true');
}
if(founderDemo){
  document.querySelector('.studio-shell')?.classList.remove('public-preview');
  document.querySelector('#studio fieldset.controls')?.removeAttribute('disabled');
  const notice=$('#studioLaunchNotice');
  if(notice)notice.innerHTML='<strong>Founder Demo — Stripe Test Mode</strong>This controlled path accepts only the supplied synthetic test image. The $19 checkout is a test transaction, no live charge occurs, and the server permits exactly one OpenAI demo generation.';
  const head=document.querySelector('.studio-head span');if(head)head.textContent='Founder demo • Stripe test mode • one generation';
  checkoutBtn.hidden=false;checkoutBtn.style.display='block';checkoutBtn.disabled=false;
  generateBtn.textContent='Complete Stripe Test Checkout First';generateBtn.disabled=true;
}
conceptCards.forEach(card=>{card.hidden=true;const button=card.querySelector('.concept-select');button.disabled=true;setPressed(button,false)});
if(!STUDIO_CONFIG.publicLaunchMode){
  drop.tabIndex=0;drop.setAttribute('role','button');drop.setAttribute('aria-label','Choose or drop a bathroom or project photo');
  drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
}

function setStatus(message,type=''){statusBox.className='notice'+(type?' '+type:'');statusBox.textContent=message}
function normalizedMessage(code){
  const messages={
    GENERATION_DISABLED:'AI generation is safely locked. The founder must open the controlled OpenAI gate before a founder-review generation.',
    RATE_LIMITED:'The generation limit has been reached. Wait before trying again.',
    BUDGET_LIMIT_REACHED:'The controlled monthly AI budget has been reached.',
    PAYMENT_REQUIRED:'A verified Stripe test payment is required before this demo generation.',
    PAYMENT_DISABLED:'Stripe test checkout is not available. No payment was attempted.',
    PAYMENT_FAILED:'Stripe test checkout could not be created. No payment was attempted.',
    MODERATION_BLOCKED:'This image or request could not be processed under the safety rules.',
    GENERATION_TIMEOUT:'Generation took too long. No automatic retry will be started from this page.',
    GENERATION_FAILED:'The concept could not be generated. Try again only after checking the founder-review gate and service status.',
    INVALID_REQUEST:'The Studio request is incomplete or invalid.',
    INVALID_UPLOAD:'Use a valid JPG, PNG or WEBP image no larger than 6 MiB.',
    UPLOAD_NOT_READY:'The private upload did not finish validation.',
    NOT_AUTHORIZED:'The temporary Studio session is no longer authorized. Refresh and begin again.',
    NOT_FOUND:'The Studio project or concept could not be found.'
  };return messages[code]||'The Studio could not complete that step. No additional generation was started.'
}
function setBusy(value,label){state.busy=value;generateBtn.disabled=value;deleteBtn.disabled=value;if(label)generateBtn.textContent=label}
function revokePhoto(){if(state.photo?.url)URL.revokeObjectURL(state.photo.url)}
function loadFile(file){
  if(!file)return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){setStatus(normalizedMessage('INVALID_UPLOAD'),'error');return}
  if(file.size>STUDIO_CONFIG.maxUploadBytes){setStatus(normalizedMessage('INVALID_UPLOAD'),'error');return}
  revokePhoto();const url=URL.createObjectURL(file);state.photo={file,name:file.name,size:file.size,url};
  preview.src=url;preview.style.display='block';photoLabel.textContent=file.name;updatePacket();
  setStatus('Test image ready. Confirm the founder-review checkbox, choose the project type and generate the first controlled concept.')
}
input.addEventListener('change',e=>loadFile(e.target.files[0]));['dragenter','dragover'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove('drag')}));drop.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));

async function request(url,{method='POST',body,auth=true,headers={}}={}){
  const response=await fetch(url,{method,headers:{apikey:STUDIO_CONFIG.publishableKey,...(auth&&state.accessToken?{Authorization:'Bearer '+state.accessToken}:{}),...(body&&!(body instanceof Blob)&&!(body instanceof File)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof Blob||body instanceof File?body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(response.status===401?'NOT_AUTHORIZED':payload.error||payload.error_code||payload.code||'GENERATION_FAILED');error.status=response.status;throw error}
  return payload
}
function usableAccessToken(token){
  try{
    const part=token.split('.')[1];if(!part)return false;
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
    const payload=JSON.parse(atob(normalized));return Number(payload.exp||0)*1000>Date.now()+30000
  }catch{return false}
}
function resetDemoSession(){
  state.accessToken=null;state.userId=null;state.projectId=null;state.sourceAssetId=null;state.concepts=[];state.selectedConcept=null;
  if(founderDemo)sessionStorage.removeItem('shellStudioDemo');
  deleteBtn.hidden=true;updatePacket()
}
async function ensureSession(){
  if(state.accessToken&&usableAccessToken(state.accessToken))return;
  if(state.accessToken)resetDemoSession();
  if(founderDemo){
    try{const saved=JSON.parse(sessionStorage.getItem('shellStudioDemo')||'{}');if(saved.accessToken&&saved.userId&&usableAccessToken(saved.accessToken)){state.accessToken=saved.accessToken;state.userId=saved.userId;state.projectId=saved.projectId||null;state.sourceAssetId=saved.sourceAssetId||null;return}}catch{}
    sessionStorage.removeItem('shellStudioDemo')
  }
  const payload=await request(STUDIO_CONFIG.url+'/auth/v1/signup',{body:{data:{purpose:'shell-remodel-studio-founder-review'}},auth:false});
  if(!payload.access_token||!payload.user?.id)throw new Error('NOT_AUTHORIZED');
  state.accessToken=payload.access_token;state.userId=payload.user.id;saveDemoState()
}
function saveDemoState(){if(founderDemo)sessionStorage.setItem('shellStudioDemo',JSON.stringify({accessToken:state.accessToken,userId:state.userId,projectId:state.projectId,sourceAssetId:state.sourceAssetId}))}
async function invoke(slug,body){return request(STUDIO_CONFIG.url+'/functions/v1/'+slug,{body})}
async function prepareProject(){
  if(state.projectId)return;
  await ensureSession();
  const created=await invoke('create-project',{
    project_type:$('#roomType').value,planning_budget:readValue('#budget','Not sure yet'),
    timing:'Founder review',property_status:'Founder-review test',
    source_truth:'The supplied image is controlling source-space truth.',
    preserve_items:[...state.preserve],change_items:[...state.change],must_have_items:[...state.must],
    design_direction:state.style,vision_notes:$('#vision').value,
    accessibility_requirements:state.must.has('Accessibility')?'Accessibility is a stated goal.':''
  });
  state.projectId=created.project.id;
  deleteBtn.hidden=false;
  const upload=await invoke('create-upload',{project_id:state.projectId,mime_type:state.photo.file.type,size_bytes:state.photo.file.size});
  state.sourceAssetId=upload.asset_id;
  const uploadUrl=upload.signed_url.startsWith('http')?upload.signed_url:STUDIO_CONFIG.url+upload.signed_url;
  await request(uploadUrl,{method:'PUT',body:state.photo.file,headers:{'Content-Type':state.photo.file.type}});
  await invoke('finalize-upload',{asset_id:state.sourceAssetId});
  saveDemoState();
}
async function beginTestCheckout(){
  if(!founderDemo||state.busy)return;
  if(!state.photo&&!state.sourceAssetId){setStatus('Choose the supplied synthetic test image before starting checkout.','error');return}
  if(!$('#roomType').value){setStatus('Choose the project type before starting checkout.','error');return}
  if(!$('#syntheticConsent').checked){setStatus('Confirm the synthetic-image restriction before checkout.','error');return}
  try{
    setBusy(true,'Preparing private test project…');checkoutBtn.disabled=true;
    let result=null;
    for(let attempt=0;attempt<2;attempt++){
      try{
        await prepareProject();
        result=await invoke('create-checkout-session',{project_id:state.projectId,client_request_id:crypto.randomUUID()});
        break
      }catch(error){
        if(attempt===0&&(error.message==='NOT_AUTHORIZED'||error.status===401)){resetDemoSession();continue}
        throw error
      }
    }
    if(!result.checkout_url)throw new Error('PAYMENT_FAILED');
    saveDemoState();location.assign(result.checkout_url)
  }catch(error){setStatus(normalizedMessage(error.message),'error');checkoutBtn.disabled=false;generateBtn.textContent='Complete Stripe Test Checkout First'}
  finally{state.busy=false;deleteBtn.disabled=false}
}
checkoutBtn.addEventListener('click',beginTestCheckout);
async function restorePaidDemo(){
  if(!founderDemo)return;
  await ensureSession();
  if(!state.projectId||!state.sourceAssetId)return;
  const payment=new URLSearchParams(location.search).get('studio_payment');
  if(payment==='canceled'){setStatus('Stripe test checkout was canceled. No charge occurred.','error');generateBtn.disabled=true;return}
  if(payment!=='success')return;
  setStatus('Stripe test checkout returned successfully. Verifying the signed webhook entitlement…');
  for(let attempt=0;attempt<8;attempt++){
    const access=await invoke('studio-access',{project_id:state.projectId}).catch(()=>null);
    if(access?.entitled){checkoutBtn.hidden=true;checkoutBtn.style.display='none';generateBtn.disabled=false;generateBtn.textContent='Generate One Controlled Demo Concept';setStatus('Test payment verified by signed webhook. One controlled demo generation is available.','success');return}
    await new Promise(resolve=>setTimeout(resolve,1250))
  }
  setStatus('The test payment returned, but webhook verification is still pending. Refresh this page in a moment; generation remains locked.','error')
}
function directionFor(ordinal){
  const custom=$('#vision').value.trim();
  const options=[
    state.style,
    'Warm Transitional with balanced modern and classic materials',
    'Spa / Natural with soft neutral finishes and calm lighting',
    custom?'Custom homeowner direction: '+custom:'Alternative practical layout-preserving finish direction'
  ];return options[ordinal-1]
}
async function renderConcept(conceptId,ordinal){
  const result=await invoke('get-concept',{concept_id:conceptId});
  const imageResponse=await fetch(result.result.signed_url,{cache:'no-store'});
  if(!imageResponse.ok)throw new Error('GENERATION_FAILED');
  const blob=await imageResponse.blob(),objectUrl=URL.createObjectURL(blob);
  const card=conceptCards[ordinal-1],art=card.querySelector('.concept-art'),button=card.querySelector('.concept-select');
  const image=document.createElement('img');image.src=objectUrl;image.alt='AI remodel concept '+ordinal+' — conceptual visualization only';
  art.replaceChildren(image);art.classList.add('has-image');card.hidden=false;card.dataset.conceptId=conceptId;card.dataset.objectUrl=objectUrl;
  card.dataset.name='Concept '+String.fromCharCode(64+ordinal)+' — '+directionFor(ordinal);
  card.querySelector('.concept-copy strong').textContent=directionFor(ordinal);
  card.querySelector('.concept-copy p').textContent='Concept visualization only. Measurements, trades, code, materials, pricing and feasibility require human field review.';
  button.disabled=false;$('#concepts').hidden=false
}
async function generateNext(){
  if(STUDIO_CONFIG.publicLaunchMode){setStatus('Remodel Studio Early Access is coming soon. Public photo upload and AI generation remain closed.');return}
  if(state.busy)return;
  if(!state.photo&&!state.sourceAssetId){setStatus('Upload a synthetic or expressly authorized test image first.','error');return}
  if(!$('#roomType').value){setStatus('Choose the project type before generating.','error');return}
  if(!$('#syntheticConsent').checked){setStatus('Confirm the founder-review image restriction before transmitting any image.','error');return}
  if(state.concepts.length>=STUDIO_CONFIG.maxConcepts){setStatus('Three controlled concepts have already been generated for this project.','success');return}
  try{
    setBusy(true,state.projectId?'Generating next concept…':'Creating private Studio project…');
    await prepareProject();
    const ordinal=state.concepts.length+1;setBusy(true,'Generating concept '+ordinal+'…');
    const generated=await invoke('generate-concept',{project_id:state.projectId,source_asset_id:state.sourceAssetId,ordinal,concept_direction:directionFor(ordinal)});
    state.concepts.push({id:generated.concept_id,ordinal});
    await renderConcept(generated.concept_id,ordinal);
    setStatus('Concept '+ordinal+' generated and retrieved through a short-lived signed URL. Select it or generate another controlled direction.','success');
    generateBtn.textContent=founderDemo?'Demo Generation Complete — Gate Closed':ordinal<STUDIO_CONFIG.maxConcepts?'Generate Another AI Concept':'Concept Limit Reached';
    generateBtn.disabled=founderDemo||ordinal>=STUDIO_CONFIG.maxConcepts;checkoutBtn.hidden=true;checkoutBtn.style.display='none';updatePacket();$('#concepts').scrollIntoView({behavior:'smooth',block:'nearest'})
  }catch(error){setStatus(normalizedMessage(error.message),'error');generateBtn.textContent=state.concepts.length?'Generate Another AI Concept':'Generate First AI Concept'}
  finally{state.busy=false;deleteBtn.disabled=false;if(!founderDemo&&state.concepts.length<STUDIO_CONFIG.maxConcepts)generateBtn.disabled=false}
}
generateBtn.addEventListener('click',generateNext);

const preferredConceptInput=document.querySelector('input[disabled][value="Choose above if desired"]');
conceptCards.forEach(card=>card.querySelector('.concept-select').addEventListener('click',async e=>{
  const button=e.currentTarget,conceptId=card.dataset.conceptId;if(!conceptId||state.busy)return;
  try{
    setBusy(true);await invoke('select-concept',{project_id:state.projectId,concept_id:conceptId});
    conceptCards.forEach(x=>x.classList.remove('selected'));card.classList.add('selected');
    state.selectedConcept=card.dataset.name;conceptCards.forEach(x=>{const b=x.querySelector('.concept-select');b.textContent='Select';setPressed(b,false)});
    button.textContent='Selected';setPressed(button,true);if(preferredConceptInput)preferredConceptInput.value=state.selectedConcept;
    reviewPanel.hidden=false;setStatus('Concept selected. It is now pending contractor buildability review and field verification.','success');updatePacket()
  }catch(error){setStatus(normalizedMessage(error.message),'error')}
  finally{state.busy=false;generateBtn.disabled=state.concepts.length>=STUDIO_CONFIG.maxConcepts;deleteBtn.disabled=false}
}));

async function deleteStudioProject(){
  if(!state.projectId||state.busy)return;
  try{
    setBusy(true,'Deleting private Studio project…');await invoke('delete-project',{project_id:state.projectId});
    conceptCards.forEach(card=>{if(card.dataset.objectUrl)URL.revokeObjectURL(card.dataset.objectUrl);card.hidden=true;card.classList.remove('selected');card.removeAttribute('data-concept-id');card.removeAttribute('data-object-url');const b=card.querySelector('.concept-select');b.disabled=true;b.textContent='Select';setPressed(b,false);const art=card.querySelector('.concept-art');art.classList.remove('has-image');art.replaceChildren(Object.assign(document.createElement('span'),{textContent:'Concept — waiting'}))});
    state.projectId=null;state.sourceAssetId=null;state.concepts=[];state.selectedConcept=null;
    $('#concepts').hidden=true;reviewPanel.hidden=true;deleteBtn.hidden=true;generateBtn.textContent='Generate First AI Concept';setStatus('Private project, source image and generated concepts were deleted.','success');updatePacket()
  }catch(error){setStatus(normalizedMessage(error.message),'error')}
  finally{state.busy=false;generateBtn.disabled=false;deleteBtn.disabled=false}
}
deleteBtn.addEventListener('click',deleteStudioProject);

function list(set){return [...set].length?[...set].join(', '):'None selected'}
function readValue(selector,fallback='Not selected'){const el=$(selector);return el&&el.value?el.value:fallback}
function updatePacket(){const el=$('#packetText');if(!el)return;el.replaceChildren();const rows=[['Source',state.photo?state.photo.name:'No test image yet'],['Project type',readValue('#roomType')],['Direction',state.style],['Preserve',list(state.preserve)],['Change',list(state.change)],['Must-have',list(state.must)],['Planning budget',readValue('#budget','Not sure yet')],['Generated concepts',String(state.concepts.length)]];if(state.selectedConcept)rows.push(['Preferred concept',state.selectedConcept]);rows.forEach(([label,value],i)=>{const strong=document.createElement('strong');strong.textContent=label+': ';el.appendChild(strong);el.appendChild(document.createTextNode(value));if(i<rows.length-1)el.appendChild(document.createElement('br'))})}
['#roomType','#budget'].forEach(selector=>{const el=$(selector);if(el)el.addEventListener('change',updatePacket)});updatePacket();
restorePaidDemo().catch(()=>setStatus('The founder demo session could not be restored. No generation was attempted.','error'));

const inquiryForm=$('#estimateForm'),inquiryResult=$('#formResult'),inquirySubmit=$('#estimateSubmit'),startedAt=$('#formStartedAt');
if(startedAt)startedAt.value=String(Date.now());
inquiryForm.addEventListener('submit',async e=>{
  e.preventDefault();if(!inquiryForm.reportValidity()||inquirySubmit.disabled)return;
  const fd=new FormData(inquiryForm),payload={
    name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email'),zip:fd.get('zip'),
    project_type:fd.get('projectType'),planning_budget:fd.get('budget'),timing:fd.get('timing'),
    property_status:fd.get('propertyStatus'),message:fd.get('message'),website:fd.get('website'),
    started_at:Number(fd.get('startedAt')),contact_consent:fd.get('contactConsent')==='on',
    marketing_consent:fd.get('marketingConsent')==='on'
  };
  inquirySubmit.disabled=true;inquirySubmit.textContent='Sending…';inquiryResult.style.display='block';
  inquiryResult.className='form-result';inquiryResult.textContent='Securely sending your nonbinding inquiry…';
  try{
    const response=await fetch(STUDIO_CONFIG.url+'/functions/v1/submit-inquiry',{method:'POST',headers:{apikey:STUDIO_CONFIG.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'INQUIRY_FAILED');
    inquiryResult.className='form-result success';inquiryResult.textContent='Thank you. Your nonbinding project inquiry was received. Shell & Co will follow up using the contact information you provided.';
    inquiryForm.reset();if(startedAt)startedAt.value=String(Date.now());inquirySubmit.textContent='Inquiry Sent';
  }catch(error){
    const messages={RATE_LIMITED:'Too many requests were received from this connection. Please call or text (502) 303-2398.',DUPLICATE_INQUIRY:'This inquiry appears to have already been received. Please call or text if you need to add information.',INVALID_REQUEST:'Please review the required fields and try again.'};
    inquiryResult.className='form-result error';inquiryResult.textContent=messages[error.message]||'Your inquiry could not be sent. Please call or text (502) 303-2398 instead.';
    inquirySubmit.disabled=false;inquirySubmit.textContent='Send Nonbinding Inquiry';
  }
});

$('#copyPhone').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('502-303-2398');$('#copyPhone').textContent='Phone Copied'}catch{location.href='tel:+15023032398'}});
