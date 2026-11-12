// 机制拆解 04 · 跳字 —— Canvas 2D 竞技场渲染：木桩、挥砍、火花、伤害数字、连击总数。
// drawArena(ctx, lay, opt) 只画 layout() 返回的绘制指令，自身无状态。
import { ELEMENTS } from './dmgtext.js';

const FONT_NUM = '"Impact", "DIN Condensed", "Arial Black", sans-serif';
const FONT_ZH = '"PingFang SC", "Noto Sans CJK SC", sans-serif';

export function drawBackdrop(ctx, { x, y, w, h, t = 0, tint = 0, hue = 'night' }) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const top = hue === 'warm' ? '#2a1420' : '#121a2e', mid = hue === 'warm' ? '#3a1c22' : '#1b2440';
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(0.62, mid); g.addColorStop(0.63, '#0d1220'); g.addColorStop(1, '#07090f');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  // 地面透视网格
  const hy = y + h * 0.63, cx = x + w / 2;
  ctx.strokeStyle = 'rgba(120,160,255,0.10)'; ctx.lineWidth = 1.5;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 40, hy); ctx.lineTo(cx + i * 260, y + h); ctx.stroke(); }
  for (let j = 1; j < 9; j++) { const yy = hy + (y + h - hy) * Math.pow(j / 9, 1.8); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  // 远处光柱
  for (let k = 0; k < 5; k++) {
    const lx = x + w * (0.12 + k * 0.19), a = 0.05 + 0.03 * Math.sin(t * 0.6 + k * 1.7);
    const lg = ctx.createLinearGradient(lx, y, lx, hy);
    lg.addColorStop(0, `rgba(255,200,120,${a})`); lg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lg; ctx.fillRect(lx - 30, y, 60, hy - y);
  }
  if (tint > 0) { ctx.fillStyle = `rgba(255,120,40,${0.12 * tint})`; ctx.fillRect(x, y, w, h); }
  // 暗角
  const v = ctx.createRadialGradient(cx, y + h * 0.5, h * 0.25, cx, y + h * 0.5, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawDummy(ctx, ox, oy, px, squash = 0, flash = 0, t = 0) {
  // 原创木桩：木柱 + 草垛身体 + 十字横杆 + 胸口靶心。ox,oy = 胸口靶心
  ctx.save();
  ctx.translate(ox, oy);
  const sx = 1 + 0.14 * squash, sy = 1 - 0.1 * squash;
  const lean = Math.sin(t * 1.3) * 0.01 + 0.08 * squash;
  ctx.rotate(lean); ctx.scale(px * sx, px * sy);
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(0, 250, 150, 26, 0, 0, Math.PI * 2); ctx.fill();
  // 柱子
  const wood = ctx.createLinearGradient(-22, 0, 22, 0); wood.addColorStop(0, '#5a3418'); wood.addColorStop(0.5, '#8a5a2e'); wood.addColorStop(1, '#4a2a12');
  ctx.fillStyle = wood; ctx.fillRect(-20, -40, 40, 290);
  // 横杆
  ctx.save(); ctx.rotate(-0.05); ctx.fillStyle = wood; ctx.fillRect(-190, -88, 380, 30); ctx.restore();
  // 草垛身体
  const straw = ctx.createRadialGradient(-30, -40, 20, 0, 0, 160); straw.addColorStop(0, '#f2cf7a'); straw.addColorStop(0.7, '#c9963e'); straw.addColorStop(1, '#8a5f22');
  ctx.fillStyle = straw; ctx.beginPath(); ctx.ellipse(0, 10, 112, 140, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(90,55,15,0.55)'; ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 30, -120 + Math.abs(i) * 8); ctx.quadraticCurveTo(i * 36, 10, i * 30, 140 - Math.abs(i) * 8); ctx.stroke(); }
  // 绑绳
  ctx.strokeStyle = '#6b3d1c'; ctx.lineWidth = 9; for (const yy of [-70, 95]) { ctx.beginPath(); ctx.ellipse(0, yy, 100 - Math.abs(yy) * 0.12, 14, 0, 0, Math.PI); ctx.stroke(); }
  // 头
  ctx.fillStyle = straw; ctx.beginPath(); ctx.arc(0, -178, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2208'; ctx.beginPath(); ctx.arc(-20, -184, 7, 0, Math.PI * 2); ctx.arc(20, -184, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-14, -152); ctx.lineTo(14, -152); ctx.stroke();
  // 靶心
  for (const [r, c] of [[64, '#f4efe4'], [50, '#e0332a'], [34, '#f4efe4'], [18, '#e0332a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
  // 受击闪白
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, flash);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 10, 116, 144, 0, 0, Math.PI * 2); ctx.arc(0, -178, 64, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawSlashes(ctx, lay, ox, oy, px) {
  for (const s of lay.slashes) {
    const r = (s.tick ? 150 : 190) * px, a0 = s.dir > 0 ? -2.4 : -0.75, sweep = 1.6 * s.dir;
    const head = a0 + sweep * Math.min(1, s.k * 1.6), tail = a0 + sweep * Math.max(0, s.k * 1.6 - 0.7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - s.k;
    ctx.strokeStyle = s.crit ? '#ffcf5a' : '#cfe6ff'; ctx.lineCap = 'round';
    ctx.shadowColor = s.crit ? '#ff7a1a' : '#7ab8ff'; ctx.shadowBlur = 24 * px;
    ctx.lineWidth = (s.crit ? 22 : 12) * px * (1 - s.k * 0.6);
    ctx.beginPath(); ctx.arc(ox, oy - 10 * px, r, Math.min(head, tail), Math.max(head, tail)); ctx.stroke();
    ctx.restore();
  }
}

function drawSparks(ctx, lay, px) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const s of lay.sparks) {
    const c = s.crit ? [255, 190, 70] : s.el === 'ice' ? [140, 220, 255] : s.el === 'fire' ? [255, 120, 40] : s.el === 'elec' ? [190, 140, 255] : [210, 230, 255];
    ctx.strokeStyle = `rgba(${c},${s.life})`; ctx.lineWidth = (s.crit ? 5 : 3) * px * s.life + 1;
    const len = 26 * px * s.life;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(s.ang) * len, s.y - Math.sin(s.ang) * len); ctx.stroke();
  }
  ctx.restore();
}

export function drawNumber(ctx, n) {
  if (n.alpha <= 0.01 || n.scale <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, n.alpha));
  ctx.translate(n.x, n.y); ctx.rotate(n.rot); ctx.scale(n.scale, n.scale);
  const s = n.size * (n.tiny ? 0.7 : 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (!n.outline) {                                   // L0 / L1：系统默认字，故意朴素
    ctx.font = `500 ${s * 0.8}px ${FONT_ZH}`; ctx.fillStyle = '#ffffff'; ctx.fillText(n.text, 0, 0); ctx.restore(); return;
  }
  ctx.font = `${s}px ${FONT_NUM}`;
  const pal = n.L >= 3 ? ELEMENTS[n.crit ? 'crit' : n.el] || ELEMENTS.phys : { fill: ['#ffffff', '#ffe9a8'], stroke: '#20160a' };
  if (n.glow > 0) { ctx.shadowColor = n.crit ? 'rgba(255,110,20,0.95)' : 'rgba(255,255,255,0.4)'; ctx.shadowBlur = 34 * n.glow * s / 60; }
  ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.17; ctx.strokeStyle = pal.stroke; ctx.strokeText(n.text, 0, 0);
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.45);
  pal.fill.forEach((c, i) => g.addColorStop(i / (pal.fill.length - 1), c));
  ctx.fillStyle = g; ctx.fillText(n.text, 0, 0);
  // 高光
  ctx.globalAlpha *= 0.35; ctx.fillStyle = '#fff'; ctx.save(); ctx.beginPath(); ctx.rect(-s * 4, -s * 0.5, s * 8, s * 0.3); ctx.clip(); ctx.fillText(n.text, 0, 0); ctx.restore();
  ctx.globalAlpha /= 0.35;
  if (n.label) {
    ctx.font = `900 ${s * 0.34}px ${FONT_ZH}`;
    const lw = ctx.measureText(n.label).width + s * 0.3, ly = -s * 0.78;
    ctx.fillStyle = '#ff2d2d'; roundRect(ctx, -lw / 2, ly - s * 0.22, lw, s * 0.44, s * 0.12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(n.label, 0, ly + s * 0.02);
  }
  ctx.restore();
}

export function drawTotal(ctx, T) {
  if (!T || T.alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha = T.alpha; ctx.translate(T.x, T.y); ctx.scale(T.scale, T.scale);
  const s = T.size; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${s * 0.3}px ${FONT_ZH}`; ctx.fillStyle = '#ffd77a'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
  ctx.fillText(`连击 ×${T.count}`, 0, -s * 0.78); ctx.shadowBlur = 0;
  ctx.font = `${s}px ${FONT_NUM}`;
  if (T.slam > 0) { ctx.shadowColor = 'rgba(255,150,30,1)'; ctx.shadowBlur = 60 * T.slam; }
  ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.16; ctx.strokeStyle = '#2a0e00'; ctx.strokeText(T.text, 0, 0); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.45);
  const top = mix('#ffffff', '#fff3a0', T.gold), bot = mix('#ffcf6a', '#ff7a12', T.gold);
  g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillText(T.text, 0, 0);
  ctx.restore();
}

/** 一次画完整个竞技场。opt: {x,y,w,h, ox,oy, px, t, backdrop:true, hue} */
export function drawArena(ctx, lay, opt) {
  const { x, y, w, h, ox, oy, px = 1, t = 0, backdrop = true, hue = 'night' } = opt;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(lay.shake[0], lay.shake[1]);
  if (backdrop) drawBackdrop(ctx, { x: x - 30, y: y - 30, w: w + 60, h: h + 60, t, hue, tint: lay.stopped ? 1 : 0 });
  drawDummy(ctx, ox, oy, px * 0.9, lay.squash, lay.flash, t);
  drawSlashes(ctx, lay, ox, oy, px);
  drawSparks(ctx, lay, px);
  const nums = [...lay.nums].sort((a, b) => (a.crit - b.crit) || (a.birth - b.birth));
  for (const n of nums) drawNumber(ctx, n);
  drawTotal(ctx, lay.total);
  if (lay.stopped) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function mix(a, b, k) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join('');
}
