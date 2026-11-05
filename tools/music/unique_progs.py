#!/usr/bin/env python3
"""Unikalne progresje i brzmienia dla każdego utworu (MW-9).

Każdy utwór dostaje własną progresję zbudowaną ze słownika akordów legendy v7 (legend_progs.FAMILIES):
sekcje A, B (C dla długich) z różnych rodzin i w różnych tonacjach, potem mutacje (tritone sub, kolor,
względny dur/moll, dominanta przejściowa, półtonowe podejście). Unikalność jest wymuszona w odniesieniu do
tonaliki: dwa utwory nie mogą mieć tej samej progresji nawet po transpozycji (limit powtórzonych taktów).
Brzmienie: instrument z puli serii + wzór + łańcuch efektów z parametrami wylosowanymi z ziarna utworu;
odcisk (instrument, wzór, efekty) jest unikalny w całej bibliotece.

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

DOM = {"7", "9", "13", "7alt", "7b13", "7b9b13", "9#11", "13#11", "7#9", "7b9", "13b9", "9#5", "7#11", "7#5"}
GROUPS = [["maj9#11", "maj13#11", "maj13", "maj9", "maj7#11"], ["m9", "m11", "m13"], ["9sus4", "13sus4", "7sus4"],
          ["7alt", "7b13", "7b9b13", "13", "9#11"]]
MAJ_Q = {"maj9#11", "maj13#11", "maj13", "maj9", "maj7#11", "maj7"}
MIN_Q = {"m9", "m11", "m13", "m7"}
FAMS = sorted(LP.FAMILIES)

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


def section(fam, tonic):
    return [parse(s) for s in LP.family(fam, tonic)]


def mutate(sec, tonic_pc, rng):
    """Jedna mutacja na losowym takcie sekcji (0-7); takt 0 zostaje (kotwica), takt 7 tylko kolor/tritone."""
    i = rng.randrange(1, 8)
    root, q, bass = sec[i]
    op = rng.choice(["tri", "color", "rel", "appr", "sec", "color"])
    if op == "tri" and q in DOM and bass is None:
        sec[i] = ((root + 6) % 12, q, None)
    elif op == "color":
        for g in GROUPS:
            if q in g and bass is None:
                sec[i] = (root, rng.choice([x for x in g if x != q]), None)
                break
    elif op == "rel" and bass is None and i < 7:
        if q in MAJ_Q:
            sec[i] = ((root - 3) % 12, rng.choice(["m11", "m9"]), None)
        elif q in MIN_Q:
            sec[i] = ((root + 3) % 12, rng.choice(["maj9#11", "maj13#11"]), None)
    elif op == "appr" and i < 7:
        nxt = sec[i + 1][0]
        sec[i] = ((nxt + rng.choice([1, -1])) % 12, rng.choice(["13", "7alt", "9#11"]), None)
    elif op == "sec" and i < 7:
        nxt = sec[i + 1][0]
        sec[i] = ((nxt + 7) % 12, rng.choice(["7alt", "7b13", "13sus4"]), None)
    return sec


def build_unit(tonic, n_sec, rng):
    """Jednostka formy: n_sec sekcji po 8 taktów, każda z innej rodziny / przesunięcia."""
    tpc = T.root_pc(tonic)
    flat = _flat(tonic)
    fams = rng.sample(FAMS, n_sec)
    offs = [0] + rng.sample([5, 7, 3, 9, 2, 10, 4, 8, 6], n_sec - 1)
    unit = []
    for fam, off in zip(fams, offs):
        names = LP.FLAT if flat else LP.SHARP
        sec = section(fam, names[(tpc + off) % 12])
        for _ in range(rng.randint(1, 3)):
            sec = mutate(sec, tpc, rng)
        unit += sec
    tag = " + ".join("%s%+d" % (f, o) if o else f for f, o in zip(fams, offs))
    return unit, tag


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


def make_progression(key, tonic, bars, accepted, limit=0.3125):
    n_sec = 1 if bars <= 8 else (3 if bars >= 40 else 2)
    tpc = T.root_pc(tonic)
    for attempt in range(6000):
        rng = random.Random("prog|%s|%d" % (key, attempt))
        unit, tag = build_unit(tonic, max(n_sec, 1) if n_sec > 1 else 2, rng)
        prog = full_progression(unit if n_sec > 1 else unit[:8], bars)
        if not smooth_ok(prog):
            continue
        sig = rel_sig(prog, tpc)
        lim = limit if attempt < 3000 else limit + 0.12
        if distinct(sig, accepted, lim):
            accepted.append(sig)
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
    accepted = []
    for fixed in ["theme_cuy", "jingle_stage", "jingle_birthday"]:
        s = _load(os.path.join(SPECS, fixed + ".json"))
        accepted.append(rel_sig([parse(c["sym"]) for c in s["chords"]], T.root_pc(s.get("key", "C"))))
    prints = set()
    rows = []
    for key, files, kind in targets():
        first = _load(files[0])
        tonic, bars = first["key"], first["bars"]
        syms, tag = make_progression(key, tonic, bars, accepted)
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
                    lay["part"] = "jedna warstwa, jeden instrument (%s), akordy rozłożone; progresja unikalna: %s" % (voice, tag)
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
             "`python3 tools/music/unique_progs.py --table`. Sekcje A/B/C pochodzą z rodzin legendy v7 w różnych tonacjach "
             "(`RODZINA+n` = przesunięcie o n półtonów od tonaliki), potem mutacje (tritone sub, kolor, względny dur/moll, "
             "dominanta przejściowa, półtonowe podejście).", "",
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
