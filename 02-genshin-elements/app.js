// 机制拆解 02 · 原神式元素反应 — 交互预览。原创教学原型，数值为玩家实测，非官方。
import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter } from './src/sim.js';
import { createCombat } from './src/combat.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mobile = innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);

const D = { a: { id: 'a', x: 0.2, z: 0.4, name: '木桩 A' }, b: { id: 'b', x: 1.0, z: -1.4, name: '木桩 B' }, c: { id: 'c', x: -1.2, z: -1.0, name: '木桩 C' } };
const IDS = ['a', 'b', 'c'];
const COL = { pyro: '#ff7a2a', hydro: '#3aa0ff', electro: '#b07cff', cryo: '#9fe8ff', anemo: '#6fe0b8', geo: '#ffcc55', dendro: '#8fdc4a' };
const GLY = { pyro: '火', hydro: '水', electro: '雷', cryo: '冰', anemo: '风', geo: '岩', dendro: '草' };
const RXN = { vaporize: '蒸发', melt: '融化', overloaded: '超载', 'electro-charged': '感电', superconduct: '超导', swirl: '扩散', crystallize: '结晶', frozen: '冻结' };
const RXCOL = { overloaded: '#ff6a8a', 'electro-charged': '#c58cff', superconduct: '#b8c8ff', frozen: '#9fe8ff', swirl: '#6fe0b8', crystallize: '#ffcc55' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- tabs ----------
let curTab = 'preview';
function showTab(name) {
  curTab = name;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + name));
  if (name === 'preview') requestAnimationFrame(resize);
  if (name === 'method') loadRegion();
  history.replaceState(null, '', name === 'preview' ? location.pathname : '#' + name);
}
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

// ---------- source viewer ----------
let src = null;
async function loadRegion() {
  const code = $('code');
  try {
    if (!src) src = await fetch('./src/combat.js').then((r) => r.text());
    const name = $('region').value;
    const m = src.match(new RegExp('//#region ' + name + '\\s*\\n([\\s\\S]*?)\\n\\s*//#endregion'));
    if (!m) { code.textContent = '// 没有找到区域 ' + name; return; }
    $('srcmeta').textContent = `src/combat.js · #region ${name} · ${m[1].split('\n').length} 行`;
    code.innerHTML = highlight(m[1]);
  } catch (e) { code.textContent = '// 读取源码失败：' + e.message; }
}
$('region').onchange = loadRegion;
function highlight(s) {
  const re = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|of|in|new|export|continue|break|while|true|false|null|this)\b|\b(\d+\.?\d*(?:e-?\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\()/g;
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f';
    out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(s.slice(last));
}

// ---------- world ----------
const canvas = $('gl');
const stage = document.querySelector('.stage');
const sz = () => ({ w: Math.max(2, stage.clientWidth), h: Math.max(2, stage.clientHeight) });
const { w: w0, h: h0 } = sz();
const world = await createWorld(canvas, { width: w0, height: h0, pixelRatio: Math.min(devicePixelRatio || 1, 1.5), quality: mobile ? 0.6 : 1 });
const sim = createSim('meadow');
Object.assign(sim, { CELL, cellAt, cellCenter });
world.setSim(sim);
sim.setWind(0.4, 0.2);

// ---------- combat state ----------
const C = createCombat();
for (const k of IDS) C.addTarget({ ...D[k] });
let events = [], now = 0, paused = false, speed = 1, sel = 'a', selEl = 'pyro', selU = 1, seq = 0;
const resetAll = () => { events = []; now = 0; C.schedule(events); C.seek(now); lastLogN = -1; };
function pushEvents(list) { events.push(...list); C.schedule(events); C.seek(now); }
const mk = (t, el, extra = {}) => ({ t, type: 'hit', target: sel, element: el, units: selU, dmg: 1000, src: el + '#' + ++seq, icd: false, ...extra });
const hitNow = () => pushEvents([mk(now, selEl)]);
function burst() { // 7 发同一来源，间隔 0.32 s，走内置冷却
  const list = []; for (let k = 0; k < 7; k++) list.push(mk(now + k * 0.32, selEl, { src: 'bow', icd: true, dmg: 600 }));
  pushEvents(list);
}

// ---------- camera / input ----------
const cam = { yaw: 2.55, pitch: 0.42, dist: 7.2, target: [0, 0.9, -0.5] };
const clampCam = () => { cam.pitch = clamp(cam.pitch, 0.08, 1.45); cam.dist = clamp(cam.dist, 3, 18); };
function camView() {
  const cp = Math.cos(cam.pitch), t = cam.target;
  return { pos: [t[0] + Math.cos(cam.yaw) * cp * cam.dist, t[1] + Math.sin(cam.pitch) * cam.dist, t[2] + Math.sin(cam.yaw) * cp * cam.dist], target: t, fov: 38 };
}
function pickDummy(cx, cy) {
  const r = canvas.getBoundingClientRect(); let best = null, bd = 1e9;
  for (const id of IDS) {
    const d = D[id], y = world.heightAt(d.x, d.z), p = world.project(d.x, y + 0.9, d.z);
    if (p.z > 1) continue;
    const dist = Math.hypot(p.x - (cx - r.left), p.y - (cy - r.top)), lim = Math.max(40, 260 / cam.dist * 1.6);
    if (dist < lim && dist < bd) { bd = dist; best = id; }
  }
  return best;
}
const ptrs = new Map(); let moved = 0, pinch0 = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { cam.yaw -= dx * 0.006; cam.pitch += dy * 0.005; clampCam(); } }
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { cam.dist *= pinch0 / d; clampCam(); } pinch0 = d; }
});
const endPtr = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  const wasOne = ptrs.size === 1; ptrs.delete(e.pointerId);
  if (e.type === 'pointerup' && wasOne && moved <= 6) { const id = pickDummy(e.clientX, e.clientY); if (id) select(id); }
};
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist *= Math.exp(e.deltaY * 0.001); clampCam(); }, { passive: false });

// ---------- controls ----------
function select(id) {
  sel = id;
  document.querySelectorAll('#tgts button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  $('selname').textContent = D[id].name; lastAuraKey = '';
}
document.querySelectorAll('#tgts button').forEach((b) => (b.onclick = () => select(b.dataset.id)));
function pickEl(el) { selEl = el; document.querySelectorAll('#els button').forEach((x) => x.classList.toggle('sel', x.dataset.el === el)); }
document.querySelectorAll('#els button').forEach((b) => (b.onclick = () => { pickEl(b.dataset.el); hitNow(); }));
document.querySelectorAll('#units button').forEach((b) => (b.onclick = () => { selU = +b.dataset.u; document.querySelectorAll('#units button').forEach((x) => x.classList.toggle('on', x === b)); }));
$('b-burst').onclick = burst;
$('b-reset').onclick = resetAll;
$('b-pause').onclick = (e) => { paused = !paused; e.target.classList.toggle('on', paused); e.target.textContent = paused ? '继续' : '暂停'; };
$('speed').onchange = (e) => (speed = +e.target.value);
pickEl('pyro');

// ---------- HUD / panel ----------
const hudEl = $('hud');
function hudAndFx() {
  let hud = ''; const dummies = [], fx = [];
  for (const id of IDS) {
    const d = D[id], tg = C.targets.find((x) => x.id === id);
    const recent = C.log.filter((e) => e.target === id && e.t <= now && now - e.t < 2.2);
    const age0 = recent.length ? now - recent[recent.length - 1].t : 9;
    const main = tg.auras[0];
    dummies.push({ x: d.x, z: d.z, aura: main?.element, auraK: main ? clamp(main.gauge / 0.8) : 0, flash: Math.max(0, 1 - age0 / 0.25), yaw: -0.6 });
    const y = world.heightAt(d.x, d.z);
    for (const e of recent) {
      const age = now - e.t; if (age > 1.3) continue;
      if (e.kind !== 'blocked_icd' || age < 0.5) fx.push({ type: e.element, x: d.x, y: y + 1.1, z: d.z, age: age + 0.35, from: [d.x - 2.4, y + 1.6, d.z + 1.6], big: e.kind === 'reaction', steam: e.reaction === 'vaporize', seed: Math.round(e.t * 10) });
    }
    const p = world.project(d.x, y + 2.05, d.z);
    if (p.z > 1) continue;
    const els = tg.auras.map((a) => `<div class="el" style="background:${COL[a.element]};color:${COL[a.element]}"><span style="color:#fff">${GLY[a.element]}</span></div>`).join('');
    const bars = tg.auras.map((a) => `<div class="bar"><i style="width:${clamp(a.gauge / 3.2) * 100}%;background:${COL[a.element]}"></i></div><div class="u" style="color:${COL[a.element]}">${a.gauge.toFixed(2)}U</div>`).join('');
    const fz = tg.frozenUntil > now ? '<div class="fz">冻结 ' + (tg.frozenUntil - now).toFixed(1) + 's</div>' : '';
    hud += `<div class="unit${id === sel ? ' sel' : ''}" style="left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px"><div class="nm">${d.name}</div><div class="eli">${els}</div>${bars}${fz}</div>`;
    for (const e of recent) {
      const age = now - e.t, k = 1 - Math.pow(age / 2.2, 3), isR = e.kind === 'reaction';
      const col = isR ? RXCOL[e.reaction] || '#ffb347' : e.kind === 'blocked_icd' ? '#d8d8d8' : COL[e.element];
      const q = world.project(d.x + 0.55, y + 0.9 + age * 0.9, d.z), sc = 1 + Math.max(0, 0.35 - age) * 1.4;
      hud += `<div class="dmg" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;color:${col};opacity:${k.toFixed(2)};transform:translate(-50%,-50%) scale(${sc.toFixed(2)})">${Math.round(e.damage)}</div>`;
      if (isR) {
        const r = world.project(d.x - 0.2, y + 2.5 + age * 0.25, d.z);
        const lab = RXN[e.reaction] + (e.reaction === 'vaporize' || e.reaction === 'melt' ? ` ×${e.multiplier}` : '');
        hud += `<div class="rxn" data-rx="${e.reaction}" style="left:${r.x.toFixed(0)}px;top:${r.y.toFixed(0)}px;color:${col};opacity:${k.toFixed(2)}">${lab}</div>`;
      }
    }
  }
  if (hudEl.dataset.h !== hud) { hudEl.innerHTML = hud; hudEl.dataset.h = hud; }
  return { dummies, fx };
}

let lastAuraKey = '', lastLogN = -1;
function panel() {
  const tg = C.targets.find((x) => x.id === sel);
  const key = tg.auras.map((a) => a.element + a.gauge.toFixed(2)).join('|') + '#' + (tg.frozenUntil > now ? 1 : 0) + tg.lastReaction;
  $('clock').textContent = `t = ${now.toFixed(1)}s`;
  if (key !== lastAuraKey) {
    lastAuraKey = key;
    const rows = tg.auras.map((a) => `<tr><td style="color:${COL[a.element]};font-weight:700">${GLY[a.element]}</td><td>${a.gauge.toFixed(2)}U<span class="gb"><i style="width:${clamp(a.gauge / 3.2) * 100}%;background:${COL[a.element]}"></i></span></td><td>${(1 / a.decay).toFixed(2)} s/U</td><td>${(a.gauge / a.decay).toFixed(1)} s</td></tr>`).join('');
    $('aura').innerHTML = '<tr><th>元素</th><th>元素量</th><th>衰减</th><th>剩余</th></tr>' + (rows || '<tr><td colspan="4" class="empty">（无附着）</td></tr>');
    $('tags').innerHTML = `<span>上次反应 <b>${tg.lastReaction ? RXN[tg.lastReaction] : '—'}</b></span>` + (tg.frozenUntil > now ? '<span><b>冻结中</b></span>' : '');
  }
  if (C.log.length !== lastLogN) {
    lastLogN = C.log.length;
    const nm = (id) => D[id].name.replace('木桩 ', '');
    const lines = C.log.slice(-60).reverse().map((e) => {
      const t = `<span class="t">${e.t.toFixed(1)}s</span> ${nm(e.target)} `;
      const g = (v) => Math.max(0, v).toFixed(2);
      if (e.kind === 'blocked_icd') return `<div class="bl">${t}${GLY[e.element]} 被冷却挡住（只算伤害 ${Math.round(e.damage)}，不附着）</div>`;
      if (e.kind === 'reaction') return `<div class="rx">${t}${GLY[e.element]} 触发 ${RXN[e.reaction]}${e.multiplier > 1 && (e.reaction === 'vaporize' || e.reaction === 'melt') ? ' ×' + e.multiplier : ''}（附着 ${g(e.gaugeBefore)} → ${g(e.gaugeAfter)}U）伤害 ${Math.round(e.damage)}</div>`;
      if (e.element === 'anemo' || e.element === 'geo') return `<div class="ap">${t}${GLY[e.element]} 留不下附着，也没有反应</div>`;
      if (e.kind === 'refresh') return `<div class="ap">${t}${GLY[e.element]} 同元素：取大 ${g(e.gaugeBefore)} → ${g(e.gaugeAfter)}U</div>`;
      return `<div class="ap">${t}${GLY[e.element]} 附着 ${g(e.gaugeAfter)}U（税后）</div>`;
    });
    $('log').innerHTML = lines.join('') || '<div class="t">点上方元素按钮，或点选木桩后施加元素</div>';
    const s = C.stats();
    const rx = Object.entries(s.reactions).map(([k, v]) => `${RXN[k]}×${v}`).join(' ') || '—';
    $('stats').innerHTML = `<div class="stat"><b>${s.hits}</b><span>命中</span></div><div class="stat"><b>${s.applies + s.refreshes}</b><span>附着</span></div><div class="stat"><b>${s.blocked}</b><span>冷却挡住</span></div><div class="stat" style="grid-column:1/-1"><b style="font-size:14px">${rx}</b><span>反应 · 累计伤害 ${Math.round(s.totalDamage)}</span></div>`;
  }
}

// ---------- loop ----------
function resize() {
  const { w, h } = sz();
  if (w !== resize.w || h !== resize.h) { resize.w = w; resize.h = h; world.resize(w, h); }
}
addEventListener('resize', resize);
let last = performance.now(), running = true, frames = 0, simT = 0;
function advance(dt) { // 测试也可直接调用 APP.step(dt)
  if (!paused) { now += dt * speed; simT += dt; sim.step(dt); }
  C.seek(now);
}
function draw() {
  const L = hudAndFx();
  world.render(simT + 20, { cam: camView(), sky: 'day', bloom: 0.75, dummies: L.dummies, fx: L.fx });
  panel(); frames++;
}
function frame(t) {
  requestAnimationFrame(frame);
  if (!running || curTab !== 'preview') { last = t; return; }
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  resize(); advance(dt); draw();
}
document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });

resetAll(); select('a');
const h = location.hash.slice(1);
if (['method', 'video'].includes(h)) showTab(h);
requestAnimationFrame(frame);
$('loading').classList.add('off');
window.APP = {
  world, C, cam, showTab, select, pickEl, hitNow, burst, resetAll,
  get now() { return now; }, get events() { return events; }, get frames() { return frames; },
  setUnits(u) { selU = u; },
  step(dt) { advance(dt); draw(); },
};
window.READY = true;
