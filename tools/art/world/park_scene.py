"""B6-6: przeglad parku: 4 pory dnia, 3 swinki, nowe przedmioty na tle (3 oswietlenia: dzien, lampy, noc)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import park_bg
from PIL import Image

EXTRA = [("park/fountain.png", 30, 138), ("park/statue_pig.png", 300, 106), ("park/pond_big.png", 252, 146),
         ("park/picnic_blanket.png", 96, 150), ("park/tunnel_playground.png", 60, 100)]
PIGS = [("glen", 150, 130), ("kuki", 176, 140), ("racuch", 222, 96)]


def build(out):
    ims = [park_bg.build(t, EXTRA, PIGS).convert("RGB") for t in ("morning", "day", "evening", "night")]
    W, Ht = ims[0].size
    sh = Image.new("RGB", (W * 2 * 2 + 4, Ht * 2 * 2 + 4), H.color("plum.0"))
    for i, im in enumerate(ims):
        sh.paste(im.resize((W * 2, Ht * 2), Image.NEAREST), ((i % 2) * (W * 2 + 4), (i // 2) * (Ht * 2 + 4)))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sh.save(out)


if __name__ == "__main__":
    build(H.ROOT / "docs/album/przebudowa/b6-6_przeglad_parku.png")
