const qaStyles=document.createElement('link');qaStyles.rel='stylesheet';qaStyles.href='assets/qa-fixes.css';document.head.appendChild(qaStyles);

/* Founder-selected intake reconciliation: customer-facing prototype refinements. */
(function applyFounderSelectedUX(){
  const nav=document.querySelector('.nav-links');
  if(nav&&!nav.querySelector('[data-our-work]')){
    const link=document.createElement('a');link.href='our-work.html';link.textContent='Our Work';link.dataset.ourWork='true';
    const process=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#process');
    nav.insertBefore(link,process||null);
  }
  const heroEyebrow=document.querySelector('.hero .eyebrow');
  if(heroEyebrow)heroEyebrow.textContent='Bathroom Remodeling • Tile Precision • Accessibility';
  const heroActions=document.querySelector('.hero-actions');
  if(heroActions){
    heroActions.innerHTML='<a class="button" href="#estimate">Request an Estimate</a><a class="button light" href="#studio">Try the Remodel Studio</a><a class="button light" href="tel:+15023032398">Call (502) 303-2398</a>';
  }
  const room=document.querySelector('#roomType');
  if(room){room.innerHTML='<option value="">Choose a bathroom project</option><option>Full Bathroom Remodel</option><option>Shower / Tub Area</option><option>Accessible Bathroom / Walk-In Tub</option><option>Tile / Flooring Within Bathroom</option><option>Bathroom Repair / Upgrade</option>';}
  const difference=document.querySelector('#difference');
  if(difference&&!document.querySelector('#our-work-preview')){
    const section=document.createElement('section');section.className='section dark project-preview';section.id='our-work-preview';
    section.innerHTML='<div class="wrap"><div class="eyebrow">Real Bathroom Transformations</div><h2>See the work before you start yours.</h2><p class="lead">The founder-supplied project archive has now been classified into three bathroom jobs with representative before-and-after comparisons. See the transformations, then bring your own bathroom vision into the Remodel Studio and estimate process.</p><div class="project-preview-grid"><div><span class="project-stat">3</span><strong> project groups</strong><p>Bathroom remodel work personally performed or supervised by Bernard Shell Jr., with commercial-use rights confirmed in the founder intake.</p></div><div><span class="project-stat">35</span><strong> years reported experience</strong><p>Founder-selected experience history: apprenticeship-trained, with bathroom remodeling identified as the preferred trade focus.</p></div></div><div class="hero-actions"><a class="button beige" href="our-work.html">View Before &amp; After Projects</a><a class="button light" href="#estimate">Request an Estimate</a></div></div>';
    difference.insertAdjacentElement('afterend',section);
  }
  const contactCard=document.querySelector('.contact-card');
  if(contactCard&&!contactCard.querySelector('[data-hours]')){
    const service=[...contactCard.querySelectorAll('p')].find(p=>p.textContent.includes('Service Area'));
    const hours=document.createElement('p');hours.dataset.hours='true';hours.innerHTML='<strong>Call Hours</strong><br>9 AM–5 PM';
    const text=document.createElement('p');text.innerHTML='<a class="button beige" href="sms:+15023032398">Text Shell &amp; Co</a>';
    if(service){service.insertAdjacentElement('afterend',hours);hours.insertAdjacentElement('afterend',text);}else{contactCard.append(hours,text);}
  }
  if(!document.querySelector('.mobile-contact-dock')){
    const dock=document.createElement('div');dock.className='mobile-contact-dock';dock.setAttribute('aria-label','Quick contact');
    dock.innerHTML='<a href="tel:+15023032398">Call</a><a href="sms:+15023032398">Text</a><a href="#estimate">Estimate</a>';
    document.body.appendChild(dock);
  }
})();

const state={photo:null,style:'Clean Modern',preserve:new Set(),change:new Set(['Tile','Vanity']),must:new Set(),selectedConcept:null};
const $=(s)=>document.querySelector(s);const $$=(s)=>[...document.querySelectorAll(s)];

function setPressed(btn,pressed){btn.setAttribute('aria-pressed',pressed?'true':'false')}
function chipGroup(selector,set){$$(selector).forEach(btn=>{setPressed(btn,btn.classList.contains('active'));btn.addEventListener('click',()=>{const v=btn.dataset.value;if(set.has(v)){set.delete(v);btn.classList.remove('active');setPressed(btn,false)}else{set.add(v);btn.classList.add('active');setPressed(btn,true)}updatePacket()})})}
chipGroup('[data-group="preserve"]',state.preserve);chipGroup('[data-group="change"]',state.change);chipGroup('[data-group="must"]',state.must);
$$('[data-style]').forEach(btn=>{setPressed(btn,btn.classList.contains('active'));btn.addEventListener('click',()=>{$$('[data-style]').forEach(x=>{x.classList.remove('active');setPressed(x,false)});btn.classList.add('active');setPressed(btn,true);state.style=btn.dataset.style;updatePacket()})});

const input=$('#spacePhoto'),drop=$('#dropzone'),preview=$('#photoPreview'),photoLabel=$('#photoLabel');
drop.tabIndex=0;drop.setAttribute('role','button');drop.setAttribute('aria-label','Choose or drop a room photo');
drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});

function loadFile(file){if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)){alert('Please choose a JPG, PNG, or WEBP image.');return}if(file.size>10*1024*1024){alert('For this prototype, use an image under 10 MB.');return}const r=new FileReader();r.onload=e=>{state.photo={name:file.name,size:file.size,url:e.target.result};preview.src=e.target.result;preview.style.display='block';photoLabel.textContent=file.name;updatePacket()};r.readAsDataURL(file)}
input.addEventListener('change',e=>loadFile(e.target.files[0]));['dragenter','dragover'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove('drag')}));drop.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));

function list(set){return [...set].length?[...set].join(', '):'None selected'}
function updatePacket(){const el=$('#packetText');if(!el)return;el.replaceChildren();const rows=[['Source',state.photo?state.photo.name:'No customer photo yet'],['Direction',state.style],['Preserve',list(state.preserve)],['Change',list(state.change)],['Must-have',list(state.must)]];if(state.selectedConcept)rows.push(['Preferred concept',state.selectedConcept]);rows.forEach(([label,value],i)=>{const strong=document.createElement('strong');strong.textContent=label+': ';el.appendChild(strong);el.appendChild(document.createTextNode(value));if(i<rows.length-1)el.appendChild(document.createElement('br'))})}
updatePacket();

$('#generateBtn').addEventListener('click',()=>{if(!state.photo){alert('Upload a bathroom photo first so the intended remodel flow can be demonstrated.');return}const room=$('#roomType').value;if(!room){alert('Choose the bathroom project type first.');return}$('#concepts').hidden=false;$('#generateBtn').textContent='Regenerate Prototype Concepts';$('#generationStatus').textContent='Prototype mode: four concept slots prepared. Production will call a secure OpenAI-backed service; no API key will be stored in this page.';$('#concepts').scrollIntoView({behavior:'smooth',block:'nearest'})});

const preferredConceptInput=document.querySelector('input[disabled][value="Choose above if desired"]');
$$('.concept-select').forEach(btn=>{setPressed(btn,false);btn.addEventListener('click',()=>{const card=btn.closest('.concept');$$('.concept').forEach(x=>x.classList.remove('selected'));card.classList.add('selected');state.selectedConcept=card.dataset.name;$$('.concept-select').forEach(x=>{x.textContent='Select';setPressed(x,false)});btn.textContent='Selected';setPressed(btn,true);if(preferredConceptInput)preferredConceptInput.value=state.selectedConcept;updatePacket();$('#reviewPanel').hidden=false})});

$('#estimateForm').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;const fd=new FormData(e.currentTarget);const packet={metadata:{record_type:'Shell & Co Pre-Estimate Intelligence Packet',prototype:true,created_at:new Date().toISOString()},customer:{name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email'),zip:fd.get('zip')},project:{room_type:$('#roomType').value,style:state.style,preserve:[...state.preserve],change:[...state.change],must_have:[...state.must],notes:$('#vision').value,selected_concept:state.selectedConcept,timing:fd.get('timing')},source_photo:{filename:state.photo?.name||null,note:'Photo bytes are intentionally not included in the public prototype packet.'},disclosures:['AI visualization is conceptual, not a construction drawing or quote.','Buildability, measurements, code, trade, permit, pricing, and material availability require field verification.']};const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const dl=$('#downloadPacket');if(dl.href)URL.revokeObjectURL(dl.href);dl.href=url;dl.download='shell-co-pre-estimate-prototype.json';dl.hidden=false;$('#formResult').style.display='block';$('#formResult').scrollIntoView({behavior:'smooth',block:'nearest'})});

$('#copyPhone').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('502-303-2398');$('#copyPhone').textContent='Phone Copied'}catch{location.href='tel:+15023032398'}});
