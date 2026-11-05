"""Teoria muzyki dla generatora promptów: nuty, gamy, akordy, progresje, szkielety melodii.

Czysta logika bez zależności. Używana przez gen_prompts.py (i później przez generator specyfikacji).
"""
import math
import re

LETTERS = "CDEFGAB"
NAT = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

SCALES = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
}
MODE_PL = {"major": "dur", "minor": "moll (naturalny)", "dorian": "dorycki",
           "mixolydian": "miksolidyjski", "lydian": "lidyjski"}
MINORISH = ("minor", "dorian")
PENT_DEG = {"major": [1, 2, 3, 5, 6], "mixolydian": [1, 2, 3, 5, 6], "lydian": [1, 2, 3, 5, 6],
            "minor": [1, 3, 4, 5, 7], "dorian": [1, 3, 4, 5, 7]}

# (półtony od podstawy, przesunięcie litery)
CHORD_Q = {
    "": [(0, 0), (4, 2), (7, 4)],
    "m": [(0, 0), (3, 2), (7, 4)],
    "7": [(0, 0), (4, 2), (7, 4), (10, 6)],
    "maj7": [(0, 0), (4, 2), (7, 4), (11, 6)],
    "m7": [(0, 0), (3, 2), (7, 4), (10, 6)],
    "maj9": [(0, 0), (4, 2), (7, 4), (11, 6), (14, 1)],
    "m9": [(0, 0), (3, 2), (7, 4), (10, 6), (14, 1)],
    "13": [(0, 0), (4, 2), (10, 6), (14, 1), (21, 5)],
    "13sus": [(0, 0), (5, 3), (10, 6), (14, 1), (21, 5)],
    "7sus": [(0, 0), (5, 3), (7, 4), (10, 6)],
    "7♭9": [(0, 0), (4, 2), (7, 4), (10, 6), (13, 1)],
    "m6": [(0, 0), (3, 2), (7, 4), (9, 5)],
    "6": [(0, 0), (4, 2), (7, 4), (9, 5)],
    "6/9": [(0, 0), (4, 2), (7, 4), (9, 5), (14, 1)],
    "maj7#11": [(0, 0), (4, 2), (7, 4), (11, 6), (18, 3)],
    "m7♭5": [(0, 0), (3, 2), (6, 4), (10, 6)],
}


def parse_root(s):
    letter = s[0]
    acc = 0
    for ch in s[1:]:
        if ch == "#":
            acc += 1
        elif ch in ("b", "♭"):
            acc -= 1
    return letter, acc


def acc_str(d):
    return {0: "", 1: "#", -1: "b", 2: "##", -2: "bb"}[d]


def spell(root_letter, root_pc, semis, loff):
    letter = LETTERS[(LETTERS.index(root_letter) + loff) % 7]
    target = (root_pc + semis) % 12
    d = (target - NAT[letter] + 6) % 12 - 6
    return letter + acc_str(d)


def root_pc(root):
    letter, acc = parse_root(root)
    return (NAT[letter] + acc) % 12


def scale_notes(root, mode):
    letter, acc = parse_root(root)
    pc = root_pc(root)
    return [spell(letter, pc, s, i) for i, s in enumerate(SCALES[mode])]


def note_name(root, mode, degree, tonic_oct=4):
    """Stopień (1-based, może być >7 lub <1) -> nazwa z oktawą, np. C4, F#5."""
    letter, _ = parse_root(root)
    pc = root_pc(root)
    idx = degree - 1
    k = idx % 7
    octs = idx // 7
    semis = SCALES[mode][k]
    midi = 12 * (tonic_oct + 1) + pc + 12 * octs + semis
    name = spell(letter, pc, semis, k)
    acc =(midi % 12 - NAT[name[0]] + 6) % 12 - 6
    nat = midi - acc
    return name + str(nat // 12 - 1), midi


def pent_names(root, mode):
    degs = PENT_DEG[mode]
    return [note_name(root, mode, d)[0][:-1] for d in degs]


def midi_to_name(m):
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return names[m % 12] + str(m // 12 - 1)


def chord_notes(sym):
    """'Cmaj9/E' -> (['C','E','G','B','D'], bas lub None)."""
    m = re.match(r"^([A-G][#b]?)(.*?)(?:/([A-G][#b]?))?$", sym)
    if not m:
        raise ValueError("akord: " + sym)
    root, q, bass = m.group(1), m.group(2), m.group(3)
    if q not in CHORD_Q:
        raise ValueError("jakość akordu: %r w %s" % (q, sym))
    letter, _ = parse_root(root)
    pc = root_pc(root)
    notes = [spell(letter, pc, s, l) for s, l in CHORD_Q[q]]
    return notes, bass


def default_tonic(root, mode):
    return root + ("m9" if mode in MINORISH else "maj9")


def parse_prog(text):
    """'Cmaj9 | Am9 | Dm9 | G13 (x2) | Em7 A7*2 | ...' -> lista akordów na takt (każdy element: lista akordów w takcie).

    Takt = tokeny rozdzielone '|'. 'X*n' = n taktów tego samego. '(xN)' na końcu tokenu powtarza grupę od ostatniego znacznika.
    """
    bars = []
    group_start = 0
    for tok in [t.strip() for t in text.split("|")]:
        if not tok:
            continue
        rep = 1
        m = re.search(r"\(x(\d+)\)\s*$", tok)
        if m:
            rep = int(m.group(1))
            tok = tok[: m.start()].strip()
        n = 1
        m2 = re.search(r"\*(\d+)\s*$", tok)
        if m2:
            n = int(m2.group(1))
            tok = tok[: m2.start()].strip()
        for _ in range(n):
            bars.append(tok.split())
        if m:
            grp = bars[group_start:]
            bars = bars[:group_start] + grp * rep
            group_start = len(bars)
    return bars


def section_lengths(n):
    if n >= 32:
        lens = [8, 8, 8, 8]
        r = n - 32
        while r > 0:
            lens.append(8 if r >= 8 else r)
            r -= 8
        return lens
    return {20: [8, 4, 4, 4], 24: [8, 8, 4, 4], 28: [8, 8, 4, 8]}[n]


SECTION_NAMES = ["A", "Aʹ", "B", "A″", "B′", "A‴", "B″", "A‵"]


def sections(n):
    out, b = [], 1
    for i, l in enumerate(section_lengths(n)):
        out.append((SECTION_NAMES[i], b, b + l - 1))
        b += l
    return out


# --- szkielety melodii: degree:czas_w_ćwierćnutach, r = pauza ---------------
SKEL_A = {
    "std": ["1:.5 2:.5 3:.5 5:1.5 r:1", "r:1 2:.5 3:.5 5:2", "5:1 4:.5 3:.5 4:1 3:1", "2:1.5 3:.5 2:2",
            "2:.5 3:.5 4:.5 6:1.5 r:1", "r:1 3:.5 4:.5 6:2", "7:1 6:.5 5:.5 3:1 5:1", "5:1.5 3:.5 2:1 1:1"],
    "pas": ["1:1 2:1 3:1 5:1", "5:3 r:1", "6:1 5:1 3:1 2:1", "3:3 r:1",
            "2:1 3:1 4:1 6:1", "6:3 r:1", "5:1 3:1 2:1 3:1", "1:4"],
    "syn": ["r:.5 1:.5 2:.5 3:.5 5:1.5 r:.5", "r:1.5 3:.5 5:.5 6:1 r:.5", "5:.5 r:.5 5:.5 3:1 2:.5 r:1",
            "3:1.5 1:.5 2:1 r:1", "r:.5 2:.5 3:.5 4:.5 6:1.5 r:.5", "r:1.5 4:.5 6:.5 7:1 r:.5",
            "6:.5 r:.5 5:.5 4:1 3:.5 r:1", "2:1.5 3:.5 1:2"],
    "hop": ["1:.5 2:.5 3:.5 5:1.5 r:1", "5:.5 r:.5 8:.5 r:.5 5:.5 r:.5 8:.5 r:.5",
            "6:.5 r:.5 9:.5 r:.5 6:.5 r:.5 5:.5 r:.5", "3:1 4:1 2:2",
            "2:.5 3:.5 4:.5 6:1.5 r:1", "6:.5 r:.5 8:.5 r:.5 6:.5 r:.5 8:.5 r:.5",
            "7:.5 r:.5 6:.5 r:.5 5:.5 r:.5 3:.5 r:.5", "5:1 3:1 1:2"],
    "stc": ["1:.5 2:.5 3:.5 5:1.5 r:1", "5:.5 3:.5 2:.5 3:.5 5:.5 3:.5 2:.5 r:.5",
            "3:.5 4:.5 5:.5 6:.5 5:.5 4:.5 3:.5 r:.5", "2:.5 3:.5 2:.5 1:.5 2:2",
            "2:.5 3:.5 4:.5 6:1.5 r:1", "6:.5 5:.5 4:.5 5:.5 6:.5 5:.5 4:.5 r:.5",
            "3:.5 5:.5 7:.5 5:.5 6:.5 4:.5 2:.5 r:.5", "5:1 3:1 1:2"],
    "bal": ["1:.5 2:.5 3:.5 5:2.5", "r:2 3:1 2:1", "1:1.5 2:.5 3:2", "r:1 5:1 3:1 2:1",
            "2:.5 3:.5 4:.5 6:2.5", "r:2 5:1 4:1", "3:1.5 4:.5 5:2", "r:1 3:1 2:1 1:1"],
    "wlz": ["1:.5 2:.5 3:.5 5:1.5", "r:1 3:.5 5:.5 6:1", "5:1 4:.5 3:.5 4:1", "2:1.5 3:.5 2:1",
            "2:.5 3:.5 4:.5 6:1.5", "r:1 4:.5 6:.5 7:1", "6:1 5:.5 4:.5 3:1", "2:1 1:2"],
}
SKEL_B = {
    "std": ["5:1 6:1 8:1 6:1", "5:3 r:1", "6:1 8:1 9:1 8:1", "6:3 r:1", "8:.5 7:.5 6:.5 5:.5 6:2",
            "5:.5 6:.5 5:.5 3:.5 5:2", "4:1 3:1 2:1 3:1", "2:3 r:1"],
    "syn": ["r:.5 5:.5 6:.5 8:1.5 6:.5 r:.5", "5:.5 r:.5 6:.5 5:1 3:.5 r:1", "r:.5 6:.5 8:.5 9:1.5 8:.5 r:.5",
            "6:1 5:1 3:1 2:1", "r:.5 8:.5 7:.5 6:1.5 5:.5 r:.5", "r:.5 5:.5 6:.5 5:1.5 3:.5 r:.5",
            "4:1.5 3:.5 2:1 r:1", "2:3 r:1"],
    "pas": ["5:2 6:2", "8:3 r:1", "9:2 8:2", "6:3 r:1", "5:2 6:2", "5:3 r:1", "4:2 3:2", "2:3 r:1"],
    "wlz": ["5:1 6:1 8:1", "8:2 r:1", "9:1 8:1 6:1", "6:2 r:1", "8:.5 7:.5 6:.5 5:.5 6:1",
            "5:1 3:1 5:1", "4:1 3:1 2:1", "2:2 r:1"],
}
SIG = {4: ("r:2 2:.5 3:.5 5:1", "1:4"), 3: ("r:1 2:.5 3:.5 5:1", "1:3")}
SIG_INV = ["5:4", "3:4", "2:4", "1:4"]  # zjazd 5-3-2-1 po jednym na takt (B2)
BAR_BEATS = {4: 4.0, 3: 3.0}

DUR_NAMES = {0.5: "♪", 1.0: "♩", 1.5: "♩.", 2.0: "\U0001d15e", 3.0: "\U0001d15e.", 4.0: "\U0001d15d"}


def parse_skel(bar):
    out = []
    for tok in bar.split():
        d, t = tok.split(":")
        out.append((d, float(t)))
    return out


def check_skel(table, beats, label):
    for name, bars in table.items():
        for i, b in enumerate(bars):
            tot = sum(t for _, t in parse_skel(b))
            if abs(tot - beats[name] if isinstance(beats, dict) else tot - beats) > 1e-6:
                raise AssertionError("%s/%s takt %d: suma %.2f" % (label, name, i + 1, tot))


def render_bar(bar, root, mode, shift=0):
    parts = []
    for d, t in parse_skel(bar):
        if d == "r":
            parts.append("r·%s" % fmt_beats(t))
        else:
            parts.append("%s·%s" % (note_name(root, mode, int(d) + shift)[0], fmt_beats(t)))
    return " ".join(parts)


def fmt_beats(t):
    s = ("%g" % t)
    return s.replace("0.5", "½").replace(".5", "½") if t != 0.5 else "½"


def skel_range(bars, root, mode):
    ms = []
    for b in bars:
        for d, t in parse_skel(b):
            if d != "r":
                ms.append(note_name(root, mode, int(d))[1])
    return min(ms), max(ms)


def seconds(bars, bpm, beats):
    return bars * beats * 60.0 / bpm


def b2_bars(bpm_b2, beats):
    per = 240.0 if beats == 4 else 180.0
    n = math.ceil(95 * bpm_b2 / per)
    return int(math.ceil(n / 4.0) * 4)


# sanity: długości taktów szkieletów
for _n, _bars in SKEL_A.items():
    for _i, _b in enumerate(_bars):
        _t = sum(t for _, t in parse_skel(_b))
        _want = 3.0 if _n == "wlz" else 4.0
        assert abs(_t - _want) < 1e-6, ("A", _n, _i + 1, _t)
for _n, _bars in SKEL_B.items():
    for _i, _b in enumerate(_bars):
        _t = sum(t for _, t in parse_skel(_b))
        _want = 3.0 if _n == "wlz" else 4.0
        assert abs(_t - _want) < 1e-6, ("B", _n, _i + 1, _t)
