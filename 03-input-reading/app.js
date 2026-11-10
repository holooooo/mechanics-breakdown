// 机制拆解 03 · 读指令简史 — 交互预览。原创教学原型，帧数为演示设计，不对应任何商业游戏。
import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter } from './src/sim.js';
import { pressure, weights, pick } from './src/pressure.js';
import { createDuel, MOVES, DODGE, THRUST, FPS, HP, canReact, reactionFrames } from './src/duel.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mobile = innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const MODE_LABEL = { button: '读按键', state: '读动作', perceive: '看画面' };
const MODE_DESC = {
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
  duel: [['modes', 'modes · 三种“知道”的时刻'], ['perceive', 'perceive · 感知延迟'], ['fair', 'fair · 公平性判定'], ['react', 'react · 敌人的闪避反应']],
  pressure: [['pressure', 'pressure · 压力分'], ['weights', 'weights · 招式权重']],
};
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
$('file').onchange = () => {
  $('region').innerHTML = REGIONS[$('file').value].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  loadRegion();
};
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

// ---------- pressure (informational only) ----------
const PRESS_WIN = 1.5, PICK_EVERY = 1.6, FIERCE = ['剑气', '红光投技'];
const presses = []; // 最近的按键时刻（模拟时间，秒）
let pickSlot = null, nextMove = null, pressureNow = null;
const hash01 = (n) => { let x = (Math.imul(n + 1, 0x9e3779b1) ^ 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0; x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0; return ((x ^ (x >>> 15)) >>> 0) / 4294967296; };
function pressureTick() {
  while (presses.length && presses[0] < simT - PRESS_WIN) presses.shift();
  const st = D.state(), pl = st.player;
  const input = { hp: clamp(pl.hp / HP), pressesPerSec: presses.length / PRESS_WIN, healing: pl.action === 'heal' && pl.phase !== 'idle' };
  const p = pressure(input), ws = weights(p), total = ws.reduce((s, m) => s + m.w, 0);
  const slot = Math.floor(simT / PICK_EVERY);
  if (slot !== pickSlot) { pickSlot = slot; nextMove = { name: pick(p, hash01(slot)), slot, at: simT }; }
  const fierce = ws.filter((m) => FIERCE.includes(m.name)).reduce((s, m) => s + m.w, 0) / total;
  pressureNow = { ...input, p, fierce, weights: ws.map((m) => ({ name: m.name, pct: m.w / total * 100 })), next: nextMove.name };
  return pressureNow;
}
let pressKey = '';
function pressurePanel() {
  const s = pressureTick();
  const hot = FIERCE.includes(nextMove.name);
  const key = [s.p.toFixed(3), s.pressesPerSec.toFixed(2), s.hp.toFixed(2), s.healing, nextMove.slot, nextMove.name].join('|');
  if (key === pressKey) return; pressKey = key;
  $('pfill').style.width = (s.p * 100).toFixed(0) + '%';
  $('pval').textContent = s.p.toFixed(2);
  $('pins').innerHTML = `<span>血量 <b>${Math.round(s.hp * 100)}%</b></span><span>按键 <b>${s.pressesPerSec.toFixed(1)}</b>/秒</span><span>喝药 <b>${s.healing ? '是' : '否'}</b></span>`;
  const max = Math.max(...s.weights.map((w) => w.pct));
  $('pw').innerHTML = s.weights.map((w) => `<div class="pr${FIERCE.includes(w.name) ? ' fierce' : ''}"><span>${w.name}</span><div class="pb"><i style="width:${(w.pct / max * 100).toFixed(0)}%"></i></div><em>${w.pct.toFixed(1)}%</em></div>`).join('');
  const el = $('pnext');
  if (el.textContent !== nextMove.name || el.dataset.slot !== String(nextMove.slot)) {
    el.textContent = nextMove.name; el.dataset.slot = nextMove.slot;
    el.classList.toggle('hot', hot);
    if (hot) el.animate([{ background: 'rgba(255,60,60,.9)', transform: 'scale(1.15)' }, { background: 'rgba(255,60,60,.18)', transform: 'none' }], { duration: 700 });
  }
}

// ---------- duel state ----------
const PX = -0.95, EX = 0.95, FZ = 0.2;
let mode = 'perceive', delay = reactionFrames(250), aggression = 1;
let D = null, acts = [], now = 0, paused = false, speed = 1, simT = 0;
const log = []; // 已结算的结果（跨模式保留，用来对比）
let resolved = new Set(); // 当前对局里已写入 log 的动作序号
let seq = 0;

function newDuel() {
  D = createDuel({ mode, delay, aggression });
  acts = []; now = 0; resolved = new Set();
  D.schedule(acts); D.seek(now);
  lastChartKey = ''; lastFairKey = '';
}
const curFrame = () => Math.round(now * FPS);
function act(kind) {
  if (!MOVES[kind]) return;
  presses.push(simT);
  const frame = curFrame();
  if (acts.some((a) => a.frame === frame)) return; // 同一帧只算一次
  acts.push({ frame, kind });
  D.schedule(acts); D.seek(now);
  flashBtn(kind);
}

// ---------- poses (from film.js) ----------
function poses(st) {
  const p = st.player, e = st.enemy, f = st.frame;
  const recent = (type) => { let best = 99; for (const ev of st.events) if (ev.type === type) best = Math.min(best, f - ev.frame); return best; };
  let P = { armR: [0.75, 0.12], elbowR: 0.9, sword: -0.2, armL: [0.35, 0.25], elbowL: 0.8, lean: 0.05, legSpread: 0.5 }, px = PX, swing = 0;
  const mv = p.action ? MOVES[p.action] : null;
  if (p.action === 'heal' && p.phase !== 'idle') {
    const k = p.phase === 'startup' ? clamp(p.phaseFrame / 8) : p.phase === 'recovery' ? 1 - clamp(p.phaseFrame / 8) : 0;
    P = { ...P, armL: [lerp(0.35, 2.3, k), 0.35], elbowL: lerp(0.8, 2.2, k), drink: k > 0.3, lean: -0.1 * k };
  } else if (mv && p.phase === 'startup') {
    const k = easeOut(p.phaseFrame / mv.startup);
    P = { ...P, armR: [lerp(0.75, 2.7, k), 0.25], elbowR: lerp(0.9, 0.5, k), sword: lerp(-0.2, 0.9, k), lean: -0.15 * k, crouch: 0.25 * k };
  } else if (mv && p.phase === 'active') {
    const k = easeOut((p.phaseFrame + 1) / mv.active);
    P = { ...P, armR: [lerp(2.7, 0.2, k), 0.1], elbowR: 0.1, sword: lerp(0.9, -0.4, k), lean: 0.45, crouch: 0.25, twist: -0.4 * k }; px += 0.35 * k; swing = 1;
  } else if (mv && p.phase === 'recovery') {
    const k = ease(p.phaseFrame / mv.recovery);
    P = { ...P, armR: [lerp(0.2, 0.75, k), 0.12], elbowR: lerp(0.1, 0.9, k), sword: lerp(-0.4, -0.2, k), lean: lerp(0.45, 0.05, k), crouch: 0.25 * (1 - k) }; px += 0.35 * (1 - k); swing = Math.max(0, 1 - p.phaseFrame / 6);
  }
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

// ---------- fairness panel ----------
let lastFairKey = '';
function fairPanel() {
  const key = mode + delay; if (key === lastFairKey) return; lastFairKey = key;
  const ms = Math.round(delay * 1000 / FPS);
  const rows = ['slash', 'quick'].map((k) => {
    const m = MOVES[k], need = delay + DODGE.startup;
    const human = canReact({ startup: m.startup, delay });
    const enemy = mode === 'perceive' ? human : true;
    const fair = enemy === human;
    const note = fair
      ? (human ? `前摇 ${m.startup} ≥ ${delay}+${DODGE.startup}=${need}：它躲得开，合理` : `前摇 ${m.startup} < ${need}：来不及，它躲不开，合理`)
      : `前摇 ${m.startup} < ${need}：人来不及反应，它却躲开了`;
    return `<div class="fr ${fair ? 'ok' : 'no'}"><b>${KIND_LABEL[k]}</b><div><span class="v">${fair ? '公平' : '不公平'}</span><small>${note}</small></div></div>`;
  });
  const thrustHit = delay + THRUST.startup, humanPun = thrustHit < MOVES.heal.startup;
  const enemyPun = mode === 'perceive' ? humanPun : true;
  const hf = humanPun === enemyPun;
  rows.push(`<div class="fr ${hf ? 'ok' : 'no'}"><b>喝药</b><div><span class="v">${hf ? '公平' : '不公平'}</span><small>${mode === 'perceive' ? `突刺 ${delay}+${THRUST.startup}=${thrustHit} ${humanPun ? '<' : '≥'} 喝药 ${MOVES.heal.startup} 帧：${humanPun ? '来得及惩罚' : '来不及惩罚'}` : `不看画面也会在你喝药时立刻突刺（喝药 ${MOVES.heal.startup} 帧，突刺 ${THRUST.startup} 帧）`}</small></div></div>`);
  $('fair').innerHTML = `<div style="font-size:11px;color:var(--dim)">以人类反应 ${delay} 帧 ≈ ${ms}ms 为参照：前摇 ≥ 延迟 + 闪避起手 ${DODGE.startup} 帧，才算躲得合理。</div>` + rows.join('');
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

// ---------- controls ----------
function flashBtn(kind) {
  const b = $('b-' + kind); if (!b) return;
  b.animate([{ transform: 'scale(.93)', filter: 'brightness(1.6)' }, { transform: 'none', filter: 'none' }], { duration: 160 });
}
function syncUI() {
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
$('b-reset').onclick = () => { newDuel(); log.length = 0; renderLog.k = ''; };
$('delay').oninput = (e) => { $('delayout').textContent = `${e.target.value} 帧 ≈ ${Math.round(e.target.value * 1000 / FPS)} ms`; };
$('delay').onchange = (e) => setDelay(+e.target.value);
$('agg').oninput = (e) => { $('aggout').textContent = e.target.value + '%'; };
$('agg').onchange = (e) => setAggression(+e.target.value / 100);
const KEYS = { KeyJ: 'slash', KeyK: 'quick', KeyH: 'heal' };
addEventListener('keydown', (e) => {
  if (curTab !== 'preview' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = KEYS[e.code]; if (k) { e.preventDefault(); act(k); }
  else if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); setPaused(!paused); }
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
  if (!paused || force) { now += dt * speed; simT += dt; sim.seek(10 + simT * 0.2); }
  D.seek(now);
  settle(curFrame());
}
function draw() {
  const st = D.state();
  const fighters = poses(st);
  world.render(10 + simT, { cam: camSide(simT, aspectDist(), 2.0, 1.5708 + 0.25), sky: 'day', bloom: 0.6, fighters, noTrees: true });
  hud(fighters, st); chart(); fairPanel(); pressurePanel(); renderLog(); frames++;
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
window.APP = {
  world, showTab, act, setMode, setDelay, setAggression, setSpeed, setPaused, MOVES,
  get D() { return D; }, get log() { return log; }, get acts() { return acts; }, get mode() { return mode; }, get delay() { return delay; },
  get now() { return now; }, get frames() { return frames; }, get paused() { return paused; },
  state: () => D.state(),
  get pressure() { return pressureNow || pressureTick(); },
  get presses() { return presses; },
  get simT() { return simT; },
  reset() { newDuel(); log.length = 0; renderLog.k = ''; },
  step(dt) { advance(dt, true); draw(); },
};
window.READY = true;
