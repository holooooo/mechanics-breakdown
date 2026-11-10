// 机制拆解 03 · 读指令简史 — film composer. renderFrame(t) is a pure function of t; timings from timeline.js.
import { createWorld } from './src/world.js';
import { createSim, CELL, cellAt, cellCenter } from './src/sim.js';
import { createDuel, MOVES, DODGE, THRUST, FPS } from './src/duel.js';
import { weights as pWeights, pick as pPick } from './src/pressure.js';

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
const code = await fetch('./src/duel.js').then(r => r.text());
const pcode = await fetch('./src/pressure.js').then(r => r.text());
const FOOT_END = L('hook', 3).end + 0.3;
const world = await createWorld($('gl'), { width: 1920, height: 1080, quality: 1 });
window.WORLD = world;

// ---------- duel shots ----------
const PX = -0.95, EX = 0.95, FZ = 0.2;
const sims = new Map(), duels = new Map();
function island() { if (!sims.has('i')) { const s = createSim('meadow'); Object.assign(s, { CELL, cellAt, cellCenter }); s.schedule([{ t: 0, type: 'wind', x: 0.4, z: 0.2 }]); sims.set('i', s); } return sims.get('i'); }
function duel(key, opts, acts) {
  if (!duels.has(key)) { const d = createDuel(opts); d.schedule(acts.map(([s, kind]) => ({ frame: Math.round(s * FPS), kind }))); duels.set(key, { d, acts }); }
  return duels.get(key);
}
const MODE_LABEL = { button: '读按键', state: '读动作', perceive: '看画面', pb: '影之刃式 · 读状态' };

// pose from duel state
function poses(st, d, lt) {
  const p = st.player, e = st.enemy, f = st.frame;
  const recent = (type) => { let best = 99; for (const ev of st.events) if (ev.type === type) best = Math.min(best, f - ev.frame); return best; };
  // player
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
  // enemy
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

// ---------- shots ----------
const camSide = (lt, dist = 4.6, h = 1.5, yaw = 1.5708 + 0.25) => ({ pos: orbit(dist * 0.95, yaw + Math.sin(lt * 0.15) * 0.05, h, [0, 1.05, FZ + 0.35]), target: [0, 1.05, FZ + 0.35], fov: 36 });
const loopActs = (from, to, every, kind = 'slash', off = 0.6) => { const a = []; for (let s = from + off; s < to - 1.0; s += every) a.push([s, kind]); return a; };
const shots = {
  hook(t, lt) {
    const u = Math.max(0, lt - FOOT_END + 0.3);
    const dd = duel('hook', { mode: 'state' }, loopActs(FOOT_END, SC.hook.end - SC.hook.start + 2, 1.6));
    const cam = { pos: orbit(lerp(3.2, 6.2, easeOut(u / 4)), 1.95 - u * 0.04, lerp(1.0, 2.0, easeOut(u / 4)), [0, 1.0, FZ]), target: [0, 1.0, FZ], fov: 38 };
    return { dd, dT: lt, view: { cam, sky: { a: 'dusk', b: 'day', k: 0.25 }, bloom: 0.7 } };
  },
  levels(t, lt) {
    const modes = ['button', 'button', 'button', 'state', 'perceive', 'perceive'];
    const li = Math.max(0, SC.levels.lines.findIndex(l => t < l.end + 0.2));
    const mode = modes[li];
    const key = 'levels' + li, a0 = rel('levels', li);
    const dd = duel(key, { mode, delay: 15 }, loopActs(a0, a0 + 6, 2.2, 'slash', 0.5));
    return { dd, dT: lt, mode, view: { cam: camSide(lt, 4.9, 1.2), sky: 'day' }, chart: li >= 2 };
  },
  arcade(t, lt) {
    const dd = duel('arcade', { mode: 'button' }, loopActs(0, SC.arcade.end - SC.arcade.start, 1.9, 'quick', 0.4));
    return { dd, dT: lt, mode: 'button', view: { cam: camSide(lt, 6, 1.8, 1.5708 - 0.3), sky: { a: 'day', b: 'dusk', k: 0.4 } }, dim: 0.7 };
  },
  souls(t, lt) {
    const acts = [[rel('souls', 0, 0.5), 'heal'], [rel('souls', 3, 1.0), 'heal'], [rel('souls', 4, 0.8), 'heal']];
    const dd = duel('souls', { mode: 'state', aggression: 1 }, acts);
    return { dd, dT: lt, mode: 'state', view: { cam: camSide(lt, 4.4, 1.3, 1.5708 + 0.45), sky: { a: 'dusk', b: 'storm', k: 0.25 } }, vigL: 1 };
  },
  mantis(t, lt) {
    const dd = duel('mantis', { mode: 'button' }, []);
    return { dd, dT: lt, view: { cam: camSide(lt, 8, 2.5), sky: 'night' }, dim: 0.93 };
  },
  pb0(t, lt) {
    const dd = duel('pb0', { mode: 'perceive', delay: 30 }, loopActs(rel('pb0', 2) + 3, SC.pb0.end - SC.pb0.start, 1.9, 'slash', 0.3));
    return { dd, dT: lt, mode: 'perceive', delay: 30, view: { cam: camSide(lt, 5.2, 1.4, 1.5708 - 0.35), sky: { a: 'dusk', b: 'day', k: 0.3 } }, shachi: true };
  },
  pressure(t, lt) {
    const dd = duel('pressure', { mode: 'perceive', delay: 15 }, loopActs(rel('pressure', 5) - 0.2, SC.pressure.end - SC.pressure.start, 1.1, 'quick', 0.2));
    return { dd, dT: lt, mode: 'perceive', view: { cam: camSide(lt, 5.4, 1.3, 1.5708 - 0.5), sky: { a: 'dusk', b: 'storm', k: 0.35 } } };
  },
  impl(t, lt) {
    const acts = [[rel('impl', 1, 0.8), 'slash'], [rel('impl', 1, 3.6), 'slash']]; for (let x = rel('impl', 2, 0.2); x < SC.impl.end - SC.impl.start - 1; x += 0.55) acts.push([x, 'quick']);
    const dd = duel('impl', { mode: 'perceive', delay: 15 }, acts);
    return { dd, dT: lt, mode: 'pb', view: { cam: camSide(lt, 5.4, 1.3, 1.5708 + 0.5), sky: { a: 'day', b: 'dusk', k: 0.5 } }, chart: false, pb: true };
  },
  demo(t, lt) {
    const third = (SC.demo.end - SC.demo.start) / 3, k = Math.min(2, Math.floor(lt / third));
    const mode = ['button', 'state', 'perceive'][k];
    const dd = duel('demo' + k, { mode, delay: 15 }, [[0.5, 'quick'], [1.6, 'slash']]);
    return { dd, dT: lt - k * third, mode, view: { cam: { pos: orbit(5.6, 1.5708 + 0.9 + lt * 0.05, 1.9, [0, 1, FZ]), target: [0, 1, FZ], fov: 36 }, sky: 'day', bloom: 0.75 }, chart: false };
  },
  outro(t, lt) {
    const dd = duel('outro', { mode: 'perceive' }, []);
    return { dd, dT: lt, view: { cam: { pos: orbit(22, 1.9 + lt * 0.02, 9), target: [0, -1, 0], fov: 30 }, sky: 'dusk', fade: ramp(t, TL.duration - 1.2, 1.2) }, dim: 0.55 };
  },
};

// ---------- DOM ----------
const railEl = $('rail');
railEl.innerHTML = TL.scenes.map(() => '<i></i>').join('') + '<em></em>';
const railBars = [...railEl.querySelectorAll('i')], railLabel = railEl.querySelector('em');
const op = (el, v) => { el.style.opacity = Math.max(0, v).toFixed(3); };
const tf = (el, s) => { el.style.transform = s; };
const setHTML = (el, h) => { if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } };
function setImg(el, src) { if (el.dataset.src === src) return null; el.dataset.src = src; el.src = src; return el.decode().catch(() => {}); }
const sceneAt = t => { let s = TL.scenes[0]; for (const x of TL.scenes) if (t >= x.start) s = x; return s; };
const icons = {
  like: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 9h8M12 9v8M9 13h6"/></svg>',
  fav: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7-1.6 7z"/></svg>',
};
function codeHTML(region, src = code) {
  const m = src.indexOf('//#region ' + region); if (m < 0) return '';
  const end = src.indexOf('//#endregion', m);
  const lines = src.slice(src.indexOf('\n', m) + 1, end).replace(/\s+$/, '').split('\n').slice(0, 14);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return lines.map(ln => { let h = esc(ln); const ci = h.indexOf('//'); let c = ci >= 0 ? h.slice(0, ci) : h; const cm = ci >= 0 ? h.slice(ci) : '';
    c = c.replace(/\b(function|const|let|if|else|return|switch|case|export)\b/g, '<span class="kw">$1</span>').replace(/\b(\d+)\b/g, '<span class="num">$1</span>').replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="fn">$1</span>').replace(/('[^']*')/g, '<span class="str">$1</span>');
    return `<span class="ln">${c}${cm ? `<span class="cm">${cm}</span>` : ''} </span>`; }).join('');
}

// frame-data chart for the action nearest to now
function chart(shot, k) {
  const dd = shot.dd, d = dd.d, st = d.state(), f = st.frame;
  let idx = -1; for (let i = 0; i < dd.acts.length; i++) if (Math.round(dd.acts[i][0] * FPS) <= f + 2) idx = i;
  if (idx < 0) idx = 0;
  const tl = d.timeline(idx); if (!tl) return '';
  const f0 = tl.input - 6, f1 = (tl.activeEnd ?? tl.input + 40) + 10, W = 1180, X0 = 360, px = W / (f1 - f0);
  const X = fr => (X0 + (fr - f0) * px).toFixed(1);
  const cl = v => v == null ? v : clamp(v, f0, f1);
  const row = (y, label, a0, b0, col, txt, a = cl(a0), b = cl(b0)) => `<text x="${X0 - 16}" y="${y + 22}" text-anchor="end" fill="#cfd8de" font-size="22">${label}</text>` + (a == null ? '' : `<rect x="${X(a)}" y="${y + 4}" width="${Math.max(4, (b - a) * px).toFixed(1)}" height="26" rx="5" fill="${col}"/>${txt ? `<text x="${(+X(a) + 8).toFixed(0)}" y="${y + 24}" fill="#0b1118" font-size="18" font-weight="700">${txt}</text>` : ''}`);
  const playhead = clamp(f, f0, f1);
  const mv = MOVES[dd.acts[idx][1]];
  const res = { dodged: '躲开', hit: '命中', punished: '被惩罚', healed: '喝到了' }[tl.result] || '';
  const resCol = tl.result === 'dodged' || tl.result === 'punished' ? '#ff6b6b' : '#7ee08f';
  return `<svg width="1920" height="1080" style="position:absolute;inset:0;opacity:${k.toFixed(2)}">
    <rect x="${X0 - 200}" y="700" width="${W + 240}" height="${shot.id === 'impl' ? 210 : 210}" rx="18" fill="rgba(8,12,18,.82)" stroke="rgba(255,255,255,.15)"/>
    ${row(712, '你按下键', tl.input, tl.input + 1, '#ffcf73', '')}
    ${row(746, '动作开始', tl.actionStart, tl.activeStart, 'rgba(255,207,115,.55)', '前摇 ' + mv.startup + ' 帧')}
    ${row(780, '命中窗口', tl.activeStart, tl.activeEnd + 1, '#ff7a5a', '')}
    ${row(814, '敌人得知', tl.enemyNotice, tl.enemyDecide + 1, '#9ad1ff', tl.enemyDecide > tl.enemyNotice ? '反应 ' + (tl.enemyDecide - tl.enemyNotice) + ' 帧' : '')}
    ${row(848, '敌人无敌', tl.enemyInvuln, tl.enemyInvuln != null ? tl.enemyInvuln + DODGE.iframes : null, '#7ee08f', '')}
    <line x1="${X(playhead)}" y1="704" x2="${X(playhead)}" y2="890" stroke="#fff" stroke-width="3"/>
    <text x="${X0 + W - 10}" y="742" text-anchor="end" fill="${resCol}" font-size="30" font-weight="900" opacity="${f > tl.activeStart ? 1 : 0}">${res}</text>
    <text x="${X0 - 186}" y="890" fill="#8fa2ae" font-size="17">1 格 = 1 帧（1/60 秒）</text></svg>`;
}

// PB-style boss (film demo): pressure rises as the scripted player starts mashing; boss draws a move every 1.4 s
function pbState(t) {
  const a = L('impl', 2).start, mash = clamp((t - a) / 6);
  const hp = 1 - 0.75 * clamp((t - L('impl', 2).start) / 7);
  const pps = 1.2 + 6.8 * mash, heal = t > L('impl', 3).start + 0.8 && t < L('impl', 3).start + 2.6;
  const p = Math.min(1, 0.45 * (1 - hp) + 0.4 * Math.min(1, pps / 6) + (heal ? 0.35 : 0));
  const slot = Math.floor((t - L('impl', 1).start) / 1.4), r = ((Math.imul(slot + 7, 2654435761) >>> 0) % 1000) / 1000;
  const move = slot >= 0 ? pPick(p, r) : null, ph = ((t - L('impl', 1).start) / 1.4) % 1;
  return { p, hp, pps, heal, move, ph };
}
function cards(id, t, lt, shot) {
  const appear = (a, d = 0.45) => easeOut((t - a) / d);
  const pop = a => { const k = appear(a); return `opacity:${k.toFixed(3)};transform:translateY(${((1 - k) * 24).toFixed(1)}px)`; };
  if (id === 'levels') {
    const ls = SC.levels.lines;
    const item = (i, n, t1, t2, col) => { const on = t >= ls[i].start && t < (ls[i + 1]?.start ?? 1e9); return `<div class="rule${on ? '' : ''}" style="${pop(ls[i].start + 0.2)};${on ? `border-color:${col};box-shadow:0 0 24px ${col}55` : 'opacity:.55'}"><div class="n" style="color:${col}">${n}</div><div><div class="eq" style="font-size:30px">${t1}</div><small>${t2}</small></div></div>`; };
    const fu = win(t, ls[1].start + 0.2, ls[2].start + 0.1, 0.35);
    return `<div class="card" style="left:50%;transform:translateX(-50%);top:180px;width:980px;text-align:center;opacity:${fu.toFixed(2)}"><h3>先认识一个单位</h3><div class="big" style="font-size:54px">1 帧 = <span style="color:#ffb347">1/60 秒</span> ≈ 16.7 毫秒</div><p style="margin-top:12px;font-size:26px">人看到画面再按键 ≈ 0.25 秒 ≈ <b style="color:#7ee08f">15 帧</b></p></div><div style="position:absolute;left:80px;top:170px;width:640px;opacity:${ramp(t, ls[2].start, 0.3).toFixed(2)}">${item(2, '①', '读按键', '按下那一帧就知道 · 0 帧', '#ff6b6b')}${item(3, '②', '读动作', '动作一开始就被通知 · 约 2 帧', '#ffb347')}${item(4, '③', '看画面', '看到抬手 + 反应 0.25 秒 ≈ 15 帧', '#7ee08f')}</div>`;
  }
  if (id === 'arcade') {
    const l1 = L('arcade', 1), l2 = L('arcade', 2);
    return `<div class="card" style="left:120px;top:190px;width:780px;opacity:${(appear(l1.end + 0.1)).toFixed(2)}"><h3>街霸二 · 逆向分析（sf2platinum）</h3>
        <div class="flow"><div class="node">你搓出招式<small>招式数据写入</small></div><div class="arr">→</div><div class="node" style="border-color:#ff6b6b">电脑读到<small>第 0 帧</small></div><div class="arr">→</div><div class="node">第一帧画面<small>第 1 帧</small></div></div>
        <p style="margin-top:14px">电脑比你的画面还早一帧知道你在干嘛</p></div>
      <div class="card" style="right:120px;top:190px;width:700px;${pop(l2.start + 0.3)}"><h3>玩家俗称</h3><div class="big" style="font-size:56px;color:#ff6b6b">SNK 综合征</div><p style="margin-top:12px">你一出手，Boss 立刻反击 · 社区说法</p></div>`;
  }
  if (id === 'souls') {
    const l = SC.souls.lines;
    return `<div class="card" style="right:90px;top:170px;width:760px;${pop(l[3].start + 0.3)}"><h3>Elden Ring AI 文档（玩家整理）</h3>
        <pre style="font:22px/1.6 'SF Mono',Menlo,monospace;color:#dfe6ea;margin:0">INTERUPT_UseItem
<span style="color:#7f9aa8">-- 目标使用道具时触发</span>
<span style="color:#7f9aa8">-- 由玩家行为脚本 act(143, 1) 调用</span></pre>
        <div style="margin-top:14px;display:flex;gap:12px;align-items:center;font-size:24px"><span class="chip" style="background:#3a3f48;margin:0">按键</span><span style="color:#ff6b6b;font-weight:900">✗</span><span class="chip" style="background:#ffb347;color:#2a1600;margin:0">动作开始</span><span style="color:#7ee08f;font-weight:900">✓</span></div></div>
      <div class="card" style="right:90px;top:560px;width:760px;padding:20px 30px;${pop(l[4].start + 2.2)}"><p style="font-size:26px;color:#fff">FromSoftware 从未正式承认 · 以上为社区分析</p></div>`;
  }
  if (id === 'mantis') {
    const l = SC.mantis.lines, k1 = appear(l[1].start + 0.2) * (1 - win(t, l[2].start, l[3].start + 5.0, 0.25)), sw = ramp(t, l[3].start + 5.1, 0.6);
    const shake = t > l[1].start + 2.0 && t < l[2].start ? Math.sin(t * 70) * 6 : 0;
    const hint = win(t, l[3].start + 0.3, l[3].start + 5.0, 0.3), inv = win(t, l[2].start + 2.6, l[2].end, 0.3);
    const games = ['恶魔城 月下夜想曲', '幻想水浒传', '心跳回忆', '警察故事'];
    return `<div style="position:absolute;left:0;right:0;top:150px;text-align:center;opacity:${(appear(l[1].start - 0.1) * (1 - win(t, l[2].start, l[3].start + 5.0, 0.25))).toFixed(2)}"><div style="font:900 26px 'SF Mono',Menlo,monospace;letter-spacing:10px;color:#7ee08f">METAL GEAR SOLID · 1998</div><div style="font-size:66px;font-weight:900;margin-top:10px">心理螳螂 <span style="color:#7ee08f">PSYCHO MANTIS</span></div></div>
      <div class="card" style="left:150px;top:400px;width:640px;opacity:${k1.toFixed(2)}"><h3>MEMORY CARD · 记忆卡</h3>${games.map((g, i) => `<div style="font:600 26px 'SF Mono',Menlo,monospace;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);opacity:${appear(l[1].start + 0.6 + i * 0.35).toFixed(2)}">▸ ${g}</div>`).join('')}<p style="margin-top:10px;font-size:20px">示例：科乐美游戏存档</p></div>
      <div style="position:absolute;right:170px;top:380px;width:640px;height:420px;opacity:${k1.toFixed(2)}">
        <svg width="640" height="420" viewBox="0 0 640 420"><g transform="translate(${(120 + shake).toFixed(1)},40)">
          <path d="M60 60 Q20 60 10 140 Q0 240 50 260 Q90 270 120 200 L280 200 Q310 270 350 260 Q400 240 390 140 Q380 60 340 60 Z" fill="#c9c9cf" stroke="#5a5a62" stroke-width="5"/>
          <circle cx="320" cy="110" r="14" fill="#5ad19a"/><circle cx="350" cy="140" r="14" fill="#ff6b6b"/><circle cx="290" cy="140" r="14" fill="#c08bff"/><circle cx="320" cy="170" r="14" fill="#5aa8ff"/>
          <rect x="70" y="120" width="60" height="20" rx="4" fill="#555"/><rect x="90" y="100" width="20" height="60" rx="4" fill="#555"/>
          <path d="M200 60 Q200 0 ${lerp(150, 330, sw).toFixed(0)} -20" stroke="#333" stroke-width="7" fill="none"/></g>
          <g transform="translate(140,330)"><rect width="150" height="60" rx="10" fill="${sw < 0.5 ? '#ffcf73' : '#333'}"/><text x="75" y="40" text-anchor="middle" font-size="26" font-weight="900" fill="#111">PORT 1</text></g>
          <g transform="translate(330,330)"><rect width="150" height="60" rx="10" fill="${sw >= 0.5 ? '#7ee08f' : '#333'}"/><text x="75" y="40" text-anchor="middle" font-size="26" font-weight="900" fill="#111">PORT 2</text></g></svg>
        <div style="text-align:center;font-size:28px;font-weight:800;opacity:${appear(l[3].start + 5.2).toFixed(2)};color:#7ee08f">换到 2 号口 → 他「读」不到你了</div></div>
      <div class="card" style="left:50%;transform:translateX(-50%);top:150px;width:1000px;text-align:center;opacity:${inv.toFixed(2)}"><div style="font-size:40px;font-weight:900">你怎么打，他都<span style="color:#ff6b6b">提前躲开</span></div><p style="margin-top:8px;font-size:22px">他读的是 1 号口手柄的输入</p></div>
      <div class="card" style="left:50%;transform:translateX(-50%);top:150px;width:1000px;text-align:center;opacity:${hint.toFixed(2)}"><p style="font-size:22px">无线电提示</p><div style="font-size:40px;font-weight:900">「用<span style="color:#7ee08f">控制器端口</span>！」→ 把手柄插到 2 号口</div></div>`;
  }
  if (id === 'pb0') {
    const l = SC.pb0.lines;
    const qk = win(t, l[1].start + 0.2, l[2].start + 0.3), ak = win(t, l[2].start + 0.2, SC.pb0.end - 0.2, 0.3);
    return `<div class="card" style="left:50%;transform:translateX(-50%);top:640px;width:1180px;text-align:center;opacity:${qk.toFixed(2)}"><div style="font-size:44px;font-weight:900">「制作中完全没有使用 <span style="color:#ffb347">读指令</span>」</div><p style="margin-top:10px;font-size:22px">影之刃零制作人 梁其伟 · Automaton 采访（2026-10）</p></div>
      <div class="card" style="left:50%;transform:translateX(-50%);top:640px;width:1180px;text-align:center;opacity:${ak.toFixed(2)}"><div style="font-size:40px;font-weight:900">最高难度 <span style="color:#ff6b6b">逆天者</span>：Boss 随机应变 · 入门难度：反应变慢</div><p style="margin-top:10px;font-size:22px">开发者采访内容概述（Automaton）</p></div>
      <div class="card" style="left:90px;top:180px;width:620px;display:none"><h3>入门难度 · 不削血量</h3>
        <div style="font-size:26px;margin:6px 0">敌人反应速度 <b style="color:#7ee08f">↓</b></div><div style="font-size:26px;margin:6px 0">进攻欲望 <b style="color:#7ee08f">↓</b></div>
        <div style="margin-top:10px;font:600 22px 'SF Mono',Menlo,monospace;color:#cfd8de">perceive delay = ${shot.delay} 帧</div></div>`;
  }
  if (id === 'pressure') {
    const l = SC.pressure.lines;
    const c1 = win(t, l[1].start + 0.3, l[2].start + 0.1, 0.35), c2 = win(t, l[2].start + 0.2, l[3].start + 0.1, 0.35), c3 = win(t, l[3].start + 0.2, l[4].start + 0.1, 0.35), c4 = win(t, l[4].start + 0.2, l[5].start + 0.1, 0.35);
    const pv = clamp((t - l[5].start) / 3.5) ;
    const ws = pWeights(0.15 + 0.8 * pv), wt = ws.reduce((a, b) => a + b.w, 0);
    const chartK = ramp(t, l[5].start + 0.2, 0.4);
    return `<div class="card" style="left:70px;top:150px;width:640px;opacity:${c1.toFixed(2)}"><h3>压力系统（UP 主命名 · 实测推测）</h3>${['血量', '按键频率', '喝药', '反应速度'].map((x, i) => `<div style="font-size:30px;font-weight:800;padding:6px 0;opacity:${ramp(t, l[1].start + 1.2 + i * 0.7, 0.3).toFixed(2)}">▸ ${x}</div>`).join('')}</div>
      <div class="card" style="left:70px;top:150px;width:640px;opacity:${c2.toFixed(2)}"><h3>压力 → 招式</h3><div class="flow" style="flex-wrap:wrap"><div class="node">越慌<small>压力分 ↑</small></div><div class="arr">→</div><div class="node" style="border-color:#ff6b6b">狠招<small>红光 / 剑气</small></div></div></div>
      <div class="card" style="left:70px;top:150px;width:640px;opacity:${c3.toFixed(2)}"><h3>UP 主的测试</h3><div style="font-size:30px;font-weight:800">狂按闪避 → <span style="color:#ff6b6b">剑气</span></div><div style="font-size:30px;font-weight:800;margin-top:8px">喝药 → <span style="color:#ff6b6b">剑气</span></div></div>
      <div class="card" style="left:70px;top:150px;width:700px;opacity:${c4.toFixed(2)}"><h3>B 站评论区 · 玩家感受</h3><div style="font-size:30px;font-weight:800">「你越不会躲的招，它就越频繁出」</div><p style="margin-top:8px;font-size:20px">@Oceeart 视频下的玩家评论</p></div>
      <div class="card" style="left:90px;top:170px;width:660px;opacity:${chartK.toFixed(2)}"><h3>压力 ${(0.15 + 0.8 * pv).toFixed(2)} · 招式权重（教学示意）</h3>${ws.map(m => `<div style="display:flex;align-items:center;gap:14px;margin:10px 0"><div style="width:150px;font-size:24px;font-weight:700">${m.name}</div><div style="flex:1;height:24px;border-radius:12px;background:rgba(255,255,255,.08);overflow:hidden"><i style="display:block;height:100%;width:${(m.w / wt * 100).toFixed(1)}%;background:${m.name.includes('红光') || m.name.includes('剑气') ? 'linear-gradient(90deg,#ff5a3a,#ff9a6a)' : '#7aa2c8'}"></i></div><div style="width:64px;text-align:right;font:600 20px 'SF Mono',Menlo,monospace">${(m.w / wt * 100).toFixed(0)}%</div></div>`).join('')}</div>`;
  }
  if (id === 'impl') {
    const l = SC.impl.lines;
    const pb = pbState(t);
    const ws = pWeights(pb.p), wt = ws.reduce((a, b) => a + b.w, 0);
    const k1 = appear(l[1].start + 0.2), k2 = appear(l[2].start + 0.2), k3 = appear(l[3].start + 0.2);
    return `<div class="card" style="left:70px;top:150px;width:600px;opacity:${k1.toFixed(2)}"><h3>它只读你的状态</h3>
        <div style="display:flex;gap:18px;font-size:22px">${[['血量', (pb.hp * 100).toFixed(0) + '%'], ['按键/秒', pb.pps.toFixed(1)], ['喝药', pb.heal ? '是' : '否']].map(([a, b]) => `<div><small style="color:#9fb0bd">${a}</small><div style="font:800 30px 'SF Mono',Menlo,monospace">${b}</div></div>`).join('')}</div>
        <div style="margin-top:14px;font-size:20px;color:#ffcf73">压力分 ${pb.p.toFixed(2)}</div><div style="height:16px;border-radius:8px;background:rgba(255,255,255,.1);overflow:hidden"><i style="display:block;height:100%;width:${(pb.p * 100).toFixed(0)}%;background:linear-gradient(90deg,#ffcf73,#ff4a2a)"></i></div></div>
      <div class="card" style="left:70px;top:500px;width:600px;opacity:${k2.toFixed(2)}"><h3>招式权重</h3>${ws.map(m => `<div style="display:flex;align-items:center;gap:12px;margin:8px 0"><div style="width:130px;font-size:22px;font-weight:700">${m.name}</div><div style="flex:1;height:20px;border-radius:10px;background:rgba(255,255,255,.08);overflow:hidden"><i style="display:block;height:100%;width:${(m.w / wt * 100).toFixed(1)}%;background:${m.name.includes('红光') || m.name.includes('剑气') ? 'linear-gradient(90deg,#ff5a3a,#ff9a6a)' : '#7aa2c8'}"></i></div><div style="width:56px;text-align:right;font:600 18px 'SF Mono',Menlo,monospace">${(m.w / wt * 100).toFixed(0)}%</div></div>`).join('')}</div>
      <div class="card" style="right:70px;top:640px;width:560px;opacity:${k3.toFixed(2)}"><div style="font-size:26px;font-weight:800"><span style="color:#ff5a3a">● 红光</span>：不能格挡，只能闪</div><div style="font-size:26px;font-weight:800;margin-top:8px"><span style="color:#5aa8ff">● 蓝光</span>：可以弹反</div></div>`;
  }
  if (id === 'demo') {
    return `<div class="card" style="left:90px;top:170px;width:600px;${pop(SC.demo.start + 0.3)}"><h3>效果预览 · 网页可玩</h3><p style="font-size:24px;color:#fff">影之刃式 Boss + 读按键 / 读动作 / 看画面</p><p style="font-size:20px">源码：src/duel.js</p></div>
      <div style="position:absolute;left:0;right:0;top:120px;text-align:center"><span class="chip" style="font-size:40px;padding:14px 40px;background:${{ button: '#ff6b6b', state: '#ffb347', perceive: '#5fd3a0' }[shot.mode]};color:#111">${MODE_LABEL[shot.mode]}</span></div>`;
  }
  if (id === 'outro') {
    const l0 = L(id, 1), l1 = L(id, 2); const cr = win(t, SC.outro.start + 0.1, l0.start + 0.1, 0.4); const k = appear(l0.start - 0.2, 0.7);
    const on = n => t > l0.start + 1.6 + n * 0.45; const follow = appear(l0.start + 3.0);
    return `<div class="card" style="left:50%;transform:translateX(-50%);top:150px;width:1200px;opacity:${cr.toFixed(2)}"><h3>感谢以下作者的实测与素材</h3>${[['尾巴尾巴啊', '《为了打赢魂大人 读指令已经是最基础的武功了》'], ['Oceeart', '《新娘阿花五连投技，拼尽全力无法战胜》'], ['市井小羿', '《详解巴流弦一郎的喝葫芦读指令机制》'], ['还会再会吗m', '《女武神：这货怎么读指令？》'], ['努力做一个Dancer', '《合金装备1经典boss战》'], ['一般通过の溜胸', '《《合金装备1》尝试硬抗读心打螳螂》'], ['游研更新姬', '街霸2 CPU 作弊（搬运 Desk 原作）']].map(([a, b]) => `<div style="font-size:26px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1)"><b style="color:#ffcf73">@${a}</b>　${b}</div>`).join('')}<p style="margin-top:12px;font-size:20px">均来自 B 站，链接见简介</p></div><div class="endcard" style="opacity:${k.toFixed(3)}"><img class="av" src="brand/avatar.png" style="transform:scale(${(0.8 + 0.2 * k).toFixed(3)})"><div class="id">粑粑柑（梭哈ai版）</div><div class="sub">机制拆解 · 用代码拆游戏</div>
      <div class="btns">${[['like', '点赞'], ['coin', '投币'], ['fav', '收藏']].map(([ic, lb], n) => `<div class="btn${on(n) ? ' on' : ''}">${icons[ic]}${lb}</div>`).join('')}</div>
      <div class="follow" style="opacity:${follow.toFixed(3)};transform:scale(${(0.9 + 0.1 * follow).toFixed(3)})">+ 关注</div>
      <div style="margin-top:26px;font-size:24px;color:#ffe0a0;opacity:${appear(l1.start + 0.3).toFixed(3)}">你被哪个 Boss 读得最狠？评论区见</div></div>`;
  }
  return '';
}
function big(id, t) {
  let k = 0, html = '';
  if (id === 'hook') {
    const q = win(t, L('hook', 3).start + 0.05, FOOT_END, 0.3), b = win(t, L('hook', 4).start + 0.3, SC.hook.end, 0.4);
    if (q > 0) { k = q; html = '<div class="l1">它是不是在<span class="acc">偷看你的手柄</span>？</div><div class="l2">IS IT READING YOUR INPUTS?</div>'; }
    if (b > 0) { k = b; html = '<div class="l1"><span class="acc">读指令</span>简史</div><div class="l2">机制拆解 03</div>'; }
  } else if (id === 'levels') {
    const a = win(t, L('levels', 5).start + 0.2, SC.levels.end, 0.35);
    if (a > 0) { k = a; html = '<div class="l1">快了 <span class="acc">十几帧</span> = 被读了</div>'; }
  } else if (id === 'souls') {
    const a = win(t, L('souls', 0).start + 0.2, L('souls', 0).end + 0.3, 0.3);
    if (a > 0) { k = a; html = '<div class="l1">喝药，<span class="acc">就会被捅</span></div>'; }
  } else if (id === 'pb0') {
    const a = win(t, L('pb0', 0).start + 0.05, L('pb0', 0).end + 0.2, 0.25);
    if (a > 0) { k = a; html = '<div class="l1">那 <span class="acc">影之刃零</span> 呢？</div>'; }
  } else if (id === 'pressure') {
    const a = win(t, L('pressure', 5).start + 3.4, SC.pressure.end, 0.35);
    if (a > 0) { k = a; html = '<div class="l1">读的不是按键，是<span class="acc">你的状态</span></div>'; }
  } else if (id === 'impl') {
    const a = win(t, L('impl', 0).start + 0.1, L('impl', 0).end + 0.2, 0.3);
    if (a > 0) { k = a; html = '<div class="l1">写一个<span class="acc">影之刃式 Boss</span></div>'; }
  }
  setHTML($('bigtext'), html); op($('bigtext'), k); tf($('bigtext'), `scale(${(0.94 + 0.06 * easeOut(k)).toFixed(3)})`);
}

// footage windows: [scene, from(abs), to(abs), dir, count, label]
const CR_BRIDE = '实机画面 · 影之刃零 · 来自 B站 @Oceeart《新娘阿花五连投技，拼尽全力无法战胜》';
const CR_WEIBA = '实机画面与测试 · 来自 B站 @尾巴尾巴啊《为了打赢魂大人 读指令已经是最基础的武功了》';
const FOOT = [
  ['hook', 0, FOOT_END, 'footage/hook2', 561, t => t < 11.4 ? CR_BRIDE : t < 15.4 ? '实机画面 · 只狼 · 来自 B站 @市井小羿《详解巴流弦一郎的喝葫芦读指令机制》' : '实机画面 · 影之刃零官方预告（© S-GAME）'],
  ['souls', L('souls', 1).start, L('souls', 2).end + 0.2, 'footage/souls2', 264, t => t < 5.2 ? '实机画面 · 只狼 · 来自 B站 @市井小羿《详解巴流弦一郎的喝葫芦读指令机制》' : '实机画面 · 艾尔登法环 · 来自 B站 @还会再会吗m《女武神：这货怎么读指令？》'],
  ['arcade', L('arcade', 1).start, L('arcade', 1).end + 0.1, 'footage/arcade', 192, () => '画面来自 B站 @游研更新姬（中文字幕搬运）· 原作 Desk《How the CPU cheated you in Street Fighter 2》'],
  ['mantis', SC.mantis.start, L('mantis', 0).end + 0.2, 'footage/mantis2', 99, () => '实机画面 · 合金装备 · 来自 B站 @努力做一个Dancer《合金装备1经典boss战，如何不换手柄打败螳螂》'],
  ['mantis', L('mantis', 2).start, L('mantis', 2).end, 'footage/mantis3', 192, () => '实机画面 · 合金装备 · 来自 B站 @一般通过の溜胸《《合金装备1》尝试硬抗读心打螳螂》'],
  ['mantis', L('mantis', 3).start, L('mantis', 3).start + 5.0, 'footage/mantis4', 150, () => '实机画面 · 合金装备 · 来自 B站 @一般通过の溜胸《《合金装备1》尝试硬抗读心打螳螂》'],
  ['pb0', SC.pb0.start, SC.pb0.start + 10.2, 'footage/pb0', 306, () => '实机画面 · 影之刃零官方实机演示（© S-GAME）'],
  ['pressure', SC.pressure.start, L('pressure', 4).end + 0.1, 'footage/pressure', 780, t => t < 20.8 ? CR_WEIBA : CR_BRIDE],
];

window.renderFrame = async function (t) {
  t = clamp(t, 0, TL.duration - 1e-3);
  const S = sceneAt(t), id = S.id, lt = t - S.start, si = TL.scenes.indexOf(S);
  const shot = shots[id](t, lt); shot.id = id;
  const sim = island(); sim.seek(10 + t * 0.2); world.setSim(sim);
  shot.dd.d.seek(Math.max(0, shot.dT));
  const st = shot.dd.d.state();
  const fighters = poses(st, shot.dd.d, lt);
  const toNext = (TL.scenes[si + 1]?.start ?? 1e9) - t;
  const dip = Math.max(clamp(1 - lt / 0.35) * (si > 0 ? 1 : 0), clamp(1 - toNext / 0.25)) * 0.85;
  world.render(10 + t, { ...shot.view, fade: Math.max(shot.view.fade || 0, dip), fighters, noTrees: true });

  op($('dim'), shot.dim ?? 0); op($('vignetteL'), (shot.vigL ?? 0) * ease(lt / 0.6));
  railBars.forEach((b, k) => b.className = k < si ? 'done' : k === si ? 'on' : '');
  railLabel.textContent = script.scenes[si].kicker;
  const showPanel = ['arcade', 'souls', 'impl'].includes(id) && !(id === 'souls' && lt < 5.2);
  const pk = showPanel ? easeOut((lt - (id === 'souls' ? 5.2 : 0)) / 0.7) * clamp(toNext / 0.4) : 0;
  op($('panel'), id === 'impl' || id === 'arcade' ? 0 : pk);
  if (showPanel) { $('kicker').textContent = script.scenes[si].kicker; $('title').textContent = script.scenes[si].title.replace('，', '，\n'); $('bullets').innerHTML = ''; }
  let html = cards(id, t, lt, shot);
  if (shot.chart) html += chart(shot, easeOut(lt / 0.6) * clamp(toNext / 0.4) * (id === 'levels' ? ramp(t, L('levels', 2).start, 0.5) : 1));
  // fighter tags
  const inFoot = FOOT.some(([sid, a, b]) => sid === id && t >= a && t < b);
  if (id !== 'mantis' && id !== 'outro' && !inFoot) {
    const e = fighters[1], p0 = world.project(e.x, 1.95, e.z), p = { x: clamp(p0.x, 200, 1720), y: clamp(p0.y, 190, 900) };
    const modeTag = shot.mode ? `<div style="position:absolute;left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px;transform:translate(-50%,-100%);font-size:22px;font-weight:800;padding:6px 14px;border-radius:10px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25)">敌人 · ${MODE_LABEL[shot.mode]}${st.enemy.state === 'waiting' ? ' <span style="color:#ffcf73">反应中…</span>' : st.enemy.state === 'noticed' ? ' <span style="color:#ff6b6b">!</span>' : ''}</div>` : '';
    let bars = '';
    if (shot.shachi) for (const [fi, who] of [[0, '你'], [1, '敌']]) {
      const f = fighters[fi], q0 = world.project(f.x, 2.0, f.z), q = { x: clamp(q0.x, 200, 1720), y: clamp(q0.y + (fi ? 0 : 60), 260, 900) }, hp = fi ? st.enemy.hp : st.player.hp;
      const sha = clamp((fi ? 1 - st.events.filter(ev => ev.type === 'dodge').length * 0.18 : 1 - st.events.filter(ev => ev.type === 'hit_enemy' || ev.type === 'dodge').length * 0.08), 0.1, 1);
      bars += `<div style="position:absolute;left:${q.x.toFixed(0)}px;top:${(q.y - 40).toFixed(0)}px;transform:translate(-50%,-100%);width:170px"><div style="font-size:16px;color:#ffcf73;font-weight:800">${who} · 杀气</div><div class="bar" style="width:170px;height:12px;border-radius:6px;background:rgba(0,0,0,.6);overflow:hidden;border:1px solid rgba(255,255,255,.3)"><i style="display:block;height:100%;width:${(sha * 100).toFixed(0)}%;background:linear-gradient(90deg,#ff7a2a,#ffd27a)"></i></div></div>`;
    }
    if (shot.pb && t > L('impl', 1).start) {
      const pb = pbState(t), fierce = pb.move === '红光投技' || pb.move === '剑气', blue = pb.move === '普通连斩';
      if ((fierce || blue) && pb.ph < 0.55) {
        const q0 = world.project(e.x, 1.2, e.z), q = { x: clamp(q0.x, 260, 1660), y: clamp(q0.y, 280, 820) }, col = fierce ? '#ff4a2a' : '#4aa0ff';
        html += `<div style="position:absolute;left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;width:260px;height:260px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle, ${col}88, ${col}00 70%);opacity:${(1 - pb.ph / 0.55).toFixed(2)}"></div><div style="position:absolute;left:${q.x.toFixed(0)}px;top:${(q.y - 170).toFixed(0)}px;transform:translateX(-50%);font-size:60px;font-weight:900;color:${col};-webkit-text-stroke:2px rgba(0,0,0,.5);text-shadow:0 4px 16px #000">${pb.move === '红光投技' ? '红光！闪避' : pb.move === '剑气' ? '剑气' : '蓝光 · 可弹反'}</div>`;
      }
    }
    html += modeTag + bars;
  }
  setHTML($('cards'), html);
  // code panel
  let codeK = 0, reg = null;
  if (id === 'levels') { codeK = win(t, L('levels', 2).start + 0.5, L('levels', 5).start, 0.4); reg = 'modes'; }
  if (id === 'impl') { codeK = win(t, L('impl', 1).start + 0.2, L('impl', 2).start + 2.0, 0.5); reg = t < L('impl', 2).start ? 'p:pressure' : 'p:weights'; }
  if (reg && $('coderegion').dataset.r !== reg) { $('coderegion').dataset.r = reg; const pr = reg.startsWith('p:'); const rg = pr ? reg.slice(2) : reg; $('codebody').innerHTML = codeHTML(rg, pr ? pcode : code); $('coderegion').textContent = '//#region ' + rg; $('codefile').textContent = pr ? 'src/pressure.js' : 'src/duel.js'; }
  op($('code'), codeK); tf($('code'), `translateY(${((1 - codeK) * 24).toFixed(1)}px)`);
  setHTML($('hud'), ''); op($('inspector'), 0); op($('legend'), 0); setHTML($('anno'), '');
  // footage
  const waits = []; let fk = 0;
  for (const [sid, a, b, dir, n, lab] of FOOT) {
    if (sid !== id || t < a || t >= b) continue;
    fk = Math.min(ramp(t, a, a === 0 ? 0.01 : 0.3), 1 - ramp(t, b - 0.35, 0.35));
    const idx = clamp(Math.floor((t - a) * 30) + 1, 1, n);
    waits.push(setImg($('foot'), `${dir}/f${String(idx).padStart(4, '0')}.jpg`)); $('footlabel').textContent = lab(t - a);
  }
  op($('foot'), fk); op($('footlabel'), fk);
  if (fk > 0.5) { op($('panel'), 0); }
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
