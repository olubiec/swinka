#!/usr/bin/env python3
"""Draws assets/world/house/trim_floor_shadow.png (16x4 dithered shadow under wall trim).

PK-P45c2: 16x4 dithered palette sprite sitting right under the baseboard.
Colors:
  Plum A: #382538 (plum[1] from style_palette.json)
  Plum B: #54394f (plum[2] from style_palette.json)
"""
from __future__ import annotations

import os
import sys
from PIL import Image

COLOR_A = (0x38, 0x25, 0x38, 255)
COLOR_B = (0x54, 0x39, 0x4f, 255)
COLOR_TRANSPARENT = (0, 0, 0, 0)

WIDTH = 16
HEIGHT = 4


def generate_tile() -> Image.Image:
    """Generate the 16x4 dithered shadow tile.

    - row 0: all 16 pixels opaque, x even = A, x odd = B
    - row 1: x odd = A, x even transparent
    - row 2: only x in {2, 6, 10, 14} = A, rest transparent
    - row 3: fully transparent
    """
    im = Image.new("RGBA", (WIDTH, HEIGHT), COLOR_TRANSPARENT)

    # Row 0: all 16 pixels opaque, x even = A, x odd = B
    for x in range(WIDTH):
        im.putpixel((x, 0), COLOR_A if x % 2 == 0 else COLOR_B)

    # Row 1: x odd = A, x even transparent
    for x in range(WIDTH):
        if x % 2 == 1:
            im.putpixel((x, 1), COLOR_A)

    # Row 2: only x in {2, 6, 10, 14} = A, rest transparent
    for x in (2, 6, 10, 14):
        im.putpixel((x, 2), COLOR_A)

    # Row 3: fully transparent (already initialized to COLOR_TRANSPARENT)
    return im


def build(assets_dir: str = "assets") -> str:
    """Write trim_floor_shadow.png to <assets_dir>/world/house/."""
    out_dir = os.path.join(assets_dir, "world", "house")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "trim_floor_shadow.png")

    tile = generate_tile()
    tile.save(out_path, format="PNG")
    return out_path


def main() -> None:
    assets_dir = sys.argv[1] if len(sys.argv) > 1 else "assets"
    out_path = build(assets_dir)
    print(f"Generated {out_path}")


if __name__ == "__main__":
    main()
