"""Sekwencer (MT-03, PM-07): progresja i wzorce -> audio na warstwę.

Kontrakt: build(spec) -> {layer: ndarray (2, n) float32}   (tools/music/CONTRACT.md)

- Wszystkie warstwy mają tę samą długość: ciało utworu plus ogon (pogłos z fx). Zawinięcie
  ogona i zerowe przejście robi finish.py.
- Wzór (`layers[].pattern`) -> zdarzenia nutowe {t_beats, dur_beats, midi, vel, voice, layer}.
  Zaimplementowane: PATTERNS (wzory użyte w specs/*.json). Pozostałe zgłaszają NotImplementedError.
- Swing: nuty na ósemkowym offbeacie (ułamek 0,5 uderzenia) przesuwane o (swing/100 - 0,5).
- Humanizacja: z seed (osobny generator na warstwę), czas ±8 ms, poziom ±3 dB.
- fx: łańcuch `spec["fx"]` z `on` = all albo kod głosu tej warstwy; nakładany na warstwę przed `db`.
- Poza zakresem sekwencera (wpisane do SKIPPED, ostrzeżenie w render.py): `noise.loop(...)`
  (szumy renderuje tools/music/noise/) i pole `drums` (kick/snare/shaker nie są renderowane;
  BRSH i HAT grają warstwy wzorów `drums.brush_swing` / `drums.hat_swing`).
"""
import itertools
import math
import re

import numpy as np

import fx as FX
import theory as T
import voices as V

SR_DEFAULT = 44100
HUMAN_MS = 8.0
HUMAN_DB = 3.0
DEFAULT_REGISTER = ("C4", "G5")
SKIPPED = []  # (rola, powód) z ostatniego build()


def _pc(name):
    letter, acc = T.parse_root(name)
    return (T.NAT[letter] + acc) % 12


def _midi_of(name):
    """'F#4' -> 66."""
    m = re.match(r"^([A-G][#b]?)(-?\d+)$", name)
    if not m:
        raise ValueError("nazwa nuty: %r" % name)
    return 12 * (int(m.group(2)) + 1) + _pc(m.group(1))


def _parse_register(text):
    if not text:
        text = "%s-%s" % DEFAULT_REGISTER
    lo, hi = text.split("-")
    return _midi_of(lo), _midi_of(hi)


def _fold(midi, lo, hi):
    """Przesuwa o oktawy do zakresu [lo, hi]."""
    while midi < lo:
        midi += 12
    while midi > hi:
        midi -= 12
    return midi


def _voice_chord(notes, lo):
    """Akord w jednej oktawie od lo (lo..lo+11)."""
    return sorted(lo + ((_pc(n) - lo) % 12) for n in notes)


def _near(pc, target):
    """Nuta o klasie pc najbliższa target."""
    d = (pc - target) % 12
    if d > 6:
        d -= 12
    return target + d


def _chord_sym(chords, bar):
    sym = None
    for c in chords:
        if c["bar"] <= bar:
            sym = c["sym"]
    if sym is None:
        raise ValueError("brak akordu dla taktu %d" % bar)
    return sym


def _bars(ctx):
    return range(ctx["from_bar"], ctx["bars"] + 1)


def _pool(ctx):
    """Nuty pentatoniki w rejestrze warstwy, rosnąco."""
    lo, hi = _parse_register(ctx["register"])
    degs = T.PENT_DEG.get(ctx["mode"], T.PENT_DEG["major"])
    mids = {T.note_name(ctx["key"], ctx["mode"], d + 7 * k)[1]
            for d in degs for k in range(-2, 3)}
    pool = sorted(m for m in mids if lo <= m <= hi)
    if not pool:
        raise ValueError("pusta pentatonika w rejestrze %s" % ctx["register"])
    return pool


# --- wzory: każdy zwraca listę (t_beats, dur_beats, midi, vel) -----------------

def _p_chords_sustain(ctx, args):
    """PAD: jeden akord na takt, trzymany przez cały takt."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        notes, _ = T.chord_notes(_chord_sym(ctx["chords"], bar))
        for midi in _voice_chord(notes, 52):
            out.append(((bar - 1) * m, m, midi, 0.6))
    return out


def _p_chords_offbeat_2_4(ctx, args):
    """Stabby akordów na offbeatach 2 i 4 (w 4/4: 1,5 i 3,5 uderzenia; w 3/4: 1,5)."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        notes, _ = T.chord_notes(_chord_sym(ctx["chords"], bar))
        for b in range(1, m, 2):
            t = (bar - 1) * m + b + 0.5
            for midi in _voice_chord(notes, 60):
                out.append((t, 0.5, midi, 0.7))
    return out


def _p_bass_root_fifth(ctx, args):
    """Bas: korzeń na pierwszej połowie taktu, kwinta na drugiej."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        notes, bass = T.chord_notes(_chord_sym(ctx["chords"], bar))
        root = _fold(_near(_pc(bass or notes[0]), 46), 40, 52)
        t = (bar - 1) * m
        out.append((t, m / 2.0, root, 0.8))
        out.append((t + m / 2.0, m / 2.0, root + 7, 0.7))
    return out


def _p_melody_skeleton(ctx, args):
    """Melodia z szkieletu A/B (theory.SKEL_A / SKEL_B). Sekcje: T.sections dla 20, 24, 28 i >= 32 taktów;
    inaczej bloki po 8 taktów naprzemiennie A, B. Wariant: 'wlz' w 3/4, 'std' w 4/4."""
    m = ctx["meter"]
    lo, hi = _parse_register(ctx["register"])
    variant = "wlz" if m == 3 else "std"
    out = []
    for bar in _bars(ctx):
        letter, start = _skel_section(bar, ctx["bars"])
        table = T.SKEL_A if letter == "A" else T.SKEL_B
        skel = table[variant]
        cursor = (bar - 1) * m
        for d, dur in T.parse_skel(skel[(bar - start) % len(skel)]):
            if d != "r":
                midi = _fold(T.note_name(ctx["key"], ctx["mode"], int(d))[1], lo, hi)
                out.append((cursor, dur, midi, 0.75))
            cursor += dur
    return out


def _skel_section(bar, bars):
    """(litera A/B, pierwszy takt sekcji) dla takta `bar`."""
    if bars in (20, 24, 28) or bars >= 32:
        for name, b0, b1 in T.sections(bars):
            if b0 <= bar <= b1:
                return ("A" if name.startswith("A") else "B"), b0
    k = (bar - 1) // 8
    return ("AB"[k % 2]), k * 8 + 1


def _p_orn_every_n_bars(ctx, args):
    """Ozdobnik (krótka nuta z pentatoniki) co n taktów, na uderzeniu beat (1 = pierwsze)."""
    n, beat = int(args[0]), float(args[1])
    pool = _pool(ctx)
    out = []
    for bar in _bars(ctx):
        if (bar - 1) % n == 0:
            t = (bar - 1) * ctx["meter"] + (beat - 1)
            out.append((t, 0.5, pool[ctx["rng"].integers(len(pool))], 0.6))
    return out


def _p_random_pentatonic_walk(ctx, args):
    """Błądzenie po pentatonice na ósemkach; co czwarta ósemka to pauza z prawdopodobieństwem 0,25."""
    pool = _pool(ctx)
    rng = ctx["rng"]
    idx = len(pool) // 2
    out = []
    t0 = (ctx["from_bar"] - 1) * ctx["meter"]
    t1 = ctx["bars"] * ctx["meter"]
    t = t0
    while t < t1 - 1e-9:
        if rng.random() >= 0.25:
            idx = min(max(idx + int(rng.choice([-2, -1, -1, 1, 1, 2])), 0), len(pool) - 1)
            out.append((t, 0.5, pool[idx], 0.6))
        t += 0.5
    return out


def _walk_root(sym):
    """Korzeń akordu do chodzenia basem, w rejestrze 40-52, oraz tony akordu (lista nut)."""
    notes, bass = T.chord_notes(sym)
    return _fold(_near(_pc(bass or notes[0]), 46), 40, 52), notes


def _p_bass_walking(ctx, args):
    """Chodzący bas, jedna ćwierćnuta na uderzenie. 4/4: korzeń, tercja, kwinta, podejście półtonem
    od dołu do korzenia następnego taktu; 3/4: korzeń, kwinta, podejście. Ostatni takt
    podchodzi do korzenia pierwszego takt (pętla)."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        root, notes = _walk_root(_chord_sym(ctx["chords"], bar))
        nxt = bar + 1 if bar < ctx["bars"] else 1
        nxt_root, _ = _walk_root(_chord_sym(ctx["chords"], nxt))
        third = _fold(root + (_pc(notes[1]) - root) % 12, 40, 52) if len(notes) > 1 else root + 4
        fifth = _fold(root + 7, 40, 52)
        approach = nxt_root - 1  # 39-51: półton pod korzeniem następnego akordu
        if m == 4:
            tones = [root, third, fifth, approach]
        else:
            tones = [root, fifth, approach]
        t0 = (bar - 1) * m
        for i, midi in enumerate(tones):
            out.append((t0 + i, 1.0, midi, 0.8 if i == 0 else 0.7))
    return out


def _p_chords_arp8(ctx, args):
    """Arpeggio akordu w rejestrze C4-B4: ósemki (2 na uderzenie), tony akordu w górę, zapętlone.
    W 4/4 osiem ósemek na takt, w 3/4 sześć. Offbeaty ósemkowe podlegają swingowi."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        notes, _ = T.chord_notes(_chord_sym(ctx["chords"], bar))
        tones = _voice_chord(notes, 60)
        for i in range(2 * m):
            out.append(((bar - 1) * m + i * 0.5, 0.5, tones[i % len(tones)], 0.6))
    return out


def _p_drums_brush_swing(ctx, args):
    """BRSH (szczotka): akcent na parzystych uderzeniach (2, 4; w 3/4 tylko 2) i ghost na każdym
    offbeacie ósemkowym (swing). Wysokość ignorowana przez głos perkusyjny."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        for b in range(m):
            t0 = (bar - 1) * m + b
            if b % 2 == 1:
                out.append((t0, 0.5, 60, 0.7))
            out.append((t0 + 0.5, 0.5, 60, 0.35))
    return out


def _p_drums_hat_swing(ctx, args):
    """HAT: ósemki na całym takcie; na uderzeniach mocniej, na offbeatach ciszej (swing).
    Czas trwania 1/8 uderzenia: zamknięty hi-hat przy tempie powyżej ok. 63 BPM (dur_s < 0,12 s)."""
    m = ctx["meter"]
    out = []
    for bar in _bars(ctx):
        for b in range(m):
            t0 = (bar - 1) * m + b
            out.append((t0, 0.125, 60, 0.5))
            out.append((t0 + 0.5, 0.125, 60, 0.3))
    return out


def _p_chords_rolled(ctx, args):
    """Pełne akordy (4-5 głosów, korzeń nisko) z płynnym prowadzeniem głosów: góra akordu wybiera
    najbliższe wysokości względem poprzedniego akordu. Nuty lekko rozłożone w górę (roll),
    trzymane do końca taktu (PAD: release zlewa akordy)."""
    m = ctx["meter"]
    roll = 0.16
    out, prev = [], None
    for bar in _bars(ctx):
        notes, _ = T.chord_notes(_chord_sym(ctx["chords"], bar))
        root = _voice_chord(notes[:1], 41)[0]
        upper = [_pc(n) for n in notes[1:]][:4]
        if prev is None:
            tops = sorted(_voice_chord([notes[i] for i in range(1, len(notes))][:4], 60))
        else:
            best = None
            for perm in itertools.permutations(upper):
                cand = [_fold(_near(pc, p), 55, 79) for pc, p in zip(perm, prev)] if len(perm) == len(prev) else None
                if cand is None or len(set(cand)) < len(cand):
                    continue
                cost = sum(abs(c - p) for c, p in zip(cand, prev))
                if best is None or cost < best[0]:
                    best = (cost, cand)
            tops = sorted(best[1]) if best else sorted(_voice_chord([notes[i] for i in range(1, len(notes))][:4], 60))
        prev = tops
        for i, midi in enumerate([root] + tops):
            t = (bar - 1) * m + i * roll
            out.append((t, m - i * roll + 0.25, midi, 0.62 if i else 0.55))
    return out


PATTERNS = {
    "chords.rolled": _p_chords_rolled,
    "chords.sustain": _p_chords_sustain,
    "chords.offbeat_2_4": _p_chords_offbeat_2_4,
    "chords.arp8": _p_chords_arp8,
    "bass.root_fifth": _p_bass_root_fifth,
    "bass.walking": _p_bass_walking,
    "melody.skeleton": _p_melody_skeleton,
    "orn.every_n_bars": _p_orn_every_n_bars,
    "random.pentatonic_walk": _p_random_pentatonic_walk,
    "drums.brush_swing": _p_drums_brush_swing,
    "drums.hat_swing": _p_drums_hat_swing,
}


def _context(spec, layer, rng):
    return {
        "bars": spec["bars"], "meter": spec["meter"], "key": spec["key"], "mode": spec["mode"],
        "chords": spec["chords"], "swing": spec["swing"], "from_bar": layer.get("from_bar", 1),
        "register": layer.get("register"), "rng": rng,
    }


def _swing(events, swing):
    shift = swing / 100.0 - 0.5
    out = []
    for t, dur, midi, vel in events:
        if abs((t - math.floor(t)) - 0.5) < 1e-9:
            t += shift
        out.append((t, dur, midi, vel))
    return out


def layer_events(spec, layer, rng=None):
    """Zdarzenia warstwy po wzorze, ze swingiem (bez humanizacji). Kształt: zob. CONTRACT.md §3."""
    pattern = layer["pattern"]
    name, _, args = pattern.partition("(")
    args = [a.strip() for a in args.rstrip(")").split(",")] if args else []
    if name not in PATTERNS:
        raise NotImplementedError("wzór %r nie jest zaimplementowany w sekwencerze" % pattern)
    if rng is None:
        rng = np.random.default_rng(0)
    ctx = _context(spec, layer, rng)
    events = PATTERNS[name](ctx, args)
    return [dict(t_beats=t, dur_beats=d, midi=m, vel=v, voice=layer["voice"], layer=layer["role"])
            for t, d, m, v in _swing(events, spec["swing"])]


def _render_layer(spec, layer, events, rng, sr, body_len):
    spb = 60.0 / spec["bpm"]
    pieces = []
    for ev in events:
        dt = rng.uniform(-HUMAN_MS, HUMAN_MS) / 1000.0
        vel = min(ev["vel"] * 10.0 ** (rng.uniform(-HUMAN_DB, HUMAN_DB) / 20.0), 1.0)
        start = max(0, int(round((ev["t_beats"] * spb + dt) * sr)))
        audio = V.render(ev["voice"], ev["midi"], ev["dur_beats"] * spb, vel, sr, rng)
        pieces.append((start, audio))
    total = body_len
    for start, audio in pieces:
        total = max(total, start + audio.shape[1])
    buf = np.zeros((2, total), dtype=np.float64)
    for start, audio in pieces:
        buf[:, start:start + audio.shape[1]] += audio
    chain = [f for f in spec.get("fx", []) if f.get("on", "all") in ("all", layer["voice"])]
    if chain:
        buf = FX.apply(chain, buf, sr).astype(np.float64)
    return buf * 10.0 ** (layer["db"] / 20.0)


def build(spec):
    """Spec -> {rola: (2, n) float32}. Wszystkie tablice mają tę samą długość."""
    SKIPPED.clear()
    sr = SR_DEFAULT
    spb = 60.0 / spec["bpm"]
    body_len = int(round(spec["bars"] * spec["meter"] * spb * sr))
    out, seen = {}, set()
    for idx, layer in enumerate(spec["layers"]):
        role = layer["role"]
        if role in seen:
            raise ValueError("powtórzona rola warstwy: %s" % role)
        seen.add(role)
        if layer["pattern"].startswith("noise.loop"):
            SKIPPED.append((role, "noise.loop: szum renderowany poza sekwencerem"))
            continue
        rng = np.random.default_rng([abs(int(spec["seed"])), idx])
        events = layer_events(spec, layer, rng)
        out[role] = _render_layer(spec, layer, events, rng, sr, body_len)
    if spec.get("drums"):
        SKIPPED.append(("drums", "perkusja: brak siatki wzorców w kontrakcie"))
    total = max([a.shape[1] for a in out.values()] + [body_len])
    for role, a in out.items():
        if a.shape[1] < total:
            out[role] = np.concatenate([a, np.zeros((2, total - a.shape[1]))], axis=1)
        out[role] = out[role].astype(np.float32)
    return out
