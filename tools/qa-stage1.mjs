// Stage 1 QA bot: dead-end offer, boosters in stock, gifts, early dead-end solver.
// Usage: node tools/build.mjs && node tools/qa-stage1.mjs
// Needs Playwright (PLAYWRIGHT_PATH or /opt/node-tools/node_modules/playwright) and its Chromium (/opt/pw-browsers).
// Screenshots go to qa-out/stage1/.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'dist/prototype.html');
const out = path.join(root, 'qa-out/stage1');
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };
const errors = []; // network errors (web fonts offline in the sandbox) are ignored
const browser = await chromium.launch();

// artifact wrapper quirks (as on claude.ai and Safari): img{max-width:100%}, button{padding:1px 6px}
async function open(vp, save, { wrapper = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${vp.width}x${vp.height}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${vp.width}x${vp.height}: ${m.text()}`); });
  await page.addInitScript(([s, w]) => {
    localStorage.setItem('pourSort:save', JSON.stringify(s));
    if (w) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'img{max-width:100%}button{padding:1px 6px}'; document.head.prepend(st); });
  }, [save, wrapper]);
  await page.goto(url);
  await page.waitForTimeout(400);
  return page;
}
const base = (o = {}) => Object.assign({ level: 30, coins: 100, noAds: true, sound: false, music: false, lang: 'uk', sinceAd: 0, stats: { 0: {} }, variant: 'balls', tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1 }, inv: { undo: 0, tube: 0, time: 0 } }, o);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const visible = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return !!el && !el.closest('[hidden]') && el.getBoundingClientRect().height > 0; }, sel);
const play = async (page, li) => { await ev(page, li => playLevel(li), li); await page.waitForTimeout(li >= 19 ? 2200 : 700); };
const goStuck = async page => {
  let ok = false;
  for (let k = 0; k < 12 && !ok; k++) ok = await ev(page, () => testerStuck());   // random play: with an extra tube a dead end can take many tries
  const t0 = Date.now();
  try { await page.waitForSelector('#stuckOverlay:not([hidden])', { timeout: 6000 }); } catch (e) { return false; }
  stuckWaits.push(Date.now() - t0);
  await page.waitForTimeout(250);
  const over = await page.evaluate(() => { const c = document.querySelector('#stuckOverlay .card'), r = c.getBoundingClientRect();
    const bad = [...c.querySelectorAll('*')].filter(e => e.offsetParent && (e.getBoundingClientRect().right > r.right + 0.5 || e.getBoundingClientRect().left < r.left - 0.5 || (e.matches('.btn, h2, p, small, .tag') && e.scrollWidth > e.clientWidth + 1)));
    return (r.left < 0 || r.right > innerWidth ? ['card'] : []).concat(bad.map(e => e.id || e.className || e.tagName)); });
  if (over.length) overflow.push(over.join(','));
  return ok;
};
const stuckWaits = [], overflow = [];
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
const state = page => ev(page, () => ({ tubes: S.tubes.length, extra: S.extra || 0, coins: save.coins, inv: { ...save.inv }, granted: { ...save.granted }, moves: S.moves, undos: S.undos, bonus: S.bonus || 0 }));

// ---------- 1. dead end on balls and liquid ----------
for (const variant of ['balls', 'liquid']) {
  const page = await open({ width: 393, height: 852 }, base({ variant, granted: { undo: 1, time: 1 } }));
  await ev(page, () => { CFG.timedFrom = 9999; });   // a long scenario: keep the clock out of it
  await play(page, 99);
  const s0 = await state(page);
  check(`${variant}: dead end reached by the bot`, await goStuck(page));
  check(`${variant}: dead-end window opens after the delay`, await visible(page, '#stuckOverlay'));
  check(`${variant}: first dead end = gift tube`, await visible(page, '#stGift') && await visible(page, '#stuckAnim'));
  const t1 = await ev(page, () => elapsed()); await page.waitForTimeout(1500); const t2 = await ev(page, () => elapsed());
  check(`${variant}: clock stands while the window is open`, t1 === t2, `${t1}s → ${t2}s`);
  await shot(page, `${variant}-1-gift`);
  await page.click('#stGift'); await page.waitForTimeout(400);
  let s = await state(page);
  check(`${variant}: gift adds a tube for free`, s.tubes === s0.tubes + 1 && s.coins === s0.coins && s.granted.tube === 1 && s.inv.tube === 0);
  await shot(page, `${variant}-2-after-gift`);

  if (variant === 'balls') {
    // coins
    await ev(page, () => onRestart()); await page.waitForTimeout(400);
    await goStuck(page);
    check('coins: window without gift, coin button on', await visible(page, '#stCoins') && !(await ev(page, () => $('#stCoins').disabled)) && !(await visible(page, '#stGift')));
    await shot(page, 'balls-3-offer-coins');
    await page.click('#stCoins'); await page.waitForTimeout(400);
    s = await state(page);
    check('coins: tube added, 100 coins taken, stock unchanged', s.extra === 1 && s.coins === 0 && s.inv.tube === 0);
    // a second dead end on the same level: no tube left to add (maxExtra 1) → undo / restart only
    await goStuck(page);
    check('max extra: no tube button, undo + restart remain', !(await visible(page, '#stCoins')) && await visible(page, '#stUndo') && await visible(page, '#stRestart'));
    await shot(page, 'balls-4-max-extra');
    const h0 = await ev(page, () => S.history.length);
    await page.click('#stUndo'); await page.waitForTimeout(600);
    // free undos may be used up by now; an offer can appear — accept with an ad if so
    if (await visible(page, '#offerOverlay')) { await page.click('#offerAdBtn'); await page.waitForSelector('#adClose:not([hidden])', { timeout: 8000 }); await page.click('#adClose'); await page.waitForTimeout(500); }
    check('undo from the window takes a move back', (await ev(page, () => S.history.length)) === h0 - 1);
    // not enough coins → coin pack in the window (stage 2: the starter pack comes first; it is covered by qa-stage2)
    await ev(page, () => { save.starterBought = 1; onRestart(); }); await page.waitForTimeout(400);
    await goStuck(page);
    check('no coins: coin button disabled, 500-coin pack shown', await ev(page, () => $('#stCoins').disabled) && await visible(page, '#stShop'));
    await shot(page, 'balls-5-no-coins-pack');
    await page.click('#stShop'); await page.waitForTimeout(400);
    check('pack bought (demo): +500 coins, coin button on, pack hidden', (await state(page)).coins === 500 && !(await ev(page, () => $('#stCoins').disabled)) && !(await visible(page, '#stShop')));
    // rewarded ad
    await page.click('#stAd');
    await page.waitForSelector('#adClose:not([hidden])', { timeout: 8000 }); await page.click('#adClose'); await page.waitForTimeout(400);
    s = await state(page);
    check('ad: tube added, coins kept', s.extra === 1 && s.coins === 500 && !(await visible(page, '#stuckOverlay')));
    // stock
    await ev(page, () => { onRestart(); testerBoost3(); }); await page.waitForTimeout(400);
    check('HUD shows stock ×3 on tube and undo after free undos', await ev(page, () => $('#tubeBadge').textContent === '×3'));
    await goStuck(page);
    check('stock: "from stock ×3" button', await visible(page, '#stStock'));
    await shot(page, 'balls-6-stock');
    await page.click('#stStock'); await page.waitForTimeout(400);
    s = await state(page);
    check('stock: tube added for free, stock 3 → 2', s.extra === 1 && s.inv.tube === 2 && s.coins === 500);
    // restart from the window
    await goStuck(page);
    await page.click('#stRestart'); await page.waitForTimeout(500);
    s = await state(page);
    check('restart from the window', s.moves === 0 && !(await visible(page, '#stuckOverlay')));
    // dismiss
    await goStuck(page);
    await page.click('#stuckClose'); await page.waitForTimeout(300);
    const d1 = await ev(page, () => elapsed()); await page.waitForTimeout(1300); const d2 = await ev(page, () => elapsed());
    check('dismiss: window closes, hint pulses, clock runs again', !(await visible(page, '#stuckOverlay')) && await ev(page, () => $('#hint').classList.contains('warn')) && d2 > d1);
    await page.waitForTimeout(1200);
    check('dismissed window does not reopen for the same board', !(await visible(page, '#stuckOverlay')));
  }
  await page.close();
}

// ---------- 2. undo booster: free undos → buy pack → stock ----------
{
  const page = await open({ width: 393, height: 852 }, base({ coins: 100 }));
  await play(page, 7);
  await ev(page, () => { const i = S.tubes.findIndex((t, i) => S.tubes.some((_, j) => canPour(i, j))); const j = S.tubes.findIndex((_, j) => canPour(i, j)); pour(i, j); });
  await page.waitForTimeout(700);
  await ev(page, () => { S.undos = 0; updateHud(); });
  check('undo badge shows coin price when free undos and stock are empty', await ev(page, () => $('#undoBadge').textContent.trim() === String(CFG.undoCost)));
  await page.click('#undoBtn'); await page.waitForTimeout(300);
  check('undo: offer opens', await visible(page, '#offerOverlay'));
  await shot(page, 'undo-1-offer');
  await page.click('#offerCoinBtn'); await page.waitForTimeout(500);
  let s = await state(page);
  check('undo bought: pack of 3 → stock 2, move undone, coins −100', s.inv.undo === 2 && s.moves === 1 && s.coins === 0, JSON.stringify(s.inv));
  await ev(page, () => { const i = S.tubes.findIndex((t, i) => S.tubes.some((_, j) => canPour(i, j))); const j = S.tubes.findIndex((_, j) => canPour(i, j)); pour(i, j); });
  await page.waitForTimeout(700);
  check('undo badge shows ×2', await ev(page, () => $('#undoBadge').textContent === '×2'));
  await page.click('#undoBtn'); await page.waitForTimeout(400);
  s = await state(page);
  check('undo from stock: no offer, stock 2 → 1', !(await visible(page, '#offerOverlay')) && s.inv.undo === 1);
  await page.close();
}

// ---------- 3. gifts: undo on level 3, +30 s on the first timed level ----------
{
  const page = await open({ width: 393, height: 852 }, base({ level: 25, granted: {} }));
  await play(page, 2);
  await page.waitForTimeout(600);
  check('gift card "new tool": undo on level 3', await visible(page, '#giftOverlay') && await ev(page, () => save.inv.undo === 3));
  await page.waitForTimeout(2200);
  await shot(page, 'gift-1-undo');
  await page.click('#giftTake'); await page.waitForTimeout(300);
  check('gift card closes', !(await visible(page, '#giftOverlay')));
  await play(page, 19);
  await page.waitForTimeout(600);
  check('gift card: +30 s on the first timed level', await visible(page, '#giftOverlay') && await ev(page, () => save.inv.time === 1));
  await page.waitForTimeout(2200);
  await shot(page, 'gift-2-time');
  await page.click('#giftTake'); await page.waitForTimeout(300);
  check('+30 s button on a timed level with ×1', await visible(page, '#timeBtn') && await ev(page, () => $('#timeBadge').textContent === '×1'));
  await shot(page, 'time-1-hud');
  const b0 = (await state(page)).bonus;
  await page.click('#timeBtn'); await page.waitForTimeout(300);
  let s = await state(page);
  check('+30 s from stock', s.bonus === b0 + 30 && s.inv.time === 0);
  // time-up with a +30 s in stock
  await ev(page, () => { save.inv.time = 1; S.bonus = -9999; }); await page.waitForTimeout(1300);
  check('time-up window offers +30 s from stock', await visible(page, '#reviveStockBtn'));
  await shot(page, 'time-2-timeup-stock');
  await page.click('#reviveStockBtn'); await page.waitForTimeout(300);
  check('revive from stock', !(await visible(page, '#failOverlay')) && (await state(page)).inv.time === 0);
  check('+30 s button hidden on untimed levels', await (async () => { await play(page, 4); return !(await visible(page, '#timeBtn')); })());
  await ev(page, () => testerGifts());
  check('tester: gifts again', await ev(page, () => Object.keys(save.granted).length === 0));
  await page.close();
}

// ---------- 4. early dead end (solver) ----------
{
  const page = await open({ width: 393, height: 852 }, base({ granted: { undo: 1, time: 1, tube: 1 } }));
  await play(page, 7);
  const found = await ev(page, () => {
    const real = S;
    for (let a = 0; a < 600; a++) {
      S = { ...real, tubes: real.tubes.map(t => t.slice()), hidden: real.hidden.map(h => h.slice()) };
      for (let k = 0; k < 60; k++) {
        const moves = [];
        for (let i = 0; i < S.tubes.length; i++) for (let j = 0; j < S.tubes.length; j++) if (canPour(i, j) && !isDoneTube(S.tubes[i]) && !(S.tubes[j].length === 0 && topRun(S.tubes[i]) === S.tubes[i].length)) moves.push([i, j]);
        if (!moves.length) break;
        const [i, j] = moves[Math.floor(Math.random() * moves.length)];
        const n = Math.min(topRun(S.tubes[i]), CFG.cap - S.tubes[j].length);
        for (let x = 0; x < n; x++) S.tubes[j].push(S.tubes[i].pop());
        if (usefulMoveExists() && window.__csSolve(S.tubes, lockOf()).res === 'dead') {
          const tubes = S.tubes; S = real; S.tubes = tubes; S.hidden = tubes.map(t => t.map(() => 0)); S.moves = k + 1; S.history = [];
          render(); updateHud(); afterBoardChange(); return true;
        }
      }
    }
    S = real; return false;
  });
  check('bot found a position with moves left but no win', found);
  await page.waitForTimeout(1600);
  check('early dead-end window ("can no longer be solved")', await visible(page, '#stuckOverlay') && await ev(page, () => $('#stuckTitle').textContent === tr().earlyTitle));
  await shot(page, 'early-1-window');
  await page.close();
}

// ---------- 5. solver timing on levels 100 / 300 / 500 ----------
{
  const page = await open({ width: 393, height: 852 }, base());
  const timing = await ev(page, () => {
    const rows = [];
    for (const n of [20, 50, 100, 300, 500, LEVELS.reduce((b, L, i) => L.tubes.length > LEVELS[b - 1].tubes.length ? i + 1 : b, 1)]) {
      const L = LEVELS[n - 1];
      const r0 = window.__csSolve(L.tubes, L.lock || null);
      // mid-game positions: random play, then solve (as the game does after a move)
      let worst = 0, unknown = 0, total = 0, dead = 0;
      for (let a = 0; a < 40; a++) {
        const st = L.tubes.map(t => t.slice());
        const k = 4 + (a % 12);
        for (let m = 0; m < k; m++) {
          const mv = [];
          for (let i = 0; i < st.length; i++) for (let j = 0; j < st.length; j++) {
            if (i === j || !st[i].length || st[j].length >= 4) continue;
            if (L.lock && (i === L.lock.t || j === L.lock.t)) continue;
            if (st[j].length && st[j][st[j].length - 1] !== st[i][st[i].length - 1]) continue;
            mv.push([i, j]);
          }
          if (!mv.length) break;
          const [i, j] = mv[Math.floor(Math.random() * mv.length)];
          let run = 1; const a = st[i]; while (run < a.length && a[a.length - 1 - run] === a[a.length - 1]) run++;
          for (let x = Math.min(run, 4 - st[j].length); x > 0; x--) st[j].push(st[i].pop());   // a whole run, as in the game
        }
        const r = window.__csSolve(st, L.lock || null);
        worst = Math.max(worst, r.ms); total += r.ms; if (r.res === 'unknown') unknown++; if (r.res === 'dead') dead++;
      }
      rows.push({ level: n, tubes: L.tubes.length, start: `${r0.res} ${r0.ms}ms ${r0.states}st`, midAvgMs: Math.round(total / 40), midWorstMs: worst, unknown, dead });
    }
    return rows;
  });
  for (const r of timing) check(`solver L${r.level} (${r.tubes} tubes): start ${r.start}; 40 mid-game positions avg ${r.midAvgMs} ms, worst ${r.midWorstMs} ms, dead ${r.dead}, over limit ${r.unknown}`, r.midWorstMs <= 400);
  fs.writeFileSync(path.join(out, 'solver-timing.json'), JSON.stringify(timing, null, 2));
  await page.close();
}

// ---------- 6. small screens and the artifact wrapper ----------
for (const [vp, wrapper, name] of [[{ width: 320, height: 640 }, false, '320x640'], [{ width: 393, height: 740 }, true, '393x740-wrapper']]) {
  const page = await open(vp, base({ coins: 0, inv: { undo: 0, tube: 0, time: 2 } }), { wrapper });
  await play(page, 21);
  await shot(page, `${name}-1-hud-timed`);
  const fit = await ev(page, () => [...document.querySelectorAll('.tools .tool')].filter(b => !b.hidden).every(b => { const r = b.getBoundingClientRect(), bd = (b.querySelector('.badge') || b).getBoundingClientRect(), lb = b.querySelector('[data-t]'); return bd.right <= innerWidth && lb.scrollWidth <= lb.clientWidth + 1 && r.right <= innerWidth; }));
  check(`${name}: 4 tool buttons fit, labels not clipped`, fit);
  await goStuck(page);
  await shot(page, `${name}-2-stuck`);
  const inView = await ev(page, () => { const c = document.querySelector('#stuckOverlay .card').getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight + 1; });
  check(`${name}: dead-end window fits the screen`, await visible(page, '#stuckOverlay') && inView);
  const textsFit = await ev(page, () => [...document.querySelectorAll('#stuckOverlay .btn')].filter(b => b.offsetParent).every(b => b.scrollWidth <= b.clientWidth + 1));
  check(`${name}: button texts inside their buttons`, textsFit);
  await page.close();
}

await browser.close();
console.log('dead-end window appeared after (ms):', stuckWaits.join(', '));
check('dead-end windows: nothing spills over the card or the screen', overflow.length === 0, overflow.slice(0, 4).join(' | '));
check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
