import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const candidates=process.env.PYTHON ? [process.env.PYTHON] : ['python3','python','py'];
const python=candidates.find(command=>spawnSync(command,['-c','import sys; assert sys.version_info >= (3,11)'],{encoding:'utf8',windowsHide:true}).status===0);
function run(args){assert.ok(python,'Python 3.11+ required; set PYTHON to its executable');const r=spawnSync(python,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:60000});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);return r.stdout;}
test('release packager has the exact public installation allowlist',()=>{
 const result=run(['-B','-c',`import runpy,json; print(json.dumps(runpy.run_path('tools/package_theme.py')['FILES']))`]);
 assert.deepEqual(JSON.parse(result).sort(),['plugin.js','README.md','README.en.md','THIRD-PARTY-NOTICES.md','RIGHTS.md','skins/togenashi-dream.yaml',...['momoka','nina','subaru','tomo','rupa'].map(n=>'assets/roster/roster-playful-v1-'+n+'.webp'),'assets/wallpaper/togeari-upper.jpg'].sort());
});
test('release builds, checks and extracts identical standalone files',{timeout:60000},()=>{
 console.log(run(['-B','tools/package_theme.py']));
 console.log(run(['-B','tools/package_theme.py','--check']));
 const extracted=JSON.parse(run(['-B','-c',`
import runpy,zipfile,tempfile,pathlib,hashlib,json
m=runpy.run_path('tools/package_theme.py'); root=pathlib.Path.cwd()
with zipfile.ZipFile(m['ARCHIVE']) as z:
 names=[m['PREFIX']+n for n in m['FILES']]
 assert sorted(z.namelist())==sorted(names)
 target=pathlib.Path(tempfile.mkdtemp(prefix='gbc-release-'))
 z.extractall(target)
 assert sorted(str(p.relative_to(target)).replace(chr(92),'/') for p in target.rglob('*') if p.is_file())==sorted(names)
 for name in m['FILES']:
  data=(target/m['PREFIX']/name).read_bytes()
  assert hashlib.sha256(data).digest()==hashlib.sha256((root/name).read_bytes()).digest()
  m['validate_content'](name,data)
 # Every image is loaded from this new directory, never from the checkout.
 images=''.join('<img src="'+n+'">' for n in m['ARTWORK'])
 html='<meta http-equiv="Content-Security-Policy" content="default-src '+chr(39)+'none'+chr(39)+'; img-src '+chr(39)+'self'+chr(39)+'; script-src '+chr(39)+'unsafe-inline'+chr(39)+'"><body>'+images+'<script>window.onload=()=>{document.body.dataset.result=[...document.images].length===6&&[...document.images].every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0&&i.naturalWidth<=16384&&i.naturalHeight<=16384&&i.naturalWidth*i.naturalHeight<=64000000)?"PASS":"FAIL"}</script>'
 fixture=target/m['PREFIX']/'decode.html'; fixture.write_text(html,encoding='utf-8')
 print(json.dumps({'fixture':str(fixture),'profile':str(target/'browser-profile')}))
`]));
 const browser=[process.env.CHROMIUM_PATH,process.env.CONCERT_TEST_BROWSER,
 ...[process.env.ProgramFiles,process.env['ProgramFiles(x86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google/Chrome/Application/chrome.exe'),join(p,'Microsoft/Edge/Application/msedge.exe')]),
 '/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].find(p=>p&&existsSync(p));
 assert.ok(browser,'Local Chromium required; set CHROMIUM_PATH');
 const decoded=spawnSync(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--user-data-dir='+extracted.profile,'--dump-dom','--virtual-time-budget=5000',pathToFileURL(extracted.fixture).href],{encoding:'utf8',windowsHide:true,timeout:30000});
 assert.equal(decoded.status,0,decoded.stderr);
 assert.match(decoded.stdout,/data-result="PASS"/,'six extracted images decode without external resources');
 console.log('EXTRACT PASS: 12 exact files, SHA256 equality, isolated JS link/evaluation, six Chromium-decoded local images');
 const first=readFileSync(new URL('../dist/gbc-workbench.zip',import.meta.url));
 run(['-B','tools/package_theme.py']);
 assert.deepEqual(readFileSync(new URL('../dist/gbc-workbench.zip',import.meta.url)),first,'deterministic ZIP');
});

test('release rejects unlisted images, corrupt bytes, oversized text and duplicate ZIP entries',()=>{
 console.log(run(['-B','-c',`
import runpy,zipfile,tempfile,pathlib,warnings
m=runpy.run_path('tools/package_theme.py'); validate=m['validate_content']
def rejects(fn):
 try: fn()
 except (ValueError,UnicodeError): return
 raise AssertionError('Invalid content accepted')
name=next(iter(m['ARTWORK'])); data=(m['ROOT']/name).read_bytes()
rejects(lambda:validate('assets/roster/other.webp',data))
rejects(lambda:validate(name,b'XXXX'+data[4:]))
rejects(lambda:validate(name,data[:-1]))
rejects(lambda:validate(name,data[:-1]+bytes([data[-1]^1])))
rejects(lambda:validate('README.md',b'x'*(m['MAX_BYTES']+1)))
rejects(lambda:validate('README.md',b'C:'+bytes([92])+b'Users'+bytes([92])+b'example'))
# Run the actual checker against an isolated duplicate-entry archive.
root=pathlib.Path(tempfile.mkdtemp(prefix='gbc-invalid-')); (root/'dist').mkdir()
archive=root/'dist'/'gbc-workbench.zip'; expected=m['source_files']()
with warnings.catch_warnings():
 warnings.simplefilter('ignore',UserWarning)
 with zipfile.ZipFile(archive,'w') as z:
  for n,d in expected.items(): z.writestr(m['PREFIX']+n,d)
  z.writestr(m['PREFIX']+'README.md',expected['README.md'])
g=m['check'].__globals__; g['ROOT']=root; g['ARCHIVE']=archive
rejects(lambda:m['check'](expected))
print('REJECTION PASS: unknown image, magic/hash/size, machine path, duplicate ZIP')
`]));
});
