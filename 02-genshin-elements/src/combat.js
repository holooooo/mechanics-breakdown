// 元素附着教学原型：确定性战斗模拟（原创实现，非米哈游代码）
// 规则数字均来自玩家实测（见 research.md），官方未公布。纯 JS，无依赖；不用 Math.random / Date。
// 教学简化：不含元素精通(EM)、抗性、暴击；一次命中最多触发一种反应。

export const ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'anemo', 'geo', 'dendro'];

const TAX = 0.8;          // 附着税：xU 只留 0.8x
const EPS = 1e-9;         // 小于此视为耗尽
const ICD_TIME = 2.5, ICD_HITS = 3;
const LV_BASE = 1446.85;  // Lv90 剧变等级系数
const EC_TICK = 0.4;      // 感电每跳从水、雷各扣 0.4U
const STICKY = new Set(['pyro', 'hydro', 'electro', 'cryo', 'dendro']); // 风/岩留不下附着

//#region aura
// 据玩家实测：总持续 = 2.5x + 7 秒；衰减速率由首次附着决定
export const auraDuration = (u) => 2.5 * u + 7;
export const decayRate = (u) => 1 / (35 / (4 * u) + 25 / 8); // U/秒，1U ≈ 0.0842
// 一个附着 = { element, gauge, decay, appliedAt }；0.8x·D(x) = 2.5x+7
const newAura = (el, x, t) => ({ element: el, gauge: TAX * x, decay: decayRate(x), appliedAt: t, at: t });
//#endregion

//#region decay
// 惰性衰减：只在命中/感电跳时把附着推进到当前时刻
function decayTo(tg, t) {
  for (const a of tg.auras) { a.gauge -= a.decay * (t - a.at); a.at = t; }
  tg.auras = tg.auras.filter((a) => a.gauge > EPS);
}
//#endregion

//#region icd
// 内置冷却：第 1 下必附着；之后每 3 下一次，或满 2.5 秒后的下一下
function icdAllows(tg, src, t) {
  const s = tg.icd[src];
  if (!s || t - s.t0 >= ICD_TIME) { tg.icd[src] = { t0: t, n: 0 }; return true; } // 计时到期：重置计数
  if (++s.n >= ICD_HITS) { s.n = 0; return true; }                              // 计数满：不重置计时
  return false;
}
//#endregion

//#region apply
// 同种元素：取较大者，不叠加；衰减沿用最初一次（火是 3.0 起的例外：新量≥旧量则刷新衰减）
function addAura(tg, el, x, t) {
  const a = tg.auras.find((v) => v.element === el);
  if (!a) { tg.auras.push(newAura(el, x, t)); return { kind: 'apply', before: 0, after: TAX * x }; }
  const before = a.gauge;
  if (el === 'pyro' && TAX * x >= before) a.decay = decayRate(x);
  a.gauge = Math.max(before, TAX * x);
  return { kind: 'refresh', before, after: a.gauge };
}
//#endregion

//#region react
// 规则表：触发元素 → 已有附着 → [反应, 倍率, 消耗系数, 类型]
const R = (name, mult, coef, kind) => ({ name, mult, coef, kind });
const RULES = {
  pyro:    { hydro: R('vaporize', 1.5, 0.5, 'amp'), cryo: R('melt', 2, 2, 'amp'), electro: R('overloaded', 2.75, 1, 'trans') },
  hydro:   { pyro: R('vaporize', 2, 2, 'amp'), cryo: R('frozen', 0, 1, 'freeze'), electro: R('electro-charged', 2, 0, 'ec') },
  cryo:    { pyro: R('melt', 1.5, 0.5, 'amp'), hydro: R('frozen', 0, 1, 'freeze'), electro: R('superconduct', 1.5, 1, 'trans') },
  electro: { pyro: R('overloaded', 2.75, 1, 'trans'), cryo: R('superconduct', 1.5, 1, 'trans'), hydro: R('electro-charged', 2, 0, 'ec') },
  anemo:   Object.fromEntries(['pyro', 'hydro', 'electro', 'cryo'].map((e) => [e, R('swirl', 0.6, 0.5, 'trans')])),
  geo:     Object.fromEntries(['pyro', 'hydro', 'electro', 'cryo'].map((e) => [e, R('crystallize', 0, 0.5, 'shield')])),
};
function findRule(tg, el) {
  for (const a of tg.auras) {
    const r = RULES[el] && RULES[el][a.element];
    if (r && !(r.kind === 'ec' && tg.ec)) return { rule: r, aura: a }; // 感电已在进行：只当普通附着
  }
  return null;
}
// 反应 = 按系数消耗已有附着；增幅乘伤害，剧变用固定等级基数
function react(tg, ev, { rule, aura }) {
  const before = aura.gauge;
  const used = rule.kind === 'freeze' ? Math.min(before, ev.units) : ev.units * rule.coef;
  aura.gauge -= used;
  let damage = ev.dmg, trans = 0;
  if (rule.kind === 'amp') damage = ev.dmg * rule.mult;
  if (rule.kind === 'trans') { trans = LV_BASE * rule.mult; damage += trans; }
  if (rule.kind === 'freeze') { // 简化：冻结时长 = 2√(5·冻结量+4) − 4，冻结量 = 2·消耗量；不做递减
    tg.frozenUntil = Math.max(tg.frozenUntil, ev.t + 2 * Math.sqrt(5 * 2 * used + 4) - 4);
  }
  if (rule.kind === 'ec') { addAura(tg, ev.element, ev.units, ev.t); tg.ec = { next: ev.t + 1 }; trans = ecTick(tg); damage += trans; }
  tg.auras = tg.auras.filter((a) => a.gauge > EPS);
  tg.lastReaction = rule.name;
  return { rule, before, after: aura.gauge, damage, trans };
}
// 感电：水雷同时在身上，每跳各扣 0.4U；任一方耗尽即结束
function ecTick(tg) {
  const h = tg.auras.find((a) => a.element === 'hydro'), e = tg.auras.find((a) => a.element === 'electro');
  if (!h || !e) { tg.ec = null; return 0; }
  h.gauge -= EC_TICK; e.gauge -= EC_TICK;
  tg.auras = tg.auras.filter((a) => a.gauge > EPS);
  if (h.gauge <= EPS || e.gauge <= EPS) tg.ec = null;
  return LV_BASE * 2;
}
//#endregion

export function createCombat(opts = {}) {
  const defs = [];            // 目标（可变状态）
  let events = [], idx = 0, now = -Infinity;
  const C = { targets: [], log: [], opts };

  const push = (o) => C.log.push({ target: null, element: null, reaction: null, strong: false, multiplier: 1, gaugeBefore: 0, gaugeAfter: 0, damage: 0, ...o });
  const fresh = (d) => ({ ...d, auras: [], icd: {}, ec: null, lastReaction: null, frozenUntil: 0 });

  function reset() {
    for (let i = 0; i < defs.length; i++) defs[i] = fresh(defs[i]);
    idx = 0; now = -Infinity; C.log.length = 0;
  }
  function view(t) {
    C.targets = defs.map((d) => ({
      id: d.id, x: d.x, z: d.z, name: d.name, lastReaction: d.lastReaction, frozenUntil: d.frozenUntil,
      auras: d.auras.map((a) => ({ element: a.element, gauge: Math.max(0, a.gauge - a.decay * (t - a.at)), decay: a.decay, appliedAt: a.appliedAt }))
        .filter((a) => a.gauge > EPS),
    }));
  }
  function onHit(ev) {
    const tg = defs.find((d) => d.id === ev.target);
    if (!tg) return;
    decayTo(tg, ev.t);
    const base = { t: ev.t, target: tg.id, element: ev.element };
    if (ev.icd && !icdAllows(tg, ev.src, ev.t)) return push({ ...base, kind: 'blocked_icd', damage: ev.dmg });
    const f = findRule(tg, ev.element);
    if (f) {
      const r = react(tg, ev, f);
      return push({ ...base, kind: 'reaction', reaction: r.rule.name, strong: r.rule.kind === 'amp' && r.rule.coef > 1,
        multiplier: r.rule.mult, gaugeBefore: r.before, gaugeAfter: r.after, damage: r.damage, transDamage: r.trans });
    }
    if (!STICKY.has(ev.element)) return push({ ...base, kind: 'apply', damage: ev.dmg }); // 风/岩：无附着、无反应
    const a = addAura(tg, ev.element, ev.units, ev.t);
    push({ ...base, kind: a.kind, gaugeBefore: a.before, gaugeAfter: a.after, damage: ev.dmg });
  }
  function onEcTick(tg, t) {
    decayTo(tg, t);
    const h = tg.auras.find((a) => a.element === 'hydro');
    const before = h ? h.gauge : 0;
    const dmg = ecTick(tg);
    if (!dmg) return;
    tg.ec && (tg.ec.next = t + 1);
    push({ t, target: tg.id, kind: 'reaction', element: 'electro', reaction: 'electro-charged', multiplier: 2,
      gaugeBefore: before, gaugeAfter: h ? Math.max(0, h.gauge) : 0, damage: dmg, transDamage: dmg });
  }
  function advance(t) {
    for (;;) {
      let tick = null;
      for (const d of defs) if (d.ec && d.ec.next <= t && (!tick || d.ec.next < tick.ec.next)) tick = d;
      const ev = idx < events.length && events[idx].t <= t ? events[idx] : null;
      if (ev && (!tick || ev.t <= tick.ec.next)) { idx++; onHit(ev); }
      else if (tick) onEcTick(tick, tick.ec.next);
      else break;
    }
  }

  C.addTarget = (d) => { defs.push(fresh(d)); reset(); view(0); return C; };
  C.schedule = (evs) => {
    events = evs.map((e, i) => [e, i]).sort((a, b) => a[0].t - b[0].t || a[1] - b[1]).map((p) => p[0]);
    reset(); view(0);
  };
  // 向前：只处理新事件；向后：从 0 重放。内部状态只由事件决定，与 seek 路径无关
  C.seek = (t) => { if (t < now) reset(); advance(t); now = t; view(t); };
  C.stats = () => {
    const s = { hits: 0, applies: 0, refreshes: 0, blocked: 0, reactions: {}, totalDamage: 0 };
    for (const e of C.log) {
      s.totalDamage += e.damage;
      if (e.kind === 'blocked_icd') s.blocked++;
      else if (e.kind === 'apply') s.applies++;
      else if (e.kind === 'refresh') s.refreshes++;
      else if (e.kind === 'reaction') s.reactions[e.reaction] = (s.reactions[e.reaction] || 0) + 1;
      if (!(e.kind === 'reaction' && e.element === 'electro' && e.reaction === 'electro-charged' && e.transDamage === e.damage)) s.hits++;
    }
    return s;
  };
  return C;
}
