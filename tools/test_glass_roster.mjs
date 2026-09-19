import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const source=readFileSync(new URL('../plugin.js',import.meta.url),'utf8');
const adapter = `
let hookValues=[], hookIndex=0, effects=[], cleanupEffects=[], component, pending=false;
function useState(initial) { const i=hookIndex++; if (!(i in hookValues)) hookValues[i]=initial; return [hookValues[i], value=>{ hookValues[i]=value; if(!pending){pending=true;queueMicrotask(()=>{pending=false;render();});} }]; }
function useEffect(effect) { const i=hookIndex++; if(!(i in hookValues)){hookValues[i]=true;effects.push(effect);} }
function jsx(type, props={}) { return {type,props}; }
function element(v) {
 if(v==null || v===false) return document.createTextNode('');
 if(typeof v!=='object') return document.createTextNode(String(v));
 if(typeof v.type==='function') return element(v.type(v.props));
 const n=document.createElement(v.type), p=v.props;
 for(const [k,value] of Object.entries(p)){
  if(k==='children'||k==='value')continue;
  if(k==='style')Object.assign(n.style,value);
  else if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),value);
  else if(k==='className')n.className=value;
  else if(k==='disabled')n.disabled=value;
  else if(value!=null)n.setAttribute(k,String(value));
 }
 for(const child of [p.children].flat(Infinity))n.append(element(child));
 if('value' in p)n.value=p.value;
 return n;
}
function render(){ if(!component)return;hookIndex=0;document.getElementById('contribution').replaceChildren(element(component()));for(const e of effects.splice(0))cleanupEffects.push(e()); }
let saved=null, fail='', pendingGet=null, pendingSet=null, pendingRemove=null, writes=0, disposers=[];
const timers=new Map();let timerId=0;
const clock={setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
const expire=()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}};
const ctx={storage:{async get(){if(fail==='get')throw Error('get failure');if(pendingGet)return await pendingGet;return structuredClone(saved);},async set(k,v){writes++;if(pendingSet)await pendingSet;if(fail==='set')throw Error('quota');saved=structuredClone(v);},async remove(){writes++;if(pendingRemove)await pendingRemove;if(fail==='remove')throw Error('remove failure');saved=null;}},
 register(c){if(c.area!=='statusBar.right')throw Error('unknown SDK surface');component=c.render;render();},onDispose(fn){disposers.push(fn);} };
function unmount(){component=null;for(const f of cleanupEffects.splice(0))f?.();hookValues=[];document.getElementById('contribution').replaceChildren();}
function stop(){for(const f of disposers.splice(0))f();unmount();}
function start(){plugin.register(ctx, clock);}
`;
const primaryClass='size-(--composer-control-primary-size,var(--composer-control-size)) shrink-0 rounded-full p-0 bg-foreground text-background hover:bg-foreground/90 disabled:bg-foreground/30 disabled:text-background disabled:opacity-100';
const audioLines='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-audio-lines"><path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4"/></svg>';
const voiceButton=(id,disabled='')=>`<button id="${id}" type="button" class="${primaryClass}" ${disabled}>${audioLines}</button>`;
const voiceHostCSS=`.rounded-full{border-radius:9999px}.bg-foreground{background:white}.text-background{color:#111}.shrink-0{flex-shrink:0}.p-0{padding:0}#outside-voice{position:absolute;top:0;right:0}button.rounded-full{width:28px;height:28px}button.rounded-full:hover{background:rgba(255,255,255,.9);filter:brightness(.9)}button.rounded-full:focus-visible{outline:2px solid hotpink}button.rounded-full:disabled{background:rgba(255,255,255,.3);color:#111;opacity:1}.ghost{background:transparent;color:rgb(100,110,120)}`;
const peekHostCSS=`@layer base {
 :root [data-overlay-surface]:has([data-translucency-peek-scope]) { transition: opacity 420ms cubic-bezier(0.22,1,0.36,1); }
 :root[data-hermes-translucency-peek] [data-overlay-surface]:has([data-translucency-peek-scope]) { opacity: 0.08; transition: opacity 160ms cubic-bezier(0.32,0.72,0,1); }
} #peek-settings{position:fixed;top:40px;left:10px;width:260px;height:100px}#other-overlay{position:fixed;top:40px;right:10px;opacity:.63;transition:opacity 270ms linear}`;
const peekMarkup='<div id="peek-settings" data-overlay-surface><section data-translucency-peek-scope><label id="peek-text" for="peek-range">Window transparency</label><input id="peek-range" type="range" min="0" max="100" value="40"><output id="peek-value">40</output></section></div><div id="other-overlay" data-overlay-surface>Other overlay</div>';
// Reduced SessionRow fixture: host utilities stay layered; plugin CSS is unlayered.
// Synthetic content only. The menu's open marker models Radix, not its portal runtime.
const sessionHostCSS=`@layer utilities {
 .session-fixture .text-transparent{color:transparent;background:transparent}
 .session-fixture .session-row-tail{display:inline-block;min-width:20px;text-align:right;transition:opacity 150ms}
 .session-fixture .group:hover .session-row-tail{opacity:0}
 .session-fixture :where(.group):hover .session-row-kebab{color:rgb(130,140,150)}
 .session-fixture .session-row-kebab:hover,.session-fixture .session-row-kebab:focus-visible,.session-fixture .session-row-kebab[data-state=open]{color:rgb(240,240,240);background:rgb(60,70,80)}
 .session-fixture .session-row-kebab:focus-visible{outline:0}
}
.session-fixture{position:relative;margin-top:150px}
.session-fixture .row-hover{position:relative;margin:4px;min-height:32px}
.session-fixture .compact,.session-fixture .card-header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}
.session-fixture .card{padding-block:6px}
.session-fixture .row-title{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.session-fixture [data-row-actions]{position:relative;display:flex;flex-shrink:0;align-items:center;justify-content:flex-end;gap:4px}
.session-fixture .figures{pointer-events:none;white-space:nowrap;font-size:10px;line-height:1;color:rgb(130,140,150)}
.session-fixture time{pointer-events:auto}
.session-fixture .session-row-kebab{position:absolute;right:0;width:20px;height:20px;padding:0;border:0;border-radius:4px;transition:color 100ms}
.session-fixture svg{width:14px;height:14px;fill:currentColor}`;
const sessionActions=id=>`<div data-row-actions><span class="figures"><span class="session-row-tail"><time tabindex="0" datetime="2026-01-01">2h</time></span></span><button id="${id}-kebab" class="session-row-kebab text-transparent" aria-label="Session actions" data-state="closed"><svg viewBox="0 0 14 14"><circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/></svg></button></div>`;
const sessionMarkup=`<section class="session-fixture"><div id="compact" class="compact group row-hover"><span class="row-title">Fixture compact title</span>${sessionActions('compact')}</div><div id="card" class="card group row-hover"><div class="card-header"><span class="row-title">Fixture card header</span>${sessionActions('card')}</div><div>Fixture card body</div></div></section>`;
async function checkSessionRows(send,sessionId,evaluate){
 // Wait for rendered transition endpoints, not a wall-clock guess under headless load.
 const pause=()=>evaluate(`(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.querySelector('.session-fixture').getAnimations({subtree:true}).map(a=>a.finished));})()`);
 const move=async(x,y)=>{await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y},sessionId);await pause();};
 const key=async key=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:9},sessionId);await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:9},sessionId);await pause();};
 const sample=id=>evaluate(`(()=>{const r=document.getElementById('${id}'),b=r.querySelector('button'),t=r.querySelector('time'),tail=t.parentElement;const box=n=>{const v=n.getBoundingClientRect();return [v.x,v.y,v.width,v.height]};return {color:getComputedStyle(b).color,icon:getComputedStyle(b.querySelector('svg')).fill,tail:Number(getComputedStyle(tail).opacity),time:getComputedStyle(t).visibility,geometry:[r,r.querySelector('.row-title'),r.querySelector('[data-row-actions]'),t,b].map(box),focus:b.matches(':focus-visible'),hover:r.matches(':hover'),buttonHover:b.matches(':hover'),bg:getComputedStyle(b).backgroundColor};})()`);
 const transparent='rgba(0, 0, 0, 0)',foreground='rgb(240, 240, 240)',tertiary='rgb(130, 140, 150)';
 for(const mode of [null,'reading','full-stage','focus',null]){
  await evaluate(`(async()=>{stop();${mode?`saved={mode:'${mode}'};start();while(document.documentElement.getAttribute('data-gbc-workbench')!=='${mode}')await new Promise(r=>setTimeout(r,10));`:''}})()`);
  for(const id of ['compact','card']){
   const label=(mode||'host')+' '+id;
   await move(350,10);await evaluate('document.activeElement.blur()');await pause();
   const idle=await sample(id);
   assert.equal(idle.tail,1,label+' idle time visible');assert.equal(idle.time,'visible');
   assert.equal(idle.icon,transparent,label+' idle time opacity='+idle.tail+'; kebab='+idle.icon+' must be transparent');
   assert.equal(idle.color,transparent,label+' idle host text-transparent');
   const t=idle.geometry[3],b=idle.geometry[4];
   assert.ok(t[0]<b[0]+b[2]&&b[0]<t[0]+t[2],label+' time and absolute kebab share trailing space');
   const title=idle.geometry[1];await move(title[0]+2,title[1]+title[3]/2);
   let state=await sample(id);assert.equal(state.hover,true,label+' real row hover');assert.equal(state.tail,0,label+' hover yields time');assert.equal(state.icon,tertiary,label+' group hover host color');assert.deepEqual(state.geometry,idle.geometry,label+' hover geometry stable');
   await move(b[0]+b[2]/2,b[1]+b[3]/2);state=await sample(id);assert.equal(state.buttonHover,true);assert.equal(state.icon,foreground,label+' button hover');assert.equal(state.bg,'rgb(60, 70, 80)');
   await move(350,10);
   // Time immediately precedes the button in tab order; Tab is real CDP keyboard input.
   await evaluate(`document.querySelector('#${id} time').focus()`);await key('Tab');state=await sample(id);assert.equal(state.focus,true,label+' keyboard focus-visible');assert.equal(state.icon,foreground,label+' keyboard host color');
   await evaluate(`document.activeElement.blur();document.getElementById('${id}-kebab').dataset.state='open'`);await pause();state=await sample(id);assert.equal(state.focus,false);assert.equal(state.hover,false);assert.equal(state.icon,foreground,label+' open without hover/focus');assert.equal(state.bg,'rgb(60, 70, 80)');
   await evaluate(`document.getElementById('${id}-kebab').dataset.state='closed'`);await pause();assert.equal((await sample(id)).icon,transparent,label+' closed returns idle');
  }
  if(mode)assert.equal(await evaluate("getComputedStyle(document.getElementById('native-nav')).color"),'rgb(244, 241, 243)',mode+' ordinary sidebar button readable');
 }
 console.log('Session rows PASS: host, three modes, disposal; compact/card; real hover/Tab, open marker, stable geometry');
}
const probe = `
(async()=>{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('wait: '+fn);};
 const tick=()=>new Promise(r=>setTimeout(r,30));
 const roster=()=>document.querySelector('#gbc-sidebar-roster');
 const images=()=>[...document.querySelectorAll('#gbc-sidebar-roster img')];
 const labels=['01 桃香','02 仁菜','03 昴','04 智','05 RUPA'];
 const files=['roster-playful-v1-momoka.webp','roster-playful-v1-nina.webp','roster-playful-v1-subaru.webp','roster-playful-v1-tomo.webp','roster-playful-v1-rupa.webp'];
 const c=document.createElement('canvas');c.width=30;c.height=50;c.getContext('2d').fillRect(0,0,30,50);const pic=c.toDataURL('image/webp');
 let calls=[];
 const api=(read=async()=>pic)=>({getDesktopPluginsDir:async()=>'/fixture-plugins/',readFileDataUrl:async path=>{calls.push(path);return read(path);}});
 const checkRoster=()=>{check(roster()?.parentElement.dataset.slot==='sidebar-content','roster in native content');check(roster().parentElement.firstElementChild===roster(),'roster at top');check(roster().textContent===''&&roster().innerText==='', 'no visible roster text including RUPA');check([...roster().children].map(n=>n.title).join('|')===labels.join('|'),'ordered hover titles');check([...roster().children].map(n=>n.getAttribute('aria-label')).join('|')===labels.join('|'),'ordered accessible names');check(document.querySelectorAll('#gbc-sidebar-roster').length===1,'unique roster');check(document.querySelector('#native-nav').getBoundingClientRect().height>0,'native navigation visible');};
 try{

 // Host marker simulation only: this fixture is not the Hermes React slider.
 const root=document.documentElement, overlay=document.getElementById('peek-settings');
 const range=document.getElementById('peek-range'), output=document.getElementById('peek-value');
 const marker='data-hermes-translucency-peek';
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const opacity=n=>Number(getComputedStyle(n).opacity);
 const effective=n=>{let value=1;for(;n;n=n.parentElement)value*=opacity(n);return value;};
 const geometry=n=>JSON.stringify(['x','y','width','height'].map(k=>n.getBoundingClientRect()[k]));
 const other=()=>{const s=getComputedStyle(document.getElementById('other-overlay'));check(s.opacity==='0.63'&&s.transitionProperty==='opacity'&&s.transitionDuration==='0.27s','unscoped overlay retains opacity/transition');};
 root.setAttribute(marker,'');await delay(200);
 check(opacity(overlay)===.08,'disabled GBC retains host opacity=0.08');other();
 root.removeAttribute(marker);await delay(450);
 range.addEventListener('pointerdown',()=>root.setAttribute(marker,''));
 range.addEventListener('pointerup',()=>root.removeAttribute(marker));
 range.addEventListener('input',()=>output.value=range.value);
 range.addEventListener('keydown',()=>{root.setAttribute(marker,'');setTimeout(()=>root.removeAttribute(marker),900);});
 for(const mode of ['reading','full-stage','focus']){
  saved={mode};start();await wait(()=>root.getAttribute('data-gbc-workbench')===mode);await delay(450);
  const stable=[overlay,document.getElementById('peek-text'),range,output];
  const boxes=stable.map(geometry);
  const chat=document.querySelector('[data-slot=aui_thread-content]'),scene=document.querySelector('.gbc-scene');
  const appearance=n=>{const s=getComputedStyle(n);return [s.opacity,s.backgroundColor,s.backdropFilter,s.transition];};
  const before=JSON.stringify([appearance(chat),appearance(scene)]);
  const readable=phase=>{
   check(opacity(overlay)===1,mode+' '+phase+' overlay opacity='+getComputedStyle(overlay).opacity+'; expected 1');
   check(getComputedStyle(overlay).transitionProperty==='none',mode+' '+phase+' no fade transition');
   check(stable.every(n=>effective(n)===1),mode+' '+phase+' text/range/value effective opacity=1');
   check(JSON.stringify(stable.map(geometry))===JSON.stringify(boxes),mode+' '+phase+' stable geometry');other();
   check(JSON.stringify([appearance(chat),appearance(scene)])===before,mode+' '+phase+' chat/scene unchanged');
  };
  readable('before first begin');
  range.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));readable('first begin');
  check(root.hasAttribute(marker),'GBC preserves active host marker');
  // The first-stage RED exposed the actual host 0.08 endpoint here.
  await delay(200);readable('held');
  range.value='55';range.dispatchEvent(new Event('input',{bubbles:true}));
  check(range.value==='55'&&output.value==='55','range value still changes');
  range.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));readable('end');await delay(450);readable('returned');
  range.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));readable('begin');await tick();readable('first frame');
  range.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));readable('return begin');
  range.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));readable('pulse begin');await delay(200);readable('pulse held');
  await wait(()=>!root.hasAttribute(marker));readable('pulse end');await delay(450);readable('pulse returned');
  root.setAttribute(marker,'');stop();check(root.hasAttribute(marker),'dispose preserves host marker');await delay(200);
  check(opacity(overlay)===.08&&getComputedStyle(overlay).transitionDuration==='0.16s','dispose restores host peek');other();
  root.removeAttribute(marker);await delay(450);
 }
 saved=null;
 start();await wait(()=>document.documentElement.getAttribute('data-gbc-workbench')==='reading');
 const footer=document.querySelector('footer'), bounds=footer.getBoundingClientRect();
 const controls=[document.querySelector('#native-status'),...document.querySelectorAll('.gbc-status-controls > select,.gbc-status-controls > button')];
 check(controls.length===3,'three footer controls');
 for(const n of controls){const r=n.getBoundingClientRect();check(r.top>=bounds.top&&r.bottom<=bounds.bottom,'footer control within 20px: '+n.outerHTML);}
 check(bounds.height===20&&bounds.bottom===innerHeight&&document.documentElement.scrollHeight===innerHeight,'footer adds no page height');
 check(controls[2].getBoundingClientRect().left-controls[1].getBoundingClientRect().right>=6,'status gap');
 const rgb=s=>s.match(/[0-9.]+/g).map(Number);
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(lum(rgb(a)),lum(rgb(b)))+.05)/(Math.min(lum(rgb(a)),lum(rgb(b)))+.05);
 for(const n of document.querySelectorAll('[data-slot=tooltip-content] > span')){const s=getComputedStyle(n);check(s.backgroundColor==='rgb(37, 50, 68)'&&contrast(s.color,s.backgroundColor)>=4.5,'tooltip inner text contrast');check(s.display==='inline'&&s.boxDecorationBreak==='clone','ragged tooltip preserved');check(getComputedStyle(n.parentElement).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(n.parentElement).pointerEvents==='none','transparent native portal');for(const child of n.querySelectorAll('kbd,span'))check(getComputedStyle(child).color===s.color,'tooltip nested text inherits');}
 for(const n of document.querySelectorAll('button[type=submit]')){const s=getComputedStyle(n),icon=getComputedStyle(n.firstElementChild);check(s.backgroundColor==='rgb(244, 106, 168)'&&contrast(s.color,s.backgroundColor)>=4.5,'submit paired text contrast');check(contrast(icon.color,s.backgroundColor)>=3,'submit icon contrast');check(n.getBoundingClientRect().height===28,'native submit size');if(n.id==='stop')check(icon.backgroundColor===s.color,'native stop currentColor');}
 check(document.querySelector('textarea').value==='', 'idle voice fixture has empty input');
 for(const id of ['voice','disabled-voice']){const n=document.getElementById(id),s=getComputedStyle(n),svg=n.querySelector('svg');check(n.type==='button'&&svg.classList.contains('lucide-audio-lines'),'native voice structure');check(s.backgroundColor==='rgb(244, 106, 168)'&&contrast(getComputedStyle(svg).stroke,s.backgroundColor)>=3,'idle voice SVG paired contrast');check(svg.getAttribute('stroke')==='currentColor'&&s.opacity==='1'&&n.getBoundingClientRect().height===28,'voice currentColor/opacity/size preserved');}
 // Exercise the host's three primary states on one control without activating it.
 {const n=document.getElementById('voice'),input=document.querySelector('textarea'),idle=n.innerHTML;
 for(const [state,value,type,icon] of [['idle voice','','button',idle],['typed send','draft','submit',document.getElementById('send').innerHTML],['working stop','draft','submit',document.getElementById('stop').innerHTML]]){input.value=value;n.type=type;n.innerHTML=icon;const s=getComputedStyle(n);check(s.backgroundColor==='rgb(244, 106, 168)'&&contrast(s.color,s.backgroundColor)>=4.5,'three-state primary pair: '+state);}
 input.value='';n.type='button';n.innerHTML=idle;}
 document.getElementById('voice').focus();check(document.activeElement.id==='voice','voice keyboard focus');document.getElementById('disabled-voice').focus();check(document.activeElement.id==='voice'&&document.getElementById('disabled-voice').disabled,'disabled voice cannot focus');
 for(const id of ['ghost','microphone'])check(getComputedStyle(document.getElementById(id)).backgroundColor==='rgba(0, 0, 0, 0)','adjacent ghost remains transparent');
 for(const id of ['model','outside-voice'])check(getComputedStyle(document.getElementById(id)).backgroundColor==='rgb(255, 255, 255)','non-primary/outside remains native');
 check(document.querySelector('#disabled-send').disabled&&getComputedStyle(document.querySelector('#disabled-send')).opacity==='0.5','disabled behavior retained');
 document.querySelector('#send').focus();check(document.activeElement.id==='send','native submit focusable');
 controls[2].click();await tick();check(getComputedStyle(document.querySelector('.gbc-settings select')).fontSize!=='12px'&&document.querySelector('.gbc-settings select').getBoundingClientRect().height>18,'settings not compacted');document.querySelector('.gbc-status-controls > button').click();await tick();
 check(getComputedStyle(document.documentElement).getPropertyValue('--gbc-wallpaper-mask').trim()==='rgba(16, 16, 20, 0.42)','lighter reading mask');
 const panel=document.querySelector('[data-slot=aui_thread-content]'),composer=document.querySelector('[data-slot=composer-surface]');
 for(const n of [panel,composer]){const s=getComputedStyle(n);check(s.backgroundColor==='rgba(25, 38, 57, 0.42)','translucent work surface: '+s.backgroundColor);check(s.backdropFilter==='blur(6px) saturate(0.8)','local glass '+s.backdropFilter);check(s.color==='rgb(244, 241, 243)','white text');}
 check(Number(getComputedStyle(document.querySelector('.gbc-scene')).opacity)>=.85,'visible work scene');
 check(getComputedStyle(document.body,'::after').backdropFilter==='none','no fullscreen blur');
 check(getComputedStyle(document.querySelector('[data-slot=aui_user-message-root]')).backgroundColor==='rgba(0, 0, 0, 0)','no second user mask');
 check(getComputedStyle(document.querySelector('[data-slot=code-card]')).backgroundColor==='rgb(37, 50, 68)','code readable');
 check(getComputedStyle(document.querySelector('table')).backgroundColor==='rgb(37, 50, 68)'&&getComputedStyle(document.querySelector('table')).color==='rgb(244, 241, 243)','table readable');
 check(getComputedStyle(document.querySelector('[data-slot=dropdown-menu-content]')).backgroundColor==='rgb(37, 50, 68)','solid floating surface');
 const v=document.querySelector('main').getBoundingClientRect(),a=panel.getBoundingClientRect(),b=composer.getBoundingClientRect(),input=document.querySelector('textarea').getBoundingClientRect();
 document.body.dataset.geometry=JSON.stringify({window:[innerWidth,innerHeight],ratio:Math.min(a.width,b.width,input.width)/v.width});
 check(Math.min(a.width,b.width,input.width)/v.width>=.7,'wide work area');check(Math.abs(a.x-b.x)<1&&Math.abs(a.right-b.right)<1,'aligned work surfaces');check(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
 await wait(roster);checkRoster();check(images().length===0,'no API without visible text');stop();check(!roster(),'dispose no API roster');
 window.hermesDesktop=api();start();await wait(()=>images().length===5);checkRoster();
 check(calls.join('|')===files.map(f=>'/fixture-plugins/gbc-workbench/assets/roster/'+f).join('|'),'exact five local file reads');
 for(const img of images()){check(img.complete&&img.naturalWidth===30,'decoded image');check(getComputedStyle(img).objectFit==='contain','complete face fit');}
 const boxes=[...roster().children].map(n=>n.getBoundingClientRect());check(boxes.every(r=>Math.abs(r.top-boxes[0].top)<1),'five in one row');check(boxes[4].right<=roster().getBoundingClientRect().right+1,'row fits sidebar');
 const original=roster();document.querySelector('[data-slot=aui_assistant-message-content]').append(document.createTextNode('message update'));await tick();check(roster()===original&&calls.length===5,'message mutation does not rebuild or reread');
 const content=document.querySelector('[data-slot=sidebar-content]');const next=content.cloneNode(false);next.append(document.querySelector('#native-nav'));content.replaceWith(next);await wait(()=>roster()?.parentElement===next);check(roster()===original&&calls.length===5,'session sidebar replacement reuses loaded roster');checkRoster();
 next.replaceChildren(document.querySelector('#native-nav'));await wait(roster);check(roster()===original,'host content reset restores roster');
 const oldDispose=disposers[disposers.length-1];unmount();start();oldDispose();await wait(()=>images().length===5);checkRoster();stop();check(!roster()&&!document.querySelector('#gbc-workbench-style'),'full dispose');
 calls=[];window.hermesDesktop=api(async path=>{if(path.endsWith(files[1]))throw Error('missing');if(path.endsWith(files[2]))return 'data:image/svg+xml;base64,PHN2Zy8+';if(path.endsWith(files[3]))return 'data:image/webp;base64,AAAA';return pic;});
 start();await wait(()=>calls.length===5);await tick();checkRoster();check(images().length===2,'missing/invalid/decode errors keep titles and accessible names only');stop();
 window.hermesDesktop={desktopPluginsRoot:async()=>'/fixture-plugins',readFileDataUrl:async()=>pic};start();await wait(()=>images().length===5);stop();
 let resolveRoot;calls=[];window.hermesDesktop=api();window.hermesDesktop.getDesktopPluginsDir=()=>new Promise(r=>resolveRoot=r);start();stop();resolveRoot('/fixture-plugins');await tick();check(calls.length===0&&!roster(),'late directory cannot read or remount');
 let releases=[];window.hermesDesktop=api(()=>new Promise(r=>releases.push(r)));start();await wait(()=>releases.length===5);stop();releases.forEach(r=>r(pic));await tick();check(!roster(),'late images cannot remount');
 const sidebar=document.querySelector('[data-slot=sidebar-content]');sidebar.remove();window.hermesDesktop=api();start();await tick();check(!roster(),'wait for delayed sidebar');document.querySelector('[data-slot=sidebar-inner]').append(sidebar);await wait(()=>images().length===5);checkRoster();stop();
 start();await wait(()=>images().length===5);stop();sidebar.replaceChildren(document.querySelector('#native-nav'));await tick();check(!roster(),'disconnected observers cannot remount');
 document.body.dataset.result='PASS';
 }catch(e){document.body.dataset.result='FAIL: '+e.message;stop();}
})();`;
// Three-mode peek includes real 900ms pulses and transition endpoints.
// Budget for fixture completion, real SessionRow input/transition checks and pixels across six viewports.
const fixtureTimeoutMs=20000, browserTimeoutMs=45000, testTimeoutMs=270000;
test('real Chromium glass transmission, geometry and local roster lifecycle',{timeout:testTimeoutMs},async()=>{
 const browser=[process.env.CHROMIUM_PATH, process.env.CONCERT_TEST_BROWSER, process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'), process.env.ProgramFiles&&join(process.env.ProgramFiles,'Microsoft/Edge/Application/msedge.exe'), process.env.ProgramFiles&&join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'),process.env['ProgramFiles(x86)']&&join(process.env['ProgramFiles(x86)'],'Microsoft/Edge/Application/msedge.exe'),'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].find(p=>p&&existsSync(p));
 assert.ok(browser,'Local Chromium required');
 const dir=mkdtempSync(join(tmpdir(),'gbc-glass-')),file=join(dir,'fixture.html');
 const script=source.replace(/^import .+;\r?\n/gm,'').replace('export default {','const plugin = {');
 writeFileSync(file,`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'"><style>${voiceHostCSS}${peekHostCSS}${sessionHostCSS}body{margin:0}body::after{content:'';position:fixed;inset:0;pointer-events:none;backdrop-filter:blur(6px)}[data-slot=sidebar-wrapper]{display:flex}[data-slot=sidebar]{width:var(--sidebar-width,128px);flex-shrink:0}[data-slot=sidebar-inner]{min-height:calc(100vh - 20px)}main{flex:1;min-width:0}[data-slot=aui_thread-content]{height:240px}textarea{box-sizing:border-box;width:100%}footer{height:20px;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-end}#contribution{display:flex;align-items:center}#native-status{height:18px;flex-shrink:0}button[type=submit]{height:28px;width:28px;background:white;color:white}button[type=submit]:disabled{opacity:.5}button[type=submit]:hover{filter:brightness(.9)}button[type=submit]:focus-visible{outline:2px solid hotpink}.bg-current{display:inline-block;width:10px;height:10px;background:currentColor}[data-slot=tooltip-content]{pointer-events:none;width:110px;position:absolute;top:400px}.box-decoration-clone{box-decoration-break:clone;display:inline;background:#eee;color:#222;padding:4px 6px;font: bold 11px/normal Arial}.box-decoration-clone kbd{color:#222}</style>${peekMarkup}<div data-slot="sidebar-wrapper"><nav data-slot="sidebar"><div data-slot="sidebar-inner"><div data-slot="sidebar-content"><button id="native-nav">Native navigation</button></div>${sessionMarkup}</div></nav><main><section data-slot="aui_thread-viewport"><article data-slot="aui_thread-content"><div data-slot="aui_assistant-message-content">Reading<table><tr><td>Table value</td></tr></table></div><div data-slot="aui_user-message-root">User message</div><div data-slot="code-card">code table</div></article></section><div data-slot="composer-root"><div data-slot="composer-surface"><textarea></textarea>${voiceButton("voice")}${voiceButton("disabled-voice","disabled")}<button id="ghost" type="button" class="ghost rounded-full">Ghost</button><button id="microphone" type="button" class="ghost">Mic</button><button id="model" type="button" class="bg-foreground text-background">Model</button><button id="send" type="submit"><i class="codicon codicon-arrow-up"></i></button><button id="disabled-send" type="submit" disabled><i class="codicon codicon-arrow-up"></i></button><button id="stop" type="submit"><span class="bg-current"></span></button></div></div><div data-slot="dropdown-menu-content">menu</div></main></div>${voiceButton("outside-voice")}<footer><button id="native-status">Native</button><div id="contribution"></div></footer><div data-slot="tooltip-content"><span class="box-decoration-clone inline bg-foreground px-1.5 py-1 text-[11px] font-bold leading-normal text-background [font-family:Arial,sans-serif] [&>*]:!inline">Bot</span></div><div data-slot="tooltip-content"><span class="box-decoration-clone inline bg-foreground px-1.5 py-1 text-[11px] font-bold leading-normal text-background [font-family:Arial,sans-serif] [&>*]:!inline">Quota label across multiple lines <kbd>Ctrl K</kbd><span> remaining</span></span></div><script>${adapter}\n${script}\n${probe}</script>`);
 for(const size of ['1280,800','1600,900','2560,1400','700,900','390,800','1600,600']){
  const child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-pipe','--user-data-dir='+join(dir,'profile-'+size.replace(',','-')),'--window-size='+size],{windowsHide:true,stdio:['ignore','ignore','pipe','pipe','pipe']});
  let sequence=0, buffer='', errors='';const requests=new Map();
  child.stderr.on('data',data=>errors+=data);
  child.stdio[4].on('data',data=>{buffer+=data;let end;while((end=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const message=JSON.parse(raw);if(message.id){const r=requests.get(message.id);requests.delete(message.id);message.error?r?.reject(Error(JSON.stringify(message.error))):r?.resolve(message.result);}}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;requests.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
  let browserExited=false;
  const exited=new Promise(resolve=>{child.once('error',error=>{errors+=error.message;for(const r of requests.values())r.reject(error);});child.once('exit',code=>{browserExited=true;for(const r of requests.values())r.reject(Error('Chromium exited '+code+': '+errors));requests.clear();resolve();});});
  const deadline=setTimeout(()=>{for(const r of requests.values())r.reject(Error('Chromium pipe timeout: '+errors));child.kill();},browserTimeoutMs);
  try{
   const target=await send('Target.createTarget',{url:'about:blank'});
   const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
   await send('Page.enable',{},sessionId);
   await send('Emulation.setDeviceMetricsOverride',{width:Number(size.split(',')[0]),height:Number(size.split(',')[1]),deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:pathToFileURL(file).href},sessionId);
   let result;
   const fixtureDeadline=Date.now()+fixtureTimeoutMs;
   while(Date.now()<fixtureDeadline){
    const response=await send('Runtime.evaluate',{expression:'document.body?.dataset.result',returnByValue:true},sessionId);
    result=response.result?.value;if(result)break;
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   if(!result){
    const diagnostics=await send('Runtime.evaluate',{expression:'JSON.stringify(document.body?.dataset ?? {})',returnByValue:true},sessionId);
    assert.fail(size+': fixture completion timeout after '+fixtureTimeoutMs+'ms; dataset='+diagnostics.result?.value);
   }
   const geometry=await send('Runtime.evaluate',{expression:'document.body.dataset.geometry',returnByValue:true},sessionId);
   console.log('Measured work geometry '+geometry.result.value);
   assert.equal(result,'PASS',size+': '+result);
   const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId)).result.value;
   await checkSessionRows(send,sessionId,evaluate);
   await send('DOM.enable',{},sessionId);await send('CSS.enable',{},sessionId);
   const {root:domRoot}=await send('DOM.getDocument',{},sessionId);
   const {nodeId}=await send('DOM.querySelector',{nodeId:domRoot.nodeId,selector:'#send'},sessionId);
   await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover','focus-visible']},sessionId);
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#send')).filter"),'brightness(0.9)','native hover preserved');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#send')).outlineStyle"),'solid','native focus-visible preserved');
   await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]},sessionId);
   await evaluate('start()');
   for(const id of ['voice','disabled-voice','ghost','microphone','model','outside-voice']){
    const {nodeId}=await send('DOM.querySelector',{nodeId:domRoot.nodeId,selector:'#'+id},sessionId);
    await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover','focus-visible']},sessionId);
    const state=await evaluate(`(()=>{const n=document.getElementById('${id}'),s=getComputedStyle(n);return {bg:s.backgroundColor,outline:s.outlineStyle,filter:s.filter,stroke:n.querySelector('svg')&&getComputedStyle(n.querySelector('svg')).stroke,color:s.color};})()`);
    if(id==='voice'||id==='disabled-voice'){assert.equal(state.bg,'rgb(244, 106, 168)');assert.equal(state.stroke,state.color);assert.equal(state.outline,'solid');assert.equal(state.filter,'brightness(0.9)');}
    else assert.notEqual(state.bg,'rgb(244, 106, 168)','hover/focus counterexample '+id);
    await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]},sessionId);
   }
   await evaluate(`stop()`);
   assert.equal(await evaluate("getComputedStyle(document.getElementById('voice')).backgroundColor"),'rgb(255, 255, 255)','root scope removed on disposal');
   const paint=async(color,mode='reading')=>evaluate(`(async()=>{stop();const c=document.createElement('canvas');c.width=20;c.height=20;const x=c.getContext('2d');x.fillStyle=${JSON.stringify(color)};x.fillRect(0,0,20,20);saved={mode:${JSON.stringify(mode)},background:{url:c.toDataURL('image/png')}};start();while(document.querySelector('.gbc-scene').hidden)await new Promise(r=>setTimeout(r,10));})()`);
   await paint('red');
   const clip=await evaluate(`(()=>{const r=document.querySelector('[data-slot=aui_thread-content]').getBoundingClientRect();return {x:r.x+40,y:r.y+180,width:30,height:30,scale:1};})()`);
   const shot=async()=>{await send('Runtime.evaluate',{expression:'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))',awaitPromise:true},sessionId);return (await send('Page.captureScreenshot',{format:'png',clip},sessionId)).data;};
   const red=await shot();await paint('blue');
   assert.notEqual(await shot(),red,'actual glass pixels transmit changed wallpaper');
   await paint('red','focus');const solid=await shot();await paint('blue','focus');
   assert.equal(await shot(),solid,'opaque focus control blocks wallpaper pixels');
   await evaluate('stop()');
  }finally{clearTimeout(deadline);if(!browserExited)await send('Browser.close').catch(()=>{});await exited;}
  console.log('Glass/roster browser PASS '+size);
 }
});
