import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const srv = await serve(process.cwd());
for (const [w, h, name] of [[1440, 1080, 'cover_4x3'], [1080, 1440, 'cover_3x4']]) {
  const b = await launch({ width: w, height: h });
  try { const p = await b.open(`http://127.0.0.1:${srv.port}/covers/cover.html?w=${w}&h=${h}`); if (p.logs.length) console.log(p.logs.join('\n'));
    writeFileSync(`out/${name}.jpg`, await p.screenshot(94)); console.log(name); } finally { b.kill(); }
}
srv.close();
