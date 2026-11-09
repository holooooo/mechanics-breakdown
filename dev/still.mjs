// dev stills: node dev/still.mjs 3,30,60 [page]
import { launch } from '../tools_ref/cdp.mjs';
import { serve } from '../tools_ref/serve.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const ts = (process.argv[2] || '3').split(',').map(Number);
const page = process.argv[3] || 'film.html';
mkdirSync('build/dev', { recursive: true });
const srv = await serve(process.cwd());
const b = await launch();
try {
  const p = await b.open(`http://127.0.0.1:${srv.port}/${page}?render`);
  if (p.logs.length) console.log(p.logs.join('\n').slice(0, 3000));
  for (const t of ts) {
    const t0 = Date.now();
    await p.evaluate(`renderFrame(${t})`);
    writeFileSync(`build/dev/t${String(t).padStart(5, '0')}.jpg`, await p.screenshot(88));
    console.log('t', t, Date.now() - t0, 'ms');
  }
  if (p.logs.length) console.log(p.logs.join('\n').slice(0, 3000));
} finally { b.kill(); srv.close(); }
