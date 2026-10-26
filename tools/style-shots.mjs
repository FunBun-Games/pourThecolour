// Stage 0: screenshots of every style (current / A / B night / B day) on the same screens, plus a side-by-side sheet.
// Usage: node tools/build.mjs && node tools/style-shots.mjs   → qa-out/stage0/
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'qa-out/stage0');
fs.mkdirSync(out, { recursive: true });
const errors = [];
const browser = await chromium.launch();
const STYLES = ['current', 'a', 'b-night', 'b-day'];
const VP = process.argv.includes('--se') ? { width: 320, height: 640 } : { width: 393, height: 852 };
for (const style of STYLES) {
  for (const scene of ['liquid', 'balls', 'map', 'shop', 'stuck']) {
    const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${style}/${scene}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${style}/${scene}: ${m.text()}`); });
    await page.addInitScript(([s]) => localStorage.setItem('pourSort:save', JSON.stringify(s)), [{ level: 36, coins: 1280, noAds: true, sound: false, music: false, lang: 'uk', stats: { 0: {} },
      variant: scene === 'balls' ? 'balls' : 'liquid', tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 }, inv: { undo: 2, tube: 0, time: 1 }, piggy: 1240, starterShown: 1, piggyTold: 1, styleTest: style,
      best: Object.fromEntries(Array.from({ length: 36 }, (_, i) => [i, 3 - (i % 3 === 2 ? 1 : 0)])) }]);
    await page.goto('file://' + path.join(root, 'dist/prototype.html'));
    await page.waitForTimeout(700);
    if (scene === 'liquid' || scene === 'balls' || scene === 'stuck') {
      await page.evaluate(() => { CFG.timedFrom = 30; playLevel(36); });
      await page.waitForTimeout(2300);
      await page.evaluate(() => { document.querySelectorAll('.toast').forEach(t => t.remove()); });
      if (scene === 'stuck') {
        await page.evaluate(() => { CFG.giftTube = 0; for (let k = 0; k < 12 && !testerStuck(); k++); });
        await page.waitForSelector('#stuckOverlay:not([hidden])', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    } else if (scene === 'shop') {
      await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(out, `${style}-${scene}${VP.width === 320 ? '-se' : ''}.png`) });
    await ctx.close();
  }
}
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
