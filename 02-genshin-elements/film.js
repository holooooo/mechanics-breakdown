// 机制拆解 02 · 原神元素反应 — film composer. renderFrame(t) is a pure function of t; all timing from timeline.js.
import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter } from './src/sim.js';
import { createCombat, auraDuration } from './src/combat.js';

const $ = id => document.getElementById(id);
const TL = window.TIMELINE;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const ramp = (t, a, d = 0.5) => ease((t - a) / d);
const win = (t, a, b, d = 0.4) => Math.min(ramp(t, a, d), 1 - ramp(t, b - d, d));
const lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const orbit = (r, yaw, h, tgt = [0, 0, 0]) => [tgt[0] + Math.cos(yaw) * r, tgt[1] + h, tgt[2] + Math.sin(yaw) * r];

window.DURATION = TL.duration;
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i];
const rel = (id, i, o = 0) => L(id, i).start - SC[id].start + o;
const script = await fetch('./script.json').then(r => r.json());
const codeSrc = await fetch('./src/combat.js').then(r => r.text());
const FOOT_END = L('hook', 1).end + 0.3, FOOT_N = 327;

const world = await createWorld($('gl'), { width: 1920, height: 1080, quality: 1 });
window.WORLD = world;

// ---------------- data ----------------
const D = { a: { id: 'a', x: 0.2, z: 0.4, name: '木桩 A' }, b: { id: 'b', x: 1.0, z: -1.4, name: '木桩 B' }, c: { id: 'c', x: -1.2, z: -1.0, name: '木桩 C' } };
const YAW = 2.55;
const COL = { pyro: '#ff7a2a', hydro: '#3aa0ff', electro: '#b07cff', cryo: '#9fe8ff', anemo: '#6fe0b8', geo: '#ffcc55', dendro: '#8fdc4a' };
const GLY = { pyro: '火', hydro: '水', electro: '雷', cryo: '冰', anemo: '风', geo: '岩', dendro: '草' };
const RXN = { vaporize: '蒸发', melt: '融化', overloaded: '超载', 'electro-charged': '感电', superconduct: '超导', swirl: '扩散', crystallize: '结晶', frozen: '冻结' };
const sims = new Map(), combats = new Map();
function shotSim(key, layout, ev) {
  if (!sims.has(key)) { const s = createSim(layout); Object.assign(s, { CELL, cellAt, cellCenter }); s.schedule(ev); sims.set(key, s); }
  return sims.get(key);
}
function shotCombat(key, ids, ev) {
  if (!combats.has(key)) { const c = createCombat(); for (const k of ids) c.addTarget({ ...D[k] }); c.schedule(ev); combats.set(key, c); }
  return combats.get(key);
}
const hit = (t, target, element, dmg = 1000, extra = {}) => ({ t, type: 'hit', target, element, units: 1, dmg, src: extra.src || element + t, icd: !!extra.icd, ...extra });
const CALM = [{ t: 0, type: 'wind', x: 0.4, z: 0.2 }];

// ---------------- shots ----------------
const shots = {
  hook(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const u = Math.max(0, lt - FOOT_END + 0.3);
    const cb = shotCombat('hook', ['a'], [hit(FOOT_END + 0.4, 'a', 'pyro', 1200), hit(FOOT_END + 1.8, 'a', 'hydro', 1200)]);
    const tg = [D.a.x, 1.0, D.a.z];
    const cam = { pos: orbit(lerp(3.4, 6.5, easeOut(u / 5)), YAW + 0.25 - u * 0.03, lerp(0.9, 2.2, easeOut(u / 5)), tg), target: tg, fov: 38 };
    return { sim, simT: lt + 20, cb, cbT: lt, ids: ['a'], view: { cam, sky: { a: 'dusk', b: 'day', k: 0.3 }, bloom: 0.75 } };
  },
  contrast(t, lt) {
    const sim = shotSim('contrast', 'meadow', [{ t: 0, type: 'wind', x: 0.9, z: 0.2 }, { t: 0.2, type: 'ignite', x: -3.4, z: -0.6, r: 0.5 }]);
    const ev = []; for (let k = 0; k < 6; k++) ev.push(hit(0.5 + k * 3.2, 'a', 'pyro', 900));
    const cb = shotCombat('contrast', ['a'], ev);
    const k = ramp(lt, rel('contrast', 1) - 0.2, 1.6);
    const tg = lerp3([-0.8, 0.3, 0], [D.a.x, 1.0, D.a.z], k);
    const cam = { pos: orbit(lerp(15, 6, k), lerp(1.0 + lt * 0.015, YAW, k), lerp(8, 2.6, k), tg), target: tg, fov: 32 };
    return { sim, simT: lt + 6, cb, cbT: lt, ids: ['a'], view: { cam, sky: 'day', data: 0.55 * (1 - k), grid: 0.6 * (1 - k), field: [1, 0, 0, 0] } };
  },
  gauge(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const a0 = rel('gauge', 0, 1.2), a3 = rel('gauge', 3, 1.0);
    const cb = shotCombat('gauge', ['a'], [hit(a0, 'a', 'pyro', 900), hit(a3, 'a', 'pyro', 900)]);
    const tg = [D.a.x, 1.1, D.a.z];
    const cam = { pos: orbit(6.2, YAW - 0.15 + lt * 0.008, 0.9, tg), target: [tg[0], tg[1] + 0.55, tg[2] + 0.6], fov: 38 };
    return { sim, simT: lt + 40, cb, cbT: lt, ids: ['a'], view: { cam, sky: 'day' }, vigL: 1 };
  },
  react(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const l1 = rel('react', 1), l2 = rel('react', 2), l3 = rel('react', 3);
    const cb = shotCombat('react', ['a', 'b', 'c'], [
      hit(0.4, 'a', 'pyro', 1000), hit(l1 + 0.9, 'a', 'hydro', 1000),
      hit(l2 - 1.2, 'b', 'hydro', 1000), hit(l2 + 0.9, 'b', 'pyro', 1000),
      hit(l3 - 1.0, 'c', 'pyro', 1000), hit(l3 + 1.0, 'c', 'electro', 1000)]);
    const pick = lt < l2 - 0.4 ? D.a : lt < l3 - 0.4 ? D.b : D.c;
    const prev = lt < l2 - 0.4 ? D.a : lt < l3 - 0.4 ? D.a : D.b;
    const sw = lt < l2 - 0.4 ? 1 : lt < l3 - 0.4 ? ramp(lt, l2 - 0.4, 0.8) : ramp(lt, l3 - 0.4, 0.8);
    const tg = lerp3([prev.x, 1.1, prev.z], [pick.x, 1.1, pick.z], sw);
    const cam = { pos: orbit(6.4, YAW - 0.1, 1.0, tg), target: [tg[0], tg[1] + 0.5, tg[2] - 1.0], fov: 38 };
    return { sim, simT: lt + 60, cb, cbT: lt, ids: ['a', 'b', 'c'], view: { cam, sky: 'day' }, vigL: 1 };
  },
  icd(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const s0 = rel('icd', 2, 0.4), ev = [];
    for (let k = 0; k < 7; k++) ev.push(hit(s0 + k * 0.32, 'a', 'pyro', 600, { src: 'bow', icd: true }));
    const cb = shotCombat('icd', ['a'], ev);
    const tg = [D.a.x, 1.1, D.a.z];
    const cam = { pos: orbit(6.2, YAW + 0.1 - lt * 0.01, 0.9, tg), target: [tg[0], tg[1] + 0.6, tg[2]], fov: 38 };
    return { sim, simT: lt + 80, cb, cbT: lt, ids: ['a'], view: { cam, sky: { a: 'day', b: 'dusk', k: 0.3 } }, s0 };
  },
  impl(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const ev = [hit(0.5, 'a', 'pyro', 900), hit(3.0, 'a', 'pyro', 900), hit(6.8, 'a', 'hydro', 900), hit(8.6, 'a', 'pyro', 900), hit(11.5, 'a', 'electro', 900)];
    const cb = shotCombat('impl', ['a'], ev);
    const tg = [D.a.x, 1.0, D.a.z];
    return { sim, simT: lt + 100, cb, cbT: lt, ids: ['a'], view: { cam: { pos: orbit(6, YAW + lt * 0.01, 2, tg), target: tg, fov: 34 }, sky: { a: 'day', b: 'dusk', k: 0.5 } }, dim: 0.62 };
  },
  demo(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const ev = [hit(0.3, 'a', 'pyro'), hit(0.6, 'b', 'pyro'), hit(0.9, 'c', 'hydro'),
      hit(2.0, 'a', 'hydro', 1100), hit(3.0, 'b', 'electro', 1100), hit(4.2, 'c', 'electro', 900),
      hit(6.0, 'a', 'pyro', 1000), hit(7.2, 'b', 'hydro', 900), hit(7.6, 'a', 'hydro', 1100)];
    const cb = shotCombat('demo', ['a', 'b', 'c'], ev);
    const tg = [0.0, 1.0, -0.6];
    return { sim, simT: lt + 120, cb, cbT: lt, ids: ['a', 'b', 'c'], view: { cam: { pos: orbit(8.5, YAW - 1.0 + lt * 0.03, 3.4, tg), target: tg, fov: 36 }, sky: 'day', bloom: 0.75 } };
  },
  compare(t, lt) {
    const sim = shotSim('compare', 'meadow', [{ t: 0, type: 'wind', x: 1.0, z: 0.2 }, { t: 0.2, type: 'ignite', x: -3.6, z: 0.4, r: 0.5 }]);
    const ev = []; for (let k = 0; k < 5; k++) { ev.push(hit(0.6 + k * 2.4, 'a', 'pyro', 900)); ev.push(hit(1.6 + k * 2.4, 'a', 'hydro', 900)); }
    const cb = shotCombat('compare', ['a'], ev);
    const tg = [-0.6, 0.4, 0];
    return { sim, simT: lt + 8, cb, cbT: lt, ids: ['a'], view: { cam: { pos: orbit(14.5, 0.95 + lt * 0.012, 7, tg), target: tg, fov: 32 }, sky: { a: 'day', b: 'dusk', k: ease(lt / 12) * 0.7 }, bloom: 0.7 } };
  },
  teaser(t, lt) {
    const sim = shotSim('calm', 'meadow', CALM);
    const cb = shotCombat('teaser', ['a'], []);
    return { sim, simT: lt + 130, cb, cbT: lt, ids: [], view: { cam: { pos: orbit(10, 2.0, 4, [0, 0.5, 0]), target: [0, 0.5, 0], fov: 34 }, sky: 'dusk' } };
  },
  outro(t, lt) {
    const sim = shotSim('outro', 'meadow', [{ t: 0, type: 'wind', x: 0.6, z: 0.2 }, { t: 0.2, type: 'ignite', x: -3.4, z: -0.6, r: 0.5 }]);
    const cb = shotCombat('outro', ['a'], []);
    const fade = ramp(t, TL.duration - 1.2, 1.2);
    return { sim, simT: lt + 14, cb, cbT: lt, ids: ['a'], view: { cam: { pos: orbit(24, 1.9 + lt * 0.02, 10), target: [0, -1, 0], fov: 30 }, sky: 'dusk', fade }, dim: 0.55 };
  },
};

// ---------------- DOM helpers ----------------
const railEl = $('rail');
railEl.innerHTML = TL.scenes.map(() => '<i></i>').join('') + '<em></em>';
const railBars = [...railEl.querySelectorAll('i')], railLabel = railEl.querySelector('em');
const op = (el, v) => { el.style.opacity = Math.max(0, v).toFixed(3); };
const tf = (el, s) => { el.style.transform = s; };
let lastCards = '', lastHud = '', lastAnno = '', lastCode = '';
const setHTML = (el, h, key) => { if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } };
function setImg(el, src) { if (el.dataset.src === src) return null; el.dataset.src = src; el.src = src; return el.decode().catch(() => {}); }
const sceneAt = t => { let s = TL.scenes[0]; for (const x of TL.scenes) if (t >= x.start) s = x; return s; };
const icons = {
  like: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 9h8M12 9v8M9 13h6"/></svg>',
  fav: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7-1.6 7z"/></svg>',
};
function codeHTML(region, hl = -1) {
  const m = codeSrc.indexOf('//#region ' + region); if (m < 0) return '';
  const end = codeSrc.indexOf('//#endregion', m);
  const lines = codeSrc.slice(codeSrc.indexOf('\n', m) + 1, end).replace(/\s+$/, '').split('\n').slice(0, 15);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return lines.map((ln, k) => {
    let h = esc(ln); const ci = h.indexOf('//');
    let code = ci >= 0 ? h.slice(0, ci) : h; const cm = ci >= 0 ? h.slice(ci) : '';
    code = code.replace(/\b(function|const|let|if|else|return|for|of|new)\b/g, '<span class="kw">$1</span>').replace(/\b(\d+(\.\d+)?)\b/g, '<span class="num">$1</span>').replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="fn">$1</span>');
    return `<span class="ln${k === hl ? ' hl' : ''}">${code}${cm ? `<span class="cm">${cm}</span>` : ''} </span>`;
  }).join('');
}

// unit HUD + damage numbers + fx from combat state
function combatLayer(shot, t, project) {
  const cb = shot.cb; if (!cb) return { hud: '', fx: [], dummies: [] };
  cb.seek(shot.cbT);
  const lt = shot.cbT;
  let hud = '';
  const dummies = [], fx = [];
  for (const id of shot.ids) {
    const d = D[id], tg = cb.targets.find(x => x.id === id);
    const recent = cb.log.filter(e => e.target === id && e.t <= lt && lt - e.t < 2.2);
    const lastHitAge = recent.length ? lt - recent[recent.length - 1].t : 9;
    const main = tg.auras[0];
    dummies.push({ x: d.x, z: d.z, aura: main?.element, auraK: main ? clamp(main.gauge / 0.8) : 0, flash: Math.max(0, 1 - lastHitAge / 0.25), yaw: -0.6 });
    const y = world.heightAt(d.x, d.z);
    for (const e of recent) { const age = lt - e.t; if (age > 1.3) continue; if (e.kind !== 'blocked_icd' || age < 0.5) fx.push({ type: e.element, x: d.x, y: y + 1.1, z: d.z, age: age + 0.35, from: [d.x - 2.4, y + 1.6, d.z + 1.6], big: e.kind === 'reaction', steam: e.reaction === 'vaporize', seed: Math.round(e.t * 10) }); }
    if (!project) continue;
    const p = world.project(d.x, y + 2.05, d.z);
    if (p.z > 1) continue;
    const els = tg.auras.map(a => `<div class="el" style="background:${COL[a.element]};color:${COL[a.element]}"><span style="color:#fff">${GLY[a.element]}</span></div>`).join('');
    const bars = tg.auras.map(a => `<div class="bar"><i style="width:${clamp(a.gauge / 1.6) * 100}%;background:${COL[a.element]}"></i></div><div class="u" style="color:${COL[a.element]}">${a.gauge.toFixed(2)}U</div>`).join('');
    hud += `<div class="unit" style="left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px"><div class="els">${els}</div>${bars}</div>`;
    for (const e of recent) {
      const age = lt - e.t, k = 1 - Math.pow(age / 2.2, 3);
      const q = world.project(d.x + 0.3, y + 1.3 + age * 0.9, d.z);
      const isR = e.kind === 'reaction';
      const col = isR ? (e.reaction === 'overloaded' ? '#ff6a8a' : e.reaction === 'electro-charged' ? '#c58cff' : '#ffb347') : (e.kind === 'blocked_icd' ? '#d8d8d8' : COL[e.element]);
      const sc = 1 + Math.max(0, 0.35 - age) * 1.4;
      hud += `<div class="dmg" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;color:${col};opacity:${k.toFixed(2)};transform:translate(-50%,-50%) scale(${sc.toFixed(2)})">${Math.round(e.damage)}</div>`;
      if (isR) {
        const r = world.project(d.x - 0.2, y + 2.4 + age * 0.25, d.z);
        const lab = RXN[e.reaction] + (e.multiplier > 1 && (e.reaction === 'vaporize' || e.reaction === 'melt') ? ` ×${e.multiplier}` : '');
        hud += `<div class="rx" style="left:${r.x.toFixed(0)}px;top:${r.y.toFixed(0)}px;color:${col};opacity:${k.toFixed(2)}">${lab}</div>`;
      }
    }
  }
  return { hud, fx, dummies };
}

// ---------------- 2D cards per scene ----------------
function cards(id, t, lt, shot) {
  const appear = (a, d = 0.45) => easeOut((t - a) / d);
  const pop = a => { const k = appear(a); return `opacity:${k.toFixed(3)};transform:translateY(${((1 - k) * 24).toFixed(1)}px)`; };
  if (id === 'contrast') {
    const k0 = win(t, L(id, 0).start + 0.3, L(id, 1).start + 0.2), k1 = appear(L(id, 1).start + 0.6);
    return `<div class="card" style="left:120px;top:200px;width:560px;${'opacity:' + k0.toFixed(2)}"><h3>塞尔达 · 算世界</h3><div class="big" style="font-size:38px">状态在<span style="color:#ffb347">格子之间</span>传播</div><p style="margin-top:10px">每一格：温度 / 湿度 / 燃料……</p></div>
      <div class="card" style="right:120px;top:200px;width:600px;${pop(L(id, 1).start + 0.6)}"><h3>原神 · 算伤害</h3><div class="big" style="font-size:38px">元素<span style="color:#ff7a2a">附着在单位</span>身上</div><p style="margin-top:10px">每个敌人：一张会衰减的附着表</p></div>`;
  }
  if (id === 'gauge') {
    const l = SC.gauge.lines;
    // gauge-vs-time chart
    const W = 640, H = 300, T = 10;
    const curve = []; for (let i = 0; i <= 60; i++) { const s = i / 60 * T; const g = Math.max(0, 0.8 - 0.8 * s / 9.5); curve.push(`${(40 + s / T * (W - 60)).toFixed(1)},${(H - 30 - g / 1.0 * (H - 60)).toFixed(1)}`); }
    const cur = clamp((t - l[2].start - 0.3) / (l[2].end - l[2].start - 0.6)) * 9.5;
    const cx = 40 + cur / T * (W - 60), cy = H - 30 - Math.max(0, 0.8 - 0.8 * cur / 9.5) * (H - 60);
    const k2 = appear(l[2].start + 0.2), k1 = appear(l[1].start + 0.2), k3 = appear(l[3].start + 0.3);
    return `<div class="card" style="right:70px;top:170px;width:700px;${pop(l[0].start + 0.4)}"><h3>元素量 · 据玩家实测</h3>
      <div style="display:flex;align-items:center;gap:24px;font:800 54px 'SF Mono',Menlo,monospace"><span style="color:#ff7a2a">1U</span><span style="font-size:40px;color:#ffcf73">→</span><span style="color:#ff7a2a;opacity:${k1.toFixed(2)}">0.8U</span><span style="font:700 24px 'PingFang SC';color:#ffb3b3;opacity:${k1.toFixed(2)}">附着税 −20%</span></div>
      <svg width="${W}" height="${H}" style="margin-top:14px;opacity:${k2.toFixed(2)}"><line x1="40" y1="${H - 30}" x2="${W - 20}" y2="${H - 30}" stroke="rgba(255,255,255,.3)"/><line x1="40" y1="20" x2="40" y2="${H - 30}" stroke="rgba(255,255,255,.3)"/>
        <polyline points="${curve.join(' ')}" fill="none" stroke="#ff7a2a" stroke-width="5"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" fill="#fff"/><text x="${(cx + 14).toFixed(0)}" y="${(cy - 12).toFixed(0)}" fill="#fff" font-size="22" font-family="SF Mono">${cur.toFixed(1)}s</text>
        <text x="${(40 + 9.5 / T * (W - 60) - 50).toFixed(0)}" y="${H - 6}" fill="#ffcf73" font-size="20">9.5 s 消失</text><text x="48" y="44" fill="#ffcf73" font-size="20">0.8U</text></svg>
      <div style="opacity:${k3.toFixed(2)};margin-top:8px;font:700 30px 'SF Mono',Menlo,monospace">剩 0.6U + 新 0.8U → <span style="color:#7ee08f">max = 0.8U</span><span style="font:600 22px 'PingFang SC';color:#b9c5cd">（不叠加）</span></div></div>`;
  }
  if (id === 'react') {
    const l = SC.react.lines;
    const row = (a, b, name, m, c, at, col) => `<tr style="${pop(at)}"><td><span style="color:${COL[a]}">${GLY[a]}</span> → <span style="color:${COL[b]}">${GLY[b]}</span></td><td style="color:${col}">${name}</td><td>${m}</td><td>${c}</td></tr>`;
    return `<div class="card" style="left:92px;top:430px;width:720px;${pop(l[1].start)}"><table class="gtable"><tr><th>后手 → 附着</th><th>反应</th><th>伤害</th><th>消耗</th></tr>
      ${row('hydro', 'pyro', '强蒸发', '×2', '2 倍', l[1].start + 0.5, '#ffb347')}${row('pyro', 'hydro', '弱蒸发', '×1.5', '0.5 倍', l[2].start + 0.5, '#ffb347')}${row('electro', 'pyro', '超载（剧变）', '不暴击', '1 倍', l[3].start + 0.5, '#ff6a8a')}</table>
      <p style="margin-top:12px;font-size:20px;opacity:${appear(l[3].start + 1.5).toFixed(2)}">剧变伤害只看角色等级与元素精通 · 据玩家实测</p></div>`;
  }
  if (id === 'icd') {
    const s0 = SC.icd.start + shot.s0;
    const chips = Array.from({ length: 7 }, (_, k) => { const at = s0 + k * 0.32; const on = t >= at; const app = on && (k % 3 === 0); return `<div class="${on ? (app ? 'on' : 'off') : ''}" style="color:${app ? '#fff' : '#999'}">${k + 1}${on ? (app ? '🔥' : '') : ''}</div>`; }).join('');
    const k1 = appear(L(id, 1).start + 0.2);
    return `<div class="card" style="left:90px;top:170px;width:820px;opacity:${k1.toFixed(2)}"><h3>标准附着冷却 · 据玩家实测</h3><div class="big" style="font-size:44px">每 <span style="color:#ffb347">3 下</span> 或 每 <span style="color:#ffb347">2.5 秒</span>，挂一次元素</div></div>
      <div style="position:absolute;left:0;right:0;bottom:190px;opacity:${appear(s0 - 0.5).toFixed(2)}" class="chip7">${chips}</div>`;
  }
  if (id === 'impl') {
    const tg = shot.cb.targets[0];
    const rows = tg.auras.map(a => `<tr><td style="color:${COL[a.element]}">${a.element}</td><td>${a.gauge.toFixed(2)}U</td><td>${(1 / a.decay).toFixed(2)} s/U</td></tr>`).join('') || '<tr><td colspan="3" style="color:#8fa2ae">（空）</td></tr>';
    return `<div class="card" style="left:90px;top:200px;width:620px;${pop(L(id, 0).start + 0.4)}"><h3>敌人.auras · 附着表</h3><table class="gtable"><tr><th>元素</th><th>元素量</th><th>衰减</th></tr>${rows}</table></div>
      <div class="card" style="left:90px;top:560px;width:620px;${pop(L(id, 1).start + 0.3)}"><h3>一次命中</h3><div class="flow" style="flex-wrap:wrap"><div class="node">查冷却<small>ICD</small></div><div class="arr">→</div><div class="node">查附着表<small>能反应？</small></div><div class="arr">→</div><div class="node">消耗 / 附着<small>按倍率</small></div><div class="arr">→</div><div class="node" style="opacity:${appear(L(id, 2).start + 0.3).toFixed(2)}">算伤害<small>增幅 / 剧变</small></div></div></div>`;
  }
  if (id === 'demo') {
    return `<div class="card" style="left:90px;top:170px;width:560px;${pop(SC.demo.start + 0.3)}"><h3>效果预览 · 网页可玩</h3><p style="font-size:24px;color:#fff">给木桩挂火 → 浇水 → 看附着条被吃掉</p><p style="font-size:20px">源码：src/combat.js（附着 / 反应 / 冷却）</p></div>`;
  }
  if (id === 'compare') {
    const k = win(t, L(id, 0).start + 0.3, SC.compare.end - 0.2);
    return `<div style="position:absolute;left:150px;top:220px;font-size:64px;font-weight:900;opacity:${k.toFixed(2)};text-shadow:0 6px 30px #000">算<span style="color:#ffb347">世界</span><div style="font-size:24px;font-weight:600;color:#ffe0a0;margin-top:8px">塞尔达 · 规则在格子之间传播</div></div>
      <div style="position:absolute;right:150px;top:220px;text-align:right;font-size:64px;font-weight:900;opacity:${(k * appear(L(id, 0).start + 2.4)).toFixed(2)};text-shadow:0 6px 30px #000">算<span style="color:#ff7a2a">伤害</span><div style="font-size:24px;font-weight:600;color:#ffe0a0;margin-top:8px">原神 · 规则在单位身上结算</div></div>`;
  }
  if (id === 'outro') {
    const l0 = L(id, 0), l1 = L(id, 1); const k = appear(SC.outro.start + 0.1, 0.7);
    const on = n => t > l0.start + 1.6 + n * 0.45; const follow = appear(l0.start + 3.2);
    return `<div class="endcard" style="opacity:${k.toFixed(3)}"><img class="av" src="brand/avatar.png" style="transform:scale(${(0.8 + 0.2 * k).toFixed(3)})"><div class="id">粑粑柑（梭哈ai版）</div><div class="sub">机制拆解 · 用代码拆游戏</div>
      <div class="btns">${[['like', '点赞'], ['coin', '投币'], ['fav', '收藏']].map(([ic, lb], n) => `<div class="btn${on(n) ? ' on' : ''}">${icons[ic]}${lb}</div>`).join('')}</div>
      <div class="follow" style="opacity:${follow.toFixed(3)};transform:scale(${(0.9 + 0.1 * follow).toFixed(3)})">+ 关注</div>
      <div style="margin-top:26px;font-size:24px;color:#ffe0a0;opacity:${appear(l1.start + 0.3).toFixed(3)}">机制拆解 · 下期见</div></div>`;
  }
  return '';
}
function big(id, t) {
  let k = 0, html = '';
  if (id === 'hook') {
    const q = win(t, L('hook', 1).start + 2.2, FOOT_END, 0.3), b = win(t, L('hook', 2).start + 0.3, SC.hook.end, 0.4);
    if (q > 0) { k = q; html = '<div class="l1">这个<span class="acc">翻倍</span>，怎么算的？</div><div class="l2">HOW IS THE DOUBLE CALCULATED?</div>'; }
    if (b > 0) { k = b; html = '<div class="l1">同一把火，<span class="acc">两种算法</span></div><div class="l2">机制拆解 02 · 原神元素反应</div>'; }
  } else if (id === 'teaser') {
    const a = win(t, L('teaser', 0).start + 0.4, SC.teaser.end - 0.2, 0.4);
    if (a > 0) { k = a; html = t < L('teaser', 1).start ? '<div class="l1">敌人在<span class="acc">读你的按键</span>？</div><div class="l2">下期预告 · 机制拆解 03</div>' : '<div class="l1">读指令<span class="acc">简史</span></div><div class="l2">魂系列 → 影之刃零</div>'; }
  } else if (id === 'icd') {
    const a = win(t, L('icd', 0).start + 0.1, L('icd', 0).end + 0.3, 0.3);
    if (a > 0) { k = a; html = '<div class="l1">隐藏规则：<span class="acc">元素附着冷却</span></div>'; }
  } else if (id === 'react') {
    const a = win(t, L('react', 0).start + 0.2, L('react', 0).end, 0.35);
    if (a > 0) { k = a; html = '<div class="l1">反应 = <span class="acc">后手元素吃掉附着</span></div>'; }
  }
  setHTML($('bigtext'), html); op($('bigtext'), k); tf($('bigtext'), `scale(${(0.94 + 0.06 * easeOut(k)).toFixed(3)})`);
}

// ---------------- main ----------------
window.renderFrame = async function (t) {
  t = clamp(t, 0, TL.duration - 1e-3);
  const S = sceneAt(t), id = S.id, lt = t - S.start, si = TL.scenes.indexOf(S);
  const shot = shots[id](t, lt);
  shot.sim.seek(shot.simT); world.setSim(shot.sim);
  const C = combatLayer(shot, t, false);
  const toNext = (TL.scenes[si + 1]?.start ?? 1e9) - t;
  const dip = Math.max(clamp(1 - lt / 0.35) * (si > 0 ? 1 : 0), clamp(1 - toNext / 0.25)) * 0.85;
  const gc = { pyro: [1, .5, .15], hydro: [.3, .65, 1], electro: [.75, .45, 1] };
  world.render(shot.simT, { ...shot.view, fade: Math.max(shot.view.fade || 0, dip), dummies: C.dummies, fx: C.fx });
  C.hud = combatLayer(shot, t, true).hud;

  op($('dim'), shot.dim ?? 0); op($('vignetteL'), (shot.vigL ?? 0) * ease(lt / 0.6));
  railBars.forEach((b, k) => b.className = k < si ? 'done' : k === si ? 'on' : '');
  railLabel.textContent = script.scenes[si].kicker;
  // left panel title
  const showPanel = ['gauge', 'react', 'icd', 'impl'].includes(id);
  const pk = showPanel ? easeOut(lt / 0.7) * clamp(toNext / 0.4) : 0;
  op($('panel'), pk); tf($('panel'), `translateX(${((1 - pk) * -30).toFixed(1)}px)`);
  if (showPanel) { $('kicker').textContent = script.scenes[si].kicker; $('title').textContent = script.scenes[si].title.replace('，', '，\n'); $('bullets').innerHTML = ''; }
  if (id === 'icd' || id === 'impl') op($('panel'), 0);
  setHTML($('cards'), cards(id, t, lt, shot));
  // code panel
  let codeK = 0;
  if (id === 'impl') { codeK = win(t, L('impl', 0).start + 1.0, S.end - 0.2, 0.5); const reg = t < L('impl', 1).start ? 'aura' : t < L('impl', 2).start ? 'apply' : 'react'; if (lastCode !== reg) { lastCode = reg; $('codebody').innerHTML = codeHTML(reg); $('coderegion').textContent = '//#region ' + reg; $('codefile').textContent = 'src/combat.js'; } }
  else if (id === 'icd') { codeK = win(t, L('icd', 1).start + 0.6, L('icd', 2).start + 0.2, 0.4); if (lastCode !== 'icd') { lastCode = 'icd'; $('codebody').innerHTML = codeHTML('icd'); $('coderegion').textContent = '//#region icd'; $('codefile').textContent = 'src/combat.js'; } }
  op($('code'), codeK); tf($('code'), `translateY(${((1 - codeK) * 24).toFixed(1)}px)`);
  // hud
  setHTML($('hud'), (id === 'hook' && t < FOOT_END) || id === 'outro' ? '' : C.hud);
  op($('inspector'), 0); op($('legend'), 0); setHTML($('anno'), '');
  // gameplay footage
  const waits = [];
  const isT = id === 'teaser';
  const fk = id === 'hook' ? 1 - ramp(t, FOOT_END - 0.25, 0.4) : isT ? ramp(lt, 0, 0.3) * clamp(toNext / 0.3) : 0;
  op($('foot'), fk); op($('footlabel'), fk);
  if (fk > 0 && !isT) { const n = clamp(Math.floor(t * 30) + 1, 1, FOOT_N); waits.push(setImg($('foot'), `footage/frames/f${String(n).padStart(4, '0')}.jpg`)); $('footlabel').textContent = '实机画面 · 原神（© HoYoverse）'; }
  if (fk > 0 && isT) { const n = clamp(Math.floor(lt * 30) + 1, 1, 270); waits.push(setImg($('foot'), `footage/pb0_frames/f${String(n).padStart(4, '0')}.jpg`)); $('footlabel').textContent = '实机画面 · 影之刃零（© S-GAME）'; }
  await Promise.all(waits.filter(Boolean));
  big(id, t);
  const sub = TL.subs.find(c => t >= c.start && t < c.end + 0.12);
  $('szh').textContent = sub?.zh || ''; $('sen').textContent = sub?.en || '';
  $('szh').style.visibility = $('sen').style.visibility = sub ? 'visible' : 'hidden';
  $('progress').firstElementChild.style.transform = `scaleX(${(t / TL.duration).toFixed(4)})`;
  op($('flash'), 0);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
};
await window.renderFrame(Number(location.hash.slice(1)) || 0);
window.READY = true;
