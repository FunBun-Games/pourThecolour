/* ---------- Shop, bottom tab bar, piggy bank, starter pack (stage 2, 20 Oct 2026) ----------
   Tab bar (Heli Blast pattern) on the home screen and the map: Shop · Collection · Home · Ranking · Bonus,
   Home in the middle. Collection (stage 5), Ranking (stage 6) and Bonus (stage 4) are not built yet:
   with CFG.tabsSoon = 1 they show as locked "soon" slots, with 0 they are hidden. The active tab is wider
   and raised; the shop slides in like a page (tap or a horizontal swipe). Coins at the top with "+" open the shop;
   during a level the shop opens over the board as a window (the clock stands).
   Purchases [proposal, prices to be approved by the founder]: starter pack (once; offered after the first dead end
   or on level CFG.starterShowAt), three bigger packs, coins, no ads, piggy bank.
   Piggy bank (Hexa Sort pattern): every win drops CFG.piggyPerWin + CFG.piggyPerStar × stars coins in,
   up to CFG.piggyCap; from CFG.piggyBreakAt it can be broken for one purchase, then it starts from zero.
   Free coins: CFG.adCoins for a rewarded ad, CFG.adCoinsPerDay times a day.
   Events: shop_open, iap_offer_shown, purchase, piggy_fill, piggy_break, shop_ad_coins, tab_open, tab_swipe. */

function ensureShop() {
  if (typeof save.piggy !== 'number') save.piggy = 0;
}
ensureShop();

// what each product gives; prices are CFG fallbacks, the App Store price wins on iOS
const SHOP_ITEMS = {
  starter_pack: { pack: 'starterPack', price: 'starterPrice' },
  lab_pack: { pack: 'labPack', price: 'labPrice' },
  scientist_pack: { pack: 'scientistPack', price: 'scientistPrice' },
  professor_pack: { pack: 'professorPack', price: 'professorPrice' },
  piggy_bank: { piggy: 1, price: 'piggyPrice' },
  coins_500: { coins: 500, price: 'coins500Price' },
  coins_1500: { coins: 1500, price: 'coins1500Price' },
  coins_5000: { coins: 5000, price: 'coins5000Price' },
  noads: { noads: 1, price: 'noAdsPrice' }
};
const iapPrice = id => (NATIVE && P.iap.price(id)) || CFG[SHOP_ITEMS[id].price];
const fmtN = n => Number(n).toLocaleString(save.lang === 'uk' ? 'uk-UA' : 'en-US');
const starterOpen = () => !save.starterBought && (!!save.starterOpen || save.level + 1 >= CFG.starterShowAt);
const piggyReady = () => save.piggy >= CFG.piggyBreakAt;
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function adCoinsLeft() {
  if (!save.adCoins || save.adCoins.d !== todayKey()) save.adCoins = { d: todayKey(), n: 0 };
  return Math.max(0, CFG.adCoinsPerDay - save.adCoins.n);
}

Object.assign(T.uk, {
  demo: 'демо', shop: 'Магазин', tabHome: 'Дім', tabCollection: 'Колекція', tabRank: 'Рейтинг', tabBonus: 'Бонус', soon: name => `${name} — скоро`,
  onceOnly: 'Лише один раз', bestValue: 'Найвигідніше', popular: 'Популярне',
  packNames: { starter_pack: 'Стартовий набір', lab_pack: 'Набір лаборанта', scientist_pack: 'Набір науковця', professor_pack: 'Набір професора' },
  starterSub: 'Усе, щоб не застрягнути на перших складних рівнях',
  packsTitle: 'Набори', coinsTitle: 'Монети',
  piggyName: 'Скарбничка', piggyHow: (p, s) => `Кожна перемога кладе сюди монети: ${p} + ${s} за кожну зірку.`,
  piggyLocked: n => `Розбити можна, коли збереться ${fmtN(n)}`, piggyCanBreak: 'Можна розбити — усі монети ваші', piggyFull: 'Скарбничка повна — нові монети вже не влазять',
  piggyWin: n => `+${n} у скарбничку`, piggyWinReady: 'можна розбити', piggyWinFull: 'Скарбничка повна — розбийте її в магазині',
  piggyBroken: n => `+${fmtN(n)} монет зі скарбнички`,
  piggyReadyTitle: 'Скарбничку можна розбити', piggyReadyText: n => `У ній уже ${fmtN(n)} монет. Розбийте зараз або збирайте далі — до ${fmtN(CFG.piggyCap)}.`,
  freeCoins: 'Безкоштовно', freeLeft: (n, of) => `Безкоштовно · ${n} з ${of}`, freeDone: 'Нові — завтра',
  noAdsName: 'Без реклами', noAdsText: 'Без реклами між рівнями і банера. Реклама за нагороду лишається за бажанням.', owned: 'Куплено',
  packGot: 'Набір отримано!', later: 'Пізніше', starterTitle: 'Стартовий набір',
  starterText: 'Монети й бустери в запас за ціною одного маленького пакета. Пропозиція одноразова.',
  stuckStarter: 'Стартовий набір', stuckStarterSub: (c, tb, u, tm) => `${c} монет · пробірки ×${tb} · скасування ×${u} · +30 с ×${tm}`,
  shopBtn: 'Відкрити магазин', restoreNone: 'Покупок для відновлення немає',
  tPiggy: 'Скарбничка +500', tShopReset: 'Магазин знову', tPiggyDone: 'Скарбничка: +500', tShopResetDone: 'Стартовий набір і реклама за монети скинуто'
});
Object.assign(T.en, {
  demo: 'demo', shop: 'Shop', tabHome: 'Home', tabCollection: 'Collection', tabRank: 'Ranking', tabBonus: 'Bonus', soon: name => `${name} — coming soon`,
  onceOnly: 'One time only', bestValue: 'Best value', popular: 'Popular',
  packNames: { starter_pack: 'Starter Pack', lab_pack: 'Lab Pack', scientist_pack: 'Scientist Pack', professor_pack: 'Professor Pack' },
  starterSub: 'Everything you need to get past the first tough levels',
  packsTitle: 'Packs', coinsTitle: 'Coins',
  piggyName: 'Piggy Bank', piggyHow: (p, s) => `Every win drops coins in: ${p} + ${s} per star.`,
  piggyLocked: n => `It can be broken once it holds ${fmtN(n)}`, piggyCanBreak: 'Ready to break — all the coins are yours', piggyFull: 'The piggy bank is full — new coins no longer fit',
  piggyWin: n => `+${n} to the piggy bank`, piggyWinReady: 'ready to break', piggyWinFull: 'The piggy bank is full — break it in the shop',
  piggyBroken: n => `+${fmtN(n)} coins from the piggy bank`,
  piggyReadyTitle: 'Your piggy bank is ready', piggyReadyText: n => `It already holds ${fmtN(n)} coins. Break it now or keep filling it — up to ${fmtN(CFG.piggyCap)}.`,
  freeCoins: 'Free', freeLeft: (n, of) => `Free · ${n} of ${of} today`, freeDone: 'More tomorrow',
  noAdsName: 'No ads', noAdsText: 'No ads between levels and no banner. Rewarded ads stay optional.', owned: 'Owned',
  packGot: 'Pack received!', later: 'Later', starterTitle: 'Starter Pack',
  starterText: 'Coins and boosters in stock for the price of one small coin pack. A one-time offer.',
  stuckStarter: 'Starter Pack', stuckStarterSub: (c, tb, u, tm) => `${c} coins · tubes ×${tb} · undos ×${u} · +30 s ×${tm}`,
  shopBtn: 'Open the shop', restoreNone: 'Nothing to restore',
  tPiggy: 'Piggy bank +500', tShopReset: 'Shop again', tPiggyDone: 'Piggy bank: +500', tShopResetDone: 'Starter pack and ad coins reset'
});

/* ----- art: drawn in code until the ChatGPT icons (GPT-2) arrive; SHOP_ART maps an id to a PNG that replaces it ----- */
const SHOP_ART = {};   // e.g. { starter_pack: 'art/shop/starter.png' }
const OUT = '#1d2230';
const coinSvg = (x, y, r = 7) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#ffbe55" stroke="${OUT}" stroke-width="2"/><circle r="${r * 0.55}" fill="none" stroke="#c98316" stroke-width="1.6"/><circle r="${r * 0.3}" cx="${-r * 0.35}" cy="${-r * 0.35}" fill="#fff3c8"/></g>`;
const tubeSvg = (x, y, c, h = 26, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-5" y="${-h}" width="10" height="${h}" rx="5" fill="rgba(236,240,255,.25)" stroke="${OUT}" stroke-width="2"/><rect x="-3.2" y="${-h * 0.55}" width="6.4" height="${h * 0.55 - 1.8}" rx="3.2" fill="${c}"/><rect x="-7" y="${-h - 2}" width="14" height="4" rx="2" fill="#dfe6ff" stroke="${OUT}" stroke-width="1.6"/></g>`;
function chestSvg(body, lid, band, extra) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${extra.back || ''}` +
    `<path d="M10 30h44v22a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="${body}" stroke="${OUT}" stroke-width="2.5"/>` +
    `<path d="M10 30h44v6H10z" fill="${band}" stroke="${OUT}" stroke-width="2.5"/>` +
    `<path d="M14 56V30M50 56V30" stroke="${band}" stroke-width="4"/>` +
    `<rect x="28" y="33" width="8" height="10" rx="2" fill="#ffd166" stroke="${OUT}" stroke-width="2"/>` +
    (extra.front || '') +
    `<path d="M8 30c2-8 46-8 48 0" fill="${lid}" stroke="${OUT}" stroke-width="2.5" transform="${extra.lid || ''}"/></svg>`;
}
const SPARK = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5z" fill="#fff6c9"/>`;
const ART = {
  starter_pack: () => `<svg viewBox="0 0 64 64" aria-hidden="true">${tubeSvg(40, 34, 'var(--c5)', 26, 14)}${tubeSvg(26, 32, 'var(--c0)', 24, -10)}` +
    `<path d="M12 32h40v20a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#d08a4a" stroke="${OUT}" stroke-width="2.5"/><path d="M12 32l-4-6h20l4 6zM52 32l4-6H36l-4 6z" fill="#e7a764" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `${coinSvg(24, 46, 6)}${coinSvg(38, 48, 6)}${coinSvg(31, 42, 6)}</svg>`,
  lab_pack: () => chestSvg('#3c7fe0', '#5a9cf2', '#244f9a', { back: tubeSvg(22, 30, 'var(--c3)', 22, -12) + tubeSvg(42, 30, 'var(--c7)', 22, 12) + coinSvg(32, 26, 6) }),
  scientist_pack: () => chestSvg('#8253d6', '#9d71ec', '#55309c', { back: tubeSvg(18, 30, 'var(--c3)', 24, -18) + tubeSvg(46, 30, 'var(--c1)', 24, 18) + `<path d="M28 10h8v7l7 11H21l7-11z" fill="rgba(236,240,255,.3)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M24 24h16l3 4H21z" fill="var(--c4)"/>` + coinSvg(25, 27, 6) + coinSvg(39, 27, 6) + coinSvg(32, 24, 6) }),
  professor_pack: () => chestSvg('#e2a12c', '#f5c451', '#a8661a', { back: tubeSvg(14, 30, 'var(--c6)', 24, -22) + tubeSvg(50, 30, 'var(--c0)', 24, 22) + tubeSvg(32, 24, 'var(--c3)', 22, 0) + coinSvg(22, 27, 6) + coinSvg(42, 27, 6) + coinSvg(28, 24, 6) + coinSvg(36, 24, 6), front: SPARK(10, 12) + SPARK(55, 14, 0.8) + SPARK(52, 46, 0.7) }),
  piggy_bank: (fill = 0.6) => {
    // a pink piggy with a round glass belly; the gold level inside shows how full it is
    const h = 24 * Math.max(0.1, Math.min(1, fill)), top = 48 - h;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="pgClip"><circle cx="30" cy="36" r="12"/></clipPath></defs>` +
      `<path d="M17 47l-1 9h7l1-6zM41 47l1 9h7l-1-6z" fill="#e0679f" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M18 21l-2-10 10 6zM40 19l4-9 4 10z" fill="#e0679f" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<ellipse cx="32" cy="35" rx="22" ry="19" fill="#f08bb8" stroke="${OUT}" stroke-width="2.5"/>` +
      `<path d="M8 33c-3-1-4 3-1 4" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="30" cy="36" r="12" fill="rgba(25,28,53,.55)"/><g clip-path="url(#pgClip)"><rect x="16" y="${top.toFixed(1)}" width="28" height="30" fill="#ffbe55"/>` +
      `${[22, 30, 38].map((x, i) => `<circle cx="${x}" cy="${(top + 2.5 + (i % 2) * 2).toFixed(1)}" r="4" fill="#ffd98a" stroke="#c98316" stroke-width="1.2"/>`).join('')}</g>` +
      `<circle cx="30" cy="36" r="12" fill="none" stroke="${OUT}" stroke-width="2"/><path d="M22 31a9 9 0 0 1 5-5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/>` +
      `<rect x="25" y="14.5" width="12" height="3.5" rx="1.7" fill="${OUT}"/>` +
      `<ellipse cx="53" cy="34" rx="5.5" ry="6.5" fill="#f6a7cb" stroke="${OUT}" stroke-width="2.2"/><circle cx="52" cy="32.3" r="1.2" fill="${OUT}"/><circle cx="52" cy="35.8" r="1.2" fill="${OUT}"/>` +
      `<circle cx="45" cy="26" r="2.2" fill="${OUT}"/><circle cx="45.7" cy="25.3" r=".7" fill="#fff"/></svg>`;
  },
  coins: n => {
    const piles = [[[32, 40]], [[26, 42], [38, 40]], [[22, 44], [42, 44], [32, 36]], [[18, 46], [46, 46], [26, 36], [38, 34]]][n - 1];
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${piles.map(([x, y]) => [0, 1, 2, 3].map(k => `<ellipse cx="${x}" cy="${y + 8 - k * 4}" rx="10" ry="4.5" fill="${k === 3 ? '#ffd166' : '#f0a93a'}" stroke="${OUT}" stroke-width="2"/>`).join('')).join('')}${n === 4 ? SPARK(52, 18) + SPARK(12, 22, 0.7) : ''}</svg>`;
  },
  adcoins: () => `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="12" width="48" height="34" rx="8" fill="#2c3160" stroke="${OUT}" stroke-width="2.5"/><path d="M28 21v16l12-8z" fill="#f3f1ea" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>${coinSvg(46, 46, 10)}</svg>`,
  noads: () => `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="16" width="48" height="32" rx="8" fill="#f3f1ea" stroke="${OUT}" stroke-width="2.5"/><text x="32" y="39" text-anchor="middle" font-size="17" font-weight="900" font-family="Arial, sans-serif" fill="${OUT}">AD</text><circle cx="32" cy="32" r="24" fill="none" stroke="#ff4052" stroke-width="5"/><path d="M15 15l34 34" stroke="#ff4052" stroke-width="5" stroke-linecap="round"/></svg>`
};
const artHtml = (id, ...a) => SHOP_ART[id] ? `<img alt="" src="${SHOP_ART[id]}">` : ART[id](...a);
const MINI = {
  tube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8M10 3v14a2 2 0 0 0 4 0V3"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>'
};
const packItems = pk => `<span class="pk coins"><span class="coin"></span>${fmtN(pk.coins)}</span>` +
  ['tube', 'undo', 'time'].filter(k => pk[k]).map(k => `<span class="pk">${MINI[k]}${k === 'time' ? '<i>+30</i>' : ''}×${pk[k]}</span>`).join('');

/* ----- tab bar icons ----- */
const TAB_ICONS = {
  shop: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 12h20l-2 14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="var(--amber)" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><path d="M11 12V9a5 5 0 0 1 10 0v3" fill="none" stroke="#1d2230" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="20" r="3.4" fill="#fff3c8" stroke="#c98316" stroke-width="1.6"/></svg>',
  collection: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="6" width="22" height="20" rx="4" fill="#9a68e3" stroke="#1d2230" stroke-width="2"/><rect x="10" y="10" width="4.5" height="12" rx="2.2" fill="var(--c2)" stroke="#1d2230" stroke-width="1.6"/><rect x="17.5" y="10" width="4.5" height="12" rx="2.2" fill="var(--c4)" stroke="#1d2230" stroke-width="1.6"/></svg>',
  home: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 15 16 6l11 9v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#4c94ee" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><path d="M3 16 16 5l13 11" fill="none" stroke="#1d2230" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="19" width="6" height="9" rx="1.5" fill="var(--amber)" stroke="#1d2230" stroke-width="1.8"/></svg>',
  rank: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 6h12v7a6 6 0 0 1-12 0z" fill="var(--amber)" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><path d="M10 9H6a4 4 0 0 0 4 5M22 9h4a4 4 0 0 1-4 5" fill="none" stroke="#1d2230" stroke-width="2"/><path d="M13 25h6l-1-6h-4z" fill="#c98316" stroke="#1d2230" stroke-width="1.8" stroke-linejoin="round"/><rect x="10" y="25" width="12" height="3.5" rx="1.5" fill="#c98316" stroke="#1d2230" stroke-width="1.8"/></svg>',
  bonus: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="13" width="22" height="14" rx="2.5" fill="#ef5a5f" stroke="#1d2230" stroke-width="2"/><rect x="3.5" y="9" width="25" height="6" rx="2" fill="#ff7b7f" stroke="#1d2230" stroke-width="2"/><path d="M16 9v18" stroke="var(--amber)" stroke-width="3.5"/><path d="M16 9c-4-6-9-2-5 0zM16 9c4-6 9-2 5 0z" fill="var(--amber)" stroke="#1d2230" stroke-width="1.8"/></svg>'
};
const LOCK_MINI = '<svg class="tab-lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V7a3 3 0 0 0-6 0v3z"/></svg>';
// tabs that are built: later stages flip these to true
const TAB_READY = { shop: true, collection: false, home: true, rank: false, bonus: false };
const TAB_ORDER = ['shop', 'collection', 'home', 'rank', 'bonus'];
const TAB_LABEL = { shop: 'shop', collection: 'tabCollection', home: 'tabHome', rank: 'tabRank', bonus: 'tabBonus' };

/* ----- markup & styles ----- */
document.head.insertAdjacentHTML('beforeend', `<style>
:root { --tab-h: 62px; }
.tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 8; max-width: 640px; margin-inline: auto; display: grid; grid-template-columns: var(--cols, 1fr 1.5fr); align-items: end; padding: 0 6px env(safe-area-inset-bottom, 0px); background: linear-gradient(rgba(30, 33, 64, 0.92), rgba(14, 15, 34, 0.97)); border-top: 1px solid var(--panel-edge); border-radius: 22px 22px 0 0; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: grid-template-columns 260ms cubic-bezier(.3,1.3,.5,1); }
.tab { position: relative; height: var(--tab-h); min-width: 0; display: grid; justify-items: center; align-content: center; gap: 2px; padding: 0; color: var(--ink-2); transition: height 180ms ease; }
.tab > svg:first-child { width: 34px; height: 34px; transition: transform 260ms cubic-bezier(.3,1.6,.5,1); filter: drop-shadow(0 2px 0 rgba(0,0,0,0.35)); }
.tab span { display: none; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.02em; color: var(--ink); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.tab.on { height: calc(var(--tab-h) + 16px); margin-top: -16px; border-radius: 20px 20px 0 0; background: linear-gradient(#383d78, #262a52); border: 1px solid rgba(255, 190, 85, 0.55); border-bottom: 0; box-shadow: inset 0 2px 0 rgba(255,255,255,0.12); animation: tabUp 300ms cubic-bezier(.3,1.6,.5,1); }
.tab.on > svg:first-child { transform: translateY(-6px) scale(1.25); }
.tab.on span { display: block; margin-top: -4px; }
@keyframes tabUp { from { transform: translateY(10px); } }
.tab.soon > svg:first-child { opacity: 0.38; filter: grayscale(0.7); }
.tab .tab-lock { position: absolute; top: 12px; left: 50%; margin-left: 6px; width: 15px; height: 15px; fill: var(--ink-2); }
.tab .dot { position: absolute; top: 8px; left: 50%; margin-left: 10px; width: 12px; height: 12px; border-radius: 50%; background: var(--danger); border: 2px solid var(--night); }
.tab:active > svg:first-child { transform: scale(0.9); }
.tab.on:active > svg:first-child { transform: translateY(-6px) scale(1.15); }
#map .map-top { position: relative; z-index: 3; }
.map-dock { position: absolute; left: 0; right: 0; bottom: max(14px, env(safe-area-inset-bottom, 0px)); z-index: 3; display: grid; gap: 10px; padding: 0 16px 6px; width: min(100%, 420px); margin-inline: auto; pointer-events: none; }
.map-dock > * { pointer-events: auto; }
.map-dock .world-card { width: 100%; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 6px 10px; padding: 10px 14px; background: rgba(10, 12, 28, 0.72); }
.map-dock .world-card .wname { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-dock .world-card small { font-variant-numeric: tabular-nums; white-space: nowrap; }
.map-dock .world-card .bar { grid-column: 1 / -1; grid-row: 2; }
.map-dock .btn.big { min-height: 58px; }
body.tabs .map-dock { bottom: calc(var(--tab-h) + 12px + env(safe-area-inset-bottom, 0px)); }
#map .map-scroll { padding-bottom: 170px; }
body.tabs #map .map-scroll { padding-bottom: calc(var(--tab-h) + 170px + env(safe-area-inset-bottom, 0px)); }
.coins.buyable { cursor: pointer; padding-right: 4px; }
.coins .plus { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--good); color: #0b2a1a; font-weight: 900; font-size: 1rem; line-height: 1; font-style: normal; }
.coins.buyable:active { transform: scale(0.96); }

#shop { z-index: 6; padding-bottom: 0; background: radial-gradient(120% 70% at 50% 0%, var(--night-2), var(--night) 65%) var(--night); }
body.tabs #shop .shop-scroll { padding-bottom: calc(var(--tab-h) + 24px + env(safe-area-inset-bottom, 0px)); }
#shop.modal { z-index: 15; }
#shop .topbar { min-height: 44px; }
#shop .shop-title { flex: 1; margin: 0; text-align: center; font-family: var(--font-display); font-weight: 700; font-size: 1.35rem; }
#shopClose { font-size: 1.1rem; }
#shop:not(.modal) #shopClose { visibility: hidden; }
.shop-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; margin: 10px -16px 0; padding: 12px 16px max(24px, env(safe-area-inset-bottom, 0px)); display: grid; align-content: start; gap: 12px; }
.shop-scroll::-webkit-scrollbar { display: none; }
.shop-scroll > * { min-width: 0; }
.offer { position: relative; display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px 12px; align-items: center; padding: 14px; border-radius: 20px; background: var(--panel); border: 1px solid var(--panel-edge); }
.offer .art { width: 72px; height: 72px; display: grid; place-items: center; }
.offer .art svg, .offer .art img, .coin-tile .art svg, .coin-tile .art img, .sh-pop .art svg, .sh-pop .art img { width: 100%; height: 100%; object-fit: contain; display: block; }
.offer h3 { margin: 0; font-family: var(--font-display); font-weight: 700; font-size: 1.02rem; line-height: 1.2; }
.offer p { margin: 2px 0 0; color: var(--ink-2); font-size: 0.8rem; line-height: 1.35; }
.offer .buy { grid-column: 1 / -1; }
.offer.starter { background: linear-gradient(160deg, #3b3570, #262a52 60%); border-color: rgba(255, 190, 85, 0.6); padding-top: 20px; }
.offer.piggy { background: linear-gradient(160deg, #4a2a55, #262a52 65%); border-color: rgba(239, 119, 182, 0.55); }
.offer.best { border-color: rgba(255, 190, 85, 0.6); }
.ribbon { position: absolute; top: -10px; left: 14px; padding: 3px 10px; border-radius: 9px; background: var(--danger); color: #fff; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.03em; transform: rotate(-3deg); box-shadow: 0 2px 0 rgba(0,0,0,0.3); white-space: nowrap; }
.ribbon.gold { background: var(--amber); color: var(--amber-ink); }
.pack-items { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.pk { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px 3px 5px; border-radius: 999px; background: rgba(10, 12, 28, 0.45); border: 1px solid var(--panel-edge); font-size: 0.78rem; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pk svg { width: 15px; height: 15px; flex: none; }
.pk i { font-style: normal; font-size: 0.68rem; }
.pk .coin { width: 15px; height: 15px; }
.pk.coins { color: var(--amber); }
.btn.buy { min-height: 46px; font-size: 1rem; font-variant-numeric: tabular-nums; }
.piggy-bar { grid-column: 1 / -1; position: relative; height: 14px; border-radius: 999px; background: rgba(10, 12, 28, 0.55); border: 1px solid var(--panel-edge); }
.piggy-bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: inherit; background: linear-gradient(90deg, #f5953e, var(--amber)); transition: width 500ms ease; }
.piggy-bar b { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--ink); }
.piggy-nums { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 8px; font-size: 0.78rem; color: var(--ink-2); font-weight: 700; font-variant-numeric: tabular-nums; margin-top: -4px; }
.piggy-nums b { color: var(--ink); }
.piggy-note { grid-column: 1 / -1; margin: 0; font-size: 0.82rem; font-weight: 700; text-align: center; color: var(--ink-2); }
.piggy-note.ok { color: var(--good); }
.coin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.coin-tile { position: relative; display: grid; justify-items: center; gap: 4px; padding: 14px 10px 10px; border-radius: 20px; background: var(--panel); border: 1px solid var(--panel-edge); text-align: center; }
.coin-tile .art { width: 56px; height: 56px; }
.coin-tile b { font-family: var(--font-display); font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.coin-tile small { font-size: 0.72rem; color: var(--ink-2); font-weight: 700; min-height: 1em; }
.coin-tile .btn { width: 100%; min-height: 42px; padding: 8px 6px; font-size: 0.92rem; margin-top: 2px; }
.coin-tile.best { border-color: rgba(255, 190, 85, 0.6); }
.coin-tile .ribbon { left: 50%; transform: translateX(-50%) rotate(-3deg); }
.link-btn { justify-self: center; padding: 10px 14px; color: var(--ink-2); font-weight: 700; font-size: 0.85rem; text-decoration: underline; text-underline-offset: 3px; }
.shop-scroll .section-label { margin-top: 6px; }
.win-piggy { justify-self: center; display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 4px; border-radius: 999px; background: rgba(239, 119, 182, 0.14); border: 1px solid rgba(239, 119, 182, 0.45); font-size: 0.82rem; font-weight: 700; max-width: 100%; }
.win-piggy .art { width: 26px; height: 26px; flex: none; }
.win-piggy .art svg { width: 100%; height: 100%; display: block; }
.win-piggy span { min-width: 0; overflow-wrap: anywhere; text-align: left; }
.sh-pop { position: relative; }
.sh-pop .ribbon { position: static; justify-self: center; transform: rotate(-3deg); margin-bottom: -6px; }
.sh-pop .ribbon[hidden] { display: none; }
.sh-pop .art { justify-self: center; width: 96px; height: 96px; }
.sh-pop .pack-items { justify-content: center; }
#stShop.st-starter { flex-direction: column; align-items: stretch; gap: 4px; text-align: center; }
#stShop .st-starter-name { font-family: var(--font-display); }
#stShop .st-starter-sub { font-size: 0.74rem; font-weight: 700; opacity: 0.85; white-space: normal; }
@media (max-height: 700px) { .map-dock .world-card { padding: 8px 12px; gap: 4px; } .map-dock .btn.big { min-height: 52px; } }
.coin-tile .btn svg { width: 18px; height: 18px; }
@media (max-width: 340px) { .offer { grid-template-columns: 56px minmax(0, 1fr); padding: 12px; } .offer .art { width: 56px; height: 56px; } .coin-grid { gap: 8px; } .coin-tile .btn { font-size: 0.85rem; } .tab > svg:first-child { width: 30px; height: 30px; } }
</style>`);

document.body.insertAdjacentHTML('beforeend', `
<section class="screen" id="shop" hidden>
  <div class="topbar"><button class="icon-btn" id="shopClose" aria-label="Close">✕</button><h2 class="shop-title" data-t="shop">Shop</h2><div class="coins"><span class="coin" aria-hidden="true"></span><span data-coins>0</span></div></div>
  <div class="shop-scroll" id="shopScroll">
    <article class="offer starter" id="offStarter" hidden>
      <span class="ribbon" data-t="onceOnly">One time only</span>
      <div class="art" data-art="starter_pack"></div>
      <div><h3 id="starterName"></h3><p data-t="starterSub"></p><div class="pack-items" id="starterItems"></div></div>
      <button class="btn primary buy" data-buy="starter_pack"></button>
    </article>
    <article class="offer piggy" id="offPiggy">
      <div class="art" id="piggyArt"></div>
      <div><h3 data-t="piggyName">Piggy Bank</h3><p id="piggyHow"></p></div>
      <div class="piggy-bar" role="progressbar" aria-valuemin="0" id="piggyBar"><i id="piggyFill"></i><b id="piggyMark"></b></div>
      <div class="piggy-nums"><span><b id="piggyAmt">0</b> / <span id="piggyCap"></span></span></div>
      <p class="piggy-note" id="piggyNote"></p>
      <button class="btn primary buy" data-buy="piggy_bank"></button>
    </article>
    <p class="section-label" data-t="packsTitle">Packs</p>
    <div class="shop-packs" id="shopPacks" style="display:grid;gap:14px"></div>
    <p class="section-label" data-t="coinsTitle">Coins</p>
    <div class="coin-grid">
      <div class="coin-tile"><div class="art" data-art="adcoins"></div><b id="adCoinsAmt">+50</b><small id="adCoinsLeft"></small><button class="btn" id="adCoinsBtn"></button></div>
      <div class="coin-tile"><div class="art" data-art="coins" data-n="1"></div><b>500</b><small></small><button class="btn buy" data-buy="coins_500"></button></div>
      <div class="coin-tile"><div class="art" data-art="coins" data-n="2"></div><b>1500</b><small></small><button class="btn buy" data-buy="coins_1500"></button></div>
      <div class="coin-tile best"><span class="ribbon gold" data-t="bestValue">Best value</span><div class="art" data-art="coins" data-n="4"></div><b>5000</b><small></small><button class="btn buy" data-buy="coins_5000"></button></div>
    </div>
    <article class="offer" id="offNoAds">
      <div class="art" data-art="noads"></div>
      <div><h3 data-t="noAdsName">No ads</h3><p data-t="noAdsText"></p></div>
      <button class="btn buy" data-buy="noads" id="noAdsBtn"></button>
    </article>
    <button class="link-btn" id="restoreBtn" data-t="restore">Restore purchases</button>
  </div>
</section>
<nav class="tabbar" id="tabbar" hidden></nav>
<div class="overlay" id="shopPop" hidden>
  <div class="card sh-pop" role="dialog" aria-modal="true" aria-labelledby="shopPopTitle">
    <span class="ribbon" id="shopPopRibbon"></span>
    <div class="art" id="shopPopArt"></div>
    <h2 id="shopPopTitle"></h2>
    <p id="shopPopText"></p>
    <div class="pack-items" id="shopPopItems"></div>
    <div class="btns"><button class="btn primary buy" id="shopPopBuy"></button><button class="btn" id="shopPopLater"></button></div>
  </div>
</div>`);
$('#winOverlay .reward').insertAdjacentHTML('afterend', '<div class="win-piggy" id="winPiggy" hidden><span class="art" id="winPiggyArt"></span><span id="winPiggyText"></span></div>');
$('#testerTools .btns').insertAdjacentHTML('beforebegin', `<div class="btns">
  <button class="btn" id="tPiggy" data-t="tPiggy">Piggy +500</button>
  <button class="btn" id="tShopReset" data-t="tShopReset">Shop again</button></div>`);
document.querySelectorAll('.shop-scroll [data-art]').forEach(el => { el.innerHTML = artHtml(el.dataset.art, Number(el.dataset.n) || undefined); });

// coins at the top: "+" opens the shop (home, map and during a level)
document.querySelectorAll('#map .coins, .hud .coins').forEach(el => {
  el.classList.add('buyable');
  el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
  el.insertAdjacentHTML('beforeend', '<i class="plus" aria-hidden="true">+</i>');
  const go = () => { sfx.unlock(); openShop(el.closest('.hud') ? 'hud' : 'coins'); };
  el.addEventListener('click', go);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

/* ----- buying ----- */
function grantPack(pk) {
  save.coins += pk.coins;
  for (const k of ['tube', 'undo', 'time']) save.inv[k] = (save.inv[k] || 0) + (pk[k] || 0);
}
// the single entry for every purchase: pays (App Store or demo), grants, re-renders
async function shopBuy(id, place) {
  const item = SHOP_ITEMS[id];
  if (!item) return false;
  if (id === 'starter_pack' && save.starterBought) return false;
  if (id === 'piggy_bank' && !piggyReady()) return false;
  if (id === 'noads' && save.noAds) return false;
  if (!(await buy(id, place))) return false;
  const t = tr();
  if (item.pack) {
    grantPack(CFG[item.pack]);
    if (id === 'starter_pack') save.starterBought = 1;
    toast(t.packGot);
  } else if (item.coins) {
    save.coins += item.coins; toast(t.coinsAdded(item.coins));
  } else if (item.piggy) {
    const n = save.piggy;
    save.coins += n; save.piggy = 0; save.piggyTold = 0;
    track('piggy_break', { amount: n, level: save.level + 1 });
    toast(t.piggyBroken(n));
  } else if (item.noads) {
    grantNoAds(); toast(t.purchased);
  }
  persist(); refreshCoins();
  if (S) updateHud();
  if (!$('#shop').hidden) renderShop();
  return true;
}
$('#shop').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return;
  shopBuy(b.dataset.buy, 'shop');
});

async function onAdCoins() {
  sfx.unlock();
  if (adCoinsLeft() <= 0) return;
  const got = await playAd('reward');
  if (!got) return;
  adCoinsLeft();
  save.adCoins.n++; save.coins += CFG.adCoins; persist(); refreshCoins();
  if (S) updateHud();
  track('shop_ad_coins', { amount: CFG.adCoins, left: adCoinsLeft() });
  toast(tr().coinsAdded(CFG.adCoins));
  renderShop();
}
$('#adCoinsBtn').addEventListener('click', onAdCoins);

/* ----- shop screen ----- */
function renderShop() {
  const t = tr(), buyLabel = id => NATIVE ? iapPrice(id) : `${iapPrice(id)} · ${t.demo}`;
  applyLangShop();
  // starter
  const st = starterOpen();
  $('#offStarter').hidden = !st;
  if (st) { $('#starterName').textContent = t.packNames.starter_pack; $('#starterItems').innerHTML = packItems(CFG.starterPack); }
  // piggy
  const fill = save.piggy / CFG.piggyCap;
  $('#piggyArt').innerHTML = artHtml('piggy_bank', fill);
  $('#piggyHow').textContent = t.piggyHow(CFG.piggyPerWin, CFG.piggyPerStar);
  $('#piggyFill').style.width = (fill * 100).toFixed(1) + '%';
  $('#piggyMark').style.left = (CFG.piggyBreakAt / CFG.piggyCap * 100).toFixed(1) + '%';
  $('#piggyBar').setAttribute('aria-valuemax', CFG.piggyCap); $('#piggyBar').setAttribute('aria-valuenow', save.piggy);
  $('#piggyAmt').textContent = fmtN(save.piggy);
  $('#piggyCap').textContent = fmtN(CFG.piggyCap);
  const pn = $('#piggyNote'), ready = piggyReady();
  pn.textContent = save.piggy >= CFG.piggyCap ? t.piggyFull : ready ? t.piggyCanBreak : t.piggyLocked(CFG.piggyBreakAt);
  pn.classList.toggle('ok', ready);
  // packs
  const packs = [['lab_pack', ''], ['scientist_pack', 'popular'], ['professor_pack', 'bestValue']];
  $('#shopPacks').innerHTML = packs.map(([id, rib]) => `<article class="offer${rib === 'bestValue' ? ' best' : ''}">` +
    (rib ? `<span class="ribbon${rib === 'bestValue' ? ' gold' : ''}">${t[rib]}</span>` : '') +
    `<div class="art">${artHtml(id)}</div><div><h3>${t.packNames[id]}</h3><div class="pack-items">${packItems(CFG[SHOP_ITEMS[id].pack])}</div></div>` +
    `<button class="btn primary buy" data-buy="${id}"></button></article>`).join('');
  // prices on every buy button
  $('#shop').querySelectorAll('[data-buy]').forEach(b => { b.textContent = buyLabel(b.dataset.buy); b.disabled = false; });
  const pb = $('#offPiggy [data-buy]'); pb.disabled = !ready;
  const nb = $('#noAdsBtn'); if (save.noAds) { nb.textContent = t.owned; nb.disabled = true; }
  // free coins
  const left = adCoinsLeft();
  $('#adCoinsAmt').textContent = '+' + CFG.adCoins;
  $('#adCoinsLeft').textContent = left > 0 ? t.freeLeft(left, CFG.adCoinsPerDay) : t.freeDone;
  const ab = $('#adCoinsBtn');
  ab.innerHTML = left > 0 ? `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg><span class="tag">${t.adTag}</span>` : t.freeDone;
  ab.setAttribute('aria-label', `${t.freeCoins} · ${t.adTag}`);
  ab.disabled = left <= 0;
  refreshCoins();
}
function applyLangShop() {
  const t = tr();
  $('#shop').querySelectorAll('[data-t]').forEach(el => { const v = t[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
}

/* ----- tabs ----- */
let tabNow = 'home', shopMode = null;   // shopMode: null | 'tab' | 'modal'
const tabsVisible = () => TAB_ORDER.filter(k => TAB_READY[k] || CFG.tabsSoon);
function renderTabs() {
  const t = tr(), bar = $('#tabbar'), list = tabsVisible();
  bar.innerHTML = list.map(k => `<button class="tab${k === tabNow ? ' on' : ''}${TAB_READY[k] ? '' : ' soon'}" data-tab="${k}" aria-label="${t[TAB_LABEL[k]]}"${k === tabNow ? ' aria-current="page"' : ''}>` +
    `${TAB_ICONS[k]}${TAB_READY[k] ? '' : LOCK_MINI}<span>${t[TAB_LABEL[k]]}</span>${k === 'shop' && shopDot() ? '<i class="dot"></i>' : ''}</button>`).join('');
  bar.style.setProperty('--cols', list.map(k => k === tabNow ? '1.5fr' : '1fr').join(' '));
}
// red dot on the Shop tab: something new to look at (the starter pack is open, or the piggy bank can be broken)
const shopDot = () => (starterOpen() && !save.starterShopSeen) || (piggyReady() && !save.piggySeen);
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const homeEl = () => $('#map');
function slide(inEl, outEl, dir, done) {
  if (reduceMotion() || !inEl.animate) { done && done(); return; }
  const opt = { duration: 300, easing: 'cubic-bezier(.22,.9,.3,1)' };
  inEl.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'translateX(0)' }], opt);
  const a = outEl.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-dir * 100}%)` }], opt);
  a.onfinish = () => done && done();
}
function setTab(name, how) {
  if (name === tabNow) return;
  if (!TAB_READY[name]) { toast(tr().soon(tr()[TAB_LABEL[name]])); sfx.nope(); return; }
  const from = tabNow, dir = TAB_ORDER.indexOf(name) > TAB_ORDER.indexOf(from) ? 1 : -1;
  tabNow = name;
  if (name === 'shop') {
    shopMode = 'tab';
    $('#shop').classList.remove('modal');
    $('#shop').hidden = false;
    $('#shopScroll').scrollTop = 0;
    renderShop();
    slide($('#shop'), homeEl(), dir);
    shopOpened(how);
  } else if (name === 'home') {
    const sh = $('#shop');
    slide(homeEl(), sh, dir, () => { if (tabNow !== 'shop') sh.hidden = true; });
    if (reduceMotion() || !sh.animate) sh.hidden = true;
    shopMode = null;
    if (screenNow === 'map') { renderMap(); renderDock(); }
  }
  renderTabs();
  track(how === 'swipe' ? 'tab_swipe' : 'tab_open', { tab: name });
}
function shopOpened(from) {
  if (starterOpen()) save.starterShopSeen = 1;
  if (piggyReady()) save.piggySeen = 1;
  persist();
  track('shop_open', { from: from || 'tab', level: (S ? S.li : save.level) + 1 });
  if (starterOpen()) track('iap_offer_shown', { product: 'starter_pack', place: 'shop' });
}
$('#tabbar').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  sfx.unlock(); sfx.pick(4); buzz(8);
  setTab(b.dataset.tab, 'tab');
});
// the shop from anywhere: a tab on home / map, a window over the board during a level
function openShop(from) {
  if (screenNow === 'game' && S) {
    if (shopMode === 'modal') return;
    shopMode = 'modal';
    pauseClock();
    const sh = $('#shop');
    sh.classList.add('modal'); sh.hidden = false;
    $('#shopScroll').scrollTop = 0;
    renderShop();
    if (sh.animate && !reduceMotion()) sh.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,.9,.3,1)' });
    shopOpened(from);
    return;
  }
  if (tabNow === 'shop') return;
  setTab('shop', from);
}
function closeShop() {
  if (shopMode === 'modal') { shopMode = null; $('#shop').hidden = true; $('#shop').classList.remove('modal'); resumeClock(); if (S) updateHud(); return; }
  setTab('home', 'tab');
}
$('#shopClose').addEventListener('click', () => { sfx.unlock(); closeShop(); });
// called by screen(): the tab bar lives on home and map; any screen change drops the shop tab
function tabsOnScreen(name) {
  if (shopMode === 'tab' || (shopMode === 'modal' && name !== 'game')) { if (shopMode === 'modal') resumeClock(); shopMode = null; $('#shop').hidden = true; $('#shop').classList.remove('modal'); }
  tabNow = 'home';
  if (name === 'game') hide('#shopPop');   // a one-time offer never stays on top of a level
  const on = name === 'home' || name === 'map';
  $('#tabbar').hidden = !on;
  document.body.classList.toggle('tabs', on);
  if (on) renderTabs();
}
// horizontal swipe between tabs; vertical scrolling stays with the page
(() => {
  let x0 = 0, y0 = 0, t0 = 0, on = false;
  const start = e => {
    if (e.touches.length !== 1 || shopMode === 'modal' || overlayOpen() || !(screenNow === 'home' || screenNow === 'map')) { on = false; return; }
    const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); on = true;
  };
  const end = e => {
    if (!on) return; on = false;
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - t0 > 700) return;
    const list = tabsVisible().filter(k => TAB_READY[k]);
    const i = list.indexOf(tabNow) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < list.length) { sfx.pick(4); setTab(list[i], 'swipe'); }
  };
  for (const id of ['#map', '#shop']) { $(id).addEventListener('touchstart', start, { passive: true }); $(id).addEventListener('touchend', end, { passive: true }); }
})();

/* ----- piggy bank on the win screen ----- */
function piggyOnWin(stars) {
  const before = save.piggy, add = CFG.piggyPerWin + CFG.piggyPerStar * stars;
  save.piggy = Math.min(CFG.piggyCap, before + add);
  const got = save.piggy - before, t = tr();
  if (before < CFG.piggyBreakAt && save.piggy >= CFG.piggyBreakAt) { save.piggySeen = 0; save.piggyTold = 0; track('piggy_fill', { stage: 'ready', amount: save.piggy, level: S ? S.li + 1 : 0 }); }
  if (before < CFG.piggyCap && save.piggy >= CFG.piggyCap) track('piggy_fill', { stage: 'full', amount: save.piggy, level: S ? S.li + 1 : 0 });
  $('#winPiggyArt').innerHTML = artHtml('piggy_bank', save.piggy / CFG.piggyCap);
  $('#winPiggyText').textContent = got > 0 ? t.piggyWin(got) + (piggyReady() ? ' · ' + t.piggyWinReady : '') : t.piggyWinFull;
  $('#winPiggy').hidden = false;
}

/* ----- one-time offers on the home screen / map: starter pack, then "the piggy bank is ready" ----- */
function popOffer(kind, then) {
  const t = tr(), id = kind === 'starter' ? 'starter_pack' : 'piggy_bank';
  if (kind === 'starter') {
    save.starterShown = 1;
    $('#shopPopRibbon').textContent = t.onceOnly; $('#shopPopRibbon').hidden = false;
    $('#shopPopArt').innerHTML = artHtml('starter_pack');
    $('#shopPopTitle').textContent = t.starterTitle;
    $('#shopPopText').textContent = t.starterText;
    $('#shopPopItems').innerHTML = packItems(CFG.starterPack); $('#shopPopItems').hidden = false;
  } else {
    save.piggyTold = 1;
    $('#shopPopRibbon').hidden = true;
    $('#shopPopArt').innerHTML = artHtml('piggy_bank', save.piggy / CFG.piggyCap);
    $('#shopPopTitle').textContent = t.piggyReadyTitle;
    $('#shopPopText').textContent = t.piggyReadyText(save.piggy);
    $('#shopPopItems').hidden = true;
  }
  persist();
  track('iap_offer_shown', { product: id, place: 'popup' });
  $('#shopPopBuy').textContent = NATIVE ? iapPrice(id) : t.buyDemo(iapPrice(id));
  $('#shopPopLater').textContent = t.later;
  const done = () => { hide('#shopPop'); renderTabs(); then && then(); };
  $('#shopPopBuy').onclick = async () => { sfx.unlock(); if (await shopBuy(id, 'popup')) done(); };
  $('#shopPopLater').onclick = () => { sfx.unlock(); done(); };
  show('#shopPop');
}
// returns true when an offer was shown (then() runs after it is closed)
function shopOffers(then) {
  if (screenNow !== 'home' && screenNow !== 'map') return false;
  if (overlayOpen() || shopMode) return false;
  if (starterOpen() && !save.starterShown) { popOffer('starter', then); return true; }
  if (piggyReady() && !save.piggyTold) { popOffer('piggy', then); return true; }
  return false;
}

/* ----- the dead-end window's coin pack: the starter pack until it is bought, then 500 coins ----- */
function stuckPack() {
  const t = tr();
  if (!save.starterBought) {
    const pk = CFG.starterPack;
    return { id: 'starter_pack', cls: 'st-starter', html: `<span class="st-starter-name">${t.stuckStarter} · ${iapPrice('starter_pack')}</span><span class="st-starter-sub">${t.stuckStarterSub(pk.coins, pk.tube, pk.undo, pk.time)}</span>` };
  }
  return { id: 'coins_500', cls: '', html: `<span class="st-sub"><span class="coin"></span>${t.packOffer(500, iapPrice('coins_500'))}</span>` };
}
function shopOnStuck() { if (!save.starterBought && !save.starterOpen) { save.starterOpen = 1; persist(); } }

/* ----- tester tools ----- */
$('#tPiggy').addEventListener('click', () => { save.piggy = Math.min(CFG.piggyCap, save.piggy + 500); persist(); toast(tr().tPiggyDone); });
$('#tShopReset').addEventListener('click', () => {
  for (const k of ['starterBought', 'starterOpen', 'starterShown', 'starterShopSeen', 'piggyTold', 'piggySeen', 'adCoins']) delete save[k];
  persist(); toast(tr().tShopResetDone);
});
