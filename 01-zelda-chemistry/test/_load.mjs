// package.json 没有 "type":"module"，Node 会把 src/sim.js 当 CommonJS；这里用 data: URL 按 ESM 加载（sim.js 无相对依赖）。
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
export const sim = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
