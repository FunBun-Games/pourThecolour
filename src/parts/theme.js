/* ---------- Stage 3, part 2: "B night" is the game's look (7 Nov 2026) ----------
   One palette for the whole interface: every colour of the UI chrome is a --ui-* token below (tools/ui-audit.mjs checks
   that nothing else is left on screen). Game colours (--c0…), pictures and SVG icons are outside the palette.
   In the B look the old variables (--ink, --amber, --panel…) point at the tokens, so every window built on them —
   level card, tips, gifts, dead end, win, time up, ads, settings, shop — takes the same colours without its own copy.
   The other looks (current, A, B day) stay for the tester only (Settings → For testing → Style). */

document.head.insertAdjacentHTML('beforeend', `<style>
:root {
  /* outline and text */
  --ui-out: #1d2230;
  --ui-text: #ffffff;
  --ui-text-2: #c9d6f5;
  --ui-text-3: #a9b6dd;
  /* blue metal: cards, inner tiles, secondary buttons, dark wells */
  --ui-panel-a: #304c92; --ui-panel-b: #1b2c63;
  --ui-tile-a: #2a4386; --ui-tile-b: #1a2a5e;
  --ui-btn-a: #4566b8; --ui-btn-b: #2a428c;
  --ui-deep-a: #24356e; --ui-deep-b: #152150;
  --ui-muted-a: #5d6c94; --ui-muted-b: #3b4870;
  /* toy colours: buttons and boosters */
  --ui-blue-a: #4f93ff; --ui-blue-b: #2459d8;
  --ui-sky-a: #56b6ff; --ui-sky-b: #1f6fe0;
  --ui-green-a: #86e85d; --ui-green-b: #33ad38;
  --ui-gold-a: #ffd34d; --ui-gold-b: #f39a0b; --ui-gold: #ffbe55; --ui-gold-hi: #fff3a6; --ui-gold-ink: #2a1a00;
  --ui-purple-a: #bb82ff; --ui-purple-b: #7a3fe0;
  --ui-red-a: #ff6a76; --ui-red-b: #d11f35; --ui-red: #ff4052;
  --ui-good: #64d39a; --ui-good-ink: #0b2a1a;
  --ui-star-off: #3a4470;
  /* the picked tube's glow (stage 3.5) */
  --ui-glow: #6fd3ff; --ui-glow-soft: rgba(111, 211, 255, 0.55);
  /* backgrounds: lab floor, shelves, the shade at the map's ends */
  --ui-floor-a: #1d2b5c; --ui-floor-b: #0d1530;
  --ui-shelf-a: #9fb0d4; --ui-shelf-b: #56688f;
  --ui-shade-a: #13245e; --ui-shade-b: #0b1640; --ui-shade-c: #070d2a;
}
/* the old variables, in the B night look, are the tokens */
html[data-style="b"]:not([data-tone="day"]) {
  --ink: var(--ui-text); --ink-2: var(--ui-text-3);
  --amber: var(--ui-gold); --amber-ink: var(--ui-gold-ink);
  --panel: var(--ui-tile-b); --panel-edge: rgba(120, 190, 255, 0.28);
  --night: var(--ui-floor-b); --night-2: var(--ui-floor-a);
  --good: var(--ui-good); --danger: var(--ui-red);
}

/* ===== windows in the B look (both tones) ===== */
html[data-style="b"] .card h2 { color: var(--ui-text); text-shadow: 0 2px 0 rgba(29, 34, 48, 0.55); }
html[data-style="b"] .card h2.danger-title { color: var(--ui-red-a); }
/* round close buttons: blue toy tiles */
html[data-style="b"] .pre-close, html[data-style="b"] .ad-close, html[data-style="b"] #shopClose {
  display: grid; place-items: center; padding: 0; color: #fff; font-weight: 900; font-size: 1rem;
  background: linear-gradient(var(--ui-blue-a), var(--ui-blue-b)); border: 3px solid var(--ui-out); box-shadow: inset 0 2px 0 rgba(255,255,255,0.35), 0 3px 0 var(--ui-out); }
html[data-style="b"] #shopClose { border-radius: 14px; }
/* chips, tags, pack items, wallet lines */
html[data-style="b"] .chip { background: var(--ui-deep-b); border: 2px solid var(--ui-out); color: var(--ui-text); }
html[data-style="b"] .btn .tag { background: var(--ui-text); color: var(--ui-out); border: 2px solid var(--ui-out); }
html[data-style="b"] .pk { background: var(--ui-deep-b); border: 2px solid var(--ui-out); color: var(--ui-text); }
html[data-style="b"] .pk.coins { color: var(--ui-gold-a); }
html[data-style="b"] .badge { background: var(--ui-gold-a); color: var(--ui-gold-ink); }
html[data-style="b"] .badge.free { background: var(--ui-good); color: var(--ui-good-ink); }
html[data-style="b"] .badge.ad { background: var(--ui-text); color: var(--ui-out); }
/* level card: boosters' icon wells, the price tag, the tick */
html[data-style="b"] .boost-ico { background: var(--ui-deep-b); border: 2px solid var(--ui-out); }
html[data-style="b"] .boost[aria-pressed="true"] { border-color: var(--ui-gold-a); background: linear-gradient(var(--ui-tile-a), var(--ui-tile-b)); box-shadow: inset 0 0 0 2px rgba(255, 211, 77, 0.45); }
html[data-style="b"] .sale, html[data-style="b"] .boss-badge, html[data-style="b"] .ribbon { background: linear-gradient(var(--ui-red-a), var(--ui-red-b)); color: #fff; border: 2px solid var(--ui-out); }
html[data-style="b"] .ribbon.gold { background: linear-gradient(var(--ui-gold-a), var(--ui-gold-b)); color: var(--ui-gold-ink); }
html[data-style="b"] .tick { background: var(--ui-green-b); border: 2px solid var(--ui-out); }
html[data-style="b"] .tick::after { color: #fff; }
/* win: versus tiles, piggy line */
html[data-style="b"] .vs-cell.win { border-color: var(--ui-good); box-shadow: inset 0 0 0 2px rgba(100, 211, 154, 0.35); }
html[data-style="b"] .win-piggy { background: var(--ui-deep-b); border: 2px solid var(--ui-out); }
html[data-style="b"] .star { fill: var(--ui-star-off); stroke: var(--ui-out); stroke-width: 1.4; paint-order: stroke; }
html[data-style="b"] .star.on { fill: var(--ui-gold-a); }
/* tool animation (gift, dead end) and the demo ad: dark wells with a navy rim */
html[data-style="b"] .tool-anim { background: var(--ui-floor-b); border: 3px solid var(--ui-out); box-shadow: inset 0 0 0 2px rgba(120, 190, 255, 0.25); }
html[data-style="b"] .ad-screen { border: 4px solid var(--ui-out); background: repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 14px, rgba(255,255,255,0.06) 14px 28px), linear-gradient(var(--ui-panel-a), var(--ui-panel-b)); box-shadow: inset 0 0 0 2px rgba(120, 190, 255, 0.35), 0 8px 0 rgba(0,0,0,0.35); }
html[data-style="b"] .ad-screen .kind { color: var(--ui-gold-a); }
html[data-style="b"] .st-pack { border: 2px dashed var(--ui-gold-a); background: rgba(13, 21, 48, 0.35); }
/* settings: segmented switches, selects, the stats table */
html[data-style="b"] .seg { border: 3px solid var(--ui-out); background: var(--ui-deep-b); }
html[data-style="b"] .seg button { color: var(--ui-text-2); }
html[data-style="b"] .seg button[aria-pressed="true"] { background: linear-gradient(var(--ui-green-a), var(--ui-green-b)); color: #fff; text-shadow: 0 1px 0 rgba(29, 34, 48, 0.55); }
html[data-style="b"] select { background: var(--ui-deep-b); color: var(--ui-text); border: 3px solid var(--ui-out); }
html[data-style="b"] .stats-wrap { background: var(--ui-deep-b); border: 3px solid var(--ui-out); }
html[data-style="b"] th { background: var(--ui-deep-a); }
/* shop: piggy bar */
html[data-style="b"] .piggy-bar { background: var(--ui-deep-b); border: 2px solid var(--ui-out); }
html[data-style="b"] .piggy-bar i { background: linear-gradient(90deg, var(--ui-gold-b), var(--ui-gold-a)); }
html[data-style="b"] .piggy-bar b { background: var(--ui-text); }
/* toasts: white pill with a navy rim; the tab dot */
html[data-style="b"] .toast { background: var(--ui-text); color: var(--ui-out); }
html[data-style="b"] .tab .dot { background: var(--ui-red); border-color: var(--ui-out); }
/* map: the world number on signs */
html[data-style="b"] .world-num { background: linear-gradient(var(--ui-gold-a), var(--ui-gold-b)); color: var(--ui-gold-ink); }
/* focus ring */
html[data-style="b"] button:focus-visible, html[data-style="b"] select:focus-visible { outline-color: var(--ui-gold-a); }
</style>`);
