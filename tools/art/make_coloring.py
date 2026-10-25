import argparse
import json
import os
import math
import subprocess
import shutil
import io
from PIL import Image

def lab_distance(lab1, lab2):
    return math.sqrt((lab1[0] - lab2[0])**2 + (lab1[1] - lab2[1])**2 + (lab1[2] - lab2[2])**2)

def rgb_to_lab(r, g, b):
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    r = ((r + 0.055) / 1.055) ** 2.4 if r > 0.04045 else r / 12.92
    g = ((g + 0.055) / 1.055) ** 2.4 if g > 0.04045 else g / 12.92
    b = ((b + 0.055) / 1.055) ** 2.4 if b > 0.04045 else b / 12.92
    r, g, b = r * 100.0, g * 100.0, b * 100.0
    x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    x, y, z = x / 95.047, y / 100.000, z / 108.883
    x = x ** (1/3.0) if x > 0.008856 else (7.787 * x) + (16.0 / 116.0)
    y = y ** (1/3.0) if y > 0.008856 else (7.787 * y) + (16.0 / 116.0)
    z = z ** (1/3.0) if z > 0.008856 else (7.787 * z) + (16.0 / 116.0)
    l = (116.0 * y) - 16.0
    a = 500.0 * (x - y)
    b_lab = 200.0 * (y - z)
    return (l, a, b_lab)

def merge_colors(palette, max_dist=8):
    merged_map = {}
    final_palette = []
    groups = []
    for col in palette:
        placed = False
        lab_col = rgb_to_lab(*col)
        for g in groups:
            for g_col in g:
                if lab_distance(lab_col, rgb_to_lab(*g_col)) < max_dist:
                    g.append(col)
                    placed = True
                    break
            if placed:
                break
        if not placed:
            groups.append([col])
    for g in groups:
        avg_r = sum(c[0] for c in g) // len(g)
        avg_g = sum(c[1] for c in g) // len(g)
        avg_b = sum(c[2] for c in g) // len(g)
        final_col = (avg_r, avg_g, avg_b)
        hex_col = f"#{final_col[0]:02x}{final_col[1]:02x}{final_col[2]:02x}"
        final_palette.append(hex_col)
        for c in g:
            merged_map[c] = hex_col
    return final_palette, merged_map

def extract_guinea_pigs():
    variants_path = "assets/sprites/variants.json"
    with open(variants_path, "r", encoding="utf-8") as f:
        variants = json.load(f)["variants"]
    target_animations = [
        "idle", "sniff", "walk", "run", "popcorn", "eat", "eat_treat", "scratch",
        "sleep", "doze", "yawn", "happy", "purr_pet", "wheek", "greet", "beg", "dance", "party",
        "sleep_house", "ball_push", "tunnel_wiggle", "drink", "front_idle", "front_happy"
    ]
    pictures = []
    seen_cells = set()
    pic_id = 1
    for v_key, v_data in sorted(variants.items()):
        folder = v_data["folder"]
        variant_desc = v_data["description"].split("(")[0].strip()
        anims_path = f"assets/sprites/{folder}/animations.json"
        sprite_path = f"assets/sprites/{folder}/spritesheet.png"
        if not os.path.exists(anims_path) or not os.path.exists(sprite_path):
            continue
        with open(anims_path, "r", encoding="utf-8") as f:
            anims_data = json.load(f)
        frame_w, frame_h = anims_data["frame_size"]
        img = Image.open(sprite_path).convert("RGBA")
        for anim_name in target_animations:
            if anim_name not in anims_data["animations"]:
                continue
            anim = anims_data["animations"][anim_name]
            row = anim["row"]
            frames = anim["frames"]
            middle_frame = frames // 2
            x = middle_frame * frame_w
            y = row * frame_h
            frame_img = img.crop((x, y, x + frame_w, y + frame_h))
            bbox = frame_img.getbbox()
            if not bbox:
                continue
            left, upper, right, lower = bbox
            left = max(0, left - 1)
            upper = max(0, upper - 1)
            right = min(frame_w, right + 1)
            lower = min(frame_h, lower + 1)
            cropped = frame_img.crop((left, upper, right, lower))
            cw, ch = cropped.size
            side = max(cw, ch)
            sq_img = Image.new("RGBA", (side, side), (0,0,0,0))
            offset_x = (side - cw) // 2
            offset_y = side - ch
            sq_img.paste(cropped, (offset_x, offset_y))
            if side > 40:
                sq_img = sq_img.resize((32, 32), Image.NEAREST)
                side = 32
            pixels = sq_img.load()
            palette_set = set()
            for py in range(side):
                for px in range(side):
                    r, g, b, a = pixels[px, py]
                    if a >= 128:
                        palette_set.add((r, g, b))
            if not palette_set:
                continue
            final_palette, merged_map = merge_colors(sorted(list(palette_set)), max_dist=8)
            if len(final_palette) > 16:
                final_palette, merged_map = merge_colors(sorted(list(palette_set)), max_dist=15)
            cells = ""
            chars = "123456789abcdefghijklmnopqrstuvwxyz"
            for py in range(side):
                for px in range(side):
                    r, g, b, a = pixels[px, py]
                    if a < 128:
                        cells += "."
                    else:
                        hex_col = merged_map[(r, g, b)]
                        idx = final_palette.index(hex_col)
                        cells += chars[idx]
            if cells in seen_cells:
                continue
            seen_cells.add(cells)
            title = f"{variant_desc} {anim_name.replace('_', ' ')}".capitalize()
            pictures.append({
                "id": f"gp_{pic_id:03d}",
                "title": title,
                "w": side,
                "h": side,
                "palette": final_palette,
                "cells": cells
            })
            pic_id += 1
    return pictures

def extract_food_and_toys():
    icons_path = "assets/icons/icons.json"
    img_path = "assets/icons/icons_16.png"
    with open(icons_path, "r", encoding="utf-8") as f:
        icons_data = json.load(f)["icons"]
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    pictures = []
    pic_id = 1
    for icon_name, icon_idx in icons_data.items():
        if icon_name.startswith("need_"):
            continue
        cols = w // 16
        x = (icon_idx % cols) * 16
        y = (icon_idx // cols) * 16
        icon_img = img.crop((x, y, x + 16, y + 16))
        palette_set = set()
        pixels = icon_img.load()
        for py in range(16):
            for px in range(16):
                r, g, b, a = pixels[px, py]
                if a >= 128:
                    palette_set.add((r, g, b))
        if not palette_set:
            continue
        final_palette, merged_map = merge_colors(sorted(list(palette_set)), max_dist=0)
        if len(final_palette) > 35:
            final_palette, merged_map = merge_colors(sorted(list(palette_set)), max_dist=8)
        cells = ""
        chars = "123456789abcdefghijklmnopqrstuvwxyz"
        for py in range(16):
            for px in range(16):
                r, g, b, a = pixels[px, py]
                if a < 128:
                    cells += "."
                else:
                    hex_col = merged_map[(r, g, b)]
                    idx = final_palette.index(hex_col)
                    cells += chars[idx]
        title = icon_name.replace('_', ' ').capitalize()
        pictures.append({
            "id": f"ft_{pic_id:03d}",
            "title": title,
            "w": 16,
            "h": 16,
            "palette": final_palette,
            "cells": cells
        })
        pic_id += 1
    return pictures

def extract_emoji(skip_emoji=False):
    emoji_packs = {
        "pets": [],
        "fruit_veg": [],
        "flowers": [],
        "sweets": [],
        "hearts": [],
        "things": []
    }
    if skip_emoji:
        return emoji_packs

    print("Setting up emoji workspace...")
    os.makedirs("emoji_workspace", exist_ok=True)
    subprocess.run(["npm", "pack", "emojibase-data"], cwd="emoji_workspace", check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["npm", "pack", "@twemoji/svg"], cwd="emoji_workspace", check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run("tar -xf emojibase-data-*.tgz", shell=True, cwd="emoji_workspace", check=True)
    if os.path.exists("emoji_workspace/emojibase-package"):
        shutil.rmtree("emoji_workspace/emojibase-package")
    os.rename("emoji_workspace/package", "emoji_workspace/emojibase-package")
    subprocess.run("tar -xf twemoji-svg-*.tgz", shell=True, cwd="emoji_workspace", check=True)

    with open("emoji_workspace/emojibase-package/en/data.json", "r", encoding="utf-8") as f:
        emojibase = json.load(f)

    with open("emoji_workspace/emojibase-package/meta/groups.json", "r", encoding="utf-8") as f:
        emojibase_groups = json.load(f)
        groups_map = emojibase_groups["groups"]
        subgroups_map = emojibase_groups["subgroups"]

    import cairosvg
    pic_id = 1

    def process_svg(svg_path, group_name, title, target_size=24):
        png_data = cairosvg.svg2png(url=svg_path, output_width=target_size, output_height=target_size)
        img = Image.open(io.BytesIO(png_data)).convert("RGBA")
        mask = Image.new("1", (target_size, target_size), 0)
        pixels = img.load()
        colored_cells_count = 0
        for y in range(target_size):
            for x in range(target_size):
                r, g, b, a = pixels[x, y]
                if a >= 128:
                    mask.putpixel((x, y), 1)
                    colored_cells_count += 1
                else:
                    pixels[x, y] = (0, 0, 0, 0)
        if colored_cells_count < 60:
            return None
        rgb_img = Image.new("RGB", (target_size, target_size), (255, 255, 255))
        rgb_img.paste(img, mask=mask)
        quantized = rgb_img.quantize(colors=12, method=1)
        palette = quantized.getpalette()
        q_pixels = quantized.load()
        color_counts = {}
        for y in range(target_size):
            for x in range(target_size):
                if mask.getpixel((x, y)) == 1:
                    c = q_pixels[x, y]
                    color_counts[c] = color_counts.get(c, 0) + 1
        remap = {}
        for c, count in color_counts.items():
            if count < 3:
                min_dist = 999999
                closest_c = None
                c_rgb = (palette[c*3], palette[c*3+1], palette[c*3+2])
                for other_c, other_count in color_counts.items():
                    if other_count >= 3:
                        o_rgb = (palette[other_c*3], palette[other_c*3+1], palette[other_c*3+2])
                        d = (c_rgb[0]-o_rgb[0])**2 + (c_rgb[1]-o_rgb[1])**2 + (c_rgb[2]-o_rgb[2])**2
                        if d < min_dist:
                            min_dist = d
                            closest_c = other_c
                if closest_c is not None:
                    remap[c] = closest_c
                else:
                    remap[c] = c
            else:
                remap[c] = c
        final_colors = set(remap.values())
        if len(final_colors) > 14:
            return None
        final_palette_list = sorted(list(final_colors))
        hex_palette = []
        for fc in final_palette_list:
            r = palette[fc*3]
            g = palette[fc*3+1]
            b = palette[fc*3+2]
            hex_palette.append(f"#{r:02x}{g:02x}{b:02x}")
        cells = ""
        chars = "123456789abcdefghijklmnopqrstuvwxyz"
        for y in range(target_size):
            for x in range(target_size):
                if mask.getpixel((x, y)) == 1:
                    c = q_pixels[x, y]
                    final_c = remap[c]
                    idx = final_palette_list.index(final_c)
                    cells += chars[idx]
                else:
                    cells += "."
        return {
            "title": title,
            "w": target_size,
            "h": target_size,
            "palette": hex_palette,
            "cells": cells,
            "color_count": len(final_palette_list)
        }

    for emoji in emojibase:
        if "group" not in emoji or "subgroup" not in emoji:
            continue
        hexcode = emoji["hexcode"].lower()
        title = emoji["label"].capitalize()
        group_id = str(emoji["group"])
        subgroup_id = str(emoji["subgroup"])
        group = groups_map.get(group_id, "")
        subgroup = subgroups_map.get(subgroup_id, "")

        if "flag" in subgroup or "flag" in group or "country-flag" in group: continue
        if "person" in subgroup or "people" in group: continue
        if "hand" in subgroup or "body" in group: continue
        if "text" in subgroup or "alphanum" in subgroup: continue
        if "skin-tone" in emoji.get("name", ""): continue

        pack = None
        target_size = 24

        if group == "animals-nature" and subgroup in ["animal-mammal", "animal-bird", "animal-marine", "animal-bug"]:
            pack = "pets"
            target_size = 32
        elif subgroup in ["food-fruit", "food-vegetable"]:
            pack = "fruit_veg"
        elif subgroup in ["food-sweet", "food-prepared"]:
            pack = "sweets"
        elif subgroup in ["plant-flower", "plant-other"]:
            pack = "flowers"
            target_size = 32
        elif subgroup in ["face-smiling", "face-affection", "sky-weather"]:
            pack = "hearts"
        elif "heart" in title.lower():
            pack = "hearts"
        elif group in ["activities", "objects"] and subgroup in ["household", "clothing", "sport", "music", "light-video", "light & video"]:
            pack = "things"

        if pack:
            svg_path = f"emoji_workspace/package/{hexcode}.svg"
            if not os.path.exists(svg_path):
                continue
            res = process_svg(svg_path, pack, title, target_size)
            if res:
                res["id"] = f"em_{pic_id:03d}"
                emoji_packs[pack].append(res)
                pic_id += 1

    emoji_packs["things"].sort(key=lambda x: x["color_count"], reverse=True)
    emoji_packs["things"] = emoji_packs["things"][:100]

    for p in emoji_packs:
        for pic in emoji_packs[p]:
            if "color_count" in pic:
                del pic["color_count"]

    shutil.rmtree("emoji_workspace")
    return emoji_packs

def main():
    parser = argparse.ArgumentParser(description="Generate coloring picture packs.")
    parser.add_argument("--out", type=str, required=True, help="Output directory for the JSON files")
    parser.add_argument("--no-emoji", action="store_true", help="Skip Twemoji processing")
    args = parser.parse_args()

    print("Extracting guinea pigs...")
    gp_pics = extract_guinea_pigs()
    print(f"Generated {len(gp_pics)} guinea pig pictures.")

    print("Extracting food and toys...")
    ft_pics = extract_food_and_toys()
    print(f"Generated {len(ft_pics)} food and toys pictures.")

    emoji_packs = extract_emoji(args.no_emoji)

    os.makedirs(args.out, exist_ok=True)
    packs_data = []

    def get_pack_size(pack_id, title, pics):
        if not pics: return 0
        pack_dict = {
            "id": pack_id,
            "title": title,
            "pictures": pics
        }
        return len(json.dumps(pack_dict, separators=(',', ':')).encode('utf-8'))

    total_size = 0
    total_size += get_pack_size("guinea_pigs", "Guinea pigs", gp_pics)
    total_size += get_pack_size("food_and_toys", "Food and toys", ft_pics)

    emoji_pack_details = {
        "pets": ("Pets", 50),
        "fruit_veg": ("Fruit & veg", 50),
        "flowers": ("Flowers", 50),
        "sweets": ("Sweets", 50),
        "hearts": ("Hearts", 50),
        "things": ("Things", 50)
    }

    if not args.no_emoji:
        for pack_id in ["pets", "fruit_veg", "flowers", "sweets", "hearts", "things"]:
            title, price = emoji_pack_details[pack_id]
            total_size += get_pack_size(pack_id, title, emoji_packs.get(pack_id, []))

        index_size_estimate = 1000
        total_size += index_size_estimate

        if total_size > 3 * 1024 * 1024:
            print(f"Total JSON size exceeds 3MB ({total_size / 1024 / 1024:.2f} MB), reducing emoji packs to 80 pictures each.")
            for pack_id in emoji_packs:
                if len(emoji_packs[pack_id]) > 80:
                    emoji_packs[pack_id] = emoji_packs[pack_id][:80]

    def save_pack(pack_id, title, price, pics):
        if not pics:
            return
        packs_data.append({
            "id": pack_id,
            "title": title,
            "price": price,
            "count": len(pics),
            "thumb": pics[0]["id"]
        })
        with open(os.path.join(args.out, f"{pack_id}.json"), "w", encoding="utf-8") as f:
            pack_content = {
                "id": pack_id,
                "title": title,
                "pictures": pics
            }
            json.dump(pack_content, f, separators=(',', ':'))

    save_pack("guinea_pigs", "Guinea pigs", 0, gp_pics)
    save_pack("food_and_toys", "Food and toys", 0, ft_pics)

    if not args.no_emoji:
        for pack_id in ["pets", "fruit_veg", "flowers", "sweets", "hearts", "things"]:
            title, price = emoji_pack_details[pack_id]
            save_pack(pack_id, title, price, emoji_packs.get(pack_id, []))

    with open(os.path.join(args.out, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"version": 1, "packs": packs_data}, f, separators=(',', ':'))

    print("\nSummary:")
    total_pics = 0
    for p in packs_data:
        print(f" - {p['id']}: {p['count']} pictures")
        total_pics += p['count']

    final_size = 0
    for f in os.listdir(args.out):
        if f.endswith('.json'):
            final_size += os.path.getsize(os.path.join(args.out, f))

    print(f"Total packs: {len(packs_data)}")
    print(f"Total pictures: {total_pics}")
    print(f"Total JSON size: {final_size / 1024 / 1024:.2f} MB")
    print("Done!")

if __name__ == "__main__":
    main()
