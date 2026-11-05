"""M3/M4: ikony muzyczne 16x16 dopisane na koniec icons_16.png: 6 odtwarzaczy (m_player_*), 8 sterowania (x_prev/next/shuffle/volume/repeat/scratch/dance/radio;
play i pause juz sa jako 'play'/'pause'), 24 ikony plyt (rec_<id> = dysk mint). Uzycie: python3 tools/art/world/icons_music.py [--apply]"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
import icons_a as A
import icons_ui2 as U
from icons_ui2 import mk, sph, line
from PIL import Image
P = H.put
def R(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if c is None: im.putpixel((x, y), (0, 0, 0, 0))
            else: P(im, x, y, c)


def box(im, x0, y0, x1, y1, a, hi, lo):
    R(im, x0, y0, x1, y1, a); H.hline(im, x0, x1, y0, hi); H.vline(im, x0, y0, y1, hi); H.hline(im, x0, x1, y1, lo); H.vline(im, x1, y0, y1, lo)


def pl_turntable(im):
    box(im, 1, 6, 14, 14, "wood.2", "wood.3", "wood.1"); sph(im, 6.5, 9.5, 4.2, ("plum.1", "plum.2", "plum.3")); sph(im, 6.5, 9.5, 1.3, ("hay.2", "hay.3", "hay.3"))
    line(im, 13, 7, 9, 9, "linen.3"); P(im, 13, 7, "hay.3"); P(im, 12, 12, "hay.2")


def pl_portable(im):
    box(im, 1, 6, 14, 14, "brick.1", "brick.2", "wood.1"); R(im, 5, 3, 10, 5, "wood.3"); R(im, 6, 4, 9, 5, None); H.hline(im, 5, 10, 3, "wood.3")
    H.vline(im, 5, 3, 5, "wood.3"); H.vline(im, 10, 3, 5, "wood.3"); H.hline(im, 2, 13, 9, "wood.1")
    for x in (3, 11): R(im, x, 8, x + 1, 10, "hay.2"); P(im, x, 8, "hay.3"); P(im, x + 1, 10, "hay.1")
    for x in range(3, 14, 2): P(im, x, 12, "brick.3")


def pl_gramophone(im):
    for i in range(9):
        y0 = 7 - i // 2 - (1 if i > 5 else 0); y1 = 8 + i // 2 + (1 if i > 5 else 0); x = 5 + i
        H.vline(im, x, y0, y1, "hay.2")
        P(im, x, y0, "hay.3")
        P(im, x, y1, "hay.1")
    R(im, 12, 3, 14, 12, None); H.vline(im, 14, 2, 13, "hay.3"); H.vline(im, 13, 3, 12, "hay.1"); P(im, 14, 2, "hay.3")
    box(im, 1, 10, 8, 14, "wood.2", "wood.3", "wood.1"); P(im, 3, 9, "hay.3"); P(im, 3, 8, "hay.2"); P(im, 2, 8, "hay.2")


def pl_cassette(im):
    box(im, 1, 3, 14, 13, "linen.2", "linen.3", "linen.0"); R(im, 3, 4, 12, 6, "linen.3"); H.hline(im, 3, 12, 4, "brick.2"); H.hline(im, 4, 11, 6, "wood.2")
    R(im, 3, 8, 12, 11, "plum.1")
    for cx in (5.5, 9.5): sph(im, cx, 9.5, 1.7, ("linen.1", "linen.2", "linen.3"))
    P(im, 5, 9, "plum.0"); P(im, 9, 9, "plum.0")


def pl_jukebox(im):
    for y, w in ((1, 3), (2, 5), (3, 7)): H.hline(im, 7 - w // 2 + 1, 8 + w // 2 - 1, y, "wood.3")
    box(im, 2, 4, 13, 14, "wood.2", "wood.3", "wood.1"); R(im, 4, 5, 11, 9, "dusk.4"); H.hline(im, 4, 11, 5, "dusk.2")
    sph(im, 7.5, 8, 2, ("plum.1", "plum.2", "plum.3")); P(im, 7, 7, "hay.3")
    for x in (4, 6, 8, 10): P(im, x, 11, "flame.2" if x % 4 == 0 else "hay.3")
    R(im, 4, 12, 11, 13, "hay.1"); H.hline(im, 4, 11, 12, "hay.3")


def pl_boombox(im):
    box(im, 1, 5, 14, 13, "dusk.3", "dusk.4", "dusk.1"); H.hline(im, 3, 12, 3, "dusk.2"); P(im, 3, 4, "dusk.2"); P(im, 12, 4, "dusk.2")
    for cx in (4.5, 11.5): sph(im, cx, 9, 2.6, ("dusk.2", "dusk.3", "dusk.4")); sph(im, cx, 9, 1.1, ("dusk.1", "dusk.1", "hay.3"))
    R(im, 6, 7, 9, 8, "linen.3"); P(im, 7, 10, "moss.3"); P(im, 8, 10, "flame.2"); line(im, 13, 5, 14, 1, "linen.2")


def tri(im, pts, c, hi=None):
    for y in range(16):
        for x in range(16):
            pass


def x_next(im):
    for i in range(7): H.vline(im, 3 + i, 3 + i // 1 if False else 3 + (i if i < 4 else 6 - i + 1) * 0 + 0, 12, "wood.2") if False else None
    for i in range(5): H.vline(im, 3 + i, 2 + i, 13 - i, "wood.2"); P(im, 3 + i, 2 + i, "wood.3")
    R(im, 10, 2, 12, 13, "wood.2"); H.vline(im, 10, 2, 13, "wood.3"); H.vline(im, 12, 2, 13, "wood.1")


def x_prev(im):
    for i in range(5): H.vline(im, 12 - i, 2 + i, 13 - i, "wood.2"); P(im, 12 - i, 2 + i, "wood.3")
    R(im, 3, 2, 5, 13, "wood.2"); H.vline(im, 3, 2, 13, "wood.3"); H.vline(im, 5, 2, 13, "wood.1")


def x_shuffle(im):
    for i in range(10): P(im, 2 + i, 12 - i if i < 5 else 7 - (i - 5) * 0, "moss.3")
    line(im, 2, 11, 6, 11, "moss.3"); line(im, 6, 11, 10, 4, "moss.3"); line(im, 2, 4, 6, 4, "moss.2"); line(im, 6, 4, 10, 11, "moss.2"); line(im, 10, 4, 12, 4, "moss.3"); line(im, 10, 11, 12, 11, "moss.2")
    for y in (2, 3, 4, 5, 6): P(im, 11 + 0, y - 0, "moss.4") if False else None
    for x, y in ((13, 4), (12, 3), (12, 5), (13, 11), (12, 10), (12, 12)): P(im, x, y, "moss.4" if y < 8 else "moss.3")


def x_volume(im):
    R(im, 2, 6, 4, 9, "wood.2"); H.vline(im, 2, 6, 9, "wood.3")
    for i in range(4): H.vline(im, 5 + i, 6 - i, 9 + i, "wood.2"); P(im, 5 + i, 6 - i, "wood.3")
    for r, c in ((3, "hay.3"), (5, "hay.2")):
        for dy in range(-r, r + 1): P(im, 9 + r + (1 if abs(dy) < r - 1 else 0) - (abs(dy) // 2), 7 + dy, c) if abs(dy) <= r else None
    H.vline(im, 12, 5, 10, "hay.3"); H.vline(im, 14, 3, 12, "hay.2")


def x_repeat(im):
    H.hline(im, 3, 11, 4, "moss.3"); H.vline(im, 2, 5, 9, "moss.3"); H.hline(im, 3, 10, 12, "moss.2"); H.vline(im, 13, 7, 11, "moss.2")
    R(im, 11, 2, 12, 6, "moss.3") if False else None
    for x, y in ((10, 2), (11, 3), (12, 4), (10, 6), (11, 5)): P(im, x, y, "moss.4")
    for x, y in ((5, 14), (4, 13), (3, 12), (5, 10), (4, 11)): P(im, x, y, "moss.2")
    P(im, 12, 4, "moss.3"); P(im, 3, 12, "moss.2")


def x_scratch(im):
    sph(im, 7, 8, 6, ("plum.1", "plum.2", "plum.3")); sph(im, 7, 8, 1.8, ("hay.2", "hay.3", "hay.3"))
    for x, y in ((11, 2), (10, 3), (9, 4), (4, 11), (3, 12), (5, 10)): P(im, x, y, "linen.3")
    for x, y in ((12, 11), (13, 10), (13, 12), (14, 11)): P(im, x, y, "hay.3")
    P(im, 13, 11, "hay.2")


def x_dance(im):
    sph(im, 4.5, 11.5, 2.3, ("rose.0", "rose.1", "rose.2")); sph(im, 10.5, 9.5, 2.3, ("rose.0", "rose.1", "rose.2"))
    H.vline(im, 6, 2, 11, "rose.1"); H.vline(im, 12, 1, 9, "rose.1"); R(im, 7, 1, 12, 2, "rose.1"); H.hline(im, 7, 12, 1, "rose.2")
    for x, y in ((2, 4), (1, 6), (14, 12), (14, 4)): P(im, x, y, "hay.3")


def x_radio(im):
    box(im, 2, 7, 12, 14, "wood.2", "wood.3", "wood.1"); R(im, 4, 9, 8, 11, "hay.3"); P(im, 6, 9, "brick.2"); P(im, 6, 10, "brick.2"); sph(im, 10, 11, 1, ("hay.1", "hay.2", "hay.3"))
    line(im, 10, 7, 13, 1, "linen.2"); P(im, 13, 1, "linen.3")
    for x, y in ((14, 3), (15, 2), (14, 5), (15, 6)): P(im, x, y, "hay.3")


NEW = {"m_player_turntable": pl_turntable, "m_player_portable": pl_portable, "m_player_gramophone": pl_gramophone, "m_player_cassette": pl_cassette,
       "m_player_jukebox": pl_jukebox, "m_player_boombox": pl_boombox, "x_next": x_next, "x_prev": x_prev, "x_shuffle": x_shuffle, "x_volume": x_volume,
       "x_repeat": x_repeat, "x_scratch": x_scratch, "x_dance": x_dance, "x_radio": x_radio}

if __name__ == "__main__":
    import records_m3 as M3, records_m2 as M2
    j = json.loads(A.JSON.read_text(encoding="utf-8"))
    base = Image.open(A.SHEET).convert("RGBA"); n0 = base.width // 16
    ids = [i for i in NEW if i not in j["icons"]]
    ims = [mk(NEW[i]) for i in ids]
    for r in M2.RECORDS + M3.NEW:
        if f"rec_{r[0]}" not in j["icons"]: ids.append(f"rec_{r[0]}"); ims.append(Image.open(M2.OUT / f"{r[0]}_mint.png").convert("RGBA"))
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sh = Image.new("RGBA", (18 * 14, 18), (120, 110, 100, 255))
    for k, im in enumerate(ims[:14]): sh.alpha_composite(im, (18 * k + 1, 1))
    sh.resize((sh.width * 6, sh.height * 6), Image.NEAREST).save(S / "im.png")
    if "--apply" in sys.argv:
        full = Image.new("RGBA", (16 * (n0 + len(ids)), 16), None); full.alpha_composite(base); css = []
        for k, (i, im) in enumerate(zip(ids, ims)):
            full.alpha_composite(im, (16 * (n0 + k), 0)); j["icons"][i] = n0 + k; css.append(f".icon-{i.replace('_', '-')} {{ --i: {n0 + k}; }}")
        H.save_png(full, A.SHEET, indexed=False)
        A.JSON.write_text(json.dumps(j, indent=1, ensure_ascii=False), encoding="utf-8")
        old = H.ROOT / "docs/icons_css_block.css"; txt = old.read_text(encoding="utf-8").splitlines()
        txt[0] = f"/* C2/C3/UI-2/M4: --icon-count = {n0 + len(ids)} */"
        old.write_text("\n".join(txt + css) + "\n", encoding="utf-8")
        print(len(ids), "nowych, arkusz", n0 + len(ids))
