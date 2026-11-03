"""B11-3: ikona aplikacji i logo w palecie "domek z siana": swinka z dotychczasowej ikony (32x32 x8) na tle z siana."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import icons_a
from PIL import Image

D = H.ROOT / "assets/app-icon"


def pig32():
    """Cala swinka z logo (bez cienia) x2: miesci sie w ramce 30x30, nic nie jest ucinane."""
    lg = Image.open(D / "logo_256.png").convert("RGBA").resize((32, 32), Image.NEAREST)
    bb = lg.getbbox(); h = bb[3] - bb[1] - 2
    crop = lg.crop((bb[0], bb[1], bb[2], bb[1] + h)).resize(((bb[2] - bb[0]) * 2, h * 2), Image.NEAREST)
    out = H.canvas(32, 32)
    out.alpha_composite(crop, ((32 - crop.width) // 2, 31 - crop.height - 1))
    return out


def tile32(pig):
    im = H.canvas(32, 32)
    H.rect(im, 0, 0, 31, 31, "wood.0"); H.rect(im, 1, 1, 30, 30, "hay.2")
    for y in range(1, 31):                                    # miekkie swiatlo od gory, siano ku dolowi
        H.hline(im, 1, 30, y, "hay.3" if y < 8 else ("hay.2" if y < 22 else "hay.1"))
    for x, y in ((4, 4), (24, 5), (28, 11)): H.put(im, x, y, "linen.3")
    H.hline(im, 1, 30, 30, "wood.2"); H.hline(im, 1, 30, 29, "hay.0")
    for x, y in ((0, 0), (31, 0), (0, 31), (31, 31), (1, 0), (0, 1), (30, 0), (31, 1), (0, 30), (1, 31), (30, 31), (31, 30)): im.putpixel((x, y), (0, 0, 0, 0))
    for x, y in ((1, 1), (30, 1), (1, 30), (30, 30)): H.put(im, x, y, "wood.0")
    im.alpha_composite(pig, (0, 0))
    return im


def build():
    pig = pig32(); icon = tile32(pig)
    H.save_png(icon, D / "icon_32.png")
    H.save_png(icon.resize((256, 256), Image.NEAREST), D / "icon_256.png")
    lg = Image.open(D / "logo_256.png").convert("RGBA").resize((32, 32), Image.NEAREST); lo = H.canvas(32, 32)
    for y in range(32):
        for x in range(32):
            p = lg.getpixel((x, y))
            if p[3] > 0: lo.putpixel((x, y), (*icons_a.snap(p), 255))
    for y in range(32):                                       # miekki cien pod swinka: kontur plum[1]
        for x in range(32):
            p = lo.getpixel((x, y))
            if p[3] and y >= 28 and max(p[:3]) - min(p[:3]) < 40 and sum(p[:3]) > 150:
                H.put(lo, x, y, "plum.1")
    ed = []
    for y in range(32):
        for x in range(32):
            if lo.getpixel((x, y))[3] and any((lo.getpixel((x + dx, y + dy))[3] if 0 <= x + dx < 32 and 0 <= y + dy < 32 else 0) == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): ed.append((x, y))
    for x, y in ed:                                           # brzeg bez konturu: ton plum[1] (dozwolony kontur selektywny)
        H.put(lo, x, y, "wood.0")
    H.save_png(lo.resize((256, 256), Image.NEAREST), D / "logo_256.png")
    small = icon.resize((16, 16), Image.BOX)
    s16 = H.canvas(16, 16)
    for y in range(16):
        for x in range(16):
            p = small.getpixel((x, y))
            if p[3] > 127: s16.putpixel((x, y), (*icons_a.snap(p), 255))
    H.save_png(s16, D / "icon_16.png")
    icon.resize((256, 256), Image.NEAREST).save(D / "cuy.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    sh = Image.new("RGBA", (330, 140), (60, 90, 60, 255))
    sh.alpha_composite(icon.resize((128, 128), Image.NEAREST), (4, 4))
    sh.alpha_composite(lo.resize((128, 128), Image.NEAREST), (140, 4))
    sh.alpha_composite(icon, (280, 4)); sh.alpha_composite(s16, (284, 44))
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sh.convert("RGB").resize((990, 420), Image.NEAREST).save(S / "b11-3.png")


if __name__ == "__main__":
    build()
