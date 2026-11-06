// UI audit (stage 3, part 2): every window, toast, tip and HUD element in the default look ("B night"),
// on iPhone 15 Pro Max (430×932) and iPhone SE (375×667) plus the 320×640 floor and the artifact wrapper (393×740).
// Checks per scene:
//  - layout: every visible text / icon sits fully inside its button, chip or card, and every card inside the screen;
//  - palette: every solid colour on the UI chrome comes from the palette tokens in :root (--ui-*), nothing left over
//    from the old look (game colours, pictures and SVG art are skipped);
//  - no console errors.
// Screenshots: qa-out/ui-audit/<device>/<scene>.png and a contact sheet qa-out/ui-audit/sheet-<device>.jpg.
// Usage: node tools/build.mjs && node tools/ui-audit.mjs [--only scene,scene]
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'dist/prototype.html');
const outRoot = path.join(root, 'qa-out/ui-audit');
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null;
const devArg = process.argv.indexOf('--dev');
const onlyDev = devArg > 0 ? process.argv[devArg + 1].split(',') : null;

const results = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };

const DEVICES = [
  { name: 'promax', vp: { width: 430, height: 932 } },
  { name: 'se', vp: { width: 375, height: 667 } },
  { name: '320', vp: { width: 320, height: 640 } },
  { name: 'wrap', vp: { width: 393, height: 740 }, wrapper: true }
];

const base = (o = {}) => Object.assign({
  level: 30, coins: 1250, noAds: true, sound: false, music: false, lang: 'uk', sinceAd: 0, stats: { 0: {} },
  variant: 'balls', tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 },
  inv: { undo: 2, tube: 1, time: 0 }, piggy: 640, starterShown: 1, piggyShown: 1
}, o);

// each scene: save overrides, then a page script that opens the state; `wait` ms before the shot
const SCENES = [
  { id: 'map', save: {}, run: () => {} },
  { id: 'map-boss', save: { level: 34 }, run: () => {} },
  { id: 'map-new-player', save: { level: 0, stats: {} }, run: () => showMap({ from: 'launch' }) },
  { id: 'pre-level', save: {}, run: () => openPreLevel(30) },
  { id: 'pre-level-boss', save: { level: 34 }, run: () => openPreLevel(34) },
  { id: 'level-balls', save: {}, run: () => playLevel(30), wait: 1200 },
  { id: 'level-liquid', save: { variant: 'liquid' }, run: () => playLevel(36), wait: 2400 },
  { id: 'level-timed-boss', save: { variant: 'liquid' }, run: () => playLevel(24), wait: 2400 },
  { id: 'level-selected', save: {}, run: async () => { playLevel(10); await new Promise(r => setTimeout(r, 900)); setSelected(0); }, wait: 400 },
  { id: 'tip', save: { tips: {} }, run: () => playLevel(36), wait: 2600 },
  { id: 'gift', save: { granted: { tube: 1 }, level: 2 }, run: () => playLevel(2), wait: 1600 },
  { id: 'offer-booster', save: { inv: { undo: 0, tube: 0, time: 0 } }, run: async () => { playLevel(10); await new Promise(r => setTimeout(r, 900)); document.querySelector('#tubeBtn').click(); }, wait: 500 },
  { id: 'stuck', save: {}, run: async () => { playLevel(10); await new Promise(r => setTimeout(r, 900)); testerStuck(); }, wait: 2600 },
  { id: 'stuck-no-coins', save: { coins: 20, starterBought: 0 }, run: async () => { playLevel(10); await new Promise(r => setTimeout(r, 900)); testerStuck(); }, wait: 2600 },
  { id: 'time-up', save: {}, run: async () => { playLevel(24); await new Promise(r => setTimeout(r, 2200)); timeUp(); }, wait: 500 },
  { id: 'win', save: { piggy: 1100 }, run: async () => { playLevel(30); await new Promise(r => setTimeout(r, 900)); win(); }, wait: 1200 },
  { id: 'pre-ad', save: {}, run: () => preAd(20), wait: 300 },
  { id: 'ad', save: {}, run: () => playDemoAd('reward'), wait: 300 },
  { id: 'end', save: { level: 500 }, run: () => showEnd(), wait: 400 },
  { id: 'settings', save: {}, run: () => openSettings(), wait: 300 },
  { id: 'settings-bottom', save: {}, run: () => { openSettings(); const s = document.querySelector('#settingsOverlay .card'); s.scrollTop = 1e5; }, wait: 300 },
  { id: 'shop', save: {}, run: () => setTab('shop'), wait: 700 },
  { id: 'shop-bottom', save: {}, run: () => { setTab('shop'); setTimeout(() => { const s = document.querySelector('#shop .shop-scroll') || document.querySelector('#shop'); s.scrollTop = 1e5; }, 500); }, wait: 900 },
  { id: 'shop-in-level', save: {}, run: async () => { playLevel(10); await new Promise(r => setTimeout(r, 900)); openShop('hud'); }, wait: 700 },
  { id: 'pop-starter', save: { starterShown: 0, starterOpen: 1 }, run: () => popOffer('starter'), wait: 300 },
  { id: 'pop-piggy', save: { piggy: 1200 }, run: () => popOffer('piggy'), wait: 300 },
  { id: 'toast', save: {}, run: () => toast('Колекція — скоро'), wait: 200 },
  { id: 'toast-level', save: {}, run: async () => { playLevel(10); await new Promise(r => setTimeout(r, 900)); toast('Скасувань більше немає'); }, wait: 200 }
];

// runs inside the page: layout + palette findings for whatever is on screen now
function inspect() {
  const vw = innerWidth, vh = innerHeight, out = { layout: [], palette: [] };
  const vis = el => { if (el.closest('[hidden]')) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const name = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 60);
  const topOverlay = [...document.querySelectorAll('.overlay')].filter(vis).pop();
  const scope = topOverlay || document.body;
  // 1) cards inside the screen
  for (const c of scope.querySelectorAll('.card, .offer, .tabbar, .hud, .map-dock')) {
    if (!vis(c)) continue;
    const r = c.getBoundingClientRect();
    const scroller = c.closest('.shop-scroll, #mapScroll, .scroll');
    if (scroller) continue;
    if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.layout.push(`${name(c)} off screen ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`);
  }
  // 2) text and icons inside their box (buttons, chips, badges, tabs)
  const boxes = scope.querySelectorAll('button, .btn, .chip, .badge, .coins, .tab, .tool, .level-name, .world-sign, .ribbon, .price, .pill');
  for (const b of boxes) {
    if (!vis(b)) continue;
    const br = b.getBoundingClientRect();
    if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflowX !== 'visible') out.layout.push(`${name(b)} text clipped (${b.scrollWidth}>${b.clientWidth})`);
    for (const k of b.querySelectorAll('span, svg, img, i, b, strong')) {
      if (!vis(k) || k.closest('.badge') && !b.classList.contains('badge')) continue;
      if (k.matches('.badge, .sale, .tick, .ribbon')) continue;   // corner badges sit on the edge on purpose
      if (getComputedStyle(k).position === 'absolute' && k.closest('.tab')) continue;
      const r = k.getBoundingClientRect();
      if (r.left < br.left - 1 || r.right > br.right + 1 || r.top < br.top - 1 || r.bottom > br.bottom + 1)
        out.layout.push(`${name(k)} sticks out of ${name(b)} by ${Math.round(Math.max(br.left - r.left, r.right - br.right, br.top - r.top, r.bottom - br.bottom))}px`);
    }
    // text width vs box for leaf buttons
    const text = b.textContent.trim();
    if (text && b.children.length === 0) {
      const rg = document.createRange(); rg.selectNodeContents(b); const tr = rg.getBoundingClientRect();
      if (tr.width > br.width + 1) out.layout.push(`${name(b)} text wider than button`);
    }
  }
  // 3) palette: solid colours of the UI chrome must be palette tokens
  const rs = getComputedStyle(document.documentElement);
  const toks = [...rs].length ? [] : [];
  const sheetTokens = new Set();
  for (const s of document.styleSheets) { let rules; try { rules = s.cssRules; } catch { continue; } for (const r of rules) if (r.style) for (const p of r.style) if (p.startsWith('--ui-')) sheetTokens.add(p); }
  const probe = document.createElement('i'); document.body.appendChild(probe);
  const norm = c => { probe.style.color = ''; probe.style.color = c; return getComputedStyle(probe).color; };
  const allowed = new Set(['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)']);
  for (const t of sheetTokens) { const v = rs.getPropertyValue(t).trim(); if (v) allowed.add(norm(v)); }
  probe.remove();
  const rgbOf = s => (s.match(/rgba?\([^)]*\)/g) || []);
  const opaque = c => { const m = c.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/); return !m || +m[1] >= 0.98; };
  const baseRgb = c => c.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]*\)/, 'rgb($1,$2,$3)').replace(/\s+/g, '').replace('rgb(', 'rgb(').replace(/,/g, ', ');
  const allowedBase = new Set([...allowed].map(baseRgb));
  const skip = el => el.closest('.logo, .lock-badge, .hard-intro, svg, img, .ball, .layer, .tube, .art, .biome-art, .drawn-map, #mapScroll .dm-img, .ava, .rival-ava, .coin, .star, .anim, canvas, [data-art]');
  const seen = new Map();
  for (const el of scope.querySelectorAll('*')) {
    if (skip(el) || !vis(el)) continue;
    const cs = getComputedStyle(el);
    const cols = [cs.backgroundColor, ...rgbOf(cs.backgroundImage)];
    if (parseFloat(cs.borderTopWidth) > 0) cols.push(cs.borderTopColor);
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) cols.push(cs.color);
    for (const c of cols) {
      if (!c || c === 'rgba(0, 0, 0, 0)' || !opaque(c)) continue;   // tints and shades (rgba) are fine
      if (allowedBase.has(baseRgb(c))) continue;
      const k = c + ' @ ' + name(el);
      if (!seen.has(c)) seen.set(c, k);
    }
  }
  out.palette = [...seen.values()];
  out.tokens = sheetTokens.size;
  return out;
}

const browser = await chromium.launch();
const errors = [];
const sheets = {};
for (const dev of DEVICES) {
  if (onlyDev && !onlyDev.includes(dev.name)) continue;
  const dir = path.join(outRoot, dev.name); fs.mkdirSync(dir, { recursive: true });
  sheets[dev.name] = [];
  for (const sc of SCENES) {
    if (only && !only.includes(sc.id)) continue;
    const ctx = await browser.newContext({ viewport: dev.vp, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${dev.name}/${sc.id}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`${dev.name}/${sc.id}: ${m.text()}`); });
    await page.addInitScript(([s, w]) => {
      localStorage.setItem('pourSort:save', JSON.stringify(s));
      if (w) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'img{max-width:100%}button{padding:1px 6px}'; document.head.prepend(st); });
    }, [base(sc.save), !!dev.wrapper]);
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(`Promise.race([Promise.resolve((${sc.run.toString()})()), new Promise(r => setTimeout(r, 4000))])`);   // some openers return a promise that resolves only on close
    await page.waitForTimeout(sc.wait ?? 600);
    const file = path.join(dir, sc.id + '.png');
    await page.screenshot({ path: file });
    sheets[dev.name].push(file);
    const r = await page.evaluate(inspect);
    const style = await page.evaluate(() => document.documentElement.dataset.style + '-' + (document.documentElement.dataset.tone || ''));
    check(`${dev.name} ${sc.id}: default look is B night`, style === 'b-night', style);
    check(`${dev.name} ${sc.id}: layout`, !r.layout.length, r.layout.slice(0, 4).join(' | '));
    check(`${dev.name} ${sc.id}: palette`, r.tokens > 0 && !r.palette.length, (r.tokens ? '' : 'no --ui-* tokens; ') + r.palette.length + ' off-palette: ' + (process.env.AUDIT_ALL ? r.palette.join(' | ') : r.palette.slice(0, 5).join(' | ')));
    await ctx.close();
  }
}
await browser.close();
check('no console errors', !errors.length, errors.slice(0, 3).join(' | '));

// contact sheets (Python + Pillow)
try {
  for (const [dev, files] of Object.entries(sheets)) {
    if (!files.length) continue;
    execFileSync('python3', ['-I', '-c', `
import sys, math
from PIL import Image, ImageDraw
files = sys.argv[2:]; out = sys.argv[1]
ims = [Image.open(f).convert('RGB') for f in files]
w = 300; h = int(ims[0].height * w / ims[0].width)
cols = 7; rows = math.ceil(len(ims) / cols)
sheet = Image.new('RGB', (cols * (w + 10) + 10, rows * (h + 34) + 10), (24, 28, 40))
d = ImageDraw.Draw(sheet)
for k, (im, f) in enumerate(zip(ims, files)):
    x = 10 + (k % cols) * (w + 10); y = 10 + (k // cols) * (h + 34)
    sheet.paste(im.resize((w, h)), (x, y + 24)); d.text((x, y + 4), f.split('/')[-1][:-4], fill=(230, 230, 240))
sheet.save(out, quality=82)
`, path.join(outRoot, `sheet-${dev}.jpg`), ...files]);
  }
} catch (e) { console.log('contact sheet skipped:', e.message.split('\n')[0]); }

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
