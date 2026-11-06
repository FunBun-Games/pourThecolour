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
#mapWorlds.drawn { display: flex; flex-direction: column-reverse; position: relative; z-index: 0; --u: 0.384; }
.dm-slot { position: relative; flex: none; width: 100%; height: calc(var(--u) * var(--h) * 1px); pointer-events: none; content-visibility: auto; contain-intrinsic-size: auto calc(var(--u) * var(--h) * 1px); }
.dm-slot + .dm-slot { margin-bottom: calc(var(--u) * var(--ov) * -1px); }
.dm-art { position: absolute; inset: 0; background-size: 100% 100%; background-repeat: no-repeat; }
.dm-art.flip, .dm-cap.flip { transform: scaleX(-1); }
/* the top band fades into the picture above (stacked under this one) */
.dm-slot.fade .dm-art { -webkit-mask-image: linear-gradient(180deg, transparent 0, rgba(0,0,0,0.08) calc(var(--ovp) * 0.18), rgba(0,0,0,0.5) calc(var(--ovp) * 0.5), rgba(0,0,0,0.92) calc(var(--ovp) * 0.82), #000 var(--ovp));
  mask-image: linear-gradient(180deg, transparent 0, rgba(0,0,0,0.08) calc(var(--ovp) * 0.18), rgba(0,0,0,0.5) calc(var(--ovp) * 0.5), rgba(0,0,0,0.92) calc(var(--ovp) * 0.82), #000 var(--ovp)); }
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
.dm-sign.bottom { bottom: calc(var(--u) * 26px); }
.dm-sign.top { bottom: auto; top: calc(var(--u) * var(--ov) * 0.5px); transform: translateY(-50%); }
.dm-sign.top { max-width: 52%; box-sizing: border-box; }
.dm-sign.top .world-name { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.dm-sign.top.left { left: 3%; right: auto; }
.dm-sign.top.right { left: auto; right: 3%; }
@media (prefers-reduced-motion: reduce) { .dm-pin, .dm-glow { animation: none; } }
</style>`);

const DM_PIN = '<svg class="dm-pin" viewBox="0 0 58 76" aria-hidden="true"><path d="M29 3C15 3 4 13.6 4 27.4 4 45 29 73 29 73s25-28 25-45.6C54 13.6 43 3 29 3z" fill="#ff4b5c" stroke="#1d2230" stroke-width="5" stroke-linejoin="round"/><path d="M15 20c2-6 7-9 12-10" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round"/><circle cx="29" cy="27" r="9" fill="#fff" stroke="#1d2230" stroke-width="4"/></svg>';

// picture k of the road (k = 0 is levels 1–5): its own picture when drawn, otherwise the ones we have, in turn,
// mirrored on every other pass so two neighbours never repeat the same view
function dmArtFor(k) {
  const w = Math.floor(k / 2), part = k % 2 ? 'b' : 'a', own = `world${w + 1}-${part}`;
  if (MAPART.art[own]) return { name: own, flip: false };
  const L = MAPART.list, name = L[k % L.length];
  return { name, flip: Math.floor(k / L.length) % 2 === 1 };
}

function dmUnit() {
  const box = $('#mapWorlds'), w = (box && box.clientWidth) || ($('#mapScroll') && $('#mapScroll').clientWidth) || 393;
  if (box) box.style.setProperty('--u', (w / DM_W).toFixed(5));
}

function renderMapDrawn() {
  const t = tr(), cur = nextLevel(), allDone = save.level >= LEVELS.length;
  const slots = Math.ceil(LEVELS.length / 5);
  const pct = v => (v * 100).toFixed(3) + '%';
  let html = '';
  for (let k = 0; k < slots; k++) {
    const { name, flip } = dmArtFor(k), A = MAPART.art[name];
    const h = Math.round(DM_W * A.aspect), ov = Math.round(h * A.overlap);
    const fade = k < slots - 1 ? ' fade' : '';
    let inner = `<div class="dm-art dm-img-${name}${flip ? ' flip' : ''}"></div>`;
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
    if (k % 2 === 1 && (k + 1) * 5 < LEVELS.length) signs.push([(k + 1) / 2, 'top']);
    // on a seam the sign stands to the side away from the top platform below it (its pin must stay clear)
    const topX = flip ? 1 - A.pads[4].x : A.pads[4].x, side = topX > 0.5 ? 'left' : 'right';
    for (const [signW, where] of signs) {
      inner += `<div class="world-sign dm-sign ${where}${where === 'top' ? ' ' + side : ''}"><span class="world-num">${t.worldShort(signW + 1)}</span><span class="world-name">${worldOf(signW * 10).name}</span></div>`;
    }
    // lower pictures sit above upper ones: each one's faded top band lies over the picture above it
    html += `<div class="dm-slot${fade}" data-slot="${k}" style="--h:${h};--ov:${ov};--ovp:${(A.overlap * 100).toFixed(2)}%;z-index:${slots - k}">${inner}</div>`;
  }
  const box = $('#mapWorlds');
  box.classList.add('drawn');
  box.innerHTML = html;
  dmUnit();
}

const isDrawnMap = () => document.documentElement.dataset.style === 'b';
{
  const renderMapCode = renderMap;
  renderMap = function (...a) {
    if (isDrawnMap()) return renderMapDrawn();
    $('#mapWorlds').classList.remove('drawn');
    return renderMapCode.apply(this, a);
  };
  if (window.ResizeObserver) new ResizeObserver(() => { if (isDrawnMap()) dmUnit(); }).observe($('#mapScroll'));
}
