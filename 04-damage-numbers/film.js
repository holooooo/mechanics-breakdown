// 机制拆解 04 · 跳字老虎机 — film composer. renderFrame(t) is a pure function of t; all timings come from timeline.js.
import { makeHits, layout, LEVELS, fmt, hash } from './src/dmgtext.js';
import { hitSchedules } from './film_hits.js';
import { drawArena, drawBackdrop, drawDummy, drawNumber, drawTotal } from './src/arena.js';

const $ = id => document.getElementById(id);
const TL = window.TIMELINE;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const ramp = (t, a, d = 0.5) => ease((t - a) / d);
const win = (t, a, b, d = 0.4) => Math.min(ramp(t, a, d), 1 - ramp(t, b - d, d));
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i];
const A = (id, i) => SC[id].lines[i].start, E = (id, i) => SC[id].lines[i].end;
const S = id => SC[id].start, END = id => SC[id].end;
const script = await fetch('./script.json').then(r => r.json());
const MAN = await fetch('./footage/manifest.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
const ctx = $('gl').getContext('2d');
const W = 1920, H = 1080;

// hit schedules live in film_hits.js (shared with dev/make_cues.mjs so SFX land on the same frames)
const { hk, kill, layerHits } = hitSchedules(TL);

// ---------------------------------------------------------------- DOM helpers
const op = (el, v) => { el.style.opacity = Math.max(0, v).toFixed(3); };
const setHTML = (el, h) => { if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } };
function setImg(el, src) { if (el.dataset.src === src) return null; el.dataset.src = src; el.src = src; return el.decode().catch(() => {}); }
const sceneAt = t => { let s = TL.scenes[0]; for (const x of TL.scenes) if (t >= x.start) s = x; return s; };
const railEl = $('rail');
railEl.innerHTML = TL.scenes.map(() => '<i></i>').join('') + '<em></em>';
const railBars = [...railEl.querySelectorAll('i')], railLabel = railEl.querySelector('em');
$('ladder').innerHTML = LEVELS.map(l => `<i>L${l.id}</i>`).join('');
const ladderEls = [...$('ladder').children];
const LV = { l0: 0, l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7 };

// short code per layer (shown in #code)
const CODE = {
  l0: ['// L0 能显示', 'spawn(hit.amount, hit.pos);', 'remove after 0.8s;'],
  l1: ['// L1 动起来', 'x = ox + jx * 70;', 'y = oy - 90 * easeOut(k);', 'alpha = 1 - smooth((k - .55) / .45);'],
  l2: ['// L2 弹出来', 'scale = easeOutBack(age / 0.2);', 'slot = i % 4;   // 四个槽位错开', 'strokeText(...); fillText(...);'],
  l3: ['// L3 分等级', 'size = 40 + 26 * log10(amount);', 'if (crit) { size *= 1.75;', '  rot = ±0.12; shake(0.15s); }', 'color = ELEMENTS[hit.el];'],
  l4: ['// L4 打击感', 'if (crit) stop(75ms);  // 顿帧', 'shake = 16 * (1 - age/.32)²;', 'flash(90ms); sparks(16);', 'y = y0 + vy*a + ½g*a²;  // 被打飞'],
  l5: ['// L5 攒起来', 'if (gap < 0.36s) chain.add(hit);', 'shown = prev + (sum - prev)', '        * easeOut(since / 0.14);', 'onEnd: slam(); gold();'],
  l6: ['// L6 涨上去', 'amount *= exp(growth * t);', "fmt(123456789,'zh') // 1.23亿", "fmt(123456789,'en') // 123M"],
  l7: ['// L7 收得住', 'if (nums.length > 7)', '  keep(crits, newest);', '  others.alpha *= 0.18;'],
};
const codeHTML = lines => lines.map(l => `<span class="ln">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/(\/\/.*)$/, '<span class="cm">$1</span>').replace(/\b(\d+(\.\d+)?)\b/g, '<span class="num">$1</span>').replace(/\b(if|const|return)\b/g, '<span class="kw">$1</span>')}</span>`).join('');

// ---------------------------------------------------------------- footage
// manifest.json: { slug: { count, credit } }  (frames at footage/frames/<slug>/f0001.jpg, 30fps)
// F(slug, a, b, from, zoom:[z0, z1, originX%, originY%])
const F = (slug, a, b, from = 0, zoom = [1, 1, 50, 50], subsTop = false) => ({ slug, a, b, from, zoom, subsTop });
const FOOT = [
  F('balatro', 0, A('hook', 0) + 2.6, 7.0, [1.0, 2.3, 6, 22]),
  F('genshin', A('hook', 2) - 0.1, A('hook', 2) + 2.3, 8.6, [1.34, 1.42, 50, 42]),
  F('disgaea', A('hook', 2) + 2.3, E('hook', 2) + 0.15, 2.4, [1.0, 1.08, 30, 100], true),
  F('vampire_survivors', A('hook', 4) - 0.1, E('hook', 4) + 0.2, 4.0, [1.36, 1.5, 50, 50]),
  F('genshin', A('l3', 1) + 0.2, E('l3', 1) + 0.1, 2.2, [1.34, 1.4, 50, 42]),
  F('borderlands', A('l4', 2), E('l4', 2) + 0.1, 3.6, [1.22, 1.3, 85, 80]),
  F('balatro', A('l5', 3), E('l5', 3) + 0.1, 2.0, [1.6, 2.1, 6, 22]),
  F('disgaea', A('l6', 2) + 2.2, E('l6', 2) + 0.1, 6.0, [1.0, 1.06, 30, 100], true),
  F('wow', A('l6', 4), A('l6', 4) + 2.6, 7.5, [1.36, 1.42, 50, 0]),
  F('vampire_survivors', A('l7', 0), E('l7', 0) + 0.1, 0.5, [1.36, 1.6, 50, 50]),
  F('eldenring', A('counter', 1), E('counter', 1) + 0.1, 0.0, [1.0, 1.08, 50, 50]),
].filter(f => MAN[f.slug]);
const footAt = t => FOOT.find(f => t >= f.a && t < f.b);

// ---------------------------------------------------------------- canvas pieces
function overflowNum(t, a, b, glitchAt) {
  // number explodes 10^4 → 10^308 → naneinf
  const k = clamp((t - a) / (glitchAt - a));
  const e = 4 + 304 * Math.pow(k, 1.6);
  const cx = W / 2, cy = 470;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (t < glitchAt) {
    const m = Math.pow(10, e % 1), ex = Math.floor(e);
    const txt = ex < 9 ? Math.round(m * 10 ** ex).toLocaleString('en-US') : `${m.toFixed(2)}e${ex}`;
    const s = 150 + 60 * k + 20 * Math.sin(t * 40) * k;
    ctx.font = `${s}px Impact`; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#2a0800'; ctx.strokeText(txt, cx, cy);
    const g = ctx.createLinearGradient(0, cy - s / 2, 0, cy + s / 2); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.6, '#ffb21a'); g.addColorStop(1, '#ff3d1a');
    ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 40 + 60 * k; ctx.fillStyle = g; ctx.fillText(txt, cx, cy);
    // flames
    ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 0;
    for (let i = 0; i < 60 * k; i++) { const r = hash(i, 3), p = (t * (1.2 + r) + r) % 1; ctx.fillStyle = `rgba(255,${100 + 120 * r},30,${(1 - p) * 0.5})`; ctx.beginPath(); ctx.arc(cx + (r - 0.5) * 1300, cy + 80 - p * 260, 18 * (1 - p) + 4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    const g = t - glitchAt, j = Math.max(0, 1 - g * 1.5);
    const txt = 'naneinf';
    ctx.font = '230px Impact';
    for (const [dx, col] of [[-10, 'rgba(255,0,80,0.8)'], [10, 'rgba(0,220,255,0.8)'], [0, '#ffffff']]) {
      const jx = (hash(Math.floor(t * 30), 1) - 0.5) * 50 * j;
      ctx.fillStyle = col; ctx.fillText(txt, cx + dx * (0.4 + j) + jx, cy + (hash(Math.floor(t * 30), 2) - 0.5) * 20 * j);
    }
    for (let i = 0; i < 9; i++) { const y = cy - 120 + hash(i + Math.floor(t * 20) * 9, 4) * 240; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - 520, y, 1040, 6 + 10 * hash(i, 8) * j); }
  }
  ctx.restore();
}

function brainPanel(x, y, w, h, kind, k, title, sub, t) {
  // stylised dopamine-neuron raster + histogram (redrawn schematic, not data)
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,26,0.82)'; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '800 28px PingFang SC'; ctx.fillText(title, x + 28, y + 44);
  ctx.fillStyle = '#b9c5cd'; ctx.font = '500 20px PingFang SC'; ctx.fillText(sub, x + 28 + ctx.measureText(title).width * 1.4 + 20, y + 44);
  const gx = x + 40, gw = w - 80, base = y + h - 46, gh = h - 120;
  const cueX = gx + gw * 0.3, rewX = gx + gw * 0.62;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(gx, base); ctx.lineTo(gx + gw, base); ctx.stroke();
  const tag = (xx, label, c) => { ctx.strokeStyle = c; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(xx, base); ctx.lineTo(xx, base - gh); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c; ctx.font = '700 20px PingFang SC'; ctx.fillText(label, xx + 8, base + 30); };
  if (kind !== 'reward') tag(cueX, '信号', '#7ab8ff');
  tag(rewX, '奖励', '#ffc35a');
  const N = 80, bw = gw / N;
  for (let i = 0; i < N; i++) {
    const xx = gx + i * bw, pos = i / N;
    if (pos > k) break;
    let v = 0.14 + 0.1 * hash(i, kind.length);
    const near = c => Math.exp(-Math.pow((xx - c) / (gw * 0.022), 2));
    if (kind === 'reward') v += 0.85 * near(rewX);
    if (kind === 'cue') v += 0.85 * near(cueX);
    if (kind === 'flat') v += 0.06 * near(rewX);
    ctx.fillStyle = v > 0.5 ? '#ffb84a' : 'rgba(150,200,255,0.55)';
    ctx.fillRect(xx + 1, base - v * gh, bw - 2, v * gh);
  }
  ctx.restore();
}

function hpBar(x, y, w, hp) {
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 4, y - 4, w + 8, 30);
  ctx.fillStyle = hp > 0 ? '#e0332a' : '#555'; ctx.fillRect(x, y, w * hp, 22);
  ctx.fillStyle = '#fff'; ctx.font = '700 20px PingFang SC'; ctx.textAlign = 'center'; ctx.fillText(hp > 0 ? `HP ${Math.ceil(hp * 100)}%` : 'HP 0 · 已击败', x + w / 2, y + 18); ctx.restore();
}

// ---------------------------------------------------------------- cards (DOM)
function cardsFor(id, t) {
  const c = [];
  const at = (html, x, y, o = 1, extra = '') => o > 0.01 && c.push(`<div class="card" style="left:${x}px;top:${y}px;opacity:${o.toFixed(3)};${extra}">${html}</div>`);
  const raw = (html, o = 1) => o > 0.01 && c.push(`<div style="position:absolute;inset:0;opacity:${o.toFixed(3)}">${html}</div>`);
  if (id === 'hook') {
    const o = win(t, A('hook', 5) - 0.3, E('hook', 5) + 0.25, 0.3);
    raw(`<div class="divider"></div><div class="split-tag" style="left:480px">L0 · 一行白字<small>伤害一模一样</small></div><div class="split-tag hot" style="left:1440px">L7 · 全部加满<small>伤害一模一样</small></div>`, o);
    const o2 = win(t, A('hook', 6), END('hook') + 0.2, 0.4);
    raw(`<div style="position:absolute;left:0;right:0;top:640px" class="lad8">${LEVELS.map((l, i) => `<div style="opacity:${ramp(t, A('hook', 6) + 0.4 + i * 0.32, 0.25).toFixed(2)}"><b>L${i}</b><span>${l.name}</span></div>`).join('')}</div>`, o2);
  }
  if (id === 'brain') {
    const o = win(t, A('brain', 4) - 0.1, END('brain') + 0.2, 0.4);
    raw(`<div style="position:absolute;left:0;right:0;top:600px" class="lad8">${LEVELS.map((l, i) => `<div style="opacity:${ramp(t, A('brain', 4) + 0.2 + i * 0.18, 0.2).toFixed(2)}"><b>L${i}</b><span>${l.name}</span></div>`).join('')}</div>`, o);
  }
  if (id === 'l3') {
    const hits = layerHits('l3'), past = hits.filter(h => h.t <= t).slice(-14);
    const o = win(t, A('l3', 2), E('l3', 3) + 0.2, 0.35);
    at(`<h3>每一刀 = 拉一次拉杆</h3><div class="strip">${past.map((h, i) => `<i class="${h.crit ? 'c' : ''} ${i === past.length - 1 ? 'now' : ''}">${h.crit ? '暴' : '·'}</i>`).join('')}</div><p style="margin-top:14px">暴击率 28% · 什么时候出，谁也不知道</p>`, 92, 640, o);
  }
  if (id === 'l3') {
    const o = win(t, A('l3', 4) + 0.3, END('l3') + 0.1, 0.35);
    at(`<h3>怪物猎人世界 · 数字颜色（示意）</h3><div style="display:flex;gap:36px;align-items:center;font:900 64px Impact,sans-serif"><span style="color:#fff;-webkit-text-stroke:2px #000">128</span><span style="color:#ff9a2a;-webkit-text-stroke:2px #3a1400;filter:drop-shadow(0 0 12px #ff7a1a)">241</span></div><p style="margin-top:10px">白色 = 普通部位　橙色 = 打中弱点</p>`, 92, 600, o);
  }
  if (id === 'l4') {
    const items = ['顿帧 75ms', '震屏', '闪白', '火花', '抛物线飞出'];
    const o = win(t, A('l4', 1), E('l4', 3) + 0.2, 0.35);
    at(`<h3>叠加清单</h3><div class="check">${items.map((s, i) => `<div class="${t > A('l4', 1) + 0.9 * i + (i === 4 ? 2.5 : 0) ? 'on' : 'off'}"><i>✓</i>${s}</div>`).join('')}</div>`, 92, 560, o);
  }
  if (id === 'l6') {
    const o1 = win(t, A('l6', 0), E('l6', 1) + 0.2, 0.4);
    const k1 = ramp(t, A('l6', 0) + 1.0, 0.8), k2 = ramp(t, A('l6', 0) + 3.6, 0.8);
    at(`<h3>同样多加一点，感觉差多少？</h3><div class="cmp">
      <span>100 → 200</span><div class="bar"><i style="width:${(100 * k1).toFixed(1)}%"></i></div><span class="pct">+100%</span>
      <span>1亿 → 1亿零100</span><div class="bar"><i style="width:${(0.4 * k2).toFixed(2)}%"></i></div><span class="pct dead">+0.0001%</span>
    </div><p style="margin-top:26px;font-size:26px">${t > A('l6', 1) ? '感受 ∝ log(数量)  —— 韦伯-费希纳定律' : '&nbsp;'}</p>`, 300, 300, o1, 'width:1320px');
    const o2 = win(t, A('l6', 4) + 2.6, E('l6', 5) + 0.2, 0.35);
    const sq = ramp(t, A('l6', 4) + 3.4, 1.2);
    const v = Math.round(lerp(46928, 2209, easeOut(sq)));
    const ib = clamp((t - A('l6', 5)) / 2.2);
    raw(`<div class="squish" style="position:absolute;left:0;right:0;top:${t < A('l6', 5) ? 260 : 170}px">
      <div class="lab">魔兽世界 · 火球术伤害（6.0 数值压缩，BlizzCon 2013 公布）</div>
      <div class="num">${v.toLocaleString('en-US')}</div>
      <div class="sub">${sq > 0.99 ? '46,928 → 2,209 · 怪物相对难度不变' : '压缩前'}</div>
      ${t >= A('l6', 5) ? `<div class="int32"><div class="bar"><i style="width:${(70 * easeOut(ib)).toFixed(1)}%"></i></div>
        <div class="row"><span>Boss 血量 ≈ <b>15 亿</b>（莱登）</span><span>32 位整数上限 <b>2,147,483,647</b></span></div></div>` : ''}
    </div>`, o2);
  }
  if (id === 'l7') {
    const o = win(t, A('l7', 1) - 0.1, E('l7', 1) + 0.2, 0.3);
    raw(`<div class="divider"></div><div class="split-tag" style="left:480px">L6 · 不设上限<small>同一串命中</small></div><div class="split-tag hot" style="left:1440px">L7 · 同屏 ≤ 7<small>暴击优先 · 小数字淡出</small></div>`, o);
    const o2 = win(t, A('l7', 2), END('l7') + 0.1, 0.3) * (MAN.diablo4 ? 0 : 1);
    at(`<h3>设置 · 战斗文字（示意）</h3><div class="settings">${[['显示伤害数字', 1], ['暴击数字', 1], ['持续伤害数字', 0], ['易伤 / 压制伤害', 0], ['治疗数字', 1]].map(([n, on]) => `<div class="opt">${n}<div class="tog ${on ? 'on' : ''}"></div></div>`).join('')}</div>`, 640, 250, o2);
  }
  if (id === 'counter') {
    const o = win(t, A('counter', 2), E('counter', 2) + 0.2, 0.35);
    raw(`<div class="split-tag hot" style="left:1300px;top:140px">L4 打击感 · 数字全部关掉<small>只剩顿帧 · 震屏 · 火花</small></div>`, o);
    const o2 = win(t, A('counter', 3), E('counter', 3) + 0.2, 0.35);
    const pv = Math.round(lerp(1284000, 3960000, easeOut((t - A('counter', 3) - 0.8) / 3.5)));
    at(`<div class="power"><div class="pl">战 力</div><div class="pv">${pv.toLocaleString('en-US')}</div><div class="up">▲ +${(pv - 1284000).toLocaleString('en-US')}</div><div class="pay">再充 6 元 · 战力翻倍</div><p style="margin-top:18px">示意界面，非任何具体游戏</p></div>`, 650, 230, o2);
  }
  if (id === 'outro') {
    const o = win(t, A('outro', 0), E('outro', 0) + 0.25, 0.4);
    if (MAN.__site) raw(`<div style="position:absolute;left:370px;top:150px" class="site"><div class="bar">mechanics-breakdown.pages.dev/04-damage-numbers/</div><img src="${MAN.__site}"></div>`, o);
    const o2 = ramp(t, A('outro', 1) - 0.1, 0.5);
    raw(`<div class="endcard"><img class="av" src="brand/avatar.png"><div class="id">粑粑柑（梭哈ai版）</div><div class="sub">机制拆解 · 每期拆一个游戏机制</div>
      <div class="btns">${['点赞', '投币', '收藏'].map((s, i) => `<div class="btn ${t > A('outro', 2) + 0.4 + i * 0.35 ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="${i === 1 ? 9 : 8}"/></svg>${s}</div>`).join('')}</div>
      <div class="follow">+ 关注</div></div>`, o2);
  }
  return c.join('');
}

function bigFor(id, t) {
  const B = (l1, l2, o) => ({ html: `<div class="l1">${l1}</div>${l2 ? `<div class="l2">${l2}</div>` : ''}`, o });
  if (id === 'hook') {
    if (t >= A('hook', 4) - 0.1 && t < E('hook', 4) + 0.2) return B('那为什么你<span class="acc">停不下来</span>？', '数字对输赢没有用', win(t, A('hook', 4) - 0.1, E('hook', 4) + 0.2, 0.25));
    if (t >= A('hook', 6) && t < END('hook') + 0.2) return { ...B('一个木桩，<span class="acc">八层跳字</span>', '机制拆解 04 · 从一行白字到上瘾'), o: win(t, A('hook', 6), END('hook') + 0.2, 0.4), top: 300 };
    if (t >= A('hook', 1) && t < E('hook', 1) + 0.1) return { html: '', o: 0 };
  }
  if (id === 'brain' && t >= A('brain', 3) && t < E('brain', 3) + 0.2) return B('让每一刀，都可能<span class="acc">超出预期</span>', '跳字唯一的任务', win(t, A('brain', 3), E('brain', 3) + 0.2, 0.3));
  if (id === 'l3' && t >= A('l3', 3) && t < E('l3', 3) + 0.1) return { ...B('暴击 = <span class="acc">老虎机</span>', '可变比率强化 · 不知道什么时候来，最上头', win(t, A('l3', 3), E('l3', 3) + 0.1, 0.25)), top: 180 };
  if (id === 'l5' && t >= A('l5', 4) - 0.2 && t < A('l5', 4)) return { html: '', o: 0 };
  if (id === 'counter') {
    if (t < E('counter', 0) + 0.15) return B('数字<span class="acc">越多越好</span>？', '', win(t, A('counter', 0) - 0.2, E('counter', 0) + 0.15, 0.25));
    if (t >= A('counter', 4)) return B('上瘾的不是数字，是<span class="acc">下一刀可能更大</span>', '', win(t, A('counter', 4), END('counter') + 0.2, 0.4));
  }
  return { html: '', o: 0 };
}

// ---------------------------------------------------------------- main
window.DURATION = TL.duration;
window.renderFrame = async function (t) {
  const waits = [];
  const sc = sceneAt(t), id = sc.id, si = TL.scenes.indexOf(sc);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  let dim = 0, vig = 0, panel = 0, ladder = 0, code = 0, flash = 0;
  const full = { x: 0, y: 0, w: W, h: H };

  if (id === 'hook') {
    if (t < A('hook', 2)) { const g = A('hook', 1) + 0.5; drawBackdrop(ctx, { ...full, t, hue: 'warm' }); overflowNum(t, A('hook', 0) + 2.4, 99, g); flash = Math.max(0, 1 - Math.abs(t - g) * 8) * 0.8; }
    else if (t < A('hook', 3)) { drawBackdrop(ctx, { ...full, t }); drawArena(ctx, layout(kill(), t, 6, { ox: 960, oy: 600, px: 1.05 }), { ...full, ox: 960, oy: 600, px: 1.05, t, backdrop: false }); }
    else if (t < A('hook', 5) - 0.3) {
      const hits = kill(), lay = layout(hits, t, 6, { ox: 960, oy: 620, px: 1.05 });
      const dealt = hits.filter(h => h.t <= t).reduce((s, h) => s + h.amount, 0), hp = clamp(1 - dealt / 2.6e7);
      drawBackdrop(ctx, { ...full, t });
      const dead = hits.find((h, i) => hits.slice(0, i + 1).reduce((s, x) => s + x.amount, 0) >= 2.6e7);
      const fall = dead ? clamp((t - dead.t) / 0.5) : 0;
      ctx.save(); ctx.translate(960, 870); ctx.rotate(fall * 1.35); ctx.globalAlpha = 1 - fall * 0.35; ctx.translate(-960, -870);
      drawArena(ctx, { ...lay, nums: [], total: null }, { ...full, ox: 960, oy: 620, px: 1.05, t, backdrop: false }); ctx.restore();
      ctx.save(); ctx.translate(lay.shake[0], lay.shake[1]); [...lay.nums].sort((a, b) => a.crit - b.crit).forEach(n => drawNumber(ctx, n)); drawTotal(ctx, lay.total); ctx.restore();
      hpBar(660, 150, 600, hp);
      dim = t > A('hook', 4) - 0.2 ? 0.75 : 0;
    } else {
      const hits = hk();
      for (const [L0, x] of [[0, 0], [7, 960]]) {
        const ox = x + 480, oy = 640;
        drawArena(ctx, layout(hits, t, L0, { ox, oy, px: 0.85 }), { x, y: 0, w: 960, h: H, ox, oy, px: 0.85, t });
      }
      if (t > A('hook', 6) - 0.1) dim = 0.82 * ramp(t, A('hook', 6) - 0.1, 0.5);
    }
  } else if (id === 'brain') {
    drawBackdrop(ctx, { ...full, t });
    const o = win(t, A('brain', 0), E('brain', 2) + 0.6, 0.5);
    if (o > 0) {
      ctx.globalAlpha = o;
      brainPanel(300, 190, 1320, 330, 'flat', clamp((t - A('brain', 1)) / 2.6), '预期之中的奖励', '→ 几乎不动', t);
      if (t > A('brain', 2) - 0.2) brainPanel(300, 545, 1320, 330, 'reward', clamp((t - A('brain', 2)) / 2.2), '比预期更大的奖励', '→ 猛地放电', t);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '500 17px PingFang SC'; ctx.globalAlpha = o; ctx.fillText('示意图：据 Schultz, Dayan & Montague, Science 1997 重绘，非原始数据', 300, 905); ctx.globalAlpha = 1;
    }
    if (t >= A('brain', 3)) { drawArena(ctx, layout(layerHits('brain'), t, 7, { ox: 960, oy: 640, px: 0.9 }), { ...full, ox: 960, oy: 640, px: 0.9, t, backdrop: false }); dim = 0.6; }
  } else if (LV[id] != null) {
    const lv = LV[id], hits = layerHits(id);
    if (id === 'l7' && t >= A('l7', 1) - 0.1 && t < E('l7', 1) + 0.2) {
      for (const [L0, x] of [[6, 0], [7, 960]]) { const ox = x + 480, oy = 660; drawArena(ctx, layout(hits, t, L0, { ox, oy, px: 0.78, cap: 7, spread: 2.3 }), { x, y: 0, w: 960, h: H, ox, oy, px: 0.78, t }); }
    } else {
      const ox = 1300, oy = 660, px = 1.3;
      const bare = id === 'l6' && (t < E('l6', 1) + 0.2 || t >= A('l6', 4));
      if (bare) drawBackdrop(ctx, { ...full, t }); else drawArena(ctx, layout(hits, t, lv, { ox, oy, px }), { ...full, ox, oy, px, t });
      panel = 1; vig = 1; ladder = 1; code = 1;
      if (id === 'l3' && t >= A('l3', 2)) code = 0;
      if (id === 'l4' && t >= A('l4', 1)) code = 0;
      if (bare) { dim = 0.35; panel = 0.0; code = 0; }
      if (id === 'l5' && t >= A('l5', 4)) { dim = 0; panel = 0; code = 0; }
      if (id === 'l7' && t >= A('l7', 2)) { dim = 0.88; panel = 0; code = 0; }
      if (id === 'l3' && t >= A('l3', 3) && t < E('l3', 3)) { dim = 0.5; panel = 0; code = 0; }
      if (id === 'l6' && t >= A('l6', 6)) { dim = 0; panel = 0; ladder = 0; drawBackdrop(ctx, { ...full, t, hue: 'warm' }); overflowNum(t, A('l6', 6) - 0.2, 99, A('l6', 6) + 2.4); }
    }
  } else if (id === 'counter') {
    const hits = layerHits('counter');
    if (t < A('counter', 3)) {
      const lay = layout(hits, t, 4, { ox: 1300, oy: 640, px: 1.05 });
      drawArena(ctx, { ...lay, nums: [] }, { ...full, ox: 1300, oy: 640, px: 1.05, t });
      if (t < E('counter', 0) + 0.2) dim = 0.7;
    } else { drawBackdrop(ctx, { ...full, t, hue: 'warm' }); if (t >= A('counter', 4)) { drawArena(ctx, layout(hits, t, 7, { ox: 960, oy: 660, px: 0.9 }), { ...full, ox: 960, oy: 660, px: 0.9, t, backdrop: false }); dim = 0.7; } }
  } else {
    drawBackdrop(ctx, { ...full, t });
    if (t < A('outro', 1)) drawArena(ctx, layout(layerHits('outro'), t, 7, { ox: 960, oy: 660, px: 0.9 }), { ...full, ox: 960, oy: 660, px: 0.9, t, backdrop: false });
    dim = 0.55 + 0.3 * ramp(t, A('outro', 1) - 0.2, 0.5);
  }
  // brain panel on l5 (dopamine shifts to the cue)
  if (id === 'l5' && t >= A('l5', 4)) {
    const o = ramp(t, A('l5', 4), 0.4); ctx.globalAlpha = o; ctx.fillStyle = 'rgba(4,8,14,0.9)'; ctx.fillRect(0, 0, W, H);
    brainPanel(340, 270, 1240, 280, 'reward', 1, '刚开始：奖励来了才放电', '', t);
    brainPanel(340, 575, 1240, 280, 'cue', clamp((t - A('l5', 4) - 1.4) / 2.2), '学会以后：一看到信号就放电', '→ 等待揭晓本身变成奖励', t);
    ctx.globalAlpha = 1;
  }

  // footage overlay
  const f = footAt(t);
  if (f) {
    const m = MAN[f.slug], idx = 1 + Math.min(m.count - 1, Math.floor((t - f.a + f.from) * 30));
    waits.push(setImg($('foot'), `footage/frames/${f.slug}/f${String(idx).padStart(4, '0')}.jpg`));
    $('footlabel').textContent = m.credit;
    const [z0, z1, zx, zy] = f.zoom, zk = ease((t - f.a) / (f.b - f.a));
    $('foot').style.transformOrigin = `${zx}% ${zy}%`; $('foot').style.transform = `scale(${lerp(z0, z1, zk).toFixed(4)})`;
  }
  const fk = f ? win(t, f.a, f.b, 0.12) : 0;
  if (fk > 0) { panel *= 1 - fk; code *= 1 - fk; ladder *= 1 - fk; }
  $('subs').classList.toggle('top', !!(f && f.subsTop));
  op($('foot'), fk); op($('footlabel'), fk);

  // chrome
  railBars.forEach((b, k) => b.className = k < si ? 'done' : k === si ? 'on' : '');
  railLabel.textContent = script.scenes[si].kicker;
  op($('dim'), dim); op($('vignetteL'), vig);
  const ss = script.scenes[si];
  setHTML($('kicker'), ss.kicker); setHTML($('title'), ss.title);
  if (LV[id] != null) {
    const lv = LEVELS[LV[id]];
    setHTML($('bullets'), `<div class="bullet ok"><span class="ic">+</span><div>${lv.add}</div></div>`);
    ladderEls.forEach((e, k) => e.className = k < lv.id ? 'done' : k === lv.id ? 'on' : '');
    setHTML($('codebody'), codeHTML(CODE[id]));
  }
  const pin = ramp(t, sc.start + 0.05, 0.35);
  op($('panel'), panel * pin); op($('ladder'), ladder * pin); op($('code'), code * ramp(t, sc.start + 0.6, 0.4));
  $('panel').style.transform = `translateX(${(1 - pin) * -30}px)`;
  setHTML($('cards'), cardsFor(id, t));
  const b = bigFor(id, t);
  setHTML($('bigtext'), b.html); op($('bigtext'), b.o); $('bigtext').style.top = `${b.top ?? 380}px`;
  op($('flash'), flash);
  const sub = TL.subs.find(c => t >= c.start && t < c.end + 0.12);
  $('szh').textContent = sub?.zh || ''; $('sen').textContent = sub?.en || '';
  $('szh').style.visibility = $('sen').style.visibility = sub ? 'visible' : 'hidden';
  $('progress').firstElementChild.style.transform = `scaleX(${(t / TL.duration).toFixed(4)})`;
  await Promise.all(waits);
};
await document.fonts.ready;
window.READY = true;
