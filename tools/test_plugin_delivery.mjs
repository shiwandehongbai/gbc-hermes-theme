import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const source=readFileSync(new URL('../plugin.js',import.meta.url),'utf8');
test('delivery uses local SDK storage and single wallpaper default',()=>{
 assert.doesNotMatch(source,/togenashi-dream-skin/);
 assert.match(source,/ctx\.storage\.get/); assert.match(source,/useState/);
 assert.match(source,/artwork: 'single-wallpaper'/);
 assert.match(source,/state.artwork === 'single-wallpaper'/);
 assert.match(source,/单张合成壁纸（默认）/); assert.match(source,/独立背景与人物（可选）/);
});
// No React/Playwright dependency is installed. This offline browser adapter executes
// the actual plugin with a minimal hook/SDK contract, not the Hermes React renderer.
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
const probe = `
(async()=>{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const wait=async(fn)=>{await Promise.resolve();for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('wait: '+fn);};
 const control=label=>document.querySelector('[aria-label="'+label+'"]');
 const button=text=>[...document.querySelectorAll('button')].find(n=>n.textContent===text);
 const veil=()=>getComputedStyle(document.body,'::after');
 const checkVeil=(expected)=>{check(veil().backdropFilter===expected,'body veil expected '+expected+', got '+veil().backdropFilter);check(veil().backgroundColor==='rgba(16, 16, 20, 0.42)'&&veil().content==='""','body veil tint and content retained');const reading=document.documentElement.getAttribute('data-gbc-workbench')==='reading';check(getComputedStyle(document.querySelector('[data-slot=composer-root]')).backdropFilter===(reading?'none':'blur(12px)'),'work avoids duplicate composer blur; other modes and dispose restore native blur');};
 const ready=()=>control('GBC 模式')&&!control('GBC 模式').disabled;
 const status=()=>document.querySelector('[role=status]')?.textContent||'';
 const choose=async(label,value)=>{control(label).value=value;control(label).dispatchEvent(new Event('change',{bubbles:true}));await wait(ready);};
 const open=()=>{if(!control('GBC 本地设置'))button('GBC 设置').click();};
 const picture=(transparent=false,w=1672,h=941)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#778899';g.fillRect(0,0,w,transparent?h-1:h);return c.toDataURL('image/png');};
 const upload=async(label,url,type='image/png')=>{const raw=atob(url.split(',')[1]);const file=new File([Uint8Array.from(raw,c=>c.charCodeAt(0))],'local.png',{type});const d=new DataTransfer();d.items.add(file);control(label).files=d.files;control(label).dispatchEvent(new Event('change',{bubbles:true}));await wait(ready);};
 try {
 checkVeil('blur(6px)');
 document.documentElement.setAttribute('data-gbc-workbench','original');
 const originalText=document.querySelector('[data-slot=aui_thread-content]').textContent;
 start();await wait(ready);open();await wait(()=>control('画面组成'));
 checkVeil('none');
 const initialMode=control('GBC 模式').value;
 await choose('GBC 模式','reading');
 const rect=slot=>document.querySelector('[data-slot="'+slot+'"]').getBoundingClientRect();
 const v=rect('aui_thread-viewport'),aWork=rect('aui_thread-content'),surface=rect('composer-surface'),inputWork=rect('composer-rich-input'),side=rect('sidebar');
 const evidence={window:[innerWidth,innerHeight],viewport:v.width,content:aWork.width,surface:surface.width,input:inputWork.width,ratio:Math.min(aWork.width,surface.width,inputWork.width)/v.width};
 document.body.dataset.geometry=JSON.stringify(evidence);
 check(evidence.ratio>=.70,'work geometry '+JSON.stringify(evidence));
 check(Math.abs(aWork.left-surface.left)<=1&&Math.abs(aWork.right-surface.right)<=1,'actual surface aligned');
 check(inputWork.left>=surface.left&&inputWork.right<=surface.right,'input inside surface');
 check(side.width>=112&&side.right<=v.left,'sidebar remains available');
 check(aWork.left>=v.left&&aWork.right<=v.right&&surface.right<=v.right&&document.documentElement.scrollWidth<=innerWidth,'no viewport overflow');
 check(getComputedStyle(document.querySelector('[data-slot=aui_thread-content]')).backgroundColor==='rgba(25, 38, 57, 0.42)'&&getComputedStyle(document.querySelector('[data-slot=composer-surface]')).backgroundColor==='rgba(25, 38, 57, 0.42)','translucent work panels');
 const pre=document.querySelector('pre');check(pre.scrollWidth>pre.clientWidth&&getComputedStyle(pre).overflowX==='auto','long code scrolls');pre.scrollLeft=100;check(pre.scrollLeft>0,'code scroll reachable');
 const range=document.createRange();range.selectNodeContents(document.querySelector('[data-slot=aui_assistant-message-content] p'));getSelection().removeAllRanges();getSelection().addRange(range);check(getSelection().toString().includes('中文长文'),'text selection');getSelection().removeAllRanges();
 check(document.querySelector('[data-terminal]').textContent.split(String.fromCharCode(10)).length>=10,'multiline tool output');
 check(initialMode==='reading','first install defaults to work');
 await choose('GBC 模式','focus');check(Math.min(rect('aui_thread-content').width,rect('composer-surface').width)/rect('aui_thread-viewport').width>=.70,'focus wide workspace');
 await choose('GBC 模式','full-stage');
 document.documentElement.removeAttribute('data-gbc-workbench');checkVeil('blur(6px)');document.documentElement.setAttribute('data-gbc-workbench','full-stage');checkVeil('none');
 check(control('画面组成').value==='single-wallpaper','default composition');
 check(control('人物宽度').disabled&&control('脚底位置').disabled,'baked feet disabled');
 check(!button('清除人物'),'single wallpaper cannot claim to clear baked characters');
 await upload('单张合成壁纸',picture());
 check(status().includes('已保存'),'import saved');
 check(getComputedStyle(document.querySelector('.gbc-scene')).backgroundSize==='cover','native cover');
 check(document.querySelector('.gbc-canvas').hidden&&document.querySelector('.gbc-figure').hidden,'no second ensemble');
 await choose('整张壁纸缩放','120');check(document.querySelector('.gbc-scene').style.backgroundSize.endsWith('px auto'),'whole wallpaper aspect scale');
 stop();checkVeil('blur(6px)');start();await wait(ready);checkVeil('none');open();await wait(()=>control('画面组成'));
 check(control('整张壁纸缩放').value==='120','persist reopen');
 const before=saved.background.url;
 await upload('单张合成壁纸','data:image/png;base64,iVBORw0KGgo=');check(status().includes('未保存')&&saved.background.url===before,'damaged image retains good asset');
 await upload('单张合成壁纸','data:image/svg+xml;base64,PHN2Zy8+','image/svg+xml');check(status().includes('未保存'),'SVG rejected');
 fail='set';await choose('GBC 模式','reading');check(status().includes('未保存')&&document.documentElement.getAttribute('data-gbc-workbench')==='full-stage','storage failure no false apply');fail='';
 for(const mode of ['reading','focus','full-stage']){await choose('GBC 模式',mode);check(document.documentElement.getAttribute('data-gbc-workbench')===mode,'three modes');checkVeil('none');}
 await choose('画面组成','separate-layers');await upload('透明人物',picture(true,1886,1000));
 check(!document.querySelector('.gbc-canvas').hidden,'separate canvas');
 const fig=document.querySelector('.gbc-figure');
 if(innerWidth<=1100||innerHeight<=650)check(fig.hidden,'narrow figure safety');
 else if(!fig.hidden){const f=fig.getBoundingClientRect();for(const slot of ['aui_thread-content','composer-root']){const r=rect(slot);check(f.left>=r.right+8||f.right<=r.left-8||f.top>=r.bottom+8||f.bottom<=r.top-8,'visible figure avoids work');}}
 await choose('头像预设','shenzhen');check(document.querySelectorAll('.gbc-portrait').length===5,'explicit portraits');
 await choose('画面组成','single-wallpaper');check(document.querySelector('.gbc-figure').hidden&&!document.querySelector('.gbc-figure').hasAttribute('src')&&!document.querySelector('.gbc-portrait'),'single clears active figure and portraits');
 saved.figure={url:'data:image/png;base64,broken'};delete saved.artwork;saved.mode='invalid-legacy';const legacyBackground=saved.background.url;const legacyWrites=writes;
 stop();start();await wait(ready);open();await wait(()=>control('画面组成'));
 check(control('画面组成').value==='single-wallpaper'&&status().includes('就绪'),'stale legacy figure ignored');
 check(document.querySelector('.gbc-scene').style.backgroundImage!=='none'&&saved.background.url===legacyBackground&&writes===legacyWrites&&control('GBC 模式').value==='reading','legacy wallpaper retained with invalid mode work fallback and no storage write');
 const input=control('Native input');input.focus();input.value='native typing';input.dispatchEvent(new Event('input',{bubbles:true}));check(document.activeElement===input&&input.value==='native typing','native input unaffected');
 check(document.querySelector('[data-slot=aui_thread-content]').textContent===originalText,'message unchanged');
 const a=document.querySelector('[data-slot=aui_thread-content]').getBoundingClientRect(),b=document.querySelector('[data-slot=composer-root]').getBoundingClientRect();check(a.left===b.left&&a.width===b.width,'input aligned');
 if(innerWidth<=1100||innerHeight<=650)check(getComputedStyle(document.querySelector('[data-slot=aui_thread-content]')).backgroundColor==='rgba(25, 38, 57, 0.42)','narrow work retains local glass');
 for(const n of document.querySelectorAll('#gbc-settings input:not(:disabled),#gbc-settings select:not(:disabled),#gbc-settings button:not(:disabled)')){n.focus();check(document.activeElement===n&&n.tabIndex>=0,'native keyboard focusable');}
 control('画面组成').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(()=>!control('GBC 本地设置'));
 open();await wait(()=>control('画面组成'));fail='remove';button('重置全部并清除图片').click();await wait(ready);check(status().includes('未保存')&&saved.background,'reset failure retained');fail='';button('重置全部并清除图片').click();await wait(ready);check(saved===null&&document.querySelector('.gbc-scene').hidden&&control('GBC 模式').value==='reading','reset work fallback');
 // A replaced owner cannot restore its root state or resurrect an async load.
 const old=disposers[0];unmount();start();await wait(ready);old();check(document.querySelectorAll('.gbc-scene').length===1,'re-register unique owner');checkVeil('none');
 stop();check(!document.querySelector('.gbc-scene')&&!document.querySelector('#gbc-workbench-style')&&document.documentElement.getAttribute('data-gbc-workbench')==='original','dispose restores root');checkVeil('blur(6px)');
 let resolve;pendingGet=new Promise(r=>resolve=r);start();stop();resolve({background:{url:picture()}});pendingGet=null;await new Promise(r=>setTimeout(r,80));check(!document.querySelector('.gbc-scene'),'late load cannot revive');
 fail='get';start();await wait(ready);open();await wait(()=>control('画面组成'));check(status().includes('读取失败')&&document.querySelector('.gbc-scene').hidden&&control('GBC 模式').value==='reading','storage read fallback');stop();
 fail='';pendingGet=new Promise(()=>{});start();open();await wait(()=>control('画面组成'));expire();await Promise.resolve();await Promise.resolve();
 check(ready()&&status().includes('读取失败')&&status().includes('超时'),'hung get bounded default fallback');stop();check(timers.size===0,'dispose clears read timer');
 let finishGet;pendingGet=new Promise(r=>finishGet=r);start();open();await wait(()=>control('画面组成'));expire();await wait(ready);await choose('GBC 模式','focus');finishGet({mode:'reading'});pendingGet=null;await new Promise(r=>setTimeout(r,20));check(control('GBC 模式').value==='focus','late get cannot overwrite new state');stop();
 let rejectRead;pendingGet=new Promise((r,j)=>rejectRead=j);start();check(timers.size===1,'read timer armed');stop();check(timers.size===0,'dispose clears active read timer');rejectRead(Error('late read rejection'));pendingGet=null;await new Promise(r=>setTimeout(r,20));check(!document.querySelector('.gbc-scene'),'disposed read rejection cannot revive');
 pendingGet=null;start();await wait(ready);open();await wait(()=>control('画面组成'));
 let finishSet;pendingSet=new Promise(r=>finishSet=r);const count=writes;control('GBC 模式').value='reading';control('GBC 模式').dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();expire();await new Promise(r=>setTimeout(r,20));
 check(status().includes('保存结果未知')&&status().includes('未取消')&&!status().includes('已保存'),'hung set honest timeout');
 control('GBC 模式').dispatchEvent(new Event('change',{bubbles:true}));check(writes===count+1,'no concurrent writes');
 control('画面组成').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(()=>!control('GBC 本地设置'));control('Native input').focus();control('Native input').value='chat during hang';check(document.activeElement===control('Native input'),'chat while write blocked');
 open();await wait(()=>control('画面组成'));finishSet();pendingSet=null;await wait(ready);check(control('GBC 模式').value==='focus'&&status().includes('再次操作'),'late set releases lock without applying');
 let rejectRemove;pendingRemove=new Promise((r,j)=>rejectRemove=j);button('重置全部并清除图片').click();await Promise.resolve();expire();await new Promise(r=>setTimeout(r,20));check(status().includes('保存结果未知')&&control('GBC 模式').disabled,'hung reset unknown and blocked');rejectRemove(Error('late remove rejection'));pendingRemove=null;await wait(ready);check(control('GBC 模式').value==='focus'&&status().includes('再次操作'),'late reset rejection releases without applying');
 let releaseDisposed;pendingSet=new Promise(r=>releaseDisposed=r);control('GBC 模式').dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();stop();check(timers.size===0,'dispose clears write timer');
 // The replacement owner must also respect an outstanding uncancellable write.
 start();await wait(()=>control('GBC 模式'));open();await wait(()=>control('画面组成'));await new Promise(r=>setTimeout(r,20));const blockedCount=writes;control('GBC 模式').dispatchEvent(new Event('change',{bubbles:true}));check(writes===blockedCount&&status().includes('等待'),'replacement blocks unresolved write');stop();releaseDisposed();pendingSet=null;await new Promise(r=>setTimeout(r,20));check(!document.querySelector('.gbc-scene')&&timers.size===0,'disposed late write cannot revive');
 document.body.dataset.result='PASS';
 }catch(e){document.body.dataset.result='FAIL: '+e.message;}
})();`;
test('real Chromium plugin lifecycle, imports, storage, compositions and native controls',{timeout:60000},async()=>{
 const browser=[process.env.CHROMIUM_PATH, process.env.CONCERT_TEST_BROWSER, process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'), process.env.ProgramFiles&&join(process.env.ProgramFiles,'Microsoft/Edge/Application/msedge.exe'), process.env.ProgramFiles&&join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'),process.env['ProgramFiles(x86)']&&join(process.env['ProgramFiles(x86)'],'Microsoft/Edge/Application/msedge.exe'),'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].find(p=>p&&existsSync(p));
 assert.ok(browser,'Local Chromium required');
 const dir=mkdtempSync(join(tmpdir(),'gbc-plugin-'));
 const file=join(dir,'fixture.html');
 const script=source.replace(/^import .+;\r?\n/gm,'').replace('export default {','const plugin = {');
 writeFileSync(file,`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'"><style>body{margin:0}body::after{content:'';position:fixed;inset:0;pointer-events:none;background:rgba(16,16,20,0.42);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}[data-slot=composer-root]{-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}[data-slot=sidebar-wrapper]{display:flex}[data-slot=sidebar]{width:var(--sidebar-width,128px);flex-shrink:0}[data-slot=sidebar-inner]{min-height:100vh}main{flex:1;min-width:0}[data-slot=aui_thread-viewport]{width:100%}[data-slot=composer-rich-input]{box-sizing:border-box;width:100%;padding:12px;resize:vertical}[data-slot=composer-surface]{box-sizing:border-box}pre{white-space:pre}#contribution{position:fixed;right:0;bottom:0}</style><div data-slot="sidebar-wrapper"><nav data-slot="sidebar"><div data-slot="sidebar-inner"><button>Native navigation</button></div></nav><main><section data-slot="aui_thread-viewport"><article data-slot="aui_thread-content"><div data-slot="aui_assistant-message-content"><p>${"中文长文用于检查阅读与文本选择。".repeat(80)}</p><div data-slot="code-card"><pre>${"const longCode = 1234567890;".repeat(120)}</pre></div><details open><summary>工具输出</summary><pre data-terminal>${Array.from({length:12},(_,i)=>"工具行 "+i+" output ".repeat(60)).join("\n")}</pre></details></div></article></section><div data-slot="composer-bounds"><div data-slot="composer-dock"><div data-slot="composer-root"><div data-slot="composer-surface"><textarea aria-label="Native input" data-slot="composer-rich-input"></textarea></div></div></div></div></main></div><div id="contribution"></div><script>${adapter}\n${script}\n${probe}</script>`);
 for(const size of ['1280,800','1600,900','2560,1400','700,900','390,800','1600,600']){
  const child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-pipe','--user-data-dir='+join(dir,'profile-'+size.replace(',','-')),'--window-size='+size],{windowsHide:true,stdio:['ignore','ignore','pipe','pipe','pipe']});
  let sequence=0, buffer='', errors='';const requests=new Map();
  child.stderr.on('data',data=>errors+=data);
  child.stdio[4].on('data',data=>{buffer+=data;let end;while((end=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const message=JSON.parse(raw);if(message.id){const r=requests.get(message.id);requests.delete(message.id);message.error?r?.reject(Error(JSON.stringify(message.error))):r?.resolve(message.result);}}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;requests.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
  let browserExited=false;
  const exited=new Promise(resolve=>{child.once('error',error=>{errors+=error.message;for(const r of requests.values())r.reject(error);});child.once('exit',code=>{browserExited=true;for(const r of requests.values())r.reject(Error('Chromium exited '+code+': '+errors));requests.clear();resolve();});});
  const deadline=setTimeout(()=>{for(const r of requests.values())r.reject(Error('Chromium pipe timeout: '+errors));child.kill();},20000);
  try{
   const target=await send('Target.createTarget',{url:'about:blank'});
   const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
   await send('Page.enable',{},sessionId);
   await send('Emulation.setDeviceMetricsOverride',{width:Number(size.split(',')[0]),height:Number(size.split(',')[1]),deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:pathToFileURL(file).href},sessionId);
   let result;
   for(let i=0;i<300;i++){
    const response=await send('Runtime.evaluate',{expression:'document.body?.dataset.result',returnByValue:true},sessionId);
    result=response.result?.value;if(result)break;
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   const geometry=await send('Runtime.evaluate',{expression:'document.body.dataset.geometry',returnByValue:true},sessionId);
   console.log('Measured work geometry '+geometry.result.value);
   assert.equal(result,'PASS',size+': '+result);
   const keyboard = await send('Runtime.evaluate',{expression:`(async()=>{
    start();
    while(document.querySelector('[aria-label="GBC 模式"]').disabled)await new Promise(r=>setTimeout(r,10));
    [...document.querySelectorAll('button')].find(n=>n.textContent==='GBC 设置').click();
    await Promise.resolve();
    const controls=[...document.querySelectorAll('#gbc-settings input:not(:disabled),#gbc-settings select:not(:disabled),#gbc-settings button:not(:disabled)')];
    controls.forEach((n,i)=>n.dataset.keyboardIndex=String(i));
    [...document.querySelectorAll('button')].find(n=>n.textContent==='GBC 设置').focus();
    return controls.length;
   })()`,awaitPromise:true,returnByValue:true},sessionId);
   assert.ok(keyboard.result.value>5,'Settings have native controls');
   for(let i=0;i<keyboard.result.value;i++){
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9},sessionId);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9},sessionId);
    const focus=await send('Runtime.evaluate',{expression:'document.activeElement.dataset.keyboardIndex',returnByValue:true},sessionId);
    assert.equal(focus.result.value,String(i),'Actual keyboard Tab reaches every enabled setting');
   }
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
   const closed=await send('Runtime.evaluate',{expression:'!document.getElementById("gbc-settings")',returnByValue:true},sessionId);
   assert.equal(closed.result.value,true,'Actual keyboard Escape closes settings');
   await send('Runtime.evaluate',{expression:'stop()'},sessionId);
  }finally{clearTimeout(deadline);if(!browserExited)await send('Browser.close').catch(()=>{});await exited;}
  console.log('Plugin browser PASS '+size+' (exact viewport; SDK/hook adapter)');
 }
});
