#!/usr/bin/env python3
"""Procedural BGM + SFX + sidechain-ducked mixes (all numpy, no samples, seeded/deterministic).

Run (after build_voice.py):
  /Users/xiechuyu/code/vibe/test/MamboTTS/.venv-mac/bin/python tools/build_audio.py
Inputs : build/voice.wav, build/timeline.json, sfx_cues.json (default generated if absent)
Outputs: build/mix_bgm.wav (voice+sfx+music), build/mix_nobgm.wav (voice+sfx),
         build/music.wav, build/sfx.wav, assets/audio-validation.json
sfx_cues.json: [{"scene":"burn","line":0,"offset":0.4,"type":"ignite","dur":3.0?,"gain":1.0?,"pan":0?}]
"""
from __future__ import annotations
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
SR = 44100
SEED = 20170303
TARGET_V2B = 19.5       # dB voice over bed (1-5 kHz, during speech); requirement >= 18


# ------------------------------------------------------------------ dsp helpers
def _sos(kind, f, order):
    return butter(order, f, btype=kind, fs=SR, output="sos")

def lp(x, f, o=2): return sosfilt(_sos("low", f, o), x).astype(np.float32)
def hp(x, f, o=2): return sosfilt(_sos("high", f, o), x).astype(np.float32)
def bp(x, lo, hi, o=2): return sosfilt(_sos("band", [lo, hi], o), x).astype(np.float32)

def tarr(dur): return np.arange(int(dur * SR), dtype=np.float64) / SR
def white(n, rng): return rng.standard_normal(n).astype(np.float32)

def pink(n, rng):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n); f[0] = f[1]
    y = np.fft.irfft(X / np.sqrt(f * n), n); return (y / np.std(y)).astype(np.float32)

def brown(n, rng):
    y = np.cumsum(rng.standard_normal(n)); y = hp(y.astype(np.float32), 20, 1)
    return (y / np.std(y)).astype(np.float32)

def ar(n, a, r):
    t = np.arange(n) / SR; d = n / SR
    return (np.minimum(1, t / max(a, 1e-3)) * np.minimum(1, np.maximum(0, d - t) / max(r, 1e-3))).astype(np.float32)

def smooth_noise(n, rng, hz):
    """slowly varying 0..1 control signal."""
    m = max(4, int(n / SR * hz * 4) + 4)
    pts = rng.random(m)
    return np.interp(np.linspace(0, m - 1, n), np.arange(m), pts).astype(np.float32)

def norm(x, peak=0.5):
    m = float(np.max(np.abs(x))); return (x * (peak / m)).astype(np.float32) if m > 1e-9 else x

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def bell(f, dur, decay=3.0, partials=((1, 1.0), (2.76, 0.25), (5.4, 0.08)), ph=0.0):
    t = tarr(dur); y = np.zeros_like(t)
    for k, a in partials:
        y += a * np.sin(2 * np.pi * f * k * t + ph) * np.exp(-t * decay * (1 + 0.6 * (k - 1)))
    return (y * np.minimum(1, t / 0.004)).astype(np.float32)


# ------------------------------------------------------------------ SFX generators (mono)
def g_fire_loop(rng, dur):
    n = int(dur * SR)
    roar = bp(pink(n, rng), 140, 900) * (0.25 + 0.5 * smooth_noise(n, rng, 1.2))
    imp = np.zeros(n, np.float32)
    rate = 28
    idx = rng.integers(0, n, int(dur * rate))
    imp[idx] = (rng.exponential(1.0, len(idx)) ** 1.5).astype(np.float32)
    pops = bp(imp, 1200, 4500, 2) * 1.6
    big = np.zeros(n, np.float32)
    bi = rng.integers(0, n, max(1, int(dur * 3))); big[bi] = rng.random(len(bi)).astype(np.float32) + 0.5
    pops += bp(big, 500, 2500, 2) * 2.0
    return norm((roar * 0.55 + pops * 0.55) * ar(n, 0.5, 0.8), 0.5)

def g_ignite(rng, dur=1.2):
    n = int(dur * SR); t = tarr(dur)
    low = bp(pink(n, rng), 200, 1200) * np.minimum(1, t / 0.08) * np.exp(-t * 2.5)       # whump
    hi = bp(white(n, rng), 1500, 5500) * np.minimum(1, t / 0.05) * np.exp(-t * 4.0) * 0.5
    sw = bp(white(n, rng), 300, 2000) * np.exp(-((t - 0.15) / 0.12) ** 2) * 0.8
    crack = np.zeros(n, np.float32); ii = rng.integers(int(0.05 * SR), int(0.9 * SR), 14)
    crack[ii] = rng.random(14).astype(np.float32); crack = bp(crack, 1500, 5000) * 4
    return norm(low + hi + sw + crack, 0.55)

def g_rain(rng, dur):
    n = int(dur * SR)
    bed = bp(pink(n, rng), 600, 9000, 2) * (0.7 + 0.3 * smooth_noise(n, rng, 0.6))
    drops = np.zeros(n, np.float32)
    for _ in range(int(dur * 45)):
        s = int(rng.integers(0, max(1, n - 800))); L = int(rng.integers(150, 600))
        tt = np.arange(L) / SR; f = rng.uniform(2200, 5500)
        drops[s:s + L] += (np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(250, 600)) * rng.uniform(0.1, 0.5)).astype(np.float32)
    return norm((bed * 0.5 + drops * 0.35) * ar(n, 1.0, 1.4), 0.5)

def g_thunder(rng, dur=4.8):
    n = int(dur * SR); t = tarr(dur)
    crack = lp(white(n, rng), 3500) * np.exp(-t * 14) * np.minimum(1, t / 0.004) * 0.9
    rum = lp(brown(n, rng), 160, 3) * (1 + 0.6 * np.sin(2 * np.pi * 1.7 * t + 2 * smooth_noise(n, rng, 2)))
    rum = rum * np.minimum(1, t / 0.25) * np.exp(-t * 0.9)
    mid = bp(pink(n, rng), 100, 500) * np.minimum(1, t / 0.4) * np.exp(-t * 1.6) * 0.5
    return norm(hp(crack + rum * 1.1 + mid, 60), 0.6)

def g_steam(rng, dur=1.5):
    n = int(dur * SR); t = tarr(dur)
    y = bp(white(n, rng), 2500, 7000, 2) * 0.6 + bp(white(n, rng), 900, 2500, 2) * 0.5
    y = lp(y, 4500, 1)
    y *= np.minimum(1, t / 0.12) * np.exp(-t * 2.0) * (0.8 + 0.2 * smooth_noise(n, rng, 8))
    return norm(y, 0.35)

def g_zap(rng, dur=0.7):
    n = int(dur * SR); y = np.zeros(n, np.float32)
    for st, ln in [(0.0, 0.05), (0.11, 0.035), (0.19, 0.06), (0.36, 0.04), (0.45, 0.07)]:
        s = int(st * SR); L = int(ln * SR); tt = np.arange(L) / SR
        f0 = rng.uniform(110, 170)
        saw = 2 * ((tt * f0) % 1) - 1
        b = (saw * 0.6 + bp(white(L, rng), 800, 5000) * 1.2 + np.sin(2 * np.pi * (3200 - 9000 * tt) * tt) * 0.4)
        y[s:s + L] += (b * np.exp(-tt * 40 / (ln * 20 + 0.001) ** 0.3) * np.minimum(1, tt / 0.002) * np.minimum(1, (ln - tt) / 0.006)).astype(np.float32)
    y += 0.15 * bp(white(n, rng), 1500, 5000) * np.exp(-tarr(dur) * 8)
    return norm(lp(y, 6500), 0.5)

def g_power_on(rng, dur=2.2):
    t = tarr(dur); n = len(t); sw_d = 0.65
    f = 180 * (4.0 ** np.clip(t / sw_d, 0, 1)); ph = 2 * np.pi * np.cumsum(f) / SR
    sw = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.minimum(1, t / 0.2) * (t < sw_d) * np.minimum(1, np.maximum(0, sw_d - t) / 0.05)
    y = sw * 0.6
    for k, (ff, off) in enumerate([(784.0, sw_d), (1174.7, sw_d + 0.08)]):
        s = int(off * SR); b = bell(ff, dur - off, 2.4)
        y[s:s + len(b)] += b[: n - s] * (0.7 if k == 0 else 0.55)
    return norm(y, 0.5)

def g_whoosh(rng, dur=1.2):
    n = int(dur * SR); t = tarr(dur); w = white(n, rng)
    bands = [((200, 700), 0.30, 0.22), ((600, 1800), 0.45, 0.20), ((1800, 5000), 0.60, 0.18), ((500, 1500), 0.85, 0.22)]
    y = np.zeros(n, np.float32)
    for (lo, hi), c, s in bands:
        y += bp(w, lo, hi) * np.exp(-((t - c * dur) / (s * dur)) ** 2).astype(np.float32)
    return norm(lp(y, 8000), 0.5) * ar(n, 0.05, 0.25)

def g_wind(rng, dur):
    n = int(dur * SR); t = tarr(dur)
    y = bp(pink(n, rng), 180, 1400, 2) * (0.25 + 0.75 * smooth_noise(n, rng, 0.5))
    whistle = bp(white(n, rng), 650, 950, 2) * (smooth_noise(n, rng, 0.4) ** 2) * 1.4
    return norm((y + whistle * 0.5) * ar(n, 1.4, 1.6), 0.4)

def g_chime(rng, dur=2.4):
    n = int(dur * SR); y = np.zeros(n, np.float32)
    for k, (m, off) in enumerate([(74, 0.0), (78, 0.16), (81, 0.32), (86, 0.50)]):
        s = int(off * SR); b = bell(midi(m), dur - off, 2.2) * (0.8 + 0.05 * k); y[s:s + len(b)] += b[: n - s]
    return norm(y, 0.5)

def g_ui_tick(rng, dur=0.12):
    t = tarr(dur); n = len(t)
    y = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90) + 0.4 * np.sin(2 * np.pi * 4200 * t) * np.exp(-t * 160)
    y += bp(white(n, rng), 2000, 6000) * np.exp(-t * 600) * 0.6
    return norm(y * np.minimum(1, t / 0.0015), 0.4)

def g_glider(rng, dur):
    n = int(dur * SR); t = tarr(dur)
    slow = 0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)
    flut = (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t + 3 * np.sin(2 * np.pi * 0.9 * t + 1.3) + 2 * smooth_noise(n, rng, 3))) ** 2
    cloth = bp(white(n, rng), 500, 3200, 2) * flut * (0.4 + 0.6 * slow)
    air = bp(pink(n, rng), 150, 900) * 0.5
    return norm((cloth * 0.7 + air * 0.5) * ar(n, 0.35, 0.7), 0.4)

# type -> (generator, needs_dur, default_dur, gain(rel), wide(stereo-decorrelated))
def g_tap(rng, dur=0.08):
    t = tarr(dur); n = len(t)
    y = bp(white(n, rng), 1200, 4000) * np.exp(-t * 120) * 0.7 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 80) * 0.4
    return norm(y, 0.3)

def g_hit(rng, dur=0.3):
    t = tarr(dur); n = len(t)
    f = 55 + 110 * np.exp(-t * 35); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)
    crack = bp(white(n, rng), 1500, 6000) * np.exp(-t * 90)
    y = body * 1.0 + crack * 0.55
    return norm(y * np.minimum(1, t / 0.001), 0.55)

def g_crit(rng, dur=0.9):
    t = tarr(dur); n = len(t)
    f = 48 + 140 * np.exp(-t * 30); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    crack = bp(white(n, rng), 1200, 7000) * np.exp(-t * 45)
    shing = sum(a * np.sin(2 * np.pi * fr * t + rng.uniform(0, 6)) * np.exp(-t * d) for fr, a, d in [(1870, 0.5, 6), (2790, 0.35, 7), (4120, 0.25, 9), (5650, 0.15, 12)])
    y = body * 1.1 + crack * 0.6 + shing * 0.45
    return norm(y * np.minimum(1, t / 0.001), 0.7)

def g_coin(rng, dur=0.18):
    t = tarr(dur)
    y = np.sin(2 * np.pi * 1568 * t) * np.exp(-t * 30) + 0.5 * np.sin(2 * np.pi * 3136 * t) * np.exp(-t * 45) + 0.2 * np.sin(2 * np.pi * 4704 * t) * np.exp(-t * 60)
    return norm(y * np.minimum(1, t / 0.001), 0.35)

def g_slam(rng, dur=1.6):
    t = tarr(dur); n = len(t)
    f = 40 + 90 * np.exp(-t * 14); boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    nz = lp(white(n, rng), 3000) * np.exp(-t * 6) * 0.5
    y = boom + nz + 0.4 * (bell(midi(79), dur, 2.5) + bell(midi(86), dur, 2.8) * 0.6)
    return norm(y, 0.75)

def g_glitch(rng, dur=0.8):
    t = tarr(dur); n = len(t); y = np.zeros(n, np.float32)
    for k in range(9):
        s = int(rng.uniform(0, dur - 0.08) * SR); L = int(rng.uniform(0.02, 0.08) * SR)
        f0 = rng.uniform(200, 1800); tt = np.arange(L) / SR
        sq = np.sign(np.sin(2 * np.pi * f0 * tt)) * 0.5 + white(L, rng) * 0.4
        y[s:s + L] += (np.round(sq * 4) / 4).astype(np.float32)
    return norm(lp(y, 9000) * np.exp(-t * 2), 0.5)

SFX = {
    "tap":       (g_tap, False, 0.08, 0.6, False),
    "hit":       (g_hit, False, 0.3, 0.8, False),
    "crit":      (g_crit, False, 0.9, 0.9, False),
    "coin":      (g_coin, False, 0.18, 0.55, False),
    "slam":      (g_slam, False, 1.6, 1.0, True),
    "glitch":    (g_glitch, False, 0.8, 0.8, True),
    "ignite":    (g_ignite, False, 1.2, 1.0, True),
    "fire_loop": (g_fire_loop, True, 6.0, 0.8, True),
    "rain":      (g_rain, True, 8.0, 0.7, True),
    "thunder":   (g_thunder, False, 4.8, 1.1, True),
    "steam":     (g_steam, False, 1.5, 0.9, True),
    "zap":       (g_zap, False, 0.7, 0.85, False),
    "power_on":  (g_power_on, False, 2.2, 0.9, False),
    "whoosh":    (g_whoosh, False, 1.2, 0.9, True),
    "wind":      (g_wind, True, 6.0, 0.7, True),
    "chime":     (g_chime, False, 2.4, 0.8, False),
    "ui_tick":   (g_ui_tick, False, 0.12, 0.6, False),
    "glider":    (g_glider, True, 3.0, 0.7, True),
}


def add_at(track, clip, sec, pan=0.0):
    off = max(0, int(round(sec * SR)))
    n = min(clip.shape[0], len(track) - off)
    if n <= 0: return
    if clip.ndim == 1:
        track[off:off + n, 0] += clip[:n] * np.sqrt((1 - pan) / 2)
        track[off:off + n, 1] += clip[:n] * np.sqrt((1 + pan) / 2)
    else:
        track[off:off + n] += clip[:n]


def default_cues(tl):
    sc = {s["id"]: s for s in tl["scenes"]}
    cues = []
    def span(sid, line=0): return max(2.0, sc[sid]["voiceEnd"] - sc[sid]["lines"][line]["start"])
    def has(s): return s in sc
    if has("hook"):
        cues += [dict(scene="hook", line=0, offset=0.15, type="ignite"),
                 dict(scene="hook", line=0, offset=0.6, type="fire_loop", dur=round(min(span("hook"), 9), 2)),
                 dict(scene="hook", line=0, offset=0.1, type="wind", dur=round(min(span("hook"), 9), 2)),
                 dict(scene="hook", line=0, offset=4.0, type="glider", dur=3.5)]
    if has("burn"):
        cues += [dict(scene="burn", line=0, offset=0.2, type="ignite"),
                 dict(scene="burn", line=1, offset=0.0, type="fire_loop", dur=round(min(span("burn", 1), 8), 2))]
    if has("rain"):
        cues += [dict(scene="rain", line=0, offset=0.1, type="thunder"),
                 dict(scene="rain", line=0, offset=0.6, type="rain", dur=round(min(span("rain"), 10), 2)),
                 dict(scene="rain", line=1, offset=0.5, type="steam")]
    if has("lift"):
        cues += [dict(scene="lift", line=0, offset=0.0, type="whoosh"),
                 dict(scene="lift", line=0, offset=0.5, type="glider", dur=4.0),
                 dict(scene="lift", line=0, offset=0.2, type="fire_loop", dur=round(min(span("lift"), 7), 2))]
    if has("iceshock"):
        cues += [dict(scene="iceshock", line=0, offset=0.3, type="steam"),
                 dict(scene="iceshock", line=1, offset=0.3, type="zap")]
    if has("chain"):
        cues += [dict(scene="chain", line=0, offset=0.3, type="zap"),
                 dict(scene="chain", line=0, offset=1.6, type="power_on"),
                 dict(scene="chain", line=1, offset=0.2, type="chime")]
    if has("build"):
        cues += [dict(scene="build", line=i, offset=0.0, type="ui_tick") for i in range(len(sc["build"]["lines"]))]
    if has("teaser"):
        cues += [dict(scene="teaser", line=0, offset=0.0, type="whoosh")]
    if has("outro"):
        cues += [dict(scene="outro", line=len(sc["outro"]["lines"]) - 1, offset=0.2, type="chime")]
    return cues


def load_cues(tl):
    p = ROOT / "sfx_cues.json"
    if p.exists():
        print("using", p); return json.loads(p.read_text(encoding="utf-8"))
    cues = default_cues(tl)
    p.write_text(json.dumps(cues, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("sfx_cues.json absent -> wrote default", p); return cues


def compose_sfx(n, tl, cues):
    sc = {s["id"]: s for s in tl["scenes"]}
    track = np.zeros((n, 2), np.float32); events = []
    for i, c in enumerate(cues):
        if c["type"] not in SFX: print("WARN unknown sfx type", c); continue
        if c["scene"] not in sc: print("WARN unknown scene", c); continue
        s = sc[c["scene"]]
        base = s["lines"][c["line"]]["start"] if c.get("line") is not None and c["line"] < len(s["lines"]) else s["start"]
        t0 = base + c.get("offset", 0.0)
        gen, needs_dur, ddur, g, wide = SFX[c["type"]]
        dur = float(c.get("dur") or (max(1.5, min(s["voiceEnd"] - t0, 12)) if needs_dur else ddur))
        rng = np.random.default_rng(SEED * 1000 + i)
        gain = g * float(c.get("gain", 1.0))
        if wide:
            L = gen(rng, dur) if needs_dur else gen(np.random.default_rng(SEED * 1000 + i), dur)
            R = gen(np.random.default_rng(SEED * 1000 + i + 500), dur)
            clip = np.stack([L, R], axis=1) * gain
            add_at(track, clip, t0)
        else:
            clip = gen(rng, dur)
            if c.get("pitch"):
                r = 2 ** (float(c["pitch"]) / 12); m = int(len(clip) / r)
                clip = np.interp(np.arange(m) * r, np.arange(len(clip)), clip).astype(np.float32)
            add_at(track, clip * gain, t0, pan=float(c.get("pan", 0.0)))
        events.append({"type": c["type"], "scene": c["scene"], "line": c.get("line"), "t": round(t0, 3), "dur": round(dur, 2)})
    return track, events


# ------------------------------------------------------------------ music
def pluck(f, dur=2.4):
    t = tarr(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5) + 0.12 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 18) \
        + 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 9)
    return (y * np.minimum(1, t / 0.004)).astype(np.float32)

def compose_music(n, dur):
    rng = np.random.default_rng(SEED)
    BPM = 90; beat = 60 / BPM; eighth = beat / 2; bar = beat * 4
    # D lydian: Dmaj7 | Eadd9 (the lydian II) | Bm7 | Gmaj9
    chords = [([50, 54, 57, 61, 64], 38), ([52, 56, 59, 64, 66], 40), ([54, 57, 59, 62, 66], 47), ([55, 59, 62, 66, 69], 43)]
    chord_len = 2 * bar
    pad = np.zeros((n, 2), np.float32); bass = np.zeros((n, 2), np.float32); arp = np.zeros((n, 2), np.float32)
    pats = [[0, 2, 4, 2, 3, 2, 1, 2], [0, 1, 2, 4, 3, 2, 1, 0], [4, 2, 3, 1, 2, 0, 1, 2], [0, 2, 3, 4, 3, 2, 3, 1]]
    nchords = int(dur / chord_len) + 2
    for ci in range(nchords):
        notes, root = chords[ci % 4]; t0 = ci * chord_len - 0.8
        L = chord_len + 3.2; t = tarr(L); env = ar(len(t), 1.8, 2.4)
        for k, m in enumerate(notes):
            f = midi(m); sig = np.zeros_like(t)
            for det in (-0.0012, 0.0, 0.0012):
                sig += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6.28)) + 0.18 * np.sin(2 * np.pi * 2 * f * (1 + det) * t + rng.uniform(0, 6.28))
            sig = (sig * env * (0.032 / 3) * (0.9 + 0.1 * np.sin(2 * np.pi * 0.09 * t + k))).astype(np.float32)
            add_at(pad, sig, max(0, t0) if t0 >= 0 else 0, pan=(k - 2) * 0.22) if t0 >= 0 else add_at(pad, sig[int(-t0 * SR):], 0, pan=(k - 2) * 0.22)
        # bass: root on beat 1 and 3 of each bar, soft
        for b in range(2):
            for half in (0, 2):
                tb = ci * chord_len + b * bar + half * beat
                bt = tarr(2.2); by = np.sin(2 * np.pi * midi(root) * bt) * np.exp(-bt * 1.7) * np.minimum(1, bt / 0.02)
                add_at(bass, (by * (0.05 if half == 0 else 0.03)).astype(np.float32), tb)
        # arpeggio (eighth notes), density follows the film's arc
        pat = pats[(ci // 1 + (ci // 4)) % len(pats)]
        for b in range(2):
            for e in range(8):
                tt = ci * chord_len + b * bar + e * eighth
                if tt >= dur: continue
                dens = 0.25 + 0.55 * np.clip((tt - 4) / 20, 0, 1)
                dens *= np.clip((dur - tt - 4) / 14, 0.25, 1)
                if (e % 4 == 0 and tt > 2) or rng.random() < dens:
                    m = notes[pat[e]] + 12 + (12 if (e == 7 and rng.random() < 0.3) else 0)
                    vel = rng.uniform(0.6, 1.0) * (1.0 if e % 4 == 0 else 0.8)
                    add_at(arp, pluck(midi(m)) * 0.11 * vel, tt + rng.normal(0, 0.006), pan=0.35 * (1 if (e + b) % 2 else -1))
    # dotted-eighth echo on arp
    echo = arp.copy()
    d = int(0.5 * SR)
    for k, a in enumerate((0.38, 0.15, 0.06), 1):
        sh = np.zeros_like(arp); sh[d * k:] = arp[:-d * k][:, ::-1] if d * k < n else 0
        echo += lp(sh, 3200, 1) * a
    music = pad + bass + echo
    # light algorithmic reverb
    irn = int(1.9 * SR); irt = np.arange(irn) / SR
    ir = np.stack([white(irn, rng), white(irn, rng)], 1) * np.exp(-irt * 2.6)[:, None]
    ir = lp(ir.T, 4500, 1).T; ir /= np.sqrt(np.sum(ir ** 2))
    wet = np.stack([fftconvolve(music[:, c], ir[:, c])[:n] for c in range(2)], 1).astype(np.float32)
    music = music * 0.8 + wet * 0.35
    t = np.arange(n) / SR
    music *= (np.minimum(1, t / 2.5) * np.minimum(1, np.maximum(0, dur - t) / 3.5))[:, None] ** 1.5
    return music.astype(np.float32)


# ------------------------------------------------------------------ mixing
def speech_mask(voice):
    f = 441; m = len(voice) // f
    rms = np.sqrt(np.mean(voice[: m * f].reshape(m, f).astype(np.float64) ** 2, axis=1))
    return rms > 0.012

def duck_curve(voice, active, depth):
    f = 441
    prot = np.zeros(len(active), np.float32)
    for i in range(len(active)):
        prot[i] = 1.0 if active[i] else (prot[i - 1] * 0.965 if i else 0.0)
    for k in (1, 2, 3, 4):                                  # look-ahead 40 ms: duck before speech starts
        prot[:-k] = np.maximum(prot[:-k], prot[k:])
    g = 1 - (1 - depth) * prot
    return np.interp(np.arange(len(voice)) / f, np.arange(len(g)), g).astype(np.float32)

def band_rms(x, mask_samples):
    y = bp(x, 1000, 5000, 4)
    return float(np.sqrt(np.mean(y[mask_samples].astype(np.float64) ** 2)))

def bed_filter(bed):
    out = np.zeros_like(bed)
    s_hp, s_lp = _sos("high", 60, 4), _sos("low", 12000, 4)
    for c in range(2): out[:, c] = sosfilt(s_lp, sosfilt(s_hp, bed[:, c]))
    return out

def write_wav16(path, a):
    a = np.clip(a, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(a.shape[1] if a.ndim > 1 else 1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((a * 32767).astype("<i2").tobytes())

def ff_json(args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", *args], capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0))

def loudnorm(src: Path, dst: Path):
    I, TP, LRA = -15, -1.5, 11
    m = ff_json([str(src), "-af", f"loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"])
    flt = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
           f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", flt, "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)], check=True)
    return ff_json([str(dst), "-af", f"loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"])

def read_wav(p):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True)
    a = np.frombuffer(r.stdout, "<f4").copy(); return a.reshape(-1, 2) if len(a) % 2 == 0 and "mix" in str(p) else a


def main():
    tl = json.loads((BUILD / "timeline.json").read_text(encoding="utf-8"))
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(BUILD / "voice.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True)
    voice = np.frombuffer(r.stdout, "<f4").copy(); n = len(voice); dur = n / SR
    if abs(dur - tl["duration"]) > 0.01: raise SystemExit(f"voice {dur} != timeline {tl['duration']}")
    print(f"duration {dur:.2f}s; composing music ...", flush=True)
    plan_p = ROOT / "music.json"
    plan = json.loads(plan_p.read_text(encoding="utf-8")) if plan_p.exists() else None
    if plan:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from score import compose_score
        music = compose_score(n, dur, tl, plan)
    else:
        music = compose_music(n, dur)
    cues = load_cues(tl)
    sfx, events = compose_sfx(n, tl, cues)
    active = speech_mask(voice)
    fr = 441
    msk = np.repeat(active, fr)[:n]; msk = np.pad(msk, (0, n - len(msk)))
    d_music = duck_curve(voice, active, 0.32)           # ~ -10 dB under speech
    d_sfx = duck_curve(voice, active, 0.5)              # ~ -6 dB
    fade = (np.minimum(1, np.arange(n) / SR / 1.0) * np.minimum(1, np.maximum(0, dur - np.arange(n) / SR) / 2.0))[:, None].astype(np.float32)
    if plan:
        # spectral ducking: carve only the speech band (0.9-5.5 kHz) hard, keep lows/drums mostly intact
        from scipy.signal import sosfiltfilt
        sb = _sos("band", [900, 5500], 2)
        band = np.stack([sosfiltfilt(sb, music[:, c]) for c in range(2)], 1).astype(np.float32)
        rest = music - band
        g_band = duck_curve(voice, active, 0.12)       # ~ -18 dB in the speech band while talking
        g_rest = duck_curve(voice, active, 0.6)        # ~ -4.4 dB broadband while talking
        music_b = bed_filter(rest * g_rest[:, None] + band * g_band[:, None]) * fade
    else:
        music_b = bed_filter(music * d_music[:, None]) * fade
    sfx_b = bed_filter(sfx * d_sfx[:, None]) * fade
    vref = band_rms(voice, msk)

    def v2b(bed):  # dB voice over bed, 1-5 kHz, speech frames
        b = np.sqrt((band_rms(bed[:, 0], msk) ** 2 + band_rms(bed[:, 1], msk) ** 2) / 2)
        return 20 * np.log10(vref / max(b, 1e-12))

    # calibrate: total bed (music+sfx) lands at TARGET_V2B above... per mix
    results = {}
    mixes = {}
    for name, use_music in (("bgm", True), ("nobgm", False)):
        bed0 = music_b * 0.0 + sfx_b if not use_music else music_b + sfx_b
        if use_music:
            k_music = 10 ** ((v2b(music_b) - (TARGET_V2B + (0.6 if plan else 1.0))) / 20)       # music alone sits at target+~1 dB (speech band)
            k_sfx = 10 ** ((v2b(sfx_b) - (TARGET_V2B + 2.0)) / 20)           # sfx average at target+2 dB (events add on top)
            # presence vs clarity: also keep the music at least BROADBAND_MIN dB under the voice (whole spectrum)
            def bb(x):
                vr = np.sqrt(np.mean(voice[msk].astype(np.float64) ** 2)); br = np.sqrt(np.mean(x[msk].astype(np.float64) ** 2))
                return 20 * np.log10(vr / max(br, 1e-12))
            BROADBAND_MIN = 10.0
            if bb(music_b * k_music) < BROADBAND_MIN: k_music *= 10 ** ((bb(music_b * k_music) - BROADBAND_MIN) / 20)
            bed = music_b * k_music + sfx_b * k_sfx
        else:
            k_music = 0.0
            k_sfx = 10 ** ((v2b(sfx_b) - (TARGET_V2B + 1.0)) / 20)
            bed = sfx_b * k_sfx
        # final trim so combined bed is exactly the target (>= 18 required)
        trim = 10 ** ((v2b(bed) - TARGET_V2B) / 20); bed = bed * trim
        mix = voice[:, None] + bed
        pk = float(np.max(np.abs(mix)))
        if pk > 0.89: mix *= 0.89 / pk; bed_scale = 0.89 / pk
        else: bed_scale = 1.0
        mixes[name] = (mix.astype(np.float32), bed, voice, k_music * trim * bed_scale, k_sfx * trim * bed_scale)
    write_wav16(BUILD / "music.wav", music_b)
    write_wav16(BUILD / "sfx.wav", np.clip(sfx_b, -1, 1))
    val = {"duration": round(dur, 3), "sampleRate": SR, "target": {"I": -15, "TP": -1.5, "LRA": 11, "voiceToBedDb_min": 18},
           "music": {"method": ("scene-aware numpy score " + json.dumps(plan, ensure_ascii=False)) if plan else "numpy synthesis (pads/plucks/bass, D lydian, 90 BPM)", "seed": SEED, "externalSamples": False},
           "sfxEvents": events, "mixes": {}}
    ok_all = True
    for name, (mix, bed, v, km, ks) in mixes.items():
        tmp = BUILD / f"_pre_{name}.wav"; out = BUILD / f"mix_{name}.wav"
        write_wav16(tmp, mix)
        ln = loudnorm(tmp, out); tmp.unlink()
        final = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(out), "-f", "f32le", "-"], capture_output=True, check=True).stdout, "<f4").reshape(-1, 2)
        g = float(np.max(np.abs(final))) / max(float(np.max(np.abs(mix))), 1e-9)
        vb = v2b(bed)
        low = float(np.sqrt(np.mean(lp(bed[:, 0], 40, 4).astype(np.float64) ** 2)) / max(np.sqrt(np.mean(bed[:, 0].astype(np.float64) ** 2)), 1e-12))
        silent = np.sqrt(np.mean(final[: (len(final) // fr) * fr].reshape(-1, fr, 2).astype(np.float64) ** 2, axis=(1, 2))) < 1e-5
        longest = cur = 0
        for s in silent: cur = cur + 1 if s else 0; longest = max(longest, cur)
        lufs, tp = float(ln["input_i"]), float(ln["input_tp"])
        checks = {"voiceToBed>=18": vb >= 18.0, "LUFS within +-1 of -15": abs(lufs + 15) <= 1.0, "TP<=-1.4": tp <= -1.4,
                  "no clipping": int(np.count_nonzero(np.abs(final) >= 1.0)) == 0, "no near-silence >0.5s": (name == "nobgm") or longest * fr / SR < 0.5}
        ok = all(checks.values()); ok_all &= ok
        val["mixes"][name] = {"file": f"build/mix_{name}.wav", "voiceToBedDb_1to5kHz_during_speech": round(vb, 2),
                              "voiceToBedDb_broadband_during_speech": round(20 * np.log10(np.sqrt(np.mean(voice[msk] ** 2)) / np.sqrt(np.mean(bed[msk] ** 2) / 2 * 2 / 2)), 2),
                              "bedEnergyBelow40HzFraction": round(low, 4), "integratedLUFS": round(lufs, 2),
                              "truePeakDBTP": round(tp, 2), "LRA": round(float(ln["input_lra"]), 2),
                              "samplePeak": round(float(np.max(np.abs(final))), 4),
                              "longestNearSilenceSec": round(longest * fr / SR, 2), "checks": {k: bool(v_) for k, v_ in checks.items()},
                              "pass": bool(ok), "bedFilters": "highpass 60 Hz, lowpass 12 kHz, sidechain duck (music -10 dB, sfx -6 dB)"}
        print(name, json.dumps(val["mixes"][name], ensure_ascii=False), flush=True)
    val["pass"] = bool(ok_all)
    (ROOT / "assets").mkdir(exist_ok=True)
    (ROOT / "assets" / "audio-validation.json").write_text(json.dumps(val, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("PASS" if ok_all else "FAIL")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
