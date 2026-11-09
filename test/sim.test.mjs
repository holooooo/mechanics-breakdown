// 运行：node test/sim.test.mjs   （无依赖；失败时退出码非 0）
import { sim } from './_load.mjs';
const { createSim, cellAt, cellCenter, N, MAT, DT } = sim;

let pass = 0, fail = 0;
function test(name, fn) {
  try { const info = fn(); pass++; console.log(`  ok   ${name}${info ? '  -- ' + info : ''}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}
function assert(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }
const F = ['mat', 'temp', 'wet', 'fuel', 'burn', 'ash', 'ice', 'charge', 'steam', 'height'];
function same(a, b) {
  for (const k of F) {
    const x = new Uint8Array(a[k].buffer), y = new Uint8Array(b[k].buffer);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return `${k} differs at byte ${i}`;
  }
  const sc = (s) => JSON.stringify([s.time, s.frame, s.wind, s.raining, s.updraft, s.glider, s.receivers]);
  return sc(a) === sc(b) ? null : 'scalars differ: ' + sc(a) + ' vs ' + sc(b);
}
function extent(s, cx = 24) {   // 已着火/烧过的格子在 x 方向相对中心的范围（格）
  let lo = 99, hi = -99, n = 0;
  for (let i = 0; i < N * N; i++) if (s.ash[i] > 0.3 || s.burn[i] > 0.3) { const x = (i % N) - cx; lo = Math.min(lo, x); hi = Math.max(hi, x); n++; }
  return { lo, hi, n };
}
const fire = (extra = [], r = 0.5) => [{ t: 1, type: 'ignite', x: 0, z: 0, r }, ...extra];

console.log('sim.test.mjs');

test('cellCenter / cellAt 互逆，越界返回 -1', () => {
  for (const i of [0, 5, 24 * N + 24, N * N - 1]) assert(cellAt(cellCenter(i).x, cellCenter(i).z) === i, 'roundtrip ' + i);
  assert(cellAt(-6.01, 0) === -1 && cellAt(0, 6.01) === -1 && cellAt(5.99, 5.99) === N * N - 1, 'bounds');
  const c = cellCenter(0); assert(Math.abs(c.x + 5.875) < 1e-9 && Math.abs(c.z + 5.875) < 1e-9, 'centre of cell 0');
});

test('布局：meadow / lab / lift 材料、树、源与接收器', () => {
  const m = createSim('meadow');
  assert(m.trees.length >= 5 && m.trees.length <= 7, 'trees ' + m.trees.length);
  for (const t of m.trees) assert(m.mat[cellAt(t.x, t.z)] === MAT.WOOD || m.mat[cellAt(t.x - 0.125, t.z - 0.125)] === MAT.WOOD, 'tree on wood');
  const cnt = (s, mt) => { let n = 0; for (let i = 0; i < N * N; i++) if (s.mat[i] === mt) n++; return n; };
  assert(cnt(m, MAT.GRASS) > 800 && cnt(m, MAT.STONE) > 10 && cnt(m, MAT.SOIL) > 20 && cnt(m, MAT.WOOD) >= 20, 'meadow mix');
  const l = createSim('lab');
  assert(l.sources.length === 1 && l.sources[0].x < -4.4 && l.sources[0].x > -4.8, 'source');
  assert(l.receivers.length === 1 && l.receivers[0].x > 4.4 && l.receivers[0].x < 4.8, 'receiver');
  assert(cnt(l, MAT.WATER) > 50 && cnt(l, MAT.METAL) > 30, 'lab mats');
  assert(createSim('lift').trees.length === 0, 'lift has no trees');
  assert(m.mat[cellAt(5.0, 5.0)] === MAT.VOID, 'corner is void');
});

test('地形高度：岛内 ±0.15，水道 -0.08 左右，岛缘下沉', () => {
  const l = createSim('lab');
  let mx = -9, mn = 9;
  for (let i = 0; i < N * N; i++) {
    const c = cellCenter(i);
    if (l.mat[i] === MAT.GRASS || l.mat[i] === MAT.SOIL || l.mat[i] === MAT.METAL) {
      if (Math.hypot(c.x, c.z) < 4.6) { mx = Math.max(mx, l.height[i]); mn = Math.min(mn, l.height[i]); }
    }
  }
  assert(mx <= 0.151 && mn >= -0.151, `interior range ${mn.toFixed(3)}..${mx.toFixed(3)}`);
  const w = l.height[cellAt(-3, 0.1)]; assert(w < 0.0 && w > -0.2, 'water height ' + w);
  let rim = 9; for (let i = 0; i < N * N; i++) if (l.mat[i] === MAT.VOID) rim = Math.min(rim, l.height[i]);
  assert(rim < -0.4 && l.height[cellAt(0, -5.6)] < 0.1, 'rim drops');
  return `interior ${mn.toFixed(2)}..${mx.toFixed(2)}`;
});

test('确定性：seek(20) 新建 == seek(5)→seek(20)→seek(3)→seek(20)', () => {
  const ev = [{ t: 0, type: 'wind', x: 1, z: 0.5 }, ...fire([{ t: 8, type: 'rain', on: true }, { t: 15, type: 'rain', on: false }, { t: 2, type: 'glider', on: true, x: 1, y: 2, z: 1 }])];
  const a = createSim('meadow'); a.schedule(ev); a.seek(20);
  const b = createSim('meadow'); b.schedule(ev); b.seek(5); b.seek(20); b.seek(3); b.seek(20);
  const d = same(a, b); assert(!d, d);
  const c = createSim('meadow'); c.schedule(ev); for (let t = 0; t <= 20.0001; t += 1 / 30) c.seek(t);   // 逐帧渲染
  const d2 = same(a, c); assert(!d2, 'frame-by-frame: ' + d2);
  const e = createSim('meadow'); e.schedule(ev); e.step(20 + 1e-9);
  const d3 = same(a, e); assert(!d3, 'step(): ' + d3);
});

test('确定性（lab，含电与冰）与交互式调用可复现', () => {
  const ev = [{ t: 0.2, type: 'shock', on: true }, { t: 1, type: 'ignite', x: -1, z: 1.5, r: 0.5 }];
  const a = createSim('lab'); a.schedule(ev); a.seek(15);
  const b = createSim('lab'); b.schedule(ev); b.seek(12); b.seek(2); b.seek(15);
  const d = same(a, b); assert(!d, d);
  const c = createSim('meadow'); c.step(1); c.ignite(0, 0); c.step(6); c.setWind(1.5, 0); c.step(6);
  const snap = new Float32Array(c.temp);
  c.seek(3); c.seek(13 + 1e-9);
  assert(snap.every((v, i) => v === c.temp[i]), 'interactive events replay');
});

test('火会蔓延并在身后烧尽（前沿约 0.6–1 格/秒）', () => {
  const s = createSim('meadow'); s.schedule(fire());
  s.seek(1.5); const k0 = s.stats();
  s.seek(10); const e10 = extent(s);
  s.seek(20); const k20 = s.stats();
  assert(k20.burning > k0.burning * 4, 'spreads');
  const radius = (e10.hi - e10.lo) / 2, speed = radius / 9;
  assert(speed > 0.5 && speed < 1.1, 'front speed ' + speed.toFixed(2));
  s.seek(60); const k = s.stats();
  assert(k.burning === 0 && k.burnt > 700, `burns out: burning=${k.burning} burnt=${k.burnt}`);
  let t50 = -1; for (let t = 1; t < 60; t += 0.5) { s.seek(t); if (s.stats().burnt + s.stats().burning >= 0.5 * k.burnt) { t50 = t; break; } }
  return `front ${speed.toFixed(2)} cell/s, 50% of final burn at t=${t50}, final burnt=${k.burnt}`;
});

test('风让火沿下风向拉长', () => {
  const run = (wx) => { const s = createSim('meadow'); s.schedule([{ t: 0, type: 'wind', x: wx, z: 0 }, ...fire()]); s.seek(14); return extent(s); };
  const calm = run(0), windy = run(1.5);
  const down = windy.hi, up = -windy.lo;
  assert(down > 1.5 * (calm.hi) && down > 3 * Math.max(1, up), `calm hi=${calm.hi} | wind downwind=${down} upwind=${up}`);
  return `calm +-${calm.hi}, wind: downwind ${down} / upwind ${up} cells`;
});

test('下雨 2–3 秒内浇灭大火，并产生蒸汽', () => {
  const s = createSim('meadow'); s.schedule(fire([{ t: 14, type: 'rain', on: true }]));
  s.seek(13.9); const before = s.stats(); assert(before.burning > 80, 'big fire first: ' + before.burning);
  let out = -1, maxSteam = 0;
  for (let t = 14; t < 20; t += 1 / 30) { s.seek(t); for (let i = 0; i < N * N; i++) maxSteam = Math.max(maxSteam, s.steam[i]); if (out < 0 && s.stats().burning === 0) out = t - 14; }
  assert(out > 0.8 && out <= 3.0, 'extinguish time ' + out);
  assert(maxSteam > 0.5, 'steam ' + maxSteam);
  s.seek(30); assert(s.stats().burning === 0 && s.stats().wet > 1000, 'stays out');
  return `extinguished after ${out.toFixed(2)} s of rain (burning before: ${before.burning})`;
});

test('规则三：材料不能直接点燃材料（热量为零时邻居不会着）', () => {
  const setup = (gap) => {
    const s = createSim('blank');
    const blk = (x0, n) => { const c = []; for (let dz = 0; dz < n; dz++) for (let dx = 0; dx < n; dx++) c.push((19 + dz) * N + x0 + dx); return c; };
    const A = blk(10, 4), Bc = blk(10 + 4 + gap, 2);              // 一片 4×4 着火的树林，和隔着 gap 格土地的一棵 2×2 树
    for (const i of A) { s.mat[i] = MAT.WOOD; s.fuel[i] = 1; s.burn[i] = 1; s.temp[i] = 600; }
    for (const i of Bc) { s.mat[i] = MAT.WOOD; s.fuel[i] = 1; }
    const B = Bc[0]; s.B = Bc;
    return { s, A: A[0], B };
  };
  { const { s, B } = setup(0); s.heatOn = false; s.step(12); assert(s.B.every((i) => s.burn[i] === 0 && s.temp[i] === 20), 'adjacent wood untouched without heat'); }
  { const { s, B } = setup(0); s.step(12); assert(s.B.some((i) => s.burn[i] > 0 || s.ash[i] > 0), 'adjacent wood ignites WITH heat'); }
  { const { s, B } = setup(3); s.step(14); assert(s.B.every((i) => s.burn[i] === 0 && s.ash[i] === 0), 'wood across a 3-cell soil gap stays unlit'); }
  { const { s, A } = setup(3); s.heatOn = false; s.step(2); assert(s.burn[A] > 0.9, 'source tree itself keeps burning'); }
});

test('冰块靠近火会融化，融水让格子变湿', () => {
  const s = createSim('meadow');
  s.schedule([{ t: 0, type: 'ice', x: 1.5, z: 0, r: 0.4 }, { t: 1, type: 'ignite', x: 0, z: 0, r: 0.5 }]);
  s.seek(0.1); const k0 = s.stats(); assert(k0.iceMass > 4, 'ice placed ' + k0.iceMass);
  s.seek(25); const k = s.stats();
  assert(k.iceMass < 0.85 * k0.iceMass && k.iceMelted >= 2, `ice melts: ${k0.iceMass.toFixed(1)} -> ${k.iceMass.toFixed(1)}`);
  let wetNear = 0; for (let i = 0; i < N * N; i++) if (s.iceWas[i] && s.ice[i] < 0.05 && s.wet[i] > 0.3) wetNear++;
  assert(wetNear >= 2, 'meltwater leaves wet cells: ' + wetNear);
  return `ice ${k0.iceMass.toFixed(1)} -> ${k.iceMass.toFixed(1)}`;
});

test('化学链：火融冰 → 缺口变湿 → 接收器通电；冰在时绝不通电', () => {
  // 冰完好 + 通电：永不导通
  const a = createSim('lab'); a.schedule([{ t: 0.2, type: 'shock', on: true }]);
  for (let t = 0; t <= 40; t += 0.25) { a.seek(t); assert(!a.receivers[0].powered, 'powered with ice intact at ' + t); }
  assert(a.stats().charged > 40, 'source side is charged');
  // 有火 + 通电
  const b = createSim('lab'); b.schedule([{ t: 0.2, type: 'shock', on: true }, { t: 1, type: 'ignite', x: -1, z: 1.5, r: 0.5 }]);
  const gap = [17, 18, 19, 20].map((x) => 24 * N + x);
  let tMelt = -1, tPow = -1;
  for (let t = 0; t <= 25; t += 1 / 30) {
    b.seek(t);
    const open = gap.every((i) => b.ice[i] < 0.05 && b.wet[i] > 0.35);
    if (tMelt < 0 && open) tMelt = t;
    if (b.receivers[0].powered) { tPow = b.receivers[0].poweredAt; break; }
    assert(!(tMelt < 0 && b.receivers[0].powered), 'power before gap wet');
  }
  assert(tMelt > 0 && tPow > 0, `chain completes (melt ${tMelt}, power ${tPow})`);
  assert(tMelt - 1 >= 3 && tMelt - 1 <= 9, 'ice melts 3-9 s after ignition: ' + (tMelt - 1));
  assert(tPow >= tMelt - 1e-9 && tPow - tMelt <= 1.2, `powers within ~1 s of gap wet: ${tPow - tMelt}`);
  // 无电则不通电
  const c = createSim('lab'); c.schedule([{ t: 1, type: 'ignite', x: -1, z: 1.5, r: 0.5 }]); c.seek(25); assert(!c.receivers[0].powered, 'no shock -> no power');
  return `ice gone ${(tMelt - 1).toFixed(2)} s after ignition, receiver powered at t=${tPow.toFixed(2)} (+${(tPow - tMelt).toFixed(2)} s)`;
});

test('电荷：冰全部移除后通电，约 1 秒内接收器亮；断电后快速衰减', () => {
  const s = createSim('lab'); s.schedule([{ t: 0.5, type: 'shock', on: true }, { t: 6, type: 'shock', on: false }]);
  for (let i = 0; i < N * N; i++) { s.ice[i] = 0; if (i >= 24 * N + 17 && i <= 24 * N + 20) s.wet[i] = 1; }   // 冰化尽 + 融水
  s.seek(0.5); s.seek(2); const r = s.receivers[0];
  assert(r.powered && r.poweredAt - 0.5 < 1.0, 'powered at ' + r.poweredAt);
  const lag = r.poweredAt - 0.5;
  s.seek(8); assert(!r.powered && s.stats().charged === 0, 'decays after shock off');
  return `powered ${lag.toFixed(2)} s after shock`;
});

test('升力：上升气流随燃烧面积增长；滑翔伞盘旋上升，火灭后缓缓下降', () => {
  const s = createSim('lift');
  s.schedule([{ t: 0.5, type: 'glider', on: true, x: 2.5, y: 1.5, z: 1.5 }, ...fire()]);
  const ups = [], ys = []; let peak = 0, tPeak = 0, tStart = -1, t5 = -1;
  for (let t = 0; t <= 45; t += 0.5) {
    s.seek(t); ups.push([s.stats().burning, s.updraft.strength]); ys.push(s.glider.y);
    if (s.glider.y > peak) { peak = s.glider.y; tPeak = t; }
    if (tStart < 0 && s.glider.y > 1.6) tStart = t;
    if (t5 < 0 && s.glider.y > 5) t5 = t;
  }
  let corr = 0; for (let i = 1; i < ups.length; i++) if (ups[i][0] > 120 && ups[i][1] < 1) corr++;
  assert(corr === 0, 'strength grows with burning area');
  assert(ups.some((u) => u[0] > 250 && u[1] > 2), 'strong fire -> strong updraft');
  assert(peak >= 5 && peak <= 7.0001, 'peak ' + peak);
  assert(t5 - tStart > 3 && t5 - tStart < 12, 'rise to 5 units takes ' + (t5 - tStart) + ' s');
  s.seek(45); assert(s.stats().burning === 0 && s.glider.y < peak - 1 && s.glider.y >= 1.2 && s.glider.vy < 0 && s.glider.vy > -0.6, 'descends slowly after fire dies: y=' + s.glider.y);
  // 盘旋：水平位置绕热源转动
  s.seek(14); const p1 = { x: s.glider.x, z: s.glider.z }; s.seek(16); const p2 = { x: s.glider.x, z: s.glider.z };
  assert(Math.hypot(p2.x - p1.x, p2.z - p1.z) > 0.5, 'spirals horizontally');
  return `rise starts t=${tStart}, 5 units at t=${t5}, peak ${peak.toFixed(2)} at t=${tPeak}`;
});

test('性能：seek(60) 从零开始 < 300 ms', () => {
  const times = [];
  for (let r = 0; r < 3; r++) {
    const s = createSim('meadow'); s.schedule(fire([{ t: 20, type: 'rain', on: true }]));
    const t0 = performance.now(); s.seek(60); times.push(performance.now() - t0);
  }
  times.sort((x, y) => x - y);
  assert(times[1] < 300, 'median ' + times[1].toFixed(0) + ' ms');
  return `median ${times[1].toFixed(0)} ms (min ${times[0].toFixed(0)}, max ${times[2].toFixed(0)})`;
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
