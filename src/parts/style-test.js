/* ---------- Stage 0: style test (26 Oct 2026) ----------
   Three looks over the same game, switched at runtime (nothing else changes):
   - current: the night-glass 2D look as it is;
   - A "polish": the same look with thicker glass, gloss, coloured booster chips and 3D buttons;
   - B "toy": the founder's ChatGPT concepts (GPT-0) — chunky square buttons with a dark navy outline, glossy green CTAs,
     blue metal panels, tubes on shelves, a lab window with a planet; two tones: night (dark blue) and day (lilac lab).
   B's backdrop and the world thumbnail are crops of the concept art (placeholders: a real redesign needs one clean
   backdrop per world and a drawn map). Switch: Settings → For testing → Style, or a link anchor
   #style-current / #style-a / #style-b-night / #style-b-day. The choice is kept in save.styleTest (tester only). */

const STYLE_OPTS = ['current', 'a', 'b-night', 'b-day'];
Object.assign(T.uk, { tStyle: 'Стиль (тест)', styleNames: { current: 'Поточний', a: 'А · полірування', 'b-night': 'Б · нічний', 'b-day': 'Б · світлий' } });
Object.assign(T.en, { tStyle: 'Style (test)', styleNames: { current: 'Current', a: 'A · polish', 'b-night': 'B · night', 'b-day': 'B · day' } });

const ART_LAB = { night: '__ART:style/lab-night.webp__', day: '__ART:style/lab-day.webp__' };
const ART_WORLD = { night: '__ART:style/world-night.webp__', day: '__ART:style/world-day.webp__' };

document.head.insertAdjacentHTML('beforeend', `<style>
/* ===== A · polish: same night-glass look, more depth ===== */
html[data-style="a"] .tube { border-width: 3px; border-color: rgba(236, 240, 255, 0.42); border-top-color: transparent; filter: drop-shadow(0 8px 6px rgba(0, 0, 0, 0.35)); background: linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 35%, rgba(255,255,255,0.02) 65%, rgba(255,255,255,0.12)); }
html[data-style="a"] .tube::before { height: 8px; top: -6px; background: linear-gradient(#f4f6ff, #9aa3c8); }
html[data-style="a"] .ball { box-shadow: inset 0 -4px 6px rgba(0,0,0,0.25), 0 0 0 1.5px rgba(10, 12, 30, 0.45); }
html[data-style="a"] .layer { box-shadow: inset 0 2px 0 rgba(255,255,255,0.28); }
html[data-style="a"] .tool { box-shadow: 0 4px 0 rgba(0,0,0,0.35); border-color: rgba(236,240,255,0.22); }
html[data-style="a"] .tool svg { box-sizing: content-box; padding: 6px; border-radius: 12px; color: #fff; width: 22px; height: 22px; box-shadow: inset 0 2px 0 rgba(255,255,255,0.35), 0 2px 0 rgba(0,0,0,0.3); }
html[data-style="a"] #undoBtn svg { background: linear-gradient(#ffcf5a, #f29a12); }
html[data-style="a"] #tubeBtn svg { background: linear-gradient(#5db8ff, #2a73e0); }
html[data-style="a"] #timeBtn svg { background: linear-gradient(#b88bff, #7a45e0); }
html[data-style="a"] #restartBtn svg { background: linear-gradient(#7ade72, #33a83d); }
html[data-style="a"] .btn { box-shadow: 0 4px 0 rgba(0,0,0,0.35); }
html[data-style="a"] .btn.primary { background: linear-gradient(#ffd47a, #ffae2b); box-shadow: inset 0 2px 0 rgba(255,255,255,0.55), 0 4px 0 #a86400; }
html[data-style="a"] .btn.boss { background: linear-gradient(#ff6b79, #c81b30); box-shadow: inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 0 #7d0a18; }
html[data-style="a"] .card { border: 2px solid rgba(236,240,255,0.2); box-shadow: inset 0 2px 0 rgba(255,255,255,0.08), 0 14px 30px rgba(0,0,0,0.4); }
html[data-style="a"] .node { box-shadow: 0 6px 0 rgba(0,0,0,0.45), inset 0 3px 0 rgba(255,255,255,0.3), inset 0 -5px 0 rgba(0,0,0,0.18); }
html[data-style="a"] .icon-btn, html[data-style="a"] .coins { box-shadow: 0 3px 0 rgba(0,0,0,0.35); }

/* ===== B · toy (GPT-0 concepts) ===== */
html[data-style="b"] { --out: #1d2230; --metal-a: #3d5596; --metal-b: #22346b; --shelf-a: #9fb0d4; --shelf-b: #56688f; --floor-a: #1d2b5c; --floor-b: #0d1530; --map-a: #1b2550; --map-b: #0e1533; --grid: rgba(110, 160, 255, 0.07); }
html[data-style="b"][data-tone="day"] { --shelf-a: #e3e7f2; --shelf-b: #a3aec8; --floor-a: #8f99bd; --floor-b: #535e86; --map-a: #6f78a8; --map-b: #434b78; --grid: rgba(255, 255, 255, 0.12); }
html[data-style="b"] #bg { background: linear-gradient(180deg, transparent 0 30vh, var(--floor-a) 44vh, var(--floor-b) 100%), var(--lab) center top / auto 44vh no-repeat, var(--floor-b) !important; filter: none !important; }
html[data-style="b"] #bg .biome-art { display: none; }
html[data-style="b"] body.ingame .bg { --art-op: 1; }
/* tubes: thick glass, chrome rim, shelf under each row */
html[data-style="b"] .board .row { position: relative; z-index: 0; }
html[data-style="b"] .board .row::after { content: ""; position: absolute; z-index: -1; left: -18px; right: -18px; bottom: -14px; height: 18px; border-radius: 8px; background: linear-gradient(var(--shelf-a), var(--shelf-b)); border: 3px solid var(--out); box-shadow: 0 6px 0 rgba(0,0,0,0.3); }
html[data-style="b"] .tube { border: 3px solid rgba(225, 238, 255, 0.85); border-top: 0; background: linear-gradient(90deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 28%, rgba(255,255,255,0.03) 62%, rgba(255,255,255,0.26)); box-shadow: 0 0 0 2px rgba(29, 34, 48, 0.55); }
html[data-style="b"] .tube::before { height: 10px; top: -7px; left: -7px; right: -7px; border-radius: 6px; background: linear-gradient(#ffffff, #b4c3e2); border: 2px solid var(--out); }
html[data-style="b"] .tube.done { box-shadow: 0 0 0 2px rgba(29, 34, 48, 0.55), 0 0 26px -4px var(--good); }
html[data-style="b"] .liquid .tube::after { height: 7px; background: linear-gradient(#ffffff, #b4c3e2); }
html[data-style="b"] .ball { background: radial-gradient(circle at 34% 26%, #fff 0 9%, rgba(255,255,255,0.55) 15%, rgba(255,255,255,0) 30%), radial-gradient(circle at 50% 60%, var(--c) 0 50%, color-mix(in srgb, var(--c) 55%, #000) 100%); box-shadow: inset 0 -4px 6px rgba(0,0,0,0.25), 0 2px 3px rgba(0,0,0,0.3); }
html[data-style="b"] .layer { box-shadow: none; background:
  linear-gradient(90deg, rgba(255,255,255,0) 14%, rgba(255,255,255,0.55) 20%, rgba(255,255,255,0.15) 27%, rgba(255,255,255,0) 32%),
  linear-gradient(90deg, color-mix(in srgb, var(--c) 68%, #000) 0%, var(--c) 22%, color-mix(in srgb, var(--c) 88%, #fff) 45%, var(--c) 70%, color-mix(in srgb, var(--c) 70%, #000) 100%); }
/* hidden balls / layers keep their "?" look (the themed rules above must not reveal the colour) */
html[data-style="b"] .ball.hid { background: radial-gradient(circle at 34% 26%, rgba(255,255,255,0.45) 0 9%, rgba(255,255,255,0) 28%), radial-gradient(circle at 50% 60%, var(--hidden) 0 52%, var(--hidden-2) 100%); }
html[data-style="b"] .layer.hid { background: repeating-linear-gradient(135deg, var(--hidden) 0 6px, var(--hidden-2) 6px 12px); }
html[data-style="b"] .layer.surface::after { top: -3px; height: 7px; border-radius: 50%; opacity: 1; background: linear-gradient(90deg, color-mix(in srgb, var(--c) 75%, #000), color-mix(in srgb, var(--c) 55%, #fff) 45%, color-mix(in srgb, var(--c) 80%, #000)); }
/* HUD */
html[data-style="b"] .icon-btn { background: linear-gradient(#4f93ff, #2459d8); border: 3px solid var(--out); border-radius: 14px; color: #fff; box-shadow: inset 0 3px 0 rgba(255,255,255,0.4), 0 4px 0 var(--out); }
html[data-style="b"] .icon-btn svg { stroke-width: 2.6; }
html[data-style="b"] .coins { background: linear-gradient(#24356e, #152150); border: 3px solid var(--out); color: #fff; box-shadow: inset 0 2px 0 rgba(255,255,255,0.15), 0 3px 0 var(--out); }
html[data-style="b"] .coins .plus { border: 2px solid var(--out); background: linear-gradient(#7ee35a, #33ad38); color: #fff; }
html[data-style="b"] .level-name { justify-self: center; padding: 3px 16px; border-radius: 14px; border: 3px solid var(--out); background: linear-gradient(#26387a, #142152); box-shadow: 0 0 0 3px rgba(90, 175, 255, 0.55), 0 4px 0 var(--out); color: #fff; }
html[data-style="b"] .level-sub { justify-self: center; padding: 1px 10px; border-radius: 999px; background: rgba(14, 20, 46, 0.7); color: #dfe6ff; }
html[data-style="b"] .rival { text-shadow: 0 1px 2px rgba(0,0,0,0.6); }
html[data-style="b"] .rival { background: rgba(14, 20, 46, 0.75); border: 2px solid var(--out); }
/* boosters: chunky coloured tiles */
html[data-style="b"] .tool { border: 3px solid var(--out); border-radius: 20px; color: #fff; font-weight: 800; text-shadow: none; box-shadow: inset 0 4px 0 rgba(255,255,255,0.4), inset 0 -5px 0 rgba(0,0,0,0.18), 0 5px 0 var(--out); }
html[data-style="b"] .tool svg { width: 30px; height: 30px; stroke-width: 2.6; overflow: visible; }
html[data-style="b"] .tool svg .under { stroke: var(--out); stroke-width: 6; }
html[data-style="b"] .tool > span[data-t] { font-size: 0.82rem; font-weight: 900; letter-spacing: 0.01em; color: #fff; -webkit-text-stroke: 3.5px var(--out); paint-order: stroke fill; }
html[data-style="b"] .tool .under { display: inline; }
.tool svg .under { display: none; }
html[data-style="b"] .icon-btn.b-ico { padding: 0; }
html[data-style="b"] .icon-btn.b-ico svg { width: 32px; height: 32px; filter: none; }
html[data-style="b"] #undoBtn { background: linear-gradient(#ffd34d, #f39a0b); }
html[data-style="b"] #tubeBtn { background: linear-gradient(#56b6ff, #1f6fe0); }
html[data-style="b"] #timeBtn { background: linear-gradient(#bb82ff, #7a3fe0); }
html[data-style="b"] #restartBtn { background: linear-gradient(#77e46f, #2fa83a); }
html[data-style="b"] .badge { border: 2px solid var(--out); }
/* windows and buttons */
html[data-style="b"] .card { background: linear-gradient(#304c92, #1b2c63); border: 4px solid var(--out); box-shadow: inset 0 0 0 2px rgba(120, 190, 255, 0.35), 0 8px 0 rgba(0,0,0,0.35); }
html[data-style="b"] .card p { color: #c9d6f5; }
html[data-style="b"] .btn { background: linear-gradient(#4566b8, #2a428c); border: 3px solid var(--out); box-shadow: inset 0 3px 0 rgba(255,255,255,0.22), 0 4px 0 var(--out); color: #fff; }
html[data-style="b"] .btn.primary { background: linear-gradient(#86e85d, #33ad38); color: #fff; text-shadow: 0 2px 0 rgba(29, 34, 48, 0.5); box-shadow: inset 0 4px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.15), 0 5px 0 var(--out); }
html[data-style="b"] .btn.boss, html[data-style="b"] .btn.primary.boss { background: linear-gradient(#ff6a76, #d11f35); }
html[data-style="b"] .btn:disabled { filter: grayscale(0.6); }
html[data-style="b"] .boost, html[data-style="b"] .vs-cell, html[data-style="b"] .offer, html[data-style="b"] .coin-tile { background: linear-gradient(#2a4386, #1a2a5e); border: 3px solid var(--out); box-shadow: inset 0 2px 0 rgba(255,255,255,0.12); }
html[data-style="b"] .offer.starter { background: linear-gradient(#ffcf4a, #f59e0b); color: var(--out); }
html[data-style="b"] .offer.starter p { color: #4a3300; }
html[data-style="b"] .offer.piggy { background: linear-gradient(#3b4fa6, #1f2d6b); }
html[data-style="b"] #shop { background: linear-gradient(var(--map-a), var(--map-b)); }
/* tab bar: square tiles, Home gold */
html[data-style="b"] .tabbar { background: linear-gradient(#2c3f7c, #16224d); border-top: 3px solid var(--out); border-radius: 0; padding-inline: 6px; gap: 6px; }
html[data-style="b"] .tab { height: 58px; margin-block: 8px; border: 3px solid var(--out); border-radius: 16px; background: linear-gradient(#4f93ff, #2459d8); box-shadow: inset 0 3px 0 rgba(255,255,255,0.4), 0 4px 0 var(--out); animation: none; }
html[data-style="b"] .tab.on { height: 72px; margin-top: -8px; border: 3px solid var(--out); border-radius: 18px; background: linear-gradient(#ffd34d, #f39a0b); }
html[data-style="b"] .tab.on > svg:first-child { transform: translateY(-4px) scale(1.15); }
html[data-style="b"] .tab span { color: #fff; text-shadow: 0 2px 0 var(--out), 0 0 3px var(--out); }
html[data-style="b"] .tab.soon { background: linear-gradient(#5d6c94, #3b4870); }
/* map */
/* map, interim until the drawn scenery (GPT-3 prompts) arrives: a bright nebula, stars, glowing lab props at the edges */
html[data-style="b"] .world-bg { filter: none !important; background:
  radial-gradient(60% 30% at 18% 22%, rgba(255, 92, 210, 0.55), transparent 70%),
  radial-gradient(55% 28% at 85% 62%, rgba(80, 200, 255, 0.55), transparent 70%),
  radial-gradient(70% 35% at 40% 90%, rgba(150, 90, 255, 0.6), transparent 70%),
  radial-gradient(1.5px 1.5px at 12% 18%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 72% 8%, #fff 50%, transparent),
  radial-gradient(2px 2px at 33% 46%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 88% 38%, #fff 50%, transparent),
  radial-gradient(2px 2px at 58% 74%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 22% 66%, #fff 50%, transparent),
  radial-gradient(1.5px 1.5px at 92% 88%, #fff 50%, transparent), radial-gradient(2px 2px at 48% 14%, #cfe9ff 50%, transparent),
  linear-gradient(180deg, #3a2a8f, #23307e 45%, #1b4a9a) !important; background-size: 100% 100%, 100% 100%, 100% 100%, 100% 260px, 100% 260px, 100% 260px, 100% 260px, 100% 260px, 100% 260px, 100% 260px, 100% 260px, 100% 100% !important; }
html[data-style="b"][data-tone="day"] .world-bg { background-color: #8f7fd6 !important; }
.b-props { display: none; }
/* drawn map scenery (GPT-3): tiles down the world section; the road and the level buttons stay code on top */
html[data-style="b"] .world-bg.has-art { background: var(--map-art) center top / 100% auto repeat-y, #3b46b0 !important; }
html[data-style="b"] .world.has-art .b-props { display: none; }
html[data-style="b"] .b-props { display: block; position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible; }
html[data-style="b"] .world .road { z-index: 1; }
html[data-style="b"] .world-bg .biome-art { display: none; }
/* 3D road (B): the same path stroked in layers — ground shadow, a side wall shifted down, a navy outline,
   a light rim, a dark slate deck with a sheen down the middle, glowing dashes; the travelled part glows brighter */
.road-3d { display: none; }
html[data-style="b"] .road-3d { display: inline; }
html[data-style="b"] .road-base { display: none; }
html[data-style="b"] .road-3d path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
html[data-style="b"] .r-shadow { stroke: rgba(6, 8, 30, 0.45); stroke-width: 50; transform: translateY(18px); }
html[data-style="b"] .r-wall-o { stroke: #1d2230; stroke-width: 46; transform: translateY(12px); }
html[data-style="b"] .r-wall { stroke: #303c78; stroke-width: 40; transform: translateY(12px); }
html[data-style="b"] .r-wall-hi { stroke: #3d4b8f; stroke-width: 40; transform: translateY(6px); }
html[data-style="b"] .r-top-o { stroke: #1d2230; stroke-width: 46; }
html[data-style="b"] .r-rim { stroke: #9fb1ea; stroke-width: 40; }
html[data-style="b"] .r-deck { stroke: #4a5890; stroke-width: 31; }
html[data-style="b"] .r-sheen { stroke: #5d6db0; stroke-width: 15; }
html[data-style="b"] .r-dash { stroke: rgba(130, 225, 255, 0.55); stroke-width: 4; stroke-dasharray: 12 12; }
html[data-style="b"] .road-done { stroke: #4fe0ff; stroke-width: 5; stroke-dasharray: 12 12; opacity: 1; filter: drop-shadow(0 0 4px #29b6ff) drop-shadow(0 0 8px rgba(41, 182, 255, 0.7)); }
html[data-style="b"] .node { border: 3px solid var(--out); background: radial-gradient(circle at 50% 28%, #d4f1ff, #3fb0ff 50%, #1d6fe0); color: #fff; text-shadow: 0 2px 0 var(--out); box-shadow: inset 0 4px 0 rgba(255,255,255,0.45), inset 0 -6px 0 rgba(0,0,0,0.22), 0 0 0 4px #ffcd3c, 0 0 0 7px var(--out), 0 9px 0 4px #c27d0c, 0 9px 0 7px var(--out), 0 16px 10px 6px rgba(0,0,0,0.4); }
html[data-style="b"] .node.current { background: radial-gradient(circle at 50% 30%, #fff3b0, #ffcd3c 55%, #f0950c); color: var(--out); text-shadow: none; box-shadow: inset 0 4px 0 rgba(255,255,255,0.6), inset 0 -6px 0 rgba(0,0,0,0.15), 0 0 0 4px #fff, 0 0 0 7px var(--out), 0 9px 0 4px #d0d8ee, 0 9px 0 7px var(--out), 0 0 34px 14px rgba(255, 205, 60, 0.55); animation: none; }
html[data-style="b"] .node.locked { background: radial-gradient(circle at 50% 28%, #c2cbe2, #7f8db2 55%, #56628a); color: rgba(255,255,255,0.6); box-shadow: inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -6px 0 rgba(0,0,0,0.22), 0 0 0 3px var(--out), 0 8px 0 0 #454f73, 0 8px 0 3px var(--out), 0 14px 8px 4px rgba(0,0,0,0.35); }
html[data-style="b"] .you-pin { width: 28px; height: 28px; margin-left: -14px; top: -42px; background: radial-gradient(circle at 50% 50%, #fff 0 22%, #ff4b5c 26%); border: 3px solid var(--out); box-shadow: 2px 3px 0 rgba(0,0,0,0.3); }
html[data-style="b"] .node.boss .you-pin { top: -54px; }
html[data-style="b"] .node.boss { background: radial-gradient(circle at 50% 30%, #ffa0a8, #ef3045 55%, #a80f22); }
html[data-style="b"] .node.boss.locked { filter: saturate(0.7) brightness(0.85); }
html[data-style="b"] .node-stars i.on { background: #ffcd3c; filter: drop-shadow(0 1px 0 var(--out)); }
html[data-style="b"] .world-sign { background: linear-gradient(#304c92, #1b2c63); border: 3px solid var(--out); box-shadow: 0 4px 0 var(--out); }
html[data-style="b"] .map-dock .world-card { min-height: 70px; padding-left: 112px; background: var(--world) 8px center / 92px auto no-repeat, linear-gradient(#5a6c99, #3a4a75); border: 3px solid var(--out); box-shadow: inset 0 3px 0 rgba(255,255,255,0.25), 0 5px 0 var(--out); }
html[data-style="b"] .map-dock .bar { height: 14px; border: 2px solid var(--out); background: #1a2448; }
html[data-style="b"] .map-dock .bar > i { background: linear-gradient(#8de866, #3cb43f); }
html[data-style="b"] .toast { border: 3px solid var(--out); }
</style>`);

const B_ICONS = {
  map: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 9l7-3 10 3 7-3v18l-7 3-10-3-7 3z" fill="#7fd36b" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><path d="M11 6v18l10 3V9z" fill="#56b6ff" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><path d="M7 20c3-1 4-5 8-5s5 3 9 1" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="2 2.4" stroke-linecap="round"/><path d="M23 3.5a4.5 4.5 0 0 1 4.5 4.5c0 3.4-4.5 7.5-4.5 7.5s-4.5-4.1-4.5-7.5A4.5 4.5 0 0 1 23 3.5z" fill="#ff4b5c" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><circle cx="23" cy="8" r="1.7" fill="#fff"/></svg>`,
  gear: (() => {
    const n = 8, ro = 13, ri = 10, pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, w = Math.PI / n;
      for (const [r, da] of [[ri, -w * 0.62], [ro, -w * 0.34], [ro, w * 0.34], [ri, w * 0.62]]) pts.push([16 + r * Math.cos(a + da), 16 + r * Math.sin(a + da)]);
    }
    const d = 'M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L') + 'Z';
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${d}" fill="#fff" stroke="#1d2230" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.6" fill="#2459d8" stroke="#1d2230" stroke-width="2"/></svg>`;
  })()
};
const HUD_ICON_BTNS = [['#hudMap', 'map'], ['#settingsBtn', 'gear'], ['#mapSettings', 'gear']];
const hudIconOrig = {};
function swapHudIcons(on) {
  for (const [sel, kind] of HUD_ICON_BTNS) {
    const b = $(sel); if (!b) continue;
    if (!(sel in hudIconOrig)) hudIconOrig[sel] = b.innerHTML;
    b.innerHTML = on ? B_ICONS[kind] : hudIconOrig[sel];
    b.classList.toggle('b-ico', on);
  }
}
// booster icons: a thicker navy copy of each line under the white one, so the icon reads crisply on any colour
function underStrokeTools() {
  document.querySelectorAll('.tool svg').forEach(svg => {
    if (svg.querySelector('.under')) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'under');
    [...svg.children].forEach(c => g.appendChild(c.cloneNode(true)));
    svg.insertBefore(g, svg.firstChild);
  });
}

/* map decoration for B: road edge/dash layers and glowing lab props at the screen edges, per world section */
function propTank(x, y, c, flip) {
  const w = 74, h = 150;
  return `<g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">` +
    `<rect x="-${w / 2}" y="-${h}" width="${w}" height="${h}" rx="12" fill="rgba(160,220,255,0.18)" stroke="#1d2230" stroke-width="3"/>` +
    `<rect x="-${w / 2 - 6}" y="-${h * 0.62}" width="${w - 12}" height="${h * 0.62 - 6}" rx="8" fill="${c}" opacity="0.85"/>` +
    `<circle cx="-12" cy="-${h * 0.35}" r="9" fill="#fff" opacity="0.55"/><circle cx="10" cy="-${h * 0.5}" r="6" fill="#fff" opacity="0.45"/><circle cx="4" cy="-${h * 0.2}" r="11" fill="${c}" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>` +
    `<rect x="-${w / 2 + 6}" y="-${h + 14}" width="${w + 12}" height="18" rx="6" fill="#b9c6e2" stroke="#1d2230" stroke-width="3"/>` +
    `<rect x="-${w / 2 + 6}" y="-6" width="${w + 12}" height="20" rx="6" fill="#8a97b8" stroke="#1d2230" stroke-width="3"/>` +
    `<ellipse cx="0" cy="-${h / 2}" rx="${w}" ry="${h * 0.7}" fill="${c}" opacity="0.18"/></g>`;
}
function propPlanet(x, y, r, c, ring) {
  return `<g transform="translate(${x} ${y})" opacity="0.9"><circle r="${r * 1.5}" fill="${c}" opacity="0.15"/><circle r="${r}" fill="${c}" stroke="#1d2230" stroke-width="3"/>` +
    `<path d="M${-r * 0.6} ${-r * 0.2}a${r * 0.7} ${r * 0.5} 0 0 1 ${r * 1.1} -${r * 0.4}" stroke="#fff" stroke-opacity="0.45" stroke-width="${r * 0.18}" fill="none" stroke-linecap="round"/>` +
    (ring ? `<ellipse rx="${r * 1.7}" ry="${r * 0.42}" fill="none" stroke="#ffd37a" stroke-width="${r * 0.14}" transform="rotate(-18)"/>` : '') + `</g>`;
}
const PROP_COLORS = ['#ff5fd2', '#36d1ff', '#7cff6b', '#ffb43a', '#b07cff'];
// one picture per world when we have it; until all 10 exist, world 1's picture stands in for the rest (preview)
const MAP_ART = ['__ART:map/world1.webp__'];
function decorateMapB() {
  document.querySelectorAll('#mapWorlds .world').forEach((w, k) => {
    const road = w.querySelector('.road');
    if (road && !road.querySelector('.road-3d')) {
      const base = road.querySelector('.road-base'), d = base.getAttribute('d');
      const layers = ['r-shadow', 'r-wall-o', 'r-wall', 'r-wall-hi', 'r-top-o', 'r-rim', 'r-deck', 'r-sheen', 'r-dash']
        .map(c => `<path class="${c}" d="${d}" vector-effect="non-scaling-stroke"/>`).join('');
      base.insertAdjacentHTML('beforebegin', `<g class="road-3d">${layers}</g>`);
    }
    const art = MAP_ART[k] || MAP_ART[0];
    if (art && !w.classList.contains('has-art')) {
      w.classList.add('has-art');
      const bg = w.querySelector('.world-bg'); bg.classList.add('has-art'); bg.style.setProperty('--map-art', `url(${art})`);
    }
    if (w.querySelector('.b-props')) return;
    const H = w.offsetHeight || 1000, W = 400, items = [];
    for (let y = 200, j = 0; y < H; y += 230, j++) {
      const left = (j + k) % 2 === 0, c = PROP_COLORS[(j + k * 2) % PROP_COLORS.length];
      items.push(propTank(left ? 4 : W - 4, y, c, !left));
      if (j % 2 === 1) items.push(propPlanet(left ? W - 70 : 70, y - 120, 22 + (j % 3) * 6, PROP_COLORS[(j + 3) % PROP_COLORS.length], j % 4 === 1));
    }
    w.querySelector('.world-bg').insertAdjacentHTML('afterend', `<svg class="b-props" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${items.join('')}</svg>`);
  });
}
if (typeof renderMap === 'function') {
  const renderMapPlain = renderMap;
  renderMap = function (...a) { const r = renderMapPlain.apply(this, a); decorateMapB(); return r; };
}

function applyStyleTest(v) {
  if (!STYLE_OPTS.includes(v)) v = 'current';
  const [look, tone] = v.split('-');
  const root = document.documentElement;
  if (look === 'current') delete root.dataset.style; else root.dataset.style = look;
  if (tone) root.dataset.tone = tone; else delete root.dataset.tone;
  if (look === 'b') {
    root.style.setProperty('--lab', `url(${ART_LAB[tone]})`);
    root.style.setProperty('--world', `url(${ART_WORLD[tone]})`);
  }
  swapHudIcons(look === 'b');
  underStrokeTools();
  const sel = $('#styleSel'); if (sel) sel.value = v;
}
function setStyleTest(v, how) {
  save.styleTest = v; persist();
  applyStyleTest(v);
  track('style_test', { style: v, how: how || 'settings' });
  if (S) { const sel = S.sel; render(); sizeBoard(); if (sel !== null && sel !== undefined) setSelected(sel); }
}

$('#testerTools .setting').insertAdjacentHTML('beforebegin', `<div class="setting"><label for="styleSel" data-t="tStyle">Style (test)</label><select id="styleSel"></select></div>`);
function renderStyleSel() {
  const t = tr(), sel = $('#styleSel');
  sel.innerHTML = STYLE_OPTS.map(k => `<option value="${k}">${t.styleNames[k]}</option>`).join('');
  sel.value = save.styleTest || 'current';
}
$('#styleSel').addEventListener('change', e => setStyleTest(e.target.value, 'settings'));
$('#settingsBtn').addEventListener('click', renderStyleSel);
document.querySelectorAll('#mapSettings, #settingsBtn').forEach(b => b.addEventListener('click', renderStyleSel));

// a link anchor picks the style: …#style-b-night (so each look can be sent as its own link)
function styleFromHash() {
  const m = /^#style-(current|a|b-night|b-day)$/.exec(location.hash || '');
  if (m) { setStyleTest(m[1], 'link'); return true; }
  return false;
}
window.addEventListener('hashchange', styleFromHash);
if (!styleFromHash()) applyStyleTest(save.styleTest || 'current');
