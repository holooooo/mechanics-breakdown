import { createCombat, auraDuration, decayRate } from '../src/combat.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + extra)); if (!cond) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const hit = (t, element, units, o = {}) => ({ t, type: 'hit', target: 'a', element, units, dmg: 1000, src: 's1', icd: false, ...o });
const make = (evs) => { const c = createCombat(); c.addTarget({ id: 'a', x: 0, z: 0, name: 'dummy' }); c.schedule(evs); return c; };
const aura = (c, el) => c.targets[0].auras.find((a) => a.element === el);

ok('helpers', auraDuration(1) === 9.5 && auraDuration(4) === 17 && near(decayRate(1), 1 / 11.875));

let c = make([hit(0, 'pyro', 1)]); c.seek(0);
ok('aura tax 1U -> 0.8U', near(aura(c, 'pyro').gauge, 0.8));
c.seek(9.4); ok('1U still there at 9.4s', !!aura(c, 'pyro'));
c.seek(9.6); ok('1U gone at 9.6s', !aura(c, 'pyro'));
c = make([hit(0, 'pyro', 4)]); c.seek(16.9); const a4 = !!aura(c, 'pyro'); c.seek(17.1);
ok('4U lasts 17s', a4 && !aura(c, 'pyro'));

c = make([hit(0, 'pyro', 1), hit(1, 'pyro', 1)]); c.seek(1);
ok('same element: max not sum', near(aura(c, 'pyro').gauge, 0.8) && c.log[1].kind === 'refresh');
c = make([hit(0, 'hydro', 1), hit(0.5, 'hydro', 2)]); c.seek(0.5);
ok('same element takes larger, decay kept', near(aura(c, 'hydro').gauge, 1.6) && near(aura(c, 'hydro').decay, decayRate(1)));

c = make([hit(0, 'pyro', 2), hit(1, 'hydro', 1)]); c.seek(1);
let l = c.log[1];
ok('strong vaporize x2, consumes 2U', l.reaction === 'vaporize' && l.strong && l.multiplier === 2 && l.damage === 2000 && !aura(c, 'pyro'));
c = make([hit(0, 'hydro', 2), hit(1, 'pyro', 1)]); c.seek(1);
l = c.log[1]; const g0 = c.log[0].gaugeAfter;
ok('weak vaporize x1.5, consumes 0.5U', l.reaction === 'vaporize' && !l.strong && l.damage === 1500 && near(l.gaugeBefore - l.gaugeAfter, 0.5) && g0 > 1.59);
c = make([hit(0, 'pyro', 2), hit(1, 'hydro', 1), hit(2, 'cryo', 1)]); c.seek(2);
ok('melt weak x1.5 after pyro gone? (cryo on empty applies)', c.log[2].kind === 'apply');
c = make([hit(0, 'cryo', 2), hit(1, 'pyro', 1)]); c.seek(1);
ok('melt strong x2', c.log[1].reaction === 'melt' && c.log[1].damage === 2000);
c = make([hit(0, 'electro', 1), hit(1, 'geo', 1)]); c.seek(1);
ok('crystallize consumes 0.5x (1U geo on 0.8U electro leaves ~0.3U)', c.log[1].reaction === 'crystallize' && near(aura(c, 'electro').gauge, 0.8 - 1 / 11.875 - 0.5, 1e-3));
c = make([hit(0, 'geo', 1)]); c.seek(0);
ok('geo never sticks', c.targets[0].auras.length === 0);

// ICD：0.2s 间隔 7 连击 -> 第 1、4、7 下附着
const rapid = Array.from({ length: 7 }, (_, i) => hit(i * 0.2, 'pyro', 1, { icd: true, src: 'yoimiya' }));
c = make(rapid); c.seek(5);
const applied = c.log.map((e, i) => (e.kind === 'blocked_icd' ? 0 : i + 1)).filter(Boolean);
ok('ICD 7 hits -> 1,4,7', applied.join() === '1,4,7', applied.join());
ok('blocked hits still deal damage', c.log.filter((e) => e.kind === 'blocked_icd').every((e) => e.damage === 1000));
c = make([hit(0, 'pyro', 1, { icd: true }), hit(1, 'pyro', 1, { icd: true }), hit(2.6, 'pyro', 1, { icd: true }), hit(2.7, 'pyro', 1, { icd: true })]); c.seek(3);
ok('ICD timer 2.5s resets counter', c.log.map((e) => e.kind !== 'blocked_icd').join() === 'true,false,true,false');

// 感电
c = make([hit(0, 'hydro', 4), hit(0.1, 'electro', 4)]); c.seek(0.1);
ok('electro-charged starts, both coexist', c.log[1].reaction === 'electro-charged' && c.targets[0].auras.length === 2);
c.seek(3.5);
const ecs = c.log.filter((e) => e.reaction === 'electro-charged').length;
ok('electro-charged ticks each 1s (trigger + 3 ticks by 3.5s)', ecs === 4, String(ecs));
ok('EC consumes 0.4U each per tick', near(aura(c, 'hydro').gauge, 3.2 - 0.4 * 4 - 3.5 * decayRate(4), 1e-6));

// 确定性：任意 seek 顺序结果一致
const evs = [hit(0, 'pyro', 2), hit(0.5, 'hydro', 1), hit(1, 'electro', 2), hit(1.2, 'hydro', 2), hit(2, 'cryo', 1), hit(4, 'pyro', 1), hit(5, 'geo', 1)];
const snap = (cc) => JSON.stringify([cc.targets, cc.log]);
const ref = {}; const cr = make(evs);
const times = [0, 0.7, 1.3, 2.2, 3, 4.5, 6, 9, 12];
for (const t of times) { cr.seek(t); ref[t] = snap(cr); }
const cx = make(evs); let det = true; let seed = 12345;
for (let i = 0; i < 60; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const t = times[seed % times.length]; cx.seek(t); if (snap(cx) !== ref[t]) det = false; }
ok('deterministic under random-order seeks', det);

c = make(evs); const t0 = process.hrtime.bigint();
for (let i = 0; i <= 600; i++) c.seek(i / 60);
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 600;
ok('fast forward frame (' + ms.toFixed(3) + ' ms)', ms < 2);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
