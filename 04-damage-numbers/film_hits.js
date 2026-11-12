// 机制拆解 04 — every hit schedule the film draws, as absolute times from the timeline (shared by film.js and dev/make_cues.mjs).
import { makeHits } from './src/dmgtext.js';
export function hitSchedules(TL) {
  const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
  const A = (id, i) => SC[id].lines[i].start, E = (id, i) => SC[id].lines[i].end;
  const S = id => SC[id].start, END = id => SC[id].end;
  const H_ = {};
  const sched = (key, f) => (H_[key] ??= f());
  const hk = () => sched('cmp', () => makeHits({ seed: 9, t0: A('hook', 5) - 0.3, t1: E('hook', 6) + 1, every: 0.5, base: 2400, elements: ['phys', 'fire'], critRate: 0.3, forceCrit: [1], bursts: [{ t: A('hook', 5) + 1.4, n: 8, gap: 0.11 }] }));
  const kill = () => sched('kill', () => makeHits({ seed: 21, t0: A('hook', 3) - 0.4, t1: E('hook', 4) + 0.6, every: 0.32, base: 3.2e6, growth: 0.55, critRate: 0.4, forceCrit: [2, 5] }));
  const layerHits = id => sched(id, () => {
    const t0 = S(id), t1 = END(id) + 0.5;
    if (id === 'l0' || id === 'l1' || id === 'l2') return makeHits({ seed: 3, t0, t1, every: 0.62, base: 160, critRate: 0.25 });
    if (id === 'l3') return makeHits({ seed: 5, t0, t1, every: 0.6, base: 160, critRate: 0.28, forceCrit: [2], elements: ['phys', 'phys', 'fire', 'ice', 'elec'] });
    if (id === 'l4') return makeHits({ seed: 7, t0, t1, every: 0.72, base: 170, critRate: 0.45, forceCrit: [1, 3], elements: ['phys', 'fire'] });
    if (id === 'l5') { const b = []; for (let x = t0 + 1.2; x < t1 - 1; x += 3.1) b.push({ t: x, n: 9, gap: 0.12, ramp: 0.12 }); return makeHits({ seed: 11, t0, t1, every: 0.7, base: 210, critRate: 0.2, bursts: b, elements: ['phys', 'fire'] }); }
    if (id === 'l6') { const b = []; for (let x = A('l6', 2) + 0.6; x < E('l6', 3); x += 2.6) b.push({ t: x, n: 8, gap: 0.12 }); return makeHits({ seed: 13, t0, t1, every: 0.55, base: 180, growth: 0.42, critRate: 0.3, bursts: b, elements: ['phys', 'fire', 'ice'] }); }
    if (id === 'l7') return makeHits({ seed: 17, t0, t1, every: 0.06, base: 4.2e5, critRate: 0.12, spread: 0.6, elements: ['phys', 'fire', 'ice', 'poison'] });
    if (id === 'counter') return makeHits({ seed: 19, t0, t1, every: 0.7, base: 300, critRate: 0.5, forceCrit: [0, 2] });
    return makeHits({ seed: 23, t0, t1, every: 0.6, base: 2000, critRate: 0.3 });
  });
  return { hk, kill, layerHits };
}
