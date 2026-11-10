// SFX cues for episode 2, derived from the same event times film.js uses.
import { readFileSync, writeFileSync } from 'node:fs';
const TL = JSON.parse(readFileSync('build/timeline.json', 'utf8'));
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i]; const rel = (id, i, o = 0) => L(id, i).start - SC[id].start + o;
const cues = []; const at = (id, abs, type, extra = {}) => cues.push({ scene: id, line: 0, offset: +(abs - L(id, 0).start).toFixed(3), type, ...extra });
const S = id => SC[id].start, E = id => SC[id].end;
const HIT = { pyro: 'ignite', hydro: 'steam', electro: 'zap', cryo: 'chime' };
const hitAt = (id, lt, el, reaction) => { const a = S(id) + lt; at(id, a, 'whoosh', { gain: 0.35 }); at(id, a + 0.35, HIT[el] || 'ui_tick', { gain: 0.7 }); if (reaction) at(id, a + 0.4, reaction === 'vaporize' ? 'steam' : 'power_on', { gain: 0.8 }); };
for (const s of TL.scenes.slice(1)) at(s.id, s.start - 0.15, 'whoosh', { gain: 0.3 });
const FOOT = L('hook', 1).end + 0.3;
at('hook', 0.2, 'fire_loop', { dur: 4.8 }); at('hook', 5.0, 'steam'); at('hook', 5.4, 'rain', { dur: 2.6, gain: 0.5 }); at('hook', 8.0, 'ignite'); at('hook', L('hook', 1).start + 2.2, 'chime', { gain: 0.7 });
hitAt('hook', FOOT + 0.4, 'pyro'); hitAt('hook', FOOT + 1.8, 'hydro', 'vaporize'); at('hook', L('hook', 2).start + 0.3, 'whoosh', { gain: 0.7 });
at('contrast', S('contrast') + 0.1, 'fire_loop', { dur: E('contrast') - S('contrast') - 0.3, gain: 0.6 });
for (let k = 0; k < 4; k++) hitAt('contrast', 0.5 + k * 3.2, 'pyro');
hitAt('gauge', rel('gauge', 0, 1.2), 'pyro'); hitAt('gauge', rel('gauge', 3, 1.0), 'pyro'); at('gauge', L('gauge', 1).start + 0.2, 'ui_tick');
hitAt('react', 0.4, 'pyro'); hitAt('react', rel('react', 1, 0.9), 'hydro', 'vaporize'); hitAt('react', rel('react', 2, -1.2), 'hydro'); hitAt('react', rel('react', 2, 0.9), 'pyro', 'vaporize'); hitAt('react', rel('react', 3, -1.0), 'pyro'); hitAt('react', rel('react', 3, 1.0), 'electro', 'overloaded');
at('icd', L('icd', 0).start + 0.1, 'chime', { gain: 0.6 });
for (let k = 0; k < 7; k++) { const a = S('icd') + rel('icd', 2, 0.4) + k * 0.32; at('icd', a, 'whoosh', { gain: 0.3 }); at('icd', a + 0.35, k % 3 === 0 ? 'ignite' : 'ui_tick', { gain: k % 3 === 0 ? 0.8 : 0.4 }); }
SC.impl.lines.forEach(l => at('impl', l.start, 'ui_tick'));
for (const [lt, el, r] of [[0.3, 'pyro'], [0.6, 'pyro'], [0.9, 'hydro'], [2.0, 'hydro', 'vaporize'], [3.0, 'electro', 'overloaded'], [4.2, 'electro', 'ec'], [6.0, 'pyro', 'vaporize'], [7.2, 'hydro'], [7.6, 'hydro', 'vaporize']]) hitAt('demo', lt, el, r);
at('compare', S('compare') + 0.1, 'fire_loop', { dur: E('compare') - S('compare') - 0.3, gain: 0.5 });
at('teaser', S('teaser') + 0.05, 'whoosh'); for (const o of [0.4, 2.7, 3.3, 5.0, 7.3]) at('teaser', S('teaser') + o, 'zap', { gain: 0.55 }); at('teaser', S('teaser') + 2.65, 'thunder', { gain: 0.45 });
for (let n = 0; n < 3; n++) at('outro', L('outro', 0).start + 1.6 + n * 0.45, 'ui_tick');
at('outro', L('outro', 0).start + 3.2, 'chime');
writeFileSync('sfx_cues.json', JSON.stringify(cues, null, 1)); console.log(cues.length, 'cues');
