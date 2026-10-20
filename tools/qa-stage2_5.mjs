// Stage 2.5 QA bot: Home = the level map. No separate home screen; the map carries a dock with the current world,
// its progress and "Play · level N"; one-time offers, wins and leaving a level all land on the map.
// Usage: node tools/build.mjs && node tools/qa-stage2_5.mjs   (run qa-stage1 / qa-stage2 too as regression)
// Screenshots go to qa-out/stage2_5/.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'dist/prototype.html');
const out = path.join(root, 'qa-out/stage2_5');
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };
const errors = [];
const browser = await chromium.launch();
async function open(vp, save, { wrapper = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${vp.width}x${vp.height}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${vp.width}x${vp.height}: ${m.text()}`); });
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
const base = (o = {}) => Object.assign({ level: 9, coins: 100, noAds: true, sound: false, music: false, lang: 'uk', sinceAd: 0, stats: { 0: {} }, variant: 'balls',
  tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 }, inv: { undo: 0, tube: 0, time: 0 }, piggy: 0, starterShown: 1, piggyTold: 1 }, o);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const visible = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return !!el && !el.closest('[hidden]') && el.getBoundingClientRect().height > 0; }, sel);
const events = (page, name) => ev(page, n => window.__ev.filter(e => e[0] === n).map(e => e[1]), name);
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
const layout = page => ev(page, () => {
  const r = s => document.querySelector(s).getBoundingClientRect();
  const dock = r('#mapDock'), play = r('#homePlay'), bar = r('#tabbar'), top = r('#map .topbar'), node = document.querySelector(`#mapWorlds .node[data-li="${nextLevel()}"]`);
  const nr = node && node.getBoundingClientRect();
  const clipped = [...document.querySelectorAll('#map .topbar *, #mapDock *')].filter(e => e.offsetParent && !e.closest('svg') && (e.getBoundingClientRect().right > innerWidth + 0.5 || e.getBoundingClientRect().left < -0.5 || (e.matches('.wname, small, span, b') && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis'))).map(e => e.id || e.className || e.tagName);
  return { playAboveBar: play.bottom <= bar.top + 0.5, dockInside: dock.left >= -0.5 && dock.right <= innerWidth + 0.5, nodeVisible: !!nr && nr.top >= top.bottom - 4 && nr.bottom <= dock.top + 4, clipped };
});

// ---------- 1. launch: the map is Home ----------
{
  const page = await open({ width: 393, height: 852 }, base());
  check('launch → map (no separate home screen)', await ev(page, () => screenNow === 'map' && !document.querySelector('#home')));
  check('map_open logged with from=launch', (await events(page, 'map_open')).some(e => e.from === 'launch'));
  check('Home tab active on the map', await ev(page, () => $('#tabbar .tab.on').dataset.tab === 'home'));
  check('top bar: coins with "+", logo, settings', await visible(page, '#map .coins .plus') && await visible(page, '#map .logo') && await visible(page, '#mapSettings'));
  check('dock: world name, progress "9 / 10", boss Play on level 10', await ev(page, () => /Світ 1/.test($('#homeWorld').textContent) && $('#homeProgressText').textContent === '9 / 10' && $('#homePlay').classList.contains('boss') && /Бос · рівень 10/.test($('#homePlayLabel').textContent)));
  const l = await layout(page);
  check('393: Play above the tab bar, current node visible between top bar and dock, nothing clipped', l.playAboveBar && l.dockInside && l.nodeVisible && !l.clipped.length, JSON.stringify(l));
  await shot(page, '01-home-map');
  await page.click('#homePlay'); await page.waitForTimeout(400);
  check('Play → pre-level card of the current level', await visible(page, '#preOverlay') && await ev(page, () => preLi === nextLevel()));
  await page.click('#prePlay'); await page.waitForTimeout(1800);
  check('…→ level, no tab bar', await ev(page, () => screenNow === 'game') && !(await visible(page, '#tabbar')));
  await page.click('#hudMap'); await page.waitForTimeout(500);
  check('map button in a level → back to the map (from=level)', await ev(page, () => screenNow === 'map') && (await events(page, 'map_open')).some(e => e.from === 'level'));
  // a node still opens its card
  await page.click('#mapWorlds .node[data-li="3"]'); await page.waitForTimeout(400);
  check('tapping a passed node opens its pre-level card', await ev(page, () => !$('#preOverlay').hidden && preLi === 3));
  await ev(page, () => hide('#preOverlay'));
  // shop and back
  await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  await page.click('#tabbar .tab[data-tab="home"]'); await page.waitForTimeout(500);
  check('Shop → Home returns to the map with the dock', await visible(page, '#mapDock') && await ev(page, () => $('#shop').hidden));
  // language switch re-renders the dock
  await ev(page, () => { save.lang = 'en'; applyLang(); }); await page.waitForTimeout(200);
  check('language switch updates the dock', await ev(page, () => /Boss · level 10/.test($('#homePlayLabel').textContent) && /World 1/.test($('#homeWorld').textContent)));
  await page.close();
}

// ---------- 2. win → map: the node pops, the next card opens; the dock follows ----------
{
  const page = await open({ width: 393, height: 852 }, base({ level: 4 }));
  await ev(page, () => playLevel(4)); await page.waitForTimeout(700);
  await ev(page, () => { S.moves = LEVELS[4].minMoves; win(); }); await page.waitForTimeout(400);
  await page.click('#nextBtn'); await page.waitForTimeout(1500);
  check('win → map → pre-level card of level 6', await ev(page, () => screenNow === 'map' && !$('#preOverlay').hidden && preLi === 5));
  check('dock now shows level 6 (not a boss)', await ev(page, () => /рівень 6/.test($('#homePlayLabel').textContent) && !$('#homePlay').classList.contains('boss') && $('#homeProgressText').textContent === '5 / 10'));
  await page.close();
}

// ---------- 3. brand-new player and the one-time offer on the map ----------
{
  const page = await open({ width: 393, height: 852 }, null);
  check('brand-new player: straight into level 1', await ev(page, () => screenNow === 'game' && S && S.li === 0));
  await page.close();
  const p2 = await open({ width: 393, height: 852 }, base({ starterShown: 0, level: 12 }));
  await p2.waitForTimeout(300);
  check('starter-pack offer appears over the map once', await visible(p2, '#shopPop'));
  await p2.click('#shopPopLater'); await p2.waitForTimeout(300);
  await ev(p2, () => showMap()); await p2.waitForTimeout(600);
  check('…and not again', !(await visible(p2, '#shopPop')));
  await p2.close();
}

// ---------- 4. all levels done ----------
{
  const page = await open({ width: 393, height: 852 }, base({ level: 500 }));
  check('all 500 done: Play says so and stays on the map', await ev(page, () => $('#homePlayLabel').textContent === tr().allDone));
  await page.click('#homePlay'); await page.waitForTimeout(400);
  check('…tap keeps the map, no card', await ev(page, () => screenNow === 'map' && $('#preOverlay').hidden));
  await page.close();
}

// ---------- 5. small screens and the artifact wrapper ----------
for (const [vp, wrapper, name] of [[{ width: 320, height: 640 }, false, '320x640'], [{ width: 393, height: 740 }, true, '393x740-wrapper'], [{ width: 320, height: 568 }, false, '320x568']]) {
  const page = await open(vp, base({ level: 23 }), { wrapper });
  const l = await layout(page);
  check(`${name}: Play above the tab bar, current node visible, nothing clipped`, l.playAboveBar && l.dockInside && l.nodeVisible && !l.clipped.length, JSON.stringify(l));
  await shot(page, `${name}-home-map`);
  await page.close();
}

await browser.close();
check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
