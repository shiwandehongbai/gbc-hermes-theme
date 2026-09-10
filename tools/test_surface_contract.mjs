import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../plugin.js', import.meta.url), 'utf8');
const css = source.match(/const CSS = `([\s\S]*?)`;/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selectors, body]) =>
  selectors.trim().split(',').map(selector => ({ selector: selector.trim(), declarations: Object.fromEntries(
    body.split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const colon = s.indexOf(':');
      return [s.slice(0, colon).trim(), s.slice(colon + 1).trim()];
    })) })));
const root = ':root[data-gbc-workbench]';
const slot = name => `${root} [data-slot="${name}"]`;
function style(selector) {
  const matches = rules.filter(rule => rule.selector === selector);
  assert.ok(matches.length, `Missing surface: ${selector}`);
  return Object.assign({}, ...matches.map(rule => rule.declarations));
}

function assertSurfaceSelector(selector, declarations) {
  assert.match(selector, /^:root\[data-gbc-workbench(?:="(?:reading|focus|full-stage)")?\](?:\s|$)/);
  if (selector === `${root} body::after`) {
    // Fail closed on missing, cyclic, non-none or differently overridden tokens.
    const resolvesToNone = (value, seen = new Set()) => {
      if (value === 'none') return true;
      const token = value.match(/^var\((--gbc-[\w-]+)\)$/)?.[1];
      if (!token || seen.has(token)) return false;
      const definitions = rules.filter(rule => Object.hasOwn(rule.declarations, token));
      return definitions.length > 0 && definitions.every(rule =>
        resolvesToNone(rule.declarations[token], new Set([...seen, token])));
    };
    assert.ok(Object.keys(declarations).length > 0, 'native veil must disable a filter');
    for (const [property, value] of Object.entries(declarations)) {
      assert.ok(['backdrop-filter', '-webkit-backdrop-filter'].includes(property), property);
      assert.ok(resolvesToNone(value), `native veil ${property} must resolve to none: ${value}`);
    }
    return;
  }
  assert.doesNotMatch(selector, /\*|::|:(?:before|after|first-line|first-letter)\b/i);
}

test('native veil exception permits only the exact selector and none-valued filters', () => {
  const selector = `${root} body::after`;
  for (const value of ['none', 'var(--gbc-flat-shadow)']) {
    assert.doesNotThrow(() => assertSurfaceSelector(selector, {
      'backdrop-filter': value, '-webkit-backdrop-filter': value,
    }));
  }
  for (const invalid of [`${root} body::before`, `${root} body::marker`,
    `${root} body::first-letter`, `${root} body:after`, 'body::after',
    `${root} div::after`, `${root} *`, `${root} body::after:hover`,
    ':root[data-gbc-workbench="reading"] body::after']) {
    assert.throws(() => assertSurfaceSelector(invalid, { 'backdrop-filter': 'none' }), invalid);
  }
  for (const property of ['display', 'content', 'position', 'background', 'pointer-events']) {
    assert.throws(() => assertSurfaceSelector(selector, {
      'backdrop-filter': 'none', [property]: property === 'content' ? '""' : 'none',
    }), { name: 'AssertionError' }, `reject forbidden property ${property}`);
  }
  for (const value of ['blur(4px)', 'var(--gbc-text)', 'var(--gbc-missing)',
    'var(--gbc-missing, none)', 'none !important']) {
    for (const property of ['backdrop-filter', '-webkit-backdrop-filter']) {
      assert.throws(() => assertSurfaceSelector(selector, { [property]: value }), value);
    }
  }
});

test('confirmed Hermes surfaces are individually root-scoped and token-backed', () => {
  const slots = ['sidebar-wrapper', 'sidebar-inner', 'sidebar', 'aui_thread-viewport',
    'aui_thread-content', 'aui_user-message-root', 'aui_assistant-message-root',
    'aui_assistant-message-content', 'code-card', 'file-diff-panel', 'composer-dock',
    'composer-root', 'composer-surface', 'composer-rich-input', 'composer-attachments',
    'composer-status-stack', 'composer-completion-drawer', 'dropdown-menu-content',
    'dropdown-menu-item', 'select-content', 'tooltip-content', 'command-item'];
  for (const name of slots) style(slot(name));
  for (const attr of ['data-terminal', 'data-sonner-toast']) style(`${root} [${attr}]`);
  for (const { selector, declarations } of rules) {
    assertSurfaceSelector(selector, declarations);
    for (const [property, value] of Object.entries(declarations)) {
      if (/^(?:background|color|border|outline|font-size|line-height)/.test(property) &&
          !/^(?:border-radius|outline-offset)$/.test(property)) assert.match(value, /var\(--gbc-/);
      if (/#|\brgba?\(|\bhsla?\(/.test(value)) assert.match(property, /^--gbc-/);
    }
  }
  for (const name of ['aui_user-message-root', 'aui_assistant-message-root', 'code-card',
    'file-diff-panel', 'composer-surface', 'dropdown-menu-content', 'select-content',
    'tooltip-content', 'composer-completion-drawer']) {
    assert.match(style(slot(name)).background, /^var\(--gbc-/);
  }
});

test('real sidebar navigation uses readable text and an accent active boundary only', () => {
  const sidebar = slot('sidebar');
  const menu = `${root} [data-sidebar="menu-button"]`;
  assert.deepEqual(style(menu), {
    color: 'var(--gbc-text)',
    'font-size': 'var(--gbc-functional-size)',
    'min-height': '32px',
  });
  assert.equal(style(sidebar).color, 'var(--gbc-text)');
  assert.deepEqual(style(`${menu}[data-active="true"]`), {
    'border-inline-start': '2px solid var(--gbc-accent)',
  });
  for (const control of ['button', '[role="tab"]', 'label']) {
    assert.deepEqual(style(`${sidebar} ${control}`), { color: 'var(--gbc-text)' });
  }
  assert.doesNotMatch(css, /data-slot="sidebar-menu-button"/);
});

test('reading and focus change consumed dimensions and preserve readable typography', () => {
  const base = rules.find(rule => rule.selector === root).declarations;
  const reading = { ...base, ...style(':root[data-gbc-workbench="reading"]') };
  const focus = { ...base, ...style(':root[data-gbc-workbench="focus"]') };
  for (const values of [base, reading, focus]) {
    assert.ok(parseFloat(values['--gbc-functional-size']) >= 12);
    assert.ok(parseFloat(values['--gbc-body-size']) >= 16);
  }
  for (const key of ['--gbc-sidebar-width']) {
    for (const values of [base, reading, focus]) assert.match(values[key], /^\d+(?:\.\d+)?rem$/);
  }
  assert.equal(reading['--gbc-content-width'], '100%');
  assert.ok(parseFloat(reading['--gbc-line-height']) > parseFloat(base['--gbc-line-height']));
  assert.ok(parseFloat(focus['--gbc-sidebar-width']) < parseFloat(base['--gbc-sidebar-width']));
  assert.equal(focus['--gbc-content-width'], '100%');
  assert.equal(style(slot('sidebar-wrapper'))['--sidebar-width'], 'var(--gbc-sidebar-width)');
  for (const name of ['aui_thread-content', 'composer-root']) {
    assert.equal(style(slot(name))['max-width'], 'var(--gbc-content-width)');
  }
  for (const name of ['aui_user-message-root', 'aui_assistant-message-content', 'composer-rich-input']) {
    assert.equal(style(slot(name))['font-size'], 'var(--gbc-body-size)');
    assert.equal(style(slot(name))['line-height'], 'var(--gbc-line-height)');
  }
});

test('code, diff, terminal and native disclosure tool rows retain horizontal access', () => {
  for (const selector of [slot('code-card'), slot('file-diff-panel'), `${root} [data-terminal]`,
    `${slot('aui_thread-content')} pre`, `${slot('aui_assistant-message-content')} details`]) {
    const declarations = style(selector);
    assert.equal(declarations['overflow-x'], 'auto', selector);
    assert.equal(declarations['min-width'], '0', selector);
  }
  assert.match(style(`${slot('aui_assistant-message-content')} details`).background, /^var\(--gbc-/);
  assert.equal(style(`${slot('aui_assistant-message-content')} summary`)['font-size'], 'var(--gbc-functional-size)');
  for (const {selector, declarations} of rules.filter(r => r.selector.includes('data-slot'))) assert.doesNotMatch(JSON.stringify(declarations), /hidden|clip|line-clamp/);
});

test('native intro retains a restrained wordmark and readable nested tagline', () => {
  const wordmarkSelector = `${slot('aui_intro')} .wordmark`;
  const taglineSelector = `${slot('aui_intro')} > div > p:last-child`;
  const wordmark = style(wordmarkSelector);
  for (const property of ['--fit-min', '--fit-max']) {
    assert.match(wordmark[property], /^\d+(?:\.\d+)?rem$/);
  }
  assert.ok(parseFloat(wordmark['--fit-min']) >= 2.25);
  assert.ok(parseFloat(wordmark['--fit-max']) <= 5.5);
  assert.ok(parseFloat(wordmark['--fit-min']) <= parseFloat(wordmark['--fit-max']));
  assert.equal(wordmark.color, 'var(--gbc-text)');
  assert.equal(wordmark['mix-blend-mode'], 'normal');
  assert.ok(Number(wordmark.opacity) >= 0.75 && Number(wordmark.opacity) < 1);
  const tagline = style(taglineSelector);
  assert.equal(tagline.color, 'var(--gbc-text)');
  assert.equal(tagline['font-size'], 'var(--gbc-body-size)');
  assert.ok(parseFloat(style(root)['--gbc-body-size']) >= 16);
  assert.match(tagline['max-width'], /^\d+(?:\.\d+)?rem$/);
  assert.ok(parseFloat(tagline['max-width']) >= 20 && parseFloat(tagline['max-width']) <= 40);
  const allowed = {
    [wordmarkSelector]: ['--fit-min', '--fit-max', 'color', 'mix-blend-mode', 'opacity'],
    [taglineSelector]: ['max-width', 'font-size', 'color'],
  };
  const introRules = rules.filter(rule => /aui_intro|wordmark/.test(rule.selector));
  assert.equal(introRules.length, 2);
  for (const { selector, declarations } of introRules) {
    assert.ok(Object.hasOwn(allowed, selector), selector);
    assert.deepEqual(Object.keys(declarations).sort(), [...allowed[selector]].sort());
    assert.doesNotMatch(JSON.stringify(declarations), /mix-blend-plus-lighter|plus-lighter/);
  }
});

function assertNoMotion(text) {
  // Exempt only this exact selector and declaration; inspect all remaining text.
  const selector = `${root} [data-overlay-surface]:has([data-translucency-peek-scope])`;
  const guarded = text.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
    if (selectors.trim() !== selector) return rule;
    return `${selectors}{${body.replace(/(^|;)\s*transition\s*:\s*none\s*(?=;|$)/g, '$1')}}`;
  });
  assert.doesNotMatch(guarded, /!important|animation|transition/);
}

test('peek motion exception permits only the exact selector and transition none', () => {
  const selector = `${root} [data-overlay-surface]:has([data-translucency-peek-scope])`;
  assert.deepEqual(style(selector), { opacity: '1', transition: 'none' });
  assert.doesNotThrow(() => assertNoMotion(`${selector} { opacity: 1; transition: none; }`));
  for (const invalid of ['[data-overlay-surface]', `${root} [data-overlay-surface]`,
    `${selector}:hover`, `${selector}, ${root} div`,
    selector.replace('[data-gbc-workbench]', '[data-gbc-workbench="reading"]')]) {
    assert.throws(() => assertNoMotion(`${invalid} { transition: none; }`));
  }
  for (const declaration of ['transition: opacity 160ms', 'transition: all 0s',
    'transition: none !important', 'transition-duration: 0s', 'transition-property: none',
    'animation: none', '--transition: none', 'transition: none; transition: opacity 1s']) {
    assert.throws(() => assertNoMotion(`${selector} { ${declaration}; }`));
  }
});

test('surface coverage isolates decoration from native message DOM', () => {
  assertNoMotion(css);
  const runtime = source.replace(/const CSS = `[\s\S]*?`;/, '');
  assert.doesNotMatch(runtime, /innerHTML|outerHTML|insertAdjacent|replaceChildren|\bfetch\s*\(|XMLHttpRequest|WebSocket|requestAnimationFrame|setInterval|\bAudio\b|WebGL/);
  // Only this one-shot storage deadline is exempt. Pin its complete control flow
  // so a retry, recursive timer or polling loop cannot hide inside the exemption.
  const helper = runtime.match(/    function storageWait\([\s\S]*?\r?\n    }/);
  assert.ok(helper, 'storage deadline helper exists');
  const compact = text => text.replace(/\s+/g, ' ').trim();
  assert.equal(compact(helper[0]), compact(`
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
  `), 'one deadline; every settlement cancels it and unregisters the wait');
  const outsideHelper = runtime.replace(helper[0], '');
  assert.doesNotMatch(outsideHelper, /setTimeout|clearTimeout/);
  assert.deepEqual(runtime.match(/\bSTORAGE_TIMEOUT\b/g), ['STORAGE_TIMEOUT', 'STORAGE_TIMEOUT']);
  const timeout = runtime.match(/const STORAGE_TIMEOUT = (\d+);/);
  assert.ok(timeout, 'deadline is a fixed finite duration');
  assert.ok(Number(timeout[1]) > 0 && Number(timeout[1]) <= 8000, 'storage waits at most 8 seconds');
  assert.match(runtime, /disposed = true; generation\+\+;\s*for \(const cancel of \[\.\.\.waits\]\) cancel\(\);/);
  assert.equal((runtime.match(/\bstorageWait\s*\(/g) || []).length, 3, 'helper is only used for storage read and write');
  assert.match(runtime, /await storageWait\(ctx\.storage\.get\(KEY\),/);
  assert.match(runtime, /await storageWait\(operation, '[^']*', \(\) => \{ waitingWrite = true; \}\);/);
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/data-slot/.test(selector)) assert.doesNotMatch(body, /display:\s*none|pointer-events|position:\s*(absolute|fixed)/);
  }
});


test('compact contribution and native submit/tooltip overrides stay narrowly scoped', () => {
  const compact = style(`${root} .gbc-status-controls`);
  assert.equal(compact.display, 'inline-flex');
  assert.equal(compact.height, '20px');
  assert.equal(compact['max-height'], '20px');
  assert.equal(compact.gap, '6px');
  for (const tag of ['select', 'button']) {
    const control = style(`${root} .gbc-status-controls > ${tag}`);
    assert.equal(control.height, '18px');
    assert.equal(control.padding, '0 6px');
    assert.equal(control['box-sizing'], 'border-box');
  }
  assert.deepEqual(style(`${slot('composer-surface')} button[type="submit"]`), {
    background: 'var(--gbc-accent)', color: 'var(--gbc-on-accent)',
  });
  assert.equal(style(slot('tooltip-content')).background, 'var(--gbc-clear)');
  assert.deepEqual(style(`${slot('tooltip-content')} > span`), {
    background: 'var(--gbc-solid)', color: 'var(--gbc-text)',
  });
  assert.equal(style(root)['--gbc-glass'], 'rgba(25, 38, 57, 0.42)');
  assert.equal(style(root)['--gbc-glass-filter'], 'blur(6px) saturate(.8)');
  assert.equal(style(':root[data-gbc-workbench="reading"]')['--gbc-wallpaper-mask'], 'rgba(16, 16, 20, 0.42)');
  assert.doesNotMatch(source, /背景可被遮挡/);
});


test('idle voice primary uses the same narrowly scoped color pair as send/stop', () => {
  assert.deepEqual(style(`${slot('composer-surface')} button[type="button"].rounded-full.bg-foreground`),
    style(`${slot('composer-surface')} button[type="submit"]`));
});
