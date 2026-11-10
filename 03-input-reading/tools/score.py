"""Scene-aware procedural score (numpy only, deterministic, original).

compose_score(n, dur, tl, plan) -> float32 stereo array (n, 2)

plan (music.json):
{
  "bpm": 112, "key": "dm",              # "dm" (wuxia minor) | "f" (bright major) | "dlyd" (D lydian adventure)
  "levels": {"hook": 3, "levels": 1, ...}  # 0 calm, 1 groove, 2 drive, 3 intense — per timeline scene id
  "hits": [["souls", 0.0], ...]          # optional extra impacts: [scene id, seconds after scene start]
}
Levels change only on bar lines (cuts land on the beat); a riser leads into every level increase and an impact
lands on the downbeat of every scene whose level is >= 2.
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
KEYS = {
    # (chord tones as midi, bass root midi) — 4-chord loops
    "dm":   [([50, 53, 57, 60, 62], 38), ([46, 50, 53, 57, 60], 34), ([48, 52, 55, 60, 64], 36), ([45, 48, 52, 57, 60], 33)],
    "f":    [([53, 57, 60, 64, 67], 41), ([48, 52, 55, 60, 62], 36), ([50, 53, 57, 60, 64], 38), ([46, 50, 53, 58, 62], 34)],
    "dlyd": [([50, 54, 57, 61, 64], 38), ([52, 56, 59, 64, 66], 40), ([54, 57, 59, 62, 66], 47), ([55, 59, 62, 66, 69], 43)],
}
# pentatonic lead scales (midi) per key
LEAD = {"dm": [62, 65, 67, 69, 72, 74, 77], "f": [65, 67, 69, 72, 74, 77, 79], "dlyd": [62, 64, 66, 69, 71, 74, 76]}


def _sos(kind, f, o): return butter(o, f, btype=kind, fs=SR, output="sos")
def lp(x, f, o=2): return sosfilt(_sos("low", f, o), x).astype(np.float32)
def hp(x, f, o=2): return sosfilt(_sos("high", f, o), x).astype(np.float32)
def bp(x, lo, hi, o=2): return sosfilt(_sos("band", [lo, hi], o), x).astype(np.float32)
def tarr(d): return np.arange(int(d * SR)) / SR
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)


def add(track, clip, sec, pan=0.0, gain=1.0):
    i = int(round(sec * SR))
    if i >= len(track) or len(clip) == 0: return
    if i < 0: clip = clip[-i:]; i = 0
    m = min(len(clip), len(track) - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    track[i:i + m, 0] += clip[:m] * l * gain * 1.414
    track[i:i + m, 1] += clip[:m] * r * gain * 1.414


# ---------------- instruments ----------------
def kick():
    t = tarr(0.5); f = 58 + 80 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 7) + 0.25 * np.exp(-t * 300) * np.sin(2 * np.pi * 1800 * t)
    return y.astype(np.float32)

def snare(rng):
    t = tarr(0.32)
    n = bp(rng.standard_normal(len(t)).astype(np.float32), 1500, 7000, 2) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 22)
    return (n * 0.9 + tone * 0.5).astype(np.float32)

def hat(rng, open_=False):
    t = tarr(0.25 if open_ else 0.06)
    return (hp(rng.standard_normal(len(t)).astype(np.float32), 7000, 2) * np.exp(-t * (14 if open_ else 70))).astype(np.float32)

def taiko(rng, pitch=1.0):
    t = tarr(0.9); f = (62 + 40 * np.exp(-t * 18)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    skin = lp(rng.standard_normal(len(t)).astype(np.float32), 900, 2) * np.exp(-t * 30)
    return (body + skin * 0.6).astype(np.float32)

def pluck(f, d=1.6, bright=1.0):
    t = tarr(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5) + 0.35 * bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9) \
        + 0.12 * bright * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 18)
    return (y * np.minimum(1, t / 0.004)).astype(np.float32)

def saw(f, t, n=12):
    y = np.zeros_like(t)
    for k in range(1, n + 1):
        if f * k > 9000: break
        y += np.sin(2 * np.pi * f * k * t) / k
    return y

def string_note(f, d, rng):
    t = tarr(d)
    y = sum(saw(f * (1 + det), t + rng.uniform(0, 0.01)) for det in (-0.004, 0.0, 0.004)) / 3
    env = np.minimum(1, t / 0.012) * np.exp(-t * 7)
    return lp((y * env).astype(np.float32), 2600, 2)

def brass(fs, d, rng):
    t = tarr(d)
    y = sum(saw(f * (1 + rng.uniform(-0.003, 0.003)), t, 10) for f in fs) / len(fs)
    env = np.minimum(1, t / 0.03) * np.exp(-t * 3.2)
    cut = 900 + 2600 * np.exp(-t * 6)
    out = np.zeros_like(y); seg = int(0.02 * SR)
    for i in range(0, len(y), seg):               # cheap time-varying low-pass
        out[i:i + seg] = y[i:i + seg]
    return lp((out * env).astype(np.float32), 2400, 2)

def bass_note(f, d, drive=0.0):
    t = tarr(d)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + drive * 0.25 * saw(f, t, 6)
    env = np.minimum(1, t / 0.01) * np.exp(-t * (3.5 if drive else 1.6))
    return lp((y * env).astype(np.float32), 900, 2)

def pad_chord(notes, d, rng):
    t = tarr(d); env = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, d - t) / 1.6)
    y = np.zeros_like(t)
    for m in notes:
        for det in (-0.0015, 0.0, 0.0015):
            y += np.sin(2 * np.pi * midi(m) * (1 + det) * t + rng.uniform(0, 6.28)) + 0.15 * np.sin(4 * np.pi * midi(m) * (1 + det) * t)
    return (y * env / (len(notes) * 3)).astype(np.float32)

def riser(d, rng):
    t = tarr(d); n = rng.standard_normal(len(t)).astype(np.float32)
    out = np.zeros_like(n); seg = int(0.05 * SR)
    for i in range(0, len(n), seg):
        k = i / len(n); out[i:i + seg] = bp(n[i:i + seg], 400 + 5000 * k ** 2, 900 + 7000 * k ** 2, 1)
    return (out * (t / d) ** 2.2 * 0.8).astype(np.float32)

def impact(rng):
    t = tarr(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(55 + 60 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.2)
    crash = hp(rng.standard_normal(len(t)).astype(np.float32), 3000, 2) * np.exp(-t * 2.8) * 0.35
    return (boom + crash).astype(np.float32)


# ---------------- arrangement ----------------
def compose_score(n, dur, tl, plan, seed=20261110):
    rng = np.random.default_rng(seed)
    bpm = plan.get("bpm", 100); beat = 60 / bpm; bar = beat * 4; s16 = beat / 4
    chords = KEYS[plan.get("key", "dm")]; lead = LEAD[plan.get("key", "dm")]
    levels = plan.get("levels", {})
    scenes = tl["scenes"]
    def scene_level(t):
        lv = 1
        for s in scenes:
            if t >= s["start"] - 0.05: lv = levels.get(s["id"], 1)
        return lv
    nbars = int(dur / bar) + 2
    bar_lv = [scene_level(b * bar + 0.01) for b in range(nbars)]
    # stems
    drums = np.zeros((n, 2), np.float32); low = np.zeros((n, 2), np.float32); mid = np.zeros((n, 2), np.float32); fx = np.zeros((n, 2), np.float32)
    K, SN = kick(), snare(rng)
    for b in range(nbars):
        t0 = b * bar; lv = bar_lv[b]
        if t0 >= dur: break
        notes, root = chords[(b // 2) % 4]
        # pad on every chord change (two bars per chord)
        if b % 2 == 0:
            add(mid, pad_chord(notes, 2 * bar + 1.5, rng), t0, 0, 0.55 if lv <= 1 else 0.4)
        for st in range(16):
            t = t0 + st * s16
            if t >= dur: break
            beatpos, on_beat = st // 4, st % 4 == 0
            # --- drums
            if lv >= 1 and on_beat and beatpos in (0, 2): add(drums, K, t, 0, 0.55 if lv == 1 else 0.85)
            if lv >= 2 and on_beat and beatpos in (1, 3): add(drums, SN, t, 0.05, 0.55 if lv == 2 else 0.7)
            if lv >= 2 and st in (14,) and b % 2 == 1: add(drums, K, t, 0, 0.6)
            if lv >= 1 and st % 2 == 0: add(drums, hat(rng, open_=(st == 14 and lv >= 2)), t + rng.normal(0, 0.003), 0.3 if st % 4 else -0.3, (0.12 if st % 4 else 0.18) * (0.6 if lv == 1 else 1))
            if lv >= 3 and st % 2 == 1: add(drums, hat(rng), t, -0.4, 0.08)
            if lv >= 3 and st in (0, 3, 6, 10, 12, 14): add(drums, taiko(rng, 1.0 if st in (0, 6, 12) else 1.35), t, -0.25 if st in (3, 10) else 0.25, 0.55)
            # --- bass
            if lv == 0 and st == 0: add(low, bass_note(midi(root), bar * 0.95), t, 0, 0.35)
            if lv == 1 and st in (0, 6, 8, 14): add(low, bass_note(midi(root), beat * 1.4), t, 0, 0.5)
            if lv >= 2 and st % 2 == 0: add(low, bass_note(midi(root + (7 if st in (6, 14) else 0)), s16 * 1.8, drive=1.0), t, 0, 0.55 if lv == 2 else 0.65)
            # --- arp / ostinato
            pat = [0, 2, 4, 2, 3, 2, 1, 2]
            if lv <= 1 and st % 2 == 0 and (st % 4 == 0 or rng.random() < (0.35 if lv == 0 else 0.7)):
                m = notes[pat[(st // 2) % 8]] + 12
                add(mid, pluck(midi(m), 1.4), t + rng.normal(0, 0.005), 0.35 if (st // 2) % 2 else -0.35, 0.16)
            if lv >= 2:
                m = notes[[0, 1, 2, 1, 3, 1, 2, 4][st % 8]] + (0 if lv == 2 else 12)
                add(mid, string_note(midi(m), s16 * 0.9, rng), t, -0.25 if st % 2 else 0.25, 0.13 if lv == 2 else 0.16)
            # --- brass stabs + pentatonic lead at max intensity
            if lv >= 3 and st in (0, 6) and b % 2 == 0: add(mid, brass([midi(x) for x in notes[:3]], beat * 1.2, rng), t, 0, 0.32)
            if lv >= 3 and st % 4 == 2 and rng.random() < 0.55:
                add(mid, pluck(midi(lead[int(rng.integers(0, len(lead)))]), 0.9, 1.6), t, 0.15, 0.12)
        # --- riser into a level increase, impact on scene downbeats
        if b + 1 < nbars and bar_lv[b + 1] > bar_lv[b] and bar_lv[b + 1] >= 2:
            add(fx, riser(bar, rng), t0, 0, 0.35)
    for s in scenes:
        if levels.get(s["id"], 1) >= 2:
            tb = round(s["start"] / bar) * bar
            add(fx, impact(rng), max(0.0, tb), 0, 0.55)
    for sid, off in plan.get("hits", []):
        st = next((s for s in scenes if s["id"] == sid), None)
        if st: add(fx, impact(rng), st["start"] + off, 0, 0.5)
    music = drums + low + mid + fx * 0.8
    # short room reverb on mid/fx only
    irn = int(1.6 * SR); irt = np.arange(irn) / SR
    ir = np.stack([rng.standard_normal(irn), rng.standard_normal(irn)], 1) * np.exp(-irt * 3.2)[:, None]
    ir = np.stack([lp(ir[:, c], 5000, 1) for c in range(2)], 1); ir /= np.sqrt(np.sum(ir ** 2))
    wet_src = mid + fx * 0.5
    wet = np.stack([fftconvolve(wet_src[:, c], ir[:, c])[:n] for c in range(2)], 1).astype(np.float32)
    music = music + wet * 0.3
    t = np.arange(n) / SR
    music *= (np.minimum(1, t / 0.6) * np.minimum(1, np.maximum(0, dur - t) / 2.5))[:, None]
    pk = np.max(np.abs(music)); music *= 0.5 / max(pk, 1e-9)
    return music.astype(np.float32)
