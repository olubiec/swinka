"""Buduje kafle B2. Uzycie: python3 tools/art/world/build_tiles.py [materialy|plener|pokoje|swinki|all]
Zapisuje assets/world/tiles/*.png (x1, indeksowane) + wpisy w tiles.json i arkusz w docs/album/przebudowa/."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import tiles as T
import handart as H
from PIL import Image

OUT = H.ROOT / "docs/album/przebudowa"


def sheet(named, path, cols=10):
    """Arkusz z kaflami powtorzonymi 2x2 (kontrola bezszwowosci) i podpisem kolejnosci."""
    cell = 70
    rows = (len(named) + cols - 1) // cols
    sh = Image.new("RGB", (cols * cell, rows * cell), (36, 24, 36))
    for i, (n, im) in enumerate(named):
        big = Image.new("RGBA", (32, 32))
        for a in (0, 16):
            for b in (0, 16):
                big.alpha_composite(im, (a, b))
        big = big.resize((64, 64), Image.NEAREST)
        sh.paste(big, ((i % cols) * cell + 3, (i // cols) * cell + 3), big)
    OUT.mkdir(parents=True, exist_ok=True)
    sh.save(path)


def reg(named):
    for n, im in named:
        H.break_checkers(im)
        H.register_tile(n, im)
        x2 = H.WORLD_DIR / f"tiles/{n}_x2.png"
        if x2.exists():                       # do B13 stary _x2 zgodny z nowym obrazem
            H.save_png(im.resize((32, 32), Image.NEAREST), x2)


def materialy():
    L = [("mat_deski_jasne", T.planks("wood.3", "wood.1", "wood.4", 1)), ("mat_deski_ciemne", T.planks("wood.2", "wood.0", "wood.3", 2)),
         ("mat_deski_miodowe", T.planks("wood.3", "wood.2", "wood.4", 5)), ("mat_siano", T.straw("hay.1", "hay.0", "hay.2", 3)),
         ("mat_wiklina", T.wicker("wood.3", "wood.1", "wood.4")), ("mat_dzianina", T.knit("brick.2", "brick.1", "brick.3")),
         ("mat_karton", T.planks("linen.1", "linen.0", "linen.2", 7, rows=2, joints=False)), ("mat_ziemia", T.straw("wood.1", "wood.0", "wood.2", 9)),
         ("mat_len", T.knit("linen.2", "linen.1", "linen.3"))]
    sheet(L, OUT / "b2-1_materialy.png")
    return L


def plener():
    L = [("grass_1", T.grass("moss.2", "moss.1", "moss.3", 1)), ("grass_2", T.grass("moss.2", "moss.1", "moss.3", 2)),
         ("grass_park", T.grass("moss.3", "moss.2", "moss.4", 3, regular=True))]
    L += [(f"water_{i}", T.water(i)) for i in range(4)]
    L += [(f"fence_{m:02d}", T.fence(m)) for m in range(16)]
    L += [("memory_stone", T.memory_stone())]
    reg(L)
    sheet(L, OUT / "b2-2_plener.png")
    return L


def pokoje():
    wb = [("wall_bedroom_1", T.paper("linen.2", "rose.1", 1, "flower")), ("wall_bedroom_2", T.paper("dusk.2", "dusk.3", 2, "lattice")),
          ("wall_bedroom_3", T.paper("moss.3", "moss.2", 3, "sprig")), ("wall_bedroom_4", T.paper("brick.3", "brick.2", 4, "dots"))]
    fb = [("floor_bedroom_1", T.planks("wood.3", "wood.1", "wood.4", 11)), ("floor_bedroom_2", T.planks("wood.2", "wood.0", "wood.3", 12)),
          ("floor_bedroom_3", T.wicker("wood.4", "wood.2", "linen.3")), ("floor_bedroom_4", T.knit("rose.0", "berry.1", "rose.1"))]
    wp = [("wall_playroom_1", T.paper("hay.2", "hay.1", 5, "paw")), ("wall_playroom_2", T.paper("dusk.4", "linen.3", 6, "cloud")),
          ("wall_playroom_3", T.paper("rose.2", "rose.1", 7, "heart")), ("wall_playroom_4", T.paper("moss.4", "moss.3", 8, "sprig"))]
    fp = [("floor_playroom_1", T.straw("hay.1", "hay.0", "hay.2", 13)), ("floor_playroom_2", T.wicker("wood.3", "wood.1", "wood.4")),
          ("floor_playroom_3", T.knit("dusk.1", "dusk.0", "dusk.2")), ("floor_playroom_4", T.knit("moss.2", "moss.1", "moss.3"))]
    L = wb + fb + wp + fp
    reg(L)
    sheet(L, OUT / "b2-3_pokoje.png", cols=8)
    return L


def swinki():
    L = [("wall_pig_kuki", T.paper("moss.4", "linen.3", 21, "flower")), ("floor_pig_kuki", T.planks("wood.4", "wood.2", "linen.3", 22)),
         ("wall_pig_ned", T.paper("rose.2", "hay.1", 23, "dots")), ("floor_pig_ned", T.knit("brick.1", "brick.0", "brick.2")),
         ("wall_pig_james", T.paper("dusk.0", "hay.2", 24, "star")), ("floor_pig_james", T.tiles_floor("dusk.1", "dusk.0", "dusk.2", 25)),
         ("wall_pig_glen", T.paper("plum.3", "rose.1", 26, "lattice")), ("floor_pig_glen", T.planks("wood.4", "wood.2", "wood.3", 27)),
         ("wall_pig_racuch", T.paper("dusk.4", "linen.3", 28, "cloud")), ("floor_pig_racuch", T.grass("moss.3", "moss.2", "moss.4", 29, regular=True)),
         ("run_floor", T.grass("moss.3", "moss.2", "moss.4", 30, regular=True)),
         ("wall_memory", T.paper("plum.1", "hay.1", 31, "dots")), ("floor_memory", T.planks("wood.1", "wood.0", "wood.2", 32))]
    reg(L)
    sheet(L, OUT / "b2-4_pokoje_swinek.png", cols=7)
    return L


if __name__ == "__main__":
    part = sys.argv[1] if len(sys.argv) > 1 else "all"
    for name, fn in (("materialy", materialy), ("plener", plener), ("pokoje", pokoje), ("swinki", swinki)):
        if part in ("all", name):
            print(name, len(fn()))
