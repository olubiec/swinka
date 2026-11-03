"""B10: ikony 16x16. Raport odstepstw od palety, sprowadzenie 0-160 do palety legendy (kontur #3a1d17, indeksy bez zmian)
i 13 nowych ikon 161-173 (wpisy w icons.json)."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import numpy as np
from PIL import Image

SHEET = H.ROOT / "assets/icons/icons_16.png"
JSON = H.ROOT / "assets/icons/icons.json"
FILL = sorted(H.PALETTE - {H.OUTLINE_FG, H.OUTLINE_DEEP})
FILLA = np.array(FILL, float)
W = np.array([.30, .55, .15])


def snap(px):
    r, g, b = px[:3]
    if (.3 * r + .59 * g + .11 * b) < 62: return H.OUTLINE_FG
    d = (((FILLA - [r, g, b]) * W) ** 2).sum(1)
    return tuple(int(v) for v in FILLA[d.argmin()])


def report(sheet):
    n = sheet.width // 16; out = []
    for i in range(n):
        a = np.array(sheet.crop((i * 16, 0, i * 16 + 16, 16)))
        off = sum(1 for p in a.reshape(-1, 4) if p[3] and tuple(p[:3]) not in H.PALETTE)
        out.append((i, off))
    return out


def requant(sheet, upto):
    out = sheet.copy()
    for i in range(upto):
        for y in range(16):
            for x in range(16):
                p = sheet.getpixel((i * 16 + x, y))
                if p[3] < 128: out.putpixel((i * 16 + x, y), (0, 0, 0, 0))
                else: out.putpixel((i * 16 + x, y), snap(p) + (255,))
    return out


def new_icons():
    I = {}
    def mk(name, fn):
        im = H.canvas(16, 16); fn(im); H.break_checkers(im); I[name] = H.outline(H.outline(im, sides="") if False else im)
    def candle(im):
        H.rect(im, 6, 6, 9, 13, "linen.2"); H.vline(im, 6, 6, 13, "linen.3"); H.vline(im, 9, 6, 13, "linen.1")
        H.vline(im, 7, 4, 5, "wood.0"); H.put(im, 7, 3, "flame.2"); H.put(im, 7, 2, "flame.3"); H.put(im, 6, 3, "flame.1"); H.put(im, 8, 3, "flame.1")
    def bedroom(im):
        H.rect(im, 1, 8, 14, 12, "wood.2"); H.rect(im, 2, 5, 6, 8, "linen.2"); H.rect(im, 7, 7, 13, 8, "rose.1"); H.hline(im, 1, 14, 8, "wood.3"); H.rect(im, 1, 13, 2, 14, "wood.1"); H.rect(im, 13, 13, 14, 14, "wood.1")
    def run(im):
        H.rect(im, 1, 11, 14, 12, "moss.1"); H.hline(im, 1, 14, 10, "moss.3")
        H.rect(im, 3, 4, 8, 9, "wood.2"); H.rect(im, 9, 6, 12, 9, "hay.2"); H.put(im, 11, 5, "plum.2"); H.put(im, 4, 5, "rose.1")
    def gate(im):
        for x in (2, 6, 10, 13): H.rect(im, x, 4, x + 1, 13, "wood.2"); H.vline(im, x, 4, 13, "wood.3")
        H.rect(im, 1, 6, 14, 7, "wood.1"); H.rect(im, 1, 11, 14, 12, "wood.1")
    def tray(im):
        H.rect(im, 1, 10, 14, 12, "wood.2"); H.hline(im, 1, 14, 10, "wood.3")
        for x, c in ((3, "flame.1"), (7, "moss.2"), (11, "rose.1")): H.rect(im, x, 6, x + 2, 9, c)
    def shop(im):
        for x in range(2, 14): H.rect(im, x, 3, x, 6, "brick.1" if (x // 2) % 2 else "hay.1")
        H.rect(im, 3, 7, 12, 13, "wood.2"); H.rect(im, 6, 9, 9, 13, "plum.0"); H.rect(im, 3, 8, 5, 9, "hay.0")
    def plan(im):
        H.rect(im, 2, 2, 13, 13, "linen.2"); H.hline(im, 2, 13, 2, "linen.3")
        H.rect(im, 4, 4, 11, 11, "dusk.4"); H.vline(im, 7, 4, 11, "wood.1"); H.hline(im, 4, 11, 8, "wood.1"); H.put(im, 9, 6, "brick.2")
    def store(im):
        H.rect(im, 2, 6, 13, 13, "wood.2"); H.hline(im, 2, 13, 6, "wood.3"); H.hline(im, 2, 13, 9, "wood.1")
        H.rect(im, 4, 3, 11, 5, "hay.1"); H.hline(im, 4, 11, 3, "hay.2"); H.rect(im, 7, 10, 8, 11, "hay.3")
    def swatch(im):
        for i, c in enumerate(("brick.2", "hay.2", "moss.2", "dusk.3")): H.rect(im, 2 + (i % 2) * 6, 2 + (i // 2) * 6, 7 + (i % 2) * 6, 7 + (i // 2) * 6, c)
    def wander(im):
        for x, y in ((2, 11), (5, 9), (8, 10), (11, 7), (13, 4)): H.rect(im, x, y, x + 1, y + 1, "plum.2")
        H.hline(im, 2, 13, 13, "moss.2")
    def bond(im):
        for cx, cy in ((5, 8), (10, 8)):
            H.rect(im, cx - 2, cy - 1, cx + 2, cy + 3, "wood.2"); H.rect(im, cx - 1, cy - 2, cx + 1, cy - 2, "wood.3")
        for x in range(5, 11): H.put(im, x, 7, "rose.2")
        H.put(im, 7, 4, "berry.1"); H.put(im, 8, 4, "berry.1"); H.rect(im, 7, 5, 8, 6, "berry.1")
    def rename(im):
        H.rect(im, 2, 11, 13, 13, "wood.2"); H.rect(im, 3, 3, 11, 5, "linen.2"); H.hline(im, 4, 10, 4, "wood.1")
        for k in range(6): H.put(im, 12 - k, 5 + k, "hay.2"); H.put(im, 13 - k, 5 + k, "hay.3")
    def lock(im):
        H.rect(im, 3, 7, 12, 13, "hay.2"); H.hline(im, 3, 12, 7, "hay.3"); H.rect(im, 7, 9, 8, 11, "plum.0")
        H.vline(im, 5, 3, 6, "dusk.3"); H.vline(im, 10, 3, 6, "dusk.3"); H.hline(im, 5, 10, 2, "dusk.3")
    for n, f in (("candle", candle), ("bedroom", bedroom), ("run", run), ("gate", gate), ("tray", tray), ("shop", shop),
                 ("house_plan", plan), ("storage", store), ("swatch", swatch), ("wander", wander), ("bond", bond),
                 ("rename", rename), ("color_lock", lock)):
        mk(n, f)
    return I


if __name__ == "__main__":
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    j = json.loads(JSON.read_text(encoding="utf-8"))
    base = Image.open(SHEET).convert("RGBA")
    n0 = len(j["icons"])
    rep = report(base)
    (H.ROOT / "docs/album/przebudowa").mkdir(parents=True, exist_ok=True)
    print("B10-1: ikony poza paleta:", sum(1 for _, o in rep if o), "z", n0, "; pikseli:", sum(o for _, o in rep))
    if "--apply" in sys.argv:
        out = requant(base, n0)
        new = new_icons()
        full = Image.new("RGBA", (16 * (n0 + len(new)), 16), (0, 0, 0, 0)); full.alpha_composite(out)
        for k, (name, im) in enumerate(new.items()):
            full.alpha_composite(im, (16 * (n0 + k), 0)); j["icons"][name] = n0 + k
        H.save_png(full, SHEET, indexed=False)
        JSON.write_text(json.dumps(j, indent=1, ensure_ascii=False), encoding="utf-8")
        bg = Image.new("RGBA", full.size, (120, 110, 100, 255)); bg.alpha_composite(full)
        rows = [bg.crop((x, 0, min(full.width, x + 16 * 44), 16)) for x in range(0, full.width, 16 * 44)]
        sh = Image.new("RGB", (16 * 44, 20 * len(rows)), (120, 110, 100))
        for i, r in enumerate(rows): sh.paste(r.convert("RGB"), (0, i * 20))
        sh.resize((sh.width * 3, sh.height * 3), Image.NEAREST).save(S / "b10.png")
        print("rep after:", sum(o for _, o in report(full)))
