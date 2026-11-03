"""B14-4/5: dzialki farmy 64x64 (trawnik do przerobienia, pole, sad). Gracz sam wybiera, co z dzialki powstaje."""
import json
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image

W, Ht = 16, 16                                              # jedna dzialka = jedno male pole 16x16, tworzone osobno
CELL = 16


def _grass(im, r, tones):
    for y in range(Ht):
        for x in range(W):
            c = tones[0]
            if r.random() < .14: c = tones[1]
            if r.random() < .05: c = tones[2]
            H.put(im, x, y, c)


def plot_lawn():
    """Pusta dzialka trawnika: tylko znaczniki naroznikow z siana (L-ki), reszta przezroczysta, zeby widac bylo polane."""
    im = H.canvas(W, Ht)
    for x, y, dx, dy in ((0, 0, 1, 1), (W - 1, 0, -1, 1), (0, Ht - 1, 1, -1), (W - 1, Ht - 1, -1, -1)):
        H.put(im, x, y, "hay.0"); H.put(im, x + dx, y, "hay.0"); H.put(im, x, y + dy, "hay.0")
    return im


def plot_orchard():
    """Miejsce na drzewko: trawa z kregiem sciolki; drzewko (16x32) stoi dolem na tej komorce, korona zajmuje komorke nad nia."""
    im = H.canvas(W, Ht)
    for dy, hw in ((-4, 4), (-3, 6), (-2, 7), (-1, 6), (0, 4)):
        H.hline(im, 8 - hw, 7 + hw, 10 + dy + 2, "wood.0")
        if -3 <= dy <= -1: H.hline(im, 10 - hw, 5 + hw, 10 + dy + 2, "wood.1")
    H.hline(im, 5, 10, 10, "wood.2")
    return im


ITEMS = {"plot_lawn": plot_lawn, "plot_orchard": plot_orchard}   # pole = istniejace bed_empty / bed_wet


def build():
    for k, f in ITEMS.items():
        H.register_item(k, "farm", f())


if __name__ == "__main__":
    build()
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sh = Image.new("RGBA", (W * 4 + 16, Ht + 8), (40, 70, 40, 255))
    for i, f in enumerate(ITEMS.values()): sh.alpha_composite(f(), (4 + i * (W + 4), 4))
    sh.resize((sh.width * 4, sh.height * 4), Image.NEAREST).save(S / "b14-plots.png")
