"""Zrodla swiatla: kazde ma plik <id>.png (wylaczone) i <id>_on.png (pasek klatek wlaczonego).
Plomien: wspolna funkcja flame(), 4 klatki, 3 kolory (flame.0 -> .1 -> .2, jadro .3)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H

CELL = 16


def flame(im, cx, by, h, frame, w=3):
    """Plomien-lza o podstawie w (cx, by), wysokosci h; 4 klatki: wychylenie i wysokosc inne."""
    sway = (0, 1, 0, -1)[frame % 4]
    hh = h + (0, 1, 0, 1)[frame % 4] - (frame % 4 == 3)
    for k in range(hh):
        t = k / max(hh - 1, 1)
        ww = w if t < 0.5 else max(w - 1, 1) if t < 0.85 else 1
        off = round(sway * t * 1.5)
        c = "flame.0" if t < 0.35 else "flame.1" if t < 0.7 else "flame.2"
        x0 = cx - ww // 2 + off
        H.rect(im, x0, by - k, x0 + ww - 1, by - k, c)
    if hh >= 3:
        H.put(im, cx + (sway > 0), by - 1, "flame.3")
        if hh >= 5: H.put(im, cx + (sway > 0), by - 2, "flame.3")
    return im


def seal(im):
    return H.contact_shadow(H.outline(im), rows=1, spread=1)


# ---------- swiece i lampy stolowe ----------
def candle(on, f=0):
    im = H.canvas(16, 16)
    H.rect(im, 4, 7, 11, 14, "dusk.3"); H.rect(im, 5, 8, 10, 13, "dusk.4")                 # sloik
    H.vline(im, 5, 8, 13, "linen.3"); H.hline(im, 4, 11, 7, "dusk.2")
    H.rect(im, 6, 10, 9, 13, "linen.2"); H.hline(im, 6, 9, 10, "linen.3")                   # wosk
    H.vline(im, 8, 8, 9, "plum.1")                                                           # knot
    if on:
        H.rect(im, 5, 8, 10, 13, "hay.3"); H.rect(im, 6, 10, 9, 13, "linen.3")
        H.vline(im, 8, 8, 9, "plum.1")
        flame(im, 8, 7, 5, f, w=3)
    return seal(im)


def lamp_floor(on, f=0):
    im = H.canvas(16, 32)
    H.rect(im, 5, 28, 10, 29, "wood.1"); H.hline(im, 5, 10, 28, "wood.2")                    # stopa
    H.vline(im, 7, 13, 27, "hay.1"); H.vline(im, 8, 13, 27, "hay.0")                         # sztyca mosiadz
    H.put(im, 7, 20, "hay.2")
    shade = ("flame.1", "flame.2", "hay.3", "hay.3") if on else ("linen.1", "linen.2", "linen.3", "linen.3")
    for y in range(3, 14):                                                                   # abazur: trapez
        half = 3 + (y - 3) * 5 // 10
        H.hline(im, 8 - half, 7 + half, y, shade[1])
        H.put(im, 8 - half, y, shade[3]); H.put(im, 7 + half, y, shade[0])
    H.hline(im, 4, 11, 13, shade[0]); H.hline(im, 5, 10, 3, shade[3])
    if on:
        H.hline(im, 5, 10, 14, "flame.2")
    return seal(im)


def lamp_arc(on, f=0):
    im = H.canvas(32, 48)
    H.rect(im, 3, 44, 10, 45, "plum.2"); H.hline(im, 3, 10, 44, "plum.3")                    # ciezka podstawa
    H.vline(im, 6, 14, 43, "hay.0"); H.vline(im, 7, 14, 43, "hay.1")
    pts = [(7, 13), (8, 11), (9, 9), (11, 8), (13, 7), (16, 6), (19, 6), (22, 7), (24, 8), (25, 10)]
    for x, y in pts:
        H.put(im, x, y, "hay.1"); H.put(im, x, y + 1, "hay.0")
    shade = ("flame.1", "flame.2", "hay.3") if on else ("linen.1", "linen.2", "linen.3")
    for y in range(11, 18):                                                                  # abazur-kopula
        half = 2 + (y - 11) * 4 // 6
        H.hline(im, 25 - half, 25 + half, y, shade[1])
        H.put(im, 25 - half, y, shade[2]); H.put(im, 25 + half, y, shade[0])
    H.hline(im, 21, 29, 18, shade[0])
    if on: H.hline(im, 22, 28, 19, "flame.2")
    return seal(im)


def lantern_paper(on, f=0):
    im = H.canvas(16, 16)
    H.vline(im, 8, 0, 2, "plum.2")
    tones = ("flame.1", "flame.2", "hay.3", "flame.0") if on else ("linen.1", "linen.2", "linen.3", "brick.1")
    H.rrect(im, 3, 3, 12, 13, 4, (tones[3], tones[0], tones[1], tones[2]) if on else ("linen.0", "linen.1", "linen.2", "linen.3"))
    for y in (6, 9):                                                                         # zebra lampionu
        H.hline(im, 4, 11, y, "brick.2" if on else "hay.1")
    H.hline(im, 6, 9, 3, "wood.1"); H.hline(im, 6, 9, 13, "wood.1")
    H.put(im, 8, 14, "rose.1"); H.put(im, 8, 15, "rose.1")                                  # chwost
    return H.outline(im)


# ---------- solna, lava, sznur ----------
def lamp_salt(on, f=0):
    im = H.canvas(16, 16)
    H.rect(im, 3, 12, 12, 14, "wood.1"); H.hline(im, 3, 12, 12, "wood.2")                    # podstawa
    if on:
        tone = [("rose.0", "rose.1", "rose.2"), ("rose.1", "rose.2", "flame.2"), ("rose.1", "rose.2", "rose.2"), ("rose.0", "rose.1", "rose.2")][f % 4]
    else:
        tone = ("linen.0", "rose.0", "linen.2")
    H.rrect(im, 4, 3, 11, 12, 3, (tone[0], tone[1], tone[2], tone[2]))
    H.put(im, 7, 6, tone[2]); H.put(im, 9, 9, tone[0]); H.put(im, 6, 10, tone[0])           # fasety soli
    return seal(im)


def lamp_lava(on, f=0):
    im = H.canvas(16, 32)
    H.rect(im, 4, 27, 11, 30, "hay.1"); H.hline(im, 4, 11, 27, "hay.2"); H.hline(im, 4, 11, 30, "hay.0")   # mosiezna podstawa
    H.rect(im, 5, 22, 10, 26, "hay.0")
    liquid = ["berry.1", "brick.1", "flame.0", "brick.1"][f % 4] if on else "dusk.1"
    blob = "rose.2" if on else "dusk.3"
    H.rrect(im, 4, 3, 11, 24, 3, ("dusk.1", "dusk.2", "dusk.3", "linen.3"))                  # szklo
    H.rect(im, 5, 5, 10, 23, liquid)
    H.vline(im, 5, 5, 22, "linen.3" if not on else "linen.2")                                # odblask na szkle
    # banki: pozycje zaleza od klatki (wznosza sie)
    for i, (x, y0, r) in enumerate(((7, 20, 2), (8, 12, 2), (6, 7, 1))):
        y = (y0 - f * (2 + i)) % 18 + 5
        H.rect(im, x, y, x + r - 1, y + r - 1 + (r > 1), blob)
        H.put(im, x, y, "flame.2" if on else "dusk.4")
    H.rect(im, 6, 2, 9, 3, "hay.1"); H.hline(im, 6, 9, 2, "hay.2")                           # nakretka
    return seal(im)


def fairy_lights(on, f=0):
    im = H.canvas(48, 16)
    pts = [(x, 2 + round(6 * (1 - ((x - 23.5) / 22.5) ** 2))) for x in range(1, 47)]
    for x, y in pts:
        H.put(im, x, y, "plum.2")
    for k, (x, y) in enumerate(pts[::6]):
        ph = (k + f) % 4
        c = ("hay.3", "flame.2", "flame.1", "flame.2")[ph] if on else "linen.1"
        H.rect(im, x, y + 1, x + 1, y + 2, c)
        if on and ph == 0: H.put(im, x, y + 3, "flame.0")
    return H.outline(im, sides="s") if False else im


# ---------- ogrod i park ----------
def torch(on, f=0):
    im = H.canvas(16, 32)
    H.rect(im, 7, 12, 8, 30, "wood.1"); H.vline(im, 7, 12, 30, "wood.2"); H.vline(im, 8, 12, 30, "wood.0")
    H.hline(im, 5, 10, 12, "plum.3"); H.hline(im, 5, 10, 13, "plum.2")                       # zelazna obejma
    H.rect(im, 5, 8, 10, 11, "brick.0" if on else "plum.1"); H.put(im, 6, 9, "brick.1"); H.put(im, 9, 10, "plum.1")
    H.hline(im, 4, 11, 31, "plum.1")
    if on:
        flame(im, 8, 8, 8, f, w=4)
    return seal(im) if False else H.outline(im)


def lamp_oil(on, f=0):
    im = H.canvas(16, 16)
    H.rect(im, 5, 12, 10, 14, "hay.1"); H.hline(im, 5, 10, 12, "hay.2"); H.hline(im, 5, 10, 14, "hay.0")   # korpus mosiezny
    H.rrect(im, 5, 5, 10, 11, 2, ("dusk.2", "dusk.3", "dusk.4", "linen.3"))                    # szklany kominek
    H.rect(im, 6, 2, 9, 4, "hay.0"); H.hline(im, 6, 9, 2, "hay.1")
    H.put(im, 12, 8, "hay.1"); H.put(im, 12, 9, "hay.1"); H.put(im, 11, 7, "hay.1")           # raczka
    if on:
        H.rect(im, 6, 6, 9, 10, "flame.2"); flame(im, 8, 10, 4, f, w=2)
    return seal(im)


def brazier(on, f=0):
    im = H.canvas(16, 16)
    for x in (4, 11):                                                                         # nozki
        H.vline(im, x, 11, 14, "plum.2")
    H.rect(im, 3, 7, 12, 10, "plum.2"); H.hline(im, 3, 12, 7, "plum.3"); H.hline(im, 4, 11, 10, "plum.1")   # misa
    if on:
        H.hline(im, 4, 11, 6, "flame.0"); H.hline(im, 5, 10, 5, "flame.1")
        flame(im, 6, 6, 5, f, w=3); flame(im, 10, 6, 4, f + 1, w=2)
    else:
        H.hline(im, 4, 11, 6, "plum.1"); H.hline(im, 5, 10, 5, "plum.0")
    for x in range(4, 12, 2): H.vline(im, x, 7, 10, "plum.0")                                 # siatka
    return seal(im)


def lantern_garden(on, f=0):
    im = H.canvas(16, 16)
    H.vline(im, 8, 0, 3, "plum.2"); H.rect(im, 5, 3, 10, 4, "plum.2"); H.hline(im, 5, 10, 3, "plum.3")
    H.rect(im, 5, 5, 10, 12, "dusk.3" if not on else "hay.3"); H.rect(im, 6, 6, 9, 11, "dusk.4" if not on else "flame.2")
    for x in (5, 10): H.vline(im, x, 5, 12, "plum.2")
    H.hline(im, 5, 10, 13, "plum.2")
    if on:
        flame(im, 8, 11, 4, f, w=2)
    else:
        H.rect(im, 7, 9, 8, 11, "linen.2")
    return seal(im)


def lamp_post(on, f=0):
    im = H.canvas(16, 16)
    H.rect(im, 7, 7, 8, 13, "plum.2"); H.vline(im, 7, 7, 13, "plum.3")
    H.hline(im, 5, 10, 13, "plum.2"); H.hline(im, 5, 10, 14, "plum.1")
    H.rect(im, 4, 2, 11, 6, "plum.2"); H.hline(im, 4, 11, 1, "plum.3")                       # dach latarni
    H.rect(im, 5, 3, 10, 6, "hay.3" if on else "dusk.4")
    H.hline(im, 5, 10, 3, "flame.2" if on else "dusk.3")
    if on: H.hline(im, 6, 9, 5, "flame.3")
    return H.contact_shadow(H.outline(im), rows=1, spread=0)


SOURCES = {  # id: (funkcja, miejsce, klatki wl., fps, rodzaj w lights.json)
    "candle": (candle, "house", 4, 8, "candle"), "lamp_floor": (lamp_floor, "house", 1, 1, "lamp_floor"),
    "lamp_arc": (lamp_arc, "house", 1, 1, "lamp_arc"), "lantern_paper": (lantern_paper, "house", 1, 1, "lantern_paper"),
    "lamp_salt": (lamp_salt, "house", 4, 1, "lamp_salt"), "lamp_lava": (lamp_lava, "house", 4, 2, "lamp_lava"),
    "fairy_lights": (fairy_lights, "house", 4, 4, "fairy_lights"),
    "torch": (torch, "garden", 4, 8, "torch"), "lamp_oil": (lamp_oil, "garden", 4, 6, "lamp_oil"),
    "brazier": (brazier, "garden", 4, 8, "brazier"), "lantern_garden": (lantern_garden, "garden", 4, 6, "lantern"),
    "lamp_post": (lamp_post, "park", 1, 1, "lamp_street"),
}


def build(ids):
    out = []
    for i in ids:
        fn, place, n, fps, kind = SOURCES[i]
        off = fn(False)
        frames = [fn(True, k) for k in range(n)]
        H.register_states(i, place, off, frames, kind, fps=fps)
        out.append((i, off, frames))
    return out


def preview(built, path, scale=5):
    from PIL import Image
    rows = []
    for i, off, frames in built:
        row = H.sheet([off] + frames, scale)
        rows.append(row)
    W = max(r.width for r in rows)
    sh = Image.new("RGB", (W, sum(r.height for r in rows)), (43, 60, 78))
    y = 0
    for r in rows:
        sh.paste(r, (0, y)); y += r.height
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    sh.save(path)


# ---------- okno wg pory dnia (B3-5) ----------
def window(tod):
    im = H.canvas(32, 32)
    H.rect(im, 2, 2, 29, 29, "wood.2"); H.hline(im, 2, 29, 2, "wood.3"); H.hline(im, 2, 29, 29, "wood.0")   # rama
    sky = {"morning": ("rose.2", "hay.3", "rose.1"), "day": ("dusk.4", "linen.3", "dusk.3"),
           "evening": ("flame.1", "brick.3", "rose.0"), "night": ("plum.0", "dusk.0", "plum.1")}[tod]
    for y in range(5, 27):                                                   # niebo w 3 pasach z ditherem
        t = (y - 5) / 21
        for x in range(5, 27):
            b = (((x + 2 * y) % 4) / 4)
            k = 0 if t + (b - 0.5) * 0.18 < 0.4 else 1 if t + (b - 0.5) * 0.18 < 0.75 else 2
            H.put(im, x, y, sky[k])
    if tod == "day":
        for x in range(8, 14): H.put(im, x, 10, "linen.3")
        for x in range(9, 15): H.put(im, x, 11, "linen.3")
        H.rect(im, 20, 8, 22, 10, "hay.3")
    if tod == "morning":
        H.rect(im, 20, 20, 23, 23, "hay.3"); H.rect(im, 21, 21, 22, 22, "flame.2")
    if tod == "evening":
        H.rect(im, 12, 22, 17, 25, "flame.2"); H.rect(im, 13, 23, 16, 25, "flame.3")
        for x in range(5, 27, 2): H.put(im, x, 26, "plum.2")                  # sylwety dachow
    if tod == "night":
        for y in range(5, 15):                                                              # sierp ksiezyca
            for x in range(17, 28):
                in1 = (x - 22) ** 2 + (y - 10) ** 2 <= 17
                in2 = (x - 24.2) ** 2 + (y - 9) ** 2 <= 13
                if in1 and not in2: H.put(im, x, y, "linen.3")
        for x, y in ((8, 8), (12, 14), (16, 7), (9, 19), (25, 17)): H.put(im, x, y, "dusk.4")
    H.vline(im, 15, 5, 26, "wood.2"); H.vline(im, 16, 5, 26, "wood.1")        # szprosy
    H.hline(im, 5, 26, 15, "wood.2"); H.hline(im, 5, 26, 16, "wood.1")
    H.rect(im, 0, 29, 31, 30, "wood.3"); H.hline(im, 0, 31, 30, "wood.1")      # parapet
    return H.outline(im)


def build_windows():
    for tod in ("morning", "day", "evening", "night"):
        im = window(tod)
        rel = f"house/window_sun_{tod}.png"
        H.save_png(im, H.WORLD_DIR / rel)
        if tod == "day":
            H.register_item("window_sun", "house", im, window_tods={t: f"house/window_sun_{t}.png" for t in
                                                                  ("morning", "day", "evening", "night")})


# ---------- maski snopow swiatla i pylki (B3-5, B3-1) ----------
def _mask(w, h, fn, steps=5):
    """Maska natezenia: RGBA, kolor bialy, alfa = natezenie w 5 stopniach (bez gladkiego gradientu)."""
    from PIL import Image
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            v = max(0.0, min(1.0, fn(x, y)))
            q = round(v * steps) / steps
            if q > 0:
                px[x, y] = (255, 255, 255, round(q * 255))
    return im


def build_masks():
    import math
    out = H.WORLD_DIR / "fx"
    out.mkdir(parents=True, exist_ok=True)
    M = {}
    # snop z okna: trapez od okna w dol i w bok (48x64, okno na gorze)
    M["beam_window"] = _mask(48, 64, lambda x, y: (1 - y / 64) * (1 if abs(x - 24 - (y * 0.25)) < 8 + y * 0.28 else 0) * 0.9)
    # stozek spod abazuru (32x32 od srodka u gory)
    M["cone_shade"] = _mask(32, 32, lambda x, y: (1 - y / 32) * (1 if abs(x - 16) < 3 + y * 0.45 else 0))
    # kominek: polkole na podlodze + sciana (64x48)
    M["cone_fireplace"] = _mask(64, 48, lambda x, y: 1 - math.hypot((x - 32) / 32, (y - 8) / 40) * 1.0)
    # latarnia: kolo (32x32)
    M["glow_round"] = _mask(32, 32, lambda x, y: 1 - math.hypot(x - 15.5, y - 15.5) / 16)
    for n, im in M.items():
        im.save(out / f"{n}.png", optimize=True)
    # pylki w swietle: 4 klatki 16x16, kilka punktow plynie w gore
    import random
    r = random.Random(4)
    pts = [(r.randint(1, 14), r.randint(1, 14)) for _ in range(5)]
    frames = []
    for f in range(4):
        im = H.canvas(16, 16)
        for i, (x, y) in enumerate(pts):
            H.put(im, (x + (f + i) % 2) % 16, (y - f * (1 + i % 2)) % 16, "hay.3" if i % 2 else "flame.3")
        frames.append(im)
    strip = H.canvas(64, 16)
    for i, f in enumerate(frames): strip.alpha_composite(f, (i * 16, 0))
    H.save_png(strip, out / "dust_motes.png")
    return M


if __name__ == "__main__":
    pass
