"""Test light.py: wynik swiata zawsze w palecie, swiatlo rozjasnia, brak wypalenia do bieli."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from PIL import Image
import light as L
import handart as H

def main():
    base = Image.new("RGBA", (160, 96), H.RAMPS["wood"][3] + (255,))
    base.paste(Image.new("RGBA", (160, 20), H.RAMPS["linen"][2] + (255,)), (0, 0))
    base.paste(Image.new("RGBA", (20, 20), (0, 0, 0, 0)), (0, 76))  # przezroczysty skrawek
    for tod in ("morning", "day", "evening", "night"):
        for srcs in ([], [("candle", 80, 60)], [("fireplace", 80, 50), ("lamp_floor", 30, 50)]):
            o = L.render(base, tod, srcs)
            px = {p[:3] for p in o.get_flattened_data() if p[3]} if hasattr(o, "get_flattened_data") else {p[:3] for p in o.getdata() if p[3]}
            bad = px - H.PALETTE
            assert not bad, (tod, srcs, bad)
            assert o.getpixel((5, 90))[3] == 0  # alfa zachowana
    # swiatlo rozjasnia zrodlo wzgledem ciemnej nocy
    off = np.asarray(L.render(base, "night").convert("L"), float)
    on = np.asarray(L.render(base, "night", [("fireplace", 80, 50)]).convert("L"), float)
    assert on[40:60, 70:90].mean() > off[40:60, 70:90].mean() + 10
    # srodek blasku nie jest jasniejszy niz flame[3]
    lum = lambda c: 0.299*c[0]+0.587*c[1]+0.114*c[2]
    cap = lum(H.RAMPS["flame"][3])
    center = L.render(base, "night", [("fireplace", 80, 50)]).getpixel((80, 50))
    assert lum(center) <= max(cap, lum(H.RAMPS["linen"][3])) + 1
    # swinka: bez kwantyzacji moze miec kolory spoza palety
    p = L.render(base, "evening", [("candle", 80, 60)], quantized=False)
    print("OK")

if __name__ == "__main__":
    main()
