// 机制拆解 04 · 跳字 —— 交互页。分层系统在 src/dmgtext.js，渲染在 src/arena.js，这里只做驱动与 UI。
import { LEVELS, makeHit, chainHits, layout, fmt } from './src/dmgtext.js';
import { drawArena } from './src/arena.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- tabs ----------
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + name));
  if (name === 'method') loadSource();
  history.replaceState(null, '', name === 'preview' ? location.pathname : '#' + name);
}
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

// ---------- state ----------
const BASE = 120, SEED = 1, BURST_N = 8, BURST_GAP = 0.12, AUTO_EVERY = 0.45;
const S = {
  level: 5, compare: false, auto: false, critRate: 0.25, format: 'auto',
  inflate: false, rate: 0.25, speed: 1, paused: false,
};
let simT = 0, serial = 0, infLog = 0, autoAt = 0, lastAmount = null;
let hits = [];
let pending = [];            // 连击里还没到点的命中（模拟时间）
let lastLay = null;

// ---------- hits ----------
function pushHit(t, o = {}) {
  const h = makeHit(serial++, t, { seed: SEED, base: BASE * Math.exp(infLog), critRate: S.critRate, mul: o.mul ?? 1, kind: o.kind ?? 'hit', crit: o.crit });
  hits.push(h);
  chainHits(hits);
  lastAmount = h.amount;
  return h;
}
function hit(o = {}) { return pushHit(simT, o); }
function burst(n = BURST_N) {
  for (let k = 0; k < n; k++) pending.push({ at: simT + k * BURST_GAP, mul: 0.35 * (1 + k * 0.08) });
  processPending();
}
function processPending() {
  while (pending.length && pending[0].at <= simT + 1e-9) {
    const p = pending.shift();
    pushHit(p.at, { mul: p.mul, kind: 'tick' });
  }
}
function prune() {
  // 只成块地删（4 的倍数）：保持 i%2 / slot 不变，避免挥砍方向和落点跳变
  let old = 0;
  while (old < hits.length && hits[old].t < simT - 3) old++;
  const k = Math.floor(old / 4) * 4;
  if (k >= 4 && (old >= 8 || hits.length - old === 0)) { hits.splice(0, k); chainHits(hits); }
}
function step(dt) {
  simT += dt;
  if (S.inflate) infLog += S.rate * dt;
  processPending();
  if (S.auto) while (autoAt <= simT) { if (autoAt >= simT - 0.5) pushHit(autoAt); autoAt += AUTO_EVERY; }
  prune();
}
function clear() { hits = []; pending = []; lastAmount = null; infLog = 0; autoAt = simT; }

// ---------- canvas ----------
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
new ResizeObserver(resize).observe(cv);
const styleFor = (L) => (S.format === 'auto' ? (L >= 6 ? 'zh' : 'raw') : S.format);

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  $('stage').classList.toggle('cmp', S.compare);
  const panes = S.compare ? [0, S.level] : [S.level];
  const aw = W / panes.length;
  panes.forEach((L, k) => {
    const x = k * aw, px = Math.min(H / 700, aw / 560);
    const ox = x + aw / 2, oy = H * 0.54;
    const lay = layout(hits, simT, L, { ox, oy, px, style: styleFor(L) });
    drawArena(ctx, lay, { x, y: 0, w: aw, h: H, ox, oy, px, t: simT, hue: k === 0 ? 'night' : 'warm' });
    if (k === panes.length - 1) lastLay = lay;
    if (S.compare) {
      ctx.save(); ctx.font = '700 14px "PingFang SC",sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + aw / 2 - 90, H - 40, 180, 26);
      ctx.fillStyle = '#ffd77a'; ctx.fillText(`L${L} ${LEVELS[L].name}`, x + aw / 2, H - 22);
      ctx.restore();
    }
  });
  if (S.compare) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(aw - 1, 0, 2, H); }
  updateHud();
}

// ---------- HUD ----------
const hud = { n: $('h-n'), last: $('h-last'), total: $('h-total'), stop: $('h-stop') };
function updateHud() {
  const lay = lastLay; if (!lay) return;
  const st = styleFor(S.level);
  hud.n.textContent = lay.nums.length;
  hud.last.textContent = lastAmount == null ? '—' : fmt(lastAmount, st);
  hud.total.textContent = lay.total ? lay.total.text : (S.level >= 5 ? '—' : 'L5 起');
  hud.stop.classList.toggle('on', !!lay.stopped);
}

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!S.paused) step(dt * S.speed);
  render();
  requestAnimationFrame(frame);
}

// ---------- UI ----------
const lvBox = $('levels');
LEVELS.forEach((l) => {
  const b = document.createElement('button'); b.dataset.l = l.id;
  b.innerHTML = `<b>L${l.id}</b>${l.name}`; b.onclick = () => setLevel(l.id); lvBox.appendChild(b);
});
function setLevel(n) {
  S.level = Math.max(0, Math.min(7, n | 0));
  lvBox.querySelectorAll('button').forEach((b) => { const i = +b.dataset.l; b.classList.toggle('on', i === S.level); b.classList.toggle('lit', i < S.level); });
  $('lvdesc').innerHTML = `<b>L${S.level} ${LEVELS[S.level].name}</b>：${esc(LEVELS[S.level].add)}${S.level ? `<br><span style="color:var(--dim)">（累加 L0–L${S.level}）</span>` : ''}`;
  $('lvtag').textContent = `L${S.level} · ${LEVELS[S.level].name}`;
}
function toggle(id, key, cb) {
  $(id).onclick = () => { S[key] = !S[key]; $(id).classList.toggle('on', S[key]); cb?.(); $(id).blur(); };
}
toggle('b-auto', 'auto', () => { autoAt = simT + 0.1; });
toggle('b-cmp', 'compare');
toggle('b-inf', 'inflate', () => $('infbox').style.opacity = S.inflate ? 1 : 0.5);
toggle('b-pause', 'paused');
$('infbox').style.opacity = 0.5;
$('b-hit').onclick = () => { hit(); $('b-hit').blur(); };
$('b-burst').onclick = () => { burst(); $('b-burst').blur(); };
$('b-crit').onclick = () => { hit({ crit: true }); $('b-crit').blur(); };
$('b-reset').onclick = () => { clear(); $('b-reset').blur(); };
$('crit').oninput = (e) => { S.critRate = e.target.value / 100; $('critout').textContent = e.target.value + '%'; };
$('inf').oninput = (e) => { S.rate = +e.target.value; $('infout').textContent = '×' + Math.exp(S.rate).toFixed(2); };
$('inf').oninput({ target: $('inf') });
$('fmt').onchange = (e) => { S.format = e.target.value; };
function setSpeed(v) { S.speed = v; document.querySelectorAll('[data-sp]').forEach((b) => b.classList.toggle('on', +b.dataset.sp === v)); }
document.querySelectorAll('[data-sp]').forEach((b) => (b.onclick = () => { setSpeed(+b.dataset.sp); b.blur(); }));
cv.addEventListener('pointerdown', () => hit());
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (!$('tab-preview').classList.contains('on')) return;
  const k = e.key.toLowerCase();
  if (e.code === 'Space' || k === 'j') { e.preventDefault(); if (!e.repeat) hit(); }
  else if (k === 'k') { if (!e.repeat) burst(); }
  else if (k === 'c') { if (!e.repeat) hit({ crit: true }); }
  else if (/^[0-7]$/.test(k)) setLevel(+k);
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space' && e.target.tagName === 'BUTTON') e.preventDefault(); });
setLevel(S.level);

// ---------- method tab: layers ----------
const LAYERS = [
  { why: '最小可用：知道“打中了多少”。但数字原地出现、原地消失，像日志而不像反馈。', idea: '数字 = 命中点 + 文本 + 寿命。寿命一到就不画；这一层故意用默认字体、不描边，当作“基线”。', code: `if (age > 0.8) return null;   // L0: 0.8s 后消失\nn.x = ox; n.y = oy - 60 * px;   // 原地` },
  { why: '运动 = 生命。向上飘暗示“从目标身上冒出来”，淡出避免突然消失；随机横偏让连续命中不叠在一起。', idea: '位移用 easeOut（先快后慢），alpha 只在后 45% 寿命淡出。横偏来自命中的确定性哈希 jx，而不是 Math.random。', code: `n.y = oy - 60*px - 90*px * easeOut(k);\nn.alpha = 1 - smooth((k - 0.55) / 0.45);\nn.x = ox + h.jx * 70 * px;` },
  { why: '“弹”的瞬间是注意力抓手：数字先冲过头再回落，像被打出来而不是贴上去。粗描边保证任何背景下都读得清。', idea: 'scale 用 easeOutBack（超调后回弹），0.2 秒完成；4 个槽位轮换错开落点，快速连打也不糊成一团。', code: `n.scale = easeOutBack(age / 0.2, 2.6);\nn.x = ox + (h.jx*50 + [-80, 70, -30, 110][h.slot]) * px;` },
  { why: '大数应该“看起来大”。字号随数量级变化，玩家一眼分出轻重；暴击变大、变色、倾斜、抖动，是稀有大奖励的视觉签名。', idea: '字号 ∝ log10(伤害)：和人对数量的对数感知一致。暴击额外 ×1.75、加“暴击”标签、前 0.15 秒抖动。元素决定配色。', code: `const mag = clamp((Math.log10(Math.max(10, h.amount)) - 1) / 3, 0, 1.6);\nn.size = (40 + 26 * mag) * px;\nif (crit) { n.size *= 1.75; n.rot = ±0.12; n.label = '暴击'; }` },
  { why: '“打击感”大半不在数字上：暴击时画面停 75 毫秒、屏幕一抖、目标闪白、火花四溅。数字只是这一下的签名。', idea: '顿帧不是真的暂停，而是把时间扭曲：warp(t) 里每个暴击扣掉最多 75ms，所有动画都用扭曲后的时间算，于是整个画面同时“卡”一下。暴击数字改走抛物线飞出。', code: `export function warp(t, hits, L) {\n  if (L < 4) return t;\n  for (const h of hits) { if (h.t >= t) break;\n    if (h.crit) w -= Math.min(t - h.t, STOP); }  // STOP = 75ms\n}\nshake = sin(age*95 + i) * (1 - age/0.32)² * 16 * px` },
  { why: '同屏十几个小数字是噪声；把一串连击合并成一个“滚动总数”，信息变成一件事：这一套打了多少。数字往上“数”，期待感拉满，最后重重一砸收尾。', idea: 'chainHits 把间隔 < 0.36s 的命中归为一链；总数显示 shown = prev + (sum − prev) · easeOut(sinceLast / 0.14)，每次命中后在 0.14 秒内追上新值；链结束后变金色放大再飘走。', code: `if (h.t - last > 0.36) chain++;   // chainHits\nconst shown = prev + (sum - prev) * easeOut(sinceLast / 0.14);\nscale = 1 + 0.32 * Math.exp(-sinceLast * 13);   // 每次命中脉冲一下` },
  { why: '后期角色越强，数字越大，“越打越大”本身就是奖励。但 1234567890 读不出来：缩写 + 换挡，才能让数量级变化被感觉到。', idea: 'makeHit 里 amount ∝ exp(growth · t)，指数膨胀；fmt() 用 万/亿/兆（或 K/M/B）取三位有效数字，宽度稳定。', code: `const g = Math.exp(growth * (t - t0));\namount = Math.round(base * g * mul * jitter * (crit ? critMul : 1));\nfmt(123456789, 'zh') // → '1.23亿'` },
  { why: '放任不管，数字会刷满屏幕。收敛不是删减爽感，而是把注意力留给最重要的数字：暴击和最新的。', idea: '同屏数字超过上限（默认 7），按 (暴击 ×1e6 + 数值 + 新鲜度) 排名，保留前 7；其余缩小 70%、透明度 ×0.18。实际游戏里还会配合环形池、屏幕外剔除，并提供“降噪/关闭”开关。', code: `if (L >= 7 && nums.length > cap) {\n  score = (crit ? 1e6 : 0) + amount * 0.001 + birth * 10;\n  // 前 cap 个保留，其余 alpha *= 0.18, tiny = true\n}` },
];
$('layers').innerHTML = LEVELS.map((l, i) => {
  const L = LAYERS[i];
  return `<div class="layer"><h3><b>L${i}</b>${l.name}<button data-try="${i}">在预览里试试</button></h3>
  <p class="add">${esc(l.add)}</p>
  <dl><dt>为什么爽</dt><dd>${L.why}</dd><dt>关键写法</dt><dd>${L.idea}</dd></dl>
  <pre><code>${highlight(L.code)}</code></pre></div>`;
}).join('');
document.querySelectorAll('[data-try]').forEach((b) => (b.onclick = () => { setLevel(+b.dataset.try); showTab('preview'); }));

// ---------- format lab ----------
const FMTS = [['raw', '原样'], ['comma', '千分位'], ['en', '英文 K/M/B'], ['zh', '中文 万/亿'], ['sci', '科学计数']];
function fmtLab() {
  const n = Math.max(0, +$('fmtin').value || 0);
  $('fmtout').innerHTML = FMTS.map(([k, t]) => `<tr><th>${t}</th><td>${esc(fmt(n, k))}</td></tr>`).join('');
}
$('fmtin').oninput = fmtLab; fmtLab();

// ---------- sources ----------
const SOURCES = [
  ['Diablo III 官方博客', 'https://us.diablo3.com/blog/19996041'],
  ['Icy Veins · D4 伤害数字是否成了视觉问题', 'https://www.icy-veins.com/d4/news/are-diablo-4s-many-many-damage-numbers-becoming-a-visual-problem'],
  ['Mein-MMO · D4 数字失控', 'https://mein-mmo.de/en/loses-all-meaning-players-criticize-the-most-important-numbers-in-diablo-4-because-they-have-gotten-out-of-control,1572929/'],
  ['Game Developer · 魔界战记的百万伤害与后期结构', 'https://www.gamedeveloper.com/design/game-design-inspirations-disgaea-s-damage-in-the-millions-and-post-game-structure'],
  ['Siliconera · NIS 社长谈魔界战记 6', 'https://www.siliconera.com/nis-president-talks-disgaea-6-development-and-three-changes-to-keep-the-series-fresh/'],
  ['Warcraft Wiki · Stat squish', 'https://warcraft.wiki.gg/wiki/Stat_squish'],
  ['Blizzard 论坛 · 生命值回顾', 'https://us.forums.blizzard.com/en/wow/t/a-look-back-at-health-values/587645'],
  ['Fextralife · 怪物猎人：世界战斗', 'https://monsterhunterworld.wiki.fextralife.com/Combat'],
  ['GMTK · Balatro 的诅咒设计问题', 'https://gmtk.substack.com/p/balatros-cursed-design-problem'],
  ['PC Gamer · Balatro 作者访谈', 'https://www.pcgamer.com/i-dont-play-poker-at-all-says-solo-developer-who-made-the-poker-roguelike-i-cant-stop-playing/'],
  ['Rogueliker · Balatro 访谈', 'https://rogueliker.com/balatro-interview/'],
  ['Steam 社区 · 吸血鬼幸存者卡顿讨论', 'https://steamcommunity.com/app/1794680/discussions/0/600764291186990521'],
  ['Warframe Wiki · Damage Numbers', 'https://wiki.warframe.com/w/Damage_Numbers'],
  ['Tim Cain · 伤害数字的 UX（二手整理）', 'https://turbo-wiki.pages.dev/tim-cain/ux-design/damage-numbers'],
  ['Last Epoch 论坛 · 伤害数字讨论', 'https://forum.lastepoch.com/t/damage-numbers-suggestions-feedback-with-mock-up/11963'],
];
$('srclist').innerHTML = SOURCES.map(([t, u]) => `<li>${esc(t)}：<a href="${u}" target="_blank" rel="noopener">${u}</a></li>`).join('');

// ---------- source viewer ----------
const srcs = {};
let curFile = '';
async function loadSource() {
  const file = $('file').value;
  const code = $('code');
  try {
    if (!srcs[file]) srcs[file] = await fetch(`./src/${file}.js`).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });
    if (curFile === file) return;
    curFile = file;
    const src = srcs[file], lines = src.split('\n');
    code.innerHTML = highlight(src);
    $('srcmeta').textContent = `src/${file}.js · ${lines.length} 行`;
    const fns = [['', '跳转到函数…']];
    lines.forEach((ln, i) => { const m = ln.match(/^(?:export )?(?:function|const) ([A-Za-z_]\w*)/); if (m) fns.push([i, `${m[1]}  · 第 ${i + 1} 行`]); });
    $('fn').innerHTML = fns.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
    $('codebox').scrollTop = 0;
  } catch (e) { code.textContent = '// 读取源码失败：' + e.message; }
}
$('file').onchange = loadSource;
$('fn').onchange = (e) => { if (e.target.value !== '') $('codebox').scrollTop = Math.max(0, +e.target.value * 20 - 20); };
function highlight(s) {
  const re = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|of|in|new|export|import|from|continue|break|while|true|false|null|this|switch|case)\b|\b(\d+\.?\d*(?:e-?\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\()/g;
  let out = '', lastI = 0, m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(lastI, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f';
    out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
    lastI = re.lastIndex;
  }
  return out + esc(s.slice(lastI));
}

// ---------- test hook ----------
window.APP = {
  hit, burst, setLevel,
  setCompare: (v) => { S.compare = !!v; $('b-cmp').classList.toggle('on', S.compare); },
  setAuto: (v) => { S.auto = !!v; autoAt = simT + 0.1; $('b-auto').classList.toggle('on', S.auto); },
  setCrit: (p) => { S.critRate = p; $('crit').value = p * 100; $('critout').textContent = Math.round(p * 100) + '%'; },
  setFormat: (f) => { S.format = f; $('fmt').value = f; },
  setInflation: (v, rate) => { S.inflate = !!v; if (rate) { S.rate = rate; $('inf').value = rate; $('infout').textContent = '×' + Math.exp(rate).toFixed(2); } $('b-inf').classList.toggle('on', S.inflate); $('infbox').style.opacity = S.inflate ? 1 : 0.5; },
  setSpeed, pause: (v) => { S.paused = !!v; $('b-pause').classList.toggle('on', S.paused); },
  showTab, clear,
  step: (dt) => { step(dt); render(); },        // 确定性推进（暂停时也可用）
  stats: () => ({ level: S.level, t: simT, hits: hits.length, pending: pending.length, nums: lastLay?.nums.length ?? 0, lastAmount,
    total: lastLay?.total?.text ?? null, stopped: !!lastLay?.stopped, maxSize: Math.max(0, ...(lastLay?.nums ?? []).map((n) => n.size * n.scale)), state: { ...S } }),
  get lay() { return lastLay; },
};
resize();
requestAnimationFrame(frame);
const h0 = location.hash.slice(1);
if (['method', 'video'].includes(h0)) showTab(h0);
window.READY = true;
