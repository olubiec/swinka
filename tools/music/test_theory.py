"""Testy teorii (legenda harmoniczna v7). Uruchom: python3 tools/music/test_theory.py

Sprawdza: skład półtonowy każdego nowego typu akordu, pisownię, akordy bez kwinty, slash chordy, błędy.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import theory as T  # noqa: E402

# jakość -> półtony od podstawy (zgodnie z docs/music_legend.md, tabela 1)
EXPECT = {
    "maj7#11": [0, 4, 7, 11, 18], "maj9#11": [0, 4, 11, 14, 18], "maj13": [0, 4, 11, 14, 21],
    "maj13#11": [0, 4, 11, 14, 18, 21], "m9": [0, 3, 7, 10, 14], "m11": [0, 3, 10, 14, 17],
    "m13": [0, 3, 10, 14, 21], "m(maj7)9": [0, 3, 7, 11, 14], "7sus4": [0, 5, 7, 10],
    "9sus4": [0, 5, 7, 10, 14], "13sus4": [0, 5, 10, 14, 21], "7#9": [0, 4, 10, 15], "7b13": [0, 4, 10, 20],
    "7alt": [0, 4, 10, 15, 20], "7b9b13": [0, 4, 10, 13, 20], "7#11": [0, 4, 7, 10, 18],
    "9#11": [0, 4, 10, 14, 18], "13#11": [0, 4, 10, 14, 18, 21], "m7b5": [0, 3, 6, 10],
    "m9b5": [0, 3, 6, 10, 14], "dim7": [0, 3, 6, 9], "q3": [0, 5, 10], "q4": [0, 5, 10, 15],
    "sowhat": [0, 5, 10, 15, 19], "sus2": [0, 2, 7], "sus24": [0, 2, 5, 7], "add9": [0, 4, 7, 14],
    "madd9": [0, 3, 7, 14], "m6/9": [0, 3, 9, 14], "9#5": [0, 4, 8, 10, 14], "7#5": [0, 4, 8, 10],
    "maj7#5": [0, 4, 8, 11], "9": [0, 4, 10, 14], "7b9": [0, 4, 7, 10, 13], "13b9": [0, 4, 10, 13, 21],
}
NO_FIFTH = ("maj9#11", "maj13", "maj13#11", "m11", "m13", "13#11", "7#9", "7b13", "7alt", "q3", "9")


def test_semitones():
    for q, want in EXPECT.items():
        assert T.CHORD_Q[q] is not None, q
        got = [s for s, _ in T.CHORD_Q[q]]
        assert got == want, (q, got, want)
        assert got == sorted(got) and len(set(got)) == len(got), q
        for root in ("C", "Eb", "F#", "Bb"):
            notes, bass = T.chord_notes(root + q)
            assert bass is None and len(notes) == len(want), (root, q, notes)
            pcs = [(T.root_pc(n) - T.root_pc(root)) % 12 for n in notes]
            assert pcs == [x % 12 for x in want], (root, q, pcs)
    print("  %d nowych typów akordów: skład półtonowy, 4 tonacje OK" % len(EXPECT))


def test_no_fifth_variants():
    for q in NO_FIFTH:
        semis = [s % 12 for s, _ in T.CHORD_Q[q]]
        assert 7 not in semis, q
    for q in ("maj7#11", "7#11", "9sus4", "7b9", "m(maj7)9"):
        assert 7 in [s % 12 for s, _ in T.CHORD_Q[q]], q
    print("  akordy bez kwinty i z kwintą OK")


def test_spelling_and_slash():
    assert T.chord_notes("Cmaj13#11")[0] == ["C", "E", "B", "D", "F#", "A"]
    assert T.chord_notes("Edim7")[0] == ["E", "G", "Bb", "Db"]
    assert T.chord_notes("Cdim7")[0] == ["C", "Eb", "Gb", "Bbb"]
    assert T.chord_notes("Eq4")[0] == ["E", "A", "D", "G"]
    assert T.chord_notes("Esowhat")[0] == ["E", "A", "D", "G", "B"]
    assert T.chord_notes("Db13")[0] == ["Db", "F", "Cb", "Eb", "Bb"]
    assert T.chord_notes("Cmaj7/E") == (["C", "E", "G", "B"], "E")
    assert T.chord_notes("Am11/G") == (["A", "C", "G", "B", "D"], "G")
    assert T.chord_notes("D/C") == (["D", "F#", "A"], "C")
    assert T.chord_notes("C6/9")[0] == ["C", "E", "G", "A", "D"]
    try:
        T.chord_notes("Cfoo9")
        raise AssertionError("brak błędu dla nieznanej jakości")
    except ValueError:
        pass
    print("  pisownia, slash chordy, błąd nieznanej jakości OK")


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
    print("test_theory: OK")
