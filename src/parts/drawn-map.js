/* ---------- Stage 3: the drawn level map (style B) ----------
   Founder, 06 Nov: the map must be fully painted, like the concept — no code road. Each picture (GPT-3b prompt) is one
   painted stretch of road with 5 empty platforms; a world is 2 pictures (levels 1–5 and 6–10). tools/map-art.py bends
   both ends of every picture's road to the middle at one common width and finds its platforms; the build puts each
   picture and its platform marks into MAPART below. Pictures are stacked bottom-to-top; each one's top edge fades into the
   picture above (OVERLAP of its height), so the road runs on without a seam. A missing picture repeats the ones we
   have, mirrored on every other repeat. The game only marks the state on the painted platforms:
   number, stars (passed), padlock (locked), gold (current), red (boss), a red pin over the current one.
   The gold/red/grey tops are the picture itself recoloured (a hue-shifted copy of the platform's cap), so the shading
   stays painted. The tap area is the whole platform (at least 44 px), placed in % of the picture: any screen width. */

const MAPART = __MAPART__;   // { list: [names in road order], art: { name: { aspect, overlap, pads:[…] } } }
const DM_W = 1024;           // pictures are marked in 1024-wide pixels; the slot's --u = its width / 1024

document.head.insertAdjacentHTML('beforeend', `<style>
${MAPART.list.map(n => `.dm-img-${n}{background-image:url(${MAPART.src[n]})}`).join('\n')}
/* the drawn map is the whole screen: the pictures run under the top bar, the dock and the tab bar; on screens wider
   than the column (640 px) the same picture, blurred and dimmed, continues to the sides, and the column's edges fade
   into it — one continuous picture, no frame. Below level 1 and above the last level the picture continues mirrored. */
#map.dm-on { max-width: none; }
#map.dm-on > .topbar { width: min(100%, 608px); margin-inline: auto; align-self: center; }
#map.dm-on::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: calc(var(--dm-head, 80px) + 40px); z-index: 2; pointer-events: none;
  background: linear-gradient(rgba(10, 14, 40, 0.88), rgba(10, 14, 40, 0.55) 55%, transparent); }
#map.dm-on .map-scroll { position: absolute; inset: 0; margin: 0; padding: 0 !important; z-index: 0; background: #0d1433; }
#mapWorlds.drawn { display: flex; flex-direction: column-reverse; position: relative; z-index: 0; --u: 0.384; --cw: 393px; }
.dm-slot { position: relative; flex: none; width: 100%; height: calc(var(--u) * var(--h) * 1px); pointer-events: none; }
/* a real road stretch laid over the seam above this picture (tools/map-art.py: build_seams) */
.dm-patch { position: absolute; z-index: 1; background-size: 100% 100%; background-repeat: no-repeat; pointer-events: none; }
.dm-slot + .dm-slot { margin-bottom: calc(var(--u) * var(--ov) * -1px); }
.dm-col { position: absolute; top: 0; bottom: 0; left: calc(50% - var(--cw) / 2); width: var(--cw); }
.dm-art, .dm-fill { position: absolute; inset: 0; background-size: 100% 100%; background-repeat: no-repeat; }
.dm-fill { display: none; inset: 0 -3%; filter: blur(14px) brightness(0.72) saturate(1.1); }
#mapWorlds.wide .dm-fill { display: block; }
.dm-art.flip, .dm-cap.flip, .dm-fill.flip { transform: scaleX(-1); }
/* the top band fades into the picture above (stacked under this one) */
.dm-slot.fade .dm-art, .dm-slot.fade .dm-fill { -webkit-mask-image: var(--dm-vfade); mask-image: var(--dm-vfade); }
#mapWorlds.drawn { --dm-hfade: linear-gradient(90deg, transparent, #000 13%, #000 87%, transparent); }
/* resolved per slot (its own --ovp) */
.dm-slot { --dm-vfade: linear-gradient(180deg, transparent 0, rgba(0,0,0,0.08) calc(var(--ovp) * 0.18), rgba(0,0,0,0.5) calc(var(--ovp) * 0.5), rgba(0,0,0,0.92) calc(var(--ovp) * 0.82), #000 var(--ovp)); }
/* wide: the sharp column's left/right edges fade into the blurred continuation */
#mapWorlds.wide .dm-art { -webkit-mask-image: var(--dm-hfade); mask-image: var(--dm-hfade); }
#mapWorlds.wide .dm-slot.fade .dm-art { -webkit-mask-image: var(--dm-hfade), var(--dm-vfade); mask-image: var(--dm-hfade), var(--dm-vfade); -webkit-mask-composite: source-in; mask-composite: intersect; }
/* the mirrored continuation below level 1 and above the last level */
.dm-end { position: relative; flex: none; width: 100%; overflow: hidden; pointer-events: none; }
.dm-end.foot { height: calc(var(--dm-foot, 300px) + 56px); }
.dm-end.head { height: var(--dm-head, 80px); }
/* below level 1 and above the last level: a deep blue shade with a soft cyan glow (no mirrored picture) */
.dm-end.foot { background: radial-gradient(70% 55% at 50% 0%, rgba(70, 160, 255, 0.28), transparent 70%), linear-gradient(180deg, #13245e, #0b1640 45%, #070d2a); }
.dm-end.head { background: radial-gradient(70% 55% at 50% 100%, rgba(70, 160, 255, 0.28), transparent 70%), linear-gradient(0deg, #13245e, #0b1640 45%, #070d2a); }
/* the picture next to it fades into the shade */
.dm-shade { position: absolute; left: 0; right: 0; z-index: 1; pointer-events: none; height: calc(var(--u) * 130px); }
.dm-shade.bottom { bottom: 0; background: linear-gradient(180deg, transparent, rgba(19, 36, 94, 0.6) 55%, #13245e); }
.dm-shade.top { top: 0; background: linear-gradient(0deg, transparent, rgba(19, 36, 94, 0.6) 55%, #13245e); }
/* platform cap recoloured from the picture itself */
.dm-cap { position: absolute; border-radius: 50% / 42%; background-repeat: no-repeat; pointer-events: none;
  background-size: calc(var(--u) * ${DM_W}px) calc(var(--u) * var(--h) * 1px);
  -webkit-mask-image: radial-gradient(closest-side, #000 86%, transparent 100%); mask-image: radial-gradient(closest-side, #000 86%, transparent 100%); }
.dm-cap.current { filter: hue-rotate(190deg) saturate(1.5) brightness(1.75) contrast(1.05); }
.dm-cap.boss { filter: hue-rotate(142deg) saturate(1.6) brightness(1.35); }
.dm-cap.boss.locked { filter: hue-rotate(142deg) saturate(0.75) brightness(0.8); }
.dm-cap.locked { filter: grayscale(0.85) brightness(0.62); }
.dm-glow { position: absolute; border-radius: 50%; pointer-events: none; mix-blend-mode: screen; background: radial-gradient(closest-side, rgba(255, 214, 90, 0.6), rgba(255, 170, 40, 0.22) 60%, transparent); animation: dmglow 1.6s ease-in-out infinite; }
.dm-glow.boss { background: radial-gradient(closest-side, rgba(255, 90, 100, 0.6), rgba(255, 40, 60, 0.22) 60%, transparent); }
@keyframes dmglow { 50% { opacity: 0.55; transform: scale(1.08); } }
/* marks on the top face: centred on it, a little flattened like paint on the platform */
.dm-mark { position: absolute; width: 0; height: 0; pointer-events: none; z-index: 2; }
.dm-num { position: absolute; left: 0; top: 0; transform: translate(-50%, -52%) scaleY(0.86); display: inline-flex; align-items: center; gap: calc(var(--u) * 2px);
  font-family: var(--font-display); font-weight: 700; font-size: calc(var(--u) * 46px); line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums;
  color: #fff; -webkit-text-stroke: calc(var(--u) * 9px) #1d2230; paint-order: stroke fill; text-shadow: 0 calc(var(--u) * 4px) 0 rgba(29, 34, 48, 0.55); }
.dm-mark.locked .dm-num { color: #c9d1e6; }
.dm-num svg { width: calc(var(--u) * 34px); height: calc(var(--u) * 34px); fill: #fff4b8; stroke: #1d2230; stroke-width: 3; paint-order: stroke; overflow: visible; }
.dm-stars { position: absolute; left: 0; top: calc(var(--u) * (var(--ry) * -1px - 30px)); transform: translateX(-50%); display: flex; align-items: flex-end; gap: calc(var(--u) * 2px); }
.dm-stars i { width: calc(var(--u) * 34px); height: calc(var(--u) * 34px); background: #3a4470; clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  filter: drop-shadow(0 calc(var(--u) * 3px) 0 #1d2230); }
.dm-stars i:nth-child(2) { margin-bottom: calc(var(--u) * 10px); }
.dm-stars i.on { background: linear-gradient(#fff3a6, #ffcd3c 55%, #f29a12); }
.dm-lock { position: absolute; left: calc(var(--u) * (var(--rx) * 1px - 18px)); top: calc(var(--u) * -30px); width: calc(var(--u) * 40px); height: calc(var(--u) * 40px); border-radius: 50%;
  display: grid; place-items: center; background: linear-gradient(#5b6687, #343d5e); border: calc(var(--u) * 4px) solid #1d2230; }
.dm-lock svg { width: 60%; height: 60%; fill: #e3e8f6; }
.dm-pin { position: absolute; left: 0; top: calc(var(--u) * (var(--ry) * -1px - 92px)); width: calc(var(--u) * 58px); height: calc(var(--u) * 76px); transform: translateX(-50%); animation: dmpin 1.1s ease-in-out infinite; filter: drop-shadow(0 calc(var(--u) * 6px) calc(var(--u) * 4px) rgba(0,0,0,0.45)); }
.dm-mark.boss .dm-pin { top: calc(var(--u) * (var(--ry) * -1px - 100px)); }
@keyframes dmpin { 50% { translate: 0 calc(var(--u) * -12px); } }
.dm-pad { position: absolute; z-index: 3; padding: 0; margin: 0; border: 0; background: none; border-radius: 40%; pointer-events: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.dm-pad:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.dm-pad.fresh + .dm-cap, .dm-pad.fresh + .dm-cap + .dm-mark .dm-num { animation: dmfresh 700ms cubic-bezier(.2, 1.5, .4, 1) both; }
@keyframes dmfresh { from { filter: brightness(2.4); scale: 0.4; } }
.dm-sign.world-sign { z-index: 4; pointer-events: none; }
/* gate between worlds: a dark band across the seam (over both pictures and the side fill, under the marks) */
.dm-gate { position: absolute; left: 0; right: 0; z-index: 1; pointer-events: none;
  top: calc(var(--u) * (var(--ovt) * 0.5 - 75) * 1px); height: calc(var(--u) * 150px);
  background: linear-gradient(180deg, transparent, rgba(3, 5, 20, 0.75) 30%, rgba(3, 5, 20, 0.92) 50%, rgba(3, 5, 20, 0.75) 70%, transparent); }
/* the upper picture's half: the same band, measured from its bottom edge */
.dm-gate.up { top: auto; bottom: calc(var(--u) * (var(--ov) * 0.5 - 75) * 1px); }
.dm-gate.up::after { display: none; }
/* a thin glowing line across the middle of the gate: the border of the next world */
.dm-gate::after { content: ""; position: absolute; left: 4%; right: 4%; top: 50%; height: calc(var(--u) * 6px); margin-top: calc(var(--u) * -3px); border-radius: 99px;
  background: linear-gradient(90deg, transparent, rgba(255, 205, 60, 0.85) 20%, #fff3b0 50%, rgba(255, 205, 60, 0.85) 80%, transparent);
  box-shadow: 0 0 calc(var(--u) * 18px) calc(var(--u) * 4px) rgba(255, 190, 60, 0.55); }
/* the next world, not open yet: fog over its first picture, a padlock card; nothing above it */
.dm-fog { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; pointer-events: none;
  background: linear-gradient(0deg, rgba(4, 6, 24, 0.45), rgba(4, 6, 24, 0.86) 45%, rgba(4, 6, 24, 0.96)); backdrop-filter: blur(2px) saturate(0.6); -webkit-backdrop-filter: blur(2px) saturate(0.6); }
.dm-fog-card { display: grid; justify-items: center; gap: 6px; max-width: 80%; padding: 14px 18px; border-radius: 18px; text-align: center; color: #fff;
  background: linear-gradient(#304c92, #1b2c63); border: 3px solid #1d2230; box-shadow: inset 0 0 0 2px rgba(120, 190, 255, 0.3), 0 6px 0 rgba(0,0,0,0.35); transform: translateY(18%); }
.dm-fog-card b { font-family: var(--font-display); font-size: 1rem; line-height: 1.2; }
.dm-fog-card small { color: #c9d6f5; font-size: 0.8rem; font-weight: 600; line-height: 1.3; }
.dm-fog-lock { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(#5b6687, #343d5e); border: 3px solid #1d2230; }
.dm-fog-lock svg { width: 20px; height: 20px; fill: #e3e8f6; }
.dm-slot.locked .dm-fill { filter: blur(14px) brightness(0.35) saturate(0.6); }
.dm-end.head.locked::after { content: ""; position: absolute; inset: 0; background: rgba(4, 6, 24, 0.96); }
.dm-sign.bottom { bottom: auto; top: 100%; margin-top: 12px; }   /* in the blue shade under the first picture */
.dm-sign.top { bottom: auto; top: calc(var(--u) * var(--ovt) * 0.5px); transform: translateY(-50%); z-index: 4; }
.dm-sign.top { max-width: 62%; box-sizing: border-box; padding: 3px 10px 3px 4px; gap: 6px; font-size: 0.74rem; border-width: 2px; }
.dm-sign.top .world-num { padding: 2px 7px; font-size: 0.64rem; }
.dm-sign.top .world-name { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.dm-sign.top.left, .dm-sign.top.right { left: 50%; right: auto; transform: translate(-50%, -50%); }
@media (prefers-reduced-motion: reduce) { .dm-pin, .dm-glow { animation: none; } }
</style>`);

const DM_PIN = '<svg class="dm-pin" viewBox="0 0 58 76" aria-hidden="true"><path d="M29 3C15 3 4 13.6 4 27.4 4 45 29 73 29 73s25-28 25-45.6C54 13.6 43 3 29 3z" fill="#ff4b5c" stroke="#1d2230" stroke-width="5" stroke-linejoin="round"/><path d="M15 20c2-6 7-9 12-10" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round"/><circle cx="29" cy="27" r="9" fill="#fff" stroke="#1d2230" stroke-width="4"/></svg>';

// picture k of the road (k = 0 is levels 1–5). Every picture has its platforms right, left, right, left, right from
// the bottom; the second picture of each world (odd k) is mirrored, so the platforms keep alternating across every
// seam and the road between two pictures is one more bend of the same zigzag. World w uses theme w % 10 (worlds
// 11–20 repeat 1–10, like the world names). A missing part takes the same world's other part; a missing world takes
// the pictures we have, in turn.
function dmArtFor(k) {
  const w = Math.floor(k / 2), part = k % 2 ? 'b' : 'a', theme = w % 10, flip = k % 2 === 1;
  const own = `world${theme + 1}-${part}`, other = `world${theme + 1}-${part === 'a' ? 'b' : 'a'}`;
  if (MAPART.art[own]) return { name: own, flip };
  if (MAPART.art[other]) return { name: other, flip };
  const L = MAPART.list;
  return { name: L[k % L.length], flip };
}

// the column is the screen width up to 640 px; --u scales the pictures' 1024-px marks to it. The mirrored ends are as
// tall as the top bar (head) and as the dock + tab bar (foot), so level 1 and the last level can scroll into view.
const DM_COL = 640;
function dmUnit() {
  const box = $('#mapWorlds'), sc = $('#mapScroll'); if (!box || !sc) return;
  const W = sc.clientWidth || 393, cw = Math.min(W, DM_COL);
  box.style.setProperty('--u', (cw / DM_W).toFixed(5));
  box.style.setProperty('--cw', cw + 'px');
  box.classList.toggle('wide', W > cw + 1);
  const map = $('#map'), top = $('#map .map-top'), dock = $('#mapDock');
  if (!map || map.hidden) return;
  const mr = map.getBoundingClientRect();
  const head = Math.round(top.getBoundingClientRect().bottom - mr.top + 12);
  const foot = Math.round(mr.bottom - dock.getBoundingClientRect().top + 12);
  map.style.setProperty('--dm-head', head + 'px');
  box.style.setProperty('--dm-head', head + 'px');
  box.style.setProperty('--dm-foot', foot + 'px');
}
function dmEnd(k, kind) {
  return `<div class="dm-end ${kind}" aria-hidden="true"></div>`;
}

function renderMapDrawn() {
  const t = tr(), cur = nextLevel(), allDone = save.level >= LEVELS.length;
  const slots = Math.ceil(LEVELS.length / 5);
  // the map ends with the current world: the next world shows its first picture under a fog with a padlock and
  // nothing above it, until the current world is passed (testers can open the whole map: save.mapAll)
  const open = allDone || save.mapAll ? slots : Math.min(slots, (Math.floor(cur / 10) + 1) * 2);
  const count = Math.min(slots, open + 1), lockedK = open < slots ? open : -1;
  const pct = v => (v * 100).toFixed(3) + '%';
  let html = '';
  for (let k = 0; k < count; k++) {
    const { name, flip } = dmArtFor(k), A = MAPART.art[name];
    const h = Math.round(DM_W * A.aspect);
    // overlap with the picture below (--ov: this picture's margin) and above (--ovt: its fading top band), per seam
    const SM = MAPART.seams || [], seamBelow = k > 0 ? SM[(k - 1) % 20] : null, seamAbove = SM[k % 20];
    const ov = seamBelow ? seamBelow.ov : 0, ovt = seamAbove ? seamAbove.ov : Math.round(h * A.overlap);
    const patch = seamAbove && seamAbove.data && k < count - 1 && k + 1 !== lockedK
      ? `<div class="dm-patch" style="left:${(seamAbove.x / DM_W * 100).toFixed(3)}%;width:${(seamAbove.w / DM_W * 100).toFixed(3)}%;top:calc(var(--u) * ${seamAbove.y}px);height:calc(var(--u) * ${seamAbove.h}px);background-image:url(${seamAbove.data})"></div>` : '';
    const fade = k < count - 1 ? ' fade' : '';
    let inner = `<div class="dm-art dm-img-${name}${flip ? ' flip' : ''}"></div>` + patch;
    const fill = `<div class="dm-fill dm-img-${name}${flip ? ' flip' : ''}"></div>` +
      (k === 0 ? '<div class="dm-shade bottom"></div>' : '') + (k === count - 1 && lockedK < 0 ? '<div class="dm-shade top"></div>' : '');
    // the seam into the next world is darkened (a gate between worlds)
    // (each picture paints only inside itself, so both pictures at the seam carry their half of the gate)
    const gate = (k % 2 === 1 && k < count - 1 ? '<div class="dm-gate" aria-hidden="true"></div>' : '') +
      (k % 2 === 0 && k > 0 ? '<div class="dm-gate up" aria-hidden="true"></div>' : '');
    if (k === lockedK) {
      const w = k / 2;
      inner += `<div class="dm-fog"><div class="dm-fog-card"><span class="dm-fog-lock">${ICON_LOCK}</span>` +
        `<b>${t.worldShort(w + 1)} · ${worldOf(w * 10).name}</b><small>${t.worldLockedHint(w)}</small></div></div>`;
      html += `<div class="dm-slot locked" data-slot="${k}" style="--h:${h};--ov:${ov};--ovt:${ovt};--ovp:${(ovt / h * 100).toFixed(2)}%;z-index:${count - k}">${fill}<div class="dm-col">${inner}</div>${gate}</div>`;
      continue;
    }
    A.pads.forEach((p, j) => {
      const li = k * 5 + j; if (li >= LEVELS.length) return;
      const L = LEVELS[li], st = (save.best && save.best[li]) || 0;
      const state = li < cur || allDone ? 'done' : li === cur ? 'current' : 'locked';
      const boss = L.hard ? ' boss' : '';
      const fx = v => flip ? 1 - v : v;
      const [cx0, cy0, cw, ch] = p.cap, [hx, hy, hw, hh] = p.hit;
      const capL = flip ? 1 - cx0 - cw : cx0;
      const hitL = flip ? 1 - hx - hw : hx;
      // the cap copy shows the same spot of the picture (unmirrored; the element itself is mirrored when the picture is)
      const capStyle = `left:${pct(capL)};top:${pct(cy0)};width:${pct(cw)};height:${pct(ch)};` +
        `background-position:calc(var(--u) * ${(-cx0 * DM_W).toFixed(1)}px) calc(var(--u) * ${(-cy0 * h).toFixed(1)}px)`;
      const recolour = state !== 'done' || boss;
      const cap = recolour ? `<div class="dm-cap dm-img-${name} ${state}${boss}${flip ? ' flip' : ''}" style="${capStyle}"></div>` : '';
      const glow = state === 'current' ? `<div class="dm-glow${boss}" style="left:${pct(fx(p.x) - p.rx * 2)};top:${pct(p.y - p.ry * 2.6)};width:${pct(p.rx * 4)};height:${pct(p.ry * 6.4)}"></div>` : '';
      const num = `<span class="dm-num">${L.hard ? ICON_BOLT : ''}${li + 1}</span>`;
      const extra = state === 'done' ? `<span class="dm-stars">${[1, 2, 3].map(n => `<i class="${n <= st ? 'on' : ''}"></i>`).join('')}</span>`
        : state === 'locked' ? `<span class="dm-lock">${ICON_LOCK}</span>` : DM_PIN;
      const mark = `<div class="dm-mark ${state}${boss}" style="left:${pct(fx(p.x))};top:${pct(p.y)};--rx:${(p.rx * DM_W).toFixed(0)};--ry:${(p.ry * h).toFixed(0)}">${num}${extra}</div>`;
      // tap area: the whole platform, never smaller than 44 px
      const hcx = hitL + hw / 2, hcy = hy + hh / 2;
      const pad = `<button class="dm-pad ${state}${boss}" data-li="${li}" aria-label="${t.level(li + 1)}${L.hard ? ' · ' + t.bossTag : ''}"${state === 'locked' ? ' aria-disabled="true"' : ''} ` +
        `style="left:calc(${pct(hcx)} - max(22px, ${pct(hw / 2)}));width:max(44px, ${pct(hw)});top:calc(${pct(hcy)} - max(22px, ${pct(hh / 2)}));height:max(44px, ${pct(hh)})"></button>`;
      inner += glow + pad + cap + mark;
    });
    // world sign where a world begins: on the seam into it, carried by the picture below (which lies on top there);
    // world 1 has no picture below, so its sign stands at the very bottom
    const signs = [];
    if (k === 0) signs.push([0, 'bottom']);
    if (k % 2 === 1 && k + 1 < count && k + 1 !== lockedK) signs.push([(k + 1) / 2, 'top']);
    // on a seam the sign stands to the side away from the top platform below it (its pin must stay clear)
    const topX = flip ? 1 - A.pads[4].x : A.pads[4].x, side = topX > 0.5 ? 'left' : 'right';
    for (const [signW, where] of signs) {
      inner += `<div class="world-sign dm-sign ${where}${where === 'top' ? ' ' + side : ''}"><span class="world-num">${t.worldShort(signW + 1)}</span><span class="world-name">${worldOf(signW * 10).name}</span></div>`;
    }
    // lower pictures sit above upper ones: each one's faded top band lies over the picture above it
    html += `<div class="dm-slot${fade}" data-slot="${k}" style="--h:${h};--ov:${ov};--ovt:${ovt};--ovp:${(ovt / h * 100).toFixed(2)}%;z-index:${count - k}">${fill}<div class="dm-col">${inner}</div>${gate}</div>`;
  }
  html = dmEnd(0, 'foot') + html + dmEnd(count - 1, lockedK >= 0 ? 'head locked' : 'head');
  const box = $('#mapWorlds');
  box.classList.add('drawn');
  $('#map').classList.add('dm-on');
  box.innerHTML = html;
  dmUnit();
}

Object.assign(T.uk, { worldLockedHint: w => `Відкриється, коли пройдеш світ ${w}`, tMapAll: on => `Вся мапа: ${on ? 'відкрита' : 'лише пройдене'}` });
Object.assign(T.en, { worldLockedHint: w => `Opens when you finish world ${w}`, tMapAll: on => `Whole map: ${on ? 'open' : 'played so far'}` });
$('#testerTools .btns').insertAdjacentHTML('beforebegin', '<div class="btns"><button class="btn" id="tMapAll"></button></div>');
const tMapAllLabel = () => { $('#tMapAll').textContent = tr().tMapAll(!!save.mapAll); };
$('#tMapAll').addEventListener('click', () => {
  save.mapAll = !save.mapAll; persist(); tMapAllLabel();
  if (screenNow === 'map') { const sc = $('#mapScroll'), st = sc.scrollTop; renderMap(); sc.scrollTop = st; }
});
document.querySelectorAll('#mapSettings, #settingsBtn').forEach(b => b.addEventListener('click', tMapAllLabel));
tMapAllLabel();

const isDrawnMap = () => document.documentElement.dataset.style === 'b';
{
  const renderMapCode = renderMap;
  renderMap = function (...a) {
    if (isDrawnMap()) return renderMapDrawn();
    $('#mapWorlds').classList.remove('drawn', 'wide');
    $('#map').classList.remove('dm-on');
    return renderMapCode.apply(this, a);
  };
  if (window.ResizeObserver) new ResizeObserver(() => { if (isDrawnMap()) dmUnit(); }).observe($('#mapScroll'));
}
