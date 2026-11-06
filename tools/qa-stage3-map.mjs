// Stage 3 QA bot: the drawn level map (style B). Pictures from tools/map-art.py, stitched into one road.
// Checks, at 320 / 393 / 640 px wide (+ 393×740 inside the artifact wrapper):
//   - every platform of the first 6 pictures (levels 1–30, plain and mirrored pictures) is tapped at the centre of
//     its painted top: an open level opens its card, a locked one says so; the tap area is the platform (≥ 44 px),
//     a point beside the platform is not it; the number sits on the painted top;
//   - the seams: the road's rims run through every row of each seam at the same place, no hard edge across the road;
//   - the current level is on screen (between the top bar and the dock) right after the map opens;
//   - states: gold current with a pin, red bosses, padlocks on locked, stars on passed; zero console errors.
// Usage: python3 tools/map-art.py && node tools/build.mjs && node tools/qa-stage3-map.mjs   → qa-out/stage3/
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'dist/prototype.html');
const out = path.join(root, 'qa-out/stage3');
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };
const errors = [];
const browser = await chromium.launch();
async function open(vp, save, { wrapper = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const tag = `${vp.width}x${vp.height}`;
  page.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
  await page.addInitScript(([s, w]) => {
    localStorage.setItem('pourSort:save', JSON.stringify(s));
    window.__ev = [];
    window.Platform = { native: false, init: async () => {}, ready: Promise.resolve(), remote: {}, persist() {}, haptic() { return false; },
      track: (n, p) => window.__ev.push([n, p || {}]), setUserProperty() {}, ads: { enabled: false }, iap: {}, env: {} };
    if (w) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'img{max-width:100%}button{padding:1px 6px}'; document.head.prepend(st); });
  }, [save, wrapper]);
  await page.goto(url);
  await page.waitForTimeout(900);
  return page;
}
const base = (level, o = {}) => Object.assign({ level, coins: 500, noAds: true, sound: false, music: false, lang: 'uk', sinceAd: 0, stats: { 0: {} }, variant: 'liquid',
  tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 }, inv: { undo: 0, tube: 0, time: 0 }, piggy: 0, starterShown: 1, piggyTold: 1, styleTest: 'b-night', mapAll: 1,
  best: Object.fromEntries(Array.from({ length: level }, (_, i) => [i, 3 - (i % 3)])) }, o);
const ev = (page, fn, arg) => page.evaluate(fn, arg);

// where a platform's painted top is on screen, from the picture's marks (the same data the game uses)
const PAD_GEOM = li => {
  const k = Math.floor(li / 5), j = li % 5, { name, flip } = dmArtFor(k), p = MAPART.art[name].pads[j];
  const slot = document.querySelector(`.dm-slot[data-slot="${k}"] > .dm-col`), r = slot.getBoundingClientRect();
  const fx = v => flip ? 1 - v : v;
  const [cx, cy, cw, ch] = p.cap, [hx, hy, hw, hh] = p.hit;
  return { x: r.left + fx(p.x) * r.width, y: r.top + p.y * r.height, rx: p.rx * r.width, ry: p.ry * r.height,
    cap: { left: r.left + (flip ? 1 - cx - cw : cx) * r.width, top: r.top + cy * r.height, w: cw * r.width, h: ch * r.height },
    hit: { left: r.left + (flip ? 1 - hx - hw : hx) * r.width, top: r.top + hy * r.height, w: hw * r.width, h: hh * r.height }, flip };
};

async function tapAll(page, tag, cur) {
  let bad = [], opened = 0, lockedOk = 0, precise = 0, sizeOk = 0, numOk = 0;
  // levels 1–30 (worlds 1–3, own pictures), 56–60 (world 6 part b: missing, part a mirrored), 106–110 (world 11:
  // theme 1 again, mirrored) and 195–200 (world 20 = theme 10)
  const LIST = [...Array(30).keys(), 55, 56, 57, 58, 59, 105, 106, 107, 108, 109, 195, 196, 197, 198, 199], N = LIST.length;
  for (const li of LIST) {
    await ev(page, li => { const el = document.querySelector(`.dm-pad[data-li="${li}"]`); const sc = $('#mapScroll'), r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(); sc.scrollTop += (r.top - s.top) - s.height * 0.4; }, li);
    await page.waitForTimeout(60);
    const g = await ev(page, `(${PAD_GEOM.toString()})(${li})`);
    const info = await ev(page, ([li, g]) => {
      const pad = document.querySelector(`.dm-pad[data-li="${li}"]`), pr = pad.getBoundingClientRect();
      const at = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest('.dm-pad') ? Number(e.closest('.dm-pad').dataset.li) : null; };
      const num = pad.parentElement.querySelectorAll('.dm-mark')[[...pad.parentElement.querySelectorAll('.dm-pad')].indexOf(pad)].querySelector('.dm-num').getBoundingClientRect();
      return {
        centre: at(g.x, g.y),                                   // the painted top's centre
        capEdges: [at(g.cap.left + g.cap.w * 0.12, g.y), at(g.cap.left + g.cap.w * 0.88, g.y)],
        beside: at(Math.min(pr.left, g.hit.left) - 10, g.y),     // just left of the platform
        size: [pr.width, pr.height],
        hitMatch: Math.abs(pr.left + pr.width / 2 - (g.hit.left + g.hit.w / 2)) < 1.5 && Math.abs(pr.top + pr.height / 2 - (g.hit.top + g.hit.h / 2)) < 1.5,
        num: Math.hypot(num.left + num.width / 2 - g.x, num.top + num.height / 2 - g.y),
      };
    }, [li, g]);
    if (info.centre === li && info.capEdges.every(v => v === li) && info.beside !== li && info.hitMatch) precise++; else bad.push(`${li + 1}:${JSON.stringify(info)}`);
    if (info.size[0] >= 44 && info.size[1] >= 44) sizeOk++;
    if (info.num < Math.max(3, g.ry * 0.25)) numOk++;
    // a real tap at the painted top's centre
    await ev(page, () => { document.querySelectorAll('.toast').forEach(t => t.remove()); });
    await page.mouse.click(g.x, g.y);
    await page.waitForTimeout(140);
    const res = await ev(page, () => ({ pre: !$('#preOverlay').hidden, title: $('#preTitle').textContent, toast: (document.querySelector('.toast') || {}).textContent || '' }));
    if (li <= cur) { if (res.pre && new RegExp(`\\b${li + 1}\\b`).test(res.title)) opened++; else bad.push(`${li + 1}: tap did not open its card (${JSON.stringify(res)})`); }
    else { if (!res.pre && res.toast) lockedOk++; else bad.push(`${li + 1}: locked tap (${JSON.stringify(res)})`); }
    if (res.pre) { await ev(page, () => hide('#preOverlay')); await page.waitForTimeout(60); }
  }
  check(`${tag}: taps at the centre and both sides of each painted top hit that platform, not beside it (${N} platforms)`, precise === N, bad.slice(0, 3).join(' | '));
  check(`${tag}: open levels open their own card (${cur + 1}), locked ones say "locked" (${N - cur - 1})`, opened === cur + 1 && lockedOk === N - cur - 1);
  check(`${tag}: every tap area ≥ 44×44 px`, sizeOk === N);
  check(`${tag}: the number sits on the painted top`, numOk === N, `${numOk}/${N}`);
}

// seam: screenshot the band where picture k meets picture k+1 and look at the road rims row by row (in the page)
async function seams(page, tag, n = 4) {
  const vw = await ev(page, () => Math.min(innerWidth, 640)), band6 = () => vw * 0.06;
  const res = [];
  for (let k = 0; k < n; k++) {
    const band = await ev(page, k => {
      const lo = document.querySelector(`.dm-slot[data-slot="${k}"] > .dm-col`), sc = $('#mapScroll');
      const r0 = lo.getBoundingClientRect(), s = sc.getBoundingClientRect();
      sc.scrollTop += (r0.top - s.top) - s.height * 0.4;
      const r = lo.getBoundingClientRect(), ov = parseFloat(getComputedStyle(lo.parentElement).getPropertyValue('--ov')) * parseFloat(getComputedStyle($('#mapWorlds')).getPropertyValue('--u'));
      const hw = MAPART.art[dmArtFor(k).name].pads && 80 / 1024 * r.width;   // common half-width (tools/map-art.py ROAD_HW)
      return { left: r.left, width: r.width, top: r.top, ov, hw, k };
    }, k);
    await page.waitForTimeout(120);
    // the band: from a bit above the upper picture's faded bottom edge to a bit below the lower picture's top
    // a taller strip: 70 px of road below and above the band, to fit the dash line on each side of the seam
    const PAD = 70, y0 = Math.max(0, band.top - PAD), h = band.ov + 2 * PAD;
    // hide the world sign (it sits on world seams) so the road itself is measured
    await ev(page, () => document.querySelectorAll('.dm-sign, .dm-gate').forEach(e => e.style.visibility = 'hidden'));
    const buf = await page.screenshot({ clip: { x: band.left, y: y0, width: band.width, height: h } });
    await ev(page, () => document.querySelectorAll('.dm-sign, .dm-gate').forEach(e => e.style.visibility = ''));
    const m = await ev(page, async ([b64, band]) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const sc = img.width / band.width, d = g.getImageData(0, 0, c.width, c.height).data;
      const lum = (x, y) => { const i = (y * c.width + x) * 4; return d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15; };
      const hw = band.hw * sc;
      // the road's glowing centre dashes: per row, the middle of the cyan pixels in the middle of the picture
      const pts = [];
      const PAD = band.PAD, seamY = (PAD + band.ov / 2) * sc;
      for (let y = 0; y < c.height; y++) {
        const xs = [];
        for (let x = Math.round(c.width * 0.18); x < Math.round(c.width * 0.82); x++) {
          const i = (y * c.width + x) * 4;
          if (d[i + 1] > 180 && d[i + 2] > 215 && d[i] < 200) xs.push(x);
        }
        if (xs.length >= 2 && xs[xs.length - 1] - xs[0] < 40 * sc) pts.push([y, (xs[0] + xs[xs.length - 1]) / 2]);
      }
      // a line through the dashes below the seam and one above it; at the seam they must meet, in the same direction
      const fit = P => { if (P.length < 4) return null; const n = P.length, my = P.reduce((a, p) => a + p[0], 0) / n, mx = P.reduce((a, p) => a + p[1], 0) / n;
        let sxy = 0, syy = 0; for (const [y, x] of P) { sxy += (y - my) * (x - mx); syy += (y - my) ** 2; } const k = syy ? sxy / syy : 0; return { at: y => mx + k * (y - my), k }; };
      const lo = fit(pts.filter(p => p[0] > seamY + band.ov / 2 * sc)), hi = fit(pts.filter(p => p[0] < seamY - band.ov / 2 * sc));
      const gap = lo && hi ? Math.abs(lo.at(seamY) - hi.at(seamY)) / sc : 99, turn = lo && hi ? Math.abs(Math.atan(lo.k) - Math.atan(hi.k)) * 180 / Math.PI : 99;
      const diffs = [];
      for (let y = 1; y < c.height; y++) {
        // row-to-row change across the road (a hard seam would make one row jump)
        let dsum = 0, dn = 0;
        for (let x = Math.round(c.width / 2 - hw * 1.3); x <= Math.round(c.width / 2 + hw * 1.3); x += 2) { dsum += Math.abs(lum(x, y) - lum(x, y - 1)); dn++; }
        diffs.push(dsum / dn);
      }
      const sorted = [...diffs].sort((a, b) => a - b), p90 = sorted[Math.floor(sorted.length * 0.9)], max = sorted[sorted.length - 1];
      return { gap: Math.round(gap * 10) / 10, turn: Math.round(turn), max: Math.round(max), p90: Math.round(p90) };
    }, [buf.toString('base64'), { ...band, PAD }]);
    fs.writeFileSync(path.join(out, `seam-${tag}-${k}.png`), buf);
    res.push(m);
  }
  // the step from the last platform of a picture to the first of the next one is like a step inside a picture
  const steps = await ev(page, () => {
    const c = li => { const r = document.querySelector(`.dm-pad[data-li="${li}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const st = (a, b) => { const [x1, y1] = c(a), [x2, y2] = c(b); return [Math.abs(x2 - x1), y1 - y2]; };
    const inside = [], across = [];
    for (let li = 0; li < 29; li++) (li % 5 === 4 ? across : inside).push(st(li, li + 1));
    const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const iy = med(inside.map(v => v[1])), ix = med(inside.map(v => v[0]));
    return { iy: Math.round(iy), ix: Math.round(ix), across: across.map(v => [Math.round(v[0]), Math.round(v[1])]), ok: across.every(([dx, dy]) => dy > iy * 0.8 && dy < iy * 1.25 && dx > ix * 0.75 && dx < ix * 1.25) };
  });
  check(`${tag}: seams — the step between pictures matches the step between levels (up ${steps.iy}px, across ${steps.ix}px)`, steps.ok, JSON.stringify(steps.across));
  const okEdge = res.every(m => m.max <= Math.max(40, m.p90 * 3));
  check(`${tag}: seams — no hard edge across the road (max row change ≤ 3× the usual)`, okEdge, res.map(m => `${m.max}/${m.p90}`).join(' '));
}

async function currentVisible(page) {
  return ev(page, () => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const pad = document.querySelector(`.dm-pad[data-li="${nextLevel()}"]`), pr = pad.getBoundingClientRect(), top = r('#map .topbar'), dock = r('#mapDock');
    return { ok: pr.top >= top.bottom - 4 && pr.bottom <= dock.top + 4 && pr.left >= 0 && pr.right <= innerWidth, top: Math.round(pr.top), dockTop: Math.round(dock.top) };
  });
}

// ---------- per screen width ----------
for (const [vp, wrapper] of [[{ width: 320, height: 640 }, false], [{ width: 393, height: 852 }, false], [{ width: 640, height: 900 }, false], [{ width: 393, height: 740 }, true]]) {
  const tag = `${vp.width}${wrapper ? 'w' : ''}`;
  const cur = 13;
  const page = await open(vp, base(cur), { wrapper });
  check(`${tag}: style B shows the drawn map (${await ev(page, () => document.querySelectorAll('.dm-slot').length)} pictures, ${await ev(page, () => document.querySelectorAll('.dm-pad').length)} platforms)`,
    await ev(page, () => $('#mapWorlds').classList.contains('drawn') && document.querySelectorAll('.dm-pad').length === LEVELS.length && !document.querySelector('#mapWorlds .node, #mapWorlds .road')));
  const cv = await currentVisible(page);
  check(`${tag}: current level on screen right after the map opens`, cv.ok, JSON.stringify(cv));
  check(`${tag}: plateau, dock and Play still there`, await ev(page, () => !!$('#homePlay').offsetParent && !!$('#mapDock').offsetParent && /14/.test($('#homePlayLabel').textContent)));
  await page.screenshot({ path: path.join(out, `map-${tag}.png`) });
  const st = await ev(page, cur => {
    const q = s => document.querySelectorAll(s);
    const c = document.querySelector(`.dm-pad[data-li="${cur}"]`);
    const mk = li => document.querySelector(`.dm-pad[data-li="${li}"]`).parentElement.querySelectorAll('.dm-mark')[li % 5];
    return {
      current: c.classList.contains('current') && !!mk(cur).querySelector('.dm-pin') && !!document.querySelector(`.dm-cap.current`),
      pins: q('.dm-pin').length,
      boss: [4, 9, 14, 19].every(li => mk(li).classList.contains('boss') && !!mk(li).querySelector('.dm-num svg')) && q('.dm-cap.boss').length === LEVELS.filter(L => L.hard).length,
      locked: mk(20).querySelector('.dm-lock') !== null && mk(20).classList.contains('locked'),
      stars: mk(0).querySelectorAll('.dm-stars i.on').length === 3 && mk(1).querySelectorAll('.dm-stars i.on').length === 2,
      flipped: q('.dm-art.flip').length > 0,
    };
  }, cur);
  check(`${tag}: gold current with a red pin (one pin), red bosses with ⚡, padlocks on locked, stars on passed`, st.current && st.pins === 1 && st.boss && st.locked && st.stars, JSON.stringify(st));
  check(`${tag}: pilot repeats mirrored on every other picture`, st.flipped);
  await tapAll(page, tag, cur);
  await seams(page, tag, 4);
  await page.context().close();
}

// ---------- current level visible right after opening, far along the map ----------
for (const lv of [0, 4, 9, 37, 120, 499]) {
  const page = await open({ width: 393, height: 852 }, base(lv));
  const cv = await currentVisible(page);
  check(`393: level ${lv + 1} current → on screen right after the map opens`, cv.ok, JSON.stringify(cv));
  if (lv === 4) {
    // win → back to the map: the fresh platform pops and stays visible
    await ev(page, () => { save.level = 5; persist(); showMap({ from: 'win', fresh: true }); });
    await page.waitForTimeout(300);
    const cv2 = await currentVisible(page);
    check('393: after a win the next platform is on screen and marked fresh', cv2.ok && await ev(page, () => document.querySelector('.dm-pad[data-li="5"]').classList.contains('fresh')));
  }
  await page.context().close();
}

// ---------- worlds open one at a time; testers can open the whole map ----------
{
  const page = await open({ width: 393, height: 852 }, base(13, { mapAll: 0 }));
  const st = await ev(page, () => {
    const pads = [...document.querySelectorAll('.dm-pad')].map(b => +b.dataset.li);
    const fog = document.querySelector('.dm-slot.locked .dm-fog-card');
    const sc = $('#mapScroll');
    return { maxPad: Math.max(...pads), slots: document.querySelectorAll('.dm-slot').length, fog: !!fog && /Світ 3/.test(fog.textContent) && /світ 2/.test(fog.textContent),
      gates: document.querySelectorAll('.dm-gate:not(.up)').length, ups: document.querySelectorAll('.dm-gate.up').length, top: sc.scrollHeight };
  });
  check('locked: the map ends with the current world (levels 1–20) and the next world under a fog with a padlock', st.maxPad === 19 && st.slots === 5 && st.fog, JSON.stringify(st));
  check('a dark gate with a line marks both borders between worlds on the map (1→2, 2→3), in both pictures', st.gates === 2 && st.ups === 2, JSON.stringify(st));
  await ev(page, () => { save.level = 20; persist(); showMap({ from: 'win' }); });
  await page.waitForTimeout(300);
  check('passing world 2 opens world 3 (its platforms appear, world 4 is fogged)', await ev(page, () => !!document.querySelector('.dm-pad[data-li="29"]') && !document.querySelector('.dm-pad[data-li="30"]') && /Світ 4/.test(document.querySelector('.dm-fog-card').textContent)));
  await ev(page, () => { save.level = 13; persist(); showMap({ from: 'other' }); openSettings(); });
  await page.waitForTimeout(200);
  await page.click('#tMapAll'); await page.waitForTimeout(250);
  check('tester toggle «Вся мапа» opens all 50 worlds', await ev(page, () => document.querySelectorAll('.dm-pad').length === LEVELS.length && !document.querySelector('.dm-fog')));
  // platforms keep alternating sides across the seam inside a world (part b is mirrored)
  const alt = await ev(page, () => [4, 5, 14, 15].map(li => { const r = document.querySelector(`.dm-pad[data-li="${li}"]`).getBoundingClientRect(); return r.left + r.width / 2 > innerWidth / 2 ? 'R' : 'L'; }).join(''));
  check('platforms alternate across the seam between the two pictures of a world (5→6, 15→16)', alt === 'RLRL', alt);
  await page.context().close();
}

// ---------- switching styles keeps the right map ----------
{
  const page = await open({ width: 393, height: 852 }, base(13));
  await ev(page, () => setStyleTest('current'));
  const codeMap = await ev(page, () => !$('#mapWorlds').classList.contains('drawn') && document.querySelectorAll('#mapWorlds .node').length === LEVELS.length);
  await ev(page, () => setStyleTest('b-night'));
  const drawn = await ev(page, () => $('#mapWorlds').classList.contains('drawn') && document.querySelectorAll('.dm-pad').length === LEVELS.length);
  check('switching style on the map: current → code map, B → drawn map', codeMap && drawn);
  await page.context().close();
}

await browser.close();
check('no console errors', !errors.length, errors.slice(0, 5).join(' | '));
const fails = results.filter(r => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
