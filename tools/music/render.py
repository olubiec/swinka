#!/usr/bin/env python3
"""Renderer utworu (MT-03, PM-07): specyfikacja -> sekwencer -> finish -> OGG.

Użycie:
  python3 tools/music/render.py <spec.json | id> [--out plik.ogg]

Bez --out plik trafia tam, gdzie wskazuje finish.default_out_path (assets/music/<folder>/<id>.ogg).
Walidacja: schemat i reguły semantyczne z validate_spec.py. Kod wyjścia: 0 OK, 1 błąd specyfikacji.
Wymaga ffmpeg z libvorbis (finish.py) i jsonschema (validate_spec.py).
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import finish as F  # noqa: E402
import sequencer as S  # noqa: E402
import validate_spec as VS  # noqa: E402


def load_spec(arg):
    if arg.endswith(".json") or os.path.exists(arg):
        path = arg
    else:
        path = VS.resolve_paths([arg])[0]
        if path is None:
            raise SystemExit(1)
    with open(path, encoding="utf-8") as f:
        return json.load(f), path


def check_spec(spec, path):
    import jsonschema
    with open(VS.SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)
    errors = []
    for err in sorted(jsonschema.Draft202012Validator(schema).iter_errors(spec),
                      key=lambda e: list(e.path)):
        where = "/".join(str(p) for p in err.path) or "<root>"
        errors.append("%s: %s" % (where, err.message))
    errors += VS.semantic_errors(spec)
    errors += VS.filename_errors(path, spec)
    return errors


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec", help="ścieżka do specyfikacji .json albo id utworu")
    ap.add_argument("--out", help="ścieżka wyjściowego OGG (domyślnie wg finish.default_out_path)")
    args = ap.parse_args(argv[1:])

    spec, path = load_spec(args.spec)
    errors = check_spec(spec, path)
    if errors:
        print("%s: BŁĄD" % os.path.basename(path))
        for e in errors:
            print("  - " + e)
        return 1

    layers = S.build(spec)
    for role, why in S.SKIPPED:
        print("UWAGA pominięto %s: %s" % (role, why), file=sys.stderr)
    if not layers:
        print("Brak warstw do zmiksowania.", file=sys.stderr)
        return 1
    mix = np.sum([a.astype(np.float64) for a in layers.values()], axis=0)
    peak = float(np.max(np.abs(mix)))
    if peak >= 1.0:
        print("UWAGA suma warstw przesterowana (szczyt %.3f); finish ucina próbki" % peak, file=sys.stderr)

    out = F.finish(mix, spec, out_path=args.out)
    rep = F.LAST_REPORT
    print(out)
    print("LUFS %.2f (cel %.1f), true peak %.2f dBTP, zmiana %.2f dB, pętla %s" % (
        rep["lufs"], spec["master"]["lufs"], rep["true_peak_dbtp"], rep["gain_db"],
        "tak" if spec.get("loop", {}).get("enabled") else "nie"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
