// Stage 3.5 QA bot: game feel — the new liquid pour (flask tips over the target, level surface inside, stream, smooth fill),
// balls flying out in an arc, quick taps in a row, undo during an animation, the spiral on a finished tube (no cork — founder 07.11), no flicker of the target's liquid
// (and before the win window), the tutorial on levels 1–2 (new player / already passed), the picked tube's glow,
// sounds without errors, reduced motion, 393 and 320 px and the artifact wrapper.
// Usage: node tools/build.mjs && node tools/qa-stage3_5.mjs   (run the other bots and tools/ui-audit.mjs as regression)
// Screenshots go to qa-out/stage3_5/.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'dist/prototype.html');
const out = path.join(root, 'qa-out/stage3_5');
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };
const errors = [];
const browser = await chromium.launch();
async function open(vp, save, { wrapper = false, reduce = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${vp.width}x${vp.height}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`${vp.width}x${vp.height}: ${m.text()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(([s, w]) => {
    if (s) localStorage.setItem('pourSort:save', JSON.stringify(s));
    window.__ev = [];
    window.Platform = { native: false, init: async () => {}, ready: Promise.resolve(), remote: {}, persist() {}, haptic() { return false; },
      track: (n, p) => window.__ev.push([n, p || {}]), setUserProperty() {}, ads: { enabled: false }, iap: {}, env: {} };
    if (w) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'img{max-width:100%}button{padding:1px 6px}'; document.head.prepend(st); });
  }, [save, wrapper]);
  await page.goto(url);
  await page.waitForTimeout(800);
  return page;
}
const base = (o = {}) => Object.assign({ level: 12, coins: 300, noAds: true, sound: false, music: false, lang: 'uk', sinceAd: 0, stats: { 0: {} }, variant: 'liquid',
  tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 }, inv: { undo: 0, tube: 0, time: 0 }, piggy: 0, starterShown: 1, piggyTold: 1 }, o);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
const events = (page, name) => ev(page, n => window.__ev.filter(e => e[0] === n).map(e => e[1]), name);
const play = async (page, li) => { await ev(page, li => playLevel(li), li); await page.waitForTimeout(LEVELS_HARD.has(li) ? 2200 : 900); };
const LEVELS_HARD = new Set([4, 9, 14, 19, 24]);
// the board on screen equals the game state
const synced = page => ev(page, () => S.tubes.every((t, i) => {
  const el = tubeEl(i); if (!el) return false;
  const xs = [...el.querySelectorAll(liquidMode() ? '.layer' : '.ball')];
  return xs.length === t.length && xs.every((x, k) => x.style.getPropertyValue('--c') === `var(--c${t[k]})` && x.style.visibility !== 'hidden');
}));
const clean = page => ev(page, () => !document.querySelector('.pour-stream, .slosh, .tube.pouring') && [...document.querySelectorAll('.tube')].every(t => !t.style.transform));
// a legal move, onto a non-empty tube if possible
const pickMove = page => ev(page, () => {
  let any = null;
  for (let i = 0; i < S.tubes.length; i++) for (let j = 0; j < S.tubes.length; j++) {
    if (i === j || !canPour(i, j)) continue;
    if (S.tubes[j].length) return [i, j];
    any = any || [i, j];
  }
  return any;
});
const angleOf = m => { if (!m || m === 'none') return 0; const v = m.match(/matrix\(([^)]+)\)/); if (!v) return 0; const [a, b] = v[1].split(',').map(Number); return Math.atan2(b, a) * 180 / Math.PI; };

// ---------- 1. liquid pour on 393 / 320 / wrapper ----------
for (const [vp, tag, opt] of [[{ width: 393, height: 852 }, '393', {}], [{ width: 320, height: 640 }, '320', {}], [{ width: 393, height: 740 }, 'wrap', { wrapper: true }]]) {
  const page = await open(vp, base(), opt);
  await play(page, 6);
  const mv = await pickMove(page);
  // watch the target's liquid every frame for the whole pour: its level must never drop (founder 07.11: it blinked)
  await ev(page, ([i, j]) => {
    window.__lvl = []; const tb = tubeEl(j), t0 = performance.now();
    const f = () => { const el = tubeEl(j) || tb; const h = [...el.querySelectorAll('.layer')].reduce((a, x) => a + (x.style.visibility === 'hidden' ? 0 : x.getBoundingClientRect().height), 0); window.__lvl.push(h); if (performance.now() - t0 < 2200) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }, mv);
  await ev(page, ([i, j]) => { onTube(i); onTube(j); }, mv);
  check(`${tag}: the move is counted at once`, await ev(page, () => S.moves === 1));
  const total = await ev(page, () => CFG.pourMs + CFG.pourMsPerLayer);
  await page.waitForTimeout(total * 0.5);
  const mid = await ev(page, ([i, j]) => {
    const ta = tubeEl(i), tb = tubeEl(j), st = document.querySelector('.pour-stream'), w = document.querySelector('.slosh-w');
    const sr = st && st.getBoundingClientRect(), br = tb.getBoundingClientRect();
    return { pouring: ta.classList.contains('pouring'), tf: getComputedStyle(ta).transform, wf: w ? getComputedStyle(w).transform : '',
      stream: st ? { op: +getComputedStyle(st).opacity, h: sr.height, cx: sr.left + sr.width / 2, l: sr.left, r: sr.right } : null,
      target: { l: br.left, r: br.right }, bands: document.querySelectorAll('.slosh .band:not([style*="display: none"])').length, vw: innerWidth };
  }, mv);
  await shot(page, `pour-${tag}-mid`);
  const a = angleOf(mid.tf), wa = angleOf(mid.wf);
  check(`${tag}: the flask tips over the target (70–130°)`, mid.pouring && Math.abs(a) >= 65 && Math.abs(a) <= 132, `${a.toFixed(0)}°`);
  check(`${tag}: liquid inside keeps a level surface (counter-rotated)`, Math.abs(a + wa) < 1.5 && mid.bands > 0, `flask ${a.toFixed(1)}°, liquid ${wa.toFixed(1)}°, bands ${mid.bands}`);
  check(`${tag}: a stream falls into the target's mouth`, mid.stream && mid.stream.op > 0.5 && mid.stream.h > 8 && mid.stream.cx > mid.target.l && mid.stream.cx < mid.target.r, JSON.stringify(mid.stream));
  check(`${tag}: stream on screen`, mid.stream && mid.stream.l >= 0 && mid.stream.r <= mid.vw);
  await page.waitForTimeout(total * 0.8 + 400);
  await page.waitForTimeout(600);
  const lv = await ev(page, () => window.__lvl);
  let drop = 0; for (let k = 1; k < lv.length; k++) drop = Math.max(drop, lv[k - 1] - lv[k]);
  check(`${tag}: the target's liquid never blinks (level only grows, frame by frame)`, lv.length > 30 && drop < 1.5, `${lv.length} frames, worst drop ${drop.toFixed(1)} px`);
  check(`${tag}: after the pour the board equals the state, nothing left over`, (await synced(page)) && (await clean(page)));
  await page.close();
}

// ---------- 2. quick taps in a row, undo during an animation ----------
{
  const page = await open({ width: 393, height: 852 }, base());
  await play(page, 12);
  const n = await ev(page, () => {
    let k = 0;
    for (let r = 0; r < 3; r++) {
      let mv = null;
      for (let i = 0; i < S.tubes.length && !mv; i++) for (let j = 0; j < S.tubes.length && !mv; j++) if (i !== j && canPour(i, j)) mv = [i, j];
      if (!mv) break;
      onTube(mv[0]); onTube(mv[1]); k++;
    }
    return k;
  });
  check('quick taps: three moves in a row are taken at once', n === 3 && await ev(page, () => S.moves === 3), `${n}`);
  await ev(page, () => animIdle()); await page.waitForTimeout(300);
  check('quick taps: board equals state after the queue', (await synced(page)) && (await clean(page)));
  // undo while the flask is still in the air
  const before = await ev(page, () => JSON.stringify(S.tubes));
  const mv = await pickMove(page);
  await ev(page, ([i, j]) => { onTube(i); onTube(j); }, mv);
  await page.waitForTimeout(200);
  await page.click('#undoBtn');
  await page.waitForTimeout(2200);
  check('undo during a pour: the move is undone after the animation', await ev(page, b => JSON.stringify(S.tubes) === b && S.moves === 4 && S.undosUsed === 1, before));   // moves keep counting after an undo
  check('undo during a pour: board equals state', (await synced(page)) && (await clean(page)));
  // tapping a tube while another pour is flying
  const mv2 = await pickMove(page);
  await ev(page, ([i, j]) => { onTube(i); onTube(j); }, mv2);
  await page.waitForTimeout(150);
  const selOk = await ev(page, () => { const k = S.tubes.findIndex((t, i) => t.length && !isDoneTube(t)); onTube(k); return S.sel === k; });
  check('a tube can be picked while a pour is still flying', selOk);
  await page.waitForTimeout(1800);
  await page.close();
}

// ---------- 2b. two flasks pour into one target at the same time (founder 07.11) ----------
for (const variant of ['liquid', 'balls']) {
  const page = await open({ width: 393, height: 852 }, base({ variant }));
  await play(page, 6);
  await ev(page, () => { S.tubes = [[1, 1, 1, 0], [2, 2, 2, 0], [0], [1], [2], []]; S.hidden = S.tubes.map(t => t.map(() => 0)); S.history = []; render(); });
  await ev(page, () => {
    window.__lvl = []; const t0 = performance.now();
    const f = () => { const el = tubeEl(2); window.__lvl.push([...el.querySelectorAll(liquidMode() ? '.layer' : '.ball')].reduce((a, x) => a + (liquidMode() ? x.getBoundingClientRect().height : 1), 0)); window.__both = Math.max(window.__both || 0, document.querySelectorAll('.tube.pouring').length); if (performance.now() - t0 < 2600) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await ev(page, () => { onTube(0); onTube(2); onTube(1); onTube(2); });
  check(`${variant}: both moves into one tube are taken at once`, await ev(page, () => S.moves === 2 && S.tubes[2].length === 3));
  await page.waitForTimeout(variant === 'liquid' ? 450 : 150);
  if (variant === 'liquid') {
    const two = await ev(page, () => {
      const ts = [...document.querySelectorAll('.tube.pouring')];
      const st = [...document.querySelectorAll('.pour-stream')];
      const r = ts.map(t => t.getBoundingClientRect());
      return { n: ts.length, streams: st.length, apart: r.length === 2 ? Math.hypot(r[0].left - r[1].left, r[0].top - r[1].top) : 0 };
    });
    check('liquid: two flasks pour into one tube at the same time', two.n === 2 && two.streams === 2, JSON.stringify(two));
    check('liquid: the two flasks do not sit on top of each other', two.apart > 20, `${two.apart.toFixed(0)} px apart`);
    await shot(page, 'two-into-one');
  } else {
    check('balls: balls from both tubes fly at the same time', await ev(page, () => document.querySelectorAll('.ball.moving').length >= 2 && tubeEl(2).querySelectorAll('.ball').length === 3));
  }
  await page.waitForTimeout(2400);
  const lv = await ev(page, () => window.__lvl);
  let drop = 0; for (let k = 1; k < lv.length; k++) drop = Math.max(drop, lv[k - 1] - lv[k]);
  check(`${variant}: the shared target only fills up (no blinking)`, drop < 1.5, `worst drop ${drop.toFixed(1)}`);
  check(`${variant}: after both pours the board equals the state`, (await synced(page)) && (await clean(page)));
  const dur = await ev(page, () => window.__lvl.length);
  await page.close();
}
// the same, timed: two pours into one tube take about as long as one (they run side by side)
{
  const page = await open({ width: 393, height: 852 }, base());
  await play(page, 6);
  await ev(page, () => { S.tubes = [[1, 1, 1, 0], [2, 2, 2, 0], [0], [1], [2], []]; S.hidden = S.tubes.map(t => t.map(() => 0)); S.history = []; render(); });
  const ms = await ev(page, async () => { const t0 = performance.now(); onTube(0); onTube(2); onTube(1); onTube(2); await animIdle(); return performance.now() - t0; });
  const one = await ev(page, () => CFG.pourMs + CFG.pourMsPerLayer);
  check('two pours into one tube run side by side (not one after another)', ms < one * 1.5, `${ms.toFixed(0)} ms for two, one is ${one} ms`);
  await page.close();
}

// ---------- 3. balls: arc and bounce ----------
for (const [vp, tag] of [[{ width: 393, height: 852 }, '393'], [{ width: 320, height: 640 }, '320']]) {
  const page = await open(vp, base({ variant: 'balls' }));
  await play(page, 6);
  const mv = await pickMove(page);
  await ev(page, ([i, j]) => { onTube(i); onTube(j); }, mv);
  await page.waitForTimeout(120);
  check(`balls ${tag}: balls are in flight`, await ev(page, () => document.querySelectorAll('.ball.moving').length > 0));
  await shot(page, `balls-${tag}-mid`);
  await page.waitForTimeout(1100);
  check(`balls ${tag}: board equals state after landing`, (await synced(page)) && await ev(page, () => !document.querySelector('.ball.moving')));
  await page.close();
}

// ---------- 4. finished tube: spiral, bubbles, no cork; win only after it ----------
for (const variant of ['liquid', 'balls']) {
  const page = await open({ width: 393, height: 852 }, base({ variant }));
  await play(page, 6);
  await ev(page, () => { S.tubes = [[0, 0, 0], [1, 1, 1, 0], [1], [2, 2, 2, 2], []]; S.hidden = S.tubes.map(t => t.map(() => 0)); S.history = []; render(); });
  check(`${variant}: no corks anywhere`, await ev(page, () => !document.querySelector('.cork')));
  await ev(page, () => { onTube(1); onTube(0); });
  const waitFor = async (fn, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(page, fn)) return true; await page.waitForTimeout(40); } return false; };
  const spiral = await waitFor(() => !!document.querySelector('.helix'));
  check(`${variant}: gold spiral runs over the finished tube`, spiral);
  await page.waitForTimeout(250);
  check(`${variant}: bubbles inside the finished tube, no cork`, await ev(page, () => !document.querySelector('.cork') && (!liquidMode() || tubeEl(0).querySelectorAll('.bubble').length > 0)));
  await shot(page, `done-${variant}`);
  await page.waitForTimeout(1200);
  check(`${variant}: spiral and sparks are cleaned up`, await ev(page, () => !document.querySelector('.helix')));
  await page.click('#undoBtn'); await page.waitForTimeout(500);
  check(`${variant}: undo works after a finished tube`, await ev(page, () => !isDoneTube(S.tubes[0])) && await synced(page));
  // finish the level: the last tube's cork plays before the win window
  await ev(page, () => { onTube(1); onTube(0); }); await page.waitForTimeout(2200);
  await ev(page, () => { onTube(2); onTube(1); });
  const t0 = Date.now();
  await waitFor(() => !!document.querySelector('.helix'), 4000);
  const helixAt = Date.now() - t0;
  const winEarly = await ev(page, () => !$('#winOverlay').hidden);
  check(`${variant}: the win window waits for the last spiral`, !winEarly, `spiral after ${helixAt} ms`);
  await waitFor(() => !$('#winOverlay').hidden, 4000);
  check(`${variant}: then the win window opens`, await ev(page, () => !$('#winOverlay').hidden));
  await page.close();
}

// ---------- 5. tutorial ----------
{
  // a brand-new player goes straight into level 1
  const page = await open({ width: 393, height: 852 }, null);
  await page.waitForTimeout(800);
  const st = await ev(page, () => ({ li: S && S.li, hint: $('#hint').textContent === tr().tutPour, hand: !!document.querySelector('.tut-hand') }));
  check('tutorial 1: new player is in level 1 with a hand and the rule', st.li === 0 && st.hand && st.hint, JSON.stringify(st));
  const handOver = () => ev(page, () => { const h = document.querySelector('.tut-hand'); if (!h) return -1; const r = h.getBoundingClientRect(); const x = r.left + 18; return [...document.querySelectorAll('.tube')].findIndex(t => { const q = t.getBoundingClientRect(); return x >= q.left - 2 && x <= q.right + 2; }); });
  const best = await ev(page, () => tutBest(null));
  check('tutorial 1: the hand points at the tube to pick', (await handOver()) === best[0], `${await handOver()} vs ${best}`);
  await shot(page, 'tut1-hand');
  await ev(page, i => onTube(i), best[0]); await page.waitForTimeout(500);
  check('tutorial 1: then at the tube to pour into', (await handOver()) === best[1]);
  await shot(page, 'tut1-target');
  await ev(page, j => onTube(j), best[1]);
  await page.waitForTimeout(1150);
  check('tutorial 1: "Great!" after the move', await ev(page, () => { const g = document.querySelector('.tut-good'); return !!g && g.textContent === tr().tutGood; }));
  await shot(page, 'tut1-good');
  check('tutorial 1: step event', (await events(page, 'tutorial_step')).some(e => e.level === 1 && e.step === 1));
  await page.waitForTimeout(800);
  const best2 = await ev(page, () => tutBest(null));
  check('tutorial 1: the hand shows the second move', best2 && (await handOver()) === best2[0]);
  await ev(page, ([i, j]) => { onTube(i); onTube(j); }, best2);
  await page.waitForTimeout(1600);
  check('tutorial 1: done after 2 guided moves — hand gone, tutorial_done, saved', await ev(page, () => !document.querySelector('.tut-hand') && save.tut && save.tut[1] === 1) && (await events(page, 'tutorial_done')).some(e => e.level === 1));
  await page.close();
}
{
  // level 2: ✓ / ✗ after picking a tube
  const page = await open({ width: 393, height: 852 }, base({ level: 1, variant: 'liquid' }));
  await play(page, 1);
  check('tutorial 2: rule shown', await ev(page, () => $('#hint').textContent === tr().tutCheck));
  await ev(page, () => onTube(0)); await page.waitForTimeout(350);
  const m = await ev(page, () => ({ ok: document.querySelectorAll('.tut-mark.ok').length, no: document.querySelectorAll('.tut-mark.no').length, want: S.tubes.filter((_, j) => j !== 0 && canPour(0, j)).length, n: S.tubes.length }));
  check('tutorial 2: ✓ over every tube you can pour into, ✕ over the rest', m.ok === m.want && m.ok + m.no === m.n - 1, JSON.stringify(m));
  const inScreen = await ev(page, () => [...document.querySelectorAll('.tut-mark')].every(x => { const r = x.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; }));
  check('tutorial 2: marks on screen', inScreen);
  await shot(page, 'tut2-marks');
  await ev(page, () => onTube(0));
  check('tutorial 2: marks go away when the tube is put back', await ev(page, () => !document.querySelector('.tut-mark')));
  await ev(page, () => { S.moves = LEVELS[1].minMoves; S.won = true; juiceAfterMove(0, 1); });
  check('tutorial 2: done on the win', await ev(page, () => save.tut && save.tut[2] === 1) && (await events(page, 'tutorial_done')).some(e => e.level === 2));
  await page.close();
}
{
  // players who already passed levels 1–2 see no tutorial on replays
  const page = await open({ width: 393, height: 852 }, base({ level: 5 }));
  await play(page, 0);
  check('passed player: no hand on level 1', await ev(page, () => !document.querySelector('.tut-hand') && $('#hint').textContent !== tr().tutPour));
  await play(page, 1);
  await ev(page, () => onTube(0)); await page.waitForTimeout(300);
  check('passed player: no ✓/✕ on level 2', await ev(page, () => !document.querySelector('.tut-mark')));
  check('passed player: no tutorial events', (await events(page, 'tutorial_step')).length === 0);
  await page.close();
}

// ---------- 6. picked tube glows; sounds; reduced motion ----------
{
  const page = await open({ width: 393, height: 852 }, base({ sound: true }));
  await play(page, 6);
  await ev(page, () => onTube(S.tubes.findIndex(t => t.length))); await page.waitForTimeout(250);
  const glow = await ev(page, () => getComputedStyle(document.querySelector('.tube.sel')).boxShadow);
  check('picked tube glows sky blue', /111, 211, 255/.test(glow), glow.slice(0, 80));
  await shot(page, 'selected');
  const snd = await ev(page, async () => {
    try { sfx.unlock(); sfx.pick(2); sfx.lift(); sfx.place(); sfx.nope(); sfx.fill(1, 1, 2, 0, 0.5); sfx.glug(1, 2, 0, 0.3); sfx.drops(3, 3, 0, 0.08); sfx.done(2); sfx.win(); await new Promise(r => setTimeout(r, 400)); return 'ok:' + sfx.state(); } catch (e) { return 'err:' + e.message; }
  });
  check('sounds play without errors', snd.startsWith('ok'), snd);
  await page.close();
}
{
  const page = await open({ width: 393, height: 852 }, base(), { reduce: true });
  await play(page, 6);
  const mv = await pickMove(page);
  await ev(page, ([i, j]) => { onTube(i); onTube(j); }, mv);
  await page.waitForTimeout(250);
  check('reduced motion: the pour lands at once', (await synced(page)) && (await clean(page)));
  await page.close();
}

await browser.close();
check('no console errors', !errors.length, errors.slice(0, 3).join(' | '));
try {
  execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
files = sys.argv[2:]; ims = [Image.open(f).convert('RGB') for f in files]
w = 300; ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
h = max(im.height for im in ims); sheet = Image.new('RGB', (len(ims) * (w + 8) + 8, h + 16), (24, 28, 40))
for k, im in enumerate(ims): sheet.paste(im, (8 + k * (w + 8), 8))
sheet.save(sys.argv[1], quality=82)
`, path.join(out, 'sheet.jpg'), ...['pour-393-mid', 'balls-393-mid', 'done-liquid', 'done-balls', 'tut1-hand', 'tut1-good', 'tut2-marks', 'selected'].map(f => path.join(out, f + '.png'))]);
} catch (e) { console.log('sheet skipped:', e.message.split('\n')[0]); }
console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
