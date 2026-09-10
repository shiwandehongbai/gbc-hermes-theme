import { useEffect, useState } from 'react';
import { jsx } from 'react/jsx-runtime';

const ROOT_ATTRIBUTE = 'data-gbc-workbench';
const OWNER = Symbol.for('gbc.workbench.owner');
const WRITE = Symbol.for('gbc.workbench.pending-write');
const STORAGE_TIMEOUT = 8000;
const MODES = ['full-stage', 'reading', 'focus'];
const LABELS = ['演出', '工作', '安静'];
const ROSTER = [
  ['01 桃香', 'roster-playful-v1-momoka.webp'],
  ['02 仁菜', 'roster-playful-v1-nina.webp'],
  ['03 昴', 'roster-playful-v1-subaru.webp'],
  ['04 智', 'roster-playful-v1-tomo.webp'],
  ['05 RUPA', 'roster-playful-v1-rupa.webp'],
];



// Tokens, component surfaces, then mode and static crop overrides.
const CSS = `
:root[data-gbc-workbench] {
  --gbc-shell: #353851b8;
  --gbc-surface: #253244f5;
  --gbc-solid: #253244;
  --gbc-glass: rgba(25, 38, 57, 0.42);
  --gbc-glass-filter: blur(6px) saturate(.8);
  --gbc-quiet: #242938;
  --gbc-text: #f4f1f3;
  --gbc-border: #696583;
  --gbc-accent: #f46aa8;
  --gbc-on-accent: #242938;
  --gbc-status-size: 12px;
  --gbc-status-line: 16px;
  --gbc-clear: transparent;
  --gbc-flat-shadow: none;
  --gbc-radius: 8px;
  --gbc-surface-padding: 12px;
  --gbc-functional-size: 14px;
  --gbc-body-size: 16px;
  --gbc-content-width: 35rem;
  --gbc-sidebar-width: 8rem;
  --gbc-line-height: 1.65;
  --gbc-content-gap: 24px;
  --gbc-shell-current: var(--gbc-shell);
  --gbc-surface-current: var(--gbc-surface);
  --ui-editor-surface-background: var(--gbc-shell-current);
  --ui-bg-chrome: var(--gbc-clear);
  --ui-sidebar-surface-background: var(--gbc-shell-current);
  --ui-chat-surface-background: var(--gbc-clear);
  --gbc-wallpaper-image: none;
  --gbc-wallpaper-mask: rgba(16, 16, 20, 0.42);
  --gbc-wallpaper-position: 50% 50%;
  --gbc-wallpaper-size: cover;
  --gbc-wallpaper-repeat: no-repeat;
}

:root[data-gbc-workbench] body {
  background-color: var(--gbc-quiet);
  isolation: isolate;
}

/* Keep settings readable throughout the host's translucency peek lifecycle. */
:root[data-gbc-workbench] [data-overlay-surface]:has([data-translucency-peek-scope]) {
  opacity: 1;
  transition: none;
}

/* Keep the native veil tint while removing its full-window wallpaper blur. */
:root[data-gbc-workbench] body::after {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

:root[data-gbc-workbench] [data-contrib-shell],
:root[data-gbc-workbench] [data-chat-surface],
:root[data-gbc-workbench] [data-slot="composer-bounds"],
:root[data-gbc-workbench] [data-slot="sidebar-wrapper"],
:root[data-gbc-workbench] [data-slot="sidebar"] {
  background: var(--gbc-clear);
}
:root[data-gbc-workbench] [data-slot="sidebar-wrapper"] {
  --sidebar-width: var(--gbc-sidebar-width);
}
:root[data-gbc-workbench] [data-slot="sidebar-inner"] {
  background: var(--gbc-shell-current);
  border-inline-end: 1px solid var(--gbc-border);
  font-size: var(--gbc-functional-size);
}
:root[data-gbc-workbench] [data-slot="sidebar"] {
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-slot="sidebar"] button,
:root[data-gbc-workbench] [data-slot="sidebar"] [role="tab"],
:root[data-gbc-workbench] [data-slot="sidebar"] label {
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-sidebar="menu-button"] {
  color: var(--gbc-text);
  font-size: var(--gbc-functional-size);
  min-height: 32px;
}
:root[data-gbc-workbench] [data-sidebar="menu-button"][data-active="true"] {
  border-inline-start: 2px solid var(--gbc-accent);
}
:root[data-gbc-workbench] [data-slot="aui_intro"] .wordmark {
  --fit-min: 2.25rem;
  --fit-max: 5.5rem;
  color: var(--gbc-text);
  mix-blend-mode: normal;
  opacity: 0.85;
}
:root[data-gbc-workbench] [data-slot="aui_intro"] > div > p:last-child {
  max-width: 36rem;
  font-size: var(--gbc-body-size);
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-slot="aui_thread-viewport"] {
  min-width: 0;
  background: var(--gbc-clear);
}
:root[data-gbc-workbench] [data-slot="aui_thread-content"] {
  box-sizing: border-box;
  width: calc(100% - 24px);
  min-width: 0;
  max-width: var(--gbc-content-width);
  margin-inline: 12px auto;
  padding-inline: clamp(12px, 3vw, var(--gbc-content-gap));
  font-size: var(--gbc-body-size);
  line-height: var(--gbc-line-height);
  background: var(--gbc-surface-current);
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-slot="aui_thread-content"] pre {
  min-width: 0;
  max-width: 100%;
  font-size: var(--gbc-functional-size);
  line-height: var(--gbc-line-height);
  overflow-x: auto;
}
:root[data-gbc-workbench] [data-slot="aui_user-message-root"] {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  margin-inline-start: auto;
  padding: var(--gbc-surface-padding);
  background: var(--gbc-surface-current);
  color: var(--gbc-text);
  border-inline-start: 1px solid var(--gbc-border);
  border-radius: var(--gbc-radius);
  font-size: var(--gbc-body-size);
  line-height: var(--gbc-line-height);
  overflow-wrap: anywhere;
}
:root[data-gbc-workbench] [data-slot="aui_assistant-message-root"] {
  min-width: 0;
  background: var(--gbc-clear);
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-slot="aui_assistant-message-content"] {
  min-width: 0;
  max-width: 100%;
  font-size: var(--gbc-body-size);
  line-height: var(--gbc-line-height);
  overflow-wrap: anywhere;
}
:root[data-gbc-workbench] [data-slot="code-card"],
:root[data-gbc-workbench] [data-slot="file-diff-panel"],
:root[data-gbc-workbench] [data-terminal],
:root[data-gbc-workbench] [data-slot="aui_assistant-message-content"] details {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  background: var(--gbc-surface-current);
  border: 1px solid var(--gbc-border);
  border-radius: var(--gbc-radius);
  box-shadow: var(--gbc-flat-shadow);
  font-size: var(--gbc-functional-size);
  line-height: var(--gbc-line-height);
}
:root[data-gbc-workbench] [data-slot="aui_assistant-message-content"] summary {
  padding: var(--gbc-surface-padding);
  font-size: var(--gbc-functional-size);
  line-height: var(--gbc-line-height);
  overflow-wrap: anywhere;
}
:root[data-gbc-workbench] [data-slot="composer-dock"] {
  min-width: 0;
  background: var(--gbc-clear);
}
:root[data-gbc-workbench] [data-slot="composer-root"] {
  box-sizing: border-box;
  width: calc(100% - 24px);
  min-width: 0;
  max-width: var(--gbc-content-width);
  margin-inline: 12px auto;
  padding-inline: 0;
}
:root[data-gbc-workbench] [data-slot="composer-surface"] {
  min-width: 0;
  background: var(--gbc-surface-current);
  color: var(--gbc-text);
  box-shadow: var(--gbc-flat-shadow);
  border: 1px solid var(--gbc-border);
  border-radius: 12px;
}
:root[data-gbc-workbench] [data-slot="composer-surface"]:focus-within {
  border-color: var(--gbc-accent);
}
:root[data-gbc-workbench] [data-slot="composer-rich-input"] {
  background: var(--gbc-clear);
  color: var(--gbc-text);
  font-size: var(--gbc-body-size);
  line-height: var(--gbc-line-height);
}
:root[data-gbc-workbench] [data-slot="composer-attachments"],
:root[data-gbc-workbench] [data-slot="composer-status-stack"] {
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  background: var(--gbc-clear);
  font-size: var(--gbc-functional-size);
  line-height: var(--gbc-line-height);
}
:root[data-gbc-workbench] [data-slot="composer-completion-drawer"],
:root[data-gbc-workbench] [data-slot="dropdown-menu-content"],
:root[data-gbc-workbench] [data-slot="select-content"],
:root[data-gbc-workbench] [data-sonner-toast] {
  background: var(--gbc-solid);
  color: var(--gbc-text);
  border: 1px solid var(--gbc-border);
  border-radius: var(--gbc-radius);
  box-shadow: var(--gbc-flat-shadow);
  font-size: var(--gbc-functional-size);
  line-height: var(--gbc-line-height);
}
:root[data-gbc-workbench] [data-slot="dropdown-menu-item"],
:root[data-gbc-workbench] [data-slot="command-item"] {
  font-size: var(--gbc-functional-size);
  line-height: var(--gbc-line-height);
}
:root[data-gbc-workbench] .gbc-mode-select {
  font-size: var(--gbc-functional-size);
  color: var(--gbc-text);
  background: var(--gbc-solid);
  border: 1px solid var(--gbc-border);
  border-radius: 6px;
  padding: 4px 8px;
  max-width: 100%;
}
:root[data-gbc-workbench] .gbc-mode-select:focus-visible {
  outline: 2px solid var(--gbc-accent);
  outline-offset: 2px;
}

/* Native idle voice, send and stop icons retain currentColor and host states. */
:root[data-gbc-workbench] [data-slot="composer-surface"] button[type="submit"],
:root[data-gbc-workbench] [data-slot="composer-surface"] button[type="button"].rounded-full.bg-foreground {
  background: var(--gbc-accent);
  color: var(--gbc-on-accent);
}
/* The native inline span paints each ragged line, not the portal wrapper. */
:root[data-gbc-workbench] [data-slot="tooltip-content"] {
  background: var(--gbc-clear);
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-slot="tooltip-content"] > span {
  background: var(--gbc-solid);
  color: var(--gbc-text);
}
:root[data-gbc-workbench] [data-slot="tooltip-content"] > span span,
:root[data-gbc-workbench] [data-slot="tooltip-content"] > span kbd {
  color: var(--gbc-text);
}
:root[data-gbc-workbench] .gbc-status-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  height: 20px;
  max-height: 20px;
  flex-shrink: 0;
}
:root[data-gbc-workbench] .gbc-status-controls > select,
:root[data-gbc-workbench] .gbc-status-controls > button {
  box-sizing: border-box;
  height: 18px;
  max-height: 18px;
  min-height: 0;
  padding: 0 6px;
  font-size: var(--gbc-status-size);
  line-height: var(--gbc-status-line);
  background: var(--gbc-solid);
  color: var(--gbc-text);
  border: 1px solid var(--gbc-border);
  border-radius: 6px;
}

:root[data-gbc-workbench="reading"] {
  --gbc-wallpaper-mask: rgba(16, 16, 20, 0.42);
  --gbc-shell-current: var(--gbc-wallpaper-mask);
  --gbc-surface-current: var(--gbc-glass);
  --gbc-content-width: 100%;
  --gbc-sidebar-width: 8rem;
  --gbc-line-height: 1.85;
  --gbc-content-gap: 32px;
}
:root[data-gbc-workbench="focus"] {
  --gbc-wallpaper-mask: rgba(16, 16, 20, 0.9);
  --gbc-shell-current: var(--gbc-wallpaper-mask);
  --gbc-surface-current: var(--gbc-solid);
  --gbc-content-width: 100%;
  --gbc-sidebar-width: 7rem;
  --gbc-line-height: 1.75;
  --gbc-content-gap: 20px;
}
@media (max-width: 1100px), (max-height: 650px) {
  :root[data-gbc-workbench="full-stage"] { --gbc-surface-current: var(--gbc-solid); }
}
/* The scene owns its cover canvas; no native navigation is hidden. */
:root[data-gbc-workbench] .gbc-scene { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
:root[data-gbc-workbench] .gbc-canvas { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
:root[data-gbc-workbench] .gbc-background { width: 100%; height: 100%; display: block; }
:root[data-gbc-workbench] .gbc-figure { position: absolute; object-fit: contain; object-position: center bottom; }
:root[data-gbc-workbench] .gbc-settings { position: fixed; right: 12px; bottom: 40px; width: min(360px, calc(100vw - 24px)); max-height: calc(100vh - 80px); overflow: auto; box-sizing: border-box; padding: 16px; background: var(--gbc-solid); color: var(--gbc-text); border: 1px solid var(--gbc-border); border-radius: var(--gbc-radius); font-size: var(--gbc-functional-size); z-index: 50; }
:root[data-gbc-workbench] .gbc-settings label { display: block; margin-block: 12px; }
:root[data-gbc-workbench] .gbc-settings input { max-width: 100%; }
:root[data-gbc-workbench] #gbc-sidebar-roster {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 2px;
  padding: 8px 2px;
  color: var(--gbc-text);
}
:root[data-gbc-workbench] .gbc-sidebar-member {
  min-width: 0;
  text-align: center;
  font-size: var(--gbc-functional-size);
  overflow-wrap: anywhere;
}
:root[data-gbc-workbench] .gbc-sidebar-member img {
  display: block;
  width: 100%;
  height: 44px;
  object-fit: contain;
}
:root[data-gbc-workbench] .gbc-roster { display: flex; gap: 8px; flex-wrap: wrap; }
:root[data-gbc-workbench] .gbc-portrait { width: 42px; height: 50px; display: block; }
:root[data-gbc-workbench="focus"] .gbc-scene { opacity: 0.08; }
:root[data-gbc-workbench="reading"] .gbc-scene { opacity: 0.95; }
/* One local glass layer per work surface; nested messages do not stack masks. */
:root[data-gbc-workbench="reading"] [data-slot="aui_thread-content"],
:root[data-gbc-workbench="reading"] [data-slot="composer-surface"] {
  -webkit-backdrop-filter: var(--gbc-glass-filter);
  backdrop-filter: var(--gbc-glass-filter);
}
:root[data-gbc-workbench="reading"] [data-slot="composer-root"] {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
:root[data-gbc-workbench="reading"] [data-slot="aui_user-message-root"],
:root[data-gbc-workbench="reading"] [data-slot="aui_assistant-message-content"] details {
  background: var(--gbc-clear);
}
:root[data-gbc-workbench="reading"] [data-slot="code-card"],
:root[data-gbc-workbench="reading"] [data-slot="file-diff-panel"],
:root[data-gbc-workbench="reading"] [data-terminal],
:root[data-gbc-workbench="reading"] [data-slot="aui_thread-content"] pre,
:root[data-gbc-workbench="reading"] [data-slot="aui_assistant-message-content"] table {
  background: var(--gbc-solid);
  color: var(--gbc-text);
}
`;

const DEFAULTS = { artwork: 'single-wallpaper', wallpaperScale: 100, wallpaperX: 50, wallpaperY: 50, mode: 'reading', scale: 50, feet: 78, preset: 'text', background: null, figure: null };
const KEY = 'workbench-v1';
const LIMIT = 8 * 1024 * 1024;
const REGIONS = [['SUBARU', .08, .10063, .15667, .31447], ['MOMOKA', .29667, .13208, .12667, .27673], ['NINA', .49, .12579, .12, .25157], ['TOMO', .65333, .16352, .13667, .24528], ['RUPA', .84, .06918, .11667, .28302]];
const bounded = (value, low, high, fallback) => Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;

// User imports accept only raster bytes; roster paths are a separate fixed allowlist.
async function raster(data, figure = false) {
  const pattern = figure ? /^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+={0,2}$/ : /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  if (typeof data !== 'string' || data.length > LIMIT * 1.4 || !pattern.test(data)) throw Error('只接受有界 PNG / JPEG / WebP 图片；人物须为 PNG / WebP');
  const bytes = Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), c => c.charCodeAt(0));
  if (bytes.length > LIMIT) throw Error('图片超过 8 MiB');
  const mime = data.slice(5, data.indexOf(';'));
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!(mime === 'image/png' && png || mime === 'image/jpeg' && jpeg || mime === 'image/webp' && webp)) throw Error('图片格式与内容不符');
  const image = new Image();
  image.src = data;
  try {
    await image.decode();
    const w = image.naturalWidth, h = image.naturalHeight;
    if (!w || !h || w > 8192 || h > 8192 || w * h > 24000000) throw Error('原图尺寸须不超过 8192 边长 / 2400 万像素');
    const ratio = Math.min(1, 2560 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * ratio)); canvas.height = Math.max(1, Math.round(h * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw Error('本地图片处理不可用');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (figure) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = false;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 255) { transparent = true; break; }
      if (!transparent) throw Error('人物图需要透明背景');
    }
    const url = canvas.toDataURL(figure ? 'image/png' : 'image/webp', .9);
    if (url.length > LIMIT) throw Error('处理后的图片仍过大，请缩小原图');
    return { url, width: canvas.width, height: canvas.height };
  } finally { image.removeAttribute('src'); }
}
function readFile(file) {
  if (!file || file.size > LIMIT || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return Promise.reject(Error('请选择不超过 8 MiB 的本地 raster 图片'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error('本地图片读取失败'));
    reader.onabort = () => reject(Error('本地图片读取已取消'));
    reader.readAsDataURL(file);
  });
}

export default {
  id: 'gbc-workbench', name: 'GBC Workbench',
  register(ctx, clock = globalThis) {
    globalThis[OWNER]?.dispose();
    const root = document.documentElement;
    const previous = root.getAttribute(ROOT_ATTRIBUTE);
    const style = document.createElement('style'); style.id = 'gbc-workbench-style'; style.textContent = CSS;
    const scene = document.createElement('div'); scene.className = 'gbc-scene'; scene.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('div'); canvas.className = 'gbc-canvas';
    const background = document.createElement('img'); background.className = 'gbc-background'; background.alt = '';
    const figure = document.createElement('img'); figure.className = 'gbc-figure'; figure.alt = '';
    canvas.append(background, figure); scene.append(canvas);
    let state = { ...DEFAULTS }, disposed = false, generation = 0, ready = false, busy = false, status = '正在读取本地设置…';
    const subscribers = new Set(), waits = new Set();
    let writeLock = globalThis[WRITE], waitingWrite = Boolean(writeLock);
    const blocked = () => busy || Boolean(globalThis[WRITE]);
    const writeReleased = () => {
      if (!alive() || !waitingWrite) return;
      waitingWrite = false; status = '此前存储请求已结束，当前画面未变；可再次操作保存'; notify();
    };
    writeLock?.listeners.add(writeReleased);
    function storageWait(operation, message, onTimeout = () => {}) {
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, value) => {
          if (done) return; done = true; clock.clearTimeout(timer); waits.delete(cancel); fn(value);
        };
        const cancel = () => finish(reject, Error('插件已停用'));
        const timer = clock.setTimeout(() => { onTimeout(); finish(reject, Error(message)); }, STORAGE_TIMEOUT);
        waits.add(cancel);
        Promise.resolve(operation).then(value => finish(resolve, value), error => finish(reject, error));
      });
    }
    const alive = () => !disposed && globalThis[OWNER] === owner;
    const notify = () => { if (alive()) subscribers.forEach(fn => fn({ state, ready, busy: blocked(), status })); };
    function geometry() {
      if (!alive()) return;
      const W = window.innerWidth, H = window.innerHeight;
      const asset = state.background;
      scene.hidden = !asset;
      if (!asset) { scene.style.backgroundImage = 'none'; figure.hidden = true; return; }
      const single = state.artwork === 'single-wallpaper';
      scene.style.backgroundImage = single ? `url("${asset.url}")` : 'none';
      scene.style.backgroundRepeat = 'no-repeat';
      scene.style.backgroundPosition = `${state.wallpaperX}% ${state.wallpaperY}%`;
      const nativeCover = Math.max(W / asset.width, H / asset.height);
      scene.style.backgroundSize = state.wallpaperScale === 100 ? 'cover' : `${asset.width * nativeCover * state.wallpaperScale / 100}px auto`;
      canvas.hidden = single;
      if (single) { figure.hidden = true; return; }
      const cover = Math.max(W / asset.width, H / asset.height), cw = asset.width * cover, ch = asset.height * cover;
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
      const fraction = (W <= 1400 ? .42 : .50) * state.scale / 50;
      const left = cw * (W <= 1400 ? .53 : .45), foot = ch * state.feet / 100;
      const fw = cw * fraction, fh = Math.max(0, foot - ch * .05);
      Object.assign(figure.style, { left: left + 'px', width: fw + 'px', height: fh + 'px', bottom: (ch - foot) + 'px' });
      let safe = false;
      if (state.figure && W > 1100 && H > 650 && state.mode !== 'focus') {
        const shownW = Math.min(fw, fh * state.figure.width / state.figure.height), shownH = shownW * state.figure.height / state.figure.width;
        const x = (W - cw) / 2 + left + (fw - shownW) / 2, y = (H - ch) / 2 + foot - shownH;
        // Respect the actual native reading/input geometry, including expanded navigation.
        const surfaces = [...document.querySelectorAll('[data-slot="aui_thread-content"], [data-slot="composer-root"]')].map(n => n.getBoundingClientRect()).filter(r => r.width && r.height);
        safe = x >= 0 && x + shownW <= W && y >= 0 && y + shownH <= H && surfaces.every(r => x >= r.right + 8 || x + shownW <= r.left - 8 || y >= r.bottom + 8 || y + shownH <= r.top - 8);
      }
      figure.hidden = !safe;
    }
    function apply() {
      if (!alive()) return;
      root.setAttribute(ROOT_ATTRIBUTE, state.mode);
      for (const [node, asset] of [[background, state.background], [figure, state.figure]]) {
        if (asset && state.artwork === 'separate-layers') node.src = asset.url; else node.removeAttribute('src');
      }
      geometry(); notify();
    }
    const roster = document.createElement('div');
    roster.id = 'gbc-sidebar-roster';
    roster.setAttribute('role', 'group'); roster.setAttribute('aria-label', 'GBC 五人阵容');
    const members = ROSTER.map(([label]) => {
      const member = document.createElement('div'); member.className = 'gbc-sidebar-member';
      member.setAttribute('aria-label', label); member.title = label; roster.append(member); return member;
    });
    const pendingPortraits = new Set();
    let rosterStarted = false, rosterSpine = [];
    // Watch direct children on the sidebar ancestor spine only. Message subtrees,
    // attributes and character data are never observed or rewritten.
    const rosterObserver = new MutationObserver(syncRoster);
    function syncRoster() {
      if (!alive()) return;
      const sidebar = document.querySelector('[data-slot="sidebar-content"]');
      if (sidebar && sidebar.firstElementChild !== roster) sidebar.prepend(roster);
      const anchor = sidebar || ['sidebar-inner', 'sidebar', 'sidebar-wrapper'].map(slot => document.querySelector(`[data-slot="${slot}"]`)).find(Boolean) || document.querySelector('[data-contrib-shell]') || document.body;
      const spine = [];
      for (let node = anchor; node && node !== root; node = node.parentElement) spine.push(node);
      if (spine.length !== rosterSpine.length || spine.some((node, i) => node !== rosterSpine[i])) {
        rosterObserver.disconnect(); rosterSpine = spine;
        for (const node of spine) rosterObserver.observe(node, { childList: true });
      }
      if (sidebar && !rosterStarted) { rosterStarted = true; void loadRoster(); }
    }
    async function loadRoster() {
      try {
        const desktop = window.hermesDesktop;
        // The legacy resolver used desktopPluginsRoot; newer hosts expose this name.
        const getRoot = desktop?.getDesktopPluginsDir ?? desktop?.desktopPluginsRoot;
        if (typeof getRoot !== 'function' || typeof desktop?.readFileDataUrl !== 'function') return;
        const directory = await getRoot.call(desktop);
        if (!alive() || typeof directory !== 'string' || !directory.trim()) return;
        const base = directory.replace(/[\\/]+$/, '') + '/gbc-workbench/assets/roster/';
        await Promise.all(ROSTER.map(async ([, filename], index) => {
          let image;
          try {
            const data = await desktop.readFileDataUrl(base + filename);
            if (!alive() || typeof data !== 'string' || data.length > LIMIT * 1.4 ||
                !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) return;
            image = new Image(); image.alt = ''; pendingPortraits.add(image); image.src = data;
            await image.decode();
            if (!alive() || !image.naturalWidth || !image.naturalHeight || image.naturalWidth > 8192 ||
                image.naturalHeight > 8192 || image.naturalWidth * image.naturalHeight > 24000000) return;
            members[index].prepend(image);
          } catch { /* A missing or invalid local portrait retains its title and accessible name. */ }
          finally {
            pendingPortraits.delete(image);
            if (image && (!alive() || !image.parentElement)) image.removeAttribute('src');
          }
        }));
      } catch { /* Missing host API/root retains titles and accessible names without visible text. */ }
    }
    const resize = new ResizeObserver(geometry);
    function observe() {
      syncRoster();
      resize.disconnect(); resize.observe(document.body);
      document.querySelectorAll('[data-slot="aui_thread-content"], [data-slot="composer-root"], [data-slot="sidebar"]').forEach(n => resize.observe(n));
      geometry();
    }
    const owner = { dispose() {
      if (disposed) return; disposed = true; generation++;
      for (const cancel of [...waits]) cancel();
      rosterObserver.disconnect(); rosterSpine = []; roster.remove();
      for (const image of [...pendingPortraits, ...roster.querySelectorAll('img')]) image.removeAttribute('src');
      pendingPortraits.clear();
      writeLock?.listeners.delete(writeReleased);
      window.removeEventListener('resize', observe); document.removeEventListener('click', observe); document.removeEventListener('focusin', observe);
      resize.disconnect(); subscribers.clear(); scene.style.backgroundImage = 'none'; background.removeAttribute('src'); figure.removeAttribute('src'); scene.remove(); style.remove();
      if (globalThis[OWNER] !== owner) return;
      if (previous === null) root.removeAttribute(ROOT_ATTRIBUTE); else root.setAttribute(ROOT_ATTRIBUTE, previous);
      delete globalThis[OWNER];
    } };
    globalThis[OWNER] = owner;
    async function change(patch, fileKey, file, reset = false) {
      if (!alive() || !ready || blocked()) return;
      busy = true; status = '正在校验与保存…'; notify();
      const token = ++generation;
      try {
        const next = reset ? { ...DEFAULTS } : { ...state, ...patch };
        if (fileKey) next[fileKey] = await raster(await readFile(file), fileKey === 'figure');
        if (!alive() || token !== generation) return;
        // Serialize UI writes; only successful durable changes replace the live state.
        const operation = reset ? ctx.storage.remove(KEY) : ctx.storage.set(KEY, next);
        writeLock = { listeners: new Set([writeReleased]) }; globalThis[WRITE] = writeLock;
        const lock = writeLock;
        const release = () => {
          if (globalThis[WRITE] === lock) delete globalThis[WRITE];
          for (const fn of lock.listeners) fn();
          lock.listeners.clear();
        };
        Promise.resolve(operation).then(release, release);
        await storageWait(operation, '保存结果未知：存储超时，底层请求未取消；等待其结束后才能再次保存，可关闭设置继续聊天', () => { waitingWrite = true; });
        if (!alive() || token !== generation) return;
        state = next; status = reset ? '已重置并清除本地设置' : '已保存到本地'; apply();
      } catch (error) {
        if (alive() && token === generation) status = waitingWrite ? error.message : '未保存：' + (error?.message || '本地存储不可用');
      } finally { if (alive() && token === generation) { busy = false; notify(); } }
    }
    function Settings() {
      const [snapshot, setSnapshot] = useState({ state, ready, busy: blocked(), status });
      const [open, setOpen] = useState(false);
      useEffect(() => { subscribers.add(setSnapshot); setSnapshot({ state, ready, busy: blocked(), status }); return () => subscribers.delete(setSnapshot); }, []);
      const s = snapshot.state, disabled = !snapshot.ready || snapshot.busy || !alive();
      const select = jsx('select', { className: 'gbc-mode-select', 'aria-label': 'GBC 模式', value: s.mode, disabled,
        onChange: e => { if (MODES.includes(e.target.value)) void change({ mode: e.target.value }); },
        children: MODES.map((mode, i) => jsx('option', { value: mode, children: LABELS[i] }, mode)) });
      const separate = s.artwork === 'separate-layers';
      const field = (label, control) => jsx('label', { children: [label, control] }, label);
      const button = (text, onClick) => jsx('button', { type: 'button', disabled, onClick, children: text }, text);
      const upload = (key, label, accept) => field(label, jsx('input', { type: 'file', accept, disabled, 'aria-label': label,
        onChange: e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void change({}, key, file); } }));
      return jsx('div', { className: 'gbc-status-controls', children: [select, jsx('button', { type: 'button', 'aria-expanded': open, 'aria-controls': 'gbc-settings', onClick: () => setOpen(!open), children: 'GBC 设置' }),
        open && jsx('section', { id: 'gbc-settings', className: 'gbc-settings', 'aria-label': 'GBC 本地设置', onKeyDown: e => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.previousElementSibling?.focus(); } }, children: [
          jsx('p', { children: '本地导入，不上传。默认使用 Hermes 本地合成的单张原人物壁纸，不进行 AI 重绘。默认工作模式以宽幅轻透毛玻璃保护正文和输入，壁纸可透出，代码与表格保持实心可读；演出模式用于主动展示；安静模式淡化整张壁纸，不能单独隐藏画中人物。' }),
          field('画面组成', jsx('select', { value: s.artwork, disabled, 'aria-label': '画面组成', onChange: e => void change({ artwork: e.target.value === 'separate-layers' ? 'separate-layers' : 'single-wallpaper' }), children: [jsx('option', { value: 'single-wallpaper', children: '单张合成壁纸（默认）' }), jsx('option', { value: 'separate-layers', children: '独立背景与人物（可选）' })] })),
          ...[['wallpaperScale', '整张壁纸缩放', 100, 150], ['wallpaperX', '整张壁纸水平位置', 0, 100], ['wallpaperY', '整张壁纸垂直位置', 0, 100]].map(([key, label, min, max]) => field(label, jsx('input', { type: 'range', min, max, value: s[key], disabled: disabled || separate, 'aria-label': label, onChange: e => void change({ [key]: bounded(Number(e.target.value), min, max, DEFAULTS[key]) }) }))),
          upload('background', separate ? '全景背景' : '单张合成壁纸', 'image/png,image/jpeg,image/webp'), separate && upload('figure', '透明人物', 'image/png,image/webp'),
          button('清除背景', () => void change({ background: null })), separate && button('清除人物', () => void change({ figure: null, preset: 'text' })),
          field('人物宽度（大屏百分比）', jsx('input', { type: 'range', min: 30, max: 60, value: s.scale, disabled: disabled || !separate, 'aria-label': '人物宽度', onChange: e => void change({ scale: bounded(Number(e.target.value), 30, 60, 50) }) })),
          field('脚底位置（画布百分比）', jsx('input', { type: 'range', min: 50, max: 85, value: s.feet, disabled: disabled || !separate, 'aria-label': '脚底位置', onChange: e => void change({ feet: bounded(Number(e.target.value), 50, 85, 78) }) })),
          field('头像预设', jsx('select', { value: s.preset, disabled: disabled || !separate, 'aria-label': '头像预设', onChange: e => void change({ preset: e.target.value === 'shenzhen' ? 'shenzhen' : 'text' }), children: [jsx('option', { value: 'text', children: '文字姓名 / 关闭头像' }), jsx('option', { value: 'shenzhen', children: '深圳组合图（主动选择）' })] })),
          jsx('p', { children: '深圳预设仅裁切配套群像，不识别人脸，不替换聊天头像。其他构图请关闭。' }),
          jsx('div', { className: 'gbc-roster', children: REGIONS.map(([name, x, y, w, h]) => jsx('span', { title: name, children: [
            separate && s.preset === 'shenzhen' && s.figure && s.mode !== 'focus' && jsx('span', { className: 'gbc-portrait', 'aria-hidden': true, style: { backgroundImage: `url("${s.figure.url}")`, backgroundSize: `${100 / w}% ${100 / h}%`, backgroundPosition: `${100 * x / (1 - w)}% ${100 * y / (1 - h)}%` } }), name] }, name)) }),
          button('恢复构图', () => void change({ scale: 50, feet: 78, wallpaperScale: 100, wallpaperX: 50, wallpaperY: 50 })), button('重置全部并清除图片', () => void change({}, null, null, true)),
          jsx('p', { role: 'status', 'aria-live': 'polite', children: snapshot.status })
        ] })] });
    }
    async function load() {
      const token = ++generation;
      try {
        const saved = await storageWait(ctx.storage.get(KEY), '读取超时，未读取成功；迟到结果将忽略');
        const next = { ...DEFAULTS };
        if (saved && typeof saved === 'object') {
          next.artwork = saved.artwork === 'separate-layers' ? 'separate-layers' : 'single-wallpaper';
          next.wallpaperScale = bounded(saved.wallpaperScale, 100, 150, 100);
          next.wallpaperX = bounded(saved.wallpaperX, 0, 100, 50); next.wallpaperY = bounded(saved.wallpaperY, 0, 100, 50);
          next.mode = MODES.includes(saved.mode) ? saved.mode : DEFAULTS.mode;
          next.scale = bounded(saved.scale, 30, 60, 50); next.feet = bounded(saved.feet, 50, 85, 78);
          next.preset = saved.preset === 'shenzhen' ? 'shenzhen' : 'text';
          for (const key of ['background', 'figure']) if (saved[key] != null && (key !== 'figure' || next.artwork === 'separate-layers')) next[key] = await raster(saved[key].url, key === 'figure');
        }
        if (!alive() || token !== generation) return;
        state = next; status = '本地设置已就绪';
      } catch (error) { if (alive() && token === generation) status = '读取失败，使用素色；未覆盖已存设置：' + (error?.message || '存储不可用'); }
      finally { if (alive() && token === generation) { ready = true; if (globalThis[WRITE]) status += '；等待此前存储请求结束，暂不可保存，可关闭设置继续聊天'; apply(); } }
    }
    try {
      document.head.appendChild(style); document.body.prepend(scene); apply(); observe();
      window.addEventListener('resize', observe); document.addEventListener('click', observe); document.addEventListener('focusin', observe);
      ctx.onDispose(owner.dispose);
      ctx.register({ id: 'gbc-workbench-mode', area: 'statusBar.right', order: 118, render: () => jsx(Settings, {}) });
      void load();
    } catch (error) { owner.dispose(); throw error; }
  },
};
