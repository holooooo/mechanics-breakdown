// SFX cues for episode 3 from the same duel schedules film.js uses.
import { readFileSync, writeFileSync } from 'node:fs';
const TL = JSON.parse(readFileSync('build/timeline.json', 'utf8'));
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i]; const rel = (id, i, o = 0) => L(id, i).start - SC[id].start + o;
const cues = []; const at = (id, abs, type, extra = {}) => cues.push({ scene: id, line: 0, offset: +(abs - L(id, 0).start).toFixed(3), type, ...extra });
const S = id => SC[id].start, E = id => SC[id].end;
const FOOT = L('hook', 2).end + 0.3;
for (const s of TL.scenes.slice(1)) at(s.id, s.start - 0.15, 'whoosh', { gain: 0.3 });
// hook footage: sword clashes
for (const o of [0.3, 1.4, 2.4, 3.3, 4.6, 5.8, 6.9, 8.4, 9.5, 10.6]) at('hook', o, 'zap', { gain: 0.45 });
at('hook', 2.3, 'thunder', { gain: 0.4 }); at('hook', L('hook', 2).start + 0.05, 'chime', { gain: 0.7 }); at('hook', FOOT - 0.1, 'whoosh', { gain: 0.8 });
// slash swings in duel scenes: whoosh on active frames
const swings = (id, list) => list.forEach(([s, k]) => { const lag = 2 / 60, st = (k === 'quick' ? 9 : 22) / 60; if (k === 'heal') { at(id, S(id) + s + 0.1, 'steam', { gain: 0.35 }); at(id, S(id) + s + 0.25, 'zap', { gain: 0.5 }); } else at(id, S(id) + s + lag + st, 'whoosh', { gain: 0.55 }); });
const loopActs = (from, to, every, kind = 'slash', off = 0.6) => { const a = []; for (let s = from + off; s < to - 1.0; s += every) a.push([s, kind]); return a; };
swings('hook', loopActs(FOOT, E('hook') - S('hook') + 2, 1.6).filter(a => S('hook') + a[0] < E('hook')));
SC.levels.lines.forEach((l, li) => { const a0 = rel('levels', li); swings('levels', loopActs(a0, a0 + 6, 2.2, 'slash', 0.5).filter(a => S('levels') + a[0] < (SC.levels.lines[li + 1]?.start ?? E('levels'))).filter(a => S('levels') + a[0] >= l.start - 0.2)); at('levels', l.start + 0.2, 'ui_tick'); });
swings('arcade', loopActs(0, E('arcade') - S('arcade'), 1.9, 'quick', 0.4));
swings('souls', [[rel('souls', 1, 2.6), 'heal'], [rel('souls', 2, 1.0), 'heal'], [rel('souls', 3, 0.6), 'heal']]);
for (const o of [0.4, 1.5, 2.6, 3.8, 4.8]) at('souls', S('souls') + o, 'zap', { gain: 0.45 });
at('mantis', L('mantis', 0).start + 0.2, 'chime'); for (let i = 0; i < 4; i++) at('mantis', L('mantis', 1).start + 0.6 + i * 0.35, 'ui_tick');
at('mantis', L('mantis', 1).start + 2.0, 'wind', { dur: 2.4, gain: 0.5 }); at('mantis', L('mantis', 2).start + 1.2, 'power_on');
for (const o of [0.3, 1.2, 2.2, 3.5, 4.4, 5.6, 6.8, 7.9, 9.0]) at('pb0', S('pb0') + o, 'zap', { gain: 0.45 });
at('pb0', L('pb0', 0).start + 0.05, 'chime', { gain: 0.6 });
swings('pb0', loopActs(rel('pb0', 3) - 0.3, E('pb0') - S('pb0'), 1.9, 'slash', 0.3));
swings('impl', [[rel('impl', 1, 1.0), 'slash'], [rel('impl', 1, 3.4), 'slash'], [rel('impl', 2, 0.6), 'slash'], [rel('impl', 2, 2.9), 'quick'], [rel('impl', 3, 0.5), 'quick']]);
SC.impl.lines.forEach(l => at('impl', l.start, 'ui_tick'));
const third = (E('demo') - S('demo')) / 3; for (let k = 0; k < 3; k++) { at('demo', S('demo') + k * third, 'ui_tick'); swings('demo', [[k * third + 0.5, 'quick'], [k * third + 1.6, 'slash']]); }
for (let n = 0; n < 3; n++) at('outro', L('outro', 0).start + 1.6 + n * 0.45, 'ui_tick');
at('outro', L('outro', 0).start + 3.0, 'chime');
writeFileSync('sfx_cues.json', JSON.stringify(cues, null, 1)); console.log(cues.length, 'cues');
