"""M2: plyty serii 1-2 (12 x 5 stanow uszkodzenia, plyta 12x12) + rekawy 16x16 + manifest.
Uzycie: python3 tools/art/world/records_m2.py
-> assets/records/<id>_<stan>.png, assets/records/sleeve/<id>.png, assets/records/manifest.json,
   album docs/album/przebudowa/m2_plyty.png"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image

OUT = H.ROOT / "assets/records"
STATES = ["mint", "worn", "scratched", "cracked", "warped"]
# id, seria, nazwa, kolor winylu, kolor etykiety, motyw, kolor motywu, kolor 2, tlo rekawa
RECORDS = [
    ("s1_poranek", 1, "Poranek w sianie", "dusk.4", "hay.3", "sun", "flame.3", "hay.3", "linen.2"),
    ("s1_marchewka", 1, "Marchewkowy beat", "dusk.4", "flame.2", "carrot", "flame.2", "moss.2", "hay.2"),
    ("s1_deszcz", 1, "Deszcz na dachu", "plum.2", "moss.2", "drop", "dusk.2", "dusk.3", "linen.1"),
    ("s1_kubek", 1, "Kubek z para", "dusk.4", "rose.1", "mug", "rose.1", "linen.3", "linen.2"),
    ("s1_nocna", 1, "Nocna sciezka", "berry.0", "hay.3", "moon", "hay.3", "dusk.4", "dusk.2"),
    ("s1_cichy", 1, "Cichy kat", "plum.2", "linen.3", "cloud", "linen.3", "dusk.2", "rose.2"),
    ("s2_rosa", 2, "Rosa", "moss.2", "linen.3", "drop", "moss.3", "linen.3", "moss.1"),
    ("s2_pietruszka", 2, "Pietruszka funk", "moss.3", "rose.1", "leaf", "moss.4", "moss.2", "linen.2"),
    ("s2_pszczoly", 2, "Pszczoly", "hay.2", "dusk.4", "dots", "dusk.4", "hay.3", "hay.3"),
    ("s2_wiatr", 2, "Wiatr w trawie", "moss.1", "hay.3", "fern", "moss.3", "moss.2", "linen.1"),
    ("s2_dynia", 2, "Dynia", "flame.1", "dusk.4", "pumpkin", "flame.2", "moss.3", "hay.2"),
    ("s2_jablka", 2, "Zimowe jablka", "berry.1", "linen.3", "apple", "rose.1", "moss.3", "linen.2"),
]


def ell(im, cx, cy, rx, ry, c):
    for y in range(im.height):
        for x in range(im.width):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: H.put(im, x, y, c)


def disc12(state, vinyl, label):
    im = H.canvas(12, 12)
    ry = 3.9 if state == "warped" else 5.4
    rx = 6.0 if state == "warped" else 5.4
    ell(im, 5.5, 5.5, rx, ry, vinyl)
    for y in range(12):
        for x in range(12):
            r = ((x - 5.5) ** 2 + (y - 5.5) ** 2) ** .5
            if 3.4 <= r <= 3.9 and im.getpixel((x, y))[3]: H.put(im, x, y, "plum.1")
    ell(im, 5.5, 5.5, 1.8, 1.8, label)
    H.put(im, 5, 5, "wood.0"); H.put(im, 6, 6, "wood.0")
    if state == "worn":
        for x, y in ((2, 3), (8, 2), (9, 8), (3, 8), (7, 9)): H.put(im, x, y, "linen.2")
    if state == "scratched":
        for x, y in ((8, 2), (8, 3), (9, 4), (9, 5), (10, 6), (10, 7)): H.put(im, x, y, "linen.3")
    if state == "cracked":
        for x, y in ((2, 3), (3, 4), (3, 5), (4, 6), (5, 6), (6, 7), (7, 7), (8, 8), (9, 9)): H.put(im, x, y, "linen.1")
    return H.outline(im)


def motif(kind, im, c1, c2, bg):
    if kind == "sun":
        ell(im, 7.5, 7.5, 3, 3, c1)
        for x, y in ((7, 2), (7, 13), (2, 7), (13, 7)): H.put(im, x, y, c2)
    elif kind == "carrot":
        for i, y in enumerate(range(7, 14)):
            w = max(1, 3 - i // 2); H.hline(im, 8 - w // 2, 8 + (w - 1) // 2, y, c1)
        H.put(im, 7, 4, c2); H.put(im, 8, 3, c2); H.put(im, 9, 4, c2)
    elif kind == "drop":
        for x, y in ((5, 4), (9, 3), (6, 8), (10, 9), (8, 12)):
            H.put(im, x, y, c1); H.put(im, x, y + 1, c1)
    elif kind == "mug":
        H.rect(im, 4, 7, 10, 12, c1); H.hline(im, 4, 10, 7, c2); H.vline(im, 11, 8, 11, c1); H.put(im, 12, 9, c1); H.put(im, 12, 10, c1)
        for x in (6, 8): H.put(im, x, 4, c2); H.put(im, x, 3, c2)
    elif kind == "moon":
        ell(im, 7.5, 7.5, 4, 4, c1); ell(im, 10, 6, 3.5, 3.5, bg)
    elif kind == "cloud":
        ell(im, 4.5, 9, 2.5, 2, c1); ell(im, 7.5, 7.5, 3.5, 3, c1); ell(im, 10.5, 9, 2.5, 2, c1)
    elif kind == "leaf":
        for k in range(7): H.put(im, 4 + k, 11 - k, c1); H.put(im, 5 + k, 11 - k, c2)
        H.put(im, 11, 4, c2)
    elif kind == "dots":
        for x, y in ((4, 5), (9, 4), (6, 9), (11, 9)):
            H.put(im, x, y, c1); H.put(im, x + 1, y, c1); H.put(im, x, y + 1, c1); H.put(im, x + 1, y + 1, c2)
        H.hline(im, 3, 12, 12, c2)
    elif kind == "fern":
        H.vline(im, 8, 3, 13, c1)
        for y in range(4, 13, 2): H.put(im, 6, y, c2); H.put(im, 10, y, c2); H.put(im, 5, y - 1, c2); H.put(im, 11, y - 1, c2)
    elif kind == "pumpkin":
        ell(im, 7.5, 9, 4, 3, c1); H.rect(im, 7, 4, 8, 5, c2); H.put(im, 9, 4, c2)
        H.vline(im, 6, 7, 11, c2)
    elif kind == "apple":
        ell(im, 7.5, 9, 4, 4, c1); H.rect(im, 7, 3, 8, 5, c2); H.put(im, 9, 3, c2); H.put(im, 10, 2, c2)


def sleeve(rec):
    _, _, _, _, _, kind, c1, c2, bg = rec
    im = H.canvas(16, 16)
    H.rect(im, 1, 1, 14, 14, bg); H.hline(im, 1, 14, 1, "wood.2"); H.vline(im, 1, 1, 14, "wood.2")
    H.hline(im, 1, 14, 14, "wood.1"); H.vline(im, 14, 1, 14, "wood.1")
    motif(kind, im, c1, c2, bg)
    return H.outline(im)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True); (OUT / "sleeve").mkdir(exist_ok=True)
    manifest = []
    sheet = Image.new("RGBA", (12 * 6 + 22, 14 * len(RECORDS) + 2), (120, 110, 100, 255))
    for row, rec in enumerate(RECORDS):
        rid, ser, name, vinyl, label = rec[:5]
        discs = {}
        for x, st in enumerate(STATES):
            im = disc12(st, vinyl, label); discs[st] = f"{rid}_{st}.png"; H.save_png(im, OUT / discs[st])
            sheet.alpha_composite(im, (x * 13 + 2, row * 14 + 1))
        sl = sleeve(rec); H.save_png(sl, OUT / "sleeve" / f"{rid}.png")
        sheet.alpha_composite(sl, (5 * 13 + 4, row * 14 - 1))
        manifest.append({"id": rid, "series": ser, "name": name, "sleeve": f"sleeve/{rid}.png", "states": discs,
                         "rarity": "common", "tracks": 0})
    (OUT / "manifest.json").write_text(json.dumps({"version": 1, "note": "plyty serii 1-2; stany: mint/worn/scratched/cracked/warped; "
                                              "utwory i cena dostarcza kod/dane", "records": manifest},
                                             indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    out = H.ROOT / "docs/album/przebudowa/m2_plyty.png"
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(out); print(len(RECORDS))
