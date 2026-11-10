import { sim } from './_load.mjs'; const { createSim, cellAt } = sim;
const sc = process.argv[2] || 'fire';
const f = (n, d = 1) => Number(n).toFixed(d);
if (sc === 'fire' || sc === 'wind' || sc === 'rain') {
  const s = createSim('meadow');
  const ev = [{ t: 1, type: 'ignite', x: 0, z: 0, r: 0.5 }];
  if (sc === 'wind') ev.push({ t: 0, type: 'wind', x: 1.5, z: 0 });
  if (sc === 'rain') ev.push({ t: 14, type: 'rain', on: true });
  s.schedule(ev);
  for (let t = 0; t <= 45; t += sc === 'rain' ? 1 : 3) {
    s.seek(t); const k = s.stats();
    console.log(`t=${t} burning=${k.burning} burnt=${k.burnt} wet=${k.wet} maxT=${f(k.maxTemp, 0)} up=${f(k.updraft, 2)}`);
  }
}
if (sc === 'lift') {
  const s = createSim('lift');
  s.schedule([{ t: 0.5, type: 'glider', on: true, x: 2.5, y: 1.5, z: 1.5 }, { t: 1, type: 'ignite', x: 0, z: 0, r: 0.5 }]);
  for (let t = 0; t <= 40; t += 1) {
    s.seek(t); const k = s.stats(), g = s.glider;
    console.log(`t=${t} burning=${k.burning} up=${f(k.updraft, 2)} cen=(${f(s.updraft.x)},${f(s.updraft.z)}) glider y=${f(g.y, 2)} vy=${f(g.vy, 2)} pos=(${f(g.x)},${f(g.z)})`);
  }
}
if (sc === 'lab') {
  const s = createSim('lab');
  s.schedule([{ t: 0.2, type: 'shock', on: true }, { t: 1, type: 'ignite', x: -1, z: 1.5, r: 0.5 }]);
  let melted = -1, wetGap = -1;
  for (let t = 0; t <= 20; t += 1 / 30) {
    s.seek(t); const k = s.stats(); const r = s.receivers[0];
    if (melted < 0 && k.iceMass < 4.0 * 0.5) melted = t;
    if (Math.abs(t * 30 % 15) < 1e-6 || r.powered && r.poweredAt > t - 1 / 30) console.log(`t=${f(t, 2)} iceMass=${f(k.iceMass, 2)} charged=${k.charged} powered=${r.powered} at=${f(r.poweredAt, 2)} burning=${k.burning}`);
    if (r.powered) { console.log('POWERED at', r.poweredAt); break; }
  }
}
