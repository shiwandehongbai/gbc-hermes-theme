"""Deterministic local delivery; fixed public allowlist, without repository traversal or external access."""
import argparse
import hashlib
from pathlib import Path
import re
import stat
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
TEXT_FILES = ('plugin.js', 'README.md', 'README.en.md', 'THIRD-PARTY-NOTICES.md', 'RIGHTS.md', 'skins/togenashi-dream.yaml')
# Pin only the six reviewed derivatives, never arbitrary artwork.
ARTWORK = {
    'assets/roster/roster-playful-v1-momoka.webp': (84082, '1189357ae99a4bce74cdfb4be4a97fcd0589dda76ce82fd1c1988931c06501ba'),
    'assets/roster/roster-playful-v1-nina.webp': (80778, '4d6e0208a63e88c4c2da696b7f788a5ab92cce4d7021aa8f2218fd2efc0172e9'),
    'assets/roster/roster-playful-v1-subaru.webp': (70670, 'd80e005c2940c435635e7a95c707a4f82efe61765903f1e26aa3e7d5e0769393'),
    'assets/roster/roster-playful-v1-tomo.webp': (70416, '2b00e2dd75113e17830973104b8697bffa65d0d4082e31937297292a244e3683'),
    'assets/roster/roster-playful-v1-rupa.webp': (71734, 'f1060eb61421b8d6765abf319f5ade75cd0ea390c280fcb8edb9fda64bb51ff8'),
    'assets/wallpaper/togeari-upper.jpg': (1023445, '082c2d9ae66e90581b34cff28e8c22e45c34d7ae1950344d2142bf4070ef0ffb'),
}
FILES = TEXT_FILES + tuple(ARTWORK)
PREFIX = 'gbc-workbench/'
ARCHIVE = ROOT / 'dist' / 'gbc-workbench.zip'
MAX_BYTES = 512 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_ARCHIVE_BYTES = 16 * 1024 * 1024


def validate_text(name, data):
    if not 0 < len(data) <= MAX_BYTES:
        raise ValueError(f'Invalid size: {name}')
    text = data.decode('utf-8-sig')
    if re.search(r'(?i)(?<![a-z])[a-z]:[\\/]|/(?:Users|home)/|\\\\[a-z0-9_-]+\\', text):
        raise ValueError(f'Absolute machine path: {name}')
    if re.search(r'data:image/[^\s\"\']+;base64,[A-Za-z0-9+/]{16}', text):
        raise ValueError(f'Embedded private raster: {name}')
    if name == 'plugin.js':
        # Link/evaluate the packaged ES module with explicit host exports only.
        script = """
const vm = require('node:vm');
const source = require('node:fs').readFileSync(0, 'utf8');
(async () => {
 const context=vm.createContext({});
 const mod=new vm.SourceTextModule(source,{context});
 await mod.link(name => {
  const exports=name==='react'?['useEffect','useState']:name==='react/jsx-runtime'?['jsx']:null;
  if(!exports)throw Error('Unexpected dependency: '+name);
  return new vm.SyntheticModule(exports,function(){for(const key of exports)this.setExport(key,()=>{});},{context});
 });
 await mod.evaluate();
 if(mod.namespace.default?.id!=='gbc-workbench'||typeof mod.namespace.default?.register!=='function')throw Error('Invalid plugin entry');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
"""
        run = subprocess.run(['node', '--experimental-vm-modules', '-e', script],
                             input=text, text=True, capture_output=True, timeout=15)
        if run.returncode:
            raise ValueError('Packaged JS failed to load: ' + run.stderr.strip())


def validate_content(name, data):
    if name in TEXT_FILES:
        validate_text(name, data)
        return
    if name not in ARTWORK:
        raise ValueError(f'Unlisted asset: {name}')
    size, digest = ARTWORK[name]
    if not 0 < len(data) <= MAX_IMAGE_BYTES or len(data) != size:
        raise ValueError(f'Invalid image size: {name}')
    if name.endswith('.webp'):
        valid = (data[:4] == b'RIFF' and data[8:12] == b'WEBP'
                 and int.from_bytes(data[4:8], 'little') + 8 == len(data)
                 and data[12:16] in (b'VP8 ', b'VP8L', b'VP8X'))
    else:
        valid = data[:3] == b'\xff\xd8\xff' and data[-2:] == b'\xff\xd9'
    if not valid or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f'Image magic/content mismatch: {name}')


def safe_path(path):
    relative = path.relative_to(ROOT)
    current = ROOT
    for part in relative.parts:
        current = current / part
        if current.is_symlink() or (current.exists() and
                getattr(current.lstat(), 'st_file_attributes', 0) & 0x400):
            raise ValueError('Linked/reparse path rejected')
        if current.is_file() and current.stat().st_nlink != 1:
            raise ValueError('Hard-linked file rejected')
    if path.resolve() != ROOT / relative:
        raise ValueError('Resolved path mismatch')


def source_files():
    result = {}
    for name in FILES:
        path = ROOT / name
        safe_path(path)
        limit = MAX_IMAGE_BYTES if name in ARTWORK else MAX_BYTES
        if not path.is_file() or not 0 < path.stat().st_size <= limit:
            raise ValueError(f'Invalid source size: {name}')
        data = path.read_bytes()
        validate_content(name, data)
        result[name] = data
    return result


def check(expected):
    safe_path(ARCHIVE)
    if ARCHIVE.is_symlink() or ARCHIVE.resolve().parent != ROOT / 'dist':
        raise ValueError('Linked archive rejected')
    if ARCHIVE.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError('Archive too large')
    with zipfile.ZipFile(ARCHIVE) as archive:
        infos = archive.infolist()
        if sorted(i.filename for i in infos) != sorted(PREFIX + n for n in FILES):
            raise ValueError('Archive allowlist mismatch or duplicate entry')
        if archive.comment:
            raise ValueError('Unexpected archive metadata')
        for info in infos:
            name = info.filename[len(PREFIX):]
            if (info.file_size > (MAX_IMAGE_BYTES if name in ARTWORK else MAX_BYTES) or info.is_dir() or info.extra or info.comment
                    or stat.S_ISLNK(info.external_attr >> 16) or info.flag_bits & 1):
                raise ValueError(f'Invalid archive entry: {name}')
            data = archive.read(info)
            validate_content(name, data)
            if data != expected[name]:
                raise ValueError(f'Archive/source mismatch: {name}')
    digest = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    print(f'CHECK PASS: {PREFIX} ({len(FILES)} allowlisted files; JS linked/evaluated; six pinned images)')
    print(f'SHA256 {digest}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Read-only verification of existing ZIP')
    args = parser.parse_args()
    expected = source_files()
    if not args.check:
        safe_path(ARCHIVE)
        if ARCHIVE.parent.is_symlink() or ARCHIVE.parent.resolve() != ROOT / 'dist' or ARCHIVE.is_symlink():
            raise ValueError('Linked output rejected')
        ARCHIVE.parent.mkdir(exist_ok=True)
        with zipfile.ZipFile(ARCHIVE, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, data in expected.items():
                info = zipfile.ZipInfo(PREFIX + name, date_time=(2026, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED)
        print('BUILT dist/gbc-workbench.zip')
    check(expected)


if __name__ == '__main__':
    main()
