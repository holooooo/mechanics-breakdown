import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter, N } from './src/sim.js';

const $ = (id) => document.getElementById(id);
const mobile = innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);

// ---------- tabs ----------
let curTab = 'preview';
function showTab(name) {
  curTab = name;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + name));
  if (name === 'preview') requestAnimationFrame(resize);
  if (name === 'method') loadRegion();
  if (name !== 'video') document.querySelector('video')?.pause();
  location.hash = name === 'preview' ? '' : name;
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

// ---------- source viewer ----------
let simSrc = null;
async function loadRegion() {
  const code = $('code');
  try {
    if (!simSrc) simSrc = await fetch('./src/sim.js').then(r => r.text());
    const name = $('region').value;
    const m = simSrc.match(new RegExp('//#region ' + name + '\\s*\\n([\\s\\S]*?)\\n\\s*//#endregion'));
    if (!m) { code.textContent = '// 没有找到区域 ' + name; return; }
    $('srcmeta').textContent = `src/sim.js · #region ${name} · ${m[1].split('\n').length} 行`;
    code.innerHTML = highlight(m[1]);
  } catch (e) { code.textContent = '// 读取源码失败：' + e.message; }
}
$('region').onchange = loadRegion;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function highlight(src) {
  const re = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|of|in|new|export|continue|break|while|true|false|null|this|switch|case|default)\b|\b(\d+\.?\d*(?:e-?\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\()/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f';
    out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}

// ---------- world ----------
const canvas = $('gl');
const stage = document.querySelector('.stage');
const pr = Math.min(devicePixelRatio || 1, 1.5);
const sz = () => ({ w: Math.max(2, stage.clientWidth), h: Math.max(2, stage.clientHeight) });
const { w: w0, h: h0 } = sz();
const world = await createWorld(canvas, { width: w0, height: h0, pixelRatio: pr, quality: mobile ? 0.6 : 1 });
const THREE = world.THREE;

let sim, layout = 'meadow', paused = false, speed = 1, shockOn = false, rainOn = false;
const ST = { sky: 'day', data: false, field: 0, wdir: 0, wstr: 0 };
const cam = { yaw: 0.6, pitch: 0.75, dist: 12.5, target: [0, 0.3, 0] };
const home = { ...cam };

function loadScene(id) {
  layout = id;
  sim = createSim(id);
  Object.assign(sim, { CELL, cellAt, cellCenter });
  world.setSim(sim);
  shockOn = rainOn = false;
  $('b-rain').classList.remove('on'); $('b-rain').textContent = '下雨';
  $('b-shock').classList.remove('on'); $('b-shock').textContent = '通电';
  applyWind();
  window.SIM = sim;
}
function applyWind() {
  const a = ST.wdir * Math.PI / 180;
  sim.setWind(Math.cos(a) * ST.wstr, Math.sin(a) * ST.wstr);
  const names = ['东', '东南', '南', '西南', '西', '西北', '北', '东北'];
  $('o-dir').textContent = names[Math.round(ST.wdir / 45) % 8] + ' ' + ST.wdir + '°';
  $('o-str').textContent = ST.wstr.toFixed(1);
}

// ---------- camera ----------
function camView() {
  const cp = Math.cos(cam.pitch), t = cam.target;
  return {
    pos: [t[0] + Math.sin(cam.yaw) * cp * cam.dist, t[1] + Math.sin(cam.pitch) * cam.dist, t[2] + Math.cos(cam.yaw) * cp * cam.dist],
    target: t, fov: 40,
  };
}
const clampCam = () => {
  cam.pitch = Math.max(0.12, Math.min(1.5, cam.pitch));
  cam.dist = Math.max(4, Math.min(22, cam.dist));
};
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
function pickGround(cx, cy) {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, world.camera);
  const p = new THREE.Vector3();
  // 先按地面高度迭代修正一次，避免丘陵处偏移
  if (!ray.ray.intersectPlane(plane, p)) return null;
  const h = world.heightAt(p.x, p.z);
  if (Number.isFinite(h)) {
    plane.constant = -h;
    ray.ray.intersectPlane(plane, p);
    plane.constant = -0.05;
  }
  return p;
}
function igniteAt(x, z, r = 0.5) {
  const i = cellAt(x, z);
  if (i < 0 || sim.mat[i] === 0) return false;
  sim.ignite(x, z, r);
  return true;
}

// pointer: 1 pointer drag = orbit (click if tiny move), 2 = pinch
const ptrs = new Map(); let moved = 0, pinch0 = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6) { cam.yaw -= dx * 0.006; cam.pitch += dy * 0.005; clampCam(); }
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0) { cam.dist *= pinch0 / d; clampCam(); }
    pinch0 = d;
  }
});
const endPtr = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  const wasOne = ptrs.size === 1;
  ptrs.delete(e.pointerId);
  if (e.type === 'pointerup' && wasOne && moved <= 6) {
    const p = pickGround(e.clientX, e.clientY);
    if (p) igniteAt(p.x, p.z, 0.5);
  }
};
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist *= Math.exp(e.deltaY * 0.001); clampCam(); }, { passive: false });

// ---------- controls ----------
const FIRE = { meadow: [-1.6, 0.8], lab: [-1.1, 1.3], lift: [0, 0] };
const ICE = { meadow: [1.5, -1.5], lab: [2.2, 1.6], lift: [-2.5, 2] };
$('scene').onchange = (e) => { loadScene(e.target.value); };
$('sky').onchange = (e) => { ST.sky = e.target.value; };
$('b-fire').onclick = () => { const [x, z] = FIRE[layout]; sim.ignite(x, z, layout === 'lab' ? 0.5 : 0.6); };
$('b-rain').onclick = (e) => { rainOn = !rainOn; sim.rain(rainOn); e.target.classList.toggle('on', rainOn); e.target.textContent = rainOn ? '停雨' : '下雨'; };
$('b-shock').onclick = (e) => { shockOn = !shockOn; sim.shock(shockOn); e.target.classList.toggle('on', shockOn); e.target.textContent = shockOn ? '断电' : '通电'; };
$('b-ice').onclick = () => { const [x, z] = ICE[layout]; sim.placeIce(x, z, 0.6); };
$('b-glider').onclick = () => { const g = layout === 'lift' ? [2, 1.5] : [1.5, 1]; sim.spawnGlider(g[0], g[1], 1.6); };
$('b-reset').onclick = () => { loadScene(layout); };
$('wdir').oninput = (e) => { ST.wdir = +e.target.value; applyWind(); };
$('wstr').oninput = (e) => { ST.wstr = +e.target.value; applyWind(); };
$('b-pause').onclick = (e) => { paused = !paused; e.target.classList.toggle('on', paused); e.target.textContent = paused ? '继续' : '暂停'; };
$('b-step').onclick = () => { if (!paused) $('b-pause').click(); sim.step(1 / 6); };
$('speed').onchange = (e) => { speed = +e.target.value; };
function dataView() {
  ST.data = $('b-data').classList.toggle('on');
  $('fields').classList.toggle('on', ST.data);
}
$('b-data').onclick = dataView;
document.querySelectorAll('input[name=field]').forEach(r => r.onchange = () => { ST.field = +r.value; });

// stats tiles
const TILES = [
  ['burning', '燃烧格', (s) => s.burning],
  ['burnt', '焦土格', (s) => s.burnt],
  ['maxTemp', '最高温 °C', (s) => Math.round(s.maxTemp)],
  ['wet', '潮湿格', (s) => s.wet],
  ['iceMass', '冰量', (s) => s.iceMass.toFixed(1)],
  ['charged', '带电格', (s) => s.charged],
  ['updraft', '上升气流', (s) => (+s.updraft).toFixed(2)],
  ['raining', '降雨', (s) => (+s.raining).toFixed(2)],
  ['receiverPowered', '接收器', (s) => s.receiverPowered ? '已通电' : '未通电'],
];
const statsEl = $('stats');
statsEl.innerHTML = TILES.map(([k, l]) => `<div class="stat" data-k="${k}"><b>-</b><span>${l}</span></div>`).join('');
const tileEls = TILES.map(([k, , f]) => [statsEl.querySelector(`[data-k=${k}]`), f, k]);
function updateStats() {
  const s = sim.stats();
  for (const [el, f, k] of tileEls) {
    el.firstChild.textContent = f(s);
    if (k === 'receiverPowered') el.classList.toggle('lit', !!s.receiverPowered);
  }
}

// ---------- loop ----------
function resize() {
  const { w, h } = sz();
  if (w !== resize.w || h !== resize.h) { resize.w = w; resize.h = h; world.resize(w, h); }
}
addEventListener('resize', resize);
let last = performance.now(), statT = 0, frames = 0, running = true;
function frame(now) {
  requestAnimationFrame(frame);
  if (!running || curTab !== 'preview') { last = now; return; }
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  resize();
  if (!paused) sim.step(dt * speed);
  const view = {
    cam: camView(), sky: ST.sky,
    data: ST.data ? 1 : 0, grid: ST.data ? 1 : 0,
    field: [0, 1, 2, 3].map(i => i === ST.field ? 1 : 0),
    focus: { i: -1, amount: 0 }, flash: 0, updraftVis: 1, bloom: 1,
  };
  world.render(sim.time, view);
  frames++;
  if ((statT += dt) > 0.2) { statT = 0; updateStats(); }
}
document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });

loadScene('meadow');
const h = location.hash.slice(1);
if (['method', 'video'].includes(h)) showTab(h);
requestAnimationFrame(frame);
$('loading').classList.add('off');
window.APP = { world, get sim() { return sim; }, cam, loadScene, showTab, get frames() { return frames; }, dataView };
window.READY = true;
