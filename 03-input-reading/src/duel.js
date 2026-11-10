// 读指令教学原型：确定性 1v1 对决模拟（60 fps，整数帧）。
// 原创教学代码，不对应任何商业游戏的真实实现。
export const FPS = 60;

// 玩家招式帧数表：lag=输入到动作开始的延迟（输入缓冲/状态机），
// startup=前摇（姿势从第一帧起可见），active=判定帧，recovery=后摇。
export const MOVES = {
  slash: { lag: 2, startup: 22, active: 4, recovery: 18, damage: 20 },
  quick: { lag: 2, startup: 9, active: 3, recovery: 14, damage: 10 },
  heal: { lag: 2, startup: 30, active: 0, recovery: 10, heal: 40 }, // 喝药 30 帧后才回血
};
export const DODGE = { startup: 6, iframes: 16, recover: 10 }; // 闪避：6 帧后才无敌，持续 16 帧
export const THRUST = { startup: 12, active: 4, recover: 14, damage: 25 }; // 惩罚突刺
export const HP = 100;

export const reactionFrames = (ms) => Math.round((ms * FPS) / 1000); // 250ms -> 15 帧

//#region fair
// 公平性的关键规则：前摇必须长于「感知延迟 + 闪避起手」，敌人才躲得开。
// 例：慢斩 22 > 15 + 6 躲得开；快斩 9 < 21 躲不开。
export function canReact({ startup, delay, dodgeStartup = DODGE.startup }) {
  return startup >= delay + dodgeStartup; // 无敌帧在判定帧开始前生效
}
//#endregion

//#region modes
// 三种敌人「知道」玩家出招的时刻 —— 差别只有这几行
function noticeFrame(mode, act) {
  switch (mode) {
    case 'button':   // 读按键：按下的那一帧就知道
      return act.input;
    case 'state':    // 读动作：动作状态机开始出招时被通知（魂系 INTERUPT）
      return act.start;
    case 'perceive': // 看画面：起手姿势出现（第一帧前摇）才看得到
      return act.start;
  }
}
//#endregion

//#region perceive
// 感知延迟：只有「看画面」的敌人要等 delay 帧（默认 15 帧 ≈ 250ms）才能做决定
function decideFrame(mode, notice, delay) {
  return mode === 'perceive' ? notice + delay : notice;
}
//#endregion

// 用帧号做确定性「随机」：同一帧永远得到同一个 0..1 的数
function hash01(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createDuel({ mode = 'perceive', delay = reactionFrames(250), aggression = 1 } = {}) {
  let plans = [];
  let cur = 0;

  function plan(a) {
    const m = MOVES[a.kind];
    const input = a.frame, start = input + m.lag;
    const activeStart = start + m.startup, activeEnd = activeStart + m.active - 1;
    const act = { input, start };
    const notice = noticeFrame(mode, act);
    const decide = decideFrame(mode, notice, delay);
    const seg = []; // 敌人状态段 [from, to, state)
    const events = [];
    const p = { kind: a.kind, input, start, firstVisible: start, activeStart, activeEnd,
      enemyNotice: notice, enemyDecide: decide, enemyInvuln: null, result: null, seg, events };
    if (decide > notice) seg.push([notice, decide, 'waiting']);

    if (a.kind === 'heal') {
      const healEnd = start + m.startup;
      // react：敌人是否选择惩罚喝药（按帧哈希与 aggression 比较，确定性）
      const punish = hash01(input) < aggression;
      if (punish) {
        const hitAt = decide + THRUST.startup;
        seg.push([decide, hitAt, 'thrust_startup'], [hitAt, hitAt + THRUST.active, 'thrust_active'],
          [hitAt + THRUST.active, hitAt + THRUST.active + THRUST.recover, 'recover']);
        if (hitAt < healEnd) { // 突刺在喝完前命中：打断喝药
          p.result = 'punished';
          events.push({ frame: hitAt, type: 'hit_player', action: a.kind, amount: THRUST.damage });
        }
      } else seg.push([notice, decide + 1, 'noticed']);
      if (!p.result) { // 没被打断：喝完回血
        p.result = 'healed';
        events.push({ frame: healEnd, type: 'heal', action: a.kind, amount: m.heal });
      }
      return p;
    }

    //#region react
    // 敌人对攻击的反应：闪避。闪避起手 6 帧后才无敌，且尽量把无敌帧卡在判定帧附近
    const invuln = Math.max(decide + DODGE.startup, activeStart - 2); // 第一个无敌帧
    const dodgeBegin = invuln - DODGE.startup;
    const dodged = invuln <= activeStart; // 判定帧开始时已无敌 => 躲开
    //#endregion
    p.enemyInvuln = invuln;
    if (dodgeBegin > decide) seg.push([decide, dodgeBegin, 'noticed']);
    seg.push([dodgeBegin, invuln, 'dodge_startup'], [invuln, invuln + DODGE.iframes, 'dodge_iframes'],
      [invuln + DODGE.iframes, invuln + DODGE.iframes + DODGE.recover, 'recover']);
    p.result = dodged ? 'dodged' : 'hit';
    events.push({ frame: dodgeBegin, type: 'dodge', action: a.kind });
    if (!dodged) events.push({ frame: activeStart, type: 'hit_enemy', action: a.kind, amount: m.damage });
    return p;
  }

  function stateAt(frame) {
    const f = Math.max(0, frame);
    // 玩家：取最近一次已输入的动作（后一个动作覆盖前一个）
    let pa = null;
    plans.forEach((p) => { if (p.input <= f && (!pa || p.input >= pa.input)) pa = p; });
    const player = { action: null, phase: 'idle', phaseFrame: 0, hp: HP };
    if (pa) {
      const m = MOVES[pa.kind], d = f - pa.input;
      const edges = [['lag', m.lag], ['startup', m.startup], ['active', m.active], ['recovery', m.recovery]];
      let t = d;
      for (const [name, len] of edges) {
        if (t < len) { player.action = pa.kind; player.phase = name; player.phaseFrame = t; break; }
        t -= len;
      }
    }
    // 敌人：找最近一次覆盖当前帧的状态段
    const enemy = { state: 'idle', stateFrame: 0, knowsAt: null, hp: HP };
    let best = -1;
    plans.forEach((p) => {
      if (p.enemyNotice <= f && p.enemyNotice >= best) enemy.knowsAt = p.enemyNotice;
      p.seg.forEach(([from, to, st]) => {
        if (f >= from && f < to && from >= best) { best = from; enemy.state = st; enemy.stateFrame = f - from; }
      });
    });
    const events = [];
    plans.forEach((p, i) => p.events.forEach((e) => {
      if (e.frame <= f) {
        events.push({ ...e, index: i });
        if (e.type === 'hit_player') player.hp -= e.amount;
        if (e.type === 'hit_enemy') enemy.hp -= e.amount;
        if (e.type === 'heal') player.hp = Math.min(HP, player.hp + e.amount);
      }
    }));
    events.sort((a, b) => a.frame - b.frame);
    return { t: f / FPS, frame: f, player, enemy, events };
  }

  return {
    mode, delay, aggression,
    // 注册玩家动作 [{frame, kind}]，按输入帧排序
    schedule(actions) {
      plans = [...actions].sort((a, b) => a.frame - b.frame).map(plan);
      return this;
    },
    // 跳转到时间 t（秒），内部换算成帧；状态是帧的纯函数，与跳转顺序无关
    seek(t = 0) { cur = Math.max(0, Math.round(t * FPS)); return stateAt(cur); },
    state() { return stateAt(cur); },
    stateAt,
    timeline(i) {
      const p = plans[i];
      return {
        input: p.input, actionStart: p.start, firstVisible: p.firstVisible,
        enemyNotice: p.enemyNotice, enemyDecide: p.enemyDecide, enemyInvuln: p.enemyInvuln,
        activeStart: p.activeStart, activeEnd: p.activeEnd, result: p.result,
      };
    },
  };
}
