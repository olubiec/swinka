"""Shared pixel-art helpers for minigame backgrounds in cuy-hay-house vintage style (docs/STYL_SWIATA.md)."""
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[2]
PALETTE_PATH = REPO_ROOT / "assets" / "data" / "style_palette.json"

BAYER_4X4 = [
    [0 / 16.0, 8 / 16.0, 2 / 16.0, 10 / 16.0],
    [12 / 16.0, 4 / 16.0, 14 / 16.0, 6 / 16.0],
    [3 / 16.0, 11 / 16.0, 1 / 16.0, 9 / 16.0],
    [15 / 16.0, 7 / 16.0, 13 / 16.0, 5 / 16.0],
]


def hex_to_rgba(h: str, a: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def load_palette() -> dict:
    with open(PALETTE_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    ramps = {k: [hex_to_rgba(c) for c in v] for k, v in raw["ramps"].items()}
    outline = {k: hex_to_rgba(v) for k, v in raw["outline"].items()}
    return {"ramps": ramps, "outline": outline, "raw": raw}


def break_checkerboard(img: Image.Image):
    """Break rigid 4x4 checkerboard artifacts (matches tools/art/world/garden_bg.py)."""
    px = img.load()
    w, h = img.size
    for y in range(h - 3):
        for x in range(w - 3):
            a, b = px[x, y], px[x + 1, y]
            if a != b and all(px[x + i, y + j] == (a if (i + j) % 2 == 0 else b) for i in range(4) for j in range(4)):
                px[x + 1, y + 1] = a if (x + y) % 2 else b
                px[x + 2, y + 2] = a if (x + y) % 2 == 0 else b


def dither_gradient_v(img: Image.Image, y0: int, y1: int, colors: list[tuple[int, int, int, int]], x0: int = 0, x1: int | None = None, seed: int = 5):
    """Organic jittered Bayer vertical gradient in strict palette stops."""
    w, h = img.size
    if x1 is None:
        x1 = w
    y0 = max(0, y0)
    y1 = min(h, y1)
    if y1 <= y0 or not colors:
        return
    px = img.load()
    n = len(colors) - 1
    span = max(1, y1 - y0 - 1)
    rj = random.Random(seed)
    for y in range(y0, y1):
        t = (y - y0) / span
        if n == 0:
            c = colors[0]
            for x in range(max(0, x0), min(w, x1)):
                px[x, y] = c
            continue
        pos = t * n
        idx = min(n - 1, int(pos))
        frac = pos - idx
        c_a, c_b = colors[idx], colors[idx + 1]
        row = BAYER_4X4[y & 3]
        for x in range(max(0, x0), min(w, x1)):
            thresh = row[x & 3] + 0.03 + rj.uniform(-0.16, 0.16)
            px[x, y] = c_b if frac > thresh else c_a
    break_checkerboard(img)


def draw_wood_planks(img: Image.Image, x0: int, y0: int, x1: int, y1: int, wood: list, outline: tuple, plank_h: int = 12, vertical: bool = False):
    """Hand-crafted wooden planks with top-left highlight, dark seam, knots and slight organic joints."""
    draw = ImageDraw.Draw(img)
    draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill=wood[1])
    rng = random.Random(17)
    if vertical:
        for x in range(x0, x1, plank_h):
            draw.line([(x, y0), (x, y1 - 1)], fill=outline)
            if x + 1 < x1:
                draw.line([(x + 1, y0), (x + 1, y1 - 1)], fill=wood[2])
            if x + plank_h - 1 < x1:
                draw.line([(x + plank_h - 1, y0), (x + plank_h - 1, y1 - 1)], fill=wood[0])
            for ky in range(y0 + 8 + rng.randint(0, 14), y1 - 6, 34):
                draw.ellipse([x + plank_h // 2 - 1, ky, x + plank_h // 2 + 1, ky + 3], fill=wood[0])
    else:
        for y in range(y0, y1, plank_h):
            draw.line([(x0, y), (x1 - 1, y)], fill=outline)
            if y + 1 < y1:
                draw.line([(x0, y + 1), (x1 - 1, y + 1)], fill=wood[2])
            if y + plank_h - 1 < y1:
                draw.line([(x0, y + plank_h - 1), (x1 - 1, y + plank_h - 1)], fill=wood[0])
            offset = rng.randint(10, 44)
            for jx in range(x0 + offset, x1 - 6, 68):
                draw.line([(jx, y + 1), (jx, min(y1 - 1, y + plank_h - 1))], fill=wood[0])


def draw_brick_wall(img: Image.Image, x0: int, y0: int, x1: int, y1: int, ramp: list, mortar: tuple, brick_w: int = 16, brick_h: int = 8):
    """Warm staggered brick/stone wall with top-left light edge."""
    draw = ImageDraw.Draw(img)
    draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill=mortar)
    rng = random.Random(31)
    row_idx = 0
    for y in range(y0, y1, brick_h):
        off = (brick_w // 2) if (row_idx % 2 == 1) else 0
        for x in range(x0 - off, x1, brick_w):
            bx0, by0 = max(x0, x + 1), max(y0, y + 1)
            bx1, by1 = min(x1 - 1, x + brick_w - 1), min(y1 - 1, y + brick_h - 1)
            if bx1 <= bx0 or by1 <= by0:
                continue
            tone = ramp[1] if rng.random() > 0.25 else ramp[0]
            draw.rectangle([bx0, by0, bx1, by1], fill=tone)
            draw.line([(bx0, by0), (bx1, by0)], fill=ramp[min(2, len(ramp) - 1)])
            draw.line([(bx0, by1), (bx1, by1)], fill=ramp[0])
        row_idx += 1


def draw_vintage_cloud(draw: ImageDraw.ImageDraw, cx: int, cy: int, w: int, light: tuple, mid: tuple, shadow: tuple):
    """Soft vintage layered horizontal pixel cloud (no harsh outlines)."""
    for k, col in [(2, shadow), (1, mid), (0, light)]:
        x0 = cx - w // 2 + k * 2
        x1 = cx + w // 2 - k * 2
        draw.line([(x0, cy + k), (x1, cy + k)], fill=col, width=2)
    draw.line([(cx - w // 3, cy - 2), (cx + w // 4, cy - 2)], fill=light, width=2)


def draw_foliage_blob(draw: ImageDraw.ImageDraw, cx: int, cy: int, rx: int, ry: int, ramp: list, outline: tuple | None = None, seed: int = 11):
    """Irregular organic foliage clump (never a lollipop circle)."""
    rng = random.Random(seed)
    puffs = [
        (0, 0, rx, ry),
        (-rx // 2, 2, max(3, rx // 2), max(3, ry // 2)),
        (rx // 2, 1, max(3, rx // 2), max(3, ry // 2)),
        (rng.randint(-3, 3), -ry // 3, max(3, rx // 2), max(3, ry // 2)),
    ]
    for dx, dy, prx, pry in puffs:
        draw.ellipse([cx + dx - prx, cy + dy - pry, cx + dx + prx, cy + dy + pry], fill=ramp[0], outline=outline)
    for dx, dy, prx, pry in puffs:
        draw.ellipse([cx + dx - prx + 1, cy + dy - pry + 1, cx + dx + prx - 1, cy + dy + pry - 2], fill=ramp[1])
    draw.ellipse([cx - rx // 2, cy - ry // 2, cx + rx // 3, cy], fill=ramp[min(2, len(ramp) - 1)])


def draw_warm_glow(img: Image.Image, cx: int, cy: int, radius: int, color: tuple, max_alpha: int = 75):
    """Dithered warm light puddle (STYL_SWIATA.md §3)."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    px = overlay.load()
    w, h = img.size
    r2 = radius * radius
    for y in range(max(0, cy - radius), min(h, cy + radius + 1)):
        row = BAYER_4X4[y & 3]
        for x in range(max(0, cx - radius), min(w, cx + radius + 1)):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if d2 <= r2:
                t = 1.0 - math.sqrt(d2) / radius
                step = int(t * 5) / 5.0
                if t > row[x & 3] * 0.45:
                    a = int(max_alpha * step)
                    px[x, y] = (color[0], color[1], color[2], a)
    img.alpha_composite(overlay)
