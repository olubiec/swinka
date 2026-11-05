#!/usr/bin/env python3
"""Arkusz odsłuchu muzyki (MUSIC_WAVES MW-1, MT-10).

Generuje tabelę Markdown z manifestu (assets/data/music.json): id, rodzaj, długość, LUFS,
szczyt, pętla oraz kolumny do ręcznego wypełnienia: 3 odsłuchy (słuchawki, głośnik laptopa,
mono), ocena 1-5 i uwagi.

Ponowne generowanie zachowuje wypełnione kolumny (słuchawki, głośnik, mono, ocena, uwagi)
dla id, które już są w arkuszu; nowe id dostają puste pola, usunięte z manifestu są pominięte.

Użycie:
  python3 tools/music/review_sheet.py                      # docs/music_review/SHEET.md
  python3 tools/music/review_sheet.py --manifest F --out F # inne pliki (testy)
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DEFAULT_MANIFEST = os.path.join(ROOT, "assets", "data", "music.json")
DEFAULT_OUT = os.path.join(ROOT, "docs", "music_review", "SHEET.md")

HEADER = ["id", "rodzaj", "dł. [s]", "LUFS", "szczyt dBTP", "pętla",
          "słuchawki", "głośnik", "mono", "ocena 1-5", "uwagi"]
PRESERVED = 5  # ostatnie kolumny: słuchawki, głośnik, mono, ocena, uwagi
EMPTY = ["[ ]", "[ ]", "[ ]", "", ""]


def clean(text):
    """Komórka tabeli: bez znaków nowej linii i separatora."""
    return str(text).replace("\n", " ").replace("|", "/").strip()


def read_existing(path):
    """Zwraca {id: [5 wypełnionych kolumn]} z istniejącego arkusza."""
    kept = {}
    if not os.path.isfile(path):
        return kept
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("|") or not line.endswith("|"):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) != len(HEADER) or not cells[0].startswith("`"):
                continue
            kept[cells[0].strip("`")] = cells[len(HEADER) - PRESERVED:]
    return kept


def fmt(value, digits):
    if value is None:
        return "-"
    return ("%." + str(digits) + "f") % value


def loop_cell(item):
    loop = item.get("loop") or {}
    if loop.get("enabled") is None:
        return "?"
    if not loop.get("enabled"):
        return "nie"
    edges = "ok" if (item.get("edge_first", 1) <= 0.01 and item.get("edge_last", 1) <= 0.01) else "szew!"
    return "tak, " + edges


def render(manifest, kept):
    items = sorted(manifest.get("items", []), key=lambda i: (i.get("kind", ""), i["id"]))
    counts = manifest.get("counts", {})
    lines = [
        "# Arkusz odsłuchu muzyki",
        "",
        "Generowany przez `tools/music/review_sheet.py` z `assets/data/music.json`. "
        "Ręcznie wypełniaj tylko kolumny od „słuchawki” w prawo; reszta jest odtwarzana. "
        "Zasady odsłuchu: `docs/music_review/README.md`.",
        "",
        "Pozycje: %d (wygenerowane %d, spoza generatora %d). Ocena: 1 = odrzucić, 3 = do poprawy, 5 = gotowe."
        % (counts.get("total", len(items)), counts.get("generated", 0), counts.get("legacy", 0)),
        "",
        "| " + " | ".join(HEADER) + " |",
        "|" + "|".join(["---"] * len(HEADER)) + "|",
    ]
    for it in items:
        values = kept.get(it["id"], EMPTY)
        row = [
            "`%s`" % it["id"],
            clean(it.get("kind", "")),
            fmt(it.get("length_s"), 1),
            fmt(it.get("lufs"), 1),
            fmt(it.get("peak_dbtp"), 1),
            loop_cell(it),
        ] + [clean(v) for v in values]
        lines.append("| " + " | ".join(row) + " |")
    if not items:
        lines.append("| _(brak pozycji)_ |" + " |" * (len(HEADER) - 1))
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", default=DEFAULT_MANIFEST)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    if not os.path.isfile(args.manifest):
        print("review_sheet: brak manifestu %s (uruchom build_manifest.py)" % args.manifest, file=sys.stderr)
        return 1
    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)
    kept = read_existing(args.out)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(render(manifest, kept))
    print("review sheet: %s (%d pozycji, zachowano %d wpisów)"
          % (args.out, len(manifest.get("items", [])), len(kept)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
