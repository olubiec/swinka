"""M4: elementy interfejsu odtwarzacza (assets/ui/, wpisy w ui.json) + efekty (nutki, odkrycie plyty, VU) + podglad docs/ui/music_preview.png.
Uzycie: python3 tools/art/world/music_ui_m4.py"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
import ui_a as U
import ui_kit as K
import records_m2 as M2, records_m3 as M3
from PIL import Image, ImageDraw
UI = U.UI_DIR; FX = H.ROOT / "assets/fx"; P = H.put
R = H.rect


def mp_panel():  # korpus mini-odtwarzacza: drewno z mosieznymi nitami w rogach
    im = H.canvas(24, 24)
    R(im, 0, 0, 23, 23, "wood.0"); R(im, 1, 1, 22, 22, "wood.2"); H.hline(im, 1, 22, 1, "wood.3"); H.vline(im, 1, 1, 22, "wood.3")
    H.hline(im, 1, 22, 22, "wood.1"); H.vline(im, 22, 1, 22, "wood.1")
    for x, y in ((3, 3), (20, 3), (3, 20), (20, 20)): P(im, x, y, "hay.2"); P(im, x + 1, y + 1, "hay.0") if x < 20 else None
    for x, y in ((3, 3), (20, 3), (3, 20), (20, 20)): P(im, x, y, "hay.3")
    K.cut(im, 24, 24); return im


def mp_display():  # ciemne okienko tytulu i czasu (LCD): plum + zielony kontur
    im = H.canvas(16, 16)
    R(im, 0, 0, 15, 15, "wood.0"); R(im, 1, 1, 14, 14, "plum.0"); H.hline(im, 1, 14, 1, "plum.1"); H.hline(im, 1, 14, 14, "moss.1"); H.vline(im, 14, 1, 14, "moss.1")
    K.cut(im, 16, 16, 0, 15); return im


def mp_btn(pressed=False):  # okragly przycisk sterowania 20x20, mosiezna obwodka
    im = H.canvas(20, 20); top = 1 if pressed else 0
    for y in range(20):
        for x in range(20):
            d = ((x - 9.5) ** 2 + (y - 9.5 - top * .5) ** 2) ** .5
            if d <= 9.6: P(im, x, y, "wood.0")
            if d <= 8.6: P(im, x, y, "hay.1" if (x + y < 19) != pressed else "hay.0")
            if d <= 7.2: P(im, x, y, "wood.2")
            if d <= 7.2 and x + y < 17 and not pressed: P(im, x, y, "wood.3") if d > 5.8 else None
    return im


def mp_knob():  # galka glosnosci 16x16 z kreska
    im = H.canvas(16, 16)
    for y in range(16):
        for x in range(16):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** .5
            if d <= 7.4: P(im, x, y, "wood.0")
            if d <= 6.4: P(im, x, y, "hay.1")
            if d <= 5.0: P(im, x, y, "wood.2" if x + y > 12 else "wood.3")
    for y in range(3, 8): P(im, 7, y, "linen.3")
    return im


def mp_thumb():  # suwak postepu 8x10 (drewniany klocek z mosiezna kreska)
    im = H.canvas(8, 10)
    R(im, 0, 0, 7, 9, "wood.0"); R(im, 1, 1, 6, 8, "wood.3"); H.vline(im, 1, 1, 8, "wood.4"); H.vline(im, 6, 1, 8, "wood.2"); H.vline(im, 3, 2, 7, "hay.2"); H.vline(im, 4, 2, 7, "hay.0")
    K.cut(im, 8, 10); return im


def shelf_plank():  # polka na plyty: deska 16x8, powtarzac w poziomie
    im = H.canvas(16, 8)
    R(im, 0, 0, 15, 7, "wood.0"); R(im, 0, 1, 15, 6, "wood.2"); H.hline(im, 0, 15, 1, "wood.3"); H.hline(im, 0, 15, 6, "wood.1")
    for x in (4, 11): P(im, x, 3, "wood.1")
    P(im, 7, 4, "wood.3"); P(im, 13, 3, "wood.3")
    return im


def wear_badge(state):  # znaczek stanu 8x8
    im = H.canvas(8, 8)
    R(im, 0, 0, 7, 7, "wood.0"); R(im, 1, 1, 6, 6, {"mint": "moss.3", "worn": "hay.2", "scratched": "flame.2", "cracked": "brick.2", "warped": "dusk.3"}[state])
    for x, y in {"mint": ((3, 2), (4, 2), (3, 3), (4, 3), (3, 4), (4, 4), (2, 3), (5, 3)), "worn": ((2, 3), (3, 4), (5, 2), (4, 5)),
                 "scratched": ((5, 2), (4, 3), (3, 4), (2, 5)), "cracked": ((3, 1), (3, 2), (4, 3), (3, 4), (4, 5)), "warped": ((2, 3), (3, 2), (4, 4), (5, 3))}[state]:
        P(im, x, y, "linen.3" if state in ("mint", "worn", "scratched") else "plum.0")
    K.cut(im, 8, 8); return im


UI_ITEMS = {"mp_panel": (mp_panel, [8] * 4), "mp_display": (mp_display, [5] * 4), "mp_btn": (lambda: mp_btn(), [0] * 4), "mp_btn_pressed": (lambda: mp_btn(True), [0] * 4),
            "mp_knob": (mp_knob, [0] * 4), "mp_thumb": (mp_thumb, [0] * 4), "shelf_plank": (shelf_plank, [0] * 4)}
for st in ("mint", "worn", "scratched", "cracked", "warped"): UI_ITEMS[f"badge_wear_{st}"] = ((lambda s=st: wear_badge(s)), [0] * 4)


def note(frame, col):  # nutka 8x8, 2 klatki (wychylenie): dla tanczacych swinek i odtwarzaczy
    im = H.canvas(8, 8); dx = frame
    H.vline(im, 4 + dx, 1, 5, col[1]); R(im, 2 + dx, 5, 4 + dx, 6, col[0]); P(im, 5 + dx, 1, col[1]); P(im, 6 + dx, 2, col[1])
    return H.outline(im)


def vu(f):  # 4 slupki 12x8 (wskaznik poziomu), klatka f
    im = H.canvas(12, 8)
    for i in range(4):
        h = (2, 5, 3, 6)[(i + f) % 4]
        for k in range(h): P(im, 1 + i * 3, 7 - k, "moss.3" if k < 4 else "flame.2"); P(im, 2 + i * 3, 7 - k, "moss.2" if k < 4 else "brick.2")
    return im


def reveal(f):  # 6 klatek 32x32: rekaw wsuwa sie, dysk wysuwa, blysk
    im = H.canvas(32, 32)
    sl = Image.open(M2.OUT / "sleeve" / "s1_poranek.png").convert("RGBA"); dk = Image.open(M2.OUT / "s1_poranek_mint.png").convert("RGBA")
    t = [0, .25, .5, .75, 1, 1][f]
    im.alpha_composite(sl, (2, int(14 * (1 - min(1, f / 1.5))) + 4)) if False else None
    sy = 4 + int(12 * (1 - min(1, f / 2)))
    if f >= 2: im.alpha_composite(dk, (2 + int(12 * min(1, (f - 1) / 3)), 8))
    im.alpha_composite(sl, (2, sy))
    if f >= 4:
        for x, y in ((28, 4), (27, 3), (29, 5), (28, 5), (28, 3), (3, 28), (4, 28), (3, 27)): P(im, x, y, "hay.3")
        if f == 5:
            for x, y in ((25, 6), (30, 2), (2, 26), (6, 29)): P(im, x, y, "linen.3")
    return im


def nine(dst, src, x, y, w, h, sl):
    l, t, r, b = sl; sw, sh = src.size
    parts = [((0, 0, l, t), (x, y, l, t)), ((sw - r, 0, sw, t), (x + w - r, y, r, t)), ((0, sh - b, l, sh), (x, y + h - b, l, b)), ((sw - r, sh - b, sw, sh), (x + w - r, y + h - b, r, b)),
             ((l, 0, sw - r, t), (x + l, y, w - l - r, t)), ((l, sh - b, sw - r, sh), (x + l, y + h - b, w - l - r, b)), ((0, t, l, sh - b), (x, y + t, l, h - t - b)),
             ((sw - r, t, sw, sh - b), (x + w - r, y + t, r, h - t - b)), ((l, t, sw - r, sh - b), (x + l, y + t, w - l - r, h - t - b))]
    for (a, b2, c, d), (px, py, pw, ph) in parts:
        if pw > 0 and ph > 0 and c > a and d > b2: dst.alpha_composite(src.crop((a, b2, c, d)).resize((pw, ph), Image.NEAREST), (px, py))


def preview():
    ico = Image.open(H.ROOT / "assets/icons/icons_16.png").convert("RGBA"); idx = json.loads((H.ROOT / "assets/icons/icons.json").read_text())["icons"]
    I = lambda n: ico.crop((idx[n] * 16, 0, idx[n] * 16 + 16, 16))
    L = lambda n: Image.open(UI / f"{n}.png").convert("RGBA")
    W, Hh = 340, 200
    im = Image.new("RGBA", (W, Hh), (60, 40, 30, 255)); d = ImageDraw.Draw(im)
    # 1) mini-odtwarzacz
    nine(im, L("mp_panel"), 4, 4, 150, 62, [8] * 4)
    im.alpha_composite(Image.open(M2.OUT / "sleeve/s1_poranek.png").convert("RGBA"), (10, 10)); im.alpha_composite(Image.open(M2.OUT / "s1_poranek_scratched.png").convert("RGBA"), (22, 40))
    nine(im, L("mp_display"), 38, 10, 76, 18, [5] * 4)
    d.text((43, 15), "Morning in hay", fill=(0xef, 0xdc, 0xb8)); d.text((43, 15), "", fill=(0, 0, 0))
    for k in range(70): im.putpixel((40 + k, 34), (0x6f, 0x43, 0x28, 255)) if k > 34 else im.putpixel((40 + k, 34), (0x97, 0xa5, 0x69, 255))
    im.alpha_composite(L("mp_thumb"), (73, 30))
    for k, n in enumerate(("x_prev", "play", "x_next", "x_shuffle")):
        im.alpha_composite(L("mp_btn"), (38 + k * 22, 41)); im.alpha_composite(I(n), (40 + k * 22, 43))
    im.alpha_composite(L("mp_knob"), (130, 14)); im.alpha_composite(I("x_volume"), (131, 36))
    im.alpha_composite(L("mp_display" if False else "mp_display").resize((24, 24)), (120, 40)) if False else None
    for f in range(2): pass
    # 2) polka z plytami
    nine(im, L("panel_paper"), 160, 4, 176, 62, [8] * 4)
    ids = [r[0] for r in (M2.RECORDS[:4] + M3.NEW[:2])]
    for k, rid in enumerate(ids):
        im.alpha_composite(Image.open(M2.OUT / f"{rid}_mint.png").convert("RGBA"), (166 + k * 28, 14))
        im.alpha_composite(L(f"badge_wear_{M2.STATES[k % 5]}"), (178 + k * 28, 28))
    for k in range(7): im.alpha_composite(L("shelf_plank"), (166 + k * 16, 36))
    for k, st in enumerate(M2.STATES): im.alpha_composite(L(f"badge_wear_{st}"), (168 + k * 12, 48))
    # 3) album
    nine(im, L("panel_paper"), 4, 72, 332, 124, [8] * 4)
    show = M2.RECORDS[:4] + M3.NEW[:4] + M3.NEW[6:8] + M3.NEW[11:12]
    for k in range(10):
        x, y = 12 + k * 32, 80
        if k < 7:
            r = show[k]; im.alpha_composite(M3.frame(r[3]), (x, y)); im.alpha_composite(Image.open(M2.OUT / "sleeve" / f"{r[0]}.png").convert("RGBA"), (x + 4, y + 4))
        else:
            im.alpha_composite(M3.empty_slot(), (x + 4, y + 4))
    for k in range(4):
        r = M3.NEW[8 + k]
        im.alpha_composite(M3.frame(r[3]), (12 + k * 32, 114)); im.alpha_composite(Image.open(M2.OUT / "sleeve" / f"{r[0]}.png").convert("RGBA"), (16 + k * 32, 118))
    for k in range(4): im.alpha_composite(M3.empty_slot(), (142 + k * 32, 116))
    for k, n in enumerate(("m_player_turntable", "m_player_portable", "m_player_gramophone", "m_player_cassette", "m_player_jukebox", "m_player_boombox")):
        nine(im, L("slot_on" if k == 0 else "slot"), 12 + k * 24, 150, 20, 20, [4] * 4); im.alpha_composite(I(n), (14 + k * 24, 152))
    for k in range(4):
        im.alpha_composite(note(k % 2, (("rose.1", "rose.2"), ("hay.2", "hay.3"), ("moss.2", "moss.3"), ("dusk.2", "dusk.4"))[k]), (170 + k * 12, 156)) if False else None
    cols = (("rose.1", "rose.2"), ("hay.2", "hay.3"), ("moss.2", "moss.3"), ("dusk.2", "dusk.4"))
    for k in range(4): im.alpha_composite(note(k % 2, cols[k]), (170 + k * 12, 156))
    for f in range(4): im.alpha_composite(vu(f), (230 + f * 14, 156))
    for f in range(6): im.alpha_composite(reveal(f), (160 + f * 0, 0)) if False else None
    return im


if __name__ == "__main__":
    j = json.loads((UI / "ui.json").read_text())
    for k, (f, sl) in UI_ITEMS.items():
        im = f(); H.break_checkers(im); H.save_png(im, UI / f"{k}.png"); j["items"][k] = {"file": f"ui/{k}.png", "size": list(im.size), "slice": sl}
    (UI / "ui.json").write_text(json.dumps(j, indent=1), encoding="utf-8")
    FX.mkdir(exist_ok=True, parents=True)
    cols = (("rose.1", "rose.2"), ("hay.2", "hay.3"), ("moss.2", "moss.3"), ("dusk.2", "dusk.4"))
    strip = Image.new("RGBA", (8 * 8, 8)); [strip.alpha_composite(note(k % 2, cols[k // 2]), (8 * k, 0)) for k in range(8)] if False else None
    strip = Image.new("RGBA", (8 * 8, 8))
    for k in range(8): strip.alpha_composite(note(k % 2, cols[k // 2]), (8 * k, 0))
    H.save_png(strip, FX / "fx_notes.png", indexed=False)
    s = Image.new("RGBA", (48, 8))
    for f in range(4): s.alpha_composite(vu(f), (12 * f, 0))
    H.save_png(s, FX / "fx_vu.png", indexed=False)
    s = Image.new("RGBA", (192, 32))
    for f in range(6): s.alpha_composite(reveal(f), (32 * f, 0))
    H.save_png(s, FX / "fx_record_reveal.png", indexed=False)
    pv = preview(); out = H.ROOT / "docs/ui/music_preview.png"; pv.resize((pv.width * 3, pv.height * 3), Image.NEAREST).save(out)
    print(len(UI_ITEMS), "elementow UI, fx: notes, vu, reveal")
