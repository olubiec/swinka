"""PK-P35a: New pixel-art UI pieces: arrows and back button in the game library.

Generates 6 16x16 PNGs for the UI library matching the close_btn frame family:
  - arrow_left.png, arrow_left_pressed.png
  - arrow_right.png, arrow_right_pressed.png
  - back_btn.png, back_btn_pressed.png
Registers entries in assets/ui/ui.json.
Generates contact sheet docs/qa/shots/p35a-ui-pieces.png (x8 scale, --ui-bg #241824).
"""
import json
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
UI_DIR = ROOT / "assets" / "ui"
UI_JSON_PATH = UI_DIR / "ui.json"
SHOTS_DIR = ROOT / "docs" / "qa" / "shots"
CONTACT_SHEET_PATH = SHOTS_DIR / "p35a-ui-pieces.png"

# Palette colors (from assets/data/style_palette.json)
OUTLINE = (0x3A, 0x1D, 0x17, 255)  # outline.fg
BRICK_3 = (0xD9, 0x87, 0x6B, 255)  # brick.3 (top/left bevel highlight)
BRICK_2 = (0xB8, 0x60, 0x4A, 255)  # brick.2 (face fill)
BRICK_1 = (0x8C, 0x42, 0x37, 255)  # brick.1 (right/bottom shadow)
PLUM_1  = (0x38, 0x25, 0x38, 255)  # plum.1  (bottom crease)
LINEN_3 = (0xFB, 0xF0, 0xD9, 255)  # linen.3 (stroke highlight)
LINEN_2 = (0xEF, 0xDC, 0xB8, 255)  # linen.2 (accent)
HAY_2   = (0xE9, 0xC8, 0x71, 255)  # hay.2   (warm corner accent)
TRANS   = (0, 0, 0, 0)
UI_BG   = (0x24, 0x18, 0x24, 255)  # --ui-bg (plum.0)

CHAR_MAP = {
    "O": OUTLINE,
    "q": BRICK_3,
    "p": BRICK_2,
    "o": BRICK_1,
    "G": PLUM_1,
    "m": LINEN_3,
    "l": LINEN_2,
    "h": HAY_2,
    ".": TRANS,
}

# 12-char face rows for unpressed button (y=2..11):
# In close_btn:
# y=4:  pphppppplppp  (x=4 is h, x=10 is l)
# y=5:  pppmpppmpppp
# y=6:  ppppmpmppppp
# y=7:  pppppmpppppp
# y=8:  ppppmpmppppp
# y=9:  pppmpppmpppp
# y=10: pplppppphppp  (x=4 is l, x=10 is h)

# arrow_left: chunky pixel chevron in linen, 2 px stroke, hand-made slightly uneven
# Tip at x=5, 6; arms at x=8, 9; centered at x=7.0
AL_FACE = [
    "pppppppppppp",  # y=2
    "pppppppppppp",  # y=3
    "ppppppmhpppp",  # y=4 (idx 6: m, idx 7: h)
    "pppppmmppppp",  # y=5 (idx 5, 6: m)
    "ppppmmpppppp",  # y=6 (idx 4, 5: m)
    "pppmmppppppp",  # y=7 (idx 3, 4: m) -> tip at x=5, 6
    "ppppmmpppppp",  # y=8 (idx 4, 5: m)
    "pppppmmppppp",  # y=9 (idx 5, 6: m)
    "ppppppmlpppp",  # y=10 (idx 6: m, idx 7: l)
    "pppppppppppp",  # y=11
]

# arrow_right: exact mirror of arrow_left across x
AR_FACE = [r[::-1] for r in AL_FACE]

# back_btn: pixel arrow pointing left with a short tail, same linen color
# Head: chevron tip at x=4, 5 (idx 2, 3), arms at x=7, 8 (idx 5, 6).
# Tail: horizontal bar at y=7 from x=6 to 10 (idx 4 to 8).
# Fits inside x=4..10, y=4..10 (7x7 bbox matching close_btn X).
BK_FACE = [
    "pppppppppppp",  # y=2
    "pppppppppppp",  # y=3
    "pppppmhppppp",  # y=4 (idx 5: m, idx 6: h)
    "ppppmmpppppp",  # y=5 (idx 4, 5: m)
    "pppmmppppppp",  # y=6 (idx 3, 4: m)
    "ppmmmmmmlppp",  # y=7 (idx 2..7: m, idx 8: l) -> tip + tail to x=10
    "pppmmppppppp",  # y=8 (idx 3, 4: m)
    "ppppmmpppppp",  # y=9 (idx 4, 5: m)
    "pppppmlppppp",  # y=10 (idx 5: m, idx 6: l)
    "pppppppppppp",  # y=11
]


def build_lines(face_rows, pressed=False):
    lines = []
    if not pressed:
        lines.append(".OOOOOOOOOOOOOO.")
        lines.append("OqqqqqqqqqqqqqqO")
        for y in range(2, 12):
            face = face_rows[y - 2]
            lines.append(f"Oq{face}oO")
        lines.append("OooooooooooooooO")
        lines.append("OGGGGGGGGGGGGGGO")
        lines.append("OppppppppppppppO")
        lines.append(".OOOOOOOOOOOOOO.")
    else:
        lines.append("................")
        lines.append(".OOOOOOOOOOOOOO.")
        lines.append("OppppppppppppppO")
        for y in range(3, 13):
            face = face_rows[y - 3]
            lines.append(f"Op{face}pO")
        lines.append("OppppppppppppppO")
        lines.append("OppppppppppppppO")
        lines.append(".OOOOOOOOOOOOOO.")
    return lines


def lines_to_image(lines):
    im = Image.new("RGBA", (16, 16), TRANS)
    for y, line in enumerate(lines):
        for x, ch in enumerate(line):
            im.putpixel((x, y), CHAR_MAP[ch])
    return im


def generate_sprites():
    sprites = {
        "arrow_left": lines_to_image(build_lines(AL_FACE, pressed=False)),
        "arrow_left_pressed": lines_to_image(build_lines(AL_FACE, pressed=True)),
        "arrow_right": lines_to_image(build_lines(AR_FACE, pressed=False)),
        "arrow_right_pressed": lines_to_image(build_lines(AR_FACE, pressed=True)),
        "back_btn": lines_to_image(build_lines(BK_FACE, pressed=False)),
        "back_btn_pressed": lines_to_image(build_lines(BK_FACE, pressed=True)),
    }
    for name, img in sprites.items():
        out_path = UI_DIR / f"{name}.png"
        img.save(out_path, format="PNG")
        print(f"Saved: {out_path}")
    return sprites


def register_in_ui_json():
    new_entries = {
        "arrow_left": {"file": "ui/arrow_left.png", "size": [16, 16]},
        "arrow_left_pressed": {"file": "ui/arrow_left_pressed.png", "size": [16, 16]},
        "arrow_right": {"file": "ui/arrow_right.png", "size": [16, 16]},
        "arrow_right_pressed": {"file": "ui/arrow_right_pressed.png", "size": [16, 16]},
        "back_btn": {"file": "ui/back_btn.png", "size": [16, 16]},
        "back_btn_pressed": {"file": "ui/back_btn_pressed.png", "size": [16, 16]},
    }
    with open(UI_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.setdefault("items", {})
    updated = False
    for k, v in new_entries.items():
        if k not in items:
            items[k] = v
            updated = True

    if updated:
        content = json.dumps(data, indent=1)
        crlf_content = content.replace("\r\n", "\n").replace("\n", "\r\n") + "\r\n"
        with open(UI_JSON_PATH, "wb") as f:
            f.write(crlf_content.encode("utf-8"))
        print(f"Updated: {UI_JSON_PATH}")
    else:
        print(f"Already up-to-date: {UI_JSON_PATH}")


def generate_contact_sheet(sprites):
    SHOTS_DIR.mkdir(parents=True, exist_ok=True)
    close_btn = Image.open(UI_DIR / "close_btn.png").convert("RGBA")
    close_btn_pressed = Image.open(UI_DIR / "close_btn_pressed.png").convert("RGBA")

    # Layout: 2 rows x 4 columns
    # Top row (normal): close_btn, back_btn, arrow_left, arrow_right
    # Bottom row (pressed): close_btn_pressed, back_btn_pressed, arrow_left_pressed, arrow_right_pressed
    top_row = [
        close_btn,
        sprites["back_btn"],
        sprites["arrow_left"],
        sprites["arrow_right"],
    ]
    bot_row = [
        close_btn_pressed,
        sprites["back_btn_pressed"],
        sprites["arrow_left_pressed"],
        sprites["arrow_right_pressed"],
    ]

    scale = 8
    piece_size = 16 * scale  # 128x128
    pad = 24
    gap = 16

    cols = 4
    rows = 2
    sheet_w = pad * 2 + cols * piece_size + (cols - 1) * gap
    sheet_h = pad * 2 + rows * piece_size + (rows - 1) * gap

    sheet = Image.new("RGBA", (sheet_w, sheet_h), UI_BG)

    for col_idx, img in enumerate(top_row):
        scaled = img.resize((piece_size, piece_size), Image.Resampling.NEAREST)
        x = pad + col_idx * (piece_size + gap)
        y = pad
        sheet.alpha_composite(scaled, (x, y))

    for col_idx, img in enumerate(bot_row):
        scaled = img.resize((piece_size, piece_size), Image.Resampling.NEAREST)
        x = pad + col_idx * (piece_size + gap)
        y = pad + piece_size + gap
        sheet.alpha_composite(scaled, (x, y))

    sheet.save(CONTACT_SHEET_PATH, format="PNG")
    print(f"Saved contact sheet: {CONTACT_SHEET_PATH} ({sheet_w}x{sheet_h})")


def main():
    sprites = generate_sprites()
    register_in_ui_json()
    generate_contact_sheet(sprites)
    print("PK-P35a assets generated successfully.")


if __name__ == "__main__":
    main()
