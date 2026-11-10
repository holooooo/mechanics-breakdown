import { createDuel, MOVES, DODGE, canReact, reactionFrames } from '../src/duel.js';
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const res = (kind, o) => { const D = createDuel(o); D.schedule([{ frame: 60, kind }]); return D.timeline(0); };

ok(reactionFrames(250) === 15, 'reactionFrames(250)=15');
for (const m of ['button', 'state']) ok(res('slash', { mode: m }).result === 'dodged', `slash vs ${m} dodged`);
ok(res('slash', { mode: 'perceive', delay: 15 }).result === 'dodged', 'slash vs perceive@15 dodged');
ok(res('slash', { mode: 'perceive', delay: 25 }).result === 'hit', 'slash vs perceive@25 hit');
ok(res('quick', { mode: 'perceive', delay: 15 }).result === 'hit', 'quick vs perceive@15 hit');
ok(res('quick', { mode: 'state' }).result === 'dodged', 'quick vs state dodged');
ok(res('quick', { mode: 'button' }).result === 'dodged', 'quick vs button dodged');
ok(res('heal', { mode: 'state', aggression: 1 }).result === 'punished', 'heal vs state punished');
ok(res('heal', { mode: 'perceive', delay: 15, aggression: 1 }).result === 'punished', 'heal vs perceive@15 punished');
ok(res('heal', { mode: 'state', aggression: 0 }).result === 'healed', 'heal vs aggression 0 healed');
ok(res('heal', { mode: 'perceive', delay: 25 }).result === 'healed', 'heal vs perceive@25 too slow -> healed');

// 确定性：任意跳转顺序结果一致
{
  const D = createDuel({ mode: 'perceive', delay: 15 });
  D.schedule([{ frame: 30, kind: 'slash' }, { frame: 150, kind: 'heal' }, { frame: 300, kind: 'quick' }]);
  const ts = Array.from({ length: 120 }, (_, i) => i * 0.0617);
  const ref = ts.map((t) => JSON.stringify(D.seek(t)));
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let same = true;
  for (let k = 0; k < 500; k++) { const i = Math.floor(rnd() * ts.length); if (JSON.stringify(D.seek(ts[i])) !== ref[i]) same = false; }
  const D2 = createDuel({ mode: 'perceive', delay: 15 });
  D2.schedule([{ frame: 30, kind: 'slash' }, { frame: 150, kind: 'heal' }, { frame: 300, kind: 'quick' }]);
  for (let i = ts.length - 1; i >= 0; i--) if (JSON.stringify(D2.seek(ts[i])) !== ref[i]) same = false;
  ok(same, 'deterministic under random/reverse seek');
}

// canReact 与模拟一致
{
  let bad = 0, n = 0;
  const orig = MOVES.slash.startup;
  for (let s = 3; s <= 40; s++) for (let d = 0; d <= 30; d++) {
    MOVES.slash.startup = s;
    const r = res('slash', { mode: 'perceive', delay: d }).result;
    n++; if ((r === 'dodged') !== canReact({ startup: s, delay: d, dodgeStartup: DODGE.startup })) bad++;
  }
  MOVES.slash.startup = orig;
  ok(bad === 0, `canReact matches simulation over ${n} (startup,delay) pairs`);
}

// 三个标准用例的帧号
for (const [m, o] of [['button', {}], ['state', {}], ['perceive', { delay: 15 }]])
  console.log(m, JSON.stringify(res('slash', { mode: m, ...o })));
process.exit(fail ? 1 : 0);
