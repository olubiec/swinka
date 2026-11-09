#!/usr/bin/env python3
"""Generate assets/world/house/trim_baseboard.png (16x8 wood wall trim tile).

Part of PK-P45c1.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from PIL import Image


def _hex_to_rgba(hex_code: str) -> tuple[int, int, int, int]:
    h = hex_code.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def generate_trim(assets_dir: Path | str | None = None) -> Path:
    repo_root = Path(__file__).resolve().parents[2]
    if assets_dir is None:
        target_assets = repo_root / "assets"
    else:
        target_assets = Path(assets_dir)

    pal_file = target_assets / "data" / "style_palette.json"
    if not pal_file.exists():
        pal_file = repo_root / "assets" / "data" / "style_palette.json"

    pal = json.loads(pal_file.read_text(encoding="utf-8"))
    wood = pal["ramps"]["wood"]

    w0 = _hex_to_rgba(wood[0])  # #47281c
    w1 = _hex_to_rgba(wood[1])  # #6f4328
    w2 = _hex_to_rgba(wood[2])  # #9b6238
    w3 = _hex_to_rgba(wood[3])  # #c58a52
    w4 = _hex_to_rgba(wood[4])  # #e3b27a

    width, height = 16, 8
    img = Image.new("RGBA", (width, height))
    px = img.load()

    # Base rows
    for x in range(width):
        px[x, 0] = w4  # row 0: light top edge
        px[x, 1] = w3  # row 1: w3
        for y in range(2, 6):
            px[x, y] = w2  # rows 2-5: base w2
        px[x, 6] = w1  # row 6: underside of the board
        px[x, 7] = w0  # row 7: dark contact line with floor

    # Nail
    px[4, 4] = w0
    px[3, 4] = w3
    px[4, 3] = w3

    # Knot (slightly crooked, hand-made)
    px[11, 3] = w1
    px[11, 4] = w1
    px[12, 4] = w1
    px[12, 5] = w1

    # Grain
    px[1, 3] = w1
    px[7, 5] = w1
    px[8, 5] = w1
    px[14, 2] = w1
    px[6, 2] = w3

    out_path = target_assets / "world" / "house" / "trim_baseboard.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG")
    return out_path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    assets_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else (repo_root / "assets")
    out_path = generate_trim(assets_dir)
    print(out_path.as_posix())


if __name__ == "__main__":
    main()
