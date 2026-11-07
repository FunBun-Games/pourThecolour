/* ---------- Stage 3.5: game feel (7 Nov 2026) ----------
   Reference: a Water Sort screen recording from the founder (own art and sounds, same principle).
   - Liquid pour: the picked flask flies over the target and tips its lip over the target's mouth; the liquid inside keeps
     a level (horizontal) surface while the flask tilts, the tilt grows as it empties, a stream falls into the target
     and the target fills smoothly; then the flask flies home. Driven frame by frame (requestAnimationFrame).
   - Balls: they fly out over the top in an arc one by one and bounce on landing.
   - A finished tube: a gold cork drops in and screws itself tight, a gold spiral with sparks runs down the tube,
     bubbles rise inside. The last tube plays it fully before the win window.
   - Sounds (synthesised, no files): bubbling whose pitch rises as the target fills, lift / put down, a soft "no",
     the cork's pop and squeak, a short win tune with chords. Loudness: CFG.sfxVol.
   - Tutorial: level 1 — a pointing hand and "pour only onto the same colour" for the first moves, "Great!" after a move;
     level 2 — ✓ / ✗ over the tubes once one is picked. Skipped for players who already passed those levels.
   - The picked tube glows (sky blue in the B look).
   Game hooks (game.html): pour() → pourLiquid / pourBalls / celebrateTube / juiceAfterMove, setSelected → juiceSelected,
   startLevel → juiceLevelStart, fillTube → corkSync. */

Object.assign(CFG, {
  pourMs: 1050,        // one liquid pour (flight there, pouring, flight back) at normal speed, + pourMsPerLayer per layer
  pourMsPerLayer: 110,
  ballMs: 420,         // one ball's flight
  sfxVol: 1,           // sound effects loudness (0 = silent, 1 = default, up to 2)
  tutorial: 1,         // 0 = no tutorial on levels 1–2
  tutMoves: 2          // level 1: guided moves with the hand
});
Object.assign(T.uk, { tutPour: 'Наливай лише на той самий колір або в порожню пробірку', tutGood: 'Чудово!', tutCheck: 'Зелена ✓ — сюди можна, червоний ✕ — ні' });
Object.assign(T.en, { tutPour: 'Only pour onto the same colour or into an empty tube', tutGood: 'Great!', tutCheck: 'Green ✓ — you can pour here, red ✕ — you can’t' });

document.head.insertAdjacentHTML('beforeend', `<style>
/* liquid tubes no longer clip their content (a cork sits on top); the bottom layer carries the round bottom itself */
.liquid .tube { overflow: visible; }
.liquid .layer.bot { border-radius: 0 0 calc(var(--b) / 2 + 3px) calc(var(--b) / 2 + 3px); }
/* the picked tube glows */
.board .tube.sel { box-shadow: 0 0 0 3px var(--ui-glow), 0 0 22px 6px var(--ui-glow-soft); }
.board .tube.sel::before, .board.liquid .tube.sel::after { background: linear-gradient(var(--ui-text), var(--ui-glow)); }
html[data-style="b"] .board .tube.sel { box-shadow: 0 0 0 2px var(--ui-out), 0 0 0 5px var(--ui-glow), 0 0 24px 8px var(--ui-glow-soft); }
.board .tube.pouring { transition: none !important; z-index: 8; }
/* the liquid inside a tipping flask: bands with level surfaces, clipped by the glass */
.slosh { position: absolute; inset: 0; overflow: hidden; border-radius: 4px 4px calc(var(--b) / 2 + 3px) calc(var(--b) / 2 + 3px); pointer-events: none; }
.slosh-w { position: absolute; }
.slosh .band { position: absolute; left: 0; right: 0; background: linear-gradient(color-mix(in srgb, var(--c) 92%, #fff), var(--c) 40%, color-mix(in srgb, var(--c) 80%, #000)); }
.slosh .band.surf { box-shadow: inset 0 5px 0 -1px color-mix(in srgb, var(--c) 50%, #fff); }
.slosh .band.hid { background: repeating-linear-gradient(135deg, var(--hidden) 0 6px, var(--hidden-2) 6px 12px); }
.slosh::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0) 14%, rgba(255,255,255,0.45) 20%, rgba(255,255,255,0.12) 27%, rgba(255,255,255,0) 32%); }
.pour-stream { position: absolute; pointer-events: none; z-index: 5; transform: translateX(-50%); border-radius: 3px 3px 2px 2px;
  clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%);
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 80%, #000), var(--c) 30%, color-mix(in srgb, var(--c) 70%, #fff) 50%, var(--c) 70%, color-mix(in srgb, var(--c) 80%, #000)); }
.drop { position: absolute; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; pointer-events: none; z-index: 5; background: var(--c); }
/* cork on a finished tube */
.cork { position: absolute; left: 50%; top: calc(var(--b) * -0.34); width: calc(var(--b) * 0.74); height: calc(var(--b) * 0.6); transform: translateX(-50%); z-index: 3; pointer-events: none;
  border: 2px solid var(--ui-out); border-radius: 4px 4px 3px 3px;
  background: repeating-linear-gradient(160deg, rgba(255,255,255,0) 0 5px, rgba(42, 26, 0, 0.22) 5px 7px), linear-gradient(90deg, var(--ui-gold-b), var(--ui-gold-a) 32%, var(--ui-gold-hi) 50%, var(--ui-gold-a) 68%, var(--ui-gold-b));
  background-size: 100% 14px, 100% 100%; }
.cork::before { content: ""; position: absolute; left: -4px; right: -4px; top: -2px; height: 38%; border-radius: 5px; border: 2px solid var(--ui-out); background: linear-gradient(var(--ui-gold-hi), var(--ui-gold-a) 60%, var(--ui-gold-b)); }
.cork.twist { animation: corkTwist 420ms linear 1; }
@keyframes corkTwist { from { background-position: 0 0, 0 0; } to { background-position: 0 42px, 0 0; } }
.helix { position: absolute; pointer-events: none; z-index: 7; overflow: visible; }
.bubble { position: absolute; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; pointer-events: none; z-index: 2; border: 1.5px solid rgba(255,255,255,0.85); background: rgba(255,255,255,0.25); }
/* tutorial */
.tut-hand { position: absolute; z-index: 9; width: 58px; height: 58px; margin: -6px 0 0 -18px; pointer-events: none; transition: left 380ms cubic-bezier(.3,.8,.3,1), top 380ms cubic-bezier(.3,.8,.3,1); filter: drop-shadow(0 4px 4px rgba(0,0,0,0.35)); }
.tut-hand svg { width: 100%; height: 100%; animation: tutTap 1.1s ease-in-out infinite; transform-origin: 30% 10%; }
.tut-hand::before { content: ""; position: absolute; left: 4px; top: -8px; width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--ui-text); opacity: 0; animation: tutRing 1.1s ease-out infinite; }
@keyframes tutTap { 0%, 100% { transform: translateY(0) scale(1); } 45% { transform: translateY(-10px) scale(1.04); } 60% { transform: translateY(2px) scale(0.96); } }
@keyframes tutRing { 0%, 55% { opacity: 0; transform: scale(0.4); } 62% { opacity: 0.9; } 100% { opacity: 0; transform: scale(1.5); } }
.tut-mark { position: absolute; z-index: 9; width: 30px; height: 30px; margin-left: -15px; border-radius: 50%; display: grid; place-items: center; pointer-events: none;
  border: 3px solid var(--ui-out); box-shadow: 0 3px 0 var(--ui-out); animation: tutPop 260ms cubic-bezier(.2,1.4,.4,1); }
.tut-mark svg { width: 62%; height: 62%; stroke: var(--ui-text); stroke-width: 4; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.tut-mark.ok { background: linear-gradient(var(--ui-green-a), var(--ui-green-b)); }
.tut-mark.no { background: linear-gradient(var(--ui-red-a), var(--ui-red-b)); }
.tut-good { position: absolute; z-index: 9; transform: translate(-50%, -100%); pointer-events: none; padding: 6px 16px; border-radius: 16px; white-space: nowrap;
  font-family: var(--font-display); font-weight: 800; font-size: 1.15rem; color: var(--ui-text);
  background: linear-gradient(var(--ui-green-a), var(--ui-green-b)); border: 3px solid var(--ui-out); box-shadow: 0 4px 0 var(--ui-out); }
@keyframes tutPop { from { transform: scale(0.3); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .tut-hand svg, .tut-hand::before, .cork.twist { animation: none; } }
</style>`);

/* ---------- small helpers ---------- */
const jReduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const jEase = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const jClamp = (v, a, b) => Math.max(a, Math.min(b, v));
// untransformed position of an element in the stage, in screen pixels
function jHome(el) { const sr = stage.getBoundingClientRect(), o = offsetIn(el, stage); return { x: sr.left + o.x, y: sr.top + o.y, w: el.offsetWidth, h: el.offsetHeight }; }
// run a frame function for `ms` (t = 0..1); also finishes when the tab is hidden (rAF stops) or the element leaves the page
function jRun(ms, frame, alive) {
  return new Promise(res => {
    const t0 = performance.now(); let done = false;
    const end = () => { if (done) return; done = true; clearTimeout(guard); try { frame(1, true); } catch (e) { console.error(e); } res(); };
    const guard = setTimeout(end, ms + 1500);
    const step = now => {
      if (done) return;
      if (alive && !alive()) return end();
      const t = Math.min(1, (now - t0) / ms);
      try { frame(t, false); } catch (e) { console.error(e); return end(); }
      if (t < 1) requestAnimationFrame(step); else end();
    };
    requestAnimationFrame(step);
  });
}

/* ---------- geometry of liquid in a tilted flask ----------
   Flask inner box: width w, height L; local x across, y up the flask from the inner bottom. Tilted by angle a
   (clockwise > 0), the world height of a local point is h(x, y) = −x·sin a + y·cos a. The liquid of volume V
   (in "length" units: V·w = area) fills the part of the box with h ≤ s, where s solves area(s) = V·w. */
function jArea(w, L, a, s) {
  const sn = Math.sin(a), cs = Math.cos(a), h = p => -p[0] * sn + p[1] * cs;
  const poly = [[0, 0], [w, 0], [w, L], [0, L]], out = [];
  for (let k = 0; k < 4; k++) {
    const p = poly[k], q = poly[(k + 1) % 4], hp = h(p) - s, hq = h(q) - s;
    if (hp <= 0) out.push(p);
    if ((hp <= 0) !== (hq <= 0)) { const r = hp / (hp - hq); out.push([p[0] + (q[0] - p[0]) * r, p[1] + (q[1] - p[1]) * r]); }
  }
  let A = 0;
  for (let k = 0; k < out.length; k++) { const p = out[k], q = out[(k + 1) % out.length]; A += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(A) / 2;
}
function jLevel(w, L, a, V) {
  const sn = Math.sin(a), cs = Math.cos(a), hs = [[0, 0], [w, 0], [w, L], [0, L]].map(p => -p[0] * sn + p[1] * cs);
  let lo = Math.min(...hs), hi = Math.max(...hs);
  const target = jClamp(V, 0, L) * w;
  for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (jArea(w, L, a, m) < target) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// the tilt at which the surface of volume V just reaches the lip (the lowest corner of the mouth)
function jTiltFor(w, L, V, dir) {
  const lipH = a => dir > 0 ? -w * Math.sin(a) + L * Math.cos(a) : L * Math.cos(a) + 0;
  let lo = 0, hi = 2.2;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2, a = dir * m; if (jLevel(w, L, a, V) < lipH(a)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ---------- liquid pour ---------- */
async function pourLiquid(i, j, n, color, reduce, hurry = 1) {
  const ta = tubeEl(i), tb = tubeEl(j);
  if (!ta || !tb) return;
  ta.classList.remove('sel');
  const layers = [...ta.querySelectorAll('.layer')];
  const bands = layers.map(el => ({ c: el.style.getPropertyValue('--c'), hid: el.classList.contains('hid') }));
  const base = tb.querySelectorAll('.layer').length;
  const bs = ballSize(), LH = bs + 2;
  const total = (reduce ? 0 : (CFG.pourMs + CFG.pourMsPerLayer * n)) * hurry;
  if (reduce || total < 50) { sfx.fill(color, base, n, 0, 0.3); return; }
  const A = jHome(ta), B = jHome(tb), sr = stage.getBoundingClientRect();
  const cw = ta.clientWidth, ch = ta.clientHeight, bl = ta.clientLeft;
  // tip towards the target unless the tilted flask would leave the screen
  let dir = B.x > A.x ? 1 : -1;
  const reach = A.h * 0.95 + 8, mouthX = B.x + B.w / 2;
  const roomL = mouthX - sr.left, roomR = sr.right - mouthX;
  if (dir === 1 && roomL < reach) dir = roomR >= reach || roomR > roomL ? -1 : 1;
  else if (dir === -1 && roomR < reach) dir = roomL >= reach || roomL > roomR ? 1 : -1;
  // pivot = the lip (outer top corner on the pouring side); it lands a little above the target's mouth centre
  const pivX = dir > 0 ? A.w : 0;
  const lipHome = { x: A.x + pivX, y: A.y };
  const P = { x: mouthX + dir * Math.min(4, B.w * 0.06), y: B.y - Math.max(10, bs * 0.45) };
  const dx = P.x - lipHome.x, dy = P.y - lipHome.y;
  const V0 = bands.length * LH, V1 = (bands.length - n) * LH;
  // tilt: like the reference — about 70° for a full flask up to about 125° for an almost empty one (the mouth always lower
  // than the bottom), never less than the tilt at which the level surface reaches the lip
  const cap = CFG.cap * LH;
  const tiltOf = V => Math.min(2.2, Math.max(jTiltFor(cw, ch, Math.max(V, LH * 0.15), dir), (70 + 55 * (1 - jClamp(V / cap, 0, 1))) * Math.PI / 180));
  const a0 = tiltOf(V0);
  // phases
  const tFly = 0.24, tPour0 = 0.27, tPour1 = 0.76, tBack = 0.8;
  // source: hide the real layers, draw bands in a world-level wrapper
  layers.forEach(el => el.style.visibility = 'hidden');
  const slosh = document.createElement('div'); slosh.className = 'slosh';
  const D = Math.ceil(Math.hypot(cw, ch)) + 8;
  const wrap = document.createElement('div'); wrap.className = 'slosh-w';
  wrap.style.cssText = `width:${D}px;height:${D}px;left:${cw / 2 - D / 2}px;top:${ch / 2 - D / 2}px`;
  const bandEls = bands.map(b => { const e = document.createElement('div'); e.className = 'band' + (b.hid ? ' hid' : ''); e.style.setProperty('--c', b.c); wrap.appendChild(e); return e; });
  slosh.appendChild(wrap); ta.appendChild(slosh);
  ta.classList.add('pouring');
  const row = ta.parentElement; const rowZ = row.style.zIndex; row.style.zIndex = '7';
  ta.style.transformOrigin = `${pivX}px 0px`;
  // target: new layers grow from the current surface
  tb.querySelectorAll('.layer.surface').forEach(el => el.classList.remove('surface'));
  const incoming = [];
  for (let k = 0; k < n; k++) {
    const el = makeLayer(color, base + k, k === n - 1);
    el.style.transformOrigin = 'bottom'; el.style.transform = 'scaleY(0)';
    tb.appendChild(el); incoming.push(el);
  }
  // stream
  const stream = document.createElement('div'); stream.className = 'pour-stream';
  stream.style.setProperty('--c', `var(--c${color})`);
  const sw = Math.max(5, Math.round(bs * 0.16));
  stream.style.width = sw * 1.7 + 'px'; stream.style.opacity = '0';
  stage.appendChild(stream);
  const innerBottomB = B.y + tb.clientTop + tb.clientHeight;
  const drops = [];
  let lastDrop = 0;
  sfx.lift();
  sfx.fill(color, base, n, total * tPour0 / 1000, total * (tPour1 - tPour0) / 1000);
  setTimeout(() => sfx.place(), total * 0.97);
  const drawBands = (a, V) => {
    const sn = Math.sin(a), cs = Math.cos(a);
    const hc = -(cw / 2) * sn + (ch / 2) * cs;
    const hmin = Math.min(0, -cw * sn, ch * cs, -cw * sn + ch * cs);
    wrap.style.transform = `rotate(${-a}rad)`;
    let lo = hmin - 4, top = -1;
    bandEls.forEach((e, k) => {
      const cum = Math.min(V, (k + 1) * LH);
      if (cum <= k * LH + 0.3) { e.style.display = 'none'; return; }
      const hi = jLevel(cw, ch, a, cum);
      e.style.display = ''; e.style.top = (D / 2 - (hi - hc)) + 'px'; e.style.height = Math.max(0, hi - lo) + 0.6 + 'px';
      e.classList.remove('surf'); top = k; lo = hi;
    });
    if (top >= 0) bandEls[top].classList.add('surf');
  };
  const alive = () => ta.isConnected && tb.isConnected;
  await jRun(total, (t, last) => {
    if (last) return;
    let a, x, y, V = V0, q = 0;
    if (t < tFly) {           // lift and fly; start tipping on the way
      const e = jEase(t / tFly);
      x = dx * e; y = dy * e - Math.sin(e * Math.PI) * 18; a = dir * a0 * jEase(Math.min(1, t / tFly * 1.15));
    } else if (t < tBack) {   // pour: tilt grows as it empties
      x = dx; y = dy;
      q = jClamp((t - tPour0) / (tPour1 - tPour0), 0, 1);
      const qe = q < 1 ? 1 - Math.pow(1 - q, 1.6) : 1;
      V = V0 - (V0 - V1) * qe;
      a = dir * tiltOf(V);
    } else {                  // fly home and straighten, with a little overshoot ("turn back")
      const e = jEase((t - tBack) / (1 - tBack));
      V = V1; x = dx * (1 - e); y = dy * (1 - e) - Math.sin(e * Math.PI) * 10;
      const aEnd = tiltOf(V1);
      a = dir * (aEnd * (1 - e) - Math.sin(e * Math.PI) * 0.16);
    }
    ta.style.transform = `translate(${x}px, ${y}px) rotate(${a}rad)`;
    drawBands(a, V);
    // target fill
    incoming.forEach((el, k) => { el.style.transform = `scaleY(${jClamp(q * n - k, 0, 1)})`; });
    // stream: grows down at the start, the tail falls at the end
    const filled = base + q * n;
    const yBot = innerBottomB - filled * LH - sr.top;
    const yLip = P.y - sr.top + 2;
    const on = t >= tPour0 - 0.01 && t <= tPour1 + 0.05;
    if (on) {
      const head = jClamp((t - tPour0 + 0.01) / 0.05, 0, 1), tail = jClamp((t - tPour1) / 0.05, 0, 1);
      const yTop = yLip + (yBot - yLip) * tail, yEnd = yLip + (yBot - yLip) * head;
      stream.style.opacity = '1'; stream.style.left = (P.x - sr.left) + 'px'; stream.style.top = yTop + 'px';
      stream.style.height = Math.max(0, yEnd - yTop) + 'px';
      // splashes where the stream hits the surface
      const now = performance.now();
      if (head >= 1 && tail < 1 && now - lastDrop > 60 && drops.length < 14) {
        lastDrop = now;
        const d = document.createElement('i'); d.className = 'drop'; d.style.setProperty('--c', `var(--c${color})`);
        d.style.left = (P.x - sr.left) + 'px'; d.style.top = yBot + 'px';
        stage.appendChild(d); drops.push(d);
        const side = (drops.length % 2 ? 1 : -1) * (6 + Math.random() * 8);
        d.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${side}px, ${-8 - Math.random() * 8}px) scale(0.8)`, opacity: 0.9, offset: 0.5 }, { transform: `translate(${side * 1.4}px, 2px) scale(0.4)`, opacity: 0 }], { duration: 300, easing: 'ease-out' }).finished.then(() => d.remove(), () => d.remove());
      }
    } else stream.style.opacity = '0';
  }, alive);
  stream.remove(); drops.forEach(d => d.remove());
  slosh.remove();
  layers.forEach(el => el.style.visibility = '');
  incoming.forEach(el => el.style.transform = '');
  ta.classList.remove('pouring');
  ta.style.transform = ''; ta.style.transformOrigin = '';
  row.style.zIndex = rowZ;
}

/* ---------- balls: out over the top in an arc, one by one, a bounce on landing ---------- */
async function pourBalls(i, j, n, color, reduce, hurry = 1) {
  const ta = tubeEl(i), tb = tubeEl(j);
  if (!ta || !tb) return;
  const allTop = [...ta.querySelectorAll('.ball')];
  const moving = allTop.slice(-n).reverse();             // top ball first
  allTop.slice(0, allTop.length - n).forEach(el => el.classList.remove('up'));
  const base = tb.querySelectorAll('.ball').length;      // what the target shows now (earlier pours into it have landed)
  ta.classList.remove('sel');
  const bs = ballSize();
  const dur = reduce ? 1 : CFG.ballMs * hurry, step = reduce ? 0 : 0.085 * hurry;
  const befores = moving.map(el => el.getBoundingClientRect());
  moving.forEach((el, k) => { el.classList.add('moving'); el.classList.remove('up', 'hid'); el.style.setProperty('--i', base + k); tb.appendChild(el); });
  const tbTop = tb.getBoundingClientRect().top;
  const afters = moving.map(el => el.getBoundingClientRect());
  if (!reduce) sfx.lift();
  sfx.drops(color, n, dur / 1000 * 0.86, step);
  const done = moving.map((el, k) => {
    const before = befores[k], after = afters[k];
    const ddx = before.left - after.left, ddy = before.top - after.top;
    const peak = Math.min(before.top, tbTop - bs * 1.3) - after.top;
    return el.animate([
      { transform: `translate(${ddx}px, ${ddy}px)` },
      { transform: `translate(${ddx * 0.55}px, ${peak}px)`, offset: 0.4, easing: 'ease-in' },
      { transform: 'translate(0, 0) scale(1.08, 0.86)', offset: 0.8, easing: 'ease-out' },
      { transform: `translate(0, ${-bs * 0.2}px) scale(0.96, 1.05)`, offset: 0.9, easing: 'ease-in' },
      { transform: 'translate(0, 0)' }
    ], { duration: dur, delay: step * 1000 * k, easing: 'linear', fill: 'backwards' }).finished
      .then(() => el.classList.remove('moving'));
  });
  await Promise.all(done);
}

/* ---------- finished tube: cork, spiral, bubbles ---------- */
let juiceBusyUntil = 0;
function corkSync(tube, done) {
  const c = tube.querySelector('.cork');
  if (done && !c) { const k = document.createElement('div'); k.className = 'cork'; tube.appendChild(k); }
  else if (!done && c) c.remove();
}
function celebrateTube(j, color) {
  const tube = tubeEl(j); if (!tube) return;
  corkSync(tube, true);
  const cork = tube.querySelector('.cork');
  sfx.cork(color);
  if (jReduce()) return;
  juiceBusyUntil = performance.now() + 1100;
  // cork: drops from above with a bounce, then screws in
  cork.animate([
    { transform: 'translate(-50%, -64px) scale(0.9)', opacity: 0 },
    { transform: 'translate(-50%, -64px) scale(0.9)', opacity: 1, offset: 0.08 },
    { transform: 'translate(-50%, 3px) scale(1.12, 0.86)', offset: 0.55, easing: 'ease-out' },
    { transform: 'translate(-50%, -4px) scale(0.96, 1.05)', offset: 0.75, easing: 'ease-in' },
    { transform: 'translate(-50%, 0)' }
  ], { duration: 360, easing: 'cubic-bezier(.5,0,.8,.6)' }).finished.then(() => {
    cork.classList.remove('twist'); void cork.offsetWidth; cork.classList.add('twist');
    setTimeout(() => cork.classList.remove('twist'), 450);
  }, () => {});
  // gold spiral running down the tube, with sparks
  const r = jHome(tube), sr = stage.getBoundingClientRect();
  const pad = 14, W = r.w + pad * 2, H = r.h + 20;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'helix');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.left = (r.x - sr.left - pad) + 'px'; svg.style.top = (r.y - sr.top - 6) + 'px';
  const turns = 2.6, pts = [];
  for (let k = 0; k <= 80; k++) { const u = k / 80; pts.push([W / 2 + Math.sin(u * turns * Math.PI * 2) * (W / 2 - 3), 4 + u * (H - 10)]); }
  const d = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
  svg.innerHTML = `<path d="${d}" fill="none" stroke="var(--ui-gold-a)" stroke-width="6" stroke-linecap="round" style="filter: drop-shadow(0 0 4px var(--ui-gold))"/><path d="${d}" fill="none" stroke="var(--ui-gold-hi)" stroke-width="2.4" stroke-linecap="round"/>`;
  stage.appendChild(svg);
  const len = svg.querySelector('path').getTotalLength(), seg = len * 0.42;
  svg.querySelectorAll('path').forEach(p => { p.style.strokeDasharray = `${seg} ${len}`; p.animate([{ strokeDashoffset: seg }, { strokeDashoffset: -len }], { duration: 760, delay: 260, easing: 'ease-in-out', fill: 'both' }); });
  svg.animate([{ opacity: 1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 1050 }).finished.then(() => svg.remove(), () => svg.remove());
  for (let k = 0; k < 9; k++) {
    const u = (k + 0.5) / 9, p = pts[Math.round(u * 80)];
    const s = document.createElement('span'); s.className = 'spark';
    s.style.setProperty('--c', k % 3 ? 'var(--ui-gold-hi)' : `var(--c${color})`);
    s.style.left = (r.x - sr.left - pad + p[0] - 3) + 'px'; s.style.top = (r.y - sr.top - 6 + p[1] - 3) + 'px';
    stage.appendChild(s);
    const ang = Math.random() * Math.PI * 2, dist = 14 + Math.random() * 16;
    s.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.25 }, { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(0.2)`, opacity: 0 }],
      { duration: 520, delay: 260 + u * 700, easing: 'ease-out', fill: 'backwards' }).finished.then(() => s.remove(), () => s.remove());
  }
  // bubbles rising inside
  const inner = tube.clientWidth, hgt = tube.clientHeight;
  for (let k = 0; k < 7; k++) {
    const b = document.createElement('i'); b.className = 'bubble';
    b.style.left = (inner * (0.25 + 0.5 * ((k * 37) % 10) / 10)) + 'px'; b.style.bottom = (6 + (k % 3) * 6) + 'px';
    const sz = 0.6 + (k % 3) * 0.3; b.style.transform = `scale(${sz})`;
    tube.appendChild(b);
    b.animate([{ transform: `translate(0,0) scale(${sz})`, opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${(k % 2 ? 3 : -3)}px, ${-(hgt * 0.75)}px) scale(${sz})`, opacity: 0 }],
      { duration: 900 + k * 60, delay: 200 + k * 90, easing: 'ease-in', fill: 'backwards' }).finished.then(() => b.remove(), () => b.remove());
  }
}

/* ---------- sounds (synthesised) ---------- */
(() => {
  const vol = () => jClamp(+CFG.sfxVol || 0, 0, 2);
  const graph = () => (save.sound && vol() > 0) ? sfx.graph() : null;
  function osc(freq, at, dur, v, type = 'sine', to = 0, attack = 0.008) {
    const gr = graph(); if (!gr) return;
    const c = gr.ctx, t0 = c.currentTime + Math.max(0, at);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur * 0.85);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * vol()), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(gr.out); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  let noiseBuf = null;
  function noise(at, dur, v, ftype = 'bandpass', freq = 1200, q = 1) {
    const gr = graph(); if (!gr) return;
    const c = gr.ctx, t0 = c.currentTime + Math.max(0, at);
    if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * vol()), t0 + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(gr.out); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }
  const SC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
  const note = c => 392 * Math.pow(2, SC[c % SC.length] / 12);
  Object.assign(sfx, {
    // picking a tube: a soft glass knock plus the colour's note
    pick: c => { osc(260, 0, 0.08, 0.06, 'triangle', 170); osc(2400, 0, 0.05, 0.012); osc(note(c) * 2, 0.01, 0.08, 0.03, 'triangle'); },
    lift: () => { osc(240, 0, 0.07, 0.04, 'triangle', 300); },
    place: () => { osc(150, 0, 0.1, 0.07, 'sine', 90); osc(1900, 0.005, 0.05, 0.012); },
    nope: () => { osc(170, 0, 0.09, 0.06, 'square', 120); osc(125, 0.09, 0.12, 0.05, 'square', 95); },
    // bubbling while the target fills: pitch rises with the level in the target
    fill: (c, base, n, start, dur) => {
      const count = Math.max(4, Math.round(dur * 16));
      noise(start, dur + 0.05, 0.016, 'lowpass', 900, 0.7);
      for (let k = 0; k < count; k++) {
        const lvl = (base + n * (k + 0.5) / count) / CFG.cap, f0 = 210 + 560 * lvl + Math.random() * 40;
        osc(f0, start + k * dur / count + Math.random() * 0.02, 0.06, 0.05 + 0.02 * Math.random(), 'sine', f0 * 1.6, 0.004);
      }
    },
    glug: (c, n, start, dur) => sfx.fill(c, 0, n, start, dur),
    // balls landing: a click with a little ring, a step up for every ball
    drops: (c, n, firstAt, step) => { for (let k = 0; k < n; k++) { osc(note(c) * (1 + k * 0.06), firstAt + k * step, 0.18, 0.08 - k * 0.012); osc(1300, firstAt + k * step, 0.03, 0.02, 'triangle'); } },
    // cork: pop, squeak while it screws in, then a bright chime in the tube's colour
    cork: c => {
      noise(0.32, 0.05, 0.12, 'bandpass', 1500, 1.4); osc(720, 0.32, 0.09, 0.07, 'sine', 240);
      osc(1500, 0.42, 0.12, 0.015, 'triangle', 1900); osc(1700, 0.56, 0.1, 0.012, 'triangle', 2100);
      [0, 1.5, 2].forEach((m, k) => osc(note(c) * m || note(c), 0.62 + k * 0.07, 0.4, 0.06));
    },
    done: c => sfx.cork(c),
    // win: a quick arpeggio up, then I – IV – V – I with a top melody
    win: () => {
      const N = m => 440 * Math.pow(2, (m - 69) / 12);
      [72, 76, 79, 84].forEach((m, k) => osc(N(m), k * 0.07, 0.25, 0.07, 'triangle'));
      const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67, 72]], mel = [76, 77, 79, 84];
      chords.forEach((ch, k) => { const at = 0.32 + k * 0.17, d = k === 3 ? 0.9 : 0.22; ch.forEach(m => osc(N(m), at, d, 0.035, 'sine')); osc(N(mel[k]), at, d, 0.06, 'triangle'); });
      osc(N(48), 0.83, 0.9, 0.06, 'sine');
    }
  });
})();

/* ---------- tutorial ---------- */
const tut = { on: 0, li: -1, step: 0, hand: null, marks: [], good: null };
function tutClear() { if (tut.hand) tut.hand.remove(); tut.hand = null; tutMarksClear(); }
function tutMarksClear() { tut.marks.forEach(m => m.remove()); tut.marks = []; }
function tutDone(li) {
  save.tut = save.tut || {};
  if (save.tut[li + 1]) return;
  save.tut[li + 1] = 1; persist();
  track('tutorial_done', { level: li + 1, moves: S ? S.moves : 0 });
}
function juiceLevelStart(li, restore) {
  tutClear(); tut.on = 0; tut.li = li; tut.step = 0;
  if (!CFG.tutorial || li > 1) return;
  save.tut = save.tut || {};
  if (save.tut[li + 1]) return;
  if (save.level > li) { save.tut[li + 1] = 1; return; }   // already passed: no tutorial
  tut.on = li + 1;
  if (li === 0) { hint(tr().tutPour); setTimeout(tutHand, 450); }
  else hint(tr().tutCheck);
  track('tutorial_step', { level: li + 1, step: 0 });
}
// the move the hand shows: onto the same colour first, else into an empty tube; with a tube picked — from it
function tutBest(from) {
  let best = null, score = -1;
  for (let i = 0; i < S.tubes.length; i++) {
    if (from !== null && from !== undefined && i !== from) continue;
    const a = S.tubes[i]; if (!a.length || isDoneTube(a)) continue;
    for (let j = 0; j < S.tubes.length; j++) {
      if (i === j || !canPour(i, j)) continue;
      const b = S.tubes[j];
      const sc = b.length ? 3 + b.length : (topRun(a) === a.length ? 0 : 2);
      if (sc > score) { score = sc; best = [i, j]; }
    }
  }
  return best;
}
const HAND_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 6c3.3 0 6 2.7 6 6v15.5c1-.9 2.3-1.5 3.8-1.5 2.4 0 4.4 1.5 5.2 3.6 1-.7 2.2-1.1 3.5-1.1 2.6 0 4.8 1.8 5.4 4.2.9-.5 1.9-.7 2.9-.7 3.4 0 6.2 2.8 6.2 6.2v10.6C55 59 48 62 39.5 62h-4.8c-6.7 0-11.1-2.6-14.3-7.7L10 37.6c-1.6-2.6-.9-6 1.7-7.6 2.4-1.5 5.5-.9 7.2 1.3L16 28V12c0-3.3 2.7-6 6-6z" fill="#fff" stroke="var(--ui-out)" stroke-width="3.5" stroke-linejoin="round"/><path d="M28 28v9M37 31v7M46 35v5" stroke="var(--ui-out)" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
function tutHand() {
  if (!S || tut.on !== 1 || S.li !== 0) return;
  if (tut.step >= CFG.tutMoves) { if (tut.hand) { tut.hand.remove(); tut.hand = null; } return; }
  const mv = tutBest(S.sel);
  const target = mv ? (S.sel === null ? mv[0] : mv[1]) : null;
  const el = target === null ? null : tubeEl(target);
  if (!el) { if (tut.hand) tut.hand.style.opacity = '0'; return; }
  if (!tut.hand) { tut.hand = document.createElement('div'); tut.hand.className = 'tut-hand'; tut.hand.innerHTML = HAND_SVG; stage.appendChild(tut.hand); }
  const r = jHome(el), sr = stage.getBoundingClientRect();
  tut.hand.style.opacity = '1';
  tut.hand.style.left = (r.x - sr.left + r.w / 2) + 'px';
  tut.hand.style.top = (r.y - sr.top + r.h * 0.55) + 'px';
}
function tutMarks() {
  tutMarksClear();
  if (!S || tut.on !== 2 || S.li !== 1 || S.sel === null || S.won) return;
  const sr = stage.getBoundingClientRect();
  for (let j = 0; j < S.tubes.length; j++) {
    if (j === S.sel) continue;
    const el = tubeEl(j); if (!el) continue;
    const ok = canPour(S.sel, j), r = jHome(el);
    const m = document.createElement('div'); m.className = 'tut-mark ' + (ok ? 'ok' : 'no');
    m.innerHTML = ok ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
    m.style.left = (r.x - sr.left + r.w / 2) + 'px'; m.style.top = (r.y - sr.top - 44) + 'px';
    stage.appendChild(m); tut.marks.push(m);
  }
}
function tutGood(j) {
  const el = tubeEl(j); if (!el) return;
  if (tut.good) tut.good.remove();
  // over the hint line under the board (like the reference's "Well Done"), clear of the flying flask
  const sr = stage.getBoundingClientRect(), h = $('#hint'), hr = h && h.getBoundingClientRect();
  const r = jHome(el), boardBottom = Math.max(...[...board.querySelectorAll('.tube')].map(t => { const q = jHome(t); return q.y + q.h; }));
  const y = hr && hr.height ? hr.top - sr.top - 6 : boardBottom - sr.top + 56;
  const g = document.createElement('div'); g.className = 'tut-good'; g.textContent = tr().tutGood;
  g.style.left = (sr.width / 2) + 'px'; g.style.top = Math.max(r.y - sr.top, Math.min(y, boardBottom - sr.top + 60)) + 'px';
  stage.appendChild(g); tut.good = g;
  g.animate([{ transform: 'translate(-50%, -100%) scale(0.3)', opacity: 0 }, { transform: 'translate(-50%, -100%) scale(1.08)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -100%) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%, -130%) scale(1)', opacity: 0 }],
    { duration: 1400, easing: 'ease-out' }).finished.then(() => { g.remove(); if (tut.good === g) tut.good = null; }, () => g.remove());
}
function juiceSelected(i) {
  if (!S) return;
  if (tut.on === 1) tutHand();
  if (tut.on === 2) tutMarks();
}
// right after a move is counted (before its animation)
function juiceAfterMove(i, j) {
  if (!S) return;
  if (tut.on === 1 && S.li === 0) {
    tut.step++;
    track('tutorial_step', { level: 1, step: tut.step });
    if (tut.hand) { tut.hand.remove(); tut.hand = null; }
    const landed = Math.max(300, CFG.pourMs * 0.8);
    setTimeout(() => { if (S && S.li === 0) tutGood(j); }, landed);
    setTimeout(() => { if (S && S.li === 0 && tut.on === 1) tutHand(); }, landed + 300);
    if (tut.step >= CFG.tutMoves) { tut.on = 0; hint(''); tutDone(0); } else hint(tr().tutPour);
  } else if (tut.on === 2 && S.li === 1) {
    tutMarksClear();
    if (S.moves === 1) track('tutorial_step', { level: 2, step: 1 });
  }
  if (S.won && tut.on) { tutDone(S.li); tut.on = 0; tutClear(); }
}
