// 影之刃式 Boss：教学原型（原创代码，纯 JS、无 DOM、60 fps 整数帧、完全确定性）。
// 招式权重来自玩家对影之刃零的实测与推测（非官方）；本文件不是任何商业游戏的真实实现。
//
// 它不读按键，只读你的状态：
// 玩家的输入只进入「玩家状态机」和一个 1.5 秒滑动计数器；
// Boss 做决定时只能看到 sense() 返回的三个数字（血量、每秒按键数、是否在喝药）。
import { pressure, weights, pick } from './pressure.js';

export const FPS = 60;
export const MAX_HP = 100;
export const SHA_MAX = 60;       // 杀气上限（敌我共用规则）
export const BOSS_HP = 300;
export const DECIDE_EVERY = 84;  // 约 1.4 秒选一次招
export const SENSE_WIN = 90;     // 1.5 秒按键窗口
export const TELEGRAPH = 30;     // 0.5 秒预兆（红光/蓝光）

// 玩家动作：startup 前摇 / active 判定（闪避=无敌帧，弹反=弹反窗口）/ recovery 后摇
export const PLAYER = {
  slash: { startup: 22, active: 4, recovery: 18, damage: 20, sha: 12 },
  quick: { startup: 9, active: 3, recovery: 14, damage: 10, sha: 6 },
  heal:  { startup: 30, active: 0, recovery: 10, heal: 40 },
  dodge: { startup: 4, active: 16, recovery: 10 },   // 4 帧后才无敌，持续 16 帧
  parry: { startup: 0, active: 8, recovery: 14 },    // 弹反窗口 8 帧，落空有后摇
};

// 招式表：color 决定预兆颜色；parryable=false 的红光只能闪避
export const BOSS_MOVES = {
  '普通连斩': { color: 'blue', label: '蓝光 · 可弹反' },
  '后撤步':   { color: null, label: '' },
  '剑气':     { color: 'blue', label: '蓝光 · 闪避或弹反' },
  '红光投技': { color: 'red', label: '红光！闪避' },
};

// 确定性随机：同一个 (seed, 序号) 永远得到同一个 0..1 的数
export function hash01(seed, n) {
  let h = Math.imul((n + 1) ^ Math.imul(seed + 1, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createBoss({ seed = 1 } = {}) {
  let frame = 0, slot = 0, decideAt = 60;
  const presses = [];                       // 最近的按键帧，只用来数「每秒几下」
  const P = { hp: MAX_HP, sha: SHA_MAX, act: null, stun: 0 };       // act: {kind, f}
  const B = { hp: BOSS_HP, sha: SHA_MAX, state: 'idle', f: 0, move: null, stun: 0, hits: [] };
  let proj = null, last = null, events = [];
  const ev = (type, o = {}) => events.push({ frame, type, ...o });

  //#region sense
  // Boss 的全部「感知」：三个派生数字。拿不到按了哪个键，也拿不到按键时刻。
  function sense() {
    while (presses.length && presses[0] <= frame - SENSE_WIN) presses.shift();
    const a = P.act;
    return { hp: P.hp / MAX_HP, pressesPerSec: presses.length / (SENSE_WIN / FPS),
      healing: !!a && a.kind === 'heal' };
  }
  //#endregion

  //#region choose
  // 每 1.4 秒：状态 → 压力分 → 权重 → 用哈希随机数抽一招
  function decide() {
    const s = sense(), p = pressure(s), r = hash01(seed, slot++);
    const move = pick(p, r);
    last = { ...s, p, r, move, weights: weights(p), frame };
    ev('pick', { move, p, r });
    startMove(move);
  }
  //#endregion

  //#region telegraph
  // 每招先有 0.5 秒预兆：红光=只能闪避，蓝光=可弹反。预兆结束才判定。
  function startMove(name) {
    B.move = { name, ...BOSS_MOVES[name], result: null, parried: false, hit: false };
    B.hits = []; B.f = 0;
    if (name === '后撤步') { B.state = 'backstep'; return; }
    B.state = 'telegraph';
    ev('telegraph', { move: name, color: B.move.color, label: B.move.label });
  }
  //#endregion

  //#region resolve
  // 判定只看玩家此刻的帧状态：闪避无敌帧 / 弹反窗口
  const invuln = () => !!P.act && P.act.kind === 'dodge' && P.act.f >= PLAYER.dodge.startup && P.act.f < PLAYER.dodge.startup + PLAYER.dodge.active;
  const parrying = () => !!P.act && P.act.kind === 'parry' && P.act.f < PLAYER.parry.active;
  function strike(name, dmg, canParry, shaHit = 12) {
    if (invuln()) return 'dodged';
    if (canParry && parrying()) { B.sha -= 25; return 'parried'; }   // 完美弹反：削 Boss 杀气
    if (P.act && P.act.kind === 'heal') P.act = null;                // 喝药被打断
    P.hp = Math.max(0, P.hp - dmg); P.sha -= shaHit;
    if (P.sha <= 0) { P.sha = 30; P.stun = 45; P.act = null; ev('player_break'); }
    ev('hit_player', { move: name, damage: dmg });
    return 'hit';
  }
  function finish(outcome) {
    B.move.result = outcome; ev('result', { move: B.move.name, outcome, color: B.move.color });
  }
  //#endregion

  //#region shachi
  // 杀气：谁的杀气打空谁破防。完美弹反 -25；斩击命中 -12/-6；被打 -12；红光被抓 -20。
  // Boss 杀气归零 → 破防 2 秒（站着挨打，伤害 ×2）；玩家归零 → 晕 0.75 秒。
  function shaCheck() {
    if (B.sha <= 0 && B.state !== 'stunned') {
      B.state = 'stunned'; B.f = 0; B.sha = 0; B.hits = []; proj = null; B.move = null;
      ev('guard_break');
    }
    B.sha = Math.min(SHA_MAX, B.sha);
    P.sha = Math.min(SHA_MAX, P.sha);
  }
  //#endregion

  function startPlayer(kind) {
    const a = P.act;
    if (P.stun > 0) return;
    const free = !a || ((kind === 'dodge' || kind === 'parry') && a.f >= PLAYER[a.kind].startup + PLAYER[a.kind].active);
    if (free) P.act = { kind, f: 0 };
  }

  function stepPlayer() {
    const a = P.act;
    if (!a) return;
    const d = PLAYER[a.kind];
    if ((a.kind === 'slash' || a.kind === 'quick') && a.f === d.startup) {
      if (B.state === 'backstep' && B.f < 30) ev('whiff', { kind: a.kind });
      else {
        const dmg = d.damage * (B.state === 'stunned' ? 2 : 1);
        B.hp = Math.max(0, B.hp - dmg); B.sha -= d.sha; ev('boss_hit', { kind: a.kind, damage: dmg });
      }
    }
    if (a.kind === 'heal' && a.f === d.startup) { P.hp = Math.min(MAX_HP, P.hp + d.heal); ev('heal', { amount: d.heal }); }
    a.f++;
    if (a.f >= d.startup + d.active + d.recovery) P.act = null;
  }

  function stepBoss() {
    const m = B.move;
    if (B.state === 'idle') { if (frame >= decideAt) { decideAt = frame + DECIDE_EVERY; decide(); } return; }
    if (B.state === 'stunned') { if (++B.f >= 120) { B.state = 'idle'; B.sha = 30; B.f = 0; decideAt = Math.max(decideAt, frame + 20); } return; }
    B.f++;
    if (B.state === 'backstep') { if (B.f >= 48) { B.state = 'idle'; B.move = null; } return; }
    if (B.state === 'telegraph' && B.f >= TELEGRAPH) {
      B.state = 'attack'; B.f = 0;
      if (m.name === '剑气') proj = { f: 0, len: 36 };
    }
    if (B.state === 'attack') {
      if (m.name === '红光投技' && B.f === 0) {
        const o = strike(m.name, 30, false, 20); finish(o === 'hit' ? 'grabbed' : o); B.state = 'recover'; B.f = 0; B.recover = o === 'hit' ? 30 : 40;
      } else if (m.name === '普通连斩' && (B.f === 0 || B.f === 12)) {
        const o = strike(m.name, 12, true); B.hits.push(o);
        if (o === 'parried') { finish('parried'); B.state = 'recover'; B.f = 0; B.recover = 40; }   // 弹反：连招被打断
        else if (B.hits.length === 2) { finish(B.hits.includes('hit') ? 'hit' : 'dodged'); B.state = 'recover'; B.f = 0; B.recover = 24; }
      } else if (m.name === '剑气' && B.f === 0) { B.state = 'recover'; B.f = 0; B.recover = 20; }
    } else if (B.state === 'recover' && B.f >= B.recover) { B.state = 'idle'; B.move = null; B.f = 0; }
  }

  function stepProj() {
    if (!proj) return;
    if (++proj.f < proj.len) return;
    const o = strike('剑气', 15, true, 8); proj = null;
    ev('result', { move: '剑气', outcome: o, color: 'blue' });
  }

  return {
    // 推进一帧。inputs: 本帧的玩家输入数组，如 ['slash'] / ['dodge'] / ['parry']
    step(inputs = []) {
      events = [];
      for (const k of inputs) { if (PLAYER[k]) { presses.push(frame); startPlayer(k); } }
      if (P.stun > 0) P.stun--;
      stepBoss(); stepProj(); stepPlayer(); shaCheck();
      // 杀气缓慢回复（每秒 4 点）
      if (frame % 15 === 0) { if (B.state !== 'stunned') B.sha = Math.min(SHA_MAX, B.sha + 1); P.sha = Math.min(SHA_MAX, P.sha + 1); }
      frame++;
      return events;
    },
    state() {
      const s = sense(), a = P.act;
      const ph = a ? (a.f < PLAYER[a.kind].startup ? 'startup' : a.f < PLAYER[a.kind].startup + PLAYER[a.kind].active ? 'active' : 'recovery') : 'idle';
      return {
        frame, t: frame / FPS,
        player: { hp: P.hp, sha: P.sha, action: a ? a.kind : null, phase: ph, f: a ? a.f : 0, invuln: invuln(), parrying: parrying(), stun: P.stun },
        boss: { hp: B.hp, sha: B.sha, state: B.state, f: B.f, move: B.move ? B.move.name : null, color: B.move ? B.move.color : null, label: B.move ? B.move.label : '', tel: B.state === 'telegraph' ? B.f / TELEGRAPH : 0 },
        proj: proj ? proj.f / proj.len : null,
        sense: s, pressure: pressure(s), weights: weights(pressure(s)), last,
        nextDecideIn: Math.max(0, decideAt - frame),
      };
    },
  };
}
