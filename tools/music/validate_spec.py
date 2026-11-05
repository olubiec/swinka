#!/usr/bin/env python3
"""Walidator specyfikacji utworów (MW-0, MT-01).

Użycie:
  python3 tools/music/validate_spec.py            # wszystkie tools/music/specs/*.json
  python3 tools/music/validate_spec.py id1 id2    # tools/music/specs/<id>.json (lub _<id>.json)

Wymaga pakietu jsonschema (pip install jsonschema). Kod wyjścia 0 = wszystko poprawne, 1 = błędy, 2 = brak zależności.
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(HERE, "spec.schema.json")
SPECS_DIR = os.path.join(HERE, "specs")


def semantic_errors(spec):
    """Reguły, których JSON Schema nie wyraża. Zwraca listę komunikatów."""
    errs = []
    bars = spec.get("bars", 0)

    chords = spec.get("chords", [])
    bar_numbers = [c.get("bar") for c in chords]
    if bar_numbers and bar_numbers[0] != 1:
        errs.append("chords: pierwszy akord musi być w takcie 1")
    if any(b > bars for b in bar_numbers if isinstance(b, int)):
        errs.append("chords: takt akordu większy niż bars")
    if any(b2 <= b1 for b1, b2 in zip(bar_numbers, bar_numbers[1:])):
        errs.append("chords: numery taktów muszą rosnąć ściśle")

    for i, layer in enumerate(spec.get("layers", [])):
        if layer.get("from_bar", 1) > bars:
            errs.append("layers[%d]: from_bar większe niż bars" % i)

    loop = spec.get("loop", {})
    if "start_s" in loop and "end_s" in loop and loop["start_s"] >= loop["end_s"]:
        errs.append("loop: start_s musi być mniejsze niż end_s")

    if spec.get("stem_of") == spec.get("id"):
        errs.append("stem_of wskazuje na samą specyfikację")

    return errs


def filename_errors(path, spec):
    """Nazwa pliku (bez _ na początku) musi być równa id."""
    stem = os.path.splitext(os.path.basename(path))[0].lstrip("_")
    if spec.get("id") != stem:
        return ["nazwa pliku %s nie zgadza się z id %r" % (os.path.basename(path), spec.get("id"))]
    return []


def resolve_paths(ids):
    if not ids:
        return sorted(glob.glob(os.path.join(SPECS_DIR, "*.json")))
    paths = []
    for ident in ids:
        found = [p for p in (os.path.join(SPECS_DIR, ident + ".json"),
                             os.path.join(SPECS_DIR, "_" + ident + ".json")) if os.path.exists(p)]
        if not found:
            print("BRAK %s: nie ma pliku w %s" % (ident, SPECS_DIR))
            paths.append(None)
        else:
            paths.append(found[0])
    return paths


def main(argv):
    try:
        import jsonschema
    except ImportError:
        print("Brak pakietu jsonschema: pip install jsonschema")
        return 2

    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)
    validator = jsonschema.Draft202012Validator(schema)

    paths = resolve_paths(argv[1:])
    if not paths:
        print("Brak specyfikacji do sprawdzenia.")
        return 0

    failed = 0
    for path in paths:
        if path is None:
            failed += 1
            continue
        name = os.path.basename(path)
        try:
            with open(path, encoding="utf-8") as f:
                spec = json.load(f)
        except (OSError, ValueError) as exc:
            print("%s: nie da się wczytać JSON: %s" % (name, exc))
            failed += 1
            continue

        errors = []
        for err in sorted(validator.iter_errors(spec), key=lambda e: list(e.path)):
            where = "/".join(str(p) for p in err.path) or "<root>"
            errors.append("%s: %s" % (where, err.message))
        errors += semantic_errors(spec)
        errors += filename_errors(path, spec)

        if errors:
            failed += 1
            print("%s: BŁĄD" % name)
            for e in errors:
                print("  - " + e)
        else:
            print("%s: OK" % name)

    print("Sprawdzono %d, z błędami %d." % (len(paths), failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
