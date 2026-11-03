"""B12-3: rekwizyty pulpitu (ball, tunnel, hay_ball, house) w palecie swiata jako pliki dla okna Pulpit: bez swiatla swiata,
z cieniem kontaktowym; x1 i x2 (nearest) + props.json."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image

OUT = H.ROOT / "assets/props"
IDS = {"ball": "prop_ball", "tunnel": "prop_tunnel", "hay_ball": "prop_hay_ball", "house": "prop_house"}


def build():
    atlas = json.loads(H.ATLAS_FILE.read_text(encoding="utf-8"))["items"]
    meta = {}
    sheet = Image.new("RGBA", (150, 50), (120, 130, 140, 255)); x = 4
    for k, aid in IDS.items():
        im = Image.open(H.WORLD_DIR / atlas[aid]["file"]).convert("RGBA")
        H.save_png(im, OUT / f"{k}.png"); H.save_png(im.resize((im.width * 2, im.height * 2), Image.NEAREST), OUT / f"{k}_x2.png")
        meta[k] = {"file": f"props/{k}.png", "file_x2": f"props/{k}_x2.png", "size": list(im.size), "anchor": [im.width // 2, im.height], "source": aid}
        sheet.alpha_composite(im, (x, 46 - im.height)); x += im.width + 10
    (OUT / "props.json").write_text(json.dumps({"note": "rekwizyty okna Pulpit; swiatlo swiata nie dotyczy; kotwica dol-srodek", "items": meta}, indent=1), encoding="utf-8")
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).convert("RGB").save(S / "b12-3.png")
    sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).convert("RGB").save(H.ROOT / "docs/album/przebudowa/b12-3_rekwizyty_pulpitu.png")


if __name__ == "__main__":
    build()
