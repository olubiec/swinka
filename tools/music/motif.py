#!/usr/bin/env python3
"""Motyw Cuy jako moduł (MT-06): motyw i podpis w dowolnej tonacji.

motif(key, mode, style) -> dict. Definicje te same co w gen_prompts.py (motif_text, sig_text):
motyw = stopnie 1-2-3-5, podpis = stopnie 2-3-5 (rytm z theory.SIG), wariant "inv" = odwrócenie 5-3-2-1.

Użycie:
  python3 tools/music/motif.py          # autotest: motyw w 12 tonacjach (dur i moll), wypis
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import theory as T  # noqa: E402

STYLES = {"plain": [1, 2, 3, 5], "inv": [5, 3, 2, 1]}
SIG_DEGREES = (2, 3, 5)
RHYTHM_MOTIF = "♪ ♪ ♪ ♩."
RHYTHM_SIG = "♪ ♪ ♩"
KEYS_12 = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def motif(key, mode, style="plain", meter=4):
    """Motyw i podpis Cuy w tonacji key (np. 'A', 'Eb', 'F#') i skali mode.

    Zwraca dict: key, mode, style, motif (nazwy nut, np. 'A4'), motif_midi, motif_rhythm,
    sig, sig_midi, sig_rhythm, sig_bar (szkielet taktu podpisu z theory.SIG), text (podpis do promptu).
    """
    if style not in STYLES:
        raise ValueError("styl motywu: %r (dozwolone: %s)" % (style, ", ".join(STYLES)))
    if mode not in T.SCALES:
        raise ValueError("tryb: %r" % mode)
    if meter not in T.SIG:
        raise ValueError("metrum: %r" % meter)
    mot = [T.note_name(key, mode, d) for d in STYLES[style]]
    sig = [T.note_name(key, mode, d) for d in SIG_DEGREES]
    names_m = [n for n, _ in mot]
    names_s = [n for n, _ in sig]
    return {
        "key": key,
        "mode": mode,
        "style": style,
        "motif": names_m,
        "motif_midi": [m for _, m in mot],
        "motif_rhythm": RHYTHM_MOTIF,
        "sig": names_s,
        "sig_midi": [m for _, m in sig],
        "sig_rhythm": RHYTHM_SIG,
        "sig_bar": T.SIG[meter][0],
        "text": "motyw %s (%s); podpis %s (%s)" % (" ".join(names_m), RHYTHM_MOTIF,
                                                   " ".join(names_s), RHYTHM_SIG),
    }


def _self_check(key, mode):
    """Każda nuta motywu i podpisu leży w gamie tonacji; podpis zaczyna się na stopniu 2."""
    info = motif(key, mode)
    scale_pcs = {T.note_name(key, mode, d)[1] % 12 for d in range(1, 8)}
    for m in info["motif_midi"] + info["sig_midi"]:
        if m % 12 not in scale_pcs:
            raise AssertionError("%s %s: nuta poza gamą (midi %d)" % (key, mode, m))
    if info["sig_midi"][0] != info["motif_midi"][1]:
        raise AssertionError("%s %s: podpis nie zaczyna się od stopnia 2" % (key, mode))
    return info


if __name__ == "__main__":
    for mode in ("minor", "major"):
        for k in KEYS_12:
            i = _self_check(k, mode)
            print("%-3s %-5s %s" % (k, mode, i["text"]))
    print("OK: motyw w 12 tonacjach (moll i dur).")
