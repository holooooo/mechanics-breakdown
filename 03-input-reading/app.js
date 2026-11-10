// 机制拆解 03 · 读指令简史 — 交互预览。原创教学原型，帧数为演示设计，不对应任何商业游戏。
import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter } from './src/sim.js';
import { pressure, weights, pick } from './src/pressure.js';
import { createDuel, MOVES, DODGE, THRUST, FPS, HP, reactionFrames } from './src/duel.js';
import * as PB from './src/pbboss.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mobile = innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const MODE_LABEL = { boss: '影之刃式', button: '读按键', state: '读动作', perceive: '看画面' };
const MODE_DESC = {
  boss: '它不读按键，只读你的状态：血量、按键频率、有没有在喝药 → 压力分 → 抽招',
  button: '按下的那一帧就知道（比动作开始还早 2 帧）',
  state: '动作状态机一开始跑就被通知，没有感知延迟',
  perceive: '要先看见起手姿势，再等“感知延迟”帧才能行动',
};
const KIND_LABEL = { slash: '慢斩', quick: '快斩', heal: '喝药' };
const RES_LABEL = { dodged: '躲开', hit: '命中', punished: '被惩罚', healed: '喝到了' };
const RES_GOOD = { dodged: false, hit: true, punished: false, healed: true };

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
const REGIONS = {
  duel: [['modes', 'modes · 三种“知道”的时刻'], ['perceive', 'perceive · 感知延迟'], ['react', 'react · 敌人的闪避反应']],
  pressure: [['pressure', 'pressure · 压力分'], ['weights', 'weights · 招式权重']],
  pbboss: [['sense', 'sense · Boss 只读状态'], ['choose', 'choose · 压力→抽招'], ['telegraph', 'telegraph · 红蓝光预兆'], ['resolve', 'resolve · 闪避/弹反判定'], ['shachi', 'shachi · 杀气与破防']],
};
const fillRegions = () => { $('region').innerHTML = REGIONS[$('file').value].map(([v, t]) => `<option value="${v}">${t}</option>`).join(''); };
const srcs = {};
async function loadRegion() {
  const code = $('code');
  try {
    const file = $('file').value, path = `src/${file}.js`;
    if (!srcs[file]) srcs[file] = await fetch('./' + path).then((r) => r.text());
    const src = srcs[file];
    const name = $('region').value;
    const m = src.match(new RegExp('//#region ' + name + '\\s*\\n([\\s\\S]*?)\\n\\s*//#endregion'));
    if (!m) { code.textContent = '// 没有找到区域 ' + name; return; }
    $('srcmeta').textContent = `${path} · #region ${name} · ${m[1].split('\n').length} 行`;
    code.innerHTML = highlight(m[1]);
  } catch (e) { code.textContent = '// 读取源码失败：' + e.message; }
}
$('file').onchange = () => { fillRegions(); loadRegion(); };
fillRegions();
$('region').onchange = loadRegion;
function highlight(s) {
  const re = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|of|in|new|export|continue|break|while|true|false|null|this|switch|case)\b|\b(\d+\.?\d*(?:e-?\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\()/g;
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
sim.schedule([{ t: 0, type: 'wind', x: 0.4, z: 0.2 }]);
world.setSim(sim);

// ---------- pressure panel ----------
// 影之刃式 Boss 模式：面板直接显示 Boss 内部真实在用的数字（pbboss.js 的 sense/pressure/weights）。
// 其它三种模式：仅展示，用同一套 pressure.js 估算，不影响对决。
const PRESS_WIN = 1.5, PICK_EVERY = 1.6, FIERCE = ['剑气', '红光投技'];
const presses = []; // 最近的按键时刻（模拟时间，秒）——仅用于非 Boss 模式的展示
let pickSlot = null, nextMove = null, pressureNow = null;
const hash01 = (n) => { let x = (Math.imul(n + 1, 0x9e3779b1) ^ 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0; x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0; return ((x ^ (x >>> 15)) >>> 0) / 4294967296; };
function pressureTick() {
  let input, p, ws, move, slot, cd = '';
  if (mode === 'boss') {
    const st = B.state();
    input = st.sense; p = st.pressure; ws = st.weights;
    move = st.last ? st.last.move : '—'; slot = st.last ? st.last.frame : -1;
    cd = '下次选招 ' + (st.nextDecideIn / FPS).toFixed(1) + 's';
  } else {
    while (presses.length && presses[0] < simT - PRESS_WIN) presses.shift();
    const pl = D.state().player;
    input = { hp: clamp(pl.hp / HP), pressesPerSec: presses.length / PRESS_WIN, healing: pl.action === 'heal' && pl.phase !== 'idle' };
    p = pressure(input); ws = weights(p);
    slot = Math.floor(simT / PICK_EVERY);
    if (slot !== pickSlot) { pickSlot = slot; nextMove = { name: pick(p, hash01(slot)), slot, at: simT }; }
    move = nextMove.name;
  }
  const total = ws.reduce((s, m) => s + m.w, 0);
  const fierce = ws.filter((m) => FIERCE.includes(m.name)).reduce((s, m) => s + m.w, 0) / total;
  pressureNow = { ...input, p, fierce, weights: ws.map((m) => ({ name: m.name, pct: m.w / total * 100 })), next: move, slot, cd };
  return pressureNow;
}
let pressKey = '';
function pressurePanel() {
  const s = pressureTick();
  const hot = FIERCE.includes(s.next);
  const key = [mode, s.p.toFixed(3), s.pressesPerSec.toFixed(2), s.hp.toFixed(2), s.healing, s.slot, s.next, s.cd].join('|');
  if (key === pressKey) return; pressKey = key;
  $('pfill').style.width = (s.p * 100).toFixed(0) + '%';
  $('pval').textContent = s.p.toFixed(2);
  $('pins').innerHTML = `<span>血量 <b>${Math.round(s.hp * 100)}%</b></span><span>按键 <b>${s.pressesPerSec.toFixed(1)}</b>/秒</span><span>喝药 <b>${s.healing ? '是' : '否'}</b></span>`;
  const max = Math.max(...s.weights.map((w) => w.pct));
  $('pw').innerHTML = s.weights.map((w) => `<div class="pr${FIERCE.includes(w.name) ? ' fierce' : ''}"><span>${w.name}</span><div class="pb"><i style="width:${(w.pct / max * 100).toFixed(0)}%"></i></div><em>${w.pct.toFixed(1)}%</em></div>`).join('');
  $('pcd').textContent = s.cd;
  const el = $('pnext');
  if (el.textContent !== s.next || el.dataset.slot !== String(s.slot)) {
    el.textContent = s.next; el.dataset.slot = s.slot;
    el.classList.toggle('hot', hot);
    if (hot) el.animate([{ background: 'rgba(255,60,60,.9)', transform: 'scale(1.15)' }, { background: 'rgba(255,60,60,.18)', transform: 'none' }], { duration: 700 });
  }
}

// ---------- duel state ----------
const PX = -0.95, EX = 0.95, FZ = 0.2;
let mode = 'boss', delay = reactionFrames(250), aggression = 1;
let D = null, acts = [], now = 0, paused = false, speed = 1, simT = 0;
const log = []; // 已结算的结果（跨模式保留，用来对比）
let resolved = new Set(); // 当前对局里已写入 log 的动作序号
let seq = 0;

// ---- 影之刃式 Boss 的状态（逻辑全在 src/pbboss.js，这里只负责喂输入、读状态、画出来）----
let B = null, bossSeed = 7, pending = [], bacc = 0, bst = null, over = 0, overMsg = '';
const blog = []; // 战斗记录
const fx = { playerHit: -99, bossHit: -99, result: null, resultAt: -99 };
function newBoss(seed = bossSeed) {
  bossSeed = seed; B = PB.createBoss({ seed }); pending = []; bacc = 0; over = 0; overMsg = '';
  fx.playerHit = fx.bossHit = fx.resultAt = -99; bst = B.state(); blog.length = 0; renderLog.k = '';
}
const RESULT_TXT = {
  '红光投技': { dodged: ['红光投技 → 你闪开了', 1, '闪开！'], grabbed: ['红光投技 → 被抓', 0, '被抓'] },
  '普通连斩': { parried: ['蓝光连斩 → 弹反成功', 1, '弹反！'], dodged: ['蓝光连斩 → 你闪开了', 1, '闪开！'], hit: ['蓝光连斩 → 挨了一刀', 0, '中招'] },
  '剑气': { parried: ['蓝光剑气 → 弹反成功', 1, '弹反！'], dodged: ['蓝光剑气 → 你闪开了', 1, '闪开！'], hit: ['蓝光剑气 → 被打中', 0, '中招'] },
};
function bossEvent(e) {
  if (e.type === 'result') {
    const r = RESULT_TXT[e.move] && RESULT_TXT[e.move][e.outcome]; if (!r) return;
    blog.push({ txt: r[0], good: !!r[1], frame: e.frame }); fx.result = r; fx.resultAt = e.frame;
    if (!r[1]) fx.playerHit = e.frame;
  } else if (e.type === 'pick') blog.push({ txt: `抽招 ${e.move} · 压力 ${e.p.toFixed(2)}`, dim: true, frame: e.frame });
  else if (e.type === 'guard_break') blog.push({ txt: '杀气打空 → Boss 破防！', good: true, frame: e.frame });
  else if (e.type === 'player_break') blog.push({ txt: '你的杀气打空 → 被打晕', good: false, frame: e.frame });
  else if (e.type === 'whiff') blog.push({ txt: '后撤步 → 你挥空了', good: false, frame: e.frame });
  else if (e.type === 'boss_hit') fx.bossHit = e.frame;
  else if (e.type === 'heal') blog.push({ txt: '喝药 → 回血 +' + e.amount, good: true, frame: e.frame });
  while (blog.length > 60) blog.shift();
}
function bossFrame() {
  if (over > 0) { if (--over === 0) newBoss(bossSeed + 1); return; }
  const ins = pending; pending = [];
  B.step(ins).forEach(bossEvent);
  bst = B.state();
  if (bst.player.hp <= 0 || bst.boss.hp <= 0) { over = 150; overMsg = bst.boss.hp <= 0 ? 'Boss 倒下了' : '你倒下了'; blog.push({ txt: overMsg, good: bst.boss.hp <= 0 }); }
}

function newDuel() {
  D = createDuel({ mode: mode === 'boss' ? 'perceive' : mode, delay, aggression });
  acts = []; now = 0; resolved = new Set();
  D.schedule(acts); D.seek(now);
  lastChartKey = '';
  if (mode === 'boss') newBoss();
}
const curFrame = () => Math.round(now * FPS);
function act(kind) {
  if (mode === 'boss') {
    if (!PB.PLAYER[kind]) return;
    pending.push(kind); flashBtn(kind); return;
  }
  if (!MOVES[kind]) return;
  presses.push(simT);
  const frame = curFrame();
  if (acts.some((a) => a.frame === frame)) return; // 同一帧只算一次
  acts.push({ frame, kind });
  D.schedule(acts); D.seek(now);
  flashBtn(kind);
}

// ---------- poses (from film.js) ----------
const BASE_P = { armR: [0.75, 0.12], elbowR: 0.9, sword: -0.2, armL: [0.35, 0.25], elbowL: 0.8, lean: 0.05, legSpread: 0.5 };
// 玩家姿势：phase 为 startup/active/recovery，pf 为该阶段内的帧号，mv 为 {startup, active, recovery}
function playerPose(action, phase, pf, mv) {
  let P = BASE_P, dx = 0, swing = 0;
  if (action === 'heal' && phase !== 'idle') {
    const k = phase === 'startup' ? clamp(pf / 8) : phase === 'recovery' ? 1 - clamp(pf / 8) : 0;
    P = { ...P, armL: [lerp(0.35, 2.3, k), 0.35], elbowL: lerp(0.8, 2.2, k), drink: k > 0.3, lean: -0.1 * k };
  } else if (mv && phase === 'startup') {
    const k = easeOut(pf / mv.startup);
    P = { ...P, armR: [lerp(0.75, 2.7, k), 0.25], elbowR: lerp(0.9, 0.5, k), sword: lerp(-0.2, 0.9, k), lean: -0.15 * k, crouch: 0.25 * k };
  } else if (mv && phase === 'active') {
    const k = easeOut((pf + 1) / mv.active);
    P = { ...P, armR: [lerp(2.7, 0.2, k), 0.1], elbowR: 0.1, sword: lerp(0.9, -0.4, k), lean: 0.45, crouch: 0.25, twist: -0.4 * k }; dx = 0.35 * k; swing = 1;
  } else if (mv && phase === 'recovery') {
    const k = ease(pf / mv.recovery);
    P = { ...P, armR: [lerp(0.2, 0.75, k), 0.12], elbowR: lerp(0.1, 0.9, k), sword: lerp(-0.4, -0.2, k), lean: lerp(0.45, 0.05, k), crouch: 0.25 * (1 - k) }; dx = 0.35 * (1 - k); swing = Math.max(0, 1 - pf / 6);
  }
  return { P, dx, swing };
}
function poses(st) {
  const p = st.player, e = st.enemy, f = st.frame;
  const recent = (type) => { let best = 99; for (const ev of st.events) if (ev.type === type) best = Math.min(best, f - ev.frame); return best; };
  const { P, dx, swing } = playerPose(p.action, p.phase, p.phaseFrame, p.action ? MOVES[p.action] : null);
  const px = PX + dx;
  const pHit = recent('hit_player');
  let E = { armR: [0.7, 0.15], elbowR: 1.0, sword: -0.1, armL: [0.3, 0.25], elbowL: 0.7, lean: 0.05, legSpread: 0.5 }, ex = EX, ez = FZ, ghost = 0, eSwing = 0;
  const sf = e.stateFrame;
  if (e.state === 'dodge_startup' || e.state === 'dodge_iframes' || e.state === 'recover') {
    const tot = e.state === 'dodge_startup' ? sf / (DODGE.startup + DODGE.iframes) : e.state === 'dodge_iframes' ? (DODGE.startup + sf) / (DODGE.startup + DODGE.iframes) : 1;
    const back = e.state === 'recover' ? 1 - clamp(sf / DODGE.recover) : 1;
    const k = easeOut(clamp(tot * 1.6)) * back;
    ez = FZ + 0.95 * k; ex = EX + 0.25 * k;
    E = { ...E, crouch: 0.45 * k, tilt: 0.25 * k, lean: 0.25 * k };
    ghost = e.state === 'dodge_iframes' ? 1 : 0;
  } else if (e.state === 'thrust_startup') {
    const k = easeOut(sf / THRUST.startup);
    E = { ...E, armR: [lerp(0.7, 1.4, k), 0.1], elbowR: lerp(1.0, 2.0, k), sword: lerp(-0.1, 0.0, k), lean: -0.2 * k, crouch: 0.3 * k };
  } else if (e.state === 'thrust_active') {
    const k = easeOut((sf + 1) / THRUST.active);
    E = { ...E, armR: [1.5, 0.05], elbowR: lerp(2.0, 0.05, k), sword: 0.0, lean: 0.5, crouch: 0.3 }; ex = EX - 0.9 * k; eSwing = 1;
  } else if (e.state === 'waiting' || e.state === 'noticed') {
    E = { ...E, crouch: 0.12, lean: 0.12 };
  }
  const eHit = recent('hit_enemy');
  return [
    { kind: 'player', x: px, z: FZ, yaw: Math.PI / 2, pose: P, flash: pHit < 8 ? 1 - pHit / 8 : 0, swing, glint: swing },
    { kind: 'enemy', x: ex, z: ez, yaw: -Math.PI / 2, pose: E, flash: eHit < 8 ? 1 - eHit / 8 : 0, ghost, swing: eSwing, glint: e.state === 'noticed' || e.state === 'waiting' ? 0.6 : 0 },
  ];
}

// ---------- poses: 影之刃式 Boss 模式 ----------
function posesBoss(st) {
  const p = st.player, b = st.boss, f = st.frame;
  const mv = p.action ? PB.PLAYER[p.action] : null;
  const pf = !mv ? 0 : p.phase === 'startup' ? p.f : p.phase === 'active' ? p.f - mv.startup : p.f - mv.startup - mv.active;
  let { P, dx, swing } = playerPose(p.action === 'dodge' || p.action === 'parry' ? null : p.action, p.phase, pf, p.action === 'slash' || p.action === 'quick' ? mv : null);
  let pz = FZ, pghost = 0, pglint = 0;
  if (p.action === 'dodge') { // 侧闪：无敌帧期间滑到一侧并留残影
    const t = p.phase === 'startup' ? p.f / (mv.startup + mv.active) : p.phase === 'active' ? (mv.startup + pf) / (mv.startup + mv.active) : 1 - pf / mv.recovery;
    const k = easeOut(clamp(t * 1.6)) * (p.phase === 'recovery' ? clamp(1 - pf / mv.recovery) : 1);
    pz = FZ + 0.95 * k; dx = -0.1 * k; P = { ...P, crouch: 0.45 * k, lean: 0.25 * k }; pghost = p.invuln ? 1 : 0;
  } else if (p.action === 'parry') { // 弹反：横剑格挡，窗口内剑身闪光
    const k = p.phase === 'recovery' ? 1 - clamp(pf / mv.recovery) : 1;
    P = { ...P, armR: [lerp(0.75, 1.8, k), 0.2], elbowR: lerp(0.9, 1.4, k), sword: lerp(-0.2, 0.55, k), lean: -0.12 * k, crouch: 0.15 * k };
    pglint = p.parrying ? 1 : 0.25 * k;
  }
  if (p.stun > 0) P = { ...P, lean: -0.35, crouch: 0.35 };
  const pHit = f - fx.playerHit, bHit = f - fx.bossHit;
  // 敌人
  let E = { armR: [0.7, 0.15], elbowR: 1.0, sword: -0.1, armL: [0.3, 0.25], elbowL: 0.7, lean: 0.05, legSpread: 0.5, crouch: 0.06 };
  let ex = EX, ez = FZ, eSwing = 0, ghost = 0, eGlint = 0, eFlash = 0;
  const sf = b.f, red = b.color === 'red';
  if (b.state === 'telegraph') {
    const k = easeOut(b.tel);
    E = { ...E, armR: [lerp(0.7, 2.6, k), 0.25], elbowR: lerp(1.0, 0.5, k), sword: lerp(-0.1, 0.9, k), lean: -0.2 * k, crouch: 0.3 * k };
    eGlint = 0.6 + 0.4 * Math.sin(f * 0.7);
    eFlash = red ? 0.25 + 0.25 * Math.sin(f * 0.8) ** 2 : 0;
    if (b.move === '红光投技') ex = EX + 0.15 * k;
  } else if (b.state === 'attack' || (b.state === 'recover' && sf < 8 && bst.boss.move)) {
    const lunge = b.move === '红光投技' ? 1.5 : b.move === '剑气' ? 0.1 : 0.85;
    const k = b.state === 'attack' ? easeOut(Math.min(1, (sf + 1) / 5)) : 1 - clamp(sf / 8);
    const second = b.move === '普通连斩' && sf >= 12;
    E = { ...E, armR: [1.5, second ? -0.15 : 0.05], elbowR: lerp(2.0, 0.05, k), sword: second ? 0.5 : 0.0, lean: 0.5, crouch: 0.3 };
    ex = EX - lunge * k; eSwing = b.move === '剑气' ? 1 : (sf < 6 || (sf >= 12 && sf < 18) ? 1 : 0.3);
  } else if (b.state === 'recover') {
    E = { ...E, lean: 0.12, crouch: 0.15, armR: [0.6, 0.15] };
  } else if (b.state === 'backstep') {
    const k = easeOut(clamp(sf / 14)) * (1 - ease(clamp((sf - 34) / 14)));
    ex = EX + 0.8 * k; E = { ...E, crouch: 0.35 * k, tilt: 0.15 * k, lean: 0.2 * k }; ghost = sf < 30 ? 1 : 0;
  } else if (b.state === 'stunned') {
    E = { ...E, lean: 0.55, crouch: 0.4, armR: [0.3, 0.1], elbowR: 0.6, tilt: 0.12 * Math.sin(f * 0.25) };
  }
  if (bHit < 8) eFlash = Math.max(eFlash, 1 - bHit / 8);
  return [
    { kind: 'player', x: PX + dx, z: pz, yaw: Math.PI / 2, pose: P, flash: pHit < 8 ? 1 - pHit / 8 : 0, swing, glint: Math.max(swing, pglint), ghost: pghost },
    { kind: 'enemy', x: ex, z: ez, yaw: -Math.PI / 2, pose: E, flash: eFlash, ghost, swing: eSwing, glint: eGlint },
  ];
}

// ---------- results ----------
const resolveFrame = (tl, kind) => (kind === 'heal' && tl.result === 'punished' ? tl.enemyDecide + THRUST.startup : tl.activeStart);
function settle(f) {
  acts.forEach((a, i) => {
    if (resolved.has(i)) return;
    const tl = D.timeline(i), rf = resolveFrame(tl, a.kind);
    if (f >= rf) {
      resolved.add(i);
      log.push({ id: ++seq, kind: a.kind, mode, delay, result: tl.result, frame: rf, at: now });
      if (log.length > 80) log.shift();
    }
  });
}
function renderLog() {
  if (mode === 'boss') {
    const k = 'b' + blog.length + ':' + (blog.length ? blog[blog.length - 1].txt : '');
    if (renderLog.k === k) return; renderLog.k = k;
    $('log').innerHTML = blog.slice(-40).reverse().map((e) => `<div class="${e.dim ? 't' : e.good ? 'good' : 'bad'}">${esc(e.txt)}</div>`).join('') || '<div class="t">还没有交手。红光闪避，蓝光弹反，结果会记在这里。</div>';
    return;
  }
  const key = log.length + ':' + (acts.length - resolved.size);
  if (renderLog.k === key) return; renderLog.k = key;
  const pend = acts.map((a, i) => (resolved.has(i) ? '' : `<div class="pend">… ${KIND_LABEL[a.kind]} · ${MODE_LABEL[mode]} · 结算中</div>`)).join('');
  const rows = log.slice(-40).reverse().map((e) => {
    const d = e.mode === 'perceive' ? ` ${e.delay} 帧 ≈ ${Math.round(e.delay * 1000 / FPS)}ms` : '';
    return `<div class="${RES_GOOD[e.result] ? 'good' : 'bad'}"><b>${RES_LABEL[e.result]}</b> <span class="t">${KIND_LABEL[e.kind]} · ${MODE_LABEL[e.mode]}${d}</span></div>`;
  }).join('');
  $('log').innerHTML = pend + (rows || '<div class="t">还没有出招。按 J / K / H，结果会记在这里。</div>');
}

// ---------- frame-data chart (from film.js) ----------
let lastChartKey = '';
function chart() {
  if (!acts.length) {
    const k = 'empty'; if (lastChartKey !== k) { lastChartKey = k; $('chart').innerHTML = '<div class="chartempty">按 J / K / H 出招，这里会显示这一次的帧数据</div>'; }
    return;
  }
  const idx = acts.length - 1, kind = acts[idx].kind, tl = D.timeline(idx), f = curFrame();
  const mv = MOVES[kind], heal = kind === 'heal';
  const f0 = tl.input - 6, f1 = heal ? tl.activeStart + MOVES.heal.recovery + 4 : tl.activeEnd + 12;
  const narrow = $('chart').clientWidth < 600, VW = narrow ? 520 : 1500, X0 = narrow ? 128 : 250, W = VW - X0 - 20, px = W / (f1 - f0), X = (fr) => (X0 + (fr - f0) * px).toFixed(1);
  const cl = (v) => (v == null ? v : clamp(v, f0, f1));
  const row = (y, label, a0, b0, col, txt) => {
    const a = cl(a0), b = cl(b0);
    return `<text x="${X0 - 14}" y="${y + 21}" text-anchor="end" fill="#cfd8de" font-size="22">${label}</text>` +
      (a == null ? '' : `<rect x="${X(a)}" y="${y + 3}" width="${Math.max(4, (b - a) * px).toFixed(1)}" height="26" rx="5" fill="${col}"/>${txt ? `<text x="${(+X(a) + 8).toFixed(0)}" y="${y + 23}" fill="#0b1118" font-size="18" font-weight="700">${txt}</text>` : ''}`);
  };
  const rf = resolveFrame(tl, kind), done = f >= rf;
  const good = RES_GOOD[tl.result];
  const rows = heal ? [
    row(8, '你按下键', tl.input, tl.input + 1, '#ffcf73', ''),
    row(42, '喝药动作', tl.actionStart, tl.activeStart, 'rgba(126,224,160,.7)', '喝药 ' + mv.startup + ' 帧'),
    row(76, '敌人得知', tl.enemyNotice, tl.enemyDecide + 1, '#9ad1ff', tl.enemyDecide > tl.enemyNotice ? '反应 ' + (tl.enemyDecide - tl.enemyNotice) + ' 帧' : ''),
    row(110, '惩罚突刺', tl.result === 'punished' ? tl.enemyDecide : null, tl.enemyDecide + THRUST.startup + THRUST.active, '#ff7a5a', '突刺 ' + THRUST.startup + ' 帧'),
    row(144, '回血', tl.result === 'healed' ? tl.activeStart : null, tl.activeStart + 2, '#7ee08f', ''),
  ] : [
    row(8, '你按下键', tl.input, tl.input + 1, '#ffcf73', ''),
    row(42, '动作开始', tl.actionStart, tl.activeStart, 'rgba(255,207,115,.55)', '前摇 ' + mv.startup + ' 帧'),
    row(76, '命中窗口', tl.activeStart, tl.activeEnd + 1, '#ff7a5a', ''),
    row(110, '敌人得知', tl.enemyNotice, tl.enemyDecide + 1, '#9ad1ff', tl.enemyDecide > tl.enemyNotice ? '反应 ' + (tl.enemyDecide - tl.enemyNotice) + ' 帧' : ''),
    row(144, '敌人无敌', tl.enemyInvuln, tl.enemyInvuln != null ? tl.enemyInvuln + DODGE.iframes : null, '#7ee08f', ''),
  ];
  const ph = clamp(f, f0, f1);
  const key = JSON.stringify([tl, idx, kind, ph]) + done + VW;
  if (key === lastChartKey) return; lastChartKey = key;
  $('chart').innerHTML = `<svg viewBox="0 0 ${VW} 196" preserveAspectRatio="xMidYMid meet">
    ${rows.join('')}
    <line x1="${X(ph)}" y1="2" x2="${X(ph)}" y2="178" stroke="#fff" stroke-width="3"/>
    <text x="${X0 + W}" y="40" text-anchor="end" fill="${good ? '#7ee08f' : '#ff6b6b'}" font-size="34" font-weight="900" opacity="${done ? 1 : 0}">${RES_LABEL[tl.result]}</text>
    <text x="${X0 - 14}" y="190" fill="#8fa2ae" font-size="17">1 格 = 1 帧（1/60 秒）　第 ${f} 帧</text></svg>`;
}

// ---------- HUD ----------
const hudEl = $('hud');
function hud(fighters, st) {
  let h = '';
  const f = st.frame;
  const names = [['你', st.player.hp, '#ffcf73'], ['敌人 · ' + MODE_LABEL[mode], st.enemy.hp, '#ff7a5a']];
  fighters.forEach((fi, i) => {
    const p = world.project(fi.x, 2.05, fi.z); if (p.z > 1) return;
    const hp = clamp(names[i][1] / HP);
    let tag = '';
    if (i === 1) {
      if (st.enemy.state === 'waiting') tag = '<div class="st" style="color:#ffcf73">反应中…</div>';
      else if (st.enemy.state === 'noticed') tag = '<div class="st" style="color:#ff6b6b">!</div>';
    }
    h += `<div class="fh" style="left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px">${tag}<div class="nm glass" style="border-radius:99px;color:${names[i][2]}">${names[i][0]}</div><div class="hp"><i style="width:${(hp * 100).toFixed(0)}%;background:${names[i][2]}"></i></div></div>`;
  });
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i], age = f - e.frame; if (age < 0) continue; if (age > 70) break;
    if (e.at > now + 0.01) continue;
    const e0 = fighters[1], q = world.project(e0.x, 1.2 + age * 0.012, e0.z);
    h += `<div class="pop" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;opacity:${(1 - age / 70).toFixed(2)};color:${RES_GOOD[e.result] ? '#7ee08f' : '#ff6b6b'}">${RES_LABEL[e.result]}</div>`;
    break;
  }
  if (hudEl.dataset.h !== h) { hudEl.innerHTML = h; hudEl.dataset.h = h; }
}

function hudBoss(fighters, st) {
  let h = '';
  const f = st.frame, P = st.player, Bo = st.boss;
  const E = fighters[1], Pl = fighters[0];
  const bar = (hp, hpMax, sha, shaMax, color, name, ncolor, extra = '') => `<div class="nm glass" style="border-radius:99px;color:${ncolor}">${name}</div><div class="hp"><i style="width:${(clamp(hp / hpMax) * 100).toFixed(0)}%;background:${color}"></i></div><div class="sha${sha / shaMax < 0.25 ? ' low' : ''}"><i style="width:${(clamp(sha / shaMax) * 100).toFixed(0)}%"></i></div><div class="bl"><span>血 ${Math.round(hp)}</span><span>杀气 ${Math.round(sha)}</span></div>${extra}`;
  [[Pl, bar(P.hp, PB.MAX_HP, P.sha, PB.SHA_MAX, '#ffcf73', '你', '#ffcf73')], [E, bar(Bo.hp, PB.BOSS_HP, Bo.sha, PB.SHA_MAX, '#ff7a5a', 'Boss · 影之刃式', '#ff7a5a', Bo.state === 'stunned' ? '<div class="st" style="color:#7ee08f">破防！</div>' : '')]].forEach(([fi, inner]) => {
    const q = world.project(fi.x, 2.15, fi.z); if (q.z > 1) return;
    h += `<div class="fh" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px">${inner}</div>`;
  });
  // 红/蓝光预兆：光晕 + 浮动文字
  if (Bo.state === 'telegraph' && Bo.color) {
    const q = world.project(E.x, 1.0, E.z), t = world.project(E.x, 1.9, E.z);
    const a = (0.45 + 0.55 * Bo.tel) * (0.8 + 0.2 * Math.sin(f * 0.9));
    h += `<div class="glow ${Bo.color}" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;opacity:${a.toFixed(2)}"></div>`;
    h += `<div class="tlabel ${Bo.color}" style="left:${t.x.toFixed(0)}px;top:${Math.max(40, t.y).toFixed(0)}px">${Bo.label}</div>`;
  }
  if (st.proj != null) { // 剑气弹道：从 Boss 飞向你
    const a = world.project(EX - 0.3, 1.2, FZ), b2 = world.project(PX + 0.2, 1.2, FZ), k = st.proj;
    h += `<div class="orb" style="left:${(a.x + (b2.x - a.x) * k).toFixed(0)}px;top:${(a.y + (b2.y - a.y) * k).toFixed(0)}px"></div>`;
  }
  const age = f - fx.resultAt;
  if (fx.result && age >= 0 && age < 70) {
    const q = world.project(Pl.x, 1.6 + age * 0.012, Pl.z);
    h += `<div class="pop" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;opacity:${(1 - age / 70).toFixed(2)};color:${fx.result[1] ? '#7ee08f' : '#ff6b6b'}">${fx.result[2]}</div>`;
  }
  if (over > 0) h += `<div class="banner" style="color:${Bo.hp <= 0 ? '#7ee08f' : '#ff6b6b'}">${overMsg}</div>`;
  if (hudEl.dataset.h !== h) { hudEl.innerHTML = h; hudEl.dataset.h = h; }
}

// ---------- controls ----------
function flashBtn(kind) {
  const b = $('b-' + kind); if (!b) return;
  b.animate([{ transform: 'scale(.93)', filter: 'brightness(1.6)' }, { transform: 'none', filter: 'none' }], { duration: 160 });
}
const KEYCHIPS = {
  boss: [['J', '慢斩'], ['K', '快斩'], ['H', '喝药'], ['L / 空格', '闪避'], ['P', '弹反']],
  duel: [['J', '慢斩'], ['K', '快斩'], ['H', '喝药']],
};
const HINT = {
  boss: '你在左，Boss 在右 · 红光 → 闪避（L / 空格），蓝光 → 弹反（P）',
  duel: '你在左，敌人在右 · 用键盘 J / K / H 或右侧按钮出招',
};
const TIP = {
  boss: '<b>试试看：</b>先冷静地每两秒出一刀，看它多半出蓝光连斩；再狂按 K、喝药、让血量下降，看压力条升高、<b style="color:#ff8f86">红光投技</b>变多。红光只能闪，蓝光可以弹反。',
  duel: '<b>试试看：</b>先在「看画面」下出<b>快斩</b>（命中），再切到「读动作」出<b>快斩</b>（被躲开）。同一招，差别只在敌人“知道”的那一帧。',
};
function syncUI() {
  const isBoss = mode === 'boss';
  document.body.classList.toggle('boss', isBoss);
  $('keys').innerHTML = KEYCHIPS[isBoss ? 'boss' : 'duel'].map(([k, t]) => `<span class="chip"><b>${k}</b> ${t}</span>`).join('');
  $('hint').textContent = HINT[isBoss ? 'boss' : 'duel'];
  $('tip').innerHTML = TIP[isBoss ? 'boss' : 'duel'];
  $('logtitle').textContent = isBoss ? '战斗记录' : '结果记录';
  $('pdim').textContent = isBoss ? '正在驱动 Boss 选招' : '仅展示 · 不影响上面的对决';
  $('pnlabel').textContent = isBoss ? 'Boss 刚抽到' : '敌人下一招';
  $('phint').textContent = isBoss ? '它不读按键，只读你的状态：血量、按键频率、有没有在喝药。狂按、喝药、残血时，压力上升，狠招占比变大。' : '试试：狂按 J、喝药、残血时，压力会上升，狠招占比变大';
  pressKey = '';
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
  $('modedesc').textContent = MODE_DESC[mode];
  $('delay').value = delay; $('delay').disabled = mode !== 'perceive';
  $('delaybox').classList.toggle('off', mode !== 'perceive');
  $('delayout').textContent = `${delay} 帧 ≈ ${Math.round(delay * 1000 / FPS)} ms`;
  $('agg').value = Math.round(aggression * 100); $('aggout').textContent = Math.round(aggression * 100) + '%';
  $('b-pause').classList.toggle('on', paused); $('b-pause').textContent = paused ? '继续' : '暂停';
  document.querySelectorAll('[data-sp]').forEach((b) => b.classList.toggle('on', !paused && +b.dataset.sp === speed));
}
function setMode(m) { if (!MODE_LABEL[m] || m === mode) return; mode = m; newDuel(); syncUI(); }
function setDelay(d) { delay = clamp(Math.round(d), 0, 40); newDuel(); syncUI(); }
function setAggression(a) { aggression = clamp(a); newDuel(); syncUI(); }
function setSpeed(s) { speed = s; paused = false; syncUI(); }
function setPaused(p) { paused = p; syncUI(); }
document.querySelectorAll('#modes button').forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
document.querySelectorAll('.acts button').forEach((b) => (b.onclick = () => act(b.dataset.k)));
document.querySelectorAll('[data-sp]').forEach((b) => (b.onclick = () => setSpeed(+b.dataset.sp)));
$('b-pause').onclick = () => setPaused(!paused);
$('b-reset').onclick = () => { newDuel(); log.length = 0; renderLog.k = ''; if (mode === 'boss') newBoss(); };
$('delay').oninput = (e) => { $('delayout').textContent = `${e.target.value} 帧 ≈ ${Math.round(e.target.value * 1000 / FPS)} ms`; };
$('delay').onchange = (e) => setDelay(+e.target.value);
$('agg').oninput = (e) => { $('aggout').textContent = e.target.value + '%'; };
$('agg').onchange = (e) => setAggression(+e.target.value / 100);
const KEYS = { KeyJ: 'slash', KeyK: 'quick', KeyH: 'heal', KeyL: 'dodge', KeyP: 'parry' };
addEventListener('keydown', (e) => {
  if (curTab !== 'preview' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = KEYS[e.code];
  if (k) { if (mode === 'boss' || MOVES[k]) { e.preventDefault(); act(k); } }
  else if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); if (mode === 'boss') act('dodge'); else setPaused(!paused); }
});

// ---------- loop ----------
function resize() {
  const { w, h } = sz();
  if (w !== resize.w || h !== resize.h) { resize.w = w; resize.h = h; world.resize(w, h); }
}
addEventListener('resize', resize);
const camSide = (lt, dist = 4.9, h = 1.3, yaw = 1.5708 + 0.25) => {
  const r = dist * 0.95, y = yaw + Math.sin(lt * 0.15) * 0.05, tg = [0, 0.85, FZ + 0.35];
  return { pos: [tg[0] + Math.cos(y) * r, tg[1] + h - 0.0, tg[2] + Math.sin(y) * r], target: tg, fov: 36 };
};
function aspectDist() { const a = stage.clientWidth / Math.max(1, stage.clientHeight); return a < 1.2 ? 6.4 : a < 1.7 ? 5.4 : 4.9; }
let last = performance.now(), running = true, frames = 0;
function advance(dt, force = false) {
  if (!paused || force) {
    now += dt * speed; simT += dt; sim.seek(10 + simT * 0.2);
    if (mode === 'boss') { bacc += dt * speed; while (bacc >= 1 / FPS - 1e-9) { bacc -= 1 / FPS; bossFrame(); } }
  }
  if (mode === 'boss') return;
  D.seek(now);
  settle(curFrame());
}
function draw() {
  const isBoss = mode === 'boss';
  const st = isBoss ? bst : D.state();
  const fighters = isBoss ? posesBoss(st) : poses(st);
  world.render(10 + simT, { cam: camSide(simT, aspectDist(), 2.0, 1.5708 + 0.25), sky: 'day', bloom: 0.6, fighters, noTrees: true });
  if (isBoss) hudBoss(fighters, st); else { hud(fighters, st); chart(); }
  pressurePanel(); renderLog(); frames++;
}
function frame(t) {
  requestAnimationFrame(frame);
  if (!running || curTab !== 'preview') { last = t; return; }
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  resize(); advance(dt); draw();
}
document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });

newDuel(); syncUI(); renderLog();
const h = location.hash.slice(1);
if (['method', 'video'].includes(h)) showTab(h);
requestAnimationFrame(frame);
$('loading').classList.add('off');
// 测试用：不画画面，直接推进 Boss n 帧（inputs 为 {帧偏移: [输入...]}）
function bossFrames(n, inputs = {}) {
  for (let i = 0; i < n; i++) { (inputs[i] || []).forEach((k) => pending.push(k)); bossFrame(); simT += 1 / FPS; now += 1 / FPS; }
  return bst;
}
// 测试用：用一个独立的 Boss 跑一遍「玩家策略」，统计抽到的招式与结算（策略见调用方）
function simulate(kind, seed = 1, seconds = 20) {
  const b = PB.createBoss({ seed }), picks = {}, res = {};
  for (let i = 0; i < seconds * FPS; i++) {
    const s = b.state(), ins = [];
    // 一个会反应的玩家：红光预兆 10 帧后闪避，蓝光预兆 6 帧前弹反（总是在按键之前）
    if (s.boss.state === 'telegraph' && s.boss.f === (s.boss.color === 'red' ? 20 : 24)) ins.push(s.boss.color === 'red' ? 'dodge' : 'parry');
    if (s.proj != null && Math.round(s.proj * 36) === 33) ins.push('parry');
    if (kind === 'calm') { if (i % 120 === 0) ins.push('slash'); }            // 每 2 秒一刀
    else { if (i % 7 === 0) ins.push('quick'); if (i % 180 === 0) ins.push('heal'); } // 约 8.5 次/秒 + 喝药
    b.step(ins).forEach((e) => {
      if (e.type === 'pick') picks[e.move] = (picks[e.move] || 0) + 1;
      if (e.type === 'result') res[e.move + '→' + e.outcome] = (res[e.move + '→' + e.outcome] || 0) + 1;
    });
  }
  return { picks, res, hp: b.state().player.hp, bossHp: b.state().boss.hp };
}
window.APP = {
  world, PB, newBoss, bossFrames, simulate,
  get B() { return B; }, get bst() { return bst; }, get blog() { return blog; }, showTab, act, setMode, setDelay, setAggression, setSpeed, setPaused, MOVES,
  get D() { return D; }, get log() { return log; }, get acts() { return acts; }, get mode() { return mode; }, get delay() { return delay; },
  get now() { return now; }, get frames() { return frames; }, get paused() { return paused; },
  state: () => D.state(),
  get pressure() { return pressureNow || pressureTick(); },
  get presses() { return presses; },
  get simT() { return simT; },
  reset() { newDuel(); log.length = 0; renderLog.k = ''; if (mode === 'boss') newBoss(); },
  step(dt) { advance(dt, true); draw(); },
};
window.READY = true;
