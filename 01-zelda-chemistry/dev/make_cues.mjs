// Derive SFX cues from the film's actual visual events (absolute seconds -> scene/line0/offset).
import { readFileSync, writeFileSync } from 'node:fs';
import { createSim } from '../src/sim.js';
const TL = JSON.parse(readFileSync('build/timeline.json', 'utf8'));
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i];
const rel = (id, i) => L(id, i).start - SC[id].start;
const cues = [];
const at = (id, abs, type, extra = {}) => cues.push({ scene: id, line: 0, offset: +(abs - L(id, 0).start).toFixed(3), type, ...extra });
const S = id => SC[id].start, E = id => SC[id].end;
// scene transitions: soft whoosh
for (const s of TL.scenes.slice(1)) at(s.id, s.start - 0.15, 'whoosh', { gain: 0.35 });
// hook: already burning, wind, glider
const FOOT = L('hook', 1).end + 0.3;
at('hook', 0.5, 'ignite'); at('hook', 0.6, 'fire_loop', { dur: 2.6 }); at('hook', 2.1, 'thunder', { gain: 0.5 });
at('hook', 3.2, 'whoosh'); at('hook', 3.4, 'glider', { dur: 2.6 }); at('hook', 5.9, 'steam', { gain: 0.5 });
at('hook', L('hook', 1).start + 0.05, 'chime', { gain: 0.7 });
at('hook', FOOT - 0.1, 'whoosh', { gain: 0.8 }); at('hook', FOOT, 'fire_loop', { dur: E('hook') - FOOT - 0.3 }); at('hook', FOOT, 'wind', { dur: E('hook') - FOOT - 0.3, gain: 0.5 });
at('hook', L('hook', 2).start + 0.2, 'whoosh', { gain: 0.6 });
// multiply: matrix lights
at('multiply', L('multiply', 1).start + 1.6, 'chime', { gain: 0.5 });
// rules
for (let i = 0; i < 3; i++) at('rules', L('rules', i).start + 0.25, 'ui_tick');
const rIgn = S('rules') + rel('rules', 2) + 1.0;
at('rules', rIgn, 'ignite'); at('rules', rIgn + 0.3, 'fire_loop', { dur: E('rules') - rIgn - 0.6, gain: 0.7 });
// data
at('data', L('data', 0).start + 0.2, 'ui_tick'); at('data', L('data', 1).start - 0.4, 'ui_tick');
// burn
at('burn', S('burn') + 1.2, 'ignite'); at('burn', S('burn') + 1.5, 'fire_loop', { dur: E('burn') - S('burn') - 1.9 });
at('burn', S('burn') + rel('burn', 2) + 1.2, 'wind', { dur: E('burn') - (S('burn') + rel('burn', 2) + 1.2) - 0.3, gain: 0.7 });
// rain (rain begins at l0 + 1.4 scene-local)
const rainAbs = L('rain', 0).start + 1.4;
at('rain', S('rain') + 0.05, 'fire_loop', { dur: rainAbs + 2.4 - S('rain') });
at('rain', L('rain', 0).start + 1.25, 'thunder'); at('rain', L('rain', 1).start + 2.6, 'thunder', { gain: 0.6 });
at('rain', rainAbs, 'rain', { dur: E('rain') - rainAbs - 0.2 }); at('rain', rainAbs + 0.6, 'steam');
// lift
at('lift', S('lift') + 0.05, 'fire_loop', { dur: E('lift') - S('lift') - 0.4 }); at('lift', S('lift') + 0.3, 'glider', { dur: E('lift') - S('lift') - 0.8 });
at('lift', L('lift', 2).start + 0.1, 'whoosh', { gain: 0.8 });
// iceshock: melt (fire near ice), then shock on wet channel
at('iceshock', S('iceshock') + 0.1, 'fire_loop', { dur: rel('iceshock', 1) - 0.4, gain: 0.7 });
at('iceshock', S('iceshock') + 4.0, 'steam');
const shockAbs = L('iceshock', 1).start + 0.6;
for (let k = 0; k < 4; k++) at('iceshock', shockAbs + k * 0.9, 'zap', { gain: k ? 0.6 : 1 });
// chain: real receiver power time from sim
{
  const s = createSim('lab'); s.schedule([{ t: 0.05, type: 'shock', on: true }, { t: 0.1, type: 'ignite', x: -1.1, z: 1.3, r: 0.5 }]);
  const pre = 0; s.seek(pre + (E('chain') - S('chain')));
  const pAt = s.receivers[0].poweredAt; const pAbs = S('chain') + (pAt - pre);
  console.log('chain receiver powers at sim', pAt, '→ abs', pAbs.toFixed(2), 'scene', S('chain'), '-', E('chain'));
  at('chain', S('chain') + 0.1, 'fire_loop', { dur: Math.max(1, pAbs - S('chain')), gain: 0.7 });
  at('chain', S('chain') + 0.2, 'zap', { gain: 0.5 });
  if (pAbs > S('chain') && pAbs < E('chain')) { at('chain', pAbs - 0.15, 'zap'); at('chain', pAbs, 'power_on'); }
  at('chain', L('chain', 1).start + 0.1, 'chime');
}
// build: tick per line
SC.build.lines.forEach(l => at('build', l.start, 'ui_tick'));
// teaser
at('teaser', L('teaser', 0).start + 2.2, 'whoosh'); at('teaser', L('teaser', 0).start + 2.4, 'fire_loop', { dur: E('teaser') - L('teaser', 0).start - 2.8 }); at('teaser', L('teaser', 0).start + 3.3, 'ui_tick');
// outro: three buttons + follow
for (let n = 0; n < 3; n++) at('outro', L('outro', 0).start + 1.6 + n * 0.45, 'ui_tick');
at('outro', L('outro', 0).start + 3.4, 'chime');
writeFileSync('sfx_cues.json', JSON.stringify(cues, null, 1));
console.log(cues.length, 'cues');
