#!/usr/bin/env python3
"""Unikalne progresje i brzmienia dla każdego utworu (MW-9), progresje z gotowców z internetu.

Źródło harmonii: SHLD Free MIDI Chord Packs (Ludovic Drolez, licencja MIT,
https://github.com/ldrolez/free-midi-chords), 194 progresje w zapisie stopniowym wyciągnięte do
`tools/music/ready_progs.json` (nasz kod nie wykonuje niczyjego kodu; plik to dane). Każdy utwór składa
sekcje A, B (C dla długich) po 8 taktów z różnych gotowych progresji, transponowanych do tonacji utworu
(sekcje B/C mogą grać w tonacji równoległej względnej). Gotowe stopnie są ubarwiane słownikiem akordów
legendy v7 (maj9#11, m11, 13sus4, 7alt ...), a ich tempo zmian (dwa takty na akord itd.) dopasowane do formy.
Unikalność: ta sama gotowa progresja jest użyta najwyżej kilka razy w bibliotece, a żadna para utworów nie
ma tej samej sekwencji (limit powtórzonych taktów, po tonalice).
Brzmienie: instrument z puli serii + wzór + łańcuch efektów z parametrami z ziarna utworu; odcisk
(instrument, wzór, efekty) jest unikalny w całej bibliotece.

Zakres: płyty (96), pokoje (10), belki i miejsca (9), minigry (4 gry + menu; stemy i `_full` jednej gry mają
wspólną harmonię z założenia). Pozostają: motyw, jingle (już unikalne), szumy (bez harmonii), pliki zewnętrzne.

Użycie:
  python3 tools/music/unique_progs.py --apply    # przepisuje chords/layers/fx w specyfikacjach (deterministycznie)
  python3 tools/music/unique_progs.py --table    # zapisuje docs/music_progressions_unique.md
  python3 tools/music/unique_progs.py --check    # sprawdza unikalność i parsowanie akordów
"""
import glob
import json
import math
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen_records_mw67 as GR  # noqa: E402
import legend_progs as LP  # noqa: E402
import theory as T  # noqa: E402

SPECS = os.path.join(HERE, "specs")
ROOT = os.path.dirname(os.path.dirname(HERE))
RE_SYM = re.compile(r"^([A-G][#b]?)(.*?)(?:/([A-G][#b]?))?$")


# pule instrumentów serii płyt (nastrój serii) i wzory grane przez instrument
POOLS = {
    1: ["EP", "BNJ", "BOX", "HARP", "ACC", "CEL", "XYL", "PIZ"],
    2: ["HARP", "CEL", "PAD", "BELL", "GLK", "XYL", "EP", "BOX"],
    3: ["PAD", "CEL", "BOX", "EP", "HARP", "BELL", "TRI", "ACC"],
    4: ["P25", "P12", "EP", "ACC", "TRI", "XYL", "PAD", "BNJ"],
}
PATTERNS = {
    "EP": ["chords.rolled(0.2)", "chords.arp8", "chords.rolled(0.3)"], "PAD": ["chords.rolled(0.35)", "chords.rolled(0.4)"],
    "BOX": ["chords.rolled(0.3)", "chords.arp8"], "BNJ": ["chords.arp8"], "ACC": ["chords.rolled(0.2)", "chords.rolled(0.3)"],
    "HARP": ["chords.rolled(0.25)", "chords.rolled(0.35)"], "CEL": ["chords.rolled(0.3)", "chords.arp8"],
    "P25": ["chords.rolled(0.15)", "chords.arp8"], "XYL": ["chords.arp8", "chords.rolled(0.2)"], "PIZ": ["chords.arp8"],
    "BELL": ["chords.rolled(0.3)", "chords.rolled(0.4)"], "P12": ["chords.arp8"], "TRI": ["chords.rolled(0.25)", "chords.rolled(0.35)"],
    "GLK": ["chords.arp8", "chords.rolled(0.3)"],
}


def _flat(tonic):
    return tonic in LP.FLAT_KEYS or tonic[-1:] == "b"


def parse(sym):
    m = RE_SYM.match(sym)
    return (T.root_pc(m.group(1)), m.group(2), T.root_pc(m.group(3)) if m.group(3) else None)


FLATISH = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def names_for(tonic):
    """Pisownia pierwiastków: tonacje E, A, B, F#, C# krzyżykowe; pozostałe z bemolami (Db, Eb, Ab, Bb)."""
    return LP.SHARP if T.root_pc(tonic) in (1, 4, 6, 9, 11) else (LP.FLAT if _flat(tonic) else FLATISH)


def fmt(bar, tonic):
    names = names_for(tonic)
    root, q, bass = bar
    return names[root % 12] + q + (("/" + names[bass % 12]) if bass is not None else "")


def full_progression(unit, bars):
    out = [unit[i % len(unit)] for i in range(bars)]
    if bars % len(unit):
        out[-1] = unit[7]  # zamknięcie pętli: zwrot z końca pierwszej sekcji
    return out


def rel_sig(prog, tonic_pc):
    return [((r - tonic_pc) % 12, q, None if b is None else (b - tonic_pc) % 12) for r, q, b in prog]


def smooth_ok(prog):
    steps = [min((prog[i + 1][0] - prog[i][0]) % 12, (prog[i][0] - prog[i + 1][0]) % 12) for i in range(len(prog) - 1)]
    if not steps or sum(steps) / len(steps) > 5.2:
        return False
    for i in range(len(prog) - 2):
        if prog[i] == prog[i + 1] == prog[i + 2]:
            return False
    return True


def distinct(sig, others, limit):
    for o in others:
        n = min(len(sig), len(o))
        same = sum(1 for k in range(n) if sig[k] == o[k])
        if same > max(2, limit * n):
            return False
    return True

# ---- gotowe progresje (ready_progs.json) ----
READY = json.load(open(os.path.join(HERE, "ready_progs.json"), encoding="utf-8"))["progs"]
MAJ_SCALE = [0, 2, 4, 5, 7, 9, 11]
MIN_SCALE = [0, 2, 3, 5, 7, 8, 10]
DEGREE = {"I": 0, "II": 1, "III": 2, "IV": 3, "V": 4, "VI": 5, "VII": 6}
RE_TOK = re.compile(r"^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*?)(?:/([b#]?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)))?$")

CHILL = {"Nostalgic", "Hopeful", "Romantic", "Tender", "Peaceful", "Relaxed", "Spiritual", "Mysterious", "Lonely", "Sad"}
SERIES_TAGS = {1: {"Nostalgic", "Hopeful", "Relaxed", "Tender", "Peaceful"},
               2: {"Romantic", "Hopeful", "Tender", "Mysterious", "Nostalgic"},
               3: {"Mysterious", "Spiritual", "Peaceful", "Lonely", "Tender"},
               4: {"Nostalgic", "Sad", "Lonely", "Romantic", "Relaxed"}}
GAME_TAGS = CHILL | {"Joyful", "Playful", "Triumphant", "Excited", "Surprised"}


def scale_of(p):
    """'min' dla progresji w skali molowej (numeracja od toniki molowej), inaczej 'maj'."""
    if p["mode"] == "min":
        return "min"
    if p["mode"] == "modal":
        m = RE_TOK.match(p["nums"][0])
        if m and not m.group(1) and m.group(2) == "i":
            return "min"
    return "maj"


for _p_ in READY:
    _p_["scale"] = scale_of(_p_)
MAJ_IDX = [i for i, p in enumerate(READY) if p["scale"] == "maj"]
MIN_IDX = [i for i, p in enumerate(READY) if p["scale"] == "min"]


def pick(rng, xs):
    return xs[rng.randrange(len(xs))]


def token_chord(tok, scale, rng, prev):
    """Token stopniowy -> (przesunięcie w półtonach od toniki skali, jakość legendy v7, bas lub None).
    prev = poprzedni akord (nie powtarzamy tej samej jakości na tym samym stopniu)."""
    m = RE_TOK.match(tok)
    if not m:
        raise SystemExit("nieznany token: " + tok)
    acc, num, suf, bass = m.groups()
    sc = MAJ_SCALE if scale == "maj" else MIN_SCALE
    off = (sc[DEGREE[num.upper()]] + {"b": -1, "#": 1, "": 0}[acc]) % 12
    upper = num.isupper()
    s = suf
    if s.startswith("dim"):
        opts = ["dim7"]
    elif s in ("sus4",):
        opts = ["13sus4", "9sus4"] if off == 7 else ["sus4"]
    elif s == "sus2":
        opts = ["sus2"]
    elif s == "madd9":
        opts = ["madd9"]
    elif s == "add9":
        opts = ["add9", "maj9"]
    elif s in ("69", "6") and upper:
        opts = ["6/9"]
    elif s in ("m6", "6"):
        opts = ["m6"] if not upper else ["6/9"]
    elif s in ("7", "dom7", "9") and upper:
        opts = ["13", "7b13", "9", "7alt"] if off == 7 else ["9", "13"]
    elif s in ("M7", "maj7"):
        opts = ["maj9", "maj7#11", "maj13"]
    elif s in ("m7", "m9", "7") and not upper or (s in ("m7", "m9") and upper):
        opts = ["m9", "m11", "m7"]
    elif upper or s.startswith("M"):
        # trójdźwięk durowy: kolor zależy od funkcji stopnia
        if off == 0 and scale == "maj":
            opts = ["maj9", "maj13", "maj9#11"]
        elif off == 5 and scale == "maj":
            opts = ["maj9#11", "maj13#11"]
        elif off == 7:
            opts = ["13", "9sus4", "13sus4"] if scale == "maj" else ["7b13", "7alt", "13"]
        elif scale == "maj" and off in (2, 4, 9):
            opts = ["13", "7b13", "7alt"]
        elif off in (3, 8):
            opts = ["maj9#11", "maj9"]
        elif off == 10:
            opts = ["maj9", "13"]
        elif scale == "min" and off == 0:
            opts = ["maj9"]
        elif scale == "min" and off == 5:
            opts = ["13", "9"]
        else:
            opts = ["maj7#11", "maj9"]
    else:
        opts = ["m11", "m9"] if off in (0, 5) else ["m9", "m11"]
    if prev is not None and prev[0] == off and len(opts) > 1:
        opts = [q for q in opts if q != prev[1]] or opts
    q = pick(rng, opts)
    b = None
    if bass:
        mb = RE_TOK.match(bass)
        b = (sc[DEGREE[mb.group(2).upper()]] + {"b": -1, "#": 1, "": 0}[mb.group(1)]) % 12
    return off, q, b


def section_from(idx, base_pc, rng, scale):
    """8 taktów z gotowej progresji: akordy rozłożone na 8 taktów (po 1-3 takty), 4-akordowe czasem grane dwa razy po 1 takcie."""
    toks = READY[idx]["nums"][:8]
    n = len(toks)
    if n <= 4 and 8 % n == 0 and rng.random() < 0.35:
        seq = [(t, 1) for t in toks] * (8 // n)
    else:
        seq = [(t, 8 // n + (1 if i < 8 % n else 0)) for i, t in enumerate(toks)]
    bars, prev = [], None
    for tok, dur in seq:
        off, q, b = token_chord(tok, scale, rng, prev)
        prev = (off, q)
        for _ in range(dur):
            bars.append(((base_pc + off) % 12, q, None if b is None else (base_pc + b) % 12))
    return bars[:8]


def label(idx, rel):
    return "-".join(READY[idx]["nums"][:8]) + ("(wzgl.)" if rel else "")


def build_unit(tonic_pc, mode, n_sec, rng, usage, cap, prefs):
    minor = mode in ("minor", "dorian", "phrygian", "aeolian")
    home = MIN_IDX if minor else MAJ_IDX
    other = MAJ_IDX if minor else MIN_IDX
    unit, parts, used = [], [], []
    for s in range(n_sec):
        rel = s > 0 and rng.random() < 0.45
        pool = [i for i in (other if rel else home) if i not in used and usage.get(i, 0) < cap]
        good = [i for i in pool if prefs & set(READY[i]["tags"])]
        pool = good or pool
        if not pool:
            return None, None, None
        idx = pick(rng, pool)
        used.append(idx)
        scale = READY[idx]["scale"]
        base = tonic_pc
        if rel:
            base = (tonic_pc - 3) % 12 if minor is False else (tonic_pc + 3) % 12
        unit += section_from(idx, base, rng, scale)
        parts.append(label(idx, rel))
    return unit, " + ".join(parts), used


def make_progression(key, tonic, mode, bars, accepted, usage, prefs, limit=0.3125):
    n_sec = 1 if bars <= 8 else (3 if bars >= 40 else 2)
    tpc = T.root_pc(tonic)
    for attempt in range(8000):
        rng = random.Random("ready|%s|%d" % (key, attempt))
        cap = 2 + attempt // 2000
        unit, tag, used = build_unit(tpc, mode, n_sec, rng, usage, cap, prefs if attempt < 4000 else GAME_TAGS)
        if unit is None:
            continue
        prog = full_progression(unit, bars)
        if not smooth_ok(prog):
            continue
        sig = rel_sig(prog, tpc)
        lim = limit if attempt < 4000 else limit + 0.12
        if distinct(sig, accepted, lim):
            accepted.append(sig)
            for i in used:
                usage[i] = usage.get(i, 0) + 1
            return [fmt(b, tonic) for b in prog], tag
    raise SystemExit("brak unikalnej progresji dla " + key)


# ---- brzmienie ----
def _num(s):
    return float(s)


def jitter_chain(chain, rng, amp=1.0):
    out = []
    for f in chain:
        f = dict(f)
        name = f["fx"]
        if name.startswith("REV") and "wet" in f:
            f["wet"] = round(min(0.5, max(0.05, f["wet"] + rng.uniform(-0.05, 0.07) * amp)), 3)
        else:
            m = re.match(r"^([A-Z\-]+)\(([-0-9.]+)\)$", name)
            if m:
                n, a = m.group(1), _num(m.group(2))
                if n == "LP":
                    a = int(min(11000, max(2500, a + rng.choice([-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000]) * amp)))
                elif n == "WIDTH":
                    a = round(min(1.8, max(1.0, a + rng.uniform(-0.3, 0.3) * amp)), 2)
                elif n == "CHORUS":
                    a = int(min(4, max(1, a + rng.choice([-1, 0, 1]))))
                elif n == "TAPE":
                    a = round(min(0.5, max(0.08, a + rng.uniform(-0.1, 0.12) * amp)), 2)
                elif n == "SAT":
                    a = round(min(3.2, max(1.2, a + rng.uniform(-0.6, 0.8) * amp)), 1)
                elif n == "SHELF":
                    a = round(min(0, max(-5, a + rng.uniform(-1.5, 1.5) * amp)), 1)
                elif n == "VINYL":
                    a = int(min(-42, max(-54, a + rng.choice([-4, -2, 0, 2, 4]))))
                else:
                    out.append(f)
                    continue
                f["fx"] = "%s(%s)" % (n, int(a) if float(a).is_integer() and n in ("LP", "CHORUS", "VINYL") else a)
        out.append(f)
    return out


def fingerprint(spec):
    lay = spec["layers"][0]
    return (lay["voice"], lay["pattern"], json.dumps(spec["fx"], sort_keys=True))


# ---- zakres i zapis ----
def _load(path):
    return json.load(open(path, encoding="utf-8"))


def _save(path, spec):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)
        f.write("\n")


def targets():
    """Lista (klucz, [pliki specyfikacji], typ). Stemy i _full jednej gry dzielą progresję."""
    groups = []
    for p in sorted(glob.glob(os.path.join(SPECS, "rec_s[1234]_*.json"))):
        groups.append((os.path.basename(p)[:-5], [p], "record"))
    for p in sorted(glob.glob(os.path.join(SPECS, "place_room_*.json"))):
        groups.append((os.path.basename(p)[:-5], [p], "room"))
    for sid in LP.BUILD:
        groups.append((sid, [os.path.join(SPECS, sid + ".json")], "build"))
    for g in ("veggie_rain", "hay_maze", "veggie_memory", "nyan_cuy"):
        files = sorted(glob.glob(os.path.join(SPECS, "mg_%s_*.json" % g)))
        groups.append(("mg_" + g, files, "game"))
    groups.append(("mg_menu", [os.path.join(SPECS, "mg_menu.json")], "game"))
    return groups


def sid_of(rec_id):
    m = re.match(r"^rec_(s\d_[a-z]+)_([ab][12])$", rec_id)
    return m.group(1), m.group(2)


def apply(table_rows=None):
    accepted, usage = [], {}
    for fixed in ["theme_cuy", "jingle_stage", "jingle_birthday"]:
        s = _load(os.path.join(SPECS, fixed + ".json"))
        accepted.append(rel_sig([parse(c["sym"]) for c in s["chords"]], T.root_pc(s.get("key", "C"))))
    prints = set()
    rows = []
    for key, files, kind in targets():
        first = _load(files[0])
        tonic, bars = first["key"], first["bars"]
        prefs = (GAME_TAGS if kind == "game" else SERIES_TAGS[int(key.split("_")[1][1])] if kind == "record" else CHILL)
        syms, tag = make_progression(key, tonic, first["mode"], bars, accepted, usage, prefs)
        for path in files:
            if kind == "record":
                sid, vid = sid_of(key)
                spec = GR.build(sid, [v for v in GR.VARIANTS if v[0] == vid][0])  # baza deterministyczna: idempotentne
            else:
                spec = _load(path)
            spec["chords"] = [{"bar": i + 1, "sym": s} for i, s in enumerate(syms)]
            if kind in ("record", "room", "build"):
                lay = spec["layers"][0]
                rng = random.Random("sound|" + key)
                if kind == "record":
                    series = int(sid[1])
                    pool = POOLS[series]
                    vi = ["a1", "a2", "b1", "b2"].index(vid)
                    h = sum(ord(c) * (i + 3) for i, c in enumerate(sid)) % len(pool)
                    voice = pool[(h + vi * 3) % len(pool)]
                    lay["voice"] = voice
                    lay["pattern"] = rng.choice(PATTERNS[voice])
                    lay["db"] = -12 if voice == "ACC" else -3
                    lay["part"] = "jedna warstwa, jeden instrument (%s), akordy rozłożone; gotowe progresje SHLD: %s" % (voice, tag)
                    spec["fx"] = jitter_chain(spec["fx"], random.Random("fx|%s|0" % key), 1.0)
                else:
                    # pokoje i belki: efekty zostają, jitter tylko przy kolizji odcisku (idempotentne)
                    for attempt in range(1, 200):
                        if fingerprint(spec) not in prints:
                            break
                        spec["fx"] = jitter_chain(spec["fx"], random.Random("fx|%s|%d" % (key, attempt)), 0.6)
                while fingerprint(spec) in prints:
                    spec["fx"] = jitter_chain(spec["fx"], random.Random("fx2|%s|%d" % (key, len(prints))), 1.0)
                prints.add(fingerprint(spec))
                role = re.sub(r"legenda v7:.*$", "", spec.get("role", "")).rstrip("; ")
                spec["role"] = ("%s; legenda v7: progresja unikalna (%s), jeden instrument (%s)"
                                % (role, tag, spec["layers"][0]["voice"]))[:300]
            _save(path, spec)
        rows.append((key, kind, tonic, bars, tag, _load(files[0])["layers"][0]["voice"] if kind != "game" else "stemy", syms))
    print("zapisano progresje: %d utworów" % len(rows))
    return rows


def table(rows):
    lines = ["# Unikalne progresje (MW-9)", "",
             "Jedno źródło prawdy: `tools/music/unique_progs.py` (deterministyczne ziarno z id). Tabela jest generowana: "
             "`python3 tools/music/unique_progs.py --table`. Sekcje A/B/C to gotowe progresje z SHLD Free MIDI Chord Packs "
             "(Ludovic Drolez, MIT, https://github.com/ldrolez/free-midi-chords; dane w `tools/music/ready_progs.json`), zapisane stopniami, "
             "transponowane do tonacji utworu i ubarwione akordami legendy v7. `(wzgl.)` = sekcja w tonacji względnej.", "",
             "| id | rodzaj | tonika | takty | źródło | instrument | akordy (pierwsze 16 taktów) |", "| --- | --- | --- | --- | --- | --- | --- |"]
    for key, kind, tonic, bars, tag, voice, syms in rows:
        lines.append("| `%s` | %s | %s | %d | %s | %s | %s |" % (key, kind, tonic, bars, tag, voice, " \\| ".join(syms[:16])))
    path = os.path.join(ROOT, "docs", "music_progressions_unique.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("zapisano", path)


def check():
    sigs, names = [], []
    for key, files, kind in targets():
        s = _load(files[0])
        prog = [parse(c["sym"]) for c in s["chords"]]
        for sym in (c["sym"] for c in s["chords"]):
            notes, _ = T.chord_notes(sym)
            assert len(notes) <= 6, sym
        for f in files[1:]:
            assert [c["sym"] for c in _load(f)["chords"]] == [c["sym"] for c in s["chords"]], f
        sig = rel_sig(prog, T.root_pc(s["key"]))
        for other, nm in zip(sigs, names):
            n = min(len(sig), len(other))
            same = sum(1 for k in range(n) if sig[k] == other[k])
            assert same <= max(2, 0.45 * n), (key, nm, same, n)
        sigs.append(sig)
        names.append(key)
    print("unikalność: %d progresji, parsowanie OK" % len(sigs))


if __name__ == "__main__":
    if "--apply" in sys.argv:
        rows = apply()
        if "--table" in sys.argv:
            table(rows)
    elif "--table" in sys.argv:
        table(apply())
    elif "--check" in sys.argv:
        check()
    else:
        print(__doc__)
