"""Progresje legendy harmonicznej v7 (docs/music_legend.md): jedno źródło prawdy dla specyfikacji i tabeli.

Użycie:
  python3 tools/music/legend_progs.py --apply   # zapisuje chords/layers/fx do specyfikacji beds/places (BUILD)
  python3 tools/music/legend_progs.py --table   # drukuje wiersze tabeli dla utworów do zbudowania (FUTURE)
Test: test_theory.py (każdy symbol się parsuje, <= 6 głosów, spec = PROGS).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import theory as T  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SHARP = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"]  # tonacje krzyżykowe: Eb i Bb zawsze z bemolem
FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
FLAT_KEYS = {"F", "Bb", "Eb", "Ab", "Db", "Gb"}


def _p(prog):
    return [x.strip() for x in prog.split("|")]


def transpose_sym(sym, semis, flat):
    names = FLAT if flat else SHARP

    def tr(m):
        return names[(T.root_pc(m.group(0)) + semis) % 12]
    m = re.match(r"^([A-G][#b]?)(.*?)(?:/([A-G][#b]?))?$", sym)
    root, q, bass = m.group(1), m.group(2), m.group(3)
    out = names[(T.root_pc(root) + semis) % 12] + q
    if bass:
        out += "/" + names[(T.root_pc(bass) + semis) % 12]
    return out


# rodziny progresji: (tonika szablonu, 8 taktów)
FAMILIES = {
    "LYD": ("C", "Cmaj9#11 | Dmaj13 | Em11 | Fmaj13#11 | Cmaj7/E | Dm11/G | Cmaj13 | G6/9"),
    "SOUL": ("C", "Cmaj13 | Am11 | Dm11 | G7b13 | Em11 | A7alt | Dm9 | Db9#11"),
    "MODAL": ("C", "Cmaj9 | Bbmaj7#11 | Abmaj9#11 | Fmaj13#11 | Cmaj7/E | Ebmaj9#11 | Dm11 | G13sus4"),
    "BACKDOOR": ("C", "Cmaj9 | Am11 | Fm9 | Bb13 | Cmaj13 | Em11 | Fmaj9#11 | G13sus4"),
    "THIRDS": ("C", "Cmaj9#11 | Abmaj9#11 | Emaj9#11 | Dm11 | Db13 | Cmaj13 | Am11 | G13sus4"),
    "DORQ": ("D", "Dsowhat | Ebsowhat | Dsowhat | Gmaj13#11 | Em11 | Fmaj13#11 | Dm11 | A9sus4"),
    "PEDAL": ("C", "Cmaj9 | D/C | Em11/C | Fmaj7#11/C | Cmaj9 | Bb/C | Dm11/C | G/C"),
    "WHOLE": ("C", "Cmaj7#5 | D9#5 | Fmaj13#11 | E9#5 | Dbmaj7#11 | C9#5 | Fmaj13#11 | G9sus4"),
    "PHRYG": ("A", "Am11 | Bbmaj7#11 | Am9 | E7b9b13 | Dm11 | Bbmaj13#11 | E7alt | Am(maj7)9"),
    "DORSOUL": ("G", "Gm11 | C13 | Bbmaj9#11 | Ebmaj13#11 | Gm13 | Am11 | D7b13 | Db9#11"),
    "MINSOUL": ("E", "Em11 | Cmaj13#11 | Am11 | B7alt | Em9 | Dmaj9#11 | Cmaj9#11 | B7b13"),
    "LULL": ("C", "Cmaj9 | Fmaj9#11 | Cmaj7/E | Fm6/9 | Cmaj13 | Dm11 | Fmaj9#11 | Cmaj9"),
}


def family(name, tonic):
    base, prog = FAMILIES[name]
    semis = (T.root_pc(tonic) - T.root_pc(base)) % 12
    flat = tonic in FLAT_KEYS or (tonic[-1:] == "b")
    return [transpose_sym(c, semis, flat) for c in _p(prog)]


# --- utwory zbudowane lub gotowe do zbudowania jednym instrumentem (BUILD: specyfikacje zapisywane przez --apply) ---
THEME = _p("Cmaj9#11 | Bbmaj7#11 | Am11 | Abmaj7#11 | Dm11 | Db13 | Cmaj13 | G13sus4 | "
           "Fmaj13#11 | Fm9 | Em11 | A7alt | Dm9 | Db9#11 | Cmaj7/E | G9sus4 | "
           "Cmaj9#11 | Abmaj9#11 | Emaj9#11 | Dm11 | Db13 | Cmaj13 | Am11 | G13sus4 | "
           "Fmaj13#11 | Fm(maj7)9 | Em11 | Ebmaj9#11 | Dm11 | Db9#11 | Cmaj13#11 | G13sus4")
JINGLES = {"jingle_stage": ["D9sus4", "Gmaj13#11"], "jingle_birthday": ["Db9#11", "Cmaj13#11"]}

FX_LOFI = [{"fx": "SAT(2.5)"}, {"fx": "TAPE(0.3)"}, {"fx": "CHORUS(3)"}, {"fx": "REV-L", "wet": 0.4},
           {"fx": "LOFI(12)"}, {"fx": "LP(2800)"}, {"fx": "SHELF(-4)"}, {"fx": "WIDTH(1.4)"}]
FX_AIRY = [{"fx": "CHORUS(2)"}, {"fx": "REV-L", "wet": 0.45}, {"fx": "LP(6000)"}, {"fx": "WIDTH(1.5)"}]
FX_LUSH = [{"fx": "SAT(1.5)"}, {"fx": "CHORUS(3)"}, {"fx": "REV-L", "wet": 0.4}, {"fx": "LP(4000)"},
           {"fx": "SHELF(-2)"}, {"fx": "WIDTH(1.4)"}]
FX_PLUCK = [{"fx": "TAPE(0.2)"}, {"fx": "REV-M", "wet": 0.25}, {"fx": "LP(5000)"}, {"fx": "WIDTH(1.2)"}]

# id -> (instrument, wzór, fx, A, B, uwaga). Forma: A B A B ... do liczby taktów z specyfikacji; ostatni takt = zwrot do taktu 1.
BUILD = {
    "bed_morning": ("HARP", "chords.rolled(0.25)", FX_AIRY,
                    "Cmaj9#11 | Dmaj7#11 | Em11 | Fmaj13#11 | Cmaj7/E | Dm11/G | Cmaj13 | G6/9",
                    "Am11 | Fmaj13#11 | Bbmaj7#11 | Fmaj7/A | Dm11 | Db13 | Cmaj13#11 | G9sus4"),
    "bed_day": ("PAD", "chords.rolled(0.35)", FX_LUSH,
                "Fmaj9#11 | Gm11 | Am11 | Bbmaj13#11 | Fmaj7/A | Gm11/C | Fmaj13 | C6/9",
                "Dm11 | Bbmaj9#11 | Abmaj7#11 | Fmaj7/C | Gm9 | Gb13 | Fmaj13#11 | C13sus4"),
    "bed_evening": ("EP", "chords.rolled(0.2)", FX_LOFI,
                    "Bbmaj9#11 | Gm11 | Cm11 | F7b13 | Dm11 | Ebmaj9#11 | Cm11 | F13sus4",
                    "Ebmaj13#11 | Ebm9 | Dm11 | G7alt | Cm11 | B13 | Bbmaj13 | F9sus4"),
    "bed_night": ("CEL", "chords.rolled(0.3)", FX_AIRY,
                  "Dsowhat | Ebsowhat | Dsowhat | Gmaj13#11 | Em11 | Fmaj13#11 | Dm11 | A9sus4",
                  "Em11 | A9sus4 | Dm11 | Bbmaj9#11 | Gm13 | C13sus4 | Fmaj13#11 | A7b13"),
    "place_garden_day": ("HARP", "chords.rolled(0.25)", FX_AIRY,
                         "Gmaj9#11 | Bm11 | Cmaj13#11 | D13sus4 | Em11 | Bbmaj7#11 | Am11 | D9sus4",
                         "Cmaj9#11 | Cm9 | Bm11 | E7alt | Am11 | Ab13 | Gmaj13 | D13sus4"),
    "place_garden_evening": ("EP", "chords.rolled(0.2)", FX_LOFI,
                             "E9sus4 | Dmaj9#11 | Amaj13#11 | Bm11 | C#m11 | Dmaj7#11 | Amaj7/C# | B13sus4",
                             "Amaj9#11 | Am9 | G#m11 | C#7alt | F#m11 | F13 | Emaj13 | B9sus4"),
    "place_farm": ("ACC", "chords.rolled(0.2)", FX_LUSH,
                   "Amaj9 | D6/9 | F#m11 | E13sus4 | Amaj13 | Bm11 | Dmaj13#11 | E9sus4",
                   "Dmaj13#11 | C#m11 | Bm11 | E7b13 | Amaj7/C# | Dmaj7/F# | Bm11 | E9sus4"),
    "place_market": ("BNJ", "chords.arp8", FX_PLUCK,
                     "Bbmaj9 | Gm9 | Cm11 | F13 | Bbmaj13 | Ebmaj7#11 | Cm11 | F9sus4",
                     "Ebmaj9#11 | Ebm9 | Dm11 | G7alt | Cm11 | B13 | Bbmaj13#11 | F13sus4"),
    "place_park": ("BOX", "chords.arp8", FX_PLUCK,
                   "Dmaj9 | Bm11 | Emaj13#11 | A13sus4 | F#m11 | Gmaj13#11 | Em11 | A9sus4",
                   "Gmaj9#11 | Gm9 | F#m11 | B7b13 | Em11 | Eb13 | Dmaj13 | A13sus4"),
}

# --- do zbudowania później: id -> (instrument, wzór, rodzina, tonika) ---
ROOMS = {
    "place_room_bedroom": ("CEL", "chords.rolled(0.3)", "DORQ", "D"),
    "place_room_default": ("EP", "chords.rolled(0.2)", "SOUL", "A"),
    "place_room_dorm": ("BOX", "chords.rolled(0.3)", "LULL", "G"),
    "place_room_glen": ("EP", "chords.rolled(0.2)", "MODAL", "Eb"),
    "place_room_james": ("PAD", "chords.rolled(0.35)", "DORSOUL", "D"),
    "place_room_kuki": ("HARP", "chords.rolled(0.25)", "LYD", "G"),
    "place_room_ned": ("BNJ", "chords.arp8", "BACKDOOR", "Bb"),
    "place_room_playroom": ("XYL", "chords.arp8", "THIRDS", "C"),
    "place_room_racuch": ("BOX", "chords.arp8", "MODAL", "C"),
    "place_room_salon": ("EP", "chords.rolled(0.2)", "SOUL", "F"),
}
SERIES = {
    "s1_poranek": ("HARP", "chords.rolled(0.25)", "LYD", "C"),
    "s1_marchewka": ("BNJ", "chords.arp8", "BACKDOOR", "G"),
    "s1_deszcz": ("EP", "chords.rolled(0.2)", "SOUL", "Eb"),
    "s1_kubek": ("ACC", "chords.rolled(0.2)", "MODAL", "F"),
    "s1_nocna": ("EP", "chords.rolled(0.2)", "DORSOUL", "D"),
    "s1_cichy": ("BOX", "chords.rolled(0.3)", "PEDAL", "C"),
    "s2_rosa": ("CEL", "chords.rolled(0.3)", "LULL", "G"),
    "s2_pietruszka": ("EP", "chords.rolled(0.2)", "MINSOUL", "E"),
    "s2_pszczoly": ("BNJ", "chords.arp8", "LYD", "A"),
    "s2_wiatr": ("PAD", "chords.rolled(0.35)", "PEDAL", "D"),
    "s2_dynia": ("ACC", "chords.rolled(0.2)", "THIRDS", "F"),
    "s2_jablka": ("HARP", "chords.rolled(0.25)", "PHRYG", "A"),
    "s3_ksiezyc": ("PAD", "chords.rolled(0.35)", "LYD", "F"),
    "s3_swietliki": ("CEL", "chords.arp8", "WHOLE", "A"),
    "s3_sowa": ("PAD", "chords.rolled(0.35)", "MINSOUL", "D"),
    "s3_kolysanka": ("BOX", "chords.rolled(0.3)", "LULL", "C"),
    "s3_tupot": ("EP", "chords.rolled(0.2)", "DORSOUL", "G"),
    "s3_sen": ("PAD", "chords.rolled(0.4)", "PEDAL", "F"),
    "s4_disco": ("EP", "chords.arp8", "MINSOUL", "A"),
    "s4_synth": ("P25", "chords.rolled(0.15)", "MINSOUL", "E"),
    "s4_kaseta": ("EP", "chords.rolled(0.2)", "PHRYG", "D"),
    "s4_radio": ("ACC", "chords.rolled(0.2)", "BACKDOOR", "C"),
    "s4_arcade": ("P25", "chords.arp8", "THIRDS", "G"),
    "s4_taniec": ("EP", "chords.arp8", "DORSOUL", "C"),
}
# minigry (3 stemy + perkusja: poza zakresem jednego instrumentu): id -> 8 taktów
MINIGAMES = {
    "mg_veggie_rain": ("C", "Cmaj9#11 | A7b13 | Dm11 | G13 | Ebmaj9#11 | Ab13#11 | Cmaj13 | G13sus4"),
    "mg_hay_maze": ("A", FAMILIES["PHRYG"][1]),
    "mg_veggie_memory": ("F", "Fmaj7#5 | Gm11 | Am11 | Bbmaj9#11 | F9#5 | G9#5 | Fmaj13 | C13sus4"),
    "mg_nyan_cuy": ("E", "Em11 | Dmaj9#11 | Cmaj13#11 | B7alt | Em9 | Gmaj13#11 | Am11 | B13sus4"),
    "mg_menu": ("G", "G6/9 | Bm11 | Cmaj13#11 | D13sus4 | Em11 | Ebmaj9#11 | Am11 | Db13"),
}


def form_chords(a, b, bars):
    """A B A B ... do `bars` taktów; ostatni takt = zwrot (turnaround) B[-1], jeśli kończy frazę B, inaczej bez zmian."""
    a, b = _p(a), _p(b)
    out = []
    i = 0
    while len(out) < bars:
        out += a if i % 2 == 0 else b
        i += 1
    return out[:bars]


def form_future(fam, tonic, bars):
    """Forma utworów do zbudowania: A B A B ..., B = A o kwartę wyżej (tonika + 5 półtonów), przycięte do `bars`."""
    up = FLAT[(T.root_pc(tonic) + 5) % 12] if (tonic in FLAT_KEYS or tonic[-1:] == "b") else SHARP[(T.root_pc(tonic) + 5) % 12]
    a, b = family(fam, tonic), family(fam, up)
    out = []
    while len(out) < bars:
        out += a if (len(out) // 8) % 2 == 0 else b
    return out[:bars]


def all_symbols():
    syms = set(THEME)
    for v in JINGLES.values():
        syms.update(v)
    for v in BUILD.values():
        syms.update(_p(v[3]) + _p(v[4]))
    for name in FAMILIES:
        for t in ("C", "D", "E", "F", "G", "A", "Bb", "Eb"):
            syms.update(family(name, t))
    for _, prog in MINIGAMES.values():
        syms.update(_p(prog))
    return sorted(syms)


def apply():
    for sid, (voice, pattern, fx, a, b) in BUILD.items():
        path = os.path.join(HERE, "specs", sid + ".json")
        s = json.load(open(path, encoding="utf-8"))
        chords = form_chords(a, b, s["bars"])
        s["chords"] = [{"bar": i + 1, "sym": c} for i, c in enumerate(chords)]
        s["layers"] = [{"role": "chd", "voice": voice, "db": -3, "pattern": pattern,
                        "part": "jedna warstwa, jeden instrument (%s); legenda v7, progresja A|B w docs/music_legend.md" % voice}]
        s["fx"] = [dict(f, on="all") for f in fx]
        s["drums"] = None
        if pattern == "chords.arp8":
            s["swing"] = 58
        s["role"] = s["role"].split(";")[0] + "; legenda v7: jeden instrument (%s), pełne progresje, bez warstw rytmicznych" % voice
        json.dump(s, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("zapisano", sid)


def table():
    for src in (ROOMS, SERIES):
        for sid, (voice, pattern, fam, tonic) in src.items():
            print("| `%s` | %s | %s | %s %s | %s |" % (sid, voice, pattern, fam, tonic, " \\| ".join(family(fam, tonic))))
    for sid, (tonic, prog) in MINIGAMES.items():
        print("| `%s` | %s |" % (sid, " \\| ".join(_p(prog))))


if __name__ == "__main__":
    if "--apply" in sys.argv:
        apply()
    elif "--table" in sys.argv:
        table()
    else:
        print(__doc__)
