// prints the optimal move list (real tube indices) for given level numbers, honouring the lock
import fs from 'fs';
const CAP = 4;
const [file, ...nums] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(file, 'utf8'));
const isDone = t => t.length === CAP && t.every(c => c === t[0]);
const out = {};
for (const n of nums) {
  const lv = L[n - 1], lock = lv.lock || null;
  const open = st => !lock || st.some(t => isDone(t) && t[0] === lock.k);
  const key = st => { const r = st.map((t, i) => (lock && i === lock.t ? 'L' : '') + t.join('')); return (lock ? r[lock.t] + (open(st) ? 'o' : 'c') : '') + '#' + r.filter((_, i) => !lock || i !== lock.t).sort().join('|'); };
  const start = lv.tubes.map(t => t.slice());
  const prev = new Map([[key(start), null]]);
  let q = [start], found = null;
  while (q.length && !found) {
    const nq = [];
    for (const st of q) {
      if (st.every(t => !t.length || isDone(t))) { found = st; break; }
      const closed = !open(st);
      for (let i = 0; i < st.length; i++) for (let j = 0; j < st.length; j++) {
        if (i === j || (closed && (i === lock.t || j === lock.t))) continue;
        const a = st[i], b = st[j];
        if (!a.length || b.length >= CAP || (b.length && b[b.length - 1] !== a[a.length - 1])) continue;
        let run = 1; while (run < a.length && a[a.length - 1 - run] === a[a.length - 1]) run++;
        if (run === a.length && (a.length === CAP || !b.length)) continue;
        const nn = Math.min(run, CAP - b.length);
        const s = st.map(t => t.slice()); for (let x = 0; x < nn; x++) s[j].push(s[i].pop());
        const k = key(s); if (prev.has(k)) continue;
        prev.set(k, { pk: key(st), m: [i, j], ps: st }); nq.push(s);
      }
    }
    q = nq;
  }
  const path = []; let k = key(found);
  while (prev.get(k)) { const e = prev.get(k); path.unshift(e.m); k = e.pk; }
  out[n] = path;
  console.error(`L${n}: path ${path.length}, min ${lv.minMoves}`);
}
process.stdout.write(JSON.stringify(out));
