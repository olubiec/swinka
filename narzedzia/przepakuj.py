#!/usr/bin/env python3
"""
Skrypt do powiększania arkusza klatek świnki x2 metodą Nearest-Neighbor (bez wygładzania).
Zachowuje ostry styl pixel art.

Użycie:
    python narzedzia/przepakuj.py [ścieżka_do_spritesheet.png] [ścieżka_wyjściowa.png]
Domyślnie:
    swinka/swinka_spritesheet.png -> swinka/swinka_spritesheet_x2.png
"""

import os
import sys
import json
from PIL import Image

def przepakuj(input_png="swinka/swinka_spritesheet.png", output_png=None, scale=2):
    if not os.path.exists(input_png):
        print(f"Błąd: Nie znaleziono pliku wejściowego: {input_png}")
        return False

    if output_png is None:
        base, ext = os.path.splitext(input_png)
        output_png = f"{base}_x{scale}{ext}"

    print(f"Wczytywanie {input_png}...")
    img = Image.open(input_png)
    orig_w, orig_h = img.size
    new_w, new_h = orig_w * scale, orig_h * scale

    print(f"Rozmiar oryginalny: {orig_w}x{orig_h}")
    print(f"Skalowanie x{scale} (Nearest-Neighbor) do: {new_w}x{new_h}")

    scaled_img = img.resize((new_w, new_h), resample=Image.NEAREST)
    scaled_img.save(output_png, optimize=True)
    print(f"Zapisano powiększony arkusz: {output_png}")

    # Aktualizacja lub generowanie powiązanego pliku JSON jeśli istnieje
    input_json = os.path.splitext(input_png)[0] + ".json"
    if not os.path.exists(input_json):
        alt_json = os.path.join(os.path.dirname(input_png), "swinka_animacje.json")
        if os.path.exists(alt_json):
            input_json = alt_json

    if os.path.exists(input_json):
        try:
            with open(input_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "frame_size" in data:
                data["frame_size"] = [data["frame_size"][0] * scale, data["frame_size"][1] * scale]
            if "floor_y" in data:
                data["floor_y"] = data["floor_y"] * scale

            output_json = os.path.splitext(output_png)[0] + ".json"
            with open(output_json, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Zapisano zaktualizowany plik JSON: {output_json}")
        except Exception as e:
            print(f"Uwaga: Nie udało się zaktualizować JSON: {e}")

    return True

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "swinka/swinka_spritesheet.png"
    dst = sys.argv[2] if len(sys.argv) > 2 else None
    przepakuj(src, dst, scale=2)
