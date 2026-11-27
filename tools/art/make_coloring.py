"""Coloring Book Landscape & Scene Generator (cuy-hay-house palette).

Generates full pixel-art landscape and cozy-scene coloring packs from the
project's world art generators (tools/art/world/*) and guinea pig sprites,
replacing generic Twemoji/16x16 icon packs.
"""

import argparse
import json
import math
import os
import random
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WORLD_TOOLS = ROOT / "tools" / "art" / "world"
ART_TOOLS = ROOT / "tools" / "art"
sys.path.insert(0, str(ART_TOOLS))
sys.path.insert(0, str(WORLD_TOOLS))

import handart as H
import light as L


def lab_distance(lab1, lab2):
    return math.sqrt((lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2)


def rgb_to_lab(r, g, b):
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    r = ((r + 0.055) / 1.055) ** 2.4 if r > 0.04045 else r / 12.92
    g = ((g + 0.055) / 1.055) ** 2.4 if g > 0.04045 else g / 12.92
    b = ((b + 0.055) / 1.055) ** 2.4 if b > 0.04045 else b / 12.92
    r, g, b = r * 100.0, g * 100.0, b * 100.0
    x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 95.047
    y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 100.000
    z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 108.883
    x = x ** (1 / 3.0) if x > 0.008856 else (7.787 * x) + (16.0 / 116.0)
    y = y ** (1 / 3.0) if y > 0.008856 else (7.787 * y) + (16.0 / 116.0)
    z = z ** (1 / 3.0) if z > 0.008856 else (7.787 * z) + (16.0 / 116.0)
    return (116.0 * y - 16.0, 500.0 * (x - y), 200.0 * (y - z))


def quantize_to_coloring(im, target_w, target_h, max_colors=12, keep_transparent=False):
    """Downscales and quantizes an image into a clean, pleasant coloring grid."""
    src = im.convert("RGBA")
    if src.size != (target_w, target_h):
        src = src.resize((target_w, target_h), Image.NEAREST)

    px = src.load()
    # Collect opaque pixels
    color_counts = {}
    for y in range(target_h):
        for x in range(target_w):
            r, g, b, a = px[x, y]
            if a >= 128:
                rgb = (r, g, b)
                color_counts[rgb] = color_counts.get(rgb, 0) + 1

    if not color_counts:
        return None

    # Iteratively merge closest colors in Lab space until <= max_colors
    palette_items = sorted(color_counts.items(), key=lambda kv: kv[1], reverse=True)
    # Precompute Lab
    groups = [[col, count, rgb_to_lab(*col)] for col, count in palette_items]

    # Merge tiny specks or excess colors
    dist_thresh = 10.0
    while len(groups) > max_colors:
        best_i, best_j, best_d = 0, 1, 1e9
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                d = lab_distance(groups[i][2], groups[j][2])
                if d < best_d:
                    best_d = d
                    best_i, best_j = i, j
        if best_d > 80 and len(groups) <= 16:
            break
        # Merge smaller group j into larger group i
        gi, gj = groups[best_i], groups[best_j]
        if gj[1] > gi[1]:
            gi, gj = gj, gi
            best_i, best_j = best_j, best_i
        total = gi[1] + gj[1]
        gi[1] = total
        groups.pop(best_j)

    # Also merge very rare colors (< 4 cells) into nearest neighbor if palette > 6
    if len(groups) > 6:
        changed = True
        while changed and len(groups) > 6:
            changed = False
            for idx in range(len(groups) - 1, -1, -1):
                if groups[idx][1] < 4:
                    best_k, best_d = -1, 1e9
                    for k in range(len(groups)):
                        if k == idx:
                            continue
                        d = lab_distance(groups[idx][2], groups[k][2])
                        if d < best_d:
                            best_d = d
                            best_k = k
                    if best_k >= 0:
                        groups[best_k][1] += groups[idx][1]
                        groups.pop(idx)
                        changed = True
                        break

    final_colors = [g[0] for g in groups]
    final_labs = [g[2] for g in groups]
    hex_palette = [f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}" for c in final_colors]

    # Map every pixel to nearest final color
    cache = {}
    grid = [[-1] * target_w for _ in range(target_h)]
    for y in range(target_h):
        for x in range(target_w):
            r, g, b, a = px[x, y]
            if a < 128 and keep_transparent:
                grid[y][x] = -1
                continue
            rgb = (r, g, b)
            if rgb not in cache:
                lab = rgb_to_lab(r, g, b)
                best_idx = 0
                best_d = 1e9
                for i, flab in enumerate(final_labs):
                    d = lab_distance(lab, flab)
                    if d < best_d:
                        best_d = d
                        best_idx = i
                cache[rgb] = best_idx
            grid[y][x] = cache[rgb]

    # Gentle despeckle: replace isolated single-pixel islands with majority 4-neighbor
    for y in range(1, target_h - 1):
        for x in range(1, target_w - 1):
            c = grid[y][x]
            if c < 0:
                continue
            nbs = [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]]
            if c not in nbs and all(n >= 0 for n in nbs):
                grid[y][x] = max(set(nbs), key=nbs.count)

    chars = "123456789abcdefghijklmnopqrstuvwxyz"
    cells = []
    used_indices = set()
    for y in range(target_h):
        for x in range(target_w):
            v = grid[y][x]
            if v >= 0:
                used_indices.add(v)

    # Compact unused palette slots
    remap = {}
    compact_palette = []
    for old_i, hex_c in enumerate(hex_palette):
        if old_i in used_indices:
            remap[old_i] = len(compact_palette)
            compact_palette.append(hex_c)

    for y in range(target_h):
        for x in range(target_w):
            v = grid[y][x]
            if v < 0:
                cells.append(".")
            else:
                cells.append(chars[remap[v]])

    return {
        "w": target_w,
        "h": target_h,
        "palette": compact_palette,
        "cells": "".join(cells),
    }


def _composite_with_pig(bg_im, pig_name="adult", px=110, py=92):
    out = bg_im.copy().convert("RGBA")
    try:
        import scena
        pg = scena.pig(pig_name)
        out.alpha_composite(pg, (px, py))
    except Exception:
        pass
    return out


def build_meadow_seasons():
    import garden_bg
    import meadow
    pics = []
    specs = [
        ("ms_001", "Sunny Garden", "day", "kuki", 104, 88),
        ("ms_002", "Morning Dew", "morning", "ned", 128, 92),
        ("ms_003", "Golden Sunset", "evening", "glen", 92, 90),
        ("ms_004", "Starry Night", "night", "james", 116, 90),
    ]
    for pid, title, tod, pig, px, py in specs:
        sk = garden_bg.sky(tod)
        wd = L.render(garden_bg.world(tod), tod, [])
        full = Image.new("RGBA", (garden_bg.W, garden_bg.HT))
        full.alpha_composite(sk)
        full.alpha_composite(wd)
        full = _composite_with_pig(full, pig, px, py)
        q = quantize_to_coloring(full, 80, 45, max_colors=12)
        if q:
            pics.append({"id": pid, "title": title, **q})

    # Extra pure clover meadow close-up
    im = Image.new("RGBA", (160, 90))
    sk = garden_bg.sky("day").crop((0, 0, 160, 40))
    im.alpha_composite(sk, (0, 0))
    meadow.meadow(im, random.Random(77), 160, 90, 32, flowers=1.6)
    im = _composite_with_pig(im, "racuch", 64, 42)
    q = quantize_to_coloring(im, 80, 45, max_colors=12)
    if q:
        pics.append({"id": "ms_005", "title": "Clover Meadow", **q})
    return pics


def build_farm_orchard():
    import farm_bg
    pics = []
    # 1. Barn & Start plots
    for pid, title, plots, pig, px, py in [
        ("fo_001", "Red Barn Morning", farm_bg.START, "ned", 98, 92),
        ("fo_002", "Veggie Patch", farm_bg.MID, "kuki", 120, 96),
    ]:
        full = Image.new("RGBA", (farm_bg.W, farm_bg.HT))
        full.alpha_composite(farm_bg.sky())
        full.alpha_composite(farm_bg.world(plots))
        full = _composite_with_pig(full, pig, px, py)
        q = quantize_to_coloring(full, 80, 45, max_colors=12)
        if q:
            pics.append({"id": pid, "title": title, **q})

    # 2. Orchard scene
    try:
        orch = farm_bg.orchard_scene()
        orch = _composite_with_pig(orch, "glen", 112, 92)
        q = quantize_to_coloring(orch, 80, 45, max_colors=12)
        if q:
            pics.append({"id": "fo_003", "title": "Apple Orchard", **q})
    except Exception:
        pass

    # 3. Evening farm glow
    full_ev = Image.new("RGBA", (farm_bg.W, farm_bg.HT))
    import garden_bg
    full_ev.alpha_composite(garden_bg.sky("evening"))
    full_ev.alpha_composite(L.render(farm_bg.world(farm_bg.MID), "evening", []))
    full_ev = _composite_with_pig(full_ev, "racuch", 104, 92)
    q = quantize_to_coloring(full_ev, 80, 45, max_colors=12)
    if q:
        pics.append({"id": "fo_004", "title": "Harvest Dusk", **q})
    return pics


def build_park_picnic():
    import park_bg
    pics = []
    extra = [
        ("park/fountain.png", 30, 94),
        ("park/pond_big.png", 168, 92),
        ("park/picnic_blanket.png", 92, 98),
    ]
    pigs = [("glen", 108, 96), ("kuki", 132, 102)]
    for idx, (tod, title) in enumerate([
        ("morning", "Park Sunrise"),
        ("day", "Picnic Day"),
        ("evening", "Park Twilight"),
        ("night", "Lanterns at Night"),
    ]):
        im = park_bg.build(tod, extra, pigs)
        q = quantize_to_coloring(im, 80, 45, max_colors=12)
        if q:
            pics.append({"id": f"pp_{idx + 1:03d}", "title": title, **q})
    return pics


def build_cozy_rooms():
    import room_scenes
    import market_bg
    pics = []
    pid = 1
    for who, label in [
        ("kuki", "Kuki's Blanket Room"),
        ("ned", "Ned's Snack Nook"),
        ("james", "James's Hideout"),
        ("glen", "Glen's Knit Bed"),
        ("racuch", "Racuch's Hop Pad"),
    ]:
        panels = room_scenes.room(who)
        # panels[0] = day, panels[1] = evening
        for tod_label, pan in [("Day", panels[0]), ("Evening", panels[1])]:
            q = quantize_to_coloring(pan, 80, 56, max_colors=12)
            if q:
                pics.append({"id": f"cr_{pid:03d}", "title": f"{label} ({tod_label})", **q})
                pid += 1

    # Night market landscape
    try:
        mk = Image.new("RGBA", (market_bg.W, market_bg.HT))
        mk.alpha_composite(market_bg.sky())
        mk.alpha_composite(L.render(market_bg.world(), "evening", []))
        mk = _composite_with_pig(mk, "kuki", 118, 98)
        q = quantize_to_coloring(mk, 80, 45, max_colors=12)
        if q:
            pics.append({"id": f"cr_{pid:03d}", "title": "Evening Market", **q})
    except Exception:
        pass
    return pics


def build_guinea_pig_vignettes():
    """Creates scenic vignettes of the named pigs & life stages (replaces raw 149 blank-bg frames)."""
    import meadow
    import garden_bg
    variants_path = ROOT / "assets" / "sprites" / "variants.json"
    variants = json.loads(variants_path.read_text(encoding="utf-8"))["variants"]

    # Pick distinct representative poses across stages + named pigs
    target_anims = ["idle", "popcorn", "eat_treat", "happy", "sleep", "front_happy"]
    chosen_variants = ["adult", "baby", "junior", "senior", "legend"]
    pics = []
    pid = 1

    for v_key in chosen_variants:
        if v_key not in variants:
            continue
        v_data = variants[v_key]
        folder = v_data["folder"]
        desc = v_data["description"].split("(")[0].strip()
        anims_path = ROOT / "assets" / "sprites" / folder / "animations.json"
        sprite_path = ROOT / "assets" / "sprites" / folder / "spritesheet.png"
        if not anims_path.exists() or not sprite_path.exists():
            continue
        anims_data = json.loads(anims_path.read_text(encoding="utf-8"))
        fw, fh = anims_data["frame_size"]
        sheet = Image.open(sprite_path).convert("RGBA")

        for anim_name in target_anims:
            if anim_name not in anims_data["animations"]:
                continue
            anim = anims_data["animations"][anim_name]
            row, frames = anim["row"], anim["frames"]
            mid = frames // 2
            frame_img = sheet.crop((mid * fw, row * fh, (mid + 1) * fw, (row + 1) * fh))

            # Build a lush 64x48 mini-meadow vignette around the pig
            bg = Image.new("RGBA", (64, 48))
            sk = garden_bg.sky("day").crop((0, 0, 64, 22))
            bg.alpha_composite(sk, (0, 0))
            meadow.meadow(bg, random.Random(pid * 13), 64, 48, 18, flowers=1.4)
            # Center pig on the grass
            px = (64 - fw) // 2
            py = 48 - fh + 4
            bg.alpha_composite(frame_img, (px, py))

            q = quantize_to_coloring(bg, 64, 48, max_colors=12)
            if q:
                title = f"{desc} {anim_name.replace('_', ' ')}".capitalize()
                pics.append({"id": f"gp_{pid:03d}", "title": title, **q})
                pid += 1

    return pics


def main():
    parser = argparse.ArgumentParser(description="Generate landscape coloring packs.")
    parser.add_argument("--out", type=str, default=str(ROOT / "assets" / "coloring"))
    args = parser.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Remove legacy generic emoji & 16x16 icon packs
    for legacy in ("pets.json", "fruit_veg.json", "flowers.json", "sweets.json", "hearts.json", "things.json", "food_and_toys.json"):
        lp = out_dir / legacy
        if lp.exists():
            lp.unlink()
            print(f"Removed legacy pack: {legacy}")

    pack_defs = [
        ("meadow_seasons", "Meadow & Seasons", 0, build_meadow_seasons()),
        ("farm_orchard", "Farm & Orchard", 0, build_farm_orchard()),
        ("guinea_pigs", "Piggies on Meadow", 0, build_guinea_pig_vignettes()),
        ("park_picnic", "Park & Picnic", 50, build_park_picnic()),
        ("cozy_rooms", "Cozy Rooms & Market", 50, build_cozy_rooms()),
    ]

    index_packs = []
    total_pics = 0
    for pack_id, title, price, pics in pack_defs:
        if not pics:
            continue
        index_packs.append({
            "id": pack_id,
            "title": title,
            "price": price,
            "count": len(pics),
            "thumb": pics[0]["id"],
        })
        pack_file = out_dir / f"{pack_id}.json"
        pack_file.write_text(
            json.dumps({"id": pack_id, "title": title, "pictures": pics}, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f" - {pack_id}: {len(pics)} landscapes/scenes")
        total_pics += len(pics)

    (out_dir / "index.json").write_text(
        json.dumps({"version": 2, "packs": index_packs}, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Done! Total packs: {len(index_packs)}, Total pictures: {total_pics}")


if __name__ == "__main__":
    main()
