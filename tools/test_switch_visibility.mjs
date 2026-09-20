import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

// CSS-only regression: synthetic native contract, never the user's live switches.
const source=readFileSync(process.env.GBC_SWITCH_PLUGIN_SOURCE || new URL('../plugin.js',import.meta.url),'utf8');
const css=source.match(/const CSS = `([\s\S]*?)`;/)[1];
const rootClass='peer inline-flex shrink-0 items-center rounded-full border border-[color-mix(in_srgb,var(--dt-foreground)_18%,transparent)] bg-[color-mix(in_srgb,var(--dt-background)_58%,var(--dt-input))] shadow-[inset_0_0_0_0.0625rem_color-mix(in_srgb,var(--dt-foreground)_8%,transparent)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-transparent data-[state=checked]:bg-primary';
const thumbClass='pointer-events-none block rounded-full bg-foreground shadow-[0_0.0625rem_0.1875rem_color-mix(in_srgb,var(--dt-background)_50%,transparent)] ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-background';
// Expanded native Tailwind utilities. @theme inline background reads dt-background
// directly, retaining the real ui-bg-chrome -> dt-background token chain.
const hostCSS=`@layer base, utilities;
@layer base {
 :root{font-size:16px;--ui-bg-chrome:#202124;--ui-text:#FFFFFF;--ui-accent:#ED168C;--dt-background:var(--ui-bg-chrome);--dt-foreground:var(--ui-text);--dt-primary:var(--ui-accent);--dt-input:#353535;--dt-ring:#ED168C}
 *{box-sizing:border-box}button{padding:0;font:inherit}
}
@layer utilities {
 [data-slot=switch]{display:inline-flex;flex-shrink:0;align-items:center;border-radius:9999px;border:1px solid color-mix(in srgb,var(--dt-foreground) 18%,transparent);background:color-mix(in srgb,var(--dt-background) 58%,var(--dt-input));box-shadow:inset 0 0 0 .0625rem color-mix(in srgb,var(--dt-foreground) 8%,transparent);transition:color .15s,background-color .15s,border-color .15s;outline:none}
 [data-slot=switch]:focus-visible{border-color:var(--dt-ring);box-shadow:0 0 0 .1875rem color-mix(in srgb,var(--dt-ring) 50%,transparent)}
 [data-slot=switch]:disabled{cursor:not-allowed;opacity:.5}
 [data-slot=switch][data-state=checked]{border-color:transparent;background:var(--dt-primary)}
 [data-slot=switch][data-size=default]{height:1.25rem;width:2.25rem}
 [data-slot=switch][data-size=xs]{height:1rem;width:1.75rem}
 [data-slot=switch-thumb]{pointer-events:none;display:block;border-radius:9999px;background:var(--dt-foreground);box-shadow:0 .0625rem .1875rem color-mix(in srgb,var(--dt-background) 50%,transparent);transition:transform .15s}
 [data-size=default]>[data-slot=switch-thumb]{width:1rem;height:1rem}
 [data-size=xs]>[data-slot=switch-thumb]{width:.75rem;height:.75rem}
 [data-slot=switch-thumb][data-state=unchecked]{transform:translateX(0)}
 [data-size=default]>[data-state=checked]{transform:translateX(1rem)}
 [data-size=xs]>[data-state=checked]{transform:translateX(.875rem)}
 .bg-background,[data-slot=switch-thumb][data-state=checked]{background-color:var(--dt-background)}
 .bg-foreground{background-color:var(--dt-foreground)}
}
body{margin:24px} .case{height:48px}
`;
const markup=['default','xs'].flatMap(size=>[false,true].flatMap(disabled=>['unchecked','checked'].map(state=>{
 const id=`${size}-${disabled}-${state}`;
 return `<div class="case"><button id="${id}" type="button" role="switch" aria-checked="${state==='checked'}" data-slot="switch" data-size="${size}" data-state="${state}" class="${rootClass} ${size==='xs'?'h-4 w-7':'h-5 w-9'}" ${disabled?'disabled':''}><span data-slot="switch-thumb" data-state="${state}" class="${thumbClass} ${size==='xs'?'size-3 data-[state=checked]:translate-x-3.5':'size-4 data-[state=checked]:translate-x-4'}"></span></button></div>`;
}))).join('');
const fixture=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'"><style>${hostCSS}</style><style id="plugin">${css}</style>${markup}<span id="background" class="bg-background" data-state="checked">background</span><span id="foreground" class="bg-foreground" data-state="checked">span</span><script>
for(const b of document.querySelectorAll('button'))b.addEventListener('click',()=>{const state=b.dataset.state==='checked'?'unchecked':'checked';b.dataset.state=state;b.firstElementChild.dataset.state=state;b.setAttribute('aria-checked',String(state==='checked'));});
window.sample=()=>[...document.querySelectorAll('button')].map(b=>{const t=b.firstElementChild,s=getComputedStyle(b),u=getComputedStyle(t),r=b.getBoundingClientRect(),q=t.getBoundingClientRect();return {id:b.id,state:b.dataset.state,disabled:b.disabled,bg:s.backgroundColor,thumb:u.backgroundColor,opacity:s.opacity,cursor:s.cursor,focus:b.matches(':focus-visible'),border:s.borderColor,shadow:s.boxShadow,outline:s.outlineStyle,geometry:[r.width,r.height,q.width,q.height,q.x-r.x,q.y-r.y],transform:u.transform,transition:[s.transition,u.transition],radius:u.borderRadius,pointer:u.pointerEvents};});
window.ready=true;</script>`;
const rgba=value=>{const n=value.match(/[\d.]+/g).map(Number);return [...n.slice(0,3),n[3]??1];};
const luminance=rgb=>rgb.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(rgba(a)),y=luminance(rgba(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('real Chromium native switch visibility, geometry, scope and input',{timeout:45000},async()=>{
 const browser=[process.env.CHROMIUM_PATH,process.env.CONCERT_TEST_BROWSER,...[process.env.LOCALAPPDATA,process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean).flatMap(p=>[join(p,'Google/Chrome/Application/chrome.exe'),join(p,'Microsoft/Edge/Application/msedge.exe')]),'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p));
 assert.ok(browser,'Local Chromium required');
 const dir=mkdtempSync(join(process.env.TMPDIR||tmpdir(),'gbc-switch-')),file=join(dir,'fixture.html');
 writeFileSync(file,fixture);writeFileSync(join(dir,'plugin-source.js'),source);
 console.log('Switch evidence: '+dir+'; Chromium: '+browser);
 const child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-pipe','--user-data-dir='+join(dir,'profile')],{windowsHide:true,stdio:['ignore','ignore','pipe','pipe','pipe']});
 let sequence=0,buffer='',errors='',browserExited=false;const requests=new Map(),evidence=[];
 child.stderr.on('data',data=>errors+=data);
 child.stdio[4].on('data',data=>{buffer+=data;let end;while((end=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const message=JSON.parse(raw);if(message.id){const r=requests.get(message.id);requests.delete(message.id);message.error?r?.reject(Error(JSON.stringify(message.error))):r?.resolve(message.result);}}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;requests.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
 const exited=new Promise(resolve=>{child.once('error',error=>{for(const r of requests.values())r.reject(error);resolve();});child.once('exit',code=>{browserExited=true;for(const r of requests.values())r.reject(Error('Chromium exited '+code+': '+errors));requests.clear();resolve();});});
 const deadline=setTimeout(()=>{for(const r of requests.values())r.reject(Error('Chromium pipe timeout'));child.kill();},40000);
 try{
  const target=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Page.enable',{},sessionId);await send('Page.navigate',{url:pathToFileURL(file).href},sessionId);
  const until=Date.now()+10000;while(!await evaluate('window.ready===true')){assert.ok(Date.now()<until,'fixture ready timeout');await new Promise(r=>setTimeout(r,20));}
  const settle=()=>evaluate('(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.getAnimations().map(a=>a.finished));})()');
  const sample=async label=>{await settle();const rows=await evaluate('sample()');evidence.push({label,rows});return rows;};
  const key=async(key,code,vk)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk},sessionId);await settle();};
  const click=async id=>{const p=await evaluate(`(()=>{const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1},sessionId);await settle();};
  const host=await sample('host');
  for(const mode of ['reading','full-stage','focus',null]){
   await evaluate(mode?`document.documentElement.setAttribute('data-gbc-workbench','${mode}')`:`document.documentElement.removeAttribute('data-gbc-workbench')`);
   const rows=await sample(mode||'removed');
   for(const [i,row] of rows.entries()){
    const label=`${mode||'host restored'} ${row.id}`;
    if(row.state==='checked'){
     assert.equal(rgba(row.thumb)[3],1,`${label}: checked thumb must be opaque; actual ${row.thumb} (dt-background follows transparent ui-bg-chrome)`);
     assert.equal(row.bg,'rgb(237, 22, 140)',label+' native pink track');
     if(mode){assert.equal(row.thumb,'rgb(244, 241, 243)');assert.ok(contrast(row.thumb,row.bg)>=3,label+' contrast >=3');}
    }else assert.equal(row.thumb,'rgb(255, 255, 255)',label+' unchecked foreground');
    for(const property of ['geometry','transform','transition','radius','pointer','opacity','cursor','outline'])assert.deepEqual(row[property],host[i][property],label+' '+property);
    const xs=row.id.startsWith('xs');assert.deepEqual(row.geometry.slice(0,4),xs?[28,16,12,12]:[36,20,16,16]);
    assert.equal(row.geometry[4],1+(row.state==='checked'?(xs?14:16):0));
    assert.equal(row.opacity,row.disabled?'0.5':'1');
   }
   if(!mode)assert.deepEqual(rows,host,'removing scope restores entire host sample');
   assert.deepEqual(await evaluate(`[getComputedStyle(document.getElementById('background')).backgroundColor,getComputedStyle(document.getElementById('foreground')).backgroundColor]`),[mode?'rgba(0, 0, 0, 0)':'rgb(32, 33, 36)','rgb(255, 255, 255)'],'non-switch utilities retain host token behavior');
   // Real input in this fixture only; native button click and Space activation.
   await click('default-false-unchecked');
   assert.equal((await sample('clicked'))[0].state,'checked');
   await key(' ','Space',32);
   assert.equal((await sample('space'))[0].state,'unchecked');
   await evaluate("document.getElementById('default-false-unchecked').focus()");await key('Tab','Tab',9);
   const focused=(await sample('focus-visible'))[1];
   assert.equal(focused.focus,true);assert.notEqual(focused.shadow,'none');
   if(mode){const saved=await evaluate("document.documentElement.getAttribute('data-gbc-workbench')");await evaluate("document.documentElement.removeAttribute('data-gbc-workbench')");const original=(await sample('host focus'))[1];for(const p of ['shadow','border','outline'])assert.equal(focused[p],original[p]);await evaluate(`document.documentElement.setAttribute('data-gbc-workbench',${JSON.stringify(saved)})`);}
   await click('xs-true-checked');assert.equal((await sample('disabled click'))[7].state,'checked');
   await evaluate('document.activeElement.blur()');
  }
  console.log('PASS: 3 modes, 2 sizes, checked/unchecked, disabled, click/Space/Tab, scope removal; checked contrast='+contrast('rgb(244, 241, 243)','rgb(237, 22, 140)').toFixed(3));
 }catch(error){
  writeFileSync(join(dir,'failure.txt'),error.stack || String(error));
  throw error;
 }finally{
  writeFileSync(join(dir,'measurements.json'),JSON.stringify(evidence,null,2));writeFileSync(join(dir,'browser-stderr.txt'),errors);
  if(!browserExited)await send('Browser.close').catch(()=>{});await exited;clearTimeout(deadline);
  // A crashed browser can leave inherited pipe handles open in child processes.
  for(const stream of child.stdio)stream?.destroy();
 }
});
