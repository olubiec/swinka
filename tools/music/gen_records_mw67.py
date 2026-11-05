#!/usr/bin/env python3
"""Specyfikacje płyt serii 1-4 (MW-5 seria 1, MW-6, MW-7): 24 płyty x 4 warianty = 96 utworów.

Jeden instrument, jedna warstwa (akordy rozłożone, chords.rolled), pełne progresje z legendy v7
(legend_progs.SERIES: rodzina + tonika na płytę; forma A/B przez legend_progs.form_future).
Warianty (a1, a2, b1, b2) różnią się tempem (catalog_records.tempi), rozłożeniem akordów (roll)
i efektami (pogłos, jasność LP, szerokość). Bez perkusji i szumów.

Użycie:
  python3 tools/music/gen_records_mw67.py          # zapisuje tools/music/specs/rec_s[1234]_*.json
Walidacja: python3 tools/music/validate_spec.py rec_s2_rosa_a1 ...
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import catalog_records as CR  # noqa: E402
import gen_prompts as G  # noqa: E402
import legend_progs as LP  # noqa: E402

SPECS_DIR = os.path.join(HERE, "specs")
SERIES_IDS = [sid for sid in LP.SERIES if sid.split("_")[0] in ("s1", "s2", "s3", "s4")]

# indeks w tempi (a1, a2, b1, b2), etykieta, przesunięcie roll, przesunięcie pogłosu, rozjaśnienie LP
VARIANTS = [
    ("a1", "A1 podpisowy", 0, 0.00, 0.00, 0),
    ("a2", "A2 spokojny", 1, +0.05, +0.04, 0),
    ("b1", "B1 energiczny", 2, -0.05, 0.00, 1500),
    ("b2", "B2 nastrojowy", 3, 0.00, +0.06, 0),
]

# akordeon (ACC) jest głośniejszy: -12 dB, bez przesterowania sumy przed masteringiem
# efekty serii z katalogu (catalog_records.SERIES[n]["fx"]): kolejność = kolejność łańcucha
TAPE_WET = {"s3_sen": 0.5, "s4_kaseta": 0.3}
SERIES_FX = {
    1: [("TAPE", 0.2), ("LP", 9000), ("REV-S", 0.12), ("VINYL", -46)],
    2: [("CHORUS", 2), ("LP", 6000), ("REV-M", 0.14), ("WIDTH", 1.5)],
    3: [("TAPE", 0.3), ("LP", 8000), ("CHORUS", 2), ("REV-L", 0.25), ("WIDTH", 1.3)],
    4: [("SAT", 2.0), ("SHELF", -2), ("REV-S", 0.08), ("WIDTH", 1.3)],
}
REVERB = {"REV-S", "REV-M", "REV-L"}


def fx_chain(sid, series, rev_delta, lp_up):
    chain = []
    if sid in TAPE_WET:
        chain.append({"fx": "TAPE(%s)" % TAPE_WET[sid], "on": "all"})
    for name, arg in SERIES_FX[series]:
        if name == "TAPE" and sid in TAPE_WET:
            continue
        if name in REVERB:
            chain.append({"fx": name, "wet": round(arg + rev_delta, 3), "on": "all"})
        elif name == "LP":
            chain.append({"fx": "LP(%d)" % (arg + lp_up), "on": "all"})
        elif name == "WIDTH":
            chain.append({"fx": "WIDTH(%s)" % arg, "on": "all"})
        elif name == "TAPE":
            chain.append({"fx": "TAPE(%s)" % arg, "on": "all"})
        elif name == "SHELF":
            chain.append({"fx": "SHELF(%s)" % arg, "on": "all"})
        elif name == "SAT":
            chain.append({"fx": "SAT(%s)" % arg, "on": "all"})
        else:
            chain.append({"fx": "%s(%s)" % (name, arg), "on": "all"})
    return chain


def bars_of(n):
    """Liczba taktów: wielokrotność 16 (forma A B z legend_progs.form_future), zaokrąglona w górę od 1/2."""
    return max(16, int(n / 16 + 0.5) * 16)


def bars_fit(bars, bpm, meter):
    """Zachowuje takty z katalogu, jeśli długość mieści się w 90-120 s (reguła rodzaju „record”);
    inaczej wybiera liczbę taktów najbliższą 105 s w przedziale (najpierw wielokrotności 8, potem 4, 1)."""
    def secs(n):
        return n * meter * 60.0 / bpm
    if 90 <= secs(bars) <= 120:
        return bars
    for step in (8, 4, 1):  # najpierw pełne bloki 8 taktów (forma A B), przy wolnym tempie krótsze
        fits = [n for n in range(step, 97, step) if 90 <= secs(n) <= 120]
        if fits:
            return min(fits, key=lambda n: abs(secs(n) - 105))
    raise ValueError("brak taktów dla %s BPM" % bpm)


def roll_of(base, delta):
    return round(min(0.45, max(0.10, base + delta)), 2)


def build(sid, variant):
    vid, label, tidx, roll_d, rev_d, lp_up = variant
    cat = CR.R[sid]
    fam, tonic = LP.SERIES[sid][2], LP.SERIES[sid][3]
    voice, base_pattern = LP.SERIES[sid][0], LP.SERIES[sid][1]
    rolled = base_pattern.startswith("chords.rolled(")
    base_roll = float(base_pattern[len("chords.rolled("):-1]) if rolled else 0.0
    series = cat["series"]
    bpm = cat["tempi"][tidx]
    bars = bars_fit(bars_of(cat["bars"]), bpm, cat["meter"])
    syms = LP.form_future(fam, tonic, bars)
    spec = {
        "id": "rec_%s_%s" % (sid, vid),
        "kind": "record",
        "title": "%s · %s" % (cat["title"], label),
        "role": ("płyta serii %d; %s; legenda v7: %s %s, jeden instrument (%s)"
                 % (series, cat["distinct"], fam, tonic, voice))[:300],
        "bpm": bpm,
        "meter": cat["meter"],
        "key": tonic,
        "mode": cat["mode"],
        "bars": bars,
        "swing": 50,
        "seed": G.seed("rec_%s_%s" % (sid, vid)),
        "chords": [{"bar": i + 1, "sym": s} for i, s in enumerate(syms)],
        "layers": [{
            "role": "chd",
            "voice": voice,
            "db": -12 if voice == "ACC" else -3,
            "pattern": ("chords.rolled(%.2f)" % roll_of(base_roll, roll_d)) if rolled else base_pattern,
            "part": "jedna warstwa, jeden instrument (%s), akordy rozłożone; forma A B legendy v7" % voice,
            "stem": "base",
        }],
        "drums": None,
        "fx": fx_chain(sid, series, rev_d, lp_up),
        "master": {"lufs": -16 if series == 1 else -18, "ceiling_dbtp": -1},
        "loop": {"enabled": True},
        "stem_of": None,
    }
    return spec


def main():
    n = 0
    for sid in SERIES_IDS:
        for variant in VARIANTS:
            spec = build(sid, variant)
            path = os.path.join(SPECS_DIR, spec["id"] + ".json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(spec, f, ensure_ascii=False, indent=2)
                f.write("\n")
            n += 1
    print("zapisano %d specyfikacji (%d płyt x 4)" % (n, len(SERIES_IDS)))
    import unique_progs  # MW-9: unikalna progresja i brzmienie każdego utworu (nadpisuje chords/layers/fx)
    unique_progs.apply()


if __name__ == "__main__":
    main()
