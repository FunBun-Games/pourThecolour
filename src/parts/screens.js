/* ---------- Screens: home, level map, pre-level card ----------
   Flow: launch → home (a brand-new player goes straight into level 1) → Play → pre-level card → level.
   After a win: map scrolls to the next node, it pops open, then the pre-level card for it appears.
   Pre-level bonuses cost 25% less than the same help during the level (CFG.preBoostDiscount). */
let screenNow = 'game';
function screen(name) {
  screenNow = name;
  $('#app').hidden = name !== 'game';
  $('#home').hidden = name !== 'home';
  $('#map').hidden = name !== 'map';
  document.body.classList.toggle('ingame', name === 'game');
  if (name !== 'game') {
    S = null;
    $('#banner').hidden = true;
    if (NATIVE_ADS()) P.ads.hideBanner();
    music.setMood('menu');
  }
  refreshCoins();
}
function refreshCoins() { document.querySelectorAll('[data-coins]').forEach(el => el.textContent = save.coins); }
const nextLevel = () => Math.min(save.level, LEVELS.length - 1);

function setScene(li) {
  const wd = worldOf(li), bg = $('#bg');
  bg.style.background = biomeArt.bg(li);
  bg.style.filter = wd.hue ? `hue-rotate(${wd.hue}deg)` : '';
  if (bg.dataset.w !== String(wd.w)) { bg.dataset.w = wd.w; bg.innerHTML = biomeArt.svg(li, 860, 5); }
}

/* ----- Home ----- */
function showHome() {
  const t = tr(), li = nextLevel(), wd = worldOf(li), L = LEVELS[li];
  screen('home');
  setScene(li);
  $('#homeWorld').textContent = t.worldN(wd.w + 1, wd.name);
  const inWorld = li % 10;
  $('#homeProgressFill').style.width = (inWorld / 10 * 100) + '%';
  $('#homeProgressText').textContent = t.worldProgress(inWorld, 10);
  const play = $('#homePlay');
  play.classList.toggle('boss', !!L.hard);
  $('#homePlayLabel').textContent = save.level >= LEVELS.length ? t.allDone : (L.hard ? t.playBoss(li + 1) : t.playLevel(li + 1));
}

/* ----- Map ----- */
const MAP_STEP = 96, MAP_FOOT = 76;
const mapX = i => 50 + 30 * Math.sin(i * 0.85) + 6 * Math.sin(i * 2.1);
function smoothPath(pts) {
  // Catmull-Rom → cubic Bézier
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[k - 1] || pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
const ICON_BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4 14h6.5L9 22l11-13h-7z"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V7a3 3 0 0 0-6 0v3z"/></svg>';
const miniStars = n => `<span class="node-stars">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function renderMap() {
  const t = tr(), cur = nextLevel(), worlds = Math.ceil(LEVELS.length / 10);
  const H = MAP_FOOT + MAP_STEP * 10;
  let html = '';
  for (let w = 0; w < worlds; w++) {
    const first = w * 10, last = Math.min(first + 9, LEVELS.length - 1), wd = worldOf(first);
    const yOf = k => H - (MAP_FOOT + MAP_STEP * k + MAP_STEP / 2);
    const pts = [[mapX(first - 0.5), H]];
    for (let i = first; i <= last; i++) pts.push([mapX(i), yOf(i - first)]);
    pts.push([mapX(last + 0.5), 0]);
    // the travelled part of the road: everything up to the current node
    let done = '';
    if (cur >= first) {
      const dp = cur > last || save.level >= LEVELS.length ? pts : pts.slice(0, cur - first + 2);
      done = `<path d="${smoothPath(dp)}" class="road-done" vector-effect="non-scaling-stroke"/>`;
    }
    let nodes = '';
    for (let i = first; i <= last; i++) {
      const L = LEVELS[i], st = (save.best && save.best[i]) || 0;
      const state = i < cur || (save.level >= LEVELS.length) ? 'done' : i === cur ? 'current' : 'locked';
      const cls = `node ${state}${L.hard ? ' boss' : ''}`;
      const inner = L.hard ? `${ICON_BOLT}<b>${i + 1}</b>` : `<b>${i + 1}</b>`;
      const label = L.hard ? `<span class="boss-tag">${t.bossTag}</span>` : '';
      nodes += `<button class="${cls}" data-li="${i}" style="left:${mapX(i).toFixed(1)}%;bottom:${MAP_FOOT + MAP_STEP * (i - first) + MAP_STEP / 2}px" aria-label="${t.level(i + 1)}${L.hard ? ' · ' + t.bossTag : ''}"${state === 'locked' ? ' aria-disabled="true"' : ''}>` +
        `${inner}${state === 'locked' ? `<span class="node-lock">${ICON_LOCK}</span>` : ''}${state === 'done' ? miniStars(st) : ''}${label}${state === 'current' ? '<span class="you-pin" aria-hidden="true"></span>' : ''}</button>`;
    }
    const lockedWorld = first > cur;
    html += `<section class="world${lockedWorld ? ' future' : ''}" style="height:${H}px">` +
      `<div class="world-bg" style="background:${biomeArt.mapBg(first)};${wd.hue ? `filter:hue-rotate(${wd.hue}deg)` : ''}">${biomeArt.svg(first, H, 3)}</div>` +
      `<svg class="road" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${smoothPath(pts)}" class="road-base" vector-effect="non-scaling-stroke"/>${done}</svg>` +
      `<div class="world-sign"><span class="world-num">${t.worldShort(w + 1)}</span><span class="world-name">${wd.name}</span></div>` +
      nodes + `</section>`;
  }
  const box = $('#mapWorlds');
  box.innerHTML = html;
}

function showMap(opts = {}) {
  screen('map');
  renderMap();
  track('map_open', { level: nextLevel() + 1 });
  const cur = nextLevel();
  const node = $(`#mapWorlds .node[data-li="${cur}"]`);
  const sc = $('#mapScroll');
  if (node) {
    // centre the current node (instant), then let the fresh node pop
    const nr = node.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    sc.scrollTop += (nr.top - sr.top) - sr.height * 0.55;
    if (opts.fresh) { node.classList.add('fresh'); sfx.unlockSound(); }
  }
  if (opts.openLevel !== undefined) setTimeout(() => { if (screenNow === 'map') openPreLevel(opts.openLevel); }, opts.fresh ? 750 : 150);
}

/* ----- Pre-level card ----- */
let preSel = { tube: false, time: false }, preLi = 0;
const boostPrice = () => Math.round(CFG.adX * (1 - CFG.preBoostDiscount));
const discountLabel = () => `-${Math.round(CFG.preBoostDiscount * 100)}%`;

function openPreLevel(li) {
  const t = tr(), L = LEVELS[li], rv = rivalOf(li), lim = limitOf(li);
  preLi = li; preSel = { tube: false, time: false };
  $('#preTitle').textContent = t.level(li + 1);
  $('#preBoss').hidden = !L.hard;
  $('#preBoss').textContent = t.bossBadge;
  const chips = [];
  if (lim) chips.push(`<span class="chip">⏱ ${t.clock(lim)}</span>`);
  if (L.lock) chips.push(`<span class="chip">${ICON_LOCK} ${t.chipLock}</span>`);
  if (L.hidden) chips.push(`<span class="chip">? ${t.chipHidden}</span>`);
  if (L.tubes.filter(x => !x.length).length === 1) chips.push(`<span class="chip">${t.chipOneEmpty}</span>`);
  $('#preChips').innerHTML = chips.join('');
  $('#preRival').innerHTML = `<span class="ava" style="--rc:${rv.color}">${rv.name[0]}</span>${t.rivalChip(rv.name, L.minMoves, t.clock(rivalSecs(L.minMoves)))}`;
  const best = (save.best && save.best[li]) || 0;
  $('#preStars').hidden = !best;
  $('#preStars').innerHTML = best ? miniStars(best) : '';
  const showBoosts = li + 1 >= CFG.preBoostFrom;
  $('#preBoosts').hidden = !showBoosts;
  if (showBoosts) {
    const price = boostPrice(), full = CFG.adX, items = [['tube', t.boostTube, t.boostTubeSub, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h6M9 3v13a3 3 0 0 0 6 0V3"/><path d="M19 8v6M16 11h6"/></svg>']];
    if (lim) items.push(['time', t.boostTime(CFG.reviveSecs), t.boostTimeSub, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>']);
    $('#preBoostList').innerHTML = items.map(([k, name, sub, icon]) =>
      `<button class="boost" data-k="${k}" aria-pressed="false"><span class="sale">${discountLabel()}</span><span class="boost-ico">${icon}</span>` +
      `<span class="boost-txt"><b>${name}</b><small>${sub}</small></span>` +
      `<span class="boost-price"><s>${full}</s><span><span class="coin"></span>${price}</span></span><span class="tick" aria-hidden="true"></span></button>`).join('');
    $('#preBoostList').querySelectorAll('.boost').forEach(b => b.addEventListener('click', () => togglePreBoost(b.dataset.k)));
  }
  $('#preCoins').textContent = save.coins;
  updatePreCta();
  show('#preOverlay');
}
function preCost() { return (preSel.tube ? boostPrice() : 0) + (preSel.time ? boostPrice() : 0); }
function togglePreBoost(k) {
  sfx.unlock();
  const turningOn = !preSel[k];
  if (turningOn && save.coins < preCost() + boostPrice()) { toast(tr().notEnough); sfx.nope(); return; }
  preSel[k] = turningOn;
  sfx.pick(turningOn ? 5 : 2);
  updatePreCta();
}
function updatePreCta() {
  const t = tr(), cost = preCost();
  $('#preBoostList').querySelectorAll('.boost').forEach(b => {
    const on = !!preSel[b.dataset.k];
    b.setAttribute('aria-pressed', on);
    b.disabled = !on && save.coins < cost + boostPrice();
  });
  $('#prePlay').innerHTML = cost ? `${t.play} · <span class="coin"></span>${cost}` : t.play;
  $('#prePlay').classList.toggle('boss', !!LEVELS[preLi].hard);
}
function onPrePlay() {
  sfx.unlock();
  const cost = preCost();
  if (cost > save.coins) { toast(tr().notEnough); return; }
  if (cost) {
    save.coins -= cost; persist(); sfx.coin();
    for (const k of ['tube', 'time']) if (preSel[k]) {
      track('pre_boost', { level: preLi + 1, kind: k, price: boostPrice() });
      track('coins_spent', { on: 'pre_' + k, amount: boostPrice(), level: preLi + 1 });
    }
  }
  hide('#preOverlay');
  playLevel(preLi, { tube: preSel.tube, time: preSel.time });
}
function playLevel(li, boosts) {
  screen('game');
  setScene(li);
  startLevel(li, null, boosts);
}
function leaveLevel() {
  if (S && !S.won) track('level_quit', { level: S.li + 1, moves: S.moves, seconds: elapsed() });
  showMap();
}
