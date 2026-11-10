// 塞尔达式"化学引擎"教学原型：48×48 网格上的确定性模拟（原创实现，非任天堂代码）
// 纯 JS，无依赖，Node / 浏览器通用。画面只读数据，不参与计算。
// 确定性：不用 Math.random / Date；tick 内只用 + - * / sqrt（IEEE 精确舍入）。

export const N = 48;          // 网格 N×N
export const CELL = 0.25;     // 每格的世界尺寸；地图覆盖 x,z ∈ [-6, 6]
export const DT = 1 / 60;     // 固定步长
export const MAT = { VOID: 0, GRASS: 1, SOIL: 2, STONE: 3, WOOD: 4, METAL: 5, WATER: 6 };

const NC = N * N;
const AMBIENT = 20;           // 环境温度
const IGNITE = 150;           // 着火温度
const TEMP_CAP = 900;

// ---- 可调常量（按"秒"计）----
const SPREAD = 0.2;          // 邻居间热传导系数
const COOL = 0.5;             // 向环境散热
const WET_COOL = 3;           // 湿格额外散热
const RAIN_COOL = 4;          // 下雨额外散热
const WIND_PUSH = 0.35;        // 风对下风向传热的加成
const RAIN_WET = 0.45;         // 雨水抬湿速度
const DRY = 0.012;            // 自然晾干
const EVAP = 0.0012;          // 蒸发速度 / 每度
const LATENT = 20;           // 蒸发 / 融化带走的热量
const MELT_T = 30;            // 高于此温度冰开始融化
const MELT_K = 0.004;         // 融冰速度 / 每度
const HOP = 0.975;            // 电荷每走一格的衰减
const UP_K = 0.01;            // 每个燃烧格贡献的上升气流
const BURN_RATE = [0, 0.19, 0, 0, 0.07, 0, 0]; // 按材料：每秒消耗的燃料（木头烧得慢）

// ---- 邻居表：前 4 个是上下左右，后 4 个是对角 ----
const OFF_X = [-1, 1, 0, 0, -1, 1, -1, 1];
const OFF_Z = [0, 0, -1, 1, -1, -1, 1, 1];
const W8 = [1, 1, 1, 1, 0.6, 0.6, 0.6, 0.6];
const DIR_X = [], DIR_Z = [];   // 热量"从邻居流向本格"的单位方向
for (let k = 0; k < 8; k++) {
  const l = Math.sqrt(OFF_X[k] * OFF_X[k] + OFF_Z[k] * OFF_Z[k]);
  DIR_X.push(-OFF_X[k] / l); DIR_Z.push(-OFF_Z[k] / l);
}

export function cellCenter(i) {
  return { x: ((i % N) - N / 2 + 0.5) * CELL, z: (Math.floor(i / N) - N / 2 + 0.5) * CELL };
}
export function cellAt(x, z) {
  const cx = Math.floor(x / CELL + N / 2), cz = Math.floor(z / CELL + N / 2);
  return (cx < 0 || cz < 0 || cx >= N || cz >= N) ? -1 : cz * N + cx;
}

//#region cell
// 一格草 = 一组数字；整张地图就是几条数组，没有"物体"
function makeCells() {
  return {
    mat:    new Uint8Array(NC),                         // 材料：草/土/石/木/金属/水
    temp:   new Float32Array(NC).fill(AMBIENT),         // 温度
    wet:    new Float32Array(NC),                       // 湿度 0..1
    fuel:   new Float32Array(NC),                       // 燃料 0..1
    burn:   new Float32Array(NC),                       // 燃烧强度 0..1
    ash:    new Float32Array(NC),                       // 烧尽程度
    ice:    new Float32Array(NC),                       // 冰量
    charge: new Float32Array(NC),                       // 电荷
    steam:  new Float32Array(NC),                       // 蒸汽（给画面用）
  };
}
//#endregion

//#region burn
// 规则一：元素(热) → 材料(燃料)。燃烧只看三件事
function burnRule(s, i) {
  const burning = s.burn[i] > 0.5;
  const hot = burning || s.temp[i] > IGNITE;                 // 够热
  const fed = s.fuel[i] > 0.05 && s.ice[i] < 0.05;           // 有燃料、没冰
  const dry = s.wet[i] < (burning ? 0.35 : 0.3);             // 不太湿
  const on = hot && fed && dry;
  if (burning && !dry) s.steam[i] = 1;                       // 被浇灭：冒蒸汽
  s.burn[i] = on ? Math.min(1, s.burn[i] + 4 * DT) : Math.max(0, s.burn[i] - 3 * DT);
  if (!on || !s.heatOn) return;
  const eat = BURN_RATE[s.mat[i]] * s.burn[i] * DT;
  s.fuel[i] -= eat; s.ash[i] += eat;                         // 烧掉燃料，留下灰
  s.temp[i] += (300 + 400 * s.fuel[i] - s.temp[i]) * s.burn[i] * 4 * DT; // 只放热，不点邻居
}
//#endregion

//#region heat
// 规则三：材料不能直接改变材料。烧着的格子只"放热"；
// 热向 8 个邻居扩散，下风向的邻居多分一点；湿格、雨天散热更快
function windWeights(wind, out) {
  for (let k = 0; k < 8; k++) {
    const push = 1 + WIND_PUSH * (wind.x * DIR_X[k] + wind.z * DIR_Z[k]); // 下风向 > 1
    out[k] = SPREAD * W8[k] * Math.min(3, Math.max(0.1, push));
  }
}
function heatStep(s, i, w8) {
  let gain = 0;
  for (let k = 0; k < 8; k++) {
    const j = s.nb[i * 8 + k];
    if (j >= 0) gain += w8[k] * (s.temp[j] - s.temp[i]);     // 向邻居靠拢
  }
  const cool = COOL + s.wet[i] * WET_COOL + s.raining * RAIN_COOL;
  return s.temp[i] + (gain - (s.temp[i] - AMBIENT) * cool) * DT;
}
//#endregion

//#region rain
// 规则二：元素 → 元素。雨抬高湿度；热又把水蒸发成蒸汽、带走热量
function rainRule(s, i) {
  if (s.mat[i] === MAT.WATER) { s.wet[i] = 1; return; }      // 水面永远是湿的
  s.wet[i] = Math.min(1, s.wet[i] + s.raining * RAIN_WET * DT) - DRY * DT * (s.wet[i] > 0);
  const e = Math.min(s.wet[i], Math.max(0, s.temp[i] - 100) * EVAP * DT);
  s.wet[i] = Math.max(0, s.wet[i] - e);                      // 蒸发
  s.temp[i] -= e * LATENT;                                   // 蒸发吸热
  s.steam[i] = Math.min(1, s.steam[i] * (1 - 1.5 * DT) + e * 40);
}
//#endregion

// 附近的火焰对这一格的热辐射：本格温度，或 5×5 范围内最热格子的一部分
function nearbyHeat(s, i) {
  let heat = s.temp[i];
  const x = i % N, z = (i - x) / N;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const nx = x + dx, nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
    const r = s.temp[nz * N + nx] * (dx * dx + dz * dz <= 2 ? 0.5 : 0.3);
    if (r > heat) heat = r;
  }
  return heat;
}

//#region melt
// 规则二（续）：热 → 冰。周围够热，冰变少，融水把地面打湿
function meltRule(s, i) {
  const m = Math.min(s.ice[i], Math.max(0, nearbyHeat(s, i) - MELT_T) * MELT_K * DT);
  if (m <= 0) return;
  s.ice[i] -= m; s.temp[i] -= m * LATENT;
  s.wet[i] = Math.min(1, s.wet[i] + 4 * m);                  // 融水
  for (let k = 0; k < 4; k++) {                              // 邻居也被打湿一点
    const j = s.nb[i * 8 + k];
    if (j >= 0) s.wet[j] = Math.min(1, s.wet[j] + 0.25 * m);
  }
  if (s.ice[i] < 0.05) { s.ice[i] = 0; s.wet[i] = 1; s.steam[i] = 1; } // 冰化尽：一洼水
}
//#endregion

//#region charge
// 导电 = 金属 / 水 / 湿地，且没结冰。电荷沿上下左右逐格传，每走一步弱一点
function conducts(s, i) {
  return (s.mat[i] === MAT.METAL || s.mat[i] === MAT.WATER || s.wet[i] > 0.35) && s.ice[i] < 0.05;
}
function chargeRule(s, i) {
  let c = 0;
  if (conducts(s, i)) {
    for (let k = 0; k < 4; k++) {
      const j = s.nb[i * 8 + k];
      if (j >= 0 && s.charge[j] > c) c = s.charge[j];
    }
    c *= HOP;
  }
  return c;
}
//#endregion

//#region updraft
// 跨系统连接：所有燃烧格的热量加起来 = 一股上升气流；滑翔伞只读它
function updraftRule(s) {
  let sum = 0, cx = 0, cz = 0;
  for (let n = 0; s.anyBurn && n < s.cells.length; n++) {
    const i = s.cells[n], b = s.burn[i];
    if (b > 0) { sum += b; cx += b * s.cx[i]; cz += b * s.cz[i]; }
  }
  const u = s.updraft, k = 3 * DT;
  u.strength += (sum * UP_K - u.strength) * k;               // 平滑
  if (sum > 0.5) { u.x += (cx / sum - u.x) * k; u.z += (cz / sum - u.z) * k; }
}
//#endregion

//#region glider
// 滑翔伞：绕着热源盘旋上升；没有气流就慢慢下沉
function gliderRule(s) {
  const g = s.glider, u = s.updraft;
  if (!g.active) return;
  const dx = u.x - g.x, dz = u.z - g.z, d = Math.sqrt(dx * dx + dz * dz) + 1e-6;
  const power = u.strength / (u.strength + 0.3);             // 0..1，平滑过渡
  const inward = (d - 1.3) * 0.8 * power;                    // 向热源靠拢
  const swirl = 1.0 * power;                                 // 绕圈
  g.x += ((dx / d) * inward - (dz / d) * swirl + s.wind.x * 0.1 * (1 - power)) * DT;
  g.z += ((dz / d) * inward + (dx / d) * swirl + s.wind.z * 0.1 * (1 - power)) * DT;
  const lift = 2.0 * (u.strength / (u.strength + 0.6)) / (1 + (d * d) / 6.25); // 离中心越远越弱
  g.vy += ((lift - 0.35) - g.vy) * 1.5 * DT;                 // 上升 − 下沉
  g.y += g.vy * DT;
  if (g.y > 7) { g.y = 7; g.vy = Math.min(g.vy, 0); }
  if (g.y < 1.2) { g.y = 1.2; g.vy = Math.max(g.vy, 0); }
}
//#endregion

// ---------------------------------------------------------------- 噪声 / 布局
function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, z, seed) {   // 平滑值噪声 0..1，坐标是格点单位
  const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
  return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz;
}
function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  let t = ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz);
  t = Math.min(1, Math.max(0, t));
  const ex = px - (ax + vx * t), ez = pz - (az + vz * t);
  return Math.sqrt(ex * ex + ez * ez);
}

function islandRadius(x, z) { return 5.55 + 0.4 * (2 * vnoise(x * 0.35 + 40, z * 0.35 + 40, 7) - 1); }

function setCell(s, i, mat, fuel) { s.mat[i] = mat; s.fuel[i] = fuel; }
function grassFuel(x, z) { return 0.8 + 0.2 * (0.5 * hash2(x, z, 3) + 0.5 * vnoise(x * 0.3, z * 0.3, 9)); }

function buildLayout(s, id) {
  const idx = (x, z) => z * N + x;
  // 岛形与地形高度（所有布局通用）
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = idx(x, z), c = cellCenter(i);
    const r = Math.sqrt(c.x * c.x + c.z * c.z), R = islandRadius(c.x, c.z), d = r / R;
    let h = 0.15 * (0.6 * (2 * vnoise(c.x * 0.45, c.z * 0.45, 11) - 1) + 0.4 * (2 * vnoise(c.x * 1.1, c.z * 1.1, 12) - 1));
    if (d < 1) {
      s.mat[i] = MAT.SOIL;
      if (d > 0.85) { const t = (d - 0.85) / 0.15; h = h * (1 - t) - 0.5 * t * t; }
    } else {
      s.mat[i] = MAT.VOID;
      h = Math.max(-1.6, -0.5 - (d - 1) * 3);
    }
    s.height[i] = h;
  }
  const inIsland = (i) => s.mat[i] !== MAT.VOID;
  const world = (cb) => { for (let i = 0; i < NC; i++) if (inIsland(i)) { const c = cellCenter(i); cb(i, c.x, c.z); } };

  if (id === 'blank') { world((i) => setCell(s, i, MAT.SOIL, 0)); return; }

  if (id === 'lab') {
    world((i, x, z) => {
      if (vnoise(x * 0.35 + 5, z * 0.35, 5) > 0.62) setCell(s, i, MAT.GRASS, grassFuel(x, z));
      else setCell(s, i, MAT.SOIL, 0);
      // 靠近冰块的干草地（用来点火）
      const ex = (x + 1.2) / 1.15, ez = (z - 1.1) / 1.1;
      if (ex * ex + ez * ez < 1) setCell(s, i, MAT.GRASS, 0.95 + 0.05 * hash2(i, 1, 4));
    });
    for (let z = 20; z <= 27; z++) for (let x = 5; x <= 16; x++) {          // 水道
      const i = idx(x, z); s.mat[i] = MAT.WATER; s.fuel[i] = 0; s.wet[i] = 1;
      s.height[i] = s.height[i] * 0.3 - 0.08;
    }
    for (let z = 23; z <= 24; z++) {
      for (let x = 17; x <= 20; x++) { const i = idx(x, z); setCell(s, i, MAT.SOIL, 0); s.ice[i] = 1; s.iceWas[i] = 1; } // 冰封的缺口
      for (let x = 21; x <= 42; x++) setCell(s, idx(x, z), MAT.METAL, 0);   // 金属导轨 + 接收器
    }
    const src = cellCenter(idx(5, 24)), rcv = cellCenter(idx(42, 24));
    s.sources.push({ x: src.x, z: src.z });
    s.receivers.push({ x: rcv.x, z: rcv.z, powered: false, poweredAt: -1, cell: idx(42, 24) });
    return;
  }

  // meadow / lift
  const lift = id === 'lift';
  world((i, x, z) => {
    const f = grassFuel(x, z);
    if (lift) {
      const r = Math.sqrt(x * x + z * z);
      if (r < 3.6) setCell(s, i, MAT.GRASS, 0.95 + 0.05 * hash2(i, 2, 4));   // 中央大片干草
      else if (vnoise(x * 0.5, z * 0.5, 6) > 0.62) setCell(s, i, MAT.GRASS, f);
      else setCell(s, i, MAT.SOIL, 0);
    } else setCell(s, i, MAT.GRASS, f);
  });
  if (lift) return;
  const paths = [[-5.2, -3.0, -2.6, -1.8], [-2.6, -1.8, 0.2, -1.9], [0.2, -1.9, 1.8, -5.0], [1.6, 1.4, 5.2, 2.0], [-0.8, 2.2, -3.8, 4.2]];
  const stones = [[-3.2, 2.6, 0.7], [2.8, -3.0, 0.6], [3.6, 3.0, 0.5], [-1.8, -3.8, 0.5]];
  world((i, x, z) => {
    for (const p of paths) if (segDist(x, z, p[0], p[1], p[2], p[3]) < 0.14) setCell(s, i, MAT.SOIL, 0);
    for (const q of stones) if ((x - q[0]) * (x - q[0]) + (z - q[1]) * (z - q[1]) < q[2] * q[2]) setCell(s, i, MAT.STONE, 0);
  });
  for (const t of [[-3.5, 0.5], [-1.5, 3.0], [1.0, -2.5], [3.0, 0.0], [2.0, 3.5], [-0.5, -3.0]]) {
    s.trees.push({ x: t[0], z: t[1] });
    for (const dz of [-0.125, 0.125]) for (const dx of [-0.125, 0.125]) {   // 2×2 格的树
      const i = cellAt(t[0] + dx, t[1] + dz);
      if (i >= 0 && inIsland(i)) setCell(s, i, MAT.WOOD, 1);
    }
  }
}

// ---------------------------------------------------------------- 模拟器
const SNAP_ARRAYS = ['temp', 'wet', 'fuel', 'burn', 'ash', 'ice', 'charge', 'steam'];

export function createSim(layoutId = 'meadow', opts = {}) {
  const s = makeCells();
  s.height = new Float32Array(NC);
  s.iceWas = new Uint8Array(NC);         // 曾经有冰的格子（统计用）
  s.layout = layoutId;
  s.time = 0; s.frame = 0;
  s.wind = { x: 0, z: 0 };
  s.raining = 0;
  s.updraft = { strength: 0, x: 0, z: 0 };
  s.glider = { x: 0, y: 1.2, z: 0, vy: 0, active: false };
  s.sources = []; s.receivers = []; s.trees = [];
  s.anyBurn = false;
  s.heatOn = true;                       // 关掉后烧着的格子不再放热（测试"材料不能直接点材料"）
  buildLayout(s, layoutId);

  // 静态辅助表
  s.cx = new Float32Array(NC); s.cz = new Float32Array(NC);
  const cellsList = [];
  for (let i = 0; i < NC; i++) { const c = cellCenter(i); s.cx[i] = c.x; s.cz[i] = c.z; if (s.mat[i] !== MAT.VOID) cellsList.push(i); }
  s.cells = Int32Array.from(cellsList);
  s.nb = new Int32Array(NC * 8).fill(-1);
  for (let i = 0; i < NC; i++) {
    const x = i % N, z = (i - x) / N;
    for (let k = 0; k < 8; k++) {
      const nx = x + OFF_X[k], nz = z + OFF_Z[k];
      if (nx >= 0 && nz >= 0 && nx < N && nz < N && s.mat[nz * N + nx] !== MAT.VOID) s.nb[i * 8 + k] = nz * N + nx;
    }
  }
  for (const k of ['cx', 'cz', 'cells', 'nb']) Object.defineProperty(s, k, { enumerable: false });

  const nextTemp = new Float32Array(NC), nextCharge = new Float32Array(NC), w8 = new Float64Array(8);
  const st = { events: [], evIdx: 0, windT: { x: 0, z: 0 }, rainT: 0, shock: false, acc: 0 };
  let snaps = new Map();

  // ---- 快照 ----
  function save() {
    const o = { frame: s.frame, evIdx: st.evIdx, windT: { ...st.windT }, rainT: st.rainT, shock: st.shock,
      wind: { ...s.wind }, raining: s.raining, updraft: { ...s.updraft }, glider: { ...s.glider },
      recv: s.receivers.map((r) => [r.powered, r.poweredAt]), iceWas: s.iceWas.slice() };
    for (const k of SNAP_ARRAYS) o[k] = s[k].slice();
    return o;
  }
  function load(o) {
    s.frame = o.frame; s.time = o.frame * DT; st.evIdx = o.evIdx; st.windT = { ...o.windT }; st.rainT = o.rainT; st.shock = o.shock;
    s.wind.x = o.wind.x; s.wind.z = o.wind.z; s.raining = o.raining;
    Object.assign(s.updraft, o.updraft); Object.assign(s.glider, o.glider);
    s.receivers.forEach((r, n) => { r.powered = o.recv[n][0]; r.poweredAt = o.recv[n][1]; });
    s.iceWas.set(o.iceWas);
    for (const k of SNAP_ARRAYS) s[k].set(o[k]);
  }
  snaps.set(0, save());

  // ---- 事件 ----
  function applyEvent(e) {
    switch (e.type) {
      case 'ignite': {                       // 点火：给"有燃料、够干"的格子加热
        const r = e.r ?? 0.5;
        for (let n = 0; n < s.cells.length; n++) {
          const i = s.cells[n], dx = s.cx[i] - e.x, dz = s.cz[i] - e.z;
          if (dx * dx + dz * dz <= r * r && s.fuel[i] > 0.05 && s.wet[i] < 0.3 && s.ice[i] < 0.05) s.temp[i] = Math.max(s.temp[i], 600);
        }
        break;
      }
      case 'rain': st.rainT = e.on === false ? 0 : (e.v ?? 1); break;
      case 'wind': st.windT = { x: e.x, z: e.z }; break;
      case 'shock': st.shock = !!e.on; break;
      case 'ice': {
        const r = e.r ?? 0.5;
        for (let n = 0; n < s.cells.length; n++) {
          const i = s.cells[n], dx = s.cx[i] - e.x, dz = s.cz[i] - e.z;
          if (dx * dx + dz * dz <= r * r && s.mat[i] !== MAT.WATER) { s.ice[i] = 1; s.iceWas[i] = 1; }
        }
        break;
      }
      case 'glider': Object.assign(s.glider, { active: e.on !== false, x: e.x ?? 0, y: e.y ?? 3, z: e.z ?? 0, vy: 0 }); break;
    }
  }
  const evFrame = (e) => Math.round(e.t * 60);
  function applyDue() {
    while (st.evIdx < st.events.length && evFrame(st.events[st.evIdx]) <= s.frame) applyEvent(st.events[st.evIdx++]);
  }
  function pushNow(e) {                      // 交互式调用：写进事件表，保证之后 seek 仍可复现
    for (const k of [...snaps.keys()]) if (k * 60 > s.frame) snaps.delete(k);
    st.events.splice(st.evIdx, 0, { ...e, t: s.frame * DT });
    applyDue();
  }

  // ---- 一个 tick ----
  function tick() {
    applyDue();
    // 风、雨的平滑过渡（风约 0.5 秒，雨约 1 秒）
    const wk = 6 * DT;
    s.wind.x += (st.windT.x - s.wind.x) * wk; s.wind.z += (st.windT.z - s.wind.z) * wk;
    if (s.raining < st.rainT) s.raining = Math.min(st.rainT, s.raining + DT);
    else if (s.raining > st.rainT) s.raining = Math.max(st.rainT, s.raining - DT);

    const cells = s.cells, temp = s.temp;
    // 找出"有热"的范围，只在这个包围盒里扩散
    let x0 = N, x1 = -1, z0 = N, z1 = -1;
    s.anyBurn = false;
    for (let n = 0; n < cells.length; n++) {
      const i = cells[n], t = temp[i];
      if (t > AMBIENT + 0.3 || s.burn[i] > 0) {
        if (s.burn[i] > 0) s.anyBurn = true;
        const x = i % N, z = (i - x) / N;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
      } else if (t !== AMBIENT && t < AMBIENT + 0.3 && t > AMBIENT - 0.3) temp[i] = AMBIENT;
    }
    if (x1 >= 0) {
      x0 = Math.max(0, x0 - 1); x1 = Math.min(N - 1, x1 + 1); z0 = Math.max(0, z0 - 1); z1 = Math.min(N - 1, z1 + 1);
      windWeights(s.wind, w8);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const i = z * N + x;
        if (s.mat[i] === MAT.VOID) continue;
        nextTemp[i] = s.heatOn ? heatStep(s, i, w8) : temp[i] + (AMBIENT - temp[i]) * COOL * DT;
      }
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = z * N + x; if (s.mat[i] !== MAT.VOID) temp[i] = Math.min(TEMP_CAP, nextTemp[i]); }
    }
    // 逐格规则：下雨/蒸发 → 燃烧 → 融冰 → 蒸汽衰减
    const rain = s.raining;
    for (let n = 0; n < cells.length; n++) {
      const i = cells[n];
      if (rain === 0 && s.wet[i] === 0 && s.burn[i] === 0 && temp[i] < IGNITE && s.ice[i] === 0 && s.steam[i] === 0 && s.mat[i] !== MAT.WATER) continue;
      rainRule(s, i);
      burnRule(s, i);
      if (s.ice[i] > 0) meltRule(s, i);
    }
    // 电荷
    const anyCharge = st.shock || s.sources.length && chargeSum() > 1e-4;
    if (anyCharge) {
      for (let n = 0; n < cells.length; n++) nextCharge[cells[n]] = chargeRule(s, cells[n]);
      for (let n = 0; n < cells.length; n++) { const i = cells[n]; s.charge[i] = st.shock ? nextCharge[i] : nextCharge[i] * 0.8; }
      if (st.shock) for (const q of s.sources) { const c = cellAt(q.x, q.z); if (c >= 0) s.charge[c] = 1; }
      for (let n = 0; n < cells.length; n++) if (s.charge[cells[n]] < 0.001) s.charge[cells[n]] = 0;
    }
    for (const r of s.receivers) {
      const on = s.charge[r.cell] > 0.2;
      if (on && !r.powered) { r.powered = true; r.poweredAt = (s.frame + 1) * DT; }
      else if (!on && r.powered && s.charge[r.cell] < 0.1) { r.powered = false; r.poweredAt = -1; }
    }
    updraftRule(s);
    gliderRule(s);
    s.frame++; s.time = s.frame * DT;
    if (s.frame % 60 === 0 && !snaps.has(s.frame / 60)) snaps.set(s.frame / 60, save());
  }
  function chargeSum() { let c = 0; for (let n = 0; n < s.cells.length; n++) c += s.charge[s.cells[n]]; return c; }

  // ---- 对外接口 ----
  s.schedule = (events) => {
    st.events = (events || []).map((e, n) => ({ e, n })).sort((a, b) => (evFrame(a.e) - evFrame(b.e)) || (a.n - b.n)).map((o) => o.e);
    snaps = new Map(); // 回到初始状态：重新建立快照
    const init = initial; load(init); snaps.set(0, init); st.evIdx = 0; st.acc = 0;
  };
  const initial = snaps.get(0);
  s.seek = (t) => {
    const f = Math.max(0, Math.round(t * 60));
    if (f < s.frame) {
      let k = Math.floor(f / 60);
      while (!snaps.has(k)) k--;
      load(snaps.get(k));
    }
    while (s.frame < f) tick();
    return s;
  };
  s.step = (dt) => { st.acc += dt; while (st.acc >= DT) { tick(); st.acc -= DT; } return s; };
  s.ignite = (x, z, r = 0.5) => pushNow({ type: 'ignite', x, z, r });
  s.rain = (on = true) => pushNow({ type: 'rain', on });
  s.setWind = (x, z) => pushNow({ type: 'wind', x, z });
  s.shock = (on = true) => pushNow({ type: 'shock', on });
  s.placeIce = (x, z, r = 0.5) => pushNow({ type: 'ice', x, z, r });
  s.spawnGlider = (x, z, y = 2) => pushNow({ type: 'glider', on: true, x, y, z });
  s.stats = () => {
    let burning = 0, burnt = 0, wet = 0, iceMass = 0, iceMelted = 0, charged = 0, maxTemp = AMBIENT;
    for (let n = 0; n < s.cells.length; n++) {
      const i = s.cells[n];
      if (s.burn[i] > 0.5) burning++;
      if (s.ash[i] > 0.5) burnt++;
      if (s.wet[i] > 0.3 && s.mat[i] !== MAT.WATER) wet++;
      iceMass += s.ice[i];
      if (s.iceWas[i] && s.ice[i] < 0.05) iceMelted++;
      if (s.charge[i] > 0.2) charged++;
      if (s.temp[i] > maxTemp) maxTemp = s.temp[i];
    }
    return { time: s.time, burning, burnt, wet, iceMass, iceMelted, charged, maxTemp,
      updraft: s.updraft.strength, raining: s.raining, receiverPowered: s.receivers.some((r) => r.powered) };
  };
  return s;
}
