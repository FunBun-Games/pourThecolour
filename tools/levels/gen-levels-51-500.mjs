// Генератор рівнів 51–500 (той самий солвер, що й для 15–50). Механіки:
//  • замок: одна заповнена колба заблокована, поки гравець не збере повну колбу кольору-ключа;
//  • приховані кульки: частина не-верхніх кульок показується як «?», доки не стане верхньою;
//  • кількість порожніх колб: з 30-го рівня бувають рівні з однією порожньою колбою.
// Мінімум ходів рахує BFS з повною інформацією (так «грає» суперник) і з урахуванням замка.
// Запуск: node gen-levels-51-500.mjs FROM TO > part.json   (рівні FROM..TO включно)
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


// План рівня n: глави по 50 рівнів, тиск p росте від 0 до 1; у кожному десятку боси на позиціях 5 і 10,
// після боса — легший «видих»; інші рівні — випадкове поєднання механік із наростаючою часткою.
function planFor(n) {
  const r = rng(9000 + n * 7919);
  const p = Math.min(1, Math.floor((n - 51) / 50) / 8);
  const pos = n % 10;
  if (pos === 5 || pos === 0) {                                   // бос
    const one = r() < 0.35 + 0.3 * p;
    return { nc: one ? 7 : (r() < 0.5 ? 8 : 9), ne: one ? 1 : 2, q: pos === 0 ? 1.0 : 0.95, hard: 1,
             lock: r() < 0.7 ? 1 : 0, frac: 0.45 + 0.4 * p * r() };
  }
  if (pos === 6 || pos === 1) {                                   // видих
    return { nc: r() < 0.5 ? 6 : 7, ne: 2, q: 0.5, hard: 0, lock: 0, frac: r() < 0.5 ? 0 : 0.25 };
  }
  const one = r() < 0.3 + 0.25 * p;
  const nc = one ? (r() < 0.25 * p ? 8 : (r() < 0.5 ? 6 : 7)) : 7 + (r() < 0.5 + 0.3 * p ? 1 : 0) + (r() < 0.15 + 0.3 * p ? 1 : 0);
  return { nc: Math.min(nc, 9), ne: one ? 1 : 2, q: 0.6 + 0.3 * p + 0.1 * r(), hard: 0,
           lock: r() < 0.4 + 0.2 * p ? 1 : 0, frac: r() < 0.15 ? 0 : 0.3 + 0.6 * p * r() + 0.15 * r() };
}

const [FROM, TO] = process.argv.slice(2).map(Number);
const levels = [];
for (let n = FROM; n <= TO; n++) {
  let { nc, ne, q, hard, lock: wantLock, frac } = planFor(n);
  let seed = 20270000 + n * 100000;   // wide spacing: one level's retries never reach the next level's seeds
  const cands = [];
  for (let attempt = 0; attempt < 4 && cands.length < 4; attempt++) {
    let tries = 0;
    while (cands.length < 6 && tries < (ne === 1 ? 900 : 300)) {
      tries++;
      const r = rng(seed++);
      const st = layout(nc, ne, r);
      if (!st) continue;
      const lock = wantLock ? pickLock(st, nc, r) : null;
      if (wantLock && !lock) continue;
      const res = bfs(st, lock, ne === 1 ? 400000 : 900000);
      if (!res || res.min <= 0) continue;
      cands.push({ st, lock, min: res.min, hidden: frac ? pickHidden(st, Math.min(frac, 0.9), r) : null });
    }
    if (cands.length < 4 && nc > 5) { nc--; console.error(`  L${n}: замало розв'язних — пробую ${nc} кольорів`); }
  }
  if (!cands.length) throw new Error(`L${n}: no solvable layout`);
  cands.sort((a, b) => a.min - b.min);
  const pick = cands[Math.min(cands.length - 1, Math.floor(q * cands.length))];
  levels.push({ tubes: pick.st, minMoves: pick.min, hard: !!hard, lock: pick.lock, hidden: pick.hidden });
  const nh = pick.hidden ? pick.hidden.flat().reduce((x, y) => x + y, 0) : 0;
  console.error(`L${n}${hard ? ' [бос]' : ''}: ${nc} кол., ${ne} порожн., ходів ${pick.min}${pick.lock ? ', замок' : ''}${nh ? `, прихованих ${nh}` : ''}`);
}
process.stdout.write(JSON.stringify(levels));
