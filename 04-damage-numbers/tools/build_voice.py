#!/usr/bin/env python3
"""Cached MamboTTS narration -> build/voice.wav, build/timeline.json, timeline.js, bilingual SRT.

Run:  /Users/xiechuyu/code/vibe/test/MamboTTS/.venv-mac/bin/python tools/build_voice.py [--verify] [--only-timeline]
Per line synthesizes `say || zh`, caches by sha256 in build/tts/. Reads script.json (single source).
"""
from __future__ import annotations
import argparse, hashlib, json, re, shutil, subprocess, time, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "build" / "tts"
SR = 44100
VOICE, SPEED = "manbo", "1.12"
LEAD_IN, LINE_GAP, SCENE_GAP, TAIL = 0.6, 0.22, 0.9, 3.0
MAX_PAUSE = 0.22          # internal pauses longer than this are compressed to this
MAX_ZH = 18               # CJK chars per subtitle chunk
SIL_THR = 0.009           # abs amplitude considered silence (raw, pre-gain)
SRT_NAME = "跳字老虎机.srt"


def log(m): print(time.strftime("%H:%M:%S"), m, flush=True)


def load_audio(path: Path) -> np.ndarray:
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                       capture_output=True, check=True)
    a = np.frombuffer(r.stdout, dtype="<f4").copy()
    if len(a) < SR // 10 or not np.isfinite(a).all() or np.max(np.abs(a)) < 0.001:
        raise RuntimeError(f"empty/invalid narration: {path}")
    return a


def synth(text: str) -> Path:
    key = hashlib.sha256(f"{VOICE}\n{SPEED}\n{text}".encode()).hexdigest()[:16]
    out = CACHE / f"{key}.wav"
    if out.exists():
        return out
    req = CACHE / "requests" / f"{key}-{time.time_ns()}"
    req.mkdir(parents=True)
    cmd = ["mambo-mac", text, "--voice", VOICE, "--speed", SPEED, "--json", "-q", "-o", str(req / "audio.wav")]
    t0 = time.monotonic()
    log(f"SYNTH {key}: {text}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    (req / "stdout.txt").write_text(r.stdout, encoding="utf-8")
    (req / "stderr.txt").write_text(r.stderr, encoding="utf-8")
    if r.returncode:
        raise RuntimeError(f"mambo-mac failed for {text!r}: {r.stderr[-2000:]}")
    gen = Path(json.loads(r.stdout)["output"]).resolve()
    load_audio(gen)
    shutil.move(str(gen), str(out))
    (CACHE / f"{key}.json").write_text(json.dumps({"text": text, "voice": VOICE, "speed": SPEED}, ensure_ascii=False), encoding="utf-8")
    log(f"DONE {key} in {time.monotonic() - t0:.1f}s")
    return out


def prepare(audio: np.ndarray) -> np.ndarray:
    """Trim outer silence, compress internal pauses > MAX_PAUSE, normalise."""
    idx = np.flatnonzero(np.abs(audio) > SIL_THR)
    if len(idx):
        audio = audio[max(0, idx[0] - int(0.035 * SR)): min(len(audio), idx[-1] + int(0.13 * SR))]
    # silence detection on 10 ms windows (max-abs)
    w = int(0.010 * SR)
    n = len(audio) // w
    env = np.abs(audio[: n * w]).reshape(n, w).max(axis=1)
    quiet = env < SIL_THR
    keep_max = int(round(MAX_PAUSE / 0.010))
    out, i = [], 0
    while i < n:
        if not quiet[i]:
            j = i
            while j < n and not quiet[j]: j += 1
            out.append(audio[i * w: j * w]); i = j
        else:
            j = i
            while j < n and quiet[j]: j += 1
            run = j - i
            if run > keep_max:
                half = keep_max // 2
                seg = np.concatenate([audio[i * w:(i + half) * w], audio[(j - (keep_max - half)) * w: j * w]])
                f = int(0.006 * SR)       # tiny fades on the splice
                seg[half * w - f: half * w] *= np.linspace(1, 0, f, dtype=np.float32)
                seg[half * w: half * w + f] *= np.linspace(0, 1, f, dtype=np.float32)
                out.append(seg)
            else:
                out.append(audio[i * w: j * w])
            i = j
    out.append(audio[n * w:])
    audio = np.concatenate(out).astype(np.float32)
    rms = float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))
    peak = float(np.max(np.abs(audio)))
    audio *= min(0.14 / max(rms, 1e-9), 0.89 / max(peak, 1e-9))
    fd = min(int(0.004 * SR), len(audio) // 2)
    audio[:fd] *= np.linspace(0, 1, fd, dtype=np.float32)
    audio[-fd:] *= np.linspace(1, 0, fd, dtype=np.float32)
    return audio


# ---------------- subtitles ----------------
STRIP = "，。；、,.;"


def wlen(s: str) -> float:
    """display width: CJK = 1, latin/digits/space = 0.55"""
    return sum(1.0 if ord(c) > 0x2E80 else 0.55 for c in s)


def zh_chunks(text: str) -> list[str]:
    toks = re.findall(r"[^，。；！？：、]+[，。；！？：、]*|[，。；！？：、]+", text)
    chunks, cur = [], ""
    for t in toks:
        # keep 《book titles》 whole: break right before 《 instead of inside it
        if "《" in t and wlen(t) > MAX_ZH and t.index("《") > 0:
            i = t.index("《"); pre, t = t[:i], t[i:]
            if cur and wlen(cur) + wlen(pre) <= MAX_ZH: cur += pre
            else:
                if cur: chunks.append(cur)
                cur = pre
        while wlen(t) > MAX_ZH + 4 and "《" not in t:
            if cur: chunks.append(cur); cur = ""
            k = -(-len(t) // MAX_ZH); wd = -(-len(t) // k)
            chunks.append(t[:wd]); t = t[wd:]
        if wlen(cur) + wlen(t) <= MAX_ZH:
            cur += t
        else:
            if cur: chunks.append(cur)
            cur = t
    if cur: chunks.append(cur)
    # merge tiny trailing chunk into previous when possible
    while len(chunks) > 1 and len(chunks[-1]) <= 3 and len(chunks[-2]) + len(chunks[-1]) <= MAX_ZH + 2:
        chunks[-2] += chunks[-1]; chunks.pop()
    return [c.strip() for c in chunks if c.strip()]


def en_split(text: str, k: int, weights: list[float]) -> list[str]:
    words = text.split()
    if k <= 1 or len(words) <= 1: return [text] + [""] * (k - 1) if k > 1 else [text]
    k = min(k, len(words)) if len(words) < k else k
    cum, c = [], 0
    for w in words:
        c += len(w) + 1; cum.append(c)
    total = cum[-1]
    tot_w = sum(weights); acc = 0; cuts = []
    prev = 0
    for ci in range(k - 1):
        acc += weights[ci]
        target = total * acc / tot_w
        best, bs = None, 1e9
        for wi in range(prev, len(words) - (k - 1 - ci)):   # cut after word wi
            s = abs(cum[wi] - target)
            if re.search(r"[,.;:?!—-]$", words[wi]): s -= 7
            if s < bs: bs, best = s, wi
        cuts.append(best); prev = best + 1
    parts, s = [], 0
    for cidx in cuts + [len(words) - 1]:
        parts.append(" ".join(words[s:cidx + 1])); s = cidx + 1
    return parts


def clean_zh(c: str) -> str:
    return c.rstrip(STRIP).strip()


def srt_ts(x: float) -> str:
    ms = int(round(x * 1000)); h, m, s = ms // 3600000, ms // 60000 % 60, ms // 1000 % 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms % 1000:03d}"


def write_wav(path: Path, a: np.ndarray):
    pcm = (np.clip(a, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())


def verify(timeline: dict):
    try:
        import whisper  # noqa
    except Exception:
        try:
            import faster_whisper  # noqa
        except Exception:
            log("VERIFY skipped: no whisper / faster_whisper in this venv (none installed locally)")
            return
    log("VERIFY: whisper present but verification path not implemented for this model set; skipped")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args()
    for p in (CACHE, ROOT / "build", ROOT / "out", ROOT / "assets"): p.mkdir(parents=True, exist_ok=True)
    script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    scenes = script["scenes"]
    total = sum(len(s["lines"]) for s in scenes)
    cursor = round(LEAD_IN * SR)
    chunks = [np.zeros(cursor, np.float32)]
    t_scenes, subs, stats_lines = [], [], []
    n = 0
    for si, sc in enumerate(scenes):
        items = []
        scene_start = cursor / SR
        for li, ln in enumerate(sc["lines"]):
            n += 1
            tts_text = ln.get("say") or ln["zh"]
            log(f"PROGRESS {n}/{total} scene={sc['id']}")
            audio = prepare(load_audio(synth(tts_text)))
            start = cursor / SR
            chunks.append(audio); cursor += len(audio)
            end = cursor / SR
            item = {"zh": ln["zh"], "en": ln["en"], "start": round(start, 3), "end": round(end, 3)}
            if ln.get("rehook"): item["rehook"] = ln["rehook"]
            if ln.get("say"): item["say"] = ln["say"]
            items.append(item)
            stats_lines.append({"scene": sc["id"], "line": li, "chars": len(tts_text), "dur": round(end - start, 2),
                                "sec_per_char": round((end - start) / len(tts_text), 3)})
            zc = zh_chunks(ln["zh"])
            wts = [max(1, len(clean_zh(c))) for c in zc]
            ec = en_split(ln["en"], len(zc), wts)
            acc = 0.0
            for ci, (z, e, wt) in enumerate(zip(zc, ec, wts)):
                cs = start + (end - start) * acc / sum(wts); acc += wt
                ce = end if ci == len(zc) - 1 else start + (end - start) * acc / sum(wts)
                subs.append({"zh": clean_zh(z), "en": e, "start": round(cs, 3), "end": round(ce, 3)})
            if li < len(sc["lines"]) - 1:
                g = np.zeros(round(LINE_GAP * SR), np.float32); chunks.append(g); cursor += len(g)
        voice_end = cursor / SR
        g = np.zeros(round((TAIL if si == len(scenes) - 1 else SCENE_GAP) * SR), np.float32)
        chunks.append(g); cursor += len(g)
        t_scenes.append({"id": sc["id"], "kicker": sc.get("kicker"), "title": sc.get("title"),
                         "start": 0.0 if si == 0 else round(scene_start, 3), "voiceEnd": round(voice_end, 3),
                         "end": round(cursor / SR, 3), "lines": items})
    for i in range(len(t_scenes) - 1):               # scene end == next scene start
        t_scenes[i]["end"] = t_scenes[i + 1]["start"]
    voice = np.concatenate(chunks)
    timeline = {"duration": round(len(voice) / SR, 3), "scenes": t_scenes, "subs": subs}
    write_wav(ROOT / "build" / "voice.wav", voice)
    txt = json.dumps(timeline, ensure_ascii=False, indent=1)
    (ROOT / "build" / "timeline.json").write_text(txt + "\n", encoding="utf-8")
    (ROOT / "timeline.js").write_text("window.TIMELINE = " + txt + ";\n", encoding="utf-8")
    srt = "\n".join(f"{i + 1}\n{srt_ts(c['start'])} --> {srt_ts(c['end'])}\n{c['zh']}\n{c['en']}\n" for i, c in enumerate(subs))
    (ROOT / "out" / SRT_NAME).write_text(srt, encoding="utf-8")
    spc = np.array([s["sec_per_char"] for s in stats_lines]); med = float(np.median(spc))
    for s in stats_lines: s["anomaly"] = bool(abs(s["sec_per_char"] / med - 1) > 0.30)
    rep = {"duration": timeline["duration"], "lines": total, "subs": len(subs), "median_sec_per_char": round(med, 3),
           "scene_starts": {s["id"]: s["start"] for s in t_scenes}, "line_stats": stats_lines}
    (ROOT / "build" / "voice-validation.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"COMPLETE duration={timeline['duration']} lines={total} subs={len(subs)} median s/char={med:.3f}")
    for s in stats_lines:
        if s["anomaly"]: log(f"ANOMALY {s}")
    if args.verify: verify(timeline)


if __name__ == "__main__":
    main()
