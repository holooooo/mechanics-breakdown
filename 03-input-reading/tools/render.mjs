// Frame-exact render of film.html?render -> ffmpeg (or stills), headless Chrome (Metal GPU).
// usage:
//   node tools/render.mjs --stills 3,30.5,60            -> build/stills/tXXX.X.jpg
//   node tools/render.mjs [--from 0 --to 30] [--workers 3] [--out build/video.mp4] [--page film.html]
// The page must expose window.renderFrame(t) (sync or Promise), window.DURATION and set window.READY = true.
import { launch } from './cdp.mjs';
import { serve } from './serve.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = 30, WORKERS = Math.max(1, +arg('workers', 3)), stills = arg('stills', null), page_ = arg('page', 'film.html');
const Q = +arg('quality', 92);
mkdirSync(path.join(ROOT, 'build/stills'), { recursive: true });
const srv = await serve(ROOT);
const url = `http://127.0.0.1:${srv.port}/${page_}?render`;
const b = await launch({ width: 1920, height: 1080 });
const grab = async (p, t) => { await p.evaluate(`window.renderFrame(${t})`); return p.screenshot(Q); };
const fmt = s => s >= 60 ? `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.round(s)}s`;
const flush = p => { if (p.logs.length) { console.log('[page]\n' + p.logs.splice(0).join('\n')); } };
try {
  if (stills) {
    const p = await b.open(url);
    flush(p);
    for (const t of stills.split(',').map(Number)) {
      const out = path.join(ROOT, 'build/stills', `t${t.toFixed(1).padStart(6, '0')}.jpg`);
      writeFileSync(out, await grab(p, t)); console.log(out);
    }
    flush(p);
  } else {
    const pages = await Promise.all(Array.from({ length: WORKERS }, () => b.open(url)));
    pages.forEach(flush);
    const dur = await pages[0].evaluate('window.DURATION');
    if (!(dur > 0)) throw new Error('window.DURATION missing');
    const f0 = Math.round(+arg('from', 0) * FPS), f1 = Math.min(Math.ceil(dur * FPS), Math.round(+arg('to', 1e9) * FPS));
    const out = path.resolve(arg('out', path.join(ROOT, 'build/video.mp4')));
    mkdirSync(path.dirname(out), { recursive: true });
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt709:out_color_matrix=bt709:flags=bicubic,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS), '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = new Promise(r => ff.on('close', r));
    const total = f1 - f0, t0 = Date.now();
    console.log(`rendering ${total} frames (${f0}..${f1}) of ${dur.toFixed(2)}s @ ${FPS}fps with ${WORKERS} workers -> ${out}`);
    // workers pull frame indices; the writer emits strictly in order with a bounded lead.
    let next = f0, written = f0; const done = new Map(); let waiters = []; let failure = null;
    const wakeAll = () => { const w = waiters; waiters = []; w.forEach(r => r()); };
    const LEAD = WORKERS * 4;
    const worker = async p => {
      while (!failure) {
        if (next >= f1) return;
        if (next - written >= LEAD) { await new Promise(r => waiters.push(r)); continue; }
        const f = next++;
        try { done.set(f, await grab(p, f / FPS)); } catch (e) { failure = e; wakeAll(); return; }
        wakeAll();
      }
    };
    const workers = pages.map(worker);
    let lastLog = 0;
    while (written < f1 && !failure) {
      if (!done.has(written)) { await new Promise(r => setTimeout(r, 2)); continue; }
      const img = done.get(written); done.delete(written);
      if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
      written++;
      wakeAll();
      const now = Date.now();
      if (now - lastLog > 5000 || written === f1) {
        lastLog = now; const el = (now - t0) / 1000, d = written - f0;
        console.log(`frame ${written}/${f1}  ${(100 * d / total).toFixed(1)}%  ${(d / el).toFixed(1)} fps  elapsed ${fmt(el)}  eta ${fmt(el / Math.max(d, 1) * (f1 - written))}`);
        pages.forEach(flush);
      }
    }
    if (failure) { ff.stdin.destroy(); throw failure; }
    await Promise.all(workers);
    ff.stdin.end(); await ffDone;
    console.log('done', out, fmt((Date.now() - t0) / 1000));
  }
} finally { b.kill(); srv.close(); }
