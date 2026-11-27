"""Generates the cuy-hay-house texture pack for Cuy Quest: Three Piggies."""

import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "art"))
import handart as H


def make_tileset():
    # 16 tiles, each 16x16, in one horizontal strip (256x16)
    T = 16
    N = 16
    sheet = H.canvas(T * N, T)

    def put_tile(idx, im):
        sheet.alpha_composite(im, (idx * T, 0))

    # 0: Grass + soil ground
    t0 = H.canvas(T, T)
    H.rect(t0, 0, 0, 15, 3, "moss.2")
    H.hline(t0, 0, 15, 0, "moss.4")
    H.hline(t0, 0, 15, 1, "moss.3")
    for x in (2, 7, 12):
        H.put(t0, x, 4, "moss.1")
    H.rect(t0, 0, 4, 15, 15, "wood.1")
    for x, y in ((2, 7), (9, 6), (5, 11), (13, 12), (1, 14)):
        H.put(t0, x, y, "wood.0")
        H.put(t0, x + 1, y, "wood.2")
    put_tile(0, t0)

    # 1: Wooden barn platform
    t1 = H.canvas(T, T)
    H.rrect(t1, 0, 0, 15, 15, 1, ("wood.0", "wood.2", "wood.3", "wood.4"))
    H.hline(t1, 1, 14, 7, "wood.0")
    H.vline(t1, 7, 1, 14, "wood.1")
    H.put(t1, 2, 3, "dusk.3")
    H.put(t1, 13, 3, "dusk.3")
    H.put(t1, 2, 11, "dusk.3")
    H.put(t1, 13, 11, "dusk.3")
    put_tile(1, t1)

    # 2: Park brick wall
    t2 = H.canvas(T, T)
    H.rect(t2, 0, 0, 15, 15, "plum.2")
    for row_y in (0, 5, 10):
        off = 4 if row_y == 5 else 0
        for bx in range(-4 + off, 16, 8):
            x0, x1 = max(0, bx), min(15, bx + 6)
            if x1 > x0:
                H.rrect(t2, x0, row_y, x1, row_y + 3, 0, ("dusk.0", "dusk.1", "dusk.2", "dusk.3"))
    put_tile(2, t2)

    # 3: Lever OFF (tilted left)
    t3 = H.canvas(T, T)
    H.rrect(t3, 3, 12, 12, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.3"))
    for k in range(7):
        H.put(t3, 7 - k // 2, 12 - k, "wood.3")
        H.put(t3, 8 - k // 2, 12 - k, "wood.0")
    H.rrect(t3, 2, 3, 5, 6, 1, ("brick.0", "brick.2", "brick.3", "linen.3"))
    put_tile(3, t3)

    # 4: Lever ON (tilted right, glowing moss/flame)
    t4 = H.canvas(T, T)
    H.rrect(t4, 3, 12, 12, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.3"))
    for k in range(7):
        H.put(t4, 8 + k // 2, 12 - k, "wood.3")
        H.put(t4, 7 + k // 2, 12 - k, "wood.0")
    H.rrect(t4, 10, 3, 13, 6, 1, ("moss.0", "moss.2", "moss.3", "moss.4"))
    put_tile(4, t4)

    # 5: Heavy pressure plate UP
    t5 = H.canvas(T, T)
    H.rrect(t5, 1, 13, 14, 15, 0, ("dusk.0", "dusk.1", "dusk.2", "dusk.3"))
    H.rrect(t5, 2, 10, 13, 12, 1, ("flame.0", "flame.1", "flame.2", "flame.3"))
    put_tile(5, t5)

    # 6: Heavy pressure plate DOWN
    t6 = H.canvas(T, T)
    H.rrect(t6, 1, 13, 14, 15, 0, ("dusk.0", "dusk.1", "dusk.2", "dusk.3"))
    H.hline(t6, 2, 13, 12, "moss.3")
    put_tile(6, t6)

    # 7: Heavy apple crate
    t7 = H.canvas(T, T)
    H.rrect(t7, 0, 0, 15, 15, 1, ("wood.0", "wood.2", "wood.3", "wood.4"))
    H.rect(t7, 3, 3, 12, 12, "wood.1")
    for k in range(10):
        H.put(t7, 3 + k, 3 + k, "wood.3")
        H.put(t7, 12 - k, 3 + k, "wood.2")
    H.rrect(t7, 6, 6, 9, 9, 1, ("brick.1", "brick.2", "brick.3", "linen.3"))
    put_tile(7, t7)

    # 8: Bouncy mushroom
    t8 = H.canvas(T, T)
    H.rrect(t8, 6, 8, 9, 15, 1, ("linen.0", "linen.1", "linen.2", "linen.3"))
    H.rrect(t8, 1, 3, 14, 9, 2, ("rose.0", "rose.1", "rose.2", "linen.3"))
    H.put(t8, 4, 5, "linen.3")
    H.put(t8, 10, 6, "linen.3")
    H.put(t8, 7, 4, "linen.3")
    put_tile(8, t8)

    # 9: Fan OFF
    t9 = H.canvas(T, T)
    H.rrect(t9, 1, 11, 14, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.3"))
    H.rrect(t9, 3, 8, 12, 11, 0, ("dusk.0", "dusk.1", "dusk.2", "dusk.3"))
    H.hline(t9, 4, 11, 7, "dusk.4")
    put_tile(9, t9)

    # 10: Fan ON
    t10 = H.canvas(T, T)
    H.rrect(t10, 1, 11, 14, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.3"))
    H.rrect(t10, 3, 8, 12, 11, 0, ("dusk.1", "dusk.2", "dusk.3", "dusk.4"))
    H.hline(t10, 4, 11, 6, "linen.3")
    H.put(t10, 5, 3, "linen.2")
    H.put(t10, 10, 2, "linen.3")
    put_tile(10, t10)

    # 11: Wooden gate (closed)
    t11 = H.canvas(T, T)
    H.rrect(t11, 4, 0, 11, 15, 0, ("wood.0", "wood.1", "wood.2", "wood.3"))
    H.hline(t11, 4, 11, 4, "dusk.3")
    H.hline(t11, 4, 11, 11, "dusk.3")
    put_tile(11, t11)

    # 12: Small hollow log tunnel (for Kuki)
    t12 = H.canvas(T, T)
    H.rrect(t12, 0, 0, 15, 4, 0, ("wood.0", "wood.1", "wood.2", "wood.3"))
    H.rect(t12, 0, 5, 15, 13, "plum.0")
    H.hline(t12, 0, 15, 14, "wood.1")
    H.hline(t12, 0, 15, 15, "wood.0")
    put_tile(12, t12)

    # 13: Hay rope (chewable by Glen)
    t13 = H.canvas(T, T)
    for y in range(16):
        H.put(t13, 7, y, "hay.2" if y % 2 == 0 else "hay.1")
        H.put(t13, 8, y, "hay.3" if y % 2 == 0 else "hay.0")
    put_tile(13, t13)

    # 14: Goal Cozy House
    t14 = H.canvas(T, T)
    H.rrect(t14, 1, 6, 14, 15, 0, ("linen.0", "linen.1", "linen.2", "linen.3"))
    for k in range(7):
        H.hline(t14, 7 - k, 8 + k, k, "brick.2" if k % 2 else "brick.1")
    H.rrect(t14, 5, 10, 10, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.2"))
    H.put(t14, 9, 13, "hay.3")
    put_tile(14, t14)

    # 15: Golden Clover Star
    t15 = H.canvas(T, T)
    for dx, dy in ((0, -2), (-2, 0), (2, 0), (0, 2)):
        H.rrect(t15, 7 + dx - 1, 7 + dy - 1, 7 + dx + 1, 7 + dy + 1, 1, ("hay.0", "hay.2", "hay.3", "linen.3"))
    H.put(t15, 7, 7, "flame.3")
    H.vline(t15, 7, 10, 13, "moss.3")
    put_tile(15, t15)

    out_path = ROOT / "assets" / "minigames" / "cuy_quest" / "tiles.png"
    H.save_png(sheet, out_path)
    print(f"Saved Cuy Quest tileset: {out_path}")


if __name__ == "__main__":
    make_tileset()
