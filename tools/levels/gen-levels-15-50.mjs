// Генератор рівнів 15–50 з новими механіками:
//  • замок: одна заповнена колба заблокована, поки гравець не збере повну колбу кольору-ключа;
//  • приховані кульки: частина не-верхніх кульок показується як «?», доки не стане верхньою;
//  • кількість порожніх колб: з 30-го рівня бувають рівні з однією порожньою колбою.
// Мінімум ходів рахує BFS з повною інформацією (так «грає» суперник) і з урахуванням замка.
// Запуск: node gen-v2.mjs > levels-15-50.json
const CAP = 4;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isDone = (t) => t.length === CAP && t.every((c) => c === t[0]);
const solved = (st) => st.every((t) => t.length === 0 || isDone(t));
const lockOpen = (st, lock) => !lock || st.some((t) => isDone(t) && t[0] === lock.k);

function key(st, lock) {
  if (!lock) return st.map((t) => t.join('')).sort().join('|');
  const rest = st.filter((_, i) => i !== lock.t).map((t) => t.join('')).sort().join('|');
  return st[lock.t].join('') + '#' + (lockOpen(st, lock) ? 'o' : 'c') + '#' + rest;
}

function moves(st, lock) {
  const closed = lock && !lockOpen(st, lock);
  const out = [];
  for (let i = 0; i < st.length; i++) {
    if (closed && i === lock.t) continue;
    const a = st[i];
    if (!a.length) continue;
    const top = a[a.length - 1];
    let run = 1;
    while (run < a.length && a[a.length - 1 - run] === top) run++;
    if (run === a.length && a.length === CAP) continue;
    let emptySeen = false;
    for (let j = 0; j < st.length; j++) {
      if (i === j || (closed && j === lock.t)) continue;
      const b = st[j];
      if (b.length === CAP) continue;
      if (b.length === 0) {
        if (run === a.length) continue;
        if (emptySeen) continue;
        emptySeen = true;
      } else if (b[b.length - 1] !== top) continue;
      out.push([i, j, Math.min(run, CAP - b.length)]);
    }
  }
  return out;
}

function apply(st, [i, j, n]) {
  const s = st.map((t) => t.slice());
  for (let k = 0; k < n; k++) s[j].push(s[i].pop());
  return s;
}

function bfs(start, lock, cap) {
  const seen = new Set([key(start, lock)]);
  let frontier = [start];
  let depth = 0;
  while (frontier.length) {
    const next = [];
    for (const st of frontier) {
      if (solved(st)) return { min: depth };
      for (const m of moves(st, lock)) {
        const s = apply(st, m);
        const k = key(s, lock);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(s);
        if (seen.size > cap) return null;
      }
    }
    frontier = next;
    depth++;
  }
  return { min: -1 };
}

function layout(nColors, nEmpty, r) {
  const balls = [];
  for (let c = 0; c < nColors; c++) for (let k = 0; k < CAP; k++) balls.push(c);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  const st = [];
  for (let t = 0; t < nColors; t++) st.push(balls.slice(t * CAP, t * CAP + CAP));
  for (let e = 0; e < nEmpty; e++) st.push([]);
  if (st.some((t) => t.length === CAP && t.filter((c) => c === t[0]).length >= 3)) return null;
  return st;
}

function pickLock(st, nColors, r) {
  // a filled tube; the key is a colour that is not inside it
  const filled = st.map((t, i) => i).filter((i) => st[i].length === CAP);
  const t = filled[Math.floor(r() * filled.length)];
  const keys = [];
  for (let c = 0; c < nColors; c++) if (!st[t].includes(c)) keys.push(c);
  if (!keys.length) return null;
  return { t, k: keys[Math.floor(r() * keys.length)] };
}

function pickHidden(st, frac, r) {
  return st.map((t) => t.map((_, p) => (p < t.length - 1 && r() < frac ? 1 : 0)));
}

// [кольорів, порожніх, квантиль, складний, замок, частка прихованих]
const plan = [
  [9, 2, 0.95, 1, 1, 0],   // 15 бос — перший замок
  [7, 2, 0.6, 0, 0, 0],
  [8, 2, 0.6, 0, 1, 0],
  [8, 2, 0.8, 0, 0, 0],
  [8, 2, 0.75, 0, 1, 0],
  [9, 2, 0.95, 1, 0, 0.35], // 20 бос — перші приховані
  [7, 2, 0.6, 0, 0, 0.3],
  [8, 2, 0.7, 0, 1, 0.3],
  [8, 2, 0.8, 0, 0, 0.4],
  [9, 2, 0.75, 0, 1, 0.3],
  [9, 2, 0.95, 1, 1, 0.45], // 25 бос
  [8, 2, 0.7, 0, 0, 0.5],
  [8, 2, 0.75, 0, 1, 0.4],
  [9, 2, 0.8, 0, 0, 0.5],
  [9, 2, 0.85, 0, 1, 0.5],
  [6, 1, 0.9, 1, 0, 0.3],   // 30 бос — перша «одна порожня»
  [7, 2, 0.7, 0, 1, 0.5],
  [6, 1, 0.7, 0, 0, 0.3],
  [8, 2, 0.8, 0, 1, 0.6],
  [7, 1, 0.8, 0, 0, 0.3],
  [9, 2, 0.95, 1, 1, 0.6],  // 35 бос
  [7, 1, 0.7, 0, 0, 0.4],
  [8, 2, 0.85, 0, 1, 0.6],
  [7, 1, 0.85, 0, 1, 0.3],
  [9, 2, 0.85, 0, 0, 0.7],
  [8, 1, 0.95, 1, 0, 0.4],  // 40 бос
  [7, 1, 0.75, 0, 1, 0.4],
  [9, 2, 0.85, 0, 1, 0.7],
  [8, 1, 0.8, 0, 0, 0.5],
  [9, 2, 0.9, 0, 1, 0.8],
  [8, 1, 0.95, 1, 1, 0.5],  // 45 бос
  [8, 1, 0.85, 0, 0, 0.6],
  [9, 2, 0.9, 0, 1, 0.8],
  [8, 1, 0.9, 0, 1, 0.5],
  [9, 2, 0.95, 0, 1, 0.9],
  [9, 1, 1.0, 1, 1, 0.6],   // 50 бос
];

const levels = [];
let seed = 20261212;
for (let li = 0; li < plan.length; li++) {
  let [nc, ne, q, hard, wantLock, frac] = plan[li];
  const cands = [];
  for (let attempt = 0; attempt < 3 && cands.length < 4; attempt++) {
    let tries = 0;
    while (cands.length < 8 && tries < (ne === 1 ? 900 : 300)) {
      tries++;
      const r = rng(seed++);
      const st = layout(nc, ne, r);
      if (!st) continue;
      const lock = wantLock ? pickLock(st, nc, r) : null;
      if (wantLock && !lock) continue;
      const res = bfs(st, lock, ne === 1 ? 400000 : 900000);
      if (!res || res.min <= 0) continue;
      cands.push({ st, lock, min: res.min, hidden: frac ? pickHidden(st, frac, r) : null });
    }
    if (cands.length < 4 && ne === 1) { nc--; console.error(`  L${li + 15}: замало розв'язних з 1 порожньою — пробую ${nc} кольорів`); }
  }
  cands.sort((a, b) => a.min - b.min);
  const pick = cands[Math.min(cands.length - 1, Math.floor(q * cands.length))];
  levels.push({ tubes: pick.st, minMoves: pick.min, hard: !!hard, lock: pick.lock, hidden: pick.hidden });
  const nh = pick.hidden ? pick.hidden.flat().reduce((x, y) => x + y, 0) : 0;
  console.error(`L${li + 15}${hard ? ' [бос]' : ''}: ${nc} кол., ${ne} порожн., ходів ${pick.min}${pick.lock ? `, замок на колбі ${pick.lock.t} (ключ — колір ${pick.lock.k})` : ''}${nh ? `, прихованих ${nh}` : ''}, кандидатів ${cands.length}`);
}
process.stdout.write(JSON.stringify(levels));
