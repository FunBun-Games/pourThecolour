// Stage 0 QA: every style keeps the game playable — taps pour (tube hit-testing must not depend on styling)
// and hidden balls / layers stay hidden. Usage: node tools/build.mjs && node tools/qa-stage0.mjs
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const url = 'file://' + path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'dist/prototype.html');
const results = [], errors = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };
const b = await chromium.launch();
for (const style of ['current', 'a', 'b-night', 'b-day']) for (const variant of ['liquid', 'balls']) {
  for (const vp of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(s => localStorage.setItem('pourSort:save', JSON.stringify(s)), { level: 36, coins: 100, noAds: true, sound: false, music: false, lang: 'uk', stats: { 0: {} }, variant, styleTest: style, tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 } });
    await p.goto(url); await p.waitForTimeout(600);
    await p.evaluate(() => playLevel(0)); await p.waitForTimeout(900);
    const c = i => p.evaluate(i => { const r = document.querySelector(`.tube[data-i="${i}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 0.6]; }, i);
    let [x, y] = await c(0); await p.touchscreen.tap(x, y); await p.waitForTimeout(250);
    [x, y] = await c(2); await p.touchscreen.tap(x, y); await p.waitForTimeout(900);
    check(`${style} ${variant} ${vp.width}: tap-tap pours`, (await p.evaluate(() => S.moves)) === 1);
    await p.evaluate(() => playLevel(36)); await p.waitForTimeout(2200);
    const r = await p.evaluate(() => { const hid = [...document.querySelectorAll('.ball.hid, .layer.hid')]; return { n: hid.length, d: new Set(hid.map(e => getComputedStyle(e).backgroundImage)).size }; });
    check(`${style} ${variant} ${vp.width}: hidden items all look the same`, r.n > 0 && r.d === 1, JSON.stringify(r));
    await ctx.close();
  }
}
await b.close();
check('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
