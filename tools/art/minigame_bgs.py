"""Generate warm, vintage, landscape pixel-art backgrounds for all Cuy minigames.

Follows docs/STYL_SWIATA.md strictly:
- Closed 42-color cuy-hay-house palette (assets/data/style_palette.json)
- Organic jittered Bayer dithering, warm postcard tones, top-left lighting
- Atmospheric perspective (distant hills without outlines, warm puddles of light)
- Zero reuse of full Home room/yard backgrounds from assets/world/bg/.
"""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

from minigame_art_common import (
    REPO_ROOT,
    load_palette,
    dither_gradient_v,
    draw_wood_planks,
    draw_brick_wall,
    draw_vintage_cloud,
    draw_foliage_blob,
    draw_warm_glow,
)

PAL = load_palette()
R = PAL["ramps"]
OUTLINE = PAL["outline"]["fg"]
DEEP = PAL["outline"]["deep"]
OUT_ROOT = REPO_ROOT / "assets" / "minigames"


def ensure_dir(sub: str) -> Path:
    d = OUT_ROOT / sub
    d.mkdir(parents=True, exist_ok=True)
    return d


def _draw_hills_band(draw: ImageDraw.ImageDraw, w: int, h: int, base_y: int, amp1: float, amp2: float, freq1: float, freq2: float, color, phase: float = 0.0):
    pts = []
    for x in range(0, w + 1, 4):
        y = int(base_y - amp1 * math.sin(x * freq1 + phase) - amp2 * math.cos(x * freq2 + phase * 0.7))
        pts.append((x, y))
    pts += [(w, h), (0, h)]
    draw.polygon(pts, fill=color)


# ==============================================================================
# 1. CUY QUEST: THREE PIGGIES (4 warm vintage chapter landscapes)
# ==============================================================================

def gen_cuy_quest_ch1_attic(out: Path):
    """Ch 1: Sunlit Hay Attic — warm honeyed wood, arched skylight onto morning hills, hay bales."""
    w, h = 360, 290
    img = Image.new("RGBA", (w, h), R["wood"][1])
    draw_wood_planks(img, 0, 0, w, h, [R["wood"][1], R["wood"][2], R["wood"][3]], OUTLINE, plank_h=14)
    draw = ImageDraw.Draw(img)

    # Warm roof rafters (light from top-left)
    for rx in (-10, 125, 265):
        draw.polygon([(rx, 0), (rx + 18, 0), (rx + 96, 88), (rx + 78, 88)], fill=R["wood"][3], outline=OUTLINE)
    draw.rectangle([0, 0, w, 12], fill=R["wood"][1], outline=OUTLINE)
    draw.rectangle([0, 82, w, 92], fill=R["wood"][3], outline=OUTLINE)

    # Arched attic window showing morning vintage landscape (dusk.3 -> rose.2 -> flame.2)
    wx0, wy0, wx1, wy1 = 122, 18, 238, 82
    win = Image.new("RGBA", (wx1 - wx0, wy1 - wy0))
    dither_gradient_v(win, 0, 44, [R["dusk"][3], R["dusk"][4], R["linen"][2], R["rose"][2], R["hay"][2]], seed=12)
    wdraw = ImageDraw.Draw(win)
    draw_vintage_cloud(wdraw, 32, 16, 26, R["linen"][3], R["linen"][2], R["dusk"][3])
    draw_vintage_cloud(wdraw, 84, 22, 22, R["linen"][3], R["linen"][2], R["dusk"][3])
    _draw_hills_band(wdraw, wx1 - wx0, wy1 - wy0, 46, 5, 3, 0.05, 0.11, R["dusk"][2])
    _draw_hills_band(wdraw, wx1 - wx0, wy1 - wy0, 54, 4, 2, 0.07, 0.14, R["moss"][2], 1.2)
    img.paste(win, (wx0, wy0))
    draw.rectangle([wx0, wy0, wx1, wy1], outline=OUTLINE, width=2)
    draw.line([(180, wy0), (180, wy1)], fill=R["wood"][3], width=3)
    draw.line([(wx0, 50), (wx1, 50)], fill=R["wood"][3], width=3)

    # Warm honeyed sunbeam puddle on attic floor
    draw_warm_glow(img, 180, 140, 110, R["flame"][2], max_alpha=48)

    # Shelves with preserve jars & potted trailing plant
    for sx in (16, 264):
        draw.rectangle([sx, 128, sx + 78, 134], fill=R["wood"][4], outline=OUTLINE)
        for j, jcol in enumerate([R["rose"][1], R["moss"][3], R["hay"][2]]):
            jx = sx + 8 + j * 22
            draw.rectangle([jx, 108, jx + 14, 127], fill=jcol, outline=OUTLINE)
            draw.rectangle([jx + 2, 104, jx + 12, 108], fill=R["linen"][2], outline=OUTLINE)
            draw.line([(jx + 3, 111), (jx + 3, 123)], fill=R["linen"][3])

    # Loose-edged hay bales & warm floor planks
    for bx, bw, bh in [(8, 56, 34), (58, 44, 26), (272, 62, 36), (318, 36, 24)]:
        by = h - bh - 18
        draw.rectangle([bx, by, bx + bw, by + bh], fill=R["hay"][1], outline=OUTLINE)
        draw.rectangle([bx + 2, by + 2, bx + bw - 2, by + 9], fill=R["hay"][2])
        draw.line([(bx + 4, by + bh // 2), (bx + bw - 4, by + bh // 2)], fill=R["hay"][0])
    draw_wood_planks(img, 0, h - 20, w, h, [R["wood"][2], R["wood"][3], R["wood"][4]], OUTLINE, plank_h=10)
    img.save(out / "bg_ch1_attic.png")


def gen_cuy_quest_ch2_cellar(out: Path):
    """Ch 2: Cozy Root Cellar — warm brick arches, roots, mossy stones, lantern light pools."""
    w, h = 360, 290
    img = Image.new("RGBA", (w, h), R["brick"][0])
    draw_brick_wall(img, 0, 0, w, h - 26, [R["brick"][0], R["brick"][1], R["brick"][2]], OUTLINE, brick_w=18, brick_h=10)
    draw = ImageDraw.Draw(img)

    # Warm wood arch pillars
    for ax in (0, 112, 232, 342):
        draw.rectangle([ax, 0, ax + 18, h - 26], fill=R["wood"][1], outline=OUTLINE)
        draw.line([(ax + 2, 0), (ax + 2, h - 26)], fill=R["wood"][3])
    for cx in (65, 181, 296):
        draw.arc([cx - 48, -10, cx + 48, 62], 0, 180, fill=R["wood"][2], width=6)

    # Organic tree roots
    rng = random.Random(42)
    for rx in range(22, w - 16, 30):
        rlen = rng.randint(18, 48)
        cx = rx
        for ry in range(0, rlen, 4):
            nx = cx + rng.choice([-1, 0, 1])
            draw.line([(cx, ry), (nx, ry + 4)], fill=R["wood"][2], width=max(1, 3 - ry // 20))
            cx = nx

    # Mossy ledges
    for mx, my in [(44, 158), (146, 122), (220, 192), (308, 146)]:
        draw_foliage_blob(draw, mx, my, 14, 6, R["moss"], outline=OUTLINE, seed=mx)

    # Lanterns with warm honey-amber pools
    for lx, ly in [(86, 68), (274, 72)]:
        draw.line([(lx, 0), (lx, ly)], fill=OUTLINE, width=1)
        draw.rectangle([lx - 5, ly, lx + 5, ly + 12], fill=R["flame"][2], outline=OUTLINE)
        draw.rectangle([lx - 7, ly - 3, lx + 7, ly], fill=R["wood"][3], outline=OUTLINE)
        draw.rectangle([lx - 6, ly + 12, lx + 6, ly + 14], fill=R["wood"][3], outline=OUTLINE)
        draw_warm_glow(img, lx, ly + 6, 56, R["flame"][1], max_alpha=85)

    # Dusk underground stream with warm lantern reflection
    dither_gradient_v(img, h - 26, h, [R["dusk"][2], R["dusk"][1], R["dusk"][0]], seed=7)
    draw.line([(0, h - 26), (w, h - 26)], fill=R["dusk"][4])
    for sx in (76, 264):
        draw.line([(sx, h - 16), (sx + 20, h - 16)], fill=R["flame"][2])
    img.save(out / "bg_ch2_cellar.png")


def gen_cuy_quest_ch3_greenhouse(out: Path):
    """Ch 3: Vintage Rooftop Greenhouse — golden evening sky, distant roofs, lush vines, terracotta."""
    w, h = 360, 290
    img = Image.new("RGBA", (w, h))
    # Evening vintage sky from STYL_SWIATA.md
    dither_gradient_v(img, 0, 195, [R["plum"][2], R["rose"][0], R["brick"][3], R["flame"][1], R["hay"][2]], seed=21)
    draw = ImageDraw.Draw(img)

    draw_vintage_cloud(draw, 72, 46, 44, R["hay"][3], R["rose"][2], R["rose"][0])
    draw_vintage_cloud(draw, 268, 36, 52, R["hay"][3], R["rose"][2], R["rose"][0])

    # Distant rolling hills & piggy town rooftops (no harsh outlines)
    _draw_hills_band(draw, w, 200, 178, 8, 4, 0.02, 0.05, R["plum"][2])
    roofs = [(0, 174, 65, 198), (58, 162, 118, 198), (112, 170, 175, 198), (185, 158, 250, 198), (242, 168, 315, 198), (308, 160, 360, 198)]
    for x0, y0, x1, y1 in roofs:
        draw.rectangle([x0, y0 + 14, x1, y1], fill=R["wood"][1])
        mid = (x0 + x1) // 2
        draw.polygon([(x0 - 4, y0 + 14), (mid, y0), (x1 + 4, y0 + 14)], fill=R["brick"][1])
        draw.rectangle([mid - 4, y0 + 20, mid + 4, y0 + 28], fill=R["flame"][2])

    # Conservatory mullions & hanging vines
    for gx in range(0, w + 1, 60):
        draw.line([(gx, 0), (gx, 204)], fill=R["wood"][2], width=3)
    draw.rectangle([0, 0, w, 12], fill=R["wood"][1], outline=OUTLINE)
    draw.line([(0, 72), (w, 72)], fill=R["wood"][2], width=2)
    draw.line([(0, 140), (w, 140)], fill=R["wood"][2], width=2)

    rng = random.Random(77)
    for vx in range(12, w - 12, 18):
        vlen = rng.randint(14, 42)
        for vy in range(12, vlen, 6):
            draw_foliage_blob(draw, vx, vy, 5, 4, R["moss"], seed=vx + vy)

    # Terracotta planter wall & pots
    draw_brick_wall(img, 0, 200, w, h - 22, [R["brick"][1], R["brick"][2], R["brick"][3]], OUTLINE, brick_w=18, brick_h=9)
    draw.rectangle([0, 194, w, 202], fill=R["linen"][2], outline=OUTLINE)
    for px in (28, 102, 182, 266, 328):
        draw.polygon([(px - 10, 194), (px + 10, 194), (px + 7, 178), (px - 7, 178)], fill=R["brick"][2], outline=OUTLINE)
        draw_foliage_blob(draw, px, 172, 11, 7, R["moss"], outline=OUTLINE, seed=px)
    draw_wood_planks(img, 0, h - 22, w, h, [R["wood"][2], R["wood"][3], R["wood"][4]], OUTLINE, plank_h=11)
    img.save(out / "bg_ch3_greenhouse.png")


def gen_cuy_quest_ch4_barn(out: Path):
    """Ch 4: Vintage Twilight Meadow — dusk/rose horizon, crescent moon, windmill, warm barn windows."""
    w, h = 360, 290
    img = Image.new("RGBA", (w, h))
    dither_gradient_v(img, 0, 195, [R["dusk"][0], R["plum"][1], R["plum"][2], R["rose"][0], R["flame"][0]], seed=33)
    draw = ImageDraw.Draw(img)

    rng = random.Random(99)
    for _ in range(48):
        sx, sy = rng.randint(4, w - 5), rng.randint(4, 130)
        draw.point((sx, sy), fill=R["linen"][3] if rng.random() > 0.35 else R["flame"][2])

    # Crescent moon in linen.2..3
    draw.ellipse([278, 20, 314, 56], fill=R["linen"][3])
    draw.ellipse([288, 16, 322, 50], fill=R["dusk"][0])

    # Atmospheric rolling hills (no outlines)
    _draw_hills_band(draw, w, 210, 168, 14, 6, 0.018, 0.045, R["dusk"][1])
    _draw_hills_band(draw, w, 220, 184, 10, 5, 0.025, 0.06, R["moss"][1], 1.1)

    # Cozy wooden barn + glowing window + windmill
    draw.rectangle([38, 136, 92, 176], fill=R["wood"][1], outline=OUTLINE)
    draw.polygon([(34, 136), (65, 116), (96, 136)], fill=R["brick"][1], outline=OUTLINE)
    draw.rectangle([58, 146, 72, 160], fill=R["flame"][2])
    draw_warm_glow(img, 65, 153, 34, R["flame"][1], max_alpha=85)

    draw.polygon([(252, 168), (262, 120), (274, 120), (284, 168)], fill=R["wood"][2], outline=OUTLINE)
    for ang in (35, 125, 215, 305):
        rad = math.radians(ang)
        draw.line([(268, 124), (int(268 + math.cos(rad) * 28), int(124 + math.sin(rad) * 28))], fill=R["linen"][2], width=2)

    # Foreground meadow & fence
    dither_gradient_v(img, 196, h, [R["moss"][2], R["moss"][1], R["moss"][0]], seed=44)
    draw.line([(0, 208), (w, 208)], fill=R["wood"][3], width=2)
    for fx in range(10, w, 24):
        draw.rectangle([fx, 198, fx + 4, 220], fill=R["wood"][2], outline=OUTLINE)
    for fx, fy in [(44, 194), (132, 178), (198, 204), (316, 184)]:
        draw_warm_glow(img, fx, fy, 12, R["flame"][2], max_alpha=100)
        draw.point((fx, fy), fill=R["flame"][3])
    img.save(out / "bg_ch4_barn.png")


# ==============================================================================
# 2. VEGGIE RAIN (warm sunlit veranda + panoramic garden view + 24x24 items)
# ==============================================================================

def gen_veggie_rain_assets(out: Path):
    """Generate warm vintage Gardener's Pantry Veranda bg_pantry.png and 24x24 items.png."""
    w, h = 360, 290
    img = Image.new("RGBA", (w, h))
    draw_wood_planks(img, 0, 0, w, 224, [R["wood"][2], R["wood"][3], R["wood"][4]], OUTLINE, plank_h=14, vertical=True)
    draw = ImageDraw.Draw(img)

    # Wide panoramic arched window looking out onto sunlit vintage garden
    wx0, wy0, wx1, wy1 = 68, 24, 292, 168
    win = Image.new("RGBA", (wx1 - wx0, wy1 - wy0))
    dither_gradient_v(win, 0, 86, [R["dusk"][2], R["dusk"][3], R["dusk"][4], R["linen"][3]], seed=14)
    wdraw = ImageDraw.Draw(win)
    draw_vintage_cloud(wdraw, 44, 24, 38, R["linen"][3], R["linen"][2], R["dusk"][3])
    draw_vintage_cloud(wdraw, 164, 28, 46, R["linen"][3], R["linen"][2], R["dusk"][3])
    _draw_hills_band(wdraw, wx1 - wx0, wy1 - wy0, 86, 8, 4, 0.03, 0.07, R["dusk"][2])
    _draw_hills_band(wdraw, wx1 - wx0, wy1 - wy0, 100, 6, 3, 0.04, 0.09, R["moss"][2], 0.8)
    wdraw.rectangle([0, 108, wx1 - wx0, wy1 - wy0], fill=R["moss"][3])
    for vx in range(14, wx1 - wx0 - 12, 22):
        draw_foliage_blob(wdraw, vx, 114, 7, 5, R["moss"], seed=vx)
    img.paste(win, (wx0, wy0))
    draw.rectangle([wx0, wy0, wx1, wy1], outline=OUTLINE, width=3)
    draw.line([(180, wy0), (180, wy1)], fill=R["wood"][3], width=4)
    draw.line([(wx0, 96), (wx1, 96)], fill=R["wood"][3], width=4)
    draw.rectangle([wx0 - 6, wy1, wx1 + 6, wy1 + 8], fill=R["wood"][4], outline=OUTLINE)

    # Side shelves with preserve jars & dried herbs
    for sx in (8, 300):
        draw.rectangle([sx, 84, sx + 52, 90], fill=R["wood"][4], outline=OUTLINE)
        for j, col in enumerate([R["flame"][1], R["moss"][3]]):
            jx = sx + 6 + j * 22
            draw.rectangle([jx, 66, jx + 14, 83], fill=col, outline=OUTLINE)
            draw.rectangle([jx + 2, 62, jx + 12, 66], fill=R["linen"][2], outline=OUTLINE)

    # Warm sunbeam puddle across veranda floor
    draw_warm_glow(img, 180, 190, 115, R["flame"][2], max_alpha=45)
    draw.rectangle([0, 0, w, 14], fill=R["wood"][1], outline=OUTLINE)
    draw.rectangle([0, 218, w, 226], fill=R["wood"][4], outline=OUTLINE)
    draw_wood_planks(img, 0, 226, w, h, [R["wood"][2], R["wood"][3], R["wood"][4]], OUTLINE, plank_h=12, vertical=False)

    # Wicker harvest basket
    draw.rectangle([308, 222, 348, 250], fill=R["hay"][1], outline=OUTLINE)
    for hy in range(226, 248, 5):
        draw.line([(310, hy), (346, hy)], fill=R["hay"][0])
    draw.arc([312, 206, 344, 232], 180, 360, fill=R["hay"][2], width=3)
    img.save(out / "bg_pantry.png")

    # 24x24 items spritesheet (unchanged crisp sprites)
    sheet = Image.new("RGBA", (24 * 8, 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheet)

    def put_carrot(ox):
        sd.polygon([(ox + 7, 7), (ox + 17, 7), (ox + 12, 21)], fill=R["flame"][1], outline=OUTLINE)
        sd.line([(ox + 10, 10), (ox + 14, 10)], fill=R["flame"][2])
        sd.polygon([(ox + 9, 7), (ox + 12, 2), (ox + 15, 7)], fill=R["moss"][3], outline=OUTLINE)

    def put_cucumber(ox):
        sd.rounded_rectangle([ox + 8, 4, ox + 16, 20], radius=4, fill=R["moss"][2], outline=OUTLINE)
        sd.line([(ox + 10, 7), (ox + 10, 17)], fill=R["moss"][4])

    def put_pepper(ox):
        sd.rounded_rectangle([ox + 6, 7, ox + 18, 20], radius=4, fill=R["brick"][2], outline=OUTLINE)
        sd.rectangle([ox + 10, 4, ox + 14, 8], fill=R["moss"][2], outline=OUTLINE)
        sd.line([(ox + 9, 10), (ox + 9, 16)], fill=R["rose"][2])

    def put_kale(ox):
        for dx, dy in [(12, 8), (8, 13), (16, 13), (12, 16)]:
            sd.ellipse([ox + dx - 5, dy - 5, ox + dx + 5, dy + 5], fill=R["moss"][3], outline=OUTLINE)
        sd.line([(ox + 12, 10), (ox + 12, 20)], fill=R["moss"][4], width=2)

    def put_clover(ox):
        for dx, dy in [(9, 8), (15, 8), (9, 14), (15, 14)]:
            sd.ellipse([ox + dx - 4, dy - 4, ox + dx + 4, dy + 4], fill=R["hay"][2], outline=OUTLINE)
        sd.point((ox + 12, 11), fill=R["flame"][3])
        sd.line([(ox + 12, 14), (ox + 12, 21)], fill=R["hay"][1], width=2)

    def put_onion(ox):
        sd.ellipse([ox + 6, 7, ox + 18, 20], fill=R["plum"][2], outline=DEEP)
        sd.polygon([(ox + 10, 7), (ox + 12, 3), (ox + 14, 7)], fill=R["moss"][1], outline=DEEP)
        sd.line([(ox + 9, 11), (ox + 15, 16)], fill=R["moss"][3])
        sd.line([(ox + 15, 11), (ox + 9, 16)], fill=R["moss"][3])

    def put_choco(ox):
        sd.rectangle([ox + 6, 4, ox + 18, 20], fill=R["wood"][0], outline=DEEP)
        for y in (8, 13):
            sd.line([(ox + 7, y), (ox + 17, y)], fill=R["wood"][2])
        sd.line([(ox + 12, 5), (ox + 12, 19)], fill=R["wood"][2])

    def put_chestnut(ox):
        sd.ellipse([ox + 6, 6, ox + 18, 18], fill=R["brick"][0], outline=DEEP)
        for sx, sy in [(6, 6), (18, 6), (6, 18), (18, 18), (12, 4), (12, 20)]:
            sd.point((ox + sx, sy), fill=R["flame"][2])

    for i, fn in enumerate([put_carrot, put_cucumber, put_pepper, put_kale, put_clover, put_onion, put_choco, put_chestnut]):
        fn(i * 24)
    sheet.save(out / "items.png")


# ==============================================================================
# 3. NYAN CUY (majestic vintage twilight flight — warm dusk/rose/flame horizon)
# ==============================================================================

def gen_nyan_cuy_layers(out: Path):
    """Generate warm vintage twilight 3-layer parallax for Nyan Cuy."""
    w0, h = 360, 290
    sky = Image.new("RGBA", (w0, h))
    # Rich warm vintage evening-to-starlight sky (no pitch-black box!)
    dither_gradient_v(sky, 0, h, [R["dusk"][0], R["plum"][2], R["rose"][0], R["brick"][3], R["flame"][1]], seed=45)
    draw_warm_glow(sky, 115, 135, 90, R["rose"][1], max_alpha=55)
    draw_warm_glow(sky, 278, 70, 52, R["flame"][2], max_alpha=60)
    sdraw = ImageDraw.Draw(sky)

    rng = random.Random(108)
    for _ in range(55):
        sx, sy = rng.randint(2, w0 - 3), rng.randint(2, 155)
        sdraw.point((sx, sy), fill=R["linen"][3] if rng.random() > 0.3 else R["flame"][3])

    # Ringed warm carrot-planet
    px, py = 278, 66
    sdraw.ellipse([px - 17, py - 17, px + 17, py + 17], fill=R["flame"][1], outline=OUTLINE)
    sdraw.ellipse([px - 11, py - 11, px + 7, py + 7], fill=R["flame"][2])
    sdraw.arc([px - 30, py - 8, px + 30, py + 10], 340, 200, fill=R["hay"][3], width=3)

    # Warm linen crescent moon
    sdraw.ellipse([44, 32, 72, 60], fill=R["linen"][3])
    sdraw.ellipse([52, 28, 80, 56], fill=R["dusk"][0])
    sky.save(out / "layer_sky.png")

    # Layer 1: Seamless 720x290 warm sunset clouds + rolling hills with lit cottages
    w1 = 720
    clouds = Image.new("RGBA", (w1, h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(clouds)
    for cx, cy in [(80, 174), (220, 156), (380, 178), (540, 160), (670, 170)]:
        draw_vintage_cloud(cdraw, cx, cy, 62, R["hay"][3], R["rose"][2], R["rose"][0])
    pts = []
    for x in range(0, w1 + 1, 12):
        hy = int(244 + math.sin(x * 2 * math.pi / w1) * 14 + math.cos(x * 4 * math.pi / w1) * 8)
        pts.append((x, hy))
    pts += [(w1, h), (0, h)]
    cdraw.polygon(pts, fill=R["plum"][1])
    for hx in (95, 290, 465, 625):
        hy = int(244 + math.sin(hx * 2 * math.pi / w1) * 14 + math.cos(hx * 4 * math.pi / w1) * 8)
        cdraw.rectangle([hx - 7, hy - 10, hx + 7, hy], fill=R["wood"][1], outline=OUTLINE)
        cdraw.rectangle([hx - 2, hy - 7, hx + 2, hy - 3], fill=R["flame"][2])
    clouds.save(out / "layer_clouds.png")

    # Layer 2: Seamless 720x290 twinkling warm star streaks
    stars = Image.new("RGBA", (w1, h), (0, 0, 0, 0))
    st_draw = ImageDraw.Draw(stars)
    rng2 = random.Random(204)
    for _ in range(36):
        sx = rng2.randint(0, w1 - 12)
        sy = rng2.randint(10, h - 75)
        slen = rng2.randint(4, 10)
        col = R["flame"][3] if rng2.random() < 0.45 else R["linen"][3]
        st_draw.line([(sx, sy), (sx + slen, sy)], fill=col)
    stars.save(out / "layer_stars.png")


# ==============================================================================
# 4. VEGGIE MEMORY (warm wood + linen/hay patchwork runner per STYL_SWIATA.md)
# ==============================================================================

def gen_veggie_memory_assets(out: Path):
    """Generate Gazebo Picnic Table bg_table.png (warm patchwork, no red-white!) and card_back.png."""
    w, h = 360, 290
    img = Image.new("RGBA", (w, h))
    draw_wood_planks(img, 0, 0, w, h, [R["wood"][1], R["wood"][2], R["wood"][3]], OUTLINE, plank_h=16, vertical=False)
    draw = ImageDraw.Draw(img)
    draw.rectangle([4, 4, w - 5, h - 5], outline=R["wood"][4], width=2)

    # Warm linen & hay/wood patchwork runner (honoring STYL_SWIATA.md §6)
    rx0, ry0, rx1, ry1 = 36, 18, w - 36, h - 18
    draw.rectangle([rx0, ry0, rx1, ry1], fill=R["linen"][2], outline=OUTLINE, width=2)
    cell = 16
    for y in range(ry0 + 2, ry1 - 2, cell):
        for x in range(rx0 + 2, rx1 - 2, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                draw.rectangle([x, y, min(rx1 - 2, x + cell - 1), min(ry1 - 2, y + cell - 1)], fill=R["hay"][2])
            else:
                draw.rectangle([x, y, min(rx1 - 2, x + cell - 1), min(ry1 - 2, y + cell - 1)], fill=R["linen"][3])
    draw.rectangle([rx0 + 3, ry0 + 3, rx1 - 4, ry1 - 4], outline=R["wood"][3], width=1)

    # Corner props: teacup, hay bowl, candle jar with warm glow, clover leaves
    draw.ellipse([8, 12, 28, 30], fill=R["linen"][3], outline=OUTLINE)
    draw.ellipse([11, 15, 25, 27], fill=R["hay"][2])
    draw.ellipse([8, h - 34, 30, h - 14], fill=R["wood"][3], outline=OUTLINE)
    draw.ellipse([11, h - 30, 27, h - 18], fill=R["hay"][2])
    draw.rectangle([w - 28, 14, w - 10, 32], fill=R["dusk"][4], outline=OUTLINE)
    draw.rectangle([w - 22, 18, w - 16, 26], fill=R["flame"][2])
    draw_warm_glow(img, w - 19, 20, 34, R["flame"][1], max_alpha=85)
    for cx, cy in [(w - 22, h - 22), (w - 12, h - 14)]:
        draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=R["moss"][3], outline=OUTLINE)
    img.save(out / "bg_table.png")

    cw, ch = 64, 80
    card = Image.new("RGBA", (cw, ch), R["wood"][2])
    cd = ImageDraw.Draw(card)
    cd.rectangle([0, 0, cw - 1, ch - 1], outline=OUTLINE, width=2)
    cd.rectangle([4, 4, cw - 5, ch - 5], fill=R["moss"][1], outline=R["hay"][2], width=2)
    cd.rectangle([8, 8, cw - 9, ch - 9], outline=R["moss"][3], width=1)
    mx, my = cw // 2, ch // 2
    for dx, dy in [(-6, -6), (6, -6), (-6, 6), (6, 6)]:
        cd.ellipse([mx + dx - 6, my + dy - 6, mx + dx + 6, my + dy + 6], fill=R["hay"][2], outline=OUTLINE)
    cd.point((mx, my), fill=R["flame"][3])
    cd.line([(mx, my + 8), (mx, my + 18)], fill=R["hay"][1], width=2)
    card.save(out / "card_back.png")


def main():
    cq = ensure_dir("cuy_quest")
    gen_cuy_quest_ch1_attic(cq)
    gen_cuy_quest_ch2_cellar(cq)
    gen_cuy_quest_ch3_greenhouse(cq)
    gen_cuy_quest_ch4_barn(cq)

    vr = ensure_dir("veggie_rain")
    gen_veggie_rain_assets(vr)

    nc = ensure_dir("nyan_cuy")
    gen_nyan_cuy_layers(nc)

    vm = ensure_dir("veggie_memory")
    gen_veggie_memory_assets(vm)
    print("Rebuilt all vintage landscape backgrounds in", OUT_ROOT)


if __name__ == "__main__":
    main()
