// Генератор рівнів Color Sort: випадкова розкладка + солвер (BFS для мінімуму ходів, DFS як запасний варіант).
// Правило ходу = як у грі: з вершини пробірки переливається вся однокольорова серія, скільки влізе.
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

const key = (st) => st.map((t) => t.join('')).sort().join('|');
const solved = (st) => st.every((t) => t.length === 0 || (t.length === CAP && t.every((c) => c === t[0])));

function moves(st) {
  const out = [];
  for (let i = 0; i < st.length; i++) {
    const a = st[i];
    if (!a.length) continue;
    const top = a[a.length - 1];
    let run = 1;
    while (run < a.length && a[a.length - 1 - run] === top) run++;
    if (run === a.length && a.length === CAP) continue; // уже зібрана
    let emptySeen = false;
    for (let j = 0; j < st.length; j++) {
      if (i === j) continue;
      const b = st[j];
      if (b.length === CAP) continue;
      if (b.length === 0) {
        if (run === a.length) continue; // переносити цілу пробірку в порожню безглуздо
        if (emptySeen) continue; // усі порожні еквівалентні
        emptySeen = true;
      } else if (b[b.length - 1] !== top) continue;
      const n = Math.min(run, CAP - b.length);
      out.push([i, j, n]);
    }
  }
  return out;
}

function apply(st, [i, j, n]) {
  const s = st.map((t) => t.slice());
  for (let k = 0; k < n; k++) s[j].push(s[i].pop());
  return s;
}

function bfs(start, cap = 250000) {
  const seen = new Set([key(start)]);
  let frontier = [start];
  let depth = 0;
  while (frontier.length) {
    const next = [];
    for (const st of frontier) {
      if (solved(st)) return { min: depth, states: seen.size };
      for (const m of moves(st)) {
        const s = apply(st, m);
        const k = key(s);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(s);
        if (seen.size > cap) return null;
      }
    }
    frontier = next;
    depth++;
  }
  return { min: -1, states: seen.size }; // нерозв'язний
}

function dfs(start, cap = 400000) {
  const seen = new Set();
  let found = null;
  const stack = [[start, 0]];
  while (stack.length) {
    const [st, d] = stack.pop();
    const k = key(st);
    if (seen.has(k)) continue;
    seen.add(k);
    if (solved(st)) { found = d; break; }
    if (seen.size > cap) return null;
    for (const m of moves(st)) stack.push([apply(st, m), d + 1]);
  }
  return found === null ? { min: -1 } : { min: found, approx: true };
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
  // відкидаємо розкладки, де пробірка вже майже зібрана — це нецікаво
  if (st.some((t) => t.length === CAP && t.filter((c) => c === t[0]).length >= 3)) return null;
  return st;
}

// Крива складності «пилкою»: швидкий старт, складний рівень кожен 5-й, після нього — легший видих.
// [кольорів, порожніх, квантиль серед кандидатів за мін. ходами, складний?]
const plan = [
  [2, 1, 0.5, 0], [3, 2, 0.6, 0], [4, 2, 0.6, 0], [5, 2, 0.6, 0], [6, 2, 0.95, 1],
  [5, 2, 0.5, 0], [6, 2, 0.6, 0], [6, 2, 0.75, 0], [7, 2, 0.7, 0], [8, 2, 0.95, 1],
  [6, 2, 0.6, 0], [7, 2, 0.6, 0], [7, 2, 0.8, 0], [8, 2, 0.75, 0], [9, 2, 0.95, 1],
  [7, 2, 0.6, 0], [8, 2, 0.6, 0], [8, 2, 0.8, 0], [9, 2, 0.75, 0], [10, 2, 0.95, 1],
  [8, 2, 0.6, 0], [9, 2, 0.65, 0], [9, 2, 0.8, 0], [10, 2, 0.75, 0], [11, 2, 0.95, 1],
  [9, 2, 0.7, 0], [10, 2, 0.7, 0], [10, 2, 0.85, 0], [11, 2, 0.8, 0], [11, 2, 1.0, 1],
];

const levels = [];
let seed = 20261010;
for (let li = 0; li < plan.length; li++) {
  const [nc, ne, q, hard] = plan[li];
  const cands = [];
  let tries = 0;
  const want = nc >= 10 ? 8 : 12;
  while (cands.length < want && tries < 400) {
    tries++;
    const r = rng(seed++);
    const st = layout(nc, ne, r);
    if (!st) continue;
    const res = nc <= 7 ? bfs(st) : (bfs(st, 700000) || dfs(st));
    if (!res || res.min <= 0) continue;
    cands.push({ st, ...res });
  }
  cands.sort((a, b) => a.min - b.min);
  const pick = cands[Math.min(cands.length - 1, Math.floor(q * cands.length))];
  levels.push({ tubes: pick.st, minMoves: pick.min, approx: !!pick.approx, hard: !!hard });
  console.error(`L${li + 1}${hard ? ' [складний]' : ''}: ${nc} кольорів, ${ne} порожніх, ходів ${pick.min}${pick.approx ? ' (DFS)' : ''}, кандидатів ${cands.length}`);
}

process.stdout.write(JSON.stringify(levels));
