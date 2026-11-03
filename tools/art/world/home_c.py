"""Dom C (B4-6, B4-7): rzeczy podpisowe 2x2 (32x32) + 4 warianty koloru. Tkaniny w rampie brick."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from home_a import BR, BR_D, seal

WD = ("wood.0", "wood.1", "wood.2", "wood.3")
VARIANTS = ("dusk", "moss", "linen", "plum")


def sig_kuki_blanket():                     # patchwork na lace
    r = random.Random(11)
    im = H.canvas(32, 32)
    H.rrect(im, 1, 8, 30, 26, 4, BR)
    tones = ["brick.1", "brick.2", "brick.3", "brick.2"]
    for gy, y in enumerate(range(10, 25, 5)):
        for gx, x in enumerate(range(3, 29, 6)):
            c = tones[(gx + gy * 2) % 4]
            H.rect(im, x, y, x + 4, y + 3, c)
            H.put(im, x + 2, y + 1, "hay.1" if (gx + gy) % 3 == 0 else c)
            H.hline(im, x, x + 4, y + 4, "brick.0")
    H.put(im, 6, 11, "moss.2"); H.put(im, 7, 12, "moss.3")      # lisc-lata w kolorach laki
    for x in range(2, 30, 2): H.put(im, x, 27, "linen.2")
    H.break_checkers(im)
    return seal(im, spread=1)


def sig_ned_snack_nook():                   # skrzynia ze sloma + polka z przysmakami
    r = random.Random(12)
    im = H.canvas(32, 32)
    H.rrect(im, 2, 14, 29, 28, 3, WD)
    H.rect(im, 4, 15, 27, 18, "hay.1")
    for x in range(4, 28):
        if r.random() < .4: H.put(im, x, 14 + r.randint(0, 2), r.choice(["hay.0", "hay.2"]))
    H.hline(im, 3, 28, 19, "wood.3"); H.hline(im, 3, 28, 24, "wood.0")
    H.rect(im, 4, 20, 27, 23, "wood.2")
    H.rect(im, 4, 4, 27, 5, "wood.2"); H.hline(im, 4, 27, 4, "wood.3")      # polka
    H.vline(im, 6, 6, 13, "wood.1"); H.vline(im, 25, 6, 13, "wood.1")
    for x, c in ((8, "brick.2"), (13, "moss.3"), (18, "hay.3"), (22, "rose.1")):  # przysmaki
        H.rect(im, x, 2, x + 2, 3, c); H.put(im, x + 1, 1, "brick.0" if c == "brick.2" else c)
    for x in (8, 18): H.put(im, x + 1, 12, "brick.2")                       # miska
    H.rect(im, 10, 8, 20, 11, "brick.2"); H.hline(im, 10, 20, 8, "brick.3"); H.hline(im, 11, 19, 10, "brick.0")
    return seal(im, spread=1)


def sig_james_hideout():                    # luk z zaslonka
    im = H.canvas(32, 32)
    for y in range(3, 29):
        half = int(14 * (1 - ((y - 29) / 26.0) ** 2) ** 0.5)
        for x in range(16 - half, 16 + half + 1):
            H.put(im, x, y, "wood.2" if x < 16 + half - 3 else "wood.1")
    H.rect(im, 3, 28, 28, 29, "wood.1")
    for y in range(9, 28):                                                   # wejscie
        half = int(9 * (1 - ((y - 28) / 19.0) ** 2) ** 0.5)
        for x in range(16 - half, 16 + half + 1): H.put(im, x, y, "plum.0")
    for x in range(8, 24):                                                   # zaslonka: faldy
        for y in range(9 + (3 if x in (8, 23) else 0), 19):
            f = (x - 8) % 4
            H.put(im, x, y, "brick.2" if f in (1, 2) else "brick.1" if f == 0 else "brick.3")
        H.put(im, x, 19, "brick.0")
    H.put(im, 16, 4, "hay.1"); H.hline(im, 14, 18, 5, "hay.0")
    H.break_checkers(im)
    return seal(im, spread=1)


def sig_glen_knit_bed():                    # wglebione lozko z dzianiny
    im = H.canvas(32, 32)
    H.rrect(im, 1, 10, 30, 28, 6, BR)
    H.rrect(im, 5, 13, 26, 24, 4, BR_D)
    for y in range(12, 26, 2):                                               # oczka dzianiny: warkocze
        for x in range(4, 28, 3):
            H.put(im, x + (y // 2) % 2, y, "brick.3")
            H.put(im, x + (y // 2) % 2 + 1, y + 1, "brick.0")
    for x in range(3, 29, 3): H.put(im, x, 10, "brick.3")
    H.rrect(im, 5, 6, 14, 12, 3, ("brick.2", "brick.3", "linen.1", "linen.2"))   # poduszka
    H.put(im, 9, 9, "brick.0"); H.hline(im, 7, 12, 7, "linen.2")
    H.break_checkers(im)
    return seal(im, spread=1)


def sig_racuch_hop_pad():                   # okragla mata do skakania
    im = H.canvas(32, 32)
    H.rrect(im, 2, 12, 29, 27, 7, BR)
    H.rrect(im, 5, 14, 26, 24, 5, BR_D)
    H.hline(im, 7, 24, 14, "brick.3")
    for x, y in ((9, 18), (15, 17), (21, 19), (12, 22), (19, 22)):           # przeszycia guzikowe
        H.put(im, x, y, "hay.1"); H.put(im, x, y + 1, "brick.0")
    for x in range(4, 28, 4): H.put(im, x, 12, "hay.2")                       # obwodka
    H.break_checkers(im)
    return seal(im, spread=1)


A = {"sig_kuki_blanket": sig_kuki_blanket, "sig_ned_snack_nook": sig_ned_snack_nook,
     "sig_james_hideout": sig_james_hideout, "sig_glen_knit_bed": sig_glen_knit_bed,
     "sig_racuch_hop_pad": sig_racuch_hop_pad}


def variant(im, ramp):
    out = H.recolor(im, "brick", ramp)
    return out


def build(ids=None):
    out = []
    for i, fn in A.items():
        if ids and i not in ids: continue
        im = fn()
        vs = {}
        for v in VARIANTS:
            vim = variant(im, v)
            rel = f"house/variants/{i}__{v}.png"
            H.save_png(vim, H.WORLD_DIR / rel)
            vs[v] = rel
        H.register_item(i, "house", im, variants=vs)
        out.append((i, im, {v: variant(im, v) for v in VARIANTS}))
    return out
