/* ---------- Boosters in stock, gifts and the dead-end offer (stage 1, 20 Oct 2026) ----------
   Three boosters: undo, extra tube, +30 s (the last one only on timed levels).
   - Stock (save.inv) shows as "×N" on the button and is spent for free. Buying (coins or a rewarded ad)
     puts the booster into stock and uses it at once; an undo is bought as a pack of CFG.undoPack.
   - Free per-level undos (CFG.freeUndos) are spent first; stock only after them.
   - Each type is gifted once: undo on level CFG.giftUndoFrom, +30 s on the first timed level,
     the tube at the player's first dead end (with the explanation in the dead-end window).
   - Dead end (Magic Sort pattern): no useful move left → after CFG.stuckDelay ms a window
     "+1 tube" for coins / ad / stock, "Undo", "Restart". The clock stands while it is open.
     Not enough coins → the smallest coin pack right in the window.
   - Early dead end [proposal]: a bounded solver in a Web Worker proves that the level can no longer
     be won (exhaustive search within CFG.stuckSolverMax states / CFG.stuckSolverMs ms, only on boards
     up to CFG.stuckSolverTubes tubes). Over the limit → nothing is shown (exact signal only).
   Events: stuck_offer, booster_use, booster_gift. */

const BOOST_KINDS = ['undo', 'tube', 'time'];
function ensureInv() {
  save.inv = Object.assign({ undo: 0, tube: 0, time: 0 }, save.inv || {});
  save.granted = Object.assign({}, save.granted || {});
}
ensureInv();

Object.assign(T.uk, {
  stuckTitle: 'Ходів більше немає', stuckText: 'Додайте пробірку — і знову буде куди переливати. Або скасуйте хід.',
  earlyTitle: 'Цей рівень уже не розв\'язати', earlyText: 'Ходи ще є, але жоден не веде до перемоги. Додайте пробірку або скасуйте кілька ходів.',
  plusTube: '+1 пробірка', fromStock: n => `з запасу · ×${n}`, undoMove: 'Скасувати хід', restartLevel: 'Почати заново',
  packOffer: (n, p) => `${n} монет · ${p}`, packNote: 'Не вистачає монет на пробірку',
  giftKicker: 'Новий інструмент', giftTake: 'Забрати', giftAddTube: 'Додати пробірку',
  giftTubeTitle: 'Пробірка в подарунок', giftTubeText: 'Коли ходів не лишилось, додаткова порожня пробірка дає місце для маневру. Ця — безкоштовна.',
  giftUndoTitle: 'Скасування в запас', giftUndoText: n => `Коли безкоштовні скасування на рівні закінчаться, спрацюють ці ${n}. Кнопка покаже «×${n}».`,
  giftTimeTitle: '+30 секунд', giftTimeText: 'На рівнях з таймером кнопка «+30 с» додає час будь-коли. Перший — у подарунок.',
  inStock: n => `У запасі: ×${n}`, timeBtn: '+30 с', timeAdded: s => `+${s} секунд`, timeOnlyTimed: 'Час додається лише на рівнях з таймером',
  undoEmptyText: n => `Купіть ${n} скасування — вони підуть у запас, одне спрацює одразу.`,
  undoTitle2: 'Ще скасування?', timeTitle: 'Додати 30 секунд?', timeText: 'Таймер отримає ще 30 секунд.',
  tubeText: 'Порожня пробірка з\'явиться на полі.', tubeMax: 'На цьому рівні більше пробірок не додати',
  stockUsed: 'З запасу', reviveStock: (s, n) => `+${s} с · з запасу ×${n}`,
  tBoost3: '+3 кожного бустера', tGifts: 'Подарунки знову', tStuck: 'Перейти до глухого кута',
  tBoostDone: 'Додано по 3', tGiftsDone: 'Подарунки скинуто', tNoStuck: 'Глухий кут не знайдено', tNeedLevel: 'Спершу відкрийте рівень'
});
Object.assign(T.en, {
  stuckTitle: 'No moves left', stuckText: 'Add a tube and there is room to pour again. Or undo a move.',
  earlyTitle: 'This level can no longer be solved', earlyText: 'There are moves left, but none of them leads to a win. Add a tube or undo a few moves.',
  plusTube: '+1 tube', fromStock: n => `from stock · ×${n}`, undoMove: 'Undo a move', restartLevel: 'Restart',
  packOffer: (n, p) => `${n} coins · ${p}`, packNote: 'Not enough coins for a tube',
  giftKicker: 'New tool', giftTake: 'Take it', giftAddTube: 'Add the tube',
  giftTubeTitle: 'A free tube', giftTubeText: 'When no moves are left, an extra empty tube gives you room to manoeuvre. This one is on us.',
  giftUndoTitle: 'Undos in stock', giftUndoText: n => `When the free undos on a level run out, these ${n} kick in. The button shows "×${n}".`,
  giftTimeTitle: '+30 seconds', giftTimeText: 'On timed levels the "+30 s" button adds time whenever you like. The first one is free.',
  inStock: n => `In stock: ×${n}`, timeBtn: '+30 s', timeAdded: s => `+${s} seconds`, timeOnlyTimed: 'Time can only be added on timed levels',
  undoEmptyText: n => `Get ${n} undos — they go to your stock and one is used right away.`,
  undoTitle2: 'More undos?', timeTitle: 'Add 30 seconds?', timeText: 'The clock gets 30 more seconds.',
  tubeText: 'An empty tube appears on the board.', tubeMax: 'No more tubes on this level',
  stockUsed: 'From stock', reviveStock: (s, n) => `+${s}s · from stock ×${n}`,
  tBoost3: '+3 of each booster', tGifts: 'Gifts again', tStuck: 'Go to a dead end',
  tBoostDone: '+3 each', tGiftsDone: 'Gifts reset', tNoStuck: 'No dead end found', tNeedLevel: 'Open a level first'
});

/* ----- markup & styles (kept here so game.html does not grow) ----- */
document.head.insertAdjacentHTML('beforeend', `<style>
.tools.has-time { grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tools.has-time .tool { font-size: 0.74rem; padding-inline: 2px; }
#timeBtn[hidden] { display: none; }
.badge.free { background: var(--good); color: #0b2a1a; }
.st-card { position: relative; gap: 12px; }
.st-card h2 { padding-inline: 36px; }
.st-kicker { justify-self: center; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber); }
.st-kicker[hidden], .tool-anim[hidden], .st-pack[hidden] { display: none; }
.tool-anim { justify-self: center; width: 100%; max-width: 260px; aspect-ratio: 240 / 140; border-radius: 18px; background: var(--night); border: 1px solid var(--panel-edge); overflow: hidden; }
.tool-anim svg { display: block; width: 100%; height: 100%; }
.ta-b, .ta-t { transition: transform 450ms cubic-bezier(.3,.8,.3,1), opacity 300ms; }
.ta-t.hand rect { stroke: var(--amber); }
.ta-t.nope { animation: tashake 0.4s; }
@keyframes tashake { 25% { transform: var(--tt) translateX(-5px); } 75% { transform: var(--tt) translateX(5px); } }
.ta-mark { transition: opacity 200ms; }
.st-card, .st-card > *, .st-card .btns > * { min-width: 0; }
.st-btn { justify-content: space-between; text-align: left; }
.st-row .st-btn { flex-direction: column; justify-content: center; gap: 4px; text-align: center; padding: 10px 8px; line-height: 1.15; }
.st-row .st-btn .tag { font-size: 0.66rem; }
#stShop { justify-content: center; }
.st-btn .st-sub { font-family: var(--font-body, inherit); font-size: 0.8rem; font-weight: 700; opacity: 0.85; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.st-btn .coin { width: 18px; height: 18px; }
.st-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
.st-pack { display: grid; gap: 6px; padding: 10px; border-radius: 16px; border: 1px dashed var(--amber); }
.st-pack small { color: var(--ink-2); font-size: 0.8rem; }
.st-wallet { justify-self: center; display: inline-flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 0.85rem; font-weight: 600; }
.st-wallet b { color: var(--ink); }
.gift-chip { justify-self: center; }
</style>`);
document.body.insertAdjacentHTML('beforeend', `
<div class="overlay" id="stuckOverlay" hidden>
  <div class="card st-card" role="dialog" aria-modal="true" aria-labelledby="stuckTitle">
    <button class="pre-close" id="stuckClose" aria-label="Close">✕</button>
    <span class="st-kicker" id="stuckKicker" hidden></span>
    <div class="tool-anim" id="stuckAnim" hidden></div>
    <h2 id="stuckTitle"></h2>
    <p id="stuckText"></p>
    <div class="btns" id="stuckBtns"></div>
    <span class="st-wallet"><span id="stuckHave"></span><span class="coin" aria-hidden="true"></span><b id="stuckCoins">0</b></span>
  </div>
</div>
<div class="overlay" id="giftOverlay" hidden>
  <div class="card st-card" role="dialog" aria-modal="true" aria-labelledby="giftTitle">
    <span class="st-kicker" id="giftKicker"></span>
    <div class="tool-anim" id="giftAnim"></div>
    <h2 id="giftTitle"></h2>
    <p id="giftText"></p>
    <span class="chip gift-chip" id="giftChip"></span>
    <div class="btns"><button class="btn primary" id="giftTake"></button></div>
  </div>
</div>`);
$('#restartBtn').insertAdjacentHTML('beforebegin', `<button class="tool" id="timeBtn" hidden>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>
  <span data-t="timeBtn">+30 s</span><span class="badge" id="timeBadge"></span></button>`);
$('#failOverlay .btns').insertAdjacentHTML('afterbegin', '<button class="btn primary" id="reviveStockBtn" hidden></button>');
$('#testerTools .btns').insertAdjacentHTML('beforebegin', `<div class="btns">
  <button class="btn" id="tBoost3" data-t="tBoost3">+3</button>
  <button class="btn" id="tGifts" data-t="tGifts">Gifts</button>
  <button class="btn" id="tStuck" data-t="tStuck">Dead end</button></div>`);

/* ----- stock & paying ----- */
const lvlNo = () => (S ? S.li + 1 : 0);
const canAddTube = () => !!S && (S.extra || 0) < CFG.maxExtra;
const boosterCost = kind => kind === 'undo' ? CFG.undoCost : kind === 'time' ? CFG.timeCost : CFG.addTubeCost;
// Returns 'stock' | 'coins' | 'ad' | null. Coins are taken here; the stock is settled by takeBooster().
async function payBooster(kind, title, text) {
  if (save.inv[kind] > 0) return 'stock';
  const cost = boosterCost(kind);
  const choice = await offer(title, text, cost);
  if (choice === 'coins') {
    if (save.coins < cost) return null;
    save.coins -= cost; persist(); sfx.coin(); refreshCoins();
    track('coins_spent', { on: kind, amount: cost, level: lvlNo() });
  }
  return choice;
}
// A bought booster goes to stock and one is used at once; a stock one is just taken from stock.
function takeBooster(kind, method) {
  if (method !== 'stock' && method !== 'gift') save.inv[kind] += (kind === 'undo' ? CFG.undoPack : 1);
  save.inv[kind] = Math.max(0, save.inv[kind] - 1);
  persist();
  track('booster_use', { type: kind, method, level: lvlNo() });
}

/* ----- HUD ----- */
function boosterHud() {
  if (!S) return;
  const t = tr(), coinBadge = (el, kind) => { el.className = 'badge'; el.innerHTML = `<span class="coin"></span>${boosterCost(kind)}`; };
  const stockBadge = (el, kind) => { el.className = 'badge free'; el.textContent = '×' + save.inv[kind]; };
  const ub = $('#undoBadge');
  if (S.undos > 0) { ub.className = 'badge'; ub.textContent = S.undos; }
  else if (save.inv.undo > 0) stockBadge(ub, 'undo');
  else coinBadge(ub, 'undo');
  const tb = $('#tubeBadge');
  if (!canAddTube()) { tb.className = 'badge ad'; tb.textContent = '✓'; }
  else if (save.inv.tube > 0) stockBadge(tb, 'tube');
  else coinBadge(tb, 'tube');
  const timed = !!limitOf(S.li);
  $('#timeBtn').hidden = !timed;
  document.querySelector('.tools').classList.toggle('has-time', timed);
  if (timed) { if (save.inv.time > 0) stockBadge($('#timeBadge'), 'time'); else coinBadge($('#timeBadge'), 'time'); }
  $('#timeBtn').querySelector('[data-t]').textContent = t.timeBtn;
}

/* ----- the three buttons ----- */
async function onUndo() {
  sfx.unlock();
  if (!S || S.busy || S.won || S.failed) return;
  if (!S.history.length) { toast(tr().nothingToUndo); return; }
  let method = null;
  if (S.undos <= 0) {
    const s0 = S;
    method = await payBooster('undo', save.inv.undo > 0 ? '' : tr().undoEmptyTitle, tr().undoEmptyText(CFG.undoPack));
    if (!method || S !== s0 || S.won) return;
    takeBooster('undo', method);
    if (method !== 'stock') toast(tr().undosAdded(CFG.undoPack));
  }
  if (S.pending && S.pending.size) { const s0 = S; await animIdle(); if (S !== s0 || S.won) return; }
  const snap = S.history.pop();
  S.hidden = snap.h.map((col, ti) => col.map((v, p) => (v && S.hidden[ti] && S.hidden[ti][p] === 1) ? 1 : 0));
  S.tubes = snap.t;
  if (!method) S.undos--;
  S.undosUsed++;
  render(); updateHud(); lockWasOpen = lockOpen();
  afterBoardChange();
}

function addTubeNow() {
  S.extra = (S.extra || 0) + 1;
  S.tubes.push([]);
  S.history.forEach(h => { h.t.push([]); h.h.push([]); });
  S.hidden.push([]);
  setSelected(null);
  render(); updateHud(); hint('');
  toast(tr().tubeAdded);
  afterBoardChange();
}
async function onAddTube() {
  sfx.unlock();
  if (!S || S.busy || S.won || S.failed) return;
  if (!canAddTube()) { toast(CFG.maxExtra > 1 ? tr().tubeMax : tr().tubeUsed); return; }
  const s0 = S;
  const method = await payBooster('tube', tr().tubeTitle, tr().tubeText);
  if (!method || S !== s0 || S.won) return;
  if (S.pending && S.pending.size) await animIdle();
  if (S !== s0) return;
  takeBooster('tube', method);
  track('revive', { level: lvlNo(), how: method, kind: 'tube' });
  addTubeNow();
}

async function onAddTime() {
  sfx.unlock();
  if (!S || S.busy || S.won || S.failed) return;
  if (!limitOf(S.li)) { toast(tr().timeOnlyTimed); return; }
  const s0 = S;
  const method = await payBooster('time', tr().timeTitle, tr().timeText);
  if (!method || S !== s0 || S.won || S.failed) return;
  takeBooster('time', method);
  S.bonus = (S.bonus || 0) + CFG.reviveSecs;
  updateHud(); toast(tr().timeAdded(CFG.reviveSecs));
}
// time-up window: a +30 s in stock is offered first
function boosterFail() {
  const b = $('#reviveStockBtn'), n = save.inv.time;
  b.hidden = !(n > 0);
  if (n > 0) b.textContent = tr().reviveStock(CFG.reviveSecs, n);
}
function onReviveStock() {
  if (!S || !(save.inv.time > 0)) return;
  takeBooster('time', 'stock');
  revive('stock');
}

/* ----- "new tool" animation: the wrong move (✕), then the tool, then the right move (✓) ----- */
const TA_SCENES = {
  tube: {
    tubes: [55, 120, 185], colors: { a: 0, b: 5, c: 0, d: 5, e: 5, f: 0, g: 5, h: 0 },
    start: { a: [0, 0], b: [0, 1], c: [0, 2], d: [0, 3], e: [1, 0], f: [1, 1], g: [1, 2], h: [1, 3] },
    frames: [
      { show: 2, hand: 0 },
      { show: 2, hand: 1, nope: 1, mark: 'x' },
      { show: 3, label: '+1' },
      { show: 3, move: { d: [2, 0] }, mark: 'ok' },
      { show: 3, mark: 'ok' }
    ]
  },
  undo: {
    tubes: [55, 120, 185], colors: { a: 0, b: 0, c: 0, d: 5, e: 5, f: 0 },
    start: { a: [0, 0], b: [0, 1], c: [0, 2], d: [1, 0], e: [1, 1], f: [1, 2] },
    frames: [
      { show: 3, hand: 1 },
      { show: 3, move: { f: [2, 0] }, mark: 'x' },
      { show: 3, move: { f: [1, 2] }, label: '↶' },
      { show: 3, move: { f: [0, 3] }, mark: 'ok' },
      { show: 3, mark: 'ok' }
    ]
  },
  time: {
    tubes: [85, 155], colors: { a: 0, b: 0, c: 0, d: 5, e: 5, f: 5, g: 0 },
    start: { a: [0, 0], b: [0, 1], c: [0, 2], d: [1, 0], e: [1, 1], f: [1, 2], g: [1, 3] },
    frames: [
      { show: 2, clock: '0:03', hand: 1 },
      { show: 2, clock: '0:00', clockBad: 1, mark: 'x' },
      { show: 2, clock: '0:30', clockGood: 1, label: '+30' },
      { show: 2, clock: '0:29', clockGood: 1, move: { g: [0, 3] }, mark: 'ok' },
      { show: 2, clock: '0:28', clockGood: 1, mark: 'ok' }
    ]
  }
};
let taTimer = null;
function stopToolAnim() { clearInterval(taTimer); taTimer = null; }
function toolAnim(box, kind) {
  stopToolAnim();
  const sc = TA_SCENES[kind], slotY = k => 114 - 24 * k;
  const tubeSvg = sc.tubes.map((x, i) => `<g class="ta-t" data-i="${i}" style="--tt:translate(${x}px,0px);transform:var(--tt)"><rect x="-19" y="20" width="38" height="110" rx="16" fill="rgba(236,240,255,.07)" stroke="rgba(236,240,255,.4)" stroke-width="2.5"/></g>`).join('');
  const ballSvg = Object.keys(sc.colors).map(id => `<g class="ta-b" data-id="${id}"><circle r="11" style="fill:var(--c${sc.colors[id]})"/><circle r="3.5" cx="-4" cy="-4" fill="rgba(255,255,255,.5)"/></g>`).join('');
  box.innerHTML = `<svg viewBox="0 0 240 140" aria-hidden="true">${tubeSvg}${ballSvg}` +
    `<g class="ta-clock" opacity="0"><rect x="8" y="6" width="52" height="24" rx="12" fill="rgba(236,240,255,.1)"/><text x="34" y="23" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor" style="font-variant-numeric:tabular-nums"></text></g>` +
    `<text class="ta-label" x="120" y="16" text-anchor="middle" font-size="15" font-weight="800" fill="var(--amber)"></text>` +
    `<g class="ta-mark" opacity="0" transform="translate(218 22)"><circle r="14"/><path d="" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  const svg = box.querySelector('svg');
  svg.style.color = 'var(--ink)';
  let pos = Object.assign({}, sc.start), f = 0;
  const place = () => {
    for (const [id, [ti, k]] of Object.entries(pos)) svg.querySelector(`.ta-b[data-id="${id}"]`).style.transform = `translate(${sc.tubes[ti]}px, ${slotY(k)}px)`;
  };
  const step = () => {
    const fr = sc.frames[f];
    if (f === 0) pos = Object.assign({}, sc.start);
    if (fr.move) Object.assign(pos, fr.move);
    place();
    svg.querySelectorAll('.ta-t').forEach(g => {
      const i = Number(g.dataset.i), shown = i < fr.show;
      g.style.opacity = shown ? 1 : 0;
      g.classList.toggle('hand', fr.hand === i);
      g.classList.remove('nope');
      if (fr.nope === i) { void g.getBBox(); g.classList.add('nope'); }
    });
    svg.querySelector('.ta-label').textContent = fr.label || '';
    const clock = svg.querySelector('.ta-clock');
    clock.setAttribute('opacity', fr.clock ? 1 : 0);
    if (fr.clock) { const tx = clock.querySelector('text'); tx.textContent = fr.clock; tx.setAttribute('fill', fr.clockBad ? 'var(--danger)' : fr.clockGood ? 'var(--good)' : 'currentColor'); }
    const mark = svg.querySelector('.ta-mark');
    mark.setAttribute('opacity', fr.mark ? 1 : 0);
    if (fr.mark) {
      mark.querySelector('circle').setAttribute('fill', fr.mark === 'x' ? 'var(--danger)' : 'var(--good)');
      mark.querySelector('path').setAttribute('d', fr.mark === 'x' ? 'M-5 -5L5 5M5 -5L-5 5' : 'M-6 0L-2 4L6 -4');
    }
    f = (f + 1) % sc.frames.length;
  };
  step();
  taTimer = setInterval(() => { if (!box.isConnected || box.closest('[hidden]')) return stopToolAnim(); step(); }, 1000);
}

/* ----- gifts on level start (undo, +30 s) ----- */
function giftsFor(li) {
  if (!S || S.li !== li || S.won) return;
  const list = [];
  if (CFG.giftUndo > 0 && li + 1 >= CFG.giftUndoFrom && !save.granted.undo) list.push(['undo', CFG.giftUndo]);
  if (CFG.giftTime > 0 && limitOf(li) && !save.granted.time) list.push(['time', CFG.giftTime]);
  if (!list.length) return;
  pauseClock();
  const next = () => {
    const item = list.shift();
    if (!item) { stopToolAnim(); hide('#giftOverlay'); resumeClock(); updateHud(); return; }
    const [kind, n] = item, t = tr();
    save.granted[kind] = 1; save.inv[kind] += n; persist();
    track('booster_gift', { type: kind, level: li + 1, count: n });
    $('#giftKicker').textContent = t.giftKicker;
    $('#giftTitle').textContent = kind === 'undo' ? t.giftUndoTitle : t.giftTimeTitle;
    $('#giftText').textContent = kind === 'undo' ? t.giftUndoText(n) : t.giftTimeText;
    $('#giftChip').textContent = t.inStock(save.inv[kind]);
    $('#giftTake').textContent = t.giftTake;
    show('#giftOverlay');
    toolAnim($('#giftAnim'), kind);
    sfx.coin();
    $('#giftTake').onclick = () => { sfx.unlock(); next(); };
  };
  next();
}

/* ----- dead end ----- */
let stuckTimer = null, stuckSeen = '', solveReq = 0, solveTimer = null;
const stateKey = () => S ? S.tubes.map(t => t.join(',')).join('|') : '';
const overlayOpen = () => !!document.querySelector('.overlay:not([hidden]), .hard-intro:not([hidden])');
// called after every change of the board (pour, undo, added tube)
function afterBoardChange() {
  clearTimeout(stuckTimer); clearTimeout(solveTimer); solveReq++;
  if (!S || S.won) return;
  const useful = usefulMoveExists();
  hint(useful ? ($('#hint').classList.contains('warn') ? '' : $('#hint').textContent) : tr().stuck, !useful);
  if (!useful) { scheduleStuck('dead', stateKey()); return; }
  if (CFG.stuckSolverMax > 0 && S.tubes.length <= CFG.stuckSolverTubes && S.moves > 0) {
    const id = solveReq, key = stateKey(), myS = S;
    solveTimer = setTimeout(() => runSolver(S.tubes, lockOf(), r => {
      if (id !== solveReq || S !== myS || stateKey() !== key) return;
      if (r.res === 'dead') scheduleStuck('early', key);
    }), 200);
  }
}
function scheduleStuck(kind, key) {
  if (stuckSeen === key) return;
  const myS = S;
  stuckTimer = setTimeout(async () => {
    await animIdle();
    if (S !== myS || !S || S.won || S.failed || stateKey() !== key) return;
    if (S.busy || overlayOpen()) { stuckTimer = setTimeout(() => scheduleStuck(kind, key), 400); return; }
    openStuck(kind);
  }, CFG.stuckDelay);
}
function openStuck(kind) {
  if (!S) return;
  stuckSeen = stateKey();
  const t = tr(), gift = CFG.giftTube > 0 && !save.granted.tube && canAddTube();
  let offerShown = '';
  shopOnStuck();
  setSelected(null);
  pauseClock();
  const close = how => {
    stopToolAnim(); hide('#stuckOverlay'); resumeClock();
    track('stuck_offer', { level: lvlNo(), how, kind, gift: gift ? 1 : 0, extra: S ? (S.extra || 0) : 0 });
  };
  $('#stuckKicker').hidden = !gift;
  $('#stuckAnim').hidden = !gift;
  $('#stuckHave').textContent = t.youHave;
  const btns = $('#stuckBtns');
  const render = () => {
    $('#stuckCoins').textContent = save.coins;
    if (gift) {
      $('#stuckKicker').textContent = t.giftKicker;
      $('#stuckTitle').textContent = t.giftTubeTitle;
      $('#stuckText').textContent = (kind === 'early' ? t.earlyTitle : t.stuckTitle) + '. ' + t.giftTubeText;
      btns.innerHTML = `<button class="btn primary" id="stGift">${t.giftAddTube}</button>`;
      $('#stGift').onclick = () => {
        sfx.unlock();
        save.granted.tube = 1; save.inv.tube += CFG.giftTube; persist();
        track('booster_gift', { type: 'tube', level: lvlNo(), count: CFG.giftTube });
        takeBooster('tube', 'gift');
        close('gift'); sfx.coin(); addTubeNow();
      };
      return;
    }
    $('#stuckTitle').textContent = kind === 'early' ? t.earlyTitle : t.stuckTitle;
    $('#stuckText').textContent = kind === 'early' ? t.earlyText : t.stuckText;
    const cost = CFG.addTubeCost, stock = save.inv.tube, enough = save.coins >= cost;
    let h = '';
    if (canAddTube()) {
      if (stock > 0) h += `<button class="btn primary st-btn" id="stStock"><span>${t.plusTube}</span><span class="st-sub">${t.fromStock(stock)}</span></button>`;
      else {
        h += `<div class="st-row"><button class="btn primary st-btn" id="stCoins"${enough ? '' : ' disabled'}><span>${t.plusTube}</span><span class="st-sub"><span class="coin"></span>${cost}</span></button>` +
          `<button class="btn st-btn" id="stAd"><span>${t.plusTube}</span><span class="tag">${t.adTag}</span></button></div>`;
        if (!enough) {
          const pk = stuckPack();
          h += `<div class="st-pack"><small>${t.packNote}</small><button class="btn st-btn ${pk.cls}" id="stShop">${pk.html}</button></div>`;
          if (offerShown !== pk.id) { offerShown = pk.id; track('iap_offer_shown', { product: pk.id, place: 'stuck', level: lvlNo() }); }
        }
      }
    }
    if (S.history.length) h += `<button class="btn" id="stUndo">${t.undoMove}</button>`;
    h += `<button class="btn" id="stRestart">${t.restartLevel}</button>`;
    btns.innerHTML = h;
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = () => { sfx.unlock(); fn(); }; };
    on('#stStock', () => { takeBooster('tube', 'stock'); track('revive', { level: lvlNo(), how: 'stock', kind: 'tube' }); close('stock'); addTubeNow(); });
    on('#stCoins', () => {
      if (save.coins < cost) return;
      save.coins -= cost; persist(); sfx.coin(); refreshCoins();
      track('coins_spent', { on: 'tube', amount: cost, level: lvlNo() });
      takeBooster('tube', 'coins'); track('revive', { level: lvlNo(), how: 'coins', kind: 'tube' });
      close('coins'); addTubeNow();
    });
    on('#stAd', async () => {
      hide('#stuckOverlay');
      const got = await playAd('reward');
      if (!S) return;
      if (!got) { show('#stuckOverlay'); return; }
      takeBooster('tube', 'ad'); track('revive', { level: lvlNo(), how: 'ad', kind: 'tube' });
      close('ad'); addTubeNow();
    });
    on('#stShop', async () => {
      const id = stuckPack().id;
      if (await shopBuy(id, 'stuck')) { track('stuck_offer', { level: lvlNo(), how: 'shop', kind, gift: 0, product: id }); render(); }
    });
    on('#stUndo', () => { close('undo'); onUndo(); });
    on('#stRestart', () => { close('restart'); onRestart(); });
  };
  render();
  $('#stuckClose').hidden = gift;
  $('#stuckClose').onclick = () => { sfx.unlock(); close('dismiss'); };
  show('#stuckOverlay');
  if (gift) toolAnim($('#stuckAnim'), 'tube');
  sfx.nope(); buzz([30, 40, 30]);
}

/* ----- bounded solver: proves "no win from here" (runs in a Web Worker) ----- */
// res: 'win' (a solution exists), 'dead' (search exhausted: the level cannot be won any more), 'unknown' (limit hit)
function solveColourSort(tubes, lock, cap, maxStates, maxMs) {
  const t0 = Date.now();
  const isDone = t => t.length === cap && t.every(c => c === t[0]);
  const open = st => !lock || st.some(t => isDone(t) && t[0] === lock.k);
  const key = st => {
    const r = st.map(t => t.join(','));
    const lk = lock ? r[lock.t] + (open(st) ? 'o' : 'c') + '#' : '';
    return lk + r.filter((_, i) => !lock || i !== lock.t).sort().join('|');
  };
  const seen = new Set([key(tubes)]);
  const stack = [tubes.map(t => t.slice())];
  let n = 0;
  while (stack.length) {
    if (++n > maxStates || (n % 256 === 0 && Date.now() - t0 > maxMs)) return { res: 'unknown', states: n, ms: Date.now() - t0 };
    const st = stack.pop();
    if (st.every(t => !t.length || isDone(t))) return { res: 'win', states: n, ms: Date.now() - t0 };
    const closed = !open(st);
    const kids = [];
    for (let i = 0; i < st.length; i++) {
      const a = st[i];
      if (!a.length || isDone(a) || (closed && i === lock.t)) continue;
      const c = a[a.length - 1];
      let run = 1; while (run < a.length && a[a.length - 1 - run] === c) run++;
      let emptyTried = false;
      for (let j = 0; j < st.length; j++) {
        if (i === j || (closed && j === lock.t)) continue;
        const b = st[j];
        if (b.length >= cap || (b.length && b[b.length - 1] !== c)) continue;
        if (!b.length) { if (run === a.length || emptyTried) continue; emptyTried = true; }
        const k = Math.min(run, cap - b.length);
        const s = st.slice(); s[i] = a.slice(0, a.length - k); s[j] = b.concat(a.slice(a.length - k));
        const kk = key(s);
        if (seen.has(kk)) continue;
        seen.add(kk);
        // moves onto the same colour first (explored last pushed = first popped)
        kids.push([b.length ? 1 : 0, s]);
      }
    }
    kids.sort((x, y) => x[0] - y[0]);
    for (const [, s] of kids) stack.push(s);
  }
  return { res: 'dead', states: n, ms: Date.now() - t0 };
}
let solverWorker, solverCbs = new Map(), solverSeq = 0;
function solverInit() {
  if (solverWorker !== undefined) return solverWorker;
  try {
    const src = `const solve = ${solveColourSort.toString()};\nonmessage = e => { const d = e.data; postMessage({ id: d.id, r: solve(d.tubes, d.lock, d.cap, d.max, d.ms) }); };`;
    solverWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    solverWorker.onmessage = e => { const cb = solverCbs.get(e.data.id); solverCbs.delete(e.data.id); if (cb) cb(e.data.r); };
    solverWorker.onerror = e => { e.preventDefault && e.preventDefault(); solverWorker = null; solverCbs.clear(); };
  } catch (e) { solverWorker = null; }
  return solverWorker;
}
function runSolver(tubes, lock, cb) {
  const w = solverInit(), msg = { tubes: tubes.map(t => t.slice()), lock, cap: CFG.cap, max: CFG.stuckSolverMax, ms: CFG.stuckSolverMs };
  if (w) { const id = ++solverSeq; solverCbs.set(id, cb); msg.id = id; w.postMessage(msg); return; }
  // no workers (blocked by the page): a much smaller search on the main thread
  setTimeout(() => cb(solveColourSort(msg.tubes, lock, msg.cap, Math.min(msg.max, 4000), Math.min(msg.ms, 40))), 0);
}
window.__csSolve = (tubes, lock, max, ms) => solveColourSort(tubes, lock || null, CFG.cap, max || CFG.stuckSolverMax, ms || CFG.stuckSolverMs);

/* ----- tester tools ----- */
function testerBoost3() { for (const k of BOOST_KINDS) save.inv[k] += 3; persist(); if (S) updateHud(); toast(tr().tBoostDone); }
function testerGifts() { save.granted = {}; persist(); toast(tr().tGiftsDone); }
// plays random moves from the current position until no useful move is left (never wins)
function testerStuck() {
  if (!S || S.won) { toast(tr().tNeedLevel); return false; }
  if (!$('#stuckOverlay').hidden) { stopToolAnim(); hide('#stuckOverlay'); resumeClock(); }
  // random play from the current board, and (every other try) from the level's first position in history
  const bases = [{ tubes: S.tubes, hidden: S.hidden, keep: S.history.length }];
  if (S.history.length) bases.push({ tubes: S.history[0].t, hidden: S.history[0].h, keep: 0 });
  const real = S;
  for (let attempt = 0; attempt < 400; attempt++) {
    const base = bases[attempt % bases.length];
    S = { ...real, tubes: base.tubes.map(t => t.slice()), hidden: base.hidden.map(h => h.slice()) };
    const hist = [];
    for (let step = 0; step < 300; step++) {
      if (!usefulMoveExists()) {
        if (isWon(S.tubes)) break;
        const tubes = S.tubes, hidden = S.hidden;
        S = real;
        S.moves += hist.length - (S.history.length - base.keep);
        S.history.length = base.keep;
        S.history.push(...hist); S.tubes = tubes; S.hidden = hidden;
        stuckSeen = '';
        render(); updateHud(); lockWasOpen = lockOpen();
        afterBoardChange();
        return true;
      }
      // random play that fills the free space: pours onto a colour are preferred over pours into an empty tube
      const onto = [], empty = [];
      for (let i = 0; i < S.tubes.length; i++) for (let j = 0; j < S.tubes.length; j++) {
        if (!canPour(i, j) || isDoneTube(S.tubes[i])) continue;
        if (!S.tubes[j].length) { if (topRun(S.tubes[i]) < S.tubes[i].length) empty.push([i, j]); }
        else onto.push([i, j]);
      }
      const moves = onto.length && (Math.random() < 0.75 || !empty.length) ? onto : empty;
      if (!moves.length) break;
      const [i, j] = moves[Math.floor(Math.random() * moves.length)];
      hist.push({ t: S.tubes.map(t => t.slice()), h: S.hidden.map(h => h.slice()) });
      const a = S.tubes[i], b = S.tubes[j], n = Math.min(topRun(a), CFG.cap - b.length);
      for (let k = 0; k < n; k++) { b.push(a.pop()); S.hidden[i].pop(); S.hidden[j].push(0); }
      if (S.hidden[i].length) S.hidden[i][S.hidden[i].length - 1] = 0;
      if (isWon(S.tubes)) break;
    }
  }
  S = real;
  toast(tr().tNoStuck);
  return false;
}

$('#timeBtn').addEventListener('click', onAddTime);
$('#reviveStockBtn').addEventListener('click', onReviveStock);
$('#tBoost3').addEventListener('click', testerBoost3);
$('#tGifts').addEventListener('click', testerGifts);
$('#tStuck').addEventListener('click', () => { if (!S) { toast(tr().tNeedLevel); return; } hide('#settingsOverlay'); resumeClock(); setTimeout(testerStuck, 50); });
// a new level or a restart: forget the previous board's dead-end state
function boostersOnStart() { clearTimeout(stuckTimer); clearTimeout(solveTimer); solveReq++; stuckSeen = ''; stopToolAnim(); hide('#stuckOverlay'); hide('#giftOverlay'); }
