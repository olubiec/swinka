"""M2 v2: plyty serii 1-2 (12 x 5 stanow uszkodzenia, plyta 16x16) + rekawy z kartonu 24x24 + manifest.
Plyta: obrecz ze swiatlem z lewej gory, dwa pierscienie rowkow, blysk ukosny, etykieta ze wzorem, otwor.
Rekaw (legenda: karton): tektura + wklejony obrazek, tasma hay[2], reczny napis, lapka-sygnatura.
Uzycie: python3 tools/art/world/records_m2.py"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image

OUT = H.ROOT / "assets/records"
STATES = ["mint", "worn", "scratched", "cracked", "warped"]
BLACK = ("plum.1", "plum.0", "plum.3", "plum.2")          # base, rowek, blysk, obrecz jasna
BORDO = ("berry.0", "plum.1", "rose.0", "berry.1")
OLIVE = ("moss.1", "moss.0", "moss.3", "moss.2")
AMBER = ("flame.0", "brick.1", "flame.3", "flame.1")
ORANGE = ("brick.2", "brick.1", "brick.3", "flame.0")
CREAM = ("linen.1", "linen.0", "linen.3", "linen.2")
HONEY = ("hay.1", "hay.0", "hay.3", "hay.2")
TEAL = ("dusk.1", "dusk.0", "dusk.4", "dusk.2")
BRICK = ("brick.1", "plum.1", "brick.3", "brick.2")
# id, seria, nazwa, rzadkosc, winyl, plamki (kolor|None), etykieta (c1, c2, wzor), motyw
RECORDS = [
    ("s1_poranek", 1, "Poranek w sianie", "common", AMBER, None, ("hay.3", "hay.2", "sun"), "sun"),
    ("s1_marchewka", 1, "Marchewkowy beat", "common", ORANGE, "flame.2", ("moss.2", "moss.3", "stripe"), "carrot"),
    ("s1_deszcz", 1, "Deszcz na dachu", "common", BLACK, None, ("dusk.2", "dusk.4", "dots"), "roof"),
    ("s1_kubek", 1, "Kubek z para", "common", CREAM, "rose.1", ("rose.1", "rose.2", "heart"), "mug"),
    ("s1_nocna", 1, "Nocna sciezka", "rare", BORDO, "hay.3", ("hay.3", "hay.2", "sun"), "night"),
    ("s1_cichy", 1, "Cichy kat", "common", BLACK, None, ("rose.1", "rose.2", "half"), "pillow"),
    ("s2_rosa", 2, "Rosa", "common", OLIVE, "linen.3", ("linen.3", "linen.2", "dots"), "dew"),
    ("s2_pietruszka", 2, "Pietruszka funk", "common", OLIVE, None, ("rose.1", "rose.2", "stripe"), "parsley"),
    ("s2_pszczoly", 2, "Pszczoly", "rare", HONEY, None, ("plum.1", "plum.3", "ring"), "bee"),
    ("s2_wiatr", 2, "Wiatr w trawie", "common", TEAL, None, ("linen.2", "linen.3", "stripe"), "wind"),
    ("s2_dynia", 2, "Dynia", "common", BRICK, None, ("hay.2", "hay.3", "half"), "pumpkin"),
    ("s2_jablka", 2, "Zimowe jablka", "common", BORDO, "rose.1", ("linen.3", "rose.2", "heart"), "apples"),
]


def fleck_pos(seed, n=9):
    s, out = seed * 7919 + 13, []
    while len(out) < n:
        s = (s * 1103515245 + 12345) & 0x7fffffff
        x, y = 2 + s % 12, 2 + (s >> 8) % 12
        if 1.8 < ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** .5 < 6.6: out.append((x, y))
    return out


def disc16(state, vin, fleck, lab, seed):
    base, groove, sheen, rimhi = vin
    light_vinyl = base.split(".")[0] in ("linen", "hay") or base == "flame.0"
    contrast = "wood.0" if light_vinyl else "linen.3"
    im = H.canvas(16, 16)
    cx, cy = 7.5, 7.5; rx, ry = (7.8, 6.0) if state == "warped" else (7.8, 7.8)
    if state == "warped": cy = 8.0
    for y in range(16):
        for x in range(16):
            dx, dy = x - cx, y - cy; r = (dx * dx + dy * dy) ** .5
            e = (dx / rx) ** 2 + (dy / ry) ** 2
            if e > 1: continue
            c = base
            rr = (e ** .5) * 7.8
            if rr > 6.9: c = rimhi if dx + dy < 0 else groove
            elif 5.5 <= rr <= 6.2 or 4.0 <= rr <= 4.6: c = groove
            if 2.6 < rr < 6.8 and ((dx < 0 and dy < 0 and abs(dx - dy) <= 1.6) or (dx > 0 and dy > 0 and abs(dx - dy) <= 1.2 and rr > 5.0)):
                if state != "worn" or rr < 4.4: c = sheen
            H.put(im, x, y, c)
    if fleck:
        for x, y in fleck_pos(seed): 
            if im.getpixel((x, y))[3]: H.put(im, x, y, fleck)
    c1, c2, pat = lab
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5 + (0.5 if state == "warped" else 0); r = (dx * dx + dy * dy) ** .5
            if r <= 3.3:
                H.put(im, x, y, c1 if r > 2.7 or pat == "ring" else c1)
                if r > 2.7: H.put(im, x, y, groove if groove != c1 else c2)
    O = 0.5 if state == "warped" else 0
    def lp(x, y, c): H.put(im, x, y + int(O), c)
    if pat == "stripe": [lp(x, 6, c2) for x in range(5, 11)] + [lp(x, 9, c2) for x in range(5, 11)]
    elif pat == "dots": [lp(x, y, c2) for x, y in ((6, 6), (9, 6), (6, 9), (9, 9))]
    elif pat == "sun": [lp(x, y, c2) for x, y in ((7, 5), (8, 5), (7, 10), (8, 10), (5, 7), (5, 8), (10, 7), (10, 8))]
    elif pat == "heart": [lp(x, y, c2) for x, y in ((6, 6), (9, 6), (6, 7), (7, 7), (8, 7), (9, 7), (7, 8), (8, 8))]
    elif pat == "half": [lp(x, y, c2) for y in range(8, 11) for x in range(5, 11)]
    elif pat == "ring": [lp(x, y, c2) for x, y in ((7, 5), (8, 5), (5, 7), (5, 8), (10, 7), (10, 8), (7, 10), (8, 10))]
    for x, y in ((7, 7), (8, 7), (7, 8), (8, 8)): lp(x, y, "plum.0")
    if state == "worn":
        for x, y in ((3, 6), (4, 11), (10, 12), (12, 5), (6, 3), (11, 10)): 
            if im.getpixel((x, y))[3]: H.put(im, x, y, "linen.1" if not light_vinyl else "wood.2")
        lp(5, 9, "linen.2")
    elif state == "scratched":
        for x, y in ((12, 2), (11, 3), (10, 4), (9, 5), (7, 7), (6, 8), (5, 9), (4, 10), (3, 11)): 
            if im.getpixel((x, y))[3] and (x, y) not in ((7, 7),): H.put(im, x, y, contrast)
        for x, y in ((10, 11), (11, 10), (12, 9)): 
            if im.getpixel((x, y))[3]: H.put(im, x, y, contrast)
    elif state == "cracked":
        for y in range(16):
            for x in range(16):
                if x + y >= 22 and x >= 11 and y >= 10 and im.getpixel((x, y))[3]: im.putpixel((x, y), (0, 0, 0, 0))
        for x, y in ((11, 10), (10, 9), (9, 9), (9, 8)): H.put(im, x, y, "plum.0")
        for x, y in ((11, 9), (10, 8), (9, 7)): H.put(im, x, y, contrast)
        for x, y in ((12, 12), (12, 11)): H.put(im, x, y, "plum.0")
    return H.outline(im)


def pt(im, ox, oy):
    def put(x, y, c):
        if 0 <= x < 18 and 0 <= y < 15: H.put(im, x + ox, y + oy, c)
    def rect(x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): put(x, y, c)
    def sph(cx, cy, rx, ry, ramp):
        for y in range(15):
            for x in range(18):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d <= 1:
                    s = -(((x - cx) / rx) * .7 + ((y - cy) / ry) * .7)
                    put(x, y, ramp[-1] if s > .62 else ramp[1] if s > -.25 else ramp[0])
    def line(x0, y0, x1, y1, c):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1): put(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)
    return put, rect, sph, line


def sleeve(rec):
    kind = rec[7]; rid = rec[0]
    im = H.canvas(24, 24)
    H.rect(im, 1, 1, 22, 22, "linen.2"); H.hline(im, 1, 22, 1, "linen.3"); H.vline(im, 1, 1, 22, "linen.3")
    H.hline(im, 1, 22, 22, "linen.0"); H.vline(im, 22, 1, 22, "linen.0")
    for x in (5, 6, 14, 18): H.put(im, x, 22, "linen.1")                                      # pofaldowany brzeg
    put, rect, sph, line = pt(im, 3, 3)
    BG = {"sun": "hay.2", "carrot": "moss.1", "roof": "dusk.2", "mug": "brick.1", "night": "dusk.0", "pillow": "rose.2",
          "dew": "moss.1", "parsley": "linen.1", "bee": "moss.2", "wind": "dusk.3", "pumpkin": "moss.0", "apples": "linen.1"}[kind]
    rect(0, 0, 17, 14, BG)
    if kind == "sun":
        rect(0, 6, 17, 9, "flame.3"); rect(0, 4, 17, 5, "hay.3")
        sph(9, 8, 4.5, 4.5, ("flame.2", "flame.3", "flame.3"))
        for x, y in ((9, 1), (4, 3), (14, 3), (2, 6), (16, 6)): put(x, y, "hay.3")
        rect(0, 10, 17, 14, "moss.2")
        for x in range(0, 18, 2): put(x, 10, "moss.3")
        sph(14, 10, 3, 2.2, ("hay.1", "hay.2", "hay.3")); line(12, 10, 16, 10, "hay.1")
    elif kind == "carrot":
        rect(0, 12, 17, 14, "wood.1"); put(3, 12, "wood.2"); put(9, 13, "wood.2")
        n = 14
        for i in range(n + 1):
            t = i / n; x, y = 3 + 8 * t, 12 - 8 * t; w = 2.6 * t + .6
            for k in range(-2, 3):
                if abs(k) <= w: put(round(x - k * .7), round(y - k * .7), "flame.2" if k >= 0 else "flame.3")
            if abs(k := 0) == 0 and i in (4, 7, 10): put(round(x + 1), round(y + 1), "brick.2")
        for dx, dy in ((2, -4), (0, -3), (3, -2)): line(11, 4, 11 + dx, 4 + dy, "moss.4")
        line(11, 4, 13, 1, "moss.3"); put(11, 3, "moss.3")
    elif kind == "roof":
        for y in range(4, 13):
            hw = (y - 3) * 1.1
            for x in range(18):
                if abs(x - 8.5) <= hw: put(x, y, "brick.2" if (y + x // 2) % 3 else "brick.1")
        for y in range(4, 13): put(round(8.5 - (y - 3) * 1.1), y, "brick.3")
        rect(13, 2, 15, 6, "brick.1"); rect(13, 2, 15, 2, "brick.3")
        rect(0, 13, 17, 14, "plum.2")
        for x, y in ((2, 1), (5, 3), (12, 0), (15, 7), (1, 8), (16, 11)): line(x, y, x - 1, y + 2, "dusk.4")
    elif kind == "mug":
        rect(4, 5, 11, 12, "linen.2"); rect(4, 5, 5, 12, "linen.3"); rect(10, 5, 11, 12, "linen.1")
        rect(4, 5, 11, 6, "linen.3"); rect(5, 5, 10, 5, "brick.0")
        for x, y in ((6, 8), (9, 8), (6, 9), (7, 9), (8, 9), (9, 9), (7, 10), (8, 10)): put(x, y, "rose.1")
        rect(12, 7, 13, 10, "linen.2"); put(12, 7, "linen.3"); put(12, 10, "linen.1"); put(13, 8, "brick.1"); put(13, 9, "brick.1")
        rect(3, 13, 12, 13, "wood.3"); rect(3, 14, 12, 14, "wood.1")
        for y, x in ((1, 6), (2, 7), (3, 6), (1, 9), (2, 8), (3, 9)): put(x, y, "linen.3")
    elif kind == "night":
        rect(0, 5, 17, 9, "dusk.1"); rect(0, 10, 17, 14, "plum.1")
        sph(5, 5, 3.5, 3.5, ("hay.2", "hay.3", "hay.3"))
        for x, y in ((6, 4), (7, 3), (7, 5), (8, 5), (7, 6)): put(x, y, "dusk.0")
        for x, y in ((11, 2), (14, 4), (16, 1), (3, 10), (9, 7)): put(x, y, "linen.3")
        for x, y, w in ((8, 14, 3), (9, 12, 2), (10, 10, 2)): rect(x - w, y, x + w, y, "plum.3"); rect(x - w, y, x - w, y, "linen.2")
        put(13, 9, "hay.3"); put(15, 8, "hay.2"); put(2, 8, "hay.2")
    elif kind == "pillow":
        sph(8.5, 7, 7, 5.2, ("rose.0", "rose.1", "rose.2"))
        for x in range(2, 16, 2): put(x, 3, "rose.2")
        sph(8.5, 7, 1.4, 1.4, ("linen.1", "linen.2", "linen.3"))
        for x, y in ((6, 6), (11, 6), (7, 9), (10, 9)): put(x, y, "rose.0")
        for x, y in ((14, 1), (15, 2), (16, 1)): put(x, y, "linen.3")
    elif kind == "dew":
        for yy in range(15):
            for xx in range(18):
                u = ((xx - 8.5) - (yy - 7.5) * -1) * .7071; v = ((xx - 8.5) * 1 + (yy - 7.5)) * .7071
                u, v = ((xx - 8.5) + -(yy - 7.5)) * .7071, ((xx - 8.5) + (yy - 7.5)) * .7071
                if (u / 8.2) ** 2 + (v / 3.8) ** 2 <= 1: put(xx, yy, "moss.4" if v < -1.4 else "moss.3" if v < 1.4 else "moss.2")
        line(2, 12, 14, 3, "moss.1"); line(6, 8, 8, 10, "moss.1"); line(9, 6, 11, 8, "moss.1")
        sph(9, 7, 2.6, 3.0, ("dusk.1", "dusk.3", "dusk.4")); put(8, 5, "linen.3"); put(9, 5, "linen.3")
        sph(14, 11, 1.4, 1.6, ("dusk.2", "dusk.3", "dusk.4"))
    elif kind == "parsley":
        for x0 in (6, 9, 12): line(x0, 5, 9, 12, "moss.2")
        for cx, cy in ((4, 3), (9, 2), (14, 3), (6, 6), (12, 6)):
            sph(cx, cy, 3, 2.4, ("moss.1", "moss.3", "moss.4")); put(cx - 1, cy, "moss.2")
        rect(7, 11, 11, 12, "hay.2"); rect(7, 11, 11, 11, "hay.3"); rect(8, 13, 10, 14, "moss.2")
    elif kind == "bee":
        for x, y in ((1, 12), (3, 11), (5, 12)): put(x, y, "rose.1")
        sph(9, 8, 4, 3, ("hay.1", "hay.2", "hay.3"))
        for x in (8, 11): rect(x, 5, x, 11, "plum.0")
        rect(4, 7, 5, 9, "plum.1"); put(3, 6, "plum.0"); put(3, 7, "plum.0")
        sph(8, 3, 2.2, 1.8, ("dusk.3", "linen.3", "linen.3")); sph(12, 3, 2.2, 1.8, ("dusk.3", "linen.3", "linen.3"))
        put(14, 8, "plum.0"); put(15, 9, "plum.0")
        for x in range(15, 18, 2): put(x, 13, "hay.3")
    elif kind == "wind":
        for i, bx in enumerate((1, 4, 7, 10, 13, 16)):
            tx = bx + 4 + i % 2; ty = 4 + (i * 2) % 4
            for k in range(11):
                t = k / 10; x = bx + (tx - bx) * t * t; y = 14 - (14 - ty) * t
                put(round(x), round(y), "moss.2" if i % 2 else "moss.3"); put(round(x) + 1, round(y), "moss.1")
        for x0, y0 in ((1, 2), (9, 1)): line(x0, y0, x0 + 5, y0, "linen.3"); put(x0 + 6, y0 + 1, "linen.3")
    elif kind == "pumpkin":
        sph(9, 9, 6.2, 4.6, ("flame.1", "flame.2", "flame.3"))
        for x in (5, 9, 13): rect(x, 5, x, 13, "flame.1")
        rect(8, 3, 9, 5, "wood.3"); put(10, 3, "wood.2"); put(11, 2, "moss.3"); put(12, 2, "moss.3"); put(12, 3, "moss.3")
        rect(0, 13, 17, 14, "moss.1")
    elif kind == "apples":
        sph(6, 9, 4.2, 4.2, ("berry.0", "berry.1", "rose.1")); put(5, 6, "rose.2")
        sph(12, 8, 3.2, 3.2, ("brick.1", "brick.2", "rose.1")); put(11, 6, "rose.2")
        line(6, 4, 7, 2, "wood.2"); line(12, 4, 13, 2, "wood.2"); put(8, 2, "moss.3"); put(9, 3, "moss.3"); put(14, 2, "moss.3"); put(15, 3, "moss.3")
        rect(0, 13, 17, 14, "wood.3")
    # tasma hay[2] w gornych rogach
    for x0 in (2, 16):
        for k in range(3):
            H.put(im, x0 + k, 2 + k // 2 * 0, "hay.2"); H.put(im, x0 + k, 3, "hay.2"); H.put(im, x0 + k, 2, "hay.3")
    # reczny napis (zawijas) i lapka-sygnatura
    seed = sum(map(ord, rid)); y = 19
    for k in range(13):
        yy = y + ((k + seed) % 3 == 0) - ((k * seed) % 5 == 0)
        H.put(im, 3 + k, yy, "wood.2" if k % 4 else "wood.1")
    for x, yy in ((18, 20), (19, 20), (20, 20), (19, 19), (18, 21), (20, 21)): H.put(im, x, yy, "wood.1")
    return H.outline(im)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True); (OUT / "sleeve").mkdir(exist_ok=True)
    manifest = []
    sheet = Image.new("RGBA", (17 * 5 + 30, 26 * len(RECORDS) // 2 + 2), (120, 110, 100, 255))
    sheet = Image.new("RGBA", (2 * (17 * 5 + 28), 26 * 6 + 2), (120, 110, 100, 255))
    for row, rec in enumerate(RECORDS):
        rid, ser, name, rar, vin, fleck, lab, _ = rec
        discs = {}
        ox, oy = (row // 6) * (17 * 5 + 28), (row % 6) * 26 + 1
        for x, st in enumerate(STATES):
            im = disc16(st, vin, fleck, lab, row + 1); discs[st] = f"{rid}_{st}.png"; H.save_png(im, OUT / discs[st])
            sheet.alpha_composite(im, (ox + x * 17 + 1, oy + 4))
        sl = sleeve(rec); H.save_png(sl, OUT / "sleeve" / f"{rid}.png"); sheet.alpha_composite(sl, (ox + 17 * 5 + 2, oy))
        manifest.append({"id": rid, "series": ser, "name": name, "sleeve": f"sleeve/{rid}.png", "states": discs, "rarity": rar, "tracks": 0})
    (OUT / "manifest.json").write_text(json.dumps({"version": 2, "note": "plyty serii 1-2 (dysk 16x16, rekaw 24x24); stany: mint/worn/scratched/cracked/warped; "
                                              "utwory i cena dostarcza kod/dane", "records": manifest}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    out = H.ROOT / "docs/album/przebudowa/m2_plyty.png"
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(out); print(len(RECORDS))
