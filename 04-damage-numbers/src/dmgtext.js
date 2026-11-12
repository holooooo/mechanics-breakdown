// 机制拆解 04 · 跳字 —— 分层伤害数字系统。纯函数：画面状态 = f(hits, t, level)，无 DOM、无随机状态。
// 每一层只比上一层多一件事（见 LEVELS）。film.js 和 index.html 共用这一份实现。

export const LEVELS = [
  { id: 0, key: 'show',   name: '能显示', add: '在命中点写出数字，0.8 秒后消失' },
  { id: 1, key: 'move',   name: '动起来', add: '上飘 + 淡出 + 随机横向偏移' },
  { id: 2, key: 'pop',    name: '弹出来', add: '回弹放大（easeOutBack）+ 粗描边 + 错开位置' },
  { id: 3, key: 'rank',   name: '分等级', add: '字号随伤害取对数；暴击变大、变色、倾斜、抖动' },
  { id: 4, key: 'impact', name: '打击感', add: '暴击顿帧 + 震屏 + 闪白 + 火花 + 抛物线飞出' },
  { id: 5, key: 'stack',  name: '攒起来', add: '连击合并成一个滚动总数，数字往上“数”' },
  { id: 6, key: 'grow',   name: '涨上去', add: '数值膨胀 + 万/亿缩写，越打越大' },
  { id: 7, key: 'tidy',   name: '收得住', add: '同屏上限、小数字合并、暴击优先' },
];

// ---------------------------------------------------------------- deterministic helpers
export function hash(i, s = 0) {
  let x = (i * 374761393 + s * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export function easeOutBack(x, k = 2.2) { x = clamp(x); const c3 = k + 1; return 1 + c3 * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); }

// ---------------------------------------------------------------- number formatting
const ZH = [[1e16, '京'], [1e12, '兆'], [1e8, '亿'], [1e4, '万']];
const EN = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
function short(n, table, min) {
  for (const [v, u] of table) if (n >= v && n >= min) {
    const x = n / v, d = x >= 100 ? 0 : x >= 10 ? 1 : 2;
    return (d ? x.toFixed(d).replace(/\.?0+$/, '') : String(Math.round(x))) + u;
  }
  return String(Math.round(n));
}
/** fmt(12345678,'zh') -> '1235万'；'en' -> '12.3M'；'comma' -> '12,345,678'；'sci' -> '1.23e7' */
export function fmt(n, style = 'raw') {
  n = Math.max(0, n);
  if (style === 'zh') return short(n, ZH, 1e5);
  if (style === 'en') return short(n, EN, 1e4);
  if (style === 'comma') return Math.round(n).toLocaleString('en-US');
  if (style === 'sci') return n < 1e6 ? String(Math.round(n)) : n.toExponential(2).replace('e+', 'e');
  return String(Math.round(n));
}

// ---------------------------------------------------------------- hit schedules
export const ELEMENTS = {
  phys:  { fill: ['#ffffff', '#dfe6ee'], stroke: '#1a1f2b' },
  fire:  { fill: ['#ffd36b', '#ff5a1f'], stroke: '#3a0c00' },
  ice:   { fill: ['#e9fbff', '#6fd3ff'], stroke: '#06283a' },
  elec:  { fill: ['#f1dcff', '#a46bff'], stroke: '#1d0a3a' },
  poison:{ fill: ['#e8ffb0', '#5fd34a'], stroke: '#0e2a06' },
  crit:  { fill: ['#fff6a8', '#ffb21a', '#ff3d1a'], stroke: '#2a0800' },
};

/**
 * makeHits — 确定性的命中序列。
 * every: 普通攻击间隔；bursts: [{t, n, gap, mul}] 连击段；growth: 每秒指数增长率（数值膨胀）
 */
export function makeHits({ seed = 1, t0 = 0, t1 = 10, every = 0.5, base = 120, spread = 0.35, critRate = 0.25,
  critMul = 2.6, elements = ['phys'], growth = 0, bursts = [], forceCrit = [] } = {}) {
  const hits = [];
  const push = (t, mul = 1, kind = 'hit') => hits.push(makeHit(hits.length, t, { seed, t0, base, spread, critRate, critMul, elements, growth, mul, kind, crit: forceCrit.includes(hits.length) || undefined }));
  const busy = (t) => bursts.some(b => t >= b.t - 0.2 && t <= b.t + b.n * b.gap + 0.5);
  for (let t = t0 + 0.25; t < t1; t += every) if (!busy(t)) push(t);
  for (const b of bursts) for (let k = 0; k < b.n; k++) push(b.t + k * b.gap, (b.mul ?? 0.35) * (1 + k * (b.ramp ?? 0.08)), 'tick');
  hits.sort((a, b) => a.t - b.t);
  return chainHits(hits);
}

/** 单次命中（交互页实时调用）。crit: true/false 可强制，undefined 时按 critRate 掷骰。 */
export function makeHit(i, t, { seed = 1, t0 = 0, base = 120, spread = 0.35, critRate = 0.25, critMul = 2.6, elements = ['phys'], growth = 0, mul = 1, kind = 'hit', crit } = {}) {
  const r = hash(i, seed), g = Math.exp(growth * (t - t0));
  const c = crit ?? hash(i, seed + 7) < critRate;
  const el = elements[Math.floor(hash(i, seed + 3) * elements.length)];
  const amount = Math.round(base * g * mul * (1 - spread + 2 * spread * r) * (c ? critMul : 1));
  return { i, t, amount, crit: c, el: c && el === 'phys' ? 'crit' : el, kind, jx: hash(i, seed + 11) * 2 - 1, jy: hash(i, seed + 13) * 2 - 1, slot: i % 4 };
}

/** 按时间排好序后调用：重新编号 + 连击链（间隔 < 0.36s 归为一链）。 */
export function chainHits(hits) {
  hits.forEach((h, k) => { h.i = k; h.slot = k % 4; });
  let chain = -1, last = -9;
  for (const h of hits) { if (h.t - last > 0.36) chain++; h.chain = chain; last = h.t; }
  return hits;
}

// ---------------------------------------------------------------- time warp (hit-stop)
export const STOP = 0.075;               // 暴击顿帧 75ms
export function warp(t, hits, L) {
  if (L < 4) return t;
  let w = t;
  for (const h of hits) { if (h.t >= t) break; if (h.crit) w -= Math.min(t - h.t, STOP * (h.amount > 0 ? 1 : 0)); }
  return w;
}

// ---------------------------------------------------------------- main layout
/**
 * layout(hits, t, L, opt) -> { nums, sparks, slashes, shake:[dx,dy], flash, squash, total }
 * opt: { ox, oy (命中点), px (缩放), style (数字格式), cap (同屏上限) }
 * 返回的都是画面坐标的“绘制指令”，由 arena.js 去画。
 */
export function layout(hits, t, L, opt = {}) {
  const { ox = 0, oy = 0, px = 1, style = L >= 6 ? 'zh' : 'raw', cap = 7, spread = 1 } = opt;
  const tw = warp(t, hits, L);
  const out = { nums: [], sparks: [], slashes: [], shake: [0, 0], flash: 0, squash: 0, total: null, stopped: false };
  const past = [];
  for (const h of hits) { if (h.t > t) break; if (t - h.t < 2.6) past.push(h); }

  for (const h of past) {
    const age = tw - warp(h.t, hits, L);
    // 攻击挥砍（所有层都有，作为“命中”的参照）
    if (age < 0.22) out.slashes.push({ age, k: age / 0.22, crit: h.crit && L >= 3, dir: h.i % 2 ? 1 : -1, tick: h.kind === 'tick' });
    if (L >= 4) {
      if (h.crit && age < 0.32) {
        const a = Math.pow(1 - age / 0.32, 2) * 16 * px;
        out.shake[0] += Math.sin(age * 95 + h.i) * a; out.shake[1] += Math.cos(age * 77 + h.i * 2) * a * 0.7;
      }
      if (age < 0.09) out.flash = Math.max(out.flash, (h.crit ? 1 : 0.45) * (1 - age / 0.09));
      out.squash = Math.max(out.squash, (h.crit ? 1 : 0.5) * Math.exp(-age * 14) * (age >= 0 ? 1 : 0));
      if (age < 0.45) {
        const n = h.crit ? 16 : h.kind === 'tick' ? 3 : 7;
        for (let k = 0; k < n; k++) {
          const ang = (hash(h.i * 31 + k, 5) * 2 - 1) * Math.PI * 0.9 - Math.PI / 2 + (h.i % 2 ? 0.4 : -0.4);
          const sp = (220 + 520 * hash(h.i * 31 + k, 9)) * (h.crit ? 1.35 : 0.8) * px;
          const a = age;
          out.sparks.push({ x: ox + Math.cos(ang) * sp * a, y: oy + Math.sin(ang) * sp * a + 900 * px * a * a, life: 1 - a / 0.45, crit: h.crit, el: h.el, ang });
        }
      }
    } else if (L >= 3 && h.crit && age < 0.12) out.flash = Math.max(out.flash, 0.3 * (1 - age / 0.12));
    if (L >= 4 && h.crit && age >= 0 && age < STOP) out.stopped = true;

    const n = number(h, age, L, { ox, oy, px, style, spread });
    if (n) out.nums.push(n);
  }

  // L5+：连击总数（滚动累加）
  if (L >= 5) out.total = totalAt(hits, t, tw, L, { ox, oy, px, style });

  // L7：连击中的普通数字并进总数（不再单独弹）；再设同屏上限，保留暴击与最新的，其余淡出
  if (L >= 7) {
    const sofar = {};
    for (const h of past) sofar[h.chain] = (sofar[h.chain] || 0) + 1;
    const chainOf = new Map(past.map(h => [h.t, h.chain]));
    out.nums = out.nums.filter(n => n.crit || (sofar[chainOf.get(n.birth)] || 0) < 3);
  }
  if (L >= 7 && out.nums.length > cap) {
    const rank = out.nums.map((n, k) => ({ n, k, score: (n.crit ? 1e6 : 0) + n.amount * 0.001 + n.birth * 10 }));
    rank.sort((a, b) => b.score - a.score);
    const keep = new Set(rank.slice(0, cap).map(r => r.k));
    out.nums = out.nums.filter((n, k) => keep.has(k) || (n.alpha *= 0.18, n.tiny = true, true));
  }
  return out;
}

function number(h, age, L, { ox, oy, px, style, spread = 1 }) {
  if (age < 0) return null;
  const tick = h.kind === 'tick';
  if (L >= 5 && tick && age > 0.5) return null;
  const life = L === 0 ? 0.8 : h.crit && L >= 3 ? 1.25 : tick && L >= 5 ? 0.5 : 0.95;
  if (age > life) return null;
  const k = age / life;
  const txt = fmt(h.amount, style);
  const n = { text: txt, amount: h.amount, crit: h.crit && L >= 3, el: L >= 3 ? h.el : 'phys', birth: h.t, L,
    x: ox, y: oy - 60 * px, scale: 1, alpha: 1, rot: 0, outline: L >= 2, glow: 0, label: null, size: 44 * px, tiny: false };
  if (L === 0) return n;                                         // 原地出现、原地消失

  // L1：上飘 + 淡出 + 横向随机
  n.x = ox + h.jx * 70 * px;
  n.y = oy - 60 * px - 90 * px * easeOut(k);
  n.alpha = 1 - smooth((k - 0.55) / 0.45);
  if (L === 1) return n;

  // L2：回弹放大 + 错开（4 个槽位轮换，避免叠字）
  const pop = easeOutBack(age / 0.2, 2.6);
  n.scale = pop;
  n.x = ox + (h.jx * 110 + [-90, 80, -30, 120][h.slot]) * px * spread;
  n.y = oy - (40 + [0, 40, 80, 20][h.slot] + h.jy * 70 * spread) * px - 70 * px * easeOut(k) + (spread - 1) * 60 * px;
  n.size = 54 * px;
  if (L === 2) return n;

  // L3：字号 ∝ log10(伤害)，暴击放大 + 倾斜 + 前 0.15s 抖动 + 标签
  const mag = clamp((Math.log10(Math.max(10, h.amount)) - 1) / 3, 0, 1.6);
  n.size = (40 + 26 * mag) * px * (tick && L >= 5 ? 0.62 : 1);
  if (n.crit) {
    n.size *= 1.75; n.rot = (h.jx >= 0 ? 1 : -1) * 0.12;
    const j = Math.max(0, 1 - age / 0.15) * 7 * px;
    n.x += Math.sin(age * 160) * j; n.y += Math.cos(age * 130) * j;
    n.label = '暴击'; n.glow = 0.5;
    n.scale = easeOutBack(age / 0.24, 3.4);
  }
  if (L === 3) return n;

  // L4：暴击按抛物线飞出（初速度朝上 + 重力），普通字保持上飘
  if (n.crit) {
    const vx = (h.jx >= 0 ? 1 : -1) * (160 + 120 * Math.abs(h.jx)) * px, vy = -620 * px, g = 1250 * px;
    const a = Math.min(age, 0.62);
    n.x = ox + vx * a; n.y = oy - 70 * px + vy * a + 0.5 * g * a * a;
    n.glow = 1;
  }
  if (L >= 5 && tick) { n.alpha *= 0.75; }
  return n;
}

function totalAt(hits, t, tw, L, { ox, oy, px, style }) {
  // 找到当前（或刚结束）的连击链
  let cur = null;
  for (const h of hits) { if (h.t > t) break; cur = h.chain; }
  if (cur == null) return null;
  const chain = hits.filter(h => h.chain === cur);
  if (chain.length < 3) return null;
  const done = chain.filter(h => h.t <= t), last = done[done.length - 1], end = chain[chain.length - 1];
  const sinceLast = tw - warp(last.t, hits, L);
  const prev = done.slice(0, -1).reduce((s, h) => s + h.amount, 0), sum = prev + last.amount;
  const shown = prev + (sum - prev) * easeOut(sinceLast / 0.14);     // 往上“数”
  const finished = last === end, after = finished ? t - end.t : 0;
  if (finished && after > 1.7) return null;
  const mag = clamp((Math.log10(Math.max(10, shown)) - 1) / 4, 0, 1.8);
  let scale = 1 + 0.32 * Math.exp(-sinceLast * 13), y = oy - 250 * px, alpha = 1, gold = 0;
  if (finished && after > 0.25) {                                    // 收尾：重重一砸，再飘走
    const s = after - 0.25; scale = 1 + 0.55 * Math.exp(-s * 7) * Math.sin(Math.min(s * 22, Math.PI)) + 0.18 * smooth(s / 0.2);
    gold = smooth(s / 0.15);
    y -= 60 * px * smooth((after - 1.1) / 0.6); alpha = 1 - smooth((after - 1.2) / 0.5);
  }
  return { text: fmt(shown, style), value: shown, count: done.length, x: ox + 10 * px, y, scale, alpha, gold,
    size: (70 + 34 * mag) * px, slam: finished && after > 0.25 && after < 0.5 ? 1 - (after - 0.25) / 0.25 : 0 };
}

/** 方便测试：某一层在某一时刻有多少个数字、最大字号。 */
export function stats(hits, t, L, opt) {
  const o = layout(hits, t, L, opt);
  return { count: o.nums.length, maxSize: Math.max(0, ...o.nums.map(n => n.size * n.scale)), total: o.total?.text ?? null, stopped: o.stopped };
}
