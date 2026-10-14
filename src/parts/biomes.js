/* ---------- Worlds (biomes): a new one every 10 levels ----------
   Ten worlds go from a school lab to deep space; after world 10 they repeat with a shifted hue and a numeral
   ("Bio Lab II"). Every scene is drawn in SVG here — no image files. The same picture is the map segment
   background and, dimmed, the background behind the tubes on that world's levels. */
const BIOMES = [
  { key: 'school', uk: 'Шкільна лабораторія', en: 'School Lab', a: '#1d3a2b', b: '#0d1b14', ink: '#efe2b4' },
  { key: 'chem', uk: 'Хімічна лабораторія', en: 'Chemistry Lab', a: '#123c48', b: '#07161d', ink: '#62e3d4' },
  { key: 'bio', uk: 'Біолабораторія', en: 'Bio Lab', a: '#173f24', b: '#07160c', ink: '#93f07f' },
  { key: 'cryo', uk: 'Кріолабораторія', en: 'Cryo Lab', a: '#1a375b', b: '#091426', ink: '#b2e1ff' },
  { key: 'neon', uk: 'Неонова лабораторія', en: 'Neon Lab', a: '#311354', b: '#0e051d', ink: '#ff62e2', ink2: '#4ce8ff' },
  { key: 'orbit', uk: 'Орбітальна станція', en: 'Orbital Station', a: '#102446', b: '#030813', ink: '#86beff' },
  { key: 'ship', uk: 'Зореліт', en: 'Starship', a: '#262d3e', b: '#0b0e16', ink: '#ffc261' },
  { key: 'mars', uk: 'Червона планета', en: 'Red Planet', a: '#4d1e14', b: '#150705', ink: '#ff9a6c' },
  { key: 'rings', uk: 'Планета з кільцями', en: 'Ring Planet', a: '#2e2052', b: '#0b081d', ink: '#d6b8ff' },
  { key: 'nebula', uk: 'Туманність', en: 'Nebula', a: '#24113f', b: '#03020a', ink: '#ff8ac4', ink2: '#7ddaff' }
];
const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
function worldOf(li) {
  const w = Math.floor(li / 10), def = BIOMES[w % BIOMES.length], loop = Math.floor(w / BIOMES.length);
  return { w, def, loop, hue: loop * 40, name: (save.lang === 'uk' ? def.uk : def.en) + (loop < ROMAN.length ? ROMAN[loop] : ' ' + (loop + 1)) };
}

const biomeArt = (() => {
  let uid = 0;
  const R = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const f = n => Math.round(n * 10) / 10;
  const stars = (r, W, H, n, col, maxR = 1.6) => { let s = ''; for (let k = 0; k < n; k++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(0.4 + r() * maxR)}" fill="${col}" opacity="${f(0.25 + r() * 0.6)}"/>`; return s; };
  const flask = (x, y, s) => `<path d="M${f(x - 0.12 * s)} ${f(y - s)}h${f(0.24 * s)}v${f(0.35 * s)}l${f(0.33 * s)} ${f(0.6 * s)}q0 ${f(0.05 * s)} ${f(-0.05 * s)} ${f(0.05 * s)}h${f(-0.8 * s)}q${f(-0.05 * s)} 0 ${f(-0.05 * s)} ${f(-0.05 * s)}l${f(0.33 * s)} ${f(-0.6 * s)}z"/>`;
  const roundFlask = (x, y, s) => `<circle cx="${f(x)}" cy="${f(y - 0.32 * s)}" r="${f(0.32 * s)}"/><rect x="${f(x - 0.08 * s)}" y="${f(y - s)}" width="${f(0.16 * s)}" height="${f(0.45 * s)}" rx="2"/>`;
  const tube = (x, y, s) => `<rect x="${f(x - 0.1 * s)}" y="${f(y - s)}" width="${f(0.2 * s)}" height="${f(s)}" rx="${f(0.1 * s)}"/>`;
  const hexagon = (x, y, s) => { let p = ''; for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; p += `${f(x + s * Math.cos(a))},${f(y + s * Math.sin(a))} `; } return `<polygon points="${p}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.55)}"/>`; };
  const snowflake = (x, y, s) => { let d = ''; for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k, ex = x + s * Math.cos(a), ey = y + s * Math.sin(a), mx = x + s * 0.6 * Math.cos(a), my = y + s * 0.6 * Math.sin(a);
      d += `M${f(x)} ${f(y)}L${f(ex)} ${f(ey)}M${f(mx)} ${f(my)}L${f(mx + s * 0.25 * Math.cos(a + 0.8))} ${f(my + s * 0.25 * Math.sin(a + 0.8))}M${f(mx)} ${f(my)}L${f(mx + s * 0.25 * Math.cos(a - 0.8))} ${f(my + s * 0.25 * Math.sin(a - 0.8))}`; }
    return `<path d="${d}"/>`; };
  const helix = (x, y0, len, amp) => { let a = '', b = '', rungs = ''; for (let k = 0; k <= 40; k++) { const t = k / 40, yy = y0 + t * len, ph = t * Math.PI * 4;
      a += (k ? 'L' : 'M') + f(x + amp * Math.sin(ph)) + ' ' + f(yy); b += (k ? 'L' : 'M') + f(x - amp * Math.sin(ph)) + ' ' + f(yy);
      if (k % 3 === 0) rungs += `M${f(x + amp * Math.sin(ph))} ${f(yy)}L${f(x - amp * Math.sin(ph))} ${f(yy)}`; }
    return `<path d="${a}"/><path d="${b}"/><path d="${rungs}" opacity="0.5"/>`; };

  function scene(key, ink, ink2, W, H, seed) {
    const r = R(seed * 7919 + 13), id = 'g' + (++uid);
    const line = (o, w = 2) => `fill="none" stroke="${ink}" stroke-width="${w}" opacity="${o}" stroke-linecap="round" stroke-linejoin="round"`;
    let s = '';
    switch (key) {
      case 'school': {
        // chalkboards with formulas, shelves with flasks
        for (let y = 60; y < H; y += 420) {
          const bx = 30 + r() * 60, bw = 240 + r() * 60;
          s += `<rect x="${f(bx)}" y="${f(y)}" width="${f(bw)}" height="150" rx="6" fill="#0b2318" opacity="0.55" stroke="#6b4a2c" stroke-width="7"/>`;
          const forms = ['H₂O', 'E = mc²', 'CO₂', 'a² + b² = c²', 'NaCl', 'π ≈ 3.14', 'O₂', 'pH 7'];
          for (let k = 0; k < 3; k++) s += `<text x="${f(bx + 18 + r() * (bw - 130))}" y="${f(y + 40 + k * 42)}" font-family="Manrope, sans-serif" font-size="${f(18 + r() * 8)}" fill="${ink}" opacity="0.32">${forms[Math.floor(r() * forms.length)]}</text>`;
          const sy = y + 260 + r() * 40;
          s += `<path d="M0 ${f(sy)}H${W}" stroke="#6b4a2c" stroke-width="8" opacity="0.6"/>`;
          let g = '';
          for (let x = 20 + r() * 30; x < W - 20; x += 46 + r() * 40) g += r() < 0.5 ? flask(x, sy - 4, 34 + r() * 22) : roundFlask(x, sy - 4, 34 + r() * 20);
          s += `<g fill="${ink}" opacity="0.13">${g}</g>`;
        }
        break;
      }
      case 'chem': {
        let g = '';
        for (let k = 0; k < H / 70; k++) g += hexagon(r() * W, r() * H, 14 + r() * 22);
        s += `<g ${line(0.16, 2)}>${g}</g>`;
        let fl = '';
        for (let k = 0; k < H / 160; k++) fl += r() < 0.5 ? roundFlask(r() * W, 80 + r() * H, 50 + r() * 50) : flask(r() * W, 80 + r() * H, 50 + r() * 50);
        s += `<g fill="${ink}" opacity="0.1">${fl}</g>`;
        for (let k = 0; k < H / 25; k++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(2 + r() * 6)}" ${line(0.22, 1.5)}/>`;
        break;
      }
      case 'bio': {
        for (let x = 40 + r() * 40; x < W; x += 150 + r() * 90) s += `<g ${line(0.2, 2.5)}>${helix(x, -40 + r() * 80, H + 80, 16 + r() * 10)}</g>`;
        for (let k = 0; k < H / 60; k++) { const x = r() * W, y = r() * H, rr = 10 + r() * 26;
          s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${ink}" opacity="0.06" stroke="${ink}" stroke-opacity="0.18" stroke-width="2"/><circle cx="${f(x + rr * 0.2)}" cy="${f(y - rr * 0.1)}" r="${f(rr * 0.35)}" fill="${ink}" opacity="0.14"/>`; }
        break;
      }
      case 'cryo': {
        s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink}" stop-opacity="0.12"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></linearGradient></defs>`;
        for (let x = 20 + r() * 40; x < W; x += 110 + r() * 70) { const y = 60 + r() * (H - 220);
          s += `<rect x="${f(x)}" y="${f(y)}" width="44" height="130" rx="22" fill="url(#${id})" stroke="${ink}" stroke-opacity="0.3" stroke-width="2"/><rect x="${f(x + 10)}" y="${f(y + 26)}" width="24" height="54" rx="12" fill="${ink}" opacity="0.14"/><path d="M${f(x + 6)} ${f(y + 100)}h32" stroke="${ink}" stroke-width="2" opacity="0.3"/>`; }
        for (let k = 0; k < H / 30; k++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(0.8 + r() * 1.8)}" fill="${ink}" opacity="${f(0.15 + r() * 0.35)}"/>`;
        let g = '';
        for (let k = 0; k < H / 55; k++) g += snowflake(r() * W, r() * H, 8 + r() * 20);
        s += `<g ${line(0.42, 1.8)}>${g}</g>`;
        break;
      }
      case 'neon': {
        // circuit traces + a perspective floor grid every screen
        let tr = '';
        for (let k = 0; k < H / 45; k++) { let x = Math.round(r() * 10) * 40, y = r() * H; let d = `M${x} ${f(y)}`;
          for (let j = 0; j < 3; j++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * 40 * (1 + Math.floor(r() * 2)); else y += 30 + r() * 50; d += `L${x} ${f(y)}`; }
          tr += `<path d="${d}" stroke="${k % 2 ? ink : ink2}"/><circle cx="${x}" cy="${f(y)}" r="4" fill="${k % 2 ? ink : ink2}" stroke="none"/>`; }
        s += `<g fill="none" stroke-width="2" opacity="0.28">${tr}</g>`;
        for (let y0 = 520; y0 < H + 300; y0 += 900) {
          let gr = '';
          for (let k = -8; k <= 8; k++) gr += `M200 ${y0}L${200 + k * 70} ${y0 + 320}`;
          for (let k = 0; k < 7; k++) { const yy = y0 + Math.pow(k / 6, 1.8) * 320; gr += `M-100 ${f(yy)}H500`; }
          s += `<path d="${gr}" stroke="${ink}" stroke-width="1.5" fill="none" opacity="0.22"/>`;
        }
        break;
      }
      case 'orbit': {
        s += stars(r, W, H, H / 6, '#fff');
        s += `<defs><radialGradient id="${id}" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#4f8fe0"/><stop offset="0.6" stop-color="#1d4a8a"/><stop offset="1" stop-color="#0b1d3d"/></radialGradient></defs>`;
        for (let y = 700; y < H + 400; y += 1100) s += `<circle cx="${f(-60 + r() * 80)}" cy="${y}" r="300" fill="url(#${id})" opacity="0.55"/><circle cx="${f(-60)}" cy="${y}" r="306" fill="none" stroke="${ink}" stroke-width="6" opacity="0.18"/>`;
        for (let y = 140 + r() * 100; y < H; y += 480) { const x = 180 + r() * 140;
          s += `<g fill="${ink}" opacity="0.2"><rect x="${f(x - 18)}" y="${f(y - 10)}" width="36" height="20" rx="4"/><rect x="${f(x - 4)}" y="${f(y - 34)}" width="8" height="68"/>` +
            `<rect x="${f(x - 92)}" y="${f(y - 14)}" width="68" height="28"/><rect x="${f(x + 24)}" y="${f(y - 14)}" width="68" height="28"/></g>` +
            `<path d="M${f(x - 92)} ${f(y)}h68M${f(x + 24)} ${f(y)}h68M${f(x - 58)} ${f(y - 14)}v28M${f(x + 58)} ${f(y - 14)}v28" stroke="${ink}" stroke-width="1.5" opacity="0.35"/>`; }
        break;
      }
      case 'ship': {
        let p = '';
        for (let y = 0; y < H; y += 90) for (let x = (y / 90) % 2 ? -40 : 0; x < W; x += 130) p += `<rect x="${x + 4}" y="${y + 4}" width="122" height="82" rx="10"/>`;
        s += `<g fill="none" stroke="${ink}" stroke-width="1.5" opacity="0.12">${p}</g>`;
        for (let y = 120 + r() * 80; y < H; y += 300 + r() * 120) { const x = 60 + r() * 280;
          s += `<circle cx="${f(x)}" cy="${f(y)}" r="38" fill="#02040a" opacity="0.6" stroke="${ink}" stroke-width="5" stroke-opacity="0.25"/>` + stars(r, 0, 0, 0, '#fff');
          for (let k = 0; k < 6; k++) s += `<circle cx="${f(x - 26 + r() * 52)}" cy="${f(y - 26 + r() * 52)}" r="${f(0.6 + r())}" fill="#fff" opacity="0.7"/>`; }
        for (let y = 380; y < H; y += 760) { let st = ''; for (let x = -40; x < W + 40; x += 36) st += `<path d="M${x} ${y}l18 0l-24 26l-18 0z"/>`; s += `<g fill="${ink}" opacity="0.16">${st}</g>`; }
        break;
      }
      case 'mars': {
        s += stars(r, W, H, H / 9, '#ffd9c8', 1.2);
        for (let y = 90 + r() * 60; y < H; y += 700) s += `<circle cx="${f(300 + r() * 60)}" cy="${f(y)}" r="22" fill="#ffd2a8" opacity="0.35"/><circle cx="${f(300)}" cy="${f(y)}" r="40" fill="#ffd2a8" opacity="0.06"/>`;
        for (let y = 360; y < H + 200; y += 340) {
          s += `<path d="M-10 ${y}Q${f(80 + r() * 60)} ${f(y - 60 - r() * 40)} ${f(200)} ${f(y - 10)}T410 ${f(y - 20 - r() * 40)}V${y + 340}H-10z" fill="${ink}" opacity="0.1"/>`;
          if (r() < 0.6) { const x = 60 + r() * 280; s += `<path d="M${f(x - 46)} ${y - 4}a46 40 0 0 1 92 0z" fill="none" stroke="${ink}" stroke-width="2.5" opacity="0.3"/><path d="M${f(x - 46)} ${y - 4}h92" stroke="${ink}" stroke-width="2.5" opacity="0.3"/>`; }
          for (let k = 0; k < 4; k++) s += `<ellipse cx="${f(r() * W)}" cy="${f(y + 30 + r() * 200)}" rx="${f(6 + r() * 12)}" ry="${f(4 + r() * 6)}" fill="${ink}" opacity="0.14"/>`;
        }
        break;
      }
      case 'rings': {
        s += stars(r, W, H, H / 6, '#fff');
        s += `<defs><radialGradient id="${id}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#b48cff"/><stop offset="0.7" stop-color="#4b2f8c"/><stop offset="1" stop-color="#1d1240"/></radialGradient></defs>`;
        for (let y = 260 + r() * 100; y < H + 100; y += 820) { const x = 120 + r() * 160, rr = 80 + r() * 30;
          s += `<g opacity="0.55" transform="rotate(-16 ${f(x)} ${f(y)})"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr * 1.9)}" ry="${f(rr * 0.42)}" fill="none" stroke="${ink}" stroke-width="7" opacity="0.5"/>` +
            `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#${id})"/>` +
            `<path d="M${f(x - rr * 1.9)} ${f(y)}A${f(rr * 1.9)} ${f(rr * 0.42)} 0 0 0 ${f(x + rr * 1.9)} ${f(y)}" fill="none" stroke="${ink}" stroke-width="7" opacity="0.6"/></g>`;
          s += `<circle cx="${f(r() * W)}" cy="${f(y + 260 + r() * 120)}" r="${f(10 + r() * 12)}" fill="${ink}" opacity="0.18"/>`; }
        break;
      }
      case 'nebula': {
        let defs = '';
        for (let k = 0; k < Math.ceil(H / 260); k++) {
          const gid = id + 'n' + k, col = k % 2 ? ink2 : ink;
          defs += `<radialGradient id="${gid}"><stop offset="0" stop-color="${col}" stop-opacity="0.35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
          s += `<ellipse cx="${f(r() * W)}" cy="${f(k * 260 + r() * 200)}" rx="${f(180 + r() * 120)}" ry="${f(110 + r() * 80)}" fill="url(#${gid})"/>`;
        }
        s = `<defs>${defs}</defs>` + s + stars(r, W, H, H / 4, '#fff', 1.4);
        break;
      }
    }
    return s;
  }
  return {
    // full SVG, `slice` so it covers any box; H is the drawing height in viewBox units (width is always 400)
    svg: (li, H = 860, seed = 1) => { const wd = worldOf(li), d = wd.def; return `<svg class="biome-art" viewBox="0 0 400 ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scene(d.key, d.ink, d.ink2 || d.ink, 400, H, seed + wd.w * 31)}</svg>`; },
    bg: li => { const wd = worldOf(li), d = wd.def; return `radial-gradient(120% 70% at 50% 0%, ${d.a} 0%, ${d.b} 75%) ${d.b}`; },
    mapBg: li => { const d = worldOf(li).def; return `radial-gradient(90% 45% at 50% 50%, ${d.a} 0%, ${d.b} 100%) ${d.b}`; }
  };
})();
