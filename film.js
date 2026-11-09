// Film composer: renderFrame(t) is a pure function of t. All timing comes from timeline.js (voice).
import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter, N } from './src/sim.js';

const $ = id => document.getElementById(id);
const TL = window.TIMELINE;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const ramp = (t, a, d = 0.5) => ease((t - a) / d);               // 0→1 starting at a over d
const win = (t, a, b, d = 0.4) => Math.min(ramp(t, a, d), 1 - ramp(t, b - d, d));
const lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const orbit = (r, yaw, h, tgt = [0, 0, 0]) => [tgt[0] + Math.cos(yaw) * r, tgt[1] + h, tgt[2] + Math.sin(yaw) * r];

window.DURATION = TL.duration;
const FOOT_END = TL.scenes[0].lines[1].end + 0.3; // gameplay footage covers hook lines 1-2
const FOOT_N = 252, GI_N = 222;
const imgCache = new Map();
function setImg(el, src) { if (el.dataset.src === src) return null; el.dataset.src = src; el.src = src; return el.decode().catch(() => {}); }
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i];
const script = await fetch('./script.json').then(r => r.json());
const simSrc = await fetch('./src/sim.js').then(r => r.text());

const world = await createWorld($('gl'), { width: 1920, height: 1080, quality: 1 });
window.WORLD = world;

// ---------------- sims per shot (layout + schedule in shot-local seconds) ----------------
const sims = new Map();
function shotSim(key, layout, events) {
  if (!sims.has(key)) {
    const s = createSim(layout);
    Object.assign(s, { CELL, cellAt, cellCenter });
    s.schedule(events);
    sims.set(key, s);
  }
  return sims.get(key);
}
const rel = (id, i, off = 0) => L(id, i).start - SC[id].start + off;   // line start in scene-local time

// ---------------- shot definitions ----------------
// each returns { sim, simT, view, ui }
const W0 = { x: 1.3, z: 0.35 };
const shots = {
  hook(t, lt) {
    const pre = 7; lt = Math.max(0, lt - FOOT_END + 0.4);
    const sim = shotSim('hook', 'meadow', [
      { t: 0, type: 'wind', ...W0 }, { t: 0.2, type: 'ignite', x: -3.2, z: -0.6, r: 0.45 },
      { t: 0.1, type: 'glider', on: true, x: -1.0, y: 1.6, z: -1.6 },
    ]);
    const k = ease(lt / (SC.hook.end - FOOT_END));
    const tgt = lerp3([-2.2, 0.4, -0.5], [0.2, 1.6, 0], k);
    const yaw = lerp(2.3, 1.35, k);
    const cam = { pos: orbit(lerp(4.2, 21, easeOut(lt / 8)), yaw, lerp(1.0, 8.5, easeOut(lt / 8)), tgt), target: tgt, fov: lerp(42, 30, k) };
    return { sim, simT: lt + pre, view: { cam, sky: { a: 'dawn', b: 'day', k: ease(lt / 12) }, bloom: 0.75 } };
  },
  multiply(t, lt) {
    const sim = shotSim('calm', 'meadow', [{ t: 0, type: 'wind', x: 0.5, z: 0.2 }]);
    return { sim, simT: lt + 3, view: { cam: { pos: orbit(24, 0.9 + lt * 0.02, 10), target: [0, -0.5, 0], fov: 30 }, sky: 'day' }, dim: 0.82 };
  },
  engines(t, lt) {
    const sim = shotSim('calm', 'meadow', [{ t: 0, type: 'wind', x: 0.5, z: 0.2 }]);
    return { sim, simT: lt + 30, view: { cam: { pos: orbit(17, 0.4 + lt * 0.025, 6.5), target: [0, 0.3, 0], fov: 30 }, sky: 'day' }, dim: 0.62 };
  },
  rules(t, lt) {
    // tree fire: show heat (element) crossing to neighbour tree; materials never touch directly
    const i3 = rel('rules', 2);
    const sim = shotSim('rules', 'meadow', [{ t: 0, type: 'wind', x: 0.3, z: 0 }, { t: i3 + 1.0, type: 'ignite', x: -2.6, z: 2.4, r: 0.7 }]);
    const tr = sim.trees?.length ? nearestTree(sim, -2.6, 2.4) : { x: -2.6, z: 2.4 };
    const tgt = [tr.x + 1.4, 0.6, tr.z - 0.2];
    const dataK = win(lt, rel('rules', 4) - 0.2, 99, 0.6);
    const cam = { pos: orbit(lerp(9.5, 8, ease(lt / 25)), 0.75 + lt * 0.012, lerp(4, 6, dataK), tgt), target: tgt, fov: 32 };
    return { sim, simT: lt, view: { cam, sky: 'day', data: dataK * 0.85, field: [1, 0, 0, 0], grid: dataK * 0.5 }, vigL: 1 };
  },
  data(t, lt) {
    const sim = shotSim('data', 'meadow', [{ t: 0, type: 'wind', x: 0.8, z: 0.2 }, { t: 0.5, type: 'ignite', x: 0.4, z: 0.2, r: 0.4 }, { t: 0, type: 'rain', on: false }]);
    const top = ease((lt - 0.3) / 3.2);
    const cam = { pos: lerp3(orbit(15, 0.9, 7.5), [0.6, 15.5, 2.2], top), target: lerp3([0, 0, 0], [0.6, 0, 0.2], top), fov: lerp(30, 34, top) };
    const d1 = ramp(lt, rel('data', 1) - 0.4, 1.0);
    const f = fieldCycle(lt, rel('data', 1) + 0.6, rel('data', 2));
    return { sim, simT: lt + 2, view: { cam, sky: 'day', data: d1 * (1 - 0.65 * ramp(lt, rel('data', 2) + 0.4, 1.2)), grid: Math.max(top * 0.8, d1), field: f.v }, legend: f, inspect: { x: 1.15, z: 0.2, a: d1 } };
  },
  burn(t, lt) {
    const l1 = rel('burn', 1), l2 = rel('burn', 2);
    const sim = shotSim('burn', 'meadow', [{ t: 0, type: 'wind', x: 0, z: 0 }, { t: 1.2, type: 'ignite', x: -1.2, z: 0.6, r: 0.35 }, { t: l2 + 1.2, type: 'wind', x: 1.8, z: 0.3 }]);
    const tgt = [-0.2, 0.2, 0.5];
    const cam = { pos: orbit(lerp(10, 14, ease(lt / 20)), 1.05 - lt * 0.012, lerp(5.5, 9, ease(lt / 20)), tgt), target: tgt, fov: 30 };
    const dk = win(lt, l1 - 0.2, l2 + 0.6, 0.5);
    return { sim, simT: lt, view: { cam, sky: 'day', data: dk * 0.8, grid: dk * 0.6, field: [1, 0, 0, 0], focus: { i: cellAt(-0.2, 0.6), amount: dk } }, vigL: 1, code: 'burn' };
  },
  rain(t, lt) {
    const l0 = rel('rain', 0), l1 = rel('rain', 1);
    const pre = 16;
    const rainAt = pre + l0 + 1.4;
    const sim = shotSim('rain', 'meadow', [{ t: 0, type: 'wind', x: 1.1, z: 0.4 }, { t: 0.5, type: 'ignite', x: -3.0, z: 0.3, r: 0.5 }, { t: 3, type: 'ignite', x: -2.4, z: -2.4, r: 0.4 }, { t: rainAt, type: 'rain', on: true }]);
    const st = ease((lt - (l0 + 0.6)) / 1.5);
    const tgt = [0.5, 0.4, -0.2];
    const cam = { pos: orbit(lerp(13, 9.5, ease(lt / 18)), 1.25 + lt * 0.01, lerp(6.5, 3.2, ease(lt / 18)), tgt), target: tgt, fov: 32 };
    const fl = thunder(lt, l0 + 1.25) + thunder(lt, l1 + 2.6) * 0.6;
    return { sim, simT: lt + pre, view: { cam, sky: { a: 'day', b: 'storm', k: st }, flash: fl, bloom: 0.7 }, vigL: 1, code: lt > l1 - 0.3 ? 'rain' : null, flash: fl };
  },
  lift(t, lt) {
    const pre = 9;
    const sim = shotSim('lift', 'lift', [{ t: 0, type: 'wind', x: 0.2, z: 0.1 }, { t: 0.3, type: 'ignite', x: 0, z: 0, r: 0.6 }, { t: 0.2, type: 'glider', on: true, x: 2.5, y: 1.4, z: 1.5 }]);
    sim.seek(lt + pre);
    const g = sim.glider;
    const wideT = [lerp(0, g.x, 0.4), 0.2 + g.y * 0.62, lerp(0, g.z, 0.4)];
    const wide = { pos: orbit(12.5, 0.6 + lt * 0.04, 1.4 + g.y * 0.5, wideT), target: wideT };
    const closeT = [g.x, g.y + 0.1, g.z];
    const close = { pos: orbit(5.8, Math.atan2(g.z - sim.updraft.z, g.x - sim.updraft.x) + 0.5, 0.9, closeT), target: closeT };
    const ck = ramp(lt, rel('lift', 1) + 0.2, 1.6) * (1 - ramp(lt, rel('lift', 2) + 0.2, 1.4));
    const cam = { pos: lerp3(wide.pos, close.pos, ck), target: lerp3(wide.target, close.target, ck), fov: lerp(36, 42, ck) };
    return { sim, simT: lt + pre, view: { cam, sky: { a: 'day', b: 'dusk', k: ease(lt / 16) * 0.75 }, updraftVis: 1, bloom: 0.75 } };
  },
  iceshock(t, lt) {
    const l1 = rel('iceshock', 1);
    if (lt < l1 - 0.25) {
      const sim = shotSim('melt', 'lab', [{ t: 0.3, type: 'ignite', x: -1.1, z: 1.3, r: 0.5 }]);
      const tgt = [-1.1, 0.4, 0.4];
      const cam = { pos: orbit(lerp(5.5, 4.6, ease(lt / 8)), 1.2 + lt * 0.03, 2.4, tgt), target: tgt, fov: 36 };
      return { sim, simT: lt + 2, view: { cam, sky: 'day', bloom: 0.7 }, flash: 0 };
    }
    const u = lt - l1;
    const sim = shotSim('shock', 'lab', [{ t: 0.6, type: 'shock', on: true }]);
    const tgt = [lerp(-4, -1.5, ease(u / 4)), 0.3, 0];
    const cam = { pos: [tgt[0] + 2.2, 3.2, 5.5], target: tgt, fov: 34 };
    return { sim, simT: u, view: { cam, sky: 'day', bloom: 0.8 }, cut: ramp(lt, l1 - 0.25, 0.25) * (1 - ramp(lt, l1, 0.3)), iceBlock: u > 3 ? 1 : 0 };
  },
  chain(t, lt) {
    const sim = shotSim('chain', 'lab', [{ t: 0.05, type: 'shock', on: true }, { t: 0.1, type: 'ignite', x: -1.1, z: 1.3, r: 0.5 }]);
    const pre = 0;
    sim.seek(lt + pre);
    const powered = sim.receivers[0]?.poweredAt ?? -1;
    const tgt = lerp3([-1.3, 0.4, 0.5], [2.4, 1.0, 0], ease((lt - 1.8) / 3.4));
    const cam = { pos: orbit(lerp(7, 12, ease(lt / 9)), lerp(1.75, 1.05, ease(lt / 10)), lerp(3, 5.5, ease(lt / 9)), tgt), target: tgt, fov: 34 };
    return { sim, simT: lt + pre, view: { cam, sky: { a: 'day', b: 'dusk', k: 0.55 + 0.3 * ease(lt / 10) }, bloom: 0.85 }, powered };
  },
  build(t, lt) {
    const sim = shotSim('build', 'meadow', [{ t: 0, type: 'wind', x: 0.6, z: 0.2 }, { t: 0.5, type: 'ignite', x: 1.5, z: -1.5, r: 0.35 }]);
    return { sim, simT: lt + 4, view: { cam: { pos: orbit(20, 2.2 + lt * 0.015, 9), target: [0, -0.3, 0], fov: 30 }, sky: { a: 'day', b: 'dusk', k: 0.4 } }, dim: 0.78 };
  },
  teaser(t, lt) {
    const sim = shotSim('teaser', 'meadow', [{ t: 0, type: 'wind', ...W0 }, { t: 0.2, type: 'ignite', x: -3.2, z: -0.6, r: 0.5 }]);
    const tgt = [0.6, 0.3, 0];
    return { sim, simT: lt + 16, view: { cam: { pos: orbit(15 - lt * 0.2, 1.1 + lt * 0.02, 6.5, tgt), target: tgt, fov: 32 }, sky: 'dusk', bloom: 0.8 } };
  },
  outro(t, lt) {
    const sim = shotSim('calm', 'meadow', [{ t: 0, type: 'wind', x: 0.5, z: 0.2 }]);
    const fade = ramp(t, TL.duration - 1.2, 1.2);
    return { sim, simT: lt + 60, view: { cam: { pos: orbit(26, 1.9 + lt * 0.02, 11), target: [0, -1, 0], fov: 30 }, sky: 'dusk', fade }, dim: 0.55 };
  },
};
function nearestTree(sim, x, z) { let b = sim.trees[0], d = 1e9; for (const tr of sim.trees) { const e = (tr.x - x) ** 2 + (tr.z - z) ** 2; if (e < d) { d = e; b = tr; } } return b; }
function thunder(lt, at) { const u = lt - at; if (u < 0 || u > 0.9) return 0; return Math.max(Math.exp(-u * 9), u > 0.18 ? Math.exp(-(u - 0.18) * 12) * 0.7 : 0); }
function fieldCycle(lt, a, b) {
  const names = ['温度', '湿度', '燃料', '电荷'];
  const span = (b - a) / 4; let idx = clamp(Math.floor((lt - a) / span), 0, 3); if (lt < a) idx = 0;
  const v = [0, 0, 0, 0]; const map = [0, 1, 3, 2]; v[map[idx]] = 1;
  return { v, idx, names };
}

// ---------------- overlays ----------------
const railEl = $('rail');
railEl.innerHTML = TL.scenes.map(() => '<i></i>').join('') + '<em></em>';
const railBars = [...railEl.querySelectorAll('i')], railLabel = railEl.querySelector('em');

const icons = {
  like: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 9h8M12 9v8M9 13h6"/></svg>',
  fav: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7-1.6 7z"/></svg>',
};

function codeHTML(region, hlLine = -1) {
  const m = simSrc.indexOf('//#region ' + region); if (m < 0) return '';
  const end = simSrc.indexOf('//#endregion', m);
  let lines = simSrc.slice(simSrc.indexOf('\n', m) + 1, end).replace(/\s+$/, '').split('\n');
  lines = lines.slice(0, 16);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return lines.map((ln, k) => {
    let h = esc(ln);
    const ci = h.indexOf('//');
    let code = ci >= 0 ? h.slice(0, ci) : h, cm = ci >= 0 ? h.slice(ci) : '';
    code = code.replace(/\b(function|const|let|if|else|return|for|while|of|new)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="num">$1</span>')
      .replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="fn">$1</span>');
    return `<span class="ln${k === hlLine ? ' hl' : ''}">${code}${cm ? `<span class="cm">${cm}</span>` : ''} </span>`;
  }).join('');
}
function regionLineOf(region, needle) {
  const m = simSrc.indexOf('//#region ' + region), end = simSrc.indexOf('//#endregion', m);
  const lines = simSrc.slice(simSrc.indexOf('\n', m) + 1, end).split('\n');
  return lines.findIndex(l => l.includes(needle));
}

let lastCards = '', lastCode = '';
function setCards(html) { if (html !== lastCards) { $('cards').innerHTML = html; lastCards = html; } }
function op(el, v) { el.style.opacity = v.toFixed(3); }
function tf(el, s) { el.style.transform = s; }

function sceneAt(t) { let s = TL.scenes[0]; for (const x of TL.scenes) if (t >= x.start) s = x; return s; }

// --------- per-scene 2D layers ---------
function cardsFor(id, t, lt, info) {
  const S = SC[id];
  const appear = (a, d = 0.45) => easeOut((t - a) / d);
  const pop = (a) => { const k = appear(a); return `opacity:${k.toFixed(3)};transform:translateY(${((1 - k) * 26).toFixed(1)}px) scale(${(0.96 + 0.04 * k).toFixed(3)})`; };
  if (id === 'hook') {
    return '';
  }
  if (id === 'multiply') {
    const l0 = L(id, 0), l1 = L(id, 1), l2 = L(id, 2);
    let rooms = '';
    const labels = ['火把机关', '冰块机关', '风车机关', '电流机关', '火焰门'];
    for (let k = 0; k < 5; k++) {
      const a = l0.start + 0.6 + k * 0.55;
      rooms += `<div class="room" style="left:${40 + (k % 3) * 140}px;top:${120 + Math.floor(k / 3) * 116}px;${pop(a)}"><div style="text-align:center"><b>${['🔥', '🧊', '🌬️', '⚡', '🚪'][k]}</b><br>${labels[k]}</div></div>`;
    }
    const els = [['火', 'el-fire'], ['水', 'el-water'], ['冰', 'el-ice'], ['电', 'el-elec'], ['风', 'el-wind']];
    const mats = ['草', '木头', '金属', '水面'];
    let grid = `<div class="mgrid" style="grid-template-columns:86px repeat(4,86px)"><div></div>${mats.map((m, j) => `<div class="mhead" style="${pop(l1.start + 0.3 + j * 0.1)}">${m}</div>`).join('')}`;
    const glyph = [['燃', '燃', '热', '蒸'], ['湿', '湿', '导', '—'], ['冻', '冻', '冷', '冰'], ['电', '电', '导', '导'], ['摇', '推', '—', '浪']];
    els.forEach(([e, c], r) => {
      grid += `<div class="chip ${c}" style="margin:0;justify-content:center;${pop(l1.start + 0.6 + r * 0.12)}">${e}</div>`;
      for (let j = 0; j < 4; j++) {
        const a = l1.start + 1.6 + (r * 4 + j) * 0.12;
        const lit = t > a && glyph[r][j] !== '—';
        grid += `<div class="mcell${lit ? ' lit' : ''}" style="${pop(a)}">${glyph[r][j]}</div>`;
      }
    });
    grid += '</div>';
    const q = appear(l2.start + 0.2);
    return `<div class="card" style="left:150px;top:200px;width:560px;height:540px;${pop(l0.start)}"><h3>加法 · 一个房间一个谜题</h3><div style="position:relative;height:300px">${rooms}</div><p style="position:absolute;bottom:34px;left:38px;right:38px">新增 1 种玩法 = 再做 1 套专用机关</p></div>
      <div class="card" style="left:770px;top:150px;width:1000px;height:640px;${pop(l1.start)}"><h3>乘法 · 少数规则 × 所有材料</h3><div style="margin-top:10px">${grid}</div>
      <p style="position:absolute;left:38px;bottom:30px;font-size:26px;color:#ffe0a0">5 种元素 × 4 种材料 → <b style="font-size:40px;color:#fff">${Math.round(lerp(0, 20, clamp((t - l1.start - 1.6) / 2.4)))}</b> 种互动</p></div>
      <div class="card" style="left:560px;top:820px;width:800px;padding:20px 30px;text-align:center;${`opacity:${q.toFixed(3)}`}"><p style="font-size:30px;color:#fff;font-weight:700">GDC 2017 · 《荒野之息》开发团队演讲</p></div>`;
  }
  if (id === 'engines') {
    const l0 = L(id, 0), l1 = L(id, 1);
    const els = [['火', 'el-fire'], ['水', 'el-water'], ['冰', 'el-ice'], ['电', 'el-elec'], ['风', 'el-wind']];
    const mats = ['草', '木头', '金属', '石头', '布料'];
    return `<div class="card" style="left:180px;top:200px;width:740px;height:330px;${pop(l0.start + 0.1)}"><h3>PHYSICS · 物理引擎</h3><div class="big">东西<span style="color:#7fc8ff">怎么动</span></div><p style="margin-top:16px">碰撞 · 速度 · 重力 · 浮力</p><div style="position:absolute;right:40px;top:96px;font-size:120px;opacity:.9">🪨</div></div>
      <div class="card" style="left:1000px;top:200px;width:740px;height:330px;${pop(l0.start + 1.6)}"><h3>CHEMISTRY · 化学引擎</h3><div class="big">东西<span style="color:#ffb35a">变成什么状态</span></div><p style="margin-top:16px">燃烧 · 潮湿 · 冻结 · 带电</p><div style="position:absolute;right:40px;top:96px;font-size:120px;opacity:.9">🔥</div></div>
      <div class="card" style="left:180px;top:580px;width:1560px;height:230px;${pop(l1.start)}">
        <div style="display:flex;align-items:center;gap:20px"><h3 style="margin:0;width:150px">元素</h3>${els.map(([e, c], k) => `<span class="chip ${c}" style="${pop(l1.start + 0.3 + k * 0.18)}">${e}</span>`).join('')}<span style="margin-left:auto;font-size:22px;color:#b9c5cd">会动、会扩散的「作用」</span></div>
        <div style="display:flex;align-items:center;gap:20px;margin-top:18px"><h3 style="margin:0;width:150px">材料</h3>${mats.map((m, k) => `<span class="chip mat" style="${pop(l1.start + 2.4 + k * 0.18)}">${m}</span>`).join('')}<span style="margin-left:auto;font-size:22px;color:#b9c5cd">带着属性的「东西」</span></div></div>`;
  }
  if (id === 'rules') {
    const ls = [0, 1, 2].map(i => L(id, i));
    const r = (n, a, b, c, ok, sub, at, emph) => `<div class="rule ${ok ? 'yes' : 'no'}" style="${pop(at)};${emph}"><div class="n">${n}</div><div><div class="eq">${a}<span class="arrow">→</span>${b}</div><small>${sub}</small></div><div class="verdict">${ok ? '✓' : '✗'}</div></div>`;
    const focus3 = ramp(t, ls[2].start, 0.5);
    const dimOther = `opacity:${lerp(1, 0.4, focus3)}`;
    return `<div style="position:absolute;left:92px;top:440px;width:700px">
      ${r('1', '<span class="chip el-fire" style="margin:0">元素</span>', '<span class="chip mat" style="margin:0">材料</span>', '', true, '火让草燃烧 · 电让金属带电', ls[0].start + 0.2, t > ls[2].start ? dimOther : '')}
      ${r('2', '<span class="chip el-water" style="margin:0">元素</span>', '<span class="chip el-fire" style="margin:0">元素</span>', '', true, '水浇灭火 · 火融化冰', ls[1].start + 0.2, t > ls[2].start ? dimOther : '')}
      ${r('3', '<span class="chip mat" style="margin:0">材料</span>', '<span class="chip mat" style="margin:0">材料</span>', '', false, '着火的木头不能直接点着木头', ls[2].start + 0.3, `transform:scale(${(1 + 0.04 * focus3).toFixed(3)});transform-origin:left center`)}
    </div>`;
  }
  if (id === 'build') {
    const ls = SC.build.lines;
    const pt = (n, b, s, a) => `<div class="point" style="${pop(a)}"><div class="n">${n}</div><div><b>${b}</b><span>${s}</span></div></div>`;
    const flowK = appear(ls[1].start + 0.4);
    return `<div class="card" style="left:110px;top:180px;width:820px;height:700px;${pop(ls[0].start)}"><h3>把化学引擎装进你的游戏</h3>
        ${pt('01', '模拟和渲染分开', '固定步长（1/60 秒）更新数组；画面只读，不改数据', ls[1].start)}
        ${pt('02', '规则只看属性', 'fuel / wet / conductive……不写「火把碰木箱」特例', ls[2].start)}
        ${pt('03', '先网格，后三维', '规则调稳后，用空间查询（球形范围 / 接触对）代替格子邻居', ls[3].start)}
      </div>
      <div class="card" style="left:990px;top:180px;width:820px;height:300px;${`opacity:${flowK.toFixed(3)}`}"><h3>一帧里发生了什么</h3>
        <div class="flow" style="margin-top:26px"><div class="node">事件<small>点火 / 下雨 / 通电</small></div><div class="arr">→</div><div class="node">规则 tick<small>60 Hz 固定步长</small></div><div class="arr">→</div><div class="node">状态数组<small>温度 湿度 燃料…</small></div><div class="arr">→</div><div class="node">渲染<small>Three.js 读取</small></div></div></div>
      <div class="card" style="left:990px;top:520px;width:820px;height:360px;${pop(ls[4].start)}"><h3>效果预览 · 源码</h3>
        <div style="display:flex;gap:16px;margin-top:8px">${['点一把火', '下一场雨', '施加电荷', '调风向'].map((b, k) => `<span class="chip" style="background:${['#ff6a2a', '#2f8cff', '#7d5cff', '#5fd3a0'][k]};color:#fff;font-size:24px;${pop(ls[4].start + 0.5 + k * 0.2)}">${b}</span>`).join('')}</div>
        <p style="margin-top:22px;font-size:24px">浏览器直接打开 <b style="color:#ffe0a0">index.html</b>：实时 WebGL 场景 + 数据视图 + 规则源码</p>
        <p style="font-size:22px;color:#8fa2ae">src/sim.js（规则）· src/world.js（渲染）· film.html（本视频）</p></div>`;
  }
  if (id === 'teaser') {
    const l0 = L(id, 0), l1 = L(id, 1);
    const k = appear(l0.start + 2.4, 0.7);
    const bar = clamp((t - l0.start - 3.3) / 0.6) * 0.8;
    const tag = appear(l1.start + 0.2);
    return `<div class="split-right" style="clip-path:inset(0 0 0 ${((1 - k) * 100).toFixed(1)}%)">
        <img id="gi" src="footage/gi_frames/f0001.jpg">
        <div class="aura" style="left:250px;top:210px;opacity:${clamp(bar * 3).toFixed(2)}"><div class="gem"></div><div class="bar"><i style="width:${(bar * 100).toFixed(1)}%"></i></div><b>${bar.toFixed(1)}U</b></div>
        <div style="position:absolute;left:60px;top:150px;font-size:30px;font-weight:800;color:#fff;letter-spacing:4px;text-shadow:0 2px 10px #000">烧的是伤害</div><div style="position:absolute;right:30px;bottom:180px;font-size:17px;color:rgba(255,255,255,.85);padding:5px 12px;border-radius:8px;background:rgba(0,0,0,.5)">实机画面 · 原神（© HoYoverse）</div>
      </div>
      <div style="position:absolute;left:60px;top:150px;font-size:28px;color:#ffe0a0;letter-spacing:4px;opacity:${k.toFixed(2)};text-shadow:0 2px 10px #000">烧的是世界</div>
      <div class="card" style="left:620px;top:830px;width:680px;padding:20px 30px;text-align:center;${`opacity:${tag.toFixed(3)}`}"><p style="font-size:34px;color:#fff;font-weight:800">下期预告 · 原神元素反应</p></div>`;
  }
  if (id === 'outro') {
    const l0 = L(id, 0), l1 = L(id, 1);
    const k = appear(S.start + 0.1, 0.7);
    const on = n => t > l0.start + 1.6 + n * 0.45;
    const follow = appear(l0.start + 3.4);
    return `<div class="endcard" style="opacity:${k.toFixed(3)}">
      <img class="av" src="brand/avatar.png" style="transform:scale(${(0.8 + 0.2 * k).toFixed(3)})">
      <div class="id">粑粑柑（梭哈ai版）</div><div class="sub">机制拆解 · 用代码拆游戏</div>
      <div class="btns">${[['like', '点赞'], ['coin', '投币'], ['fav', '收藏']].map(([ic, lb], n) => `<div class="btn${on(n) ? ' on' : ''}" style="transform:scale(${on(n) ? (1 + 0.12 * Math.exp(-(t - (l0.start + 1.6 + n * 0.45)) * 6)).toFixed(3) : 1})">${icons[ic]}${lb}</div>`).join('')}</div>
      <div class="follow" style="opacity:${follow.toFixed(3)};transform:scale(${(0.9 + 0.1 * follow).toFixed(3)})">+ 关注</div>
      <div style="margin-top:26px;font-size:24px;color:#ffe0a0;opacity:${appear(l1.start + 0.3).toFixed(3)}">薅点叔叔的羊毛 → 继续开发自己的游戏</div>
    </div>`;
  }
  return '';
}

// panel content per scene
const PANEL = {
  rules: { bullets: [] },
  burn: { bullets: [['🌡', '够热', 'temp > 150'], ['🌾', '有燃料', 'fuel > 0.05'], ['💧', '不太湿', 'wet < 0.3']] },
  rain: { bullets: [['🌧', '湿度 ↑', 'wet += 雨量'], ['❄', '温度 ↓', '雨水带走热量'], ['✗', '燃烧条件不成立', '火自己熄灭']] },
  data: { bullets: [] },
};

// ---------------- main render ----------------
window.renderFrame = async function (t) {
  t = clamp(t, 0, TL.duration - 1e-3);
  const S = sceneAt(t), id = S.id, lt = t - S.start, si = TL.scenes.indexOf(S);
  const shot = shots[id](t, lt);
  shot.sim.seek(shot.simT);
  world.setSim(shot.sim);
  // transition dip between scenes
  const toNext = (TL.scenes[si + 1]?.start ?? 1e9) - t;
  const dip = Math.max(clamp(1 - lt / 0.35) * (si > 0 ? 1 : 0), clamp(1 - toNext / 0.25)) * 0.85;
  const view = { ...shot.view, fade: Math.max(shot.view.fade || 0, dip, shot.cut || 0) };
  world.render(shot.simT, view);

  // ---- DOM layers ----
  op($('dim'), shot.dim ?? 0);
  op($('vignetteL'), (shot.vigL ?? 0) * ease(lt / 0.6));
  // brand + rail
  railBars.forEach((b, k) => b.className = k < si ? 'done' : k === si ? 'on' : '');
  railLabel.textContent = script.scenes[si].kicker;
  // panel
  const sc = script.scenes[si];
  const showPanel = ['rules', 'burn', 'rain'].includes(id);
  const pk = showPanel ? easeOut(lt / 0.7) * (1 - ramp(toNext, 0.5, -0.4)) : 0;
  op($('panel'), pk); tf($('panel'), `translateX(${((1 - pk) * -30).toFixed(1)}px)`);
  if (showPanel) {
    $('kicker').textContent = sc.kicker;
    $('title').textContent = ({ rules: '谁能\n改变谁？', burn: '火是结果，\n热才是原因', rain: '灭火，\n改的是数据' })[id] || sc.title;
    const bl = PANEL[id]?.bullets || [];
    const lines = SC[id].lines;
    $('bullets').innerHTML = bl.map((b, k) => {
      const a = (id === 'burn' ? lines[0].start + 1.0 + k * 0.9 : lines[1].start + 0.2 + k * 1.3);
      const kk = easeOut((t - a) / 0.4);
      return `<div class="bullet ok" style="opacity:${kk.toFixed(3)};transform:translateX(${((1 - kk) * -20).toFixed(1)}px)"><div class="ic">${b[0]}</div><div>${b[1]}<small>${b[2]}</small></div></div>`;
    }).join('');
    if (id === 'rules') $('bullets').innerHTML = '';
  }
  // cards
  setCards(cardsFor(id, t, lt, shot));
  // code panel
  let codeK = 0;
  if (id === 'burn') {
    codeK = win(t, L('burn', 0).start + 3.2, S.end - 0.3, 0.5);
    const hl = t < L('burn', 1).start ? regionLineOf('burn', 'IGNITE') : t < L('burn', 2).start ? Math.max(0, regionLineOf('burn', 'fuel')) : -1;
    setCode('burn', hl);
  } else if (id === 'rain') {
    codeK = win(t, L('rain', 1).start + 0.3, S.end - 0.3, 0.5);
    setCode('rain', -1);
  } else if (id === 'data') {
    codeK = win(t, L('data', 1).start + 0.2, L('data', 2).start + 0.6, 0.5);
    setCode('cell', -1);
  }
  op($('code'), codeK); tf($('code'), `translateY(${((1 - codeK) * 24).toFixed(1)}px)`);
  // inspector (data scene) + legend
  const ins = $('inspector'), lg = $('legend');
  if (shot.inspect) {
    const i = cellAt(shot.inspect.x, shot.inspect.z), s = shot.sim;
    const p = world.project(s.cx?.[i] ?? cellCenter(i).x, world.heightAt(cellCenter(i).x, cellCenter(i).z) + 0.05, cellCenter(i).z);
    const a = shot.inspect.a * (1 - win(t, L('data', 1).start + 0.2, L('data', 2).start + 0.6, 0.5));
    op(ins, a);
    const left = Math.min(1500, p.x + 60), top = Math.max(140, p.y - 200);
    ins.style.left = left + 'px'; ins.style.top = top + 'px';
    const row = (k, v, max, col, hl) => `<div class="row${hl ? ' hl' : ''}"><span>${k}</span><b>${v}</b></div><div class="bar"><i style="width:${clamp(max).toFixed(3) * 100}%;background:${col}"></i></div>`;
    ins.innerHTML = `<h4>格子 #${i} 的全部内容</h4>` + row('温度', s.temp[i].toFixed(0) + '°', s.temp[i] / 700, '#ff7a2a', true) + row('湿度', s.wet[i].toFixed(2), s.wet[i], '#4aa3ff') + row('燃料', s.fuel[i].toFixed(2), s.fuel[i], '#d9b24a') + row('冰', s.ice[i].toFixed(2), s.ice[i], '#9fe4ff') + row('电荷', s.charge[i].toFixed(2), s.charge[i], '#a58bff');
    drawAnno(`<line x1="${p.x}" y1="${p.y}" x2="${left}" y2="${top + 30}" stroke="#ffd27a" stroke-width="2" opacity="${a.toFixed(2)}"/><circle cx="${p.x}" cy="${p.y}" r="6" fill="#ffd27a" opacity="${a.toFixed(2)}"/>`);
    const f = shot.legend; const lk = ramp(t, L('data', 2).start - 0.2, 0.5) * (1 - ramp(toNext, 0.6, -0.4));
    op(lg, Math.max(lk, 0));
    lg.innerHTML = f.names.map((n, k) => `<div class="lg ${k === f.idx ? 'on' : 'off'}">${n}<i style="background:${['linear-gradient(90deg,#14051c,#8c1a5e,#f2611b,#fff3a0)', 'linear-gradient(90deg,#0b1420,#3fa0ff)', 'linear-gradient(90deg,#0d0b05,#d9b24a)', 'linear-gradient(90deg,#08101a,#80ffff)'][k]}"></i></div>`).join('');
    lg.style.right = '72px'; lg.style.bottom = '220px';
  } else { op(ins, 0); op(lg, 0); drawAnno(annoFor(id, t, lt, shot)); }

  // gameplay footage (hook)
  const waits = [];
  const fk = id === 'hook' ? 1 - ramp(t, FOOT_END - 0.25, 0.4) : 0;
  op($('foot'), fk); op($('footlabel'), fk);
  if (fk > 0) { const n = clamp(Math.floor(t * 30) + 1, 1, FOOT_N); waits.push(setImg($('foot'), `footage/frames/f${String(n).padStart(4, '0')}.jpg`)); $('footlabel').textContent = '实机画面 · 塞尔达传说 旷野之息（© Nintendo）'; }
  if (id === 'teaser') { const gi = document.getElementById('gi'); if (gi) { const n = clamp(Math.floor((t - L('teaser', 0).start - 2.0) * 30) + 1, 1, GI_N); waits.push(setImg(gi, `footage/gi_frames/f${String(n).padStart(4, '0')}.jpg`)); } }
  await Promise.all(waits.filter(Boolean));
  // big statements
  bigFor(id, t, lt, shot);
  // subtitles
  const sub = TL.subs.find(c => t >= c.start && t < c.end + 0.12);
  $('szh').textContent = sub?.zh || ''; $('sen').textContent = sub?.en || '';
  $('szh').style.visibility = $('sen').style.visibility = sub ? 'visible' : 'hidden';
  $('progress').firstElementChild.style.transform = `scaleX(${(t / TL.duration).toFixed(4)})`;
  op($('flash'), (shot.flash || 0) * 0.35);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
};
function setCode(region, hl) { const key = region + ':' + hl; if (key !== lastCode) { lastCode = key; $('codebody').innerHTML = codeHTML(region, hl); $('coderegion').textContent = '//#region ' + region; } }
let lastAnno = '';
function drawAnno(s) { if (s !== lastAnno) { $('anno').innerHTML = s; lastAnno = s; } }

function annoFor(id, t, lt, shot) {
  if (id === 'burn') {
    // heat arrows from focus cell to its 8 neighbours
    const l1 = L('burn', 1), k = win(t, l1.start + 0.3, L('burn', 2).start + 0.6, 0.4);
    if (k <= 0) return '';
    const c = cellCenter(cellAt(-0.2, 0.6)), y = world.heightAt(c.x, c.z) + 0.05;
    const p0 = world.project(c.x, y, c.z);
    let s = '';
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const q = world.project(c.x + dx * CELL * 1.6, y, c.z + dz * CELL * 1.6);
      const ph = clamp((t - l1.start - 0.3) * 1.2 - (dx + dz + 2) * 0.08);
      const ex = lerp(p0.x, q.x, ph), ey = lerp(p0.y, q.y, ph);
      s += `<line x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#ffb84a" stroke-width="4" stroke-linecap="round" opacity="${k.toFixed(2)}"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="6" fill="#ffe0a0" opacity="${k.toFixed(2)}"/>`;
    }
    s += `<text x="${(p0.x + 40).toFixed(0)}" y="${(p0.y - 70).toFixed(0)}" font-size="30" fill="#ffe0a0" opacity="${k.toFixed(2)}" style="paint-order:stroke;stroke:#000;stroke-width:6px">热量 → 8 个邻居</text>`;
    const w = win(t, L('burn', 2).start + 1.0, SC.burn.end, 0.4);
    if (w > 0) s += `<g opacity="${w.toFixed(2)}"><text x="1180" y="1000" font-size="34" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:6px">风 →</text></g>`;
    return s;
  }
  if (id === 'rules') {
    const k = win(t, L('rules', 4).start - 0.1, SC.rules.end, 0.5);
    if (k <= 0) return '';
    return `<text x="1300" y="210" font-size="34" fill="#ffe0a0" opacity="${k.toFixed(2)}" style="paint-order:stroke;stroke:#000;stroke-width:7px">数据视图：越亮越热</text><text x="1300" y="256" font-size="24" fill="#fff" opacity="${k.toFixed(2)}" style="paint-order:stroke;stroke:#000;stroke-width:5px">跨过空地的是「热」，不是木头</text>`;
  }
  if (id === 'iceshock') {
    const sim = shot.sim; let s = '';
    if (sim.layout === 'lab' && SC.iceshock.lines[1].start <= t) {
      const ice = world.project(-1.1, 0.7, 0);
      const k = win(t, L('iceshock', 1).start + 2.6, SC.iceshock.end, 0.4);
      s += `<g opacity="${k.toFixed(2)}"><circle cx="${ice.x.toFixed(0)}" cy="${ice.y.toFixed(0)}" r="70" stroke="#ff6b6b" stroke-width="5" fill="none"/><text x="${(ice.x - 110).toFixed(0)}" y="${(ice.y - 96).toFixed(0)}" font-size="34" fill="#ff8a8a" style="paint-order:stroke;stroke:#000;stroke-width:7px">冰不导电，电断在这</text></g>`;
    }
    return s;
  }
  if (id === 'lift') {
    const g = shot.sim.glider; const p = world.project(g.x, g.y + 0.9, g.z);
    const k = win(t, L('lift', 1).start + 0.5, SC.lift.end, 0.5);
    return `<g opacity="${k.toFixed(2)}"><text x="${(p.x + 60).toFixed(0)}" y="${(p.y - 20).toFixed(0)}" font-size="30" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:6px">高度 ${g.y.toFixed(1)} m</text><text x="${(p.x + 60).toFixed(0)}" y="${(p.y + 20).toFixed(0)}" font-size="24" fill="#ffd27a" style="paint-order:stroke;stroke:#000;stroke-width:5px">气流 ${shot.sim.updraft.strength.toFixed(2)}</text></g>`;
  }
  if (id === 'chain') {
    const r = shot.sim.receivers[0]; if (!r) return '';
    const steps = [['🔥 火', -1.2, 1.4, 0.3], ['🧊 → 💧', -1.1, 0, 2.0], ['⚡ 接通', 1.5, 0, 3.7], ['💡 机关亮了', r.x, r.z, 4.5]];
    return steps.map(([txt, x, z, at], k) => {
      const a = win(t, L('chain', 0).start + at, SC.chain.end, 0.4);
      const p = world.project(x, 1.4 + (k === 3 ? 1.2 : 0), z);
      return `<text x="${p.x.toFixed(0)}" y="${p.y.toFixed(0)}" text-anchor="middle" font-size="32" fill="#fff" opacity="${a.toFixed(2)}" style="paint-order:stroke;stroke:#000;stroke-width:7px">${txt}</text>`;
    }).join('');
  }
  return '';
}

function bigFor(id, t, lt, shot) {
  const el = $('bigtext'); let k = 0, html = '';
  if (id === 'hook') {
    const l1 = L('hook', 1), l2 = L('hook', 2), l3 = L('hook', 3);
    const q = win(t, l1.start + 0.05, FOOT_END, 0.3), a = win(t, l2.start + 0.2, l3.start + 0.3, 0.35), b = win(t, l3.start + 0.4, SC.hook.end, 0.4);
    if (q > 0) { k = q; html = '<div class="l1">你有没有想过，<span class="acc">为什么？</span></div><div class="l2">HAVE YOU EVER WONDERED WHY?</div>'; }
    if (a > 0) { k = a; html = '<div class="l1">没人写过<span class="acc">这一幕</span></div><div class="l2">NO ONE SCRIPTED THIS</div>'; }
    if (b > 0) { k = b; html = '<div class="l1"><span class="acc">3</span> 条规则</div><div class="l2">塞尔达化学引擎 · 机制拆解 01</div>'; }
  } else if (id === 'lift') {
    const a = win(t, L('lift', 2).start + 0.1, SC.lift.end, 0.4);
    if (a > 0) { k = a; html = '<div class="l1">火 <span class="acc">×</span> 滑翔</div><div class="l2">两个系统相乘 = 新玩法</div>'; }
  } else if (id === 'chain') {
    const a = win(t, L('chain', 1).start + 0.1, SC.chain.end, 0.4);
    if (a > 0) { k = a; html = '<div class="l1">没人写过<span class="acc">这个解法</span></div><div class="l2">THE RULES SOLVED IT</div>'; }
  } else if (id === 'rain') {
    const a = win(t, L('rain', 0).start + 0.1, L('rain', 0).end + 0.4, 0.3);
    if (a > 0) { k = a; html = '<div class="l1">怎么灭火？</div>'; }
  } else if (id === 'data') {
    const a = win(t, L('data', 0).start + 0.2, L('data', 0).end, 0.4);
    if (a > 0) { k = a; html = '<div class="l1"><span class="acc">48 × 48</span></div><div class="l2">2304 个格子 · 每格 5 个数字</div>'; }
  }
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  op(el, k); tf(el, `scale(${(0.94 + 0.06 * easeOut(k)).toFixed(3)})`);
}

window.renderFrame(Number(location.hash.slice(1)) || 0);
window.READY = true;
if (!new URLSearchParams(location.search).has('render')) {
  // preview mode: realtime playback with audio if available
  const audio = new Audio('build/mix_bgm.wav'); let playing = false, t0 = 0;
  addEventListener('keydown', e => { if (e.code === 'Space') { playing = !playing; if (playing) { audio.currentTime = t0; audio.play().catch(() => {}); } else audio.pause(); } });
  const loop = () => { if (playing) { t0 = audio.currentTime; window.renderFrame(t0); } requestAnimationFrame(loop); };
  loop();
}
