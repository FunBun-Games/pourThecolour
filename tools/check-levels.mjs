// Sanity check for levels/levels.json: colour counts, capacity, lock rules, hidden-mask shape.
// Exact solvability and minimum moves are proven by the generators (BFS); see tools/levels/.
import fs from 'fs';
const L = JSON.parse(fs.readFileSync(new URL('../levels/levels.json', import.meta.url)));
let bad = 0;
L.forEach((lv, i) => {
  const n = i + 1, count = {};
  lv.tubes.flat().forEach((c) => { count[c] = (count[c] || 0) + 1; });
  if (Object.values(count).some((v) => v !== 4)) { bad++; console.log(`L${n}: colour not in groups of 4`); }
  if (lv.tubes.some((t) => t.length > 4)) { bad++; console.log(`L${n}: overfull tube`); }
  if (!(lv.minMoves > 0)) { bad++; console.log(`L${n}: no minMoves`); }
  if (lv.lock) {
    const t = lv.tubes[lv.lock.t];
    if (!t || t.length !== 4 || t.includes(lv.lock.k)) { bad++; console.log(`L${n}: lock key inside the locked tube or tube not full`); }
  }
  if (lv.hidden) lv.hidden.forEach((h, ti) => { if (h.length !== lv.tubes[ti].length) { bad++; console.log(`L${n}: hidden mask shape`); } });
});
console.log(bad ? `${bad} problem(s)` : `${L.length} levels OK`);
process.exit(bad ? 1 : 0);
