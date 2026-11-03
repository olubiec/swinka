"""B11-1: interfejs "papier + drewno": ramki 9-slice, przyciski w 3 stanach, separatory, naglowek.
Pliki w assets/ui/, opis w assets/ui/ui.json: {id: {file, size, slice:[l,t,r,b]}} (slice = grubosc nierozciaganych brzegow)."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image

UI_DIR = H.ROOT / "assets/ui"
FG = "outline.fg" if False else None


def _corner_cut(im, w, h, tone):
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): H.put(im, x, y, tone)


def box(w, h, tones, outline="wood.0", inner=None):
    """Ramka: kontur 1 px, 2 px drewna (swiatlo gora-lewo, cien dol-prawo), potem wnetrze."""
    im = H.canvas(w, h)
    lt, base, sh = tones
    H.rect(im, 0, 0, w - 1, h - 1, outline)
    H.rect(im, 1, 1, w - 2, h - 2, base)
    H.hline(im, 1, w - 2, 1, lt); H.vline(im, 1, 1, h - 2, lt)
    H.hline(im, 1, w - 2, h - 2, sh); H.vline(im, w - 2, 1, h - 2, sh)
    _corner_cut(im, w, h, "plum.1"); H.put(im, 1, 1, "wood.3")
    return im


def panel_paper():
    im = box(24, 24, ("wood.3", "wood.2", "wood.1"))
    H.rect(im, 4, 4, 19, 19, "linen.2")
    H.hline(im, 3, 20, 3, "wood.0"); H.hline(im, 3, 20, 20, "wood.0"); H.vline(im, 3, 3, 20, "wood.0"); H.vline(im, 20, 3, 20, "wood.0")
    H.hline(im, 4, 19, 4, "linen.3"); H.hline(im, 4, 19, 19, "linen.1")
    H.vline(im, 19, 4, 19, "linen.1"); H.vline(im, 4, 4, 19, "linen.3")
    return im


def panel_wood():
    im = box(24, 24, ("wood.3", "wood.2", "wood.1"))
    H.rect(im, 4, 4, 19, 19, "wood.1")
    H.hline(im, 3, 20, 3, "wood.0"); H.hline(im, 3, 20, 20, "wood.0"); H.vline(im, 3, 3, 20, "wood.0"); H.vline(im, 20, 3, 20, "wood.0")
    for y in (7, 12, 16): H.hline(im, 4, 19, y, "wood.2")           # slój drewna (rozciaga sie poziomo)
    H.hline(im, 4, 19, 4, "wood.2")
    return im


def button(state):
    w, h = 24, 16
    im = H.canvas(w, h)
    body = {"normal": ("hay.3", "hay.2", "hay.1"), "hover": ("linen.3", "hay.3", "hay.2"), "pressed": ("hay.1", "hay.1", "hay.0")}[state]
    top = 1 if state == "pressed" else 0
    bot = h - 1
    H.rect(im, 0, top, w - 1, bot, "wood.0")
    H.rect(im, 1, top + 1, w - 2, bot - 1, body[1])
    if state != "pressed":
        H.hline(im, 2, w - 3, top + 1, body[0]); H.vline(im, 1, top + 2, bot - 3, body[0])
        H.hline(im, 1, w - 2, bot - 2, body[2]); H.hline(im, 1, w - 2, bot - 1, "wood.2")
    else:
        H.hline(im, 1, w - 2, top + 1, "wood.2"); H.hline(im, 1, w - 2, top + 2, body[2])
    _corner_cut(im, w, h, "plum.1") if state != "pressed" else None
    for x, y in ((0, top), (w - 1, top), (0, bot), (w - 1, bot)): H.put(im, x, y, "plum.1")
    return im


def sep_h():
    im = H.canvas(32, 4)
    H.hline(im, 0, 31, 1, "wood.0"); H.hline(im, 0, 31, 2, "wood.2")
    for x in range(2, 32, 8): H.put(im, x, 2, "hay.2")
    H.hline(im, 0, 31, 3, "plum.1")
    return im


def sep_v():
    im = H.canvas(4, 32)
    H.vline(im, 1, 0, 31, "wood.0"); H.vline(im, 2, 0, 31, "wood.2")
    for y in range(2, 32, 8): H.put(im, 2, y, "hay.2")
    H.vline(im, 3, 0, 31, "plum.1")
    return im


def header_banner():
    w, h = 96, 24
    im = H.canvas(w, h)
    H.rect(im, 0, 3, w - 1, h - 4, "wood.0"); H.rect(im, 1, 4, w - 2, h - 5, "wood.2")
    H.hline(im, 1, w - 2, 4, "wood.3"); H.hline(im, 1, w - 2, h - 5, "wood.1")
    for x in range(6, w - 6, 4): H.hline(im, x, x + 1, 7, "hay.2"); H.hline(im, x, x + 1, h - 8, "hay.2")      # szew z siana
    for x in (0, w - 1):                                           # zaciete konce wstegi
        for y in (3, h - 4): H.put(im, x, y, "plum.1")
    H.hline(im, 2, w - 3, h - 3, "plum.1")
    return im


ITEMS = {"panel_paper": (panel_paper, [8, 8, 8, 8]), "panel_wood": (panel_wood, [8, 8, 8, 8]),
         "btn_normal": (lambda: button("normal"), [6, 6, 6, 6]), "btn_hover": (lambda: button("hover"), [6, 6, 6, 6]),
         "btn_pressed": (lambda: button("pressed"), [6, 6, 6, 6]),
         "sep_h": (sep_h, [0, 0, 0, 0]), "sep_v": (sep_v, [0, 0, 0, 0]), "header_banner": (header_banner, [12, 0, 12, 0])}


def build():
    meta = {}
    for k, (f, sl) in ITEMS.items():
        im = f(); H.save_png(im, UI_DIR / f"{k}.png")
        meta[k] = {"file": f"ui/{k}.png", "size": list(im.size), "slice": sl}
    (UI_DIR / "ui.json").write_text(json.dumps({"note": "9-slice: slice=[lewy,gorny,prawy,dolny] nierozciagane brzegi; sep_*: rozciagac po dluzszej osi lub powtarzac", "items": meta}, indent=1), encoding="utf-8")


def stretch(im, sl, w, h):
    l, t, r, b = sl; W, Hh = im.size
    out = Image.new("RGBA", (w, h))
    xs = [(0, l, 0, l), (l, W - r, l, w - r), (W - r, W, w - r, w)]
    ys = [(0, t, 0, t), (t, Hh - b, t, h - b), (Hh - b, Hh, h - b, h)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            if sx1 <= sx0 or sy1 <= sy0 or dx1 <= dx0 or dy1 <= dy0: continue
            out.alpha_composite(im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST), (dx0, dy0))
    return out


def sheet(path):
    meta = json.loads((UI_DIR / "ui.json").read_text())["items"]
    ld = lambda k: Image.open(UI_DIR / f"{k}.png").convert("RGBA")
    sh = Image.new("RGBA", (280, 150), (60, 90, 60, 255))
    sh.alpha_composite(stretch(ld("panel_paper"), meta["panel_paper"]["slice"], 90, 60), (4, 4))
    sh.alpha_composite(stretch(ld("panel_wood"), meta["panel_wood"]["slice"], 60, 40), (100, 4))
    sh.alpha_composite(stretch(ld("panel_paper"), meta["panel_paper"]["slice"], 40, 24), (166, 4))
    sh.alpha_composite(stretch(ld("panel_wood"), meta["panel_wood"]["slice"], 24, 24), (212, 4))
    for i, st in enumerate(("normal", "hover", "pressed")):
        sh.alpha_composite(stretch(ld("btn_" + st), [6, 6, 6, 6], 60, 18), (4, 70 + i * 22))
    sh.alpha_composite(stretch(ld("btn_normal"), [6, 6, 6, 6], 40, 16), (70, 70))
    sh.alpha_composite(stretch(ld("sep_h"), [0, 0, 0, 0], 32, 4), (70, 100))
    sh.alpha_composite(ld("sep_h").resize((64, 4)), (70, 110))
    sh.alpha_composite(ld("sep_v"), (150, 70))
    sh.alpha_composite(stretch(ld("header_banner"), [12, 0, 12, 0], 130, 24), (150, 100))
    sh.alpha_composite(stretch(ld("header_banner"), [12, 0, 12, 0], 70, 24), (4, 118))
    sh.convert("RGB").resize((sh.width * 4, sh.height * 4), Image.NEAREST).save(path)


def house_frame():
    """Rama planu domku 192x160: dach z siana z kominem, sciany, 5 otworow na pokoje (3 gora, 2 dol) i drzwi.
    Otwory sa przezroczyste; kod wstawia w nie miniatury pokoi 52x40: gora (10,46) (70,46) (130,46), dol (10,100) (70,100)."""
    W_, H_ = 192, 160
    im = H.canvas(W_, H_)
    H.rect(im, 0, 38, W_ - 1, H_ - 1, "wood.0"); H.rect(im, 1, 39, W_ - 2, H_ - 2, "wood.2")
    for y in range(40, H_ - 6, 6): H.hline(im, 1, W_ - 2, y, "wood.1")                        # deski scian
    H.hline(im, 1, W_ - 2, 39, "wood.3"); H.hline(im, 1, W_ - 2, 94, "wood.0"); H.hline(im, 1, W_ - 2, 95, "wood.3")   # pietro
    for k in range(0, 36):                                                                     # dach: strzecha trojkat
        y = 36 - k
        if y < 2: break
        H.hline(im, k * 2 if k * 2 < W_ // 2 else W_ // 2, W_ - 1 - k * 2 if k * 2 < W_ // 2 else W_ // 2, y, "hay.2")
    H.rect(im, 0, 30, W_ - 1, 38, "hay.1"); H.hline(im, 0, W_ - 1, 38, "hay.0"); H.hline(im, 0, W_ - 1, 30, "hay.3")
    for x in range(2, W_, 6): H.vline(im, x, 31, 37, "hay.2")
    H.rect(im, 150, 8, 168, 32, "brick.1"); H.rect(im, 148, 6, 170, 11, "brick.2")           # komin (na dachu)
    for y in (16, 23, 30): H.hline(im, 151, 167, y, "brick.0")
    opens = [(10, 46), (70, 46), (130, 46), (10, 100), (70, 100)]
    for x, y in opens:
        H.rect(im, x - 3, y - 3, x + 54, y + 42, "wood.0"); H.rect(im, x - 2, y - 2, x + 53, y + 41, "wood.3")
        H.rect(im, x, y, x + 51, y + 39, "plum.0")
        for yy in range(y, y + 40): H.hline(im, x, x + 51, yy, (0, 0, 0, 0)) if False else None
    for x, y in opens:                                                                         # otwor: przezroczysty
        for yy in range(y, y + 40):
            for xx in range(x, x + 52): im.putpixel((xx, yy), (0, 0, 0, 0))
        H.hline(im, x - 2, x + 53, y + 42, "wood.1")                                          # parapet
    H.rect(im, 132, 104, 170, 152, "wood.0"); H.rect(im, 134, 106, 168, 152, "wood.1")        # drzwi
    H.rect(im, 134, 106, 168, 110, "wood.3"); H.put(im, 163, 130, "hay.3"); H.put(im, 164, 130, "hay.3")
    H.vline(im, 151, 112, 152, "wood.0")
    H.hline(im, 0, W_ - 1, H_ - 1, "plum.1")
    for x, y in opens: H.rect(im, x - 1, y - 1, x + 52, y + 40, "wood.0")                     # kontur otworu
    for x, y in opens:
        for yy in range(y, y + 40):
            for xx in range(x, x + 52): im.putpixel((xx, yy), (0, 0, 0, 0))
    edge = []
    for yy in range(H_):
        for xx in range(W_):
            if im.getpixel((xx, yy))[3] and any((im.getpixel((xx + dx, yy + dy))[3] if 0 <= xx + dx < W_ and 0 <= yy + dy < H_ else 0) == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): edge.append((xx, yy))
    for xx, yy in edge:
        if yy < H_ - 1: H.put(im, xx, yy, "wood.0")                                          # kontur sylwety
    return im


def shop_panel():
    """Panel sklepu domu 96x64, 9-slice [8,18,8,8]: markiza (dusk + siano) nad papierowym wnetrzem."""
    W_, H_ = 96, 64
    im = box(W_, H_, ("wood.3", "wood.2", "wood.1"))
    H.rect(im, 4, 20, W_ - 5, H_ - 5, "linen.2")
    H.hline(im, 3, W_ - 4, 19, "wood.0"); H.hline(im, 3, W_ - 4, H_ - 4, "wood.0"); H.vline(im, 3, 19, H_ - 4, "wood.0"); H.vline(im, W_ - 4, 19, H_ - 4, "wood.0")
    H.hline(im, 4, W_ - 5, 20, "linen.3"); H.hline(im, 4, W_ - 5, H_ - 5, "linen.1")
    H.rect(im, 1, 1, W_ - 2, 14, "dusk.2")                                                    # markiza
    for x in range(1, W_ - 1):
        if (x // 8) % 2 == 0: H.vline(im, x, 1, 14, "hay.2")
    H.hline(im, 1, W_ - 2, 2, "hay.3")
    for x in range(1, W_ - 1, 8):
        for k in range(3): H.hline(im, x + k, x + 7 - k, 15 + k, "dusk.3" if (x // 8) % 2 else "hay.1")
    return im


ITEMS["shop_panel"] = (shop_panel, [8, 18, 8, 8])


if __name__ == "__main__":
    build()
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sheet(S / "b11-1.png")
    sys.path.insert(0, str(H.ROOT / "tools/art"))
    import style_check as SC
    bad = {k: SC.check_image(UI_DIR / f"{k}.png", "prop", None, None, k) for k in ITEMS}
    print("lint ui:", {k: v for k, v in bad.items() if any(v.values())} or "0 naruszen")

    hf = house_frame(); H.register_item("house_frame", "house", hf)
    import style_check as _SC
    print("lint house_frame:", _SC.check_image(H.WORLD_DIR / "house/house_frame.png", "item", [192, 160], "ground", "house_frame"))
    pv = Image.new("RGBA", (192 + 110, 160), (110, 150, 190, 255))
    back = Image.new("RGBA", (192, 160), (110, 150, 190, 255))
    for x, y in ((10, 46), (70, 46), (130, 46), (10, 100), (70, 100)):
        r_ = Image.open(H.ROOT / "docs/album/przebudowa/b4-9_pokoj_kuki.png").convert("RGBA") if (H.ROOT / "docs/album/przebudowa/b4-9_pokoj_kuki.png").exists() else None
        back.paste((70, 50, 60, 255), (x, y, x + 52, y + 40))
    back.alpha_composite(hf); pv.alpha_composite(back)
    pv.alpha_composite(stretch(Image.open(UI_DIR / "shop_panel.png").convert("RGBA"), [8, 18, 8, 8], 100, 70), (196, 8))
    pv.convert("RGB").resize((pv.width * 3, pv.height * 3), Image.NEAREST).save(S / "b11-4.png")
