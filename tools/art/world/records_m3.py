"""M3: plyty serii 3-4 (Nocne zabawy, Retro 70-90) = 12 plyt x 5 stanow + rekawy 24x24 + ramki rzadkosci + pusty slot + ikony plyt.
Przepisuje tez manifest calosci (24 plyty). Uzycie: python3 tools/art/world/records_m3.py"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
import records_m2 as M2
from records_m2 import pt, STATES, BLACK, BORDO, OLIVE, AMBER, ORANGE, CREAM, HONEY, TEAL, BRICK, OUT
from PIL import Image

# id, seria, nazwa, rzadkosc (common/rare/unique), winyl, plamki, etykieta, motyw
NEW = [
    ("s3_ksiezyc", 3, "Ksiezyc", "common", TEAL, None, ("hay.3", "hay.2", "ring"), "moon"),
    ("s3_swietliki", 3, "Swietliki", "rare", BLACK, "hay.3", ("moss.3", "hay.3", "dots"), "fireflies"),
    ("s3_sowa", 3, "Sowa", "common", BORDO, None, ("hay.3", "plum.1", "half"), "owl"),
    ("s3_kolysanka", 3, "Kolysanka", "common", CREAM, "rose.1", ("rose.1", "rose.2", "heart"), "cradle"),
    ("s3_tupot", 3, "Cichy tupot", "common", BLACK, None, ("linen.3", "linen.2", "dots"), "paws"),
    ("s3_sen", 3, "Sen o sianie", "common", AMBER, None, ("hay.3", "hay.2", "stripe"), "haystack"),
    ("s4_disco", 4, "Disco gryzon", "unique", HONEY, "linen.3", ("plum.1", "hay.3", "sun"), "disco"),
    ("s4_synth", 4, "Synth fala", "rare", BORDO, "dusk.3", ("rose.1", "dusk.3", "stripe"), "synth"),
    ("s4_kaseta", 4, "Kaseta mixtape", "rare", ORANGE, None, ("linen.3", "brick.1", "stripe"), "tape"),
    ("s4_radio", 4, "Radio FM", "common", TEAL, None, ("hay.3", "wood.1", "ring"), "radio"),
    ("s4_arcade", 4, "Arcade", "common", BLACK, "moss.3", ("moss.3", "plum.1", "dots"), "arcade"),
    ("s4_taniec", 4, "Taniec w klatce", "unique", CREAM, "rose.1", ("rose.1", "hay.3", "heart"), "dance"),
]
INVADER = ["..#.....#..", "...#...#...", "..#######..", ".##.###.##.", "###########", "#.#######.#", "#.#.....#.#", "...##.##..."]


def motif(kind, put, rect, sph, line):
    if kind == "moon":
        rect(0, 0, 17, 14, "dusk.0")
        for x, y in ((2, 2), (15, 3), (4, 8), (14, 9), (12, 1), (1, 5)): put(x, y, "linen.3")
        sph(9, 6, 5, 5, ("linen.1", "linen.2", "linen.3"))
        for x, y in ((8, 4), (11, 7), (7, 8), (10, 4), (12, 6)): put(x, y, "linen.1")
        rect(0, 12, 17, 14, "plum.1"); [put(x, 11, "plum.1") for x in (2, 3, 8, 9, 14)]
    elif kind == "fireflies":
        rect(0, 0, 17, 14, "plum.0"); rect(0, 11, 17, 14, "moss.0")
        for x in range(0, 18, 2): line(x, 14, x + (1 if x % 4 else -1), 9 + x % 3, "moss.1")
        for x, y in ((4, 3), (10, 5), (14, 2), (7, 8), (13, 9), (2, 7)):
            put(x, y, "hay.3"); [put(x + dx, y + dy, "hay.1") for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
        line(10, 5, 12, 7, "hay.0")
    elif kind == "owl":
        rect(0, 0, 17, 14, "dusk.0"); rect(0, 12, 17, 13, "wood.2"); rect(0, 12, 17, 12, "wood.3")
        sph(15, 2, 1.7, 1.7, ("linen.1", "linen.2", "linen.3"))
        sph(8.5, 7, 4.4, 5.2, ("wood.1", "wood.2", "wood.3")); sph(8.5, 9, 2.4, 3, ("linen.0", "linen.1", "linen.2"))
        for x, y in ((8, 9), (9, 9), (7, 11), (10, 11), (8, 12)): put(x, y, "wood.2")
        [put(x, 2, "wood.1") for x in (5, 6, 11, 12)]; put(5, 3, "wood.1"); put(12, 3, "wood.1")
        sph(6.5, 5, 2.1, 2.1, ("hay.2", "hay.3", "hay.3")); sph(10.5, 5, 2.1, 2.1, ("hay.2", "hay.3", "hay.3"))
        put(7, 5, "plum.0"); put(11, 5, "plum.0"); put(9, 6, "flame.2"); put(8, 12, "flame.2"); put(10, 12, "flame.2")
    elif kind == "cradle":
        rect(0, 0, 17, 14, "dusk.2")
        for x, y in ((2, 2), (15, 1), (6, 1), (12, 4), (1, 7), (16, 8)): put(x, y, "hay.3")
        sph(9, 6, 2.3, 1.9, ("linen.1", "linen.2", "linen.3")); put(8, 5, "plum.0"); put(10, 5, "plum.0"); put(9, 6, "rose.1")
        put(7, 4, "rose.1"); put(11, 4, "rose.1")
        rect(3, 7, 14, 11, "wood.2"); rect(3, 7, 14, 7, "wood.3"); rect(4, 8, 13, 10, "rose.1"); rect(4, 8, 13, 8, "rose.2")
        [put(x, 9, "hay.3") for x in (5, 8, 11)]
        line(1, 11, 3, 13, "wood.1"); line(3, 13, 14, 13, "wood.1"); line(14, 13, 16, 11, "wood.1")
    elif kind == "paws":
        rect(0, 0, 17, 14, "dusk.1"); sph(14, 2, 3.4, 2.8, ("dusk.2", "dusk.3", "dusk.3"))
        for cx, cy in ((4, 13), (10, 11), (5, 7), (11, 5)):
            rect(cx - 1, cy, cx + 1, cy + 1, "linen.2"); rect(cx - 1, cy, cx + 1, cy, "linen.3")
            for dx, dy in ((-2, -1), (-1, -3), (1, -3), (2, -1)): put(cx + dx, cy + dy, "linen.3")
    elif kind == "haystack":
        rect(0, 0, 17, 14, "dusk.1"); rect(0, 11, 17, 14, "moss.0")
        sph(14, 3, 1.8, 1.8, ("linen.1", "linen.2", "linen.3"))
        sph(7.5, 9, 6.6, 4.8, ("hay.1", "hay.2", "hay.3"))
        for x, y in ((4, 8), (7, 6), (10, 9), (6, 11), (12, 10), (9, 12)): line(x, y, x + 2, y - 1, "hay.0")
        for x0, y0 in ((12, 1), (14, 4)):
            rect(x0, y0, x0 + 2, y0, "linen.3"); put(x0 + 1, y0 + 1, "linen.3"); rect(x0, y0 + 2, x0 + 2, y0 + 2, "linen.3")
    elif kind == "disco":
        rect(0, 0, 17, 14, "plum.1"); line(9, 0, 9, 3, "linen.1")
        sph(9, 8, 4.8, 4.8, ("dusk.3", "dusk.4", "linen.3"))
        for y in range(3, 14):
            for x in range(4, 15):
                if ((x - 9) ** 2 + (y - 8) ** 2) <= 21 and (x // 2 + y // 2) % 2: put(x, y, "dusk.2")
        put(7, 5, "linen.3"); put(8, 5, "linen.3"); put(7, 6, "linen.3")
        for x, y in ((2, 3), (15, 11), (3, 12), (15, 3)):
            put(x, y, "hay.3"); [put(x + dx, y + dy, "hay.1") for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
    elif kind == "synth":
        rect(0, 0, 17, 14, "plum.0"); sph(9, 6, 4.8, 4.8, ("flame.1", "flame.2", "rose.1"))
        for y in (7, 9): rect(3, y, 15, y, "plum.0")
        rect(0, 9, 17, 14, "plum.0"); rect(0, 9, 17, 9, "rose.1")
        for y in (11, 13): rect(0, y, 17, y, "berry.1")
        for x in range(-9, 27, 4): line(9 + (x - 9) // 4, 9, x, 14, "berry.1")
        for x, y in ((2, 2), (14, 1), (16, 5), (5, 4)): put(x, y, "linen.3")
    elif kind == "tape":
        rect(0, 0, 17, 14, "dusk.1")
        rect(1, 1, 16, 14, "linen.2"); rect(1, 1, 16, 1, "linen.3"); rect(1, 14, 16, 14, "linen.1")
        rect(3, 2, 14, 5, "linen.3"); rect(3, 2, 14, 2, "brick.2")
        for x in range(4, 13): put(x, 4, "wood.1" if x % 3 else "wood.2")
        rect(3, 7, 14, 12, "plum.1")
        for cx in (6.5, 11.5): sph(cx, 9.5, 2.3, 2.3, ("linen.1", "linen.2", "linen.3")); put(int(cx), 9, "plum.0"); put(int(cx) + 1, 10, "plum.0")
        put(2, 2, "wood.1"); put(15, 2, "wood.1")
    elif kind == "radio":
        rect(0, 0, 17, 14, "moss.0"); line(14, 3, 16, 0, "linen.2")
        rect(1, 3, 16, 13, "wood.2"); rect(1, 3, 16, 3, "wood.3"); rect(1, 13, 16, 13, "wood.1")
        rect(3, 5, 10, 8, "hay.3"); rect(3, 8, 10, 8, "hay.2")
        for x in (4, 6, 8, 10): put(x, 6, "hay.0")
        line(7, 5, 7, 8, "brick.2")
        rect(12, 5, 14, 11, "wood.1")
        for y in (6, 8, 10): put(13, y, "wood.3")
        for cx in (5, 9): sph(cx, 11, 1.4, 1.4, ("hay.1", "hay.2", "hay.3"))
    elif kind == "arcade":
        rect(0, 0, 17, 14, "plum.0"); rect(0, 13, 17, 14, "moss.0")
        for y, row in enumerate(INVADER):
            for x, ch in enumerate(row):
                if ch == "#": put(3 + x // 1 - 0 if False else 3 + x, 2 + y, "moss.4" if y < 2 else "moss.3" if y < 6 else "moss.2")
        for x, y in ((1, 1), (16, 2), (2, 11), (15, 10)): put(x, y, "linen.3")
        put(8, 11, "hay.3"); put(8, 12, "hay.3")
    elif kind == "dance":
        rect(0, 0, 17, 14, "plum.2")
        for y in range(0, 13):
            for x in range(9 - 3 - y // 2, 9 + 4 + y // 2):
                if 0 <= x < 18 and (x + y) % 2 == 0: put(x, y, "plum.3")
        rect(0, 13, 17, 14, "wood.3")
        sph(9, 12, 4.6, 2.6, ("linen.1", "linen.2", "linen.3"))
        line(5, 11, 2, 6, "linen.2"); line(13, 11, 16, 6, "linen.2"); put(2, 5, "rose.1"); put(16, 5, "rose.1"); put(2, 6, "rose.1"); put(16, 6, "rose.1")
        sph(9, 7, 4, 3.6, ("linen.1", "linen.2", "linen.3")); rect(5, 4, 8, 6, "hay.2"); put(6, 4, "hay.3"); put(5, 4, "hay.3")
        rect(4, 4, 5, 6, "rose.1"); rect(13, 4, 14, 6, "rose.1"); put(4, 4, "rose.2")
        put(7, 6, "plum.0"); put(11, 6, "plum.0"); rect(8, 8, 10, 9, "rose.1"); put(9, 8, "rose.2")
        for x, y in ((1, 1), (3, 2), (15, 1), (16, 3)): put(x, y, "hay.3")


def sleeve2(rec):
    rid, kind = rec[0], rec[7]
    im = H.canvas(24, 24)
    H.rect(im, 1, 1, 22, 22, "linen.2"); H.hline(im, 1, 22, 1, "linen.3"); H.vline(im, 1, 1, 22, "linen.3")
    H.hline(im, 1, 22, 22, "linen.0"); H.vline(im, 22, 1, 22, "linen.0")
    for x in (5, 6, 14, 18): H.put(im, x, 22, "linen.1")
    put, rect, sph, line = pt(im, 3, 3)
    motif(kind, put, rect, sph, line)
    for x0 in (2, 16):
        for k in range(3): H.put(im, x0 + k, 3, "hay.2"); H.put(im, x0 + k, 2, "hay.3")
    seed = sum(map(ord, rid))
    for k in range(13):
        yy = 19 + ((k + seed) % 3 == 0) - ((k * seed) % 5 == 0)
        H.put(im, 3 + k, yy, "wood.2" if k % 4 else "wood.1")
    for x, yy in ((18, 20), (19, 20), (20, 20), (19, 19), (18, 21), (20, 21)): H.put(im, x, yy, "wood.1")
    return H.outline(im)


def frame(rar):  # ramka albumu 28x28 (rekaw 24x24 w srodku): drewno / mosiadz / berry
    c = {"common": ("wood.2", "wood.3", "wood.1"), "rare": ("hay.1", "hay.3", "hay.0"), "unique": ("berry.1", "rose.1", "berry.0")}[rar]
    im = H.canvas(28, 28)
    for i in range(2):
        H.rect(im, i, i, 27 - i, 27 - i, c[0] if i == 0 else c[1])
    H.rect(im, 2, 2, 25, 25, (0, 0, 0, 0)) if False else None
    for y in range(2, 26):
        for x in range(2, 26): im.putpixel((x, y), (0, 0, 0, 0))
    H.hline(im, 0, 27, 0, c[1]); H.vline(im, 0, 0, 27, c[1]); H.hline(im, 0, 27, 27, c[2]); H.vline(im, 27, 0, 27, c[2])
    for x, y in ((0, 0), (27, 0), (0, 27), (27, 27)): H.put(im, x, y, c[0])
    if rar == "rare":
        for x, y in ((2, 2), (25, 2), (2, 25), (25, 25)): H.put(im, x, y, "hay.3")
    if rar == "unique":
        for x, y in ((14, 0), (13, 0), (0, 14), (27, 14), (14, 27)): H.put(im, x, y, "hay.3")
        for x, y in ((2, 2), (25, 2), (2, 25), (25, 25)): H.put(im, x, y, "hay.3")
    return H.outline(im)


def empty_slot():  # pusty slot albumu: cien rekawa z kropkowanym obrysem i znakiem zapytania
    im = H.canvas(24, 24)
    H.rect(im, 1, 1, 22, 22, "plum.1")
    for x in range(1, 23):
        if x % 2: H.put(im, x, 1, "plum.2"); H.put(im, x, 22, "plum.2")
    for y in range(1, 23):
        if y % 2: H.put(im, 1, y, "plum.2"); H.put(im, 22, y, "plum.2")
    for x, y in ((10, 7), (11, 7), (12, 7), (13, 8), (13, 9), (12, 10), (11, 11), (11, 12), (11, 14)): H.put(im, x, y, "plum.3")
    return im


if __name__ == "__main__":
    ALL = M2.RECORDS + NEW
    sheet = Image.new("RGBA", (2 * (17 * 5 + 28), 26 * 6 + 2), (120, 110, 100, 255))
    for row, rec in enumerate(NEW):
        rid, ser, name, rar, vin, fleck, lab, _ = rec
        ox, oy = (row // 6) * (17 * 5 + 28), (row % 6) * 26 + 1
        for x, st in enumerate(STATES):
            im = M2.disc16(st, vin, fleck, lab, 13 + row); H.save_png(im, OUT / f"{rid}_{st}.png"); sheet.alpha_composite(im, (ox + x * 17 + 1, oy + 4))
        sl = sleeve2(rec); H.save_png(sl, OUT / "sleeve" / f"{rid}.png"); sheet.alpha_composite(sl, (ox + 17 * 5 + 2, oy))
    for rar in ("common", "rare", "unique"): H.save_png(frame(rar), OUT / f"frame_{rar}.png")
    H.save_png(empty_slot(), OUT / "sleeve_empty.png")
    SER = {1: "Siano & lofi", 2: "Ogrod", 3: "Nocne zabawy", 4: "Retro 70-90"}
    man = [{"id": r[0], "series": r[1], "series_name": SER[r[1]], "name": r[2], "rarity": r[3], "sleeve": f"sleeve/{r[0]}.png",
            "icon": f"rec_{r[0]}", "states": {s: f"{r[0]}_{s}.png" for s in STATES}, "tracks": 0} for r in ALL]
    (OUT / "manifest.json").write_text(json.dumps({
        "version": 3,
        "note": "24 plyty w 4 seriach po 6. Dysk 16x16, rekaw 24x24, ramka albumu 28x28 (frame_<rzadkosc>.png: wood=common, mosiadz=rare, berry=unique), "
                "sleeve_empty.png = pusty slot (cien). Stan uszkodzenia (mint/worn/scratched/cracked/warped) jest STALA cecha egzemplarza, nie rosnie od grania. "
                "Pola 'tracks', cena i dzwieki dostarcza kod/agent audio (patrz docs/PRZEKAZANIE_ODTWARZACZE.md). Ekonomia do dopracowania.",
        "records": man}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(H.ROOT / "docs/album/przebudowa/m3_plyty.png"); print(len(ALL))
