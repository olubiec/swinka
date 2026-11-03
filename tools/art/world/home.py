"""Dom (house): przedmioty przebudowy B4 + probki B1. Reczne bryly w palecie domku z siana."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H

BR = ("brick.1", "brick.2", "brick.3", "brick.3")      # tkanina: tylko rampa brick (recolor)
BR_D = ("brick.0", "brick.1", "brick.2", "brick.2")


def sofa_cosy():
    """Sofa-bochenek 3x2 (48x32): wypukly grzbiet jak bochen, rolowane boki, dwie poduchy, drewniane nozki."""
    im = H.canvas(48, 32)
    H.rrect(im, 5, 5, 42, 20, 7, BR_D)            # grzbiet-bochen (ciemniejszy, w tle)
    H.rrect(im, 2, 12, 11, 27, 4, BR)             # lewy rolowany bok
    H.rrect(im, 36, 12, 45, 27, 4, BR)            # prawy bok
    H.rrect(im, 11, 16, 24, 26, 3, BR)            # lewa poducha
    H.rrect(im, 23, 16, 36, 26, 3, BR)            # prawa poducha
    H.rect(im, 12, 26, 35, 27, "brick.0")         # podstawa
    # nozki z drewna
    for x in (5, 40):
        H.rect(im, x, 28, x + 2, 29, "wood.1"); H.put(im, x, 28, "wood.2")
    # szwy i guziki pikowania na grzbiecie (srodek 2 guziki + pikowanie)
    for x in (16, 23, 30):
        H.put(im, x, 10, "brick.0"); H.put(im, x, 9, "brick.2")
    for x in (19, 27):
        H.put(im, x, 13, "brick.0"); H.put(im, x, 12, "brick.2")
    # szew miedzy poduchami i krawedz siedziska
    H.vline(im, 23, 17, 26, "brick.0")
    H.hline(im, 12, 35, 16, "brick.3")
    # rolka boku: spirala (kreska) i swiatlo
    for x0 in (3, 37):
        H.hline(im, x0 + 1, x0 + 6, 15, "brick.0")
        H.put(im, x0 + 2, 14, "brick.3")
    # koc / proszek hay: maly pled na boku (ciepły akcent)
    H.rect(im, 38, 18, 43, 20, "hay.1"); H.hline(im, 38, 43, 20, "hay.0"); H.hline(im, 38, 43, 18, "hay.2")
    im = H.outline(im, sides="nesw")
    return H.contact_shadow(im, rows=1, spread=2)


if __name__ == "__main__":
    import scena
    it = sofa_cosy()
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/sofa.png"
    scena.gate("sofa_cosy", it, out, light=("lamp_floor", 24, 8), recolor=True)
    print(out)
