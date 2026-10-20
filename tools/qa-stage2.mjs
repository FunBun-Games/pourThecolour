// Stage 2 QA bot: tab bar, swipe, shop purchases (demo), starter pack once, piggy bank, ad coins with a daily limit,
// restore purchases, shop over a level, the starter pack in the dead-end window, small screens.
// Usage: node tools/build.mjs && node tools/qa-stage2.mjs
// Needs Playwright (PLAYWRIGHT_PATH or /opt/node-tools/node_modules/playwright) and its Chromium (/opt/pw-browsers).
// Screenshots go to qa-out/stage2/.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'dist/prototype.html');
const out = path.join(root, 'qa-out/stage2');
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };
const errors = [];
const browser = await chromium.launch();

// A web Platform stub (native: false) records analytics events in window.__ev; everything else stays in demo mode.
async function open(vp, save, { wrapper = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${vp.width}x${vp.height}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${vp.width}x${vp.height}: ${m.text()}`); });
  await page.addInitScript(([s, w]) => {
    localStorage.setItem('pourSort:save', JSON.stringify(s));
    window.__ev = [];
    window.Platform = { native: false, init: async () => {}, ready: Promise.resolve(), remote: {}, persist() {}, haptic() { return false; },
      track: (n, p) => window.__ev.push([n, p || {}]), setUserProperty() {}, ads: { enabled: false }, iap: {}, env: {} };
    if (w) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'img{max-width:100%}button{padding:1px 6px}'; document.head.prepend(st); });
  }, [save, wrapper]);
  await page.goto(url);
  await page.waitForTimeout(700);
  return page;
}
const base = (o = {}) => Object.assign({ level: 12, coins: 100, noAds: false, sound: false, music: false, lang: 'uk', sinceAd: 0, stats: { 0: {} }, variant: 'balls',
  tips: { lock: 1, hidden: 1, one: 1 }, granted: { undo: 1, time: 1, tube: 1 }, inv: { undo: 0, tube: 0, time: 0 }, piggy: 0, starterShown: 1, piggyTold: 1 }, o);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const visible = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return !!el && !el.closest('[hidden]') && el.getBoundingClientRect().height > 0; }, sel);
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
const events = (page, name) => ev(page, n => window.__ev.filter(e => e[0] === n).map(e => e[1]), name);
const st = page => ev(page, () => ({ coins: save.coins, inv: { ...save.inv }, piggy: save.piggy, starterBought: !!save.starterBought, noAds: !!save.noAds }));
const swipe = (page, sel, dx) => ev(page, ([sel, dx]) => {
  const el = document.querySelector(sel), x = innerWidth / 2, y = innerHeight / 2;
  const t = (cx) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x)], changedTouches: [t(x)], bubbles: true }));
  el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx)], bubbles: true }));
}, [sel, dx]);
const closeDemoAd = async page => { await page.waitForSelector('#adClose:not([hidden])', { timeout: 8000 }); await page.click('#adClose'); await page.waitForTimeout(350); };
// nothing in the given container spills over it or the screen, and no text is cut inside its box
const spill = (page, sel) => ev(page, sel => {
  const box = document.querySelector(sel); if (!box) return ['missing ' + sel];
  const r = box.getBoundingClientRect(), bad = [];
  if (r.left < -0.5 || r.right > innerWidth + 0.5) bad.push(sel);
  for (const e of box.querySelectorAll('*')) {
    if (!e.offsetParent || e.closest('svg') && e.tagName !== 'svg') continue;
    const q = e.getBoundingClientRect();
    if (q.right > innerWidth + 0.5 || q.left < -0.5) bad.push((e.id || e.className.baseVal || e.className || e.tagName) + '@screen');
    if (e.matches('.btn, h2, h3, p, small, .tag, .pk, .ribbon, .tab span, b') && e.scrollWidth > e.clientWidth + 1) bad.push((e.id || e.className || e.tagName) + '@clip');
  }
  return bad;
}, sel);
// a quick win of the current level with the minimum number of moves
const winNow = async page => { await ev(page, () => { S.moves = LEVELS[S.li].minMoves; win(); }); await page.waitForTimeout(500); };

// ---------- 1. tab bar, shop tab, swipe ----------
{
  const page = await open({ width: 393, height: 852 }, base());
  check('home (map): tab bar visible with 5 slots', await visible(page, '#tabbar') && (await ev(page, () => $('#tabbar').querySelectorAll('.tab').length)) === 5);
  check('home: Home is the active tab, in the middle', await ev(page, () => { const t = [...$('#tabbar').querySelectorAll('.tab')]; return t[2].dataset.tab === 'home' && t[2].classList.contains('on'); }));
  const wide = await ev(page, () => { const t = [...$('#tabbar').querySelectorAll('.tab')].map(b => b.getBoundingClientRect()); return t[2].width > t[0].width * 1.3 && t[2].height > t[0].height; });
  check('active tab is wider and raised', wide);
  check('home: starter pack open on level 13 → red dot on Shop', await visible(page, '#tabbar .tab[data-tab="shop"] .dot'));
  check('home: coins have a "+"', await visible(page, '#map .coins .plus'));
  await shot(page, '01-home-tabs');
  await page.click('#tabbar .tab[data-tab="collection"]'); await page.waitForTimeout(300);
  check('locked tab: "soon" toast, stays on Home', await ev(page, () => tabNow === 'home' && /скоро/.test(document.querySelector('.toast')?.textContent || '')));
  await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  check('tap Shop → shop page, Shop tab active', await visible(page, '#shop') && await ev(page, () => tabNow === 'shop' && $('#tabbar .tab.on').dataset.tab === 'shop'));
  check('shop_open logged (from tab)', (await events(page, 'shop_open')).some(e => e.from === 'tab'));
  check('starter pack shown in the shop + iap_offer_shown', await visible(page, '#offStarter') && (await events(page, 'iap_offer_shown')).some(e => e.product === 'starter_pack' && e.place === 'shop'));
  check('red dot gone after the shop was opened', !(await visible(page, '#tabbar .tab[data-tab="shop"] .dot')));
  await shot(page, '02-shop-top');
  await ev(page, () => $('#shopScroll').scrollTop = 1e5); await page.waitForTimeout(200);
  await shot(page, '03-shop-bottom');
  const sp = await spill(page, '#shop'); check('393: nothing spills out of the shop', !sp.length, sp.slice(0, 5).join(', '));
  await swipe(page, '#shop', -140); await page.waitForTimeout(500);
  check('swipe left on the shop → Home', await ev(page, () => tabNow === 'home' && $('#shop').hidden));
  check('tab_swipe logged', (await events(page, 'tab_swipe')).some(e => e.tab === 'home'));
  await swipe(page, '#map', 140); await page.waitForTimeout(500);
  check('swipe right on Home → Shop', await ev(page, () => tabNow === 'shop' && !$('#shop').hidden));
  await swipe(page, '#shop', 140); await page.waitForTimeout(400);
  check('swipe right on the shop (leftmost) stays on the shop', await ev(page, () => tabNow === 'shop'));
  await page.click('#tabbar .tab[data-tab="home"]'); await page.waitForTimeout(500);
  check('map: tab bar visible, coins with "+"', await visible(page, '#tabbar') && await visible(page, '#map .coins .plus'));
  await shot(page, '04-map-tabs');
  await page.click('#map .coins'); await page.waitForTimeout(500);
  check('map: coins "+" opens the shop', await visible(page, '#shop') && (await events(page, 'shop_open')).some(e => e.from === 'coins'));
  await page.click('#tabbar .tab[data-tab="home"]'); await page.waitForTimeout(500);
  check('back to Home from the map\'s shop returns to the map', await visible(page, '#map') && await ev(page, () => screenNow === 'map'));
  await page.close();
}

// ---------- 2. every purchase (demo) ----------
{
  const page = await open({ width: 393, height: 852 }, base({ coins: 0 }));
  await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  const buyIn = async (id, sel) => { const b = await st(page); await page.click(sel || `#shop [data-buy="${id}"]`); await page.waitForTimeout(350); return [b, await st(page)]; };
  const P = await ev(page, () => ({ s: CFG.starterPack, l: CFG.labPack, sc: CFG.scientistPack, p: CFG.professorPack }));
  const gained = (a, b, pk) => b.coins - a.coins === pk.coins && ['tube', 'undo', 'time'].every(k => b.inv[k] - a.inv[k] === pk[k]);
  let [a, b] = await buyIn('starter_pack');
  check('starter pack: 500 coins + 2 tubes + 3 undos + 2 × +30 s', gained(a, b, P.s) && b.starterBought);
  check('starter pack card hidden after the purchase', !(await visible(page, '#offStarter')));
  check('starter pack cannot be bought twice', !(await ev(page, () => shopBuy('starter_pack', 'qa'))) && (await st(page)).coins === b.coins);
  [a, b] = await buyIn('lab_pack'); check('lab pack: 1500 + 3/5/3', gained(a, b, P.l));
  [a, b] = await buyIn('scientist_pack'); check('scientist pack: 4000 + 8/10/8', gained(a, b, P.sc));
  [a, b] = await buyIn('professor_pack'); check('professor pack: 10000 + 20/25/20', gained(a, b, P.p));
  for (const n of [500, 1500, 5000]) { [a, b] = await buyIn('coins_' + n); check(`coins_${n}: +${n}`, b.coins - a.coins === n); }
  [a, b] = await buyIn('noads');
  check('no ads: bought, button shows "Куплено" and is disabled', b.noAds && await ev(page, () => $('#noAdsBtn').disabled && $('#noAdsBtn').textContent === tr().owned));
  const pe = await events(page, 'purchase');
  check('purchase events carry product, price and place', pe.length === 8 && pe.every(e => e.product && e.price && e.place === 'shop' && e.demo === 1), `${pe.length} events`);
  // restore purchases (browser: nothing to restore)
  await ev(page, () => $('#shopScroll').scrollTop = 1e5); await page.waitForTimeout(150);
  await page.click('#restoreBtn'); await page.waitForTimeout(250);
  check('restore purchases: answered with a toast', await ev(page, () => document.querySelector('.toast')?.textContent === tr().nothingRestored));
  await page.close();
}

// ---------- 3. piggy bank: filling on wins, threshold, cap, breaking ----------
{
  const page = await open({ width: 393, height: 852 }, base({ piggy: 990, noAds: true }));
  await ev(page, () => playLevel(12)); await page.waitForTimeout(700);
  await winNow(page);
  const s1 = await st(page), stars = await ev(page, () => save.best[12]);
  check(`win: piggy +10 + 2×${stars} stars`, s1.piggy === 990 + 10 + 2 * stars, `${s1.piggy}`);
  check('win screen shows "+N у скарбничку · можна розбити"', await visible(page, '#winPiggy') && await ev(page, () => /у скарбничку · можна розбити/.test($('#winPiggyText').textContent)));
  check('piggy_fill (ready) logged when 1000 is crossed', (await events(page, 'piggy_fill')).some(e => e.stage === 'ready'));
  await shot(page, '05-win-piggy');
  const spw = await spill(page, '#winOverlay .card'); check('win card with the piggy line fits', !spw.length, spw.join(', '));
  // the next map visit offers to break it once
  await page.click('#nextBtn'); await page.waitForTimeout(1600);
  check('map after the win: "piggy bank is ready" offer first', await visible(page, '#shopPop') && await ev(page, () => $('#shopPopTitle').textContent === tr().piggyReadyTitle));
  await shot(page, '06-piggy-ready-popup');
  await page.click('#shopPopLater'); await page.waitForTimeout(500);
  check('…then the pre-level card', await visible(page, '#preOverlay'));
  await ev(page, () => hide('#preOverlay'));
  await ev(page, () => showMap()); await page.waitForTimeout(600);
  check('the offer is shown only once', !(await visible(page, '#shopPop')));
  // cap
  await ev(page, () => { save.piggy = 2995; playLevel(12); }); await page.waitForTimeout(700);
  await winNow(page);
  check('cap: piggy stops at 3000, piggy_fill (full) logged', (await st(page)).piggy === 3000 && (await events(page, 'piggy_fill')).some(e => e.stage === 'full'));
  await ev(page, () => { hide('#winOverlay'); playLevel(12); }); await page.waitForTimeout(700);
  await winNow(page);
  check('full piggy: win screen says it is full', await ev(page, () => $('#winPiggyText').textContent === tr().piggyWinFull) && (await st(page)).piggy === 3000);
  await ev(page, () => { hide('#winOverlay'); showHome(); }); await page.waitForTimeout(500);
  // below the threshold the button is off
  await ev(page, () => { save.piggy = 400; }); await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  check('piggy under 1000: break button disabled', await ev(page, () => $('#offPiggy [data-buy]').disabled) && !(await ev(page, () => shopBuy('piggy_bank', 'qa'))));
  await page.click('#tabbar .tab[data-tab="home"]'); await page.waitForTimeout(400);
  await ev(page, () => { save.piggy = 1850; }); await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  await shot(page, '07-shop-piggy-ready');
  const before = await st(page);
  await page.click('#offPiggy [data-buy]'); await page.waitForTimeout(400);
  const after = await st(page);
  check('break: all 1850 coins go to the wallet, piggy back to 0', after.coins - before.coins === 1850 && after.piggy === 0);
  check('piggy_break logged with the amount', (await events(page, 'piggy_break')).some(e => e.amount === 1850));
  await page.close();
}

// ---------- 4. coins for a rewarded ad, 3 a day ----------
{
  const page = await open({ width: 393, height: 852 }, base({ noAds: true }));
  await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  await ev(page, () => $('#shopScroll').scrollTop = 1e5);
  for (let k = 1; k <= 3; k++) {
    const c0 = (await st(page)).coins;
    await page.click('#adCoinsBtn'); await closeDemoAd(page);
    check(`ad coins #${k}: +50`, (await st(page)).coins - c0 === 50);
  }
  check('daily limit: button off, "more tomorrow"', await ev(page, () => $('#adCoinsBtn').disabled && $('#adCoinsLeft').textContent === tr().freeDone));
  await shot(page, '08-ad-coins-limit');
  check('shop_ad_coins logged 3 times', (await events(page, 'shop_ad_coins')).length === 3);
  await ev(page, () => { save.adCoins.d = '2000-1-1'; renderShop(); });
  check('next day: 3 again', await ev(page, () => !$('#adCoinsBtn').disabled && adCoinsLeft() === 3));
  await page.close();
}

// ---------- 5. starter pack: popup on level 8, once; and in the dead-end window ----------
{
  const page = await open({ width: 393, height: 852 }, base({ level: 6, starterShown: 0, coins: 0 }));
  check('level 7: no starter pack yet', !(await visible(page, '#shopPop')) && !(await ev(page, () => starterOpen())));
  await ev(page, () => playLevel(6)); await page.waitForTimeout(700);
  await winNow(page);
  await page.click('#nextBtn'); await page.waitForTimeout(1700);
  check('reaching level 8: starter pack offer before the pre-level card', await visible(page, '#shopPop') && await ev(page, () => $('#shopPopTitle').textContent === tr().starterTitle) && !(await visible(page, '#preOverlay')));
  check('iap_offer_shown (popup) logged', (await events(page, 'iap_offer_shown')).some(e => e.product === 'starter_pack' && e.place === 'popup'));
  await shot(page, '09-starter-popup');
  const spp = await spill(page, '#shopPop .card'); check('starter popup fits', !spp.length, spp.join(', '));
  await page.click('#shopPopLater'); await page.waitForTimeout(500);
  check('"Later" → pre-level card', await visible(page, '#preOverlay'));
  await ev(page, () => { hide('#preOverlay'); showHome(); }); await page.waitForTimeout(700);
  check('starter popup only once', !(await visible(page, '#shopPop')));
  // dead end with no coins → the starter pack in the window
  await ev(page, () => { CFG.timedFrom = 9999; playLevel(40); }); await page.waitForTimeout(800);
  let ok = false; for (let k = 0; k < 12 && !ok; k++) ok = await ev(page, () => testerStuck());
  await page.waitForSelector('#stuckOverlay:not([hidden])', { timeout: 6000 }).catch(() => {});
  check('dead end without coins: starter pack offered in the window', await visible(page, '#stShop.st-starter') && (await events(page, 'iap_offer_shown')).some(e => e.place === 'stuck'));
  await shot(page, '10-stuck-starter');
  const sps = await spill(page, '#stuckOverlay .card'); check('dead-end window with the starter pack fits', !sps.length, sps.join(', '));
  const s0 = await st(page);
  await page.click('#stShop'); await page.waitForTimeout(400);
  const s = await st(page);
  check('bought in the window: +500 coins, 2 tubes in stock → "+1 tube from stock"', s.coins - s0.coins === 500 && s.inv.tube === 2 && await visible(page, '#stStock'));
  await shot(page, '10b-stuck-after-starter');
  check('purchase place = stuck; stuck_offer how=shop', (await events(page, 'purchase')).some(e => e.place === 'stuck' && e.product === 'starter_pack') && (await events(page, 'stuck_offer')).some(e => e.how === 'shop' && e.product === 'starter_pack'));
  await page.click('#stStock'); await page.waitForTimeout(400);
  // later dead ends with no coins offer the 500-coin pack instead
  await ev(page, () => { save.coins = 0; save.inv.tube = 0; onRestart(); }); await page.waitForTimeout(500);
  ok = false; for (let k = 0; k < 12 && !ok; k++) ok = await ev(page, () => testerStuck());
  await page.waitForSelector('#stuckOverlay:not([hidden])', { timeout: 6000 }).catch(() => {});
  check('after the starter pack: the 500-coin pack in the window', await visible(page, '#stShop') && !(await visible(page, '#stShop.st-starter')));
  await page.close();
}

// ---------- 6. the shop over a level (coins "+" in the HUD, settings) ----------
{
  const page = await open({ width: 393, height: 852 }, base({ noAds: true }));
  await ev(page, () => playLevel(25)); await page.waitForTimeout(2300);
  const t0 = await ev(page, () => elapsed());
  await page.click('.hud .coins'); await page.waitForTimeout(500);
  check('HUD coins → shop window over the board, no tab bar', await visible(page, '#shop.modal') && !(await visible(page, '#tabbar')) && await visible(page, '#shopClose'));
  await shot(page, '11-shop-over-level');
  await page.waitForTimeout(1500);
  check('clock stands while the shop is open', (await ev(page, () => elapsed())) === t0);
  await page.click('#shop [data-buy="lab_pack"]'); await page.waitForTimeout(400);
  check('bought during a level: HUD shows the new stock', await ev(page, () => $('#tubeBadge').textContent === '×3'));
  await page.click('#shopClose'); await page.waitForTimeout(300);
  check('closing returns to the level, clock runs again', !(await visible(page, '#shop')) && await ev(page, () => screenNow === 'game' && pauseDepth === 0));
  await page.click('#settingsBtn'); await page.waitForTimeout(300);
  await page.click('#settingsShopBtn'); await page.waitForTimeout(400);
  check('settings → "Open the shop" works in a level', await visible(page, '#shop.modal') && (await events(page, 'shop_open')).some(e => e.from === 'settings'));
  await page.click('#shopClose'); await page.waitForTimeout(300);
  await ev(page, () => leaveLevel()); await page.waitForTimeout(500);
  check('leaving the level: tab bar back on the map', await visible(page, '#tabbar') && !(await visible(page, '#shop')));
  await page.close();
}

// ---------- 7. small screens and the artifact wrapper ----------
for (const [vp, wrapper, name] of [[{ width: 320, height: 640 }, false, '320x640'], [{ width: 393, height: 740 }, true, '393x740-wrapper']]) {
  const page = await open(vp, base({ piggy: 1240, starterShown: 0 }), { wrapper });
  await page.waitForTimeout(400);
  check(`${name}: starter popup on home`, await visible(page, '#shopPop'));
  const sp0 = await spill(page, '#shopPop .card'); check(`${name}: popup fits`, !sp0.length && await ev(page, () => { const r = $('#shopPop .card').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; }), sp0.join(', '));
  await shot(page, `${name}-1-popup`);
  await page.click('#shopPopLater'); await page.waitForTimeout(400);
  await shot(page, `${name}-2-home`);
  const tb = await ev(page, () => { const bar = $('#tabbar').getBoundingClientRect(), cta = $('#homePlay').getBoundingClientRect(); return { overlap: cta.bottom > bar.top + 1, fit: bar.right <= innerWidth + 0.5 }; });
  check(`${name}: home buttons above the tab bar`, !tb.overlap && tb.fit);
  const spt = await spill(page, '#tabbar'); check(`${name}: tabs fit`, !spt.length, spt.join(', '));
  await page.click('#tabbar .tab[data-tab="shop"]'); await page.waitForTimeout(500);
  await shot(page, `${name}-3-shop`);
  const sp = await spill(page, '#shop'); check(`${name}: nothing spills out of the shop, no clipped text`, !sp.length, sp.slice(0, 6).join(', '));
  const last = await ev(page, () => { $('#shopScroll').scrollTop = 1e5; const r = $('#restoreBtn').getBoundingClientRect(), bar = $('#tabbar').getBoundingClientRect(); return r.bottom <= bar.top; });
  await page.waitForTimeout(200);
  await shot(page, `${name}-4-shop-bottom`);
  check(`${name}: the last row scrolls clear of the tab bar`, last);
  await page.close();
}

await browser.close();
check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
