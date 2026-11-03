"""Lint stylu "domek z siana" (docs/STYL_SWIATA.md pkt 12).

Uzycie:
  python3 tools/art/style_check.py                  # caly swiat (atlas + tiles.json), raport
  python3 tools/art/style_check.py plik.png ...     # pojedyncze pliki (tryb: przedmiot)
  python3 tools/art/style_check.py --strict         # kod wyjscia 1 przy naruszeniach
  python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt

Reguly:
  R1 kolor spoza palety          R2 kolor zakazany (biel, czern, czyste RGB)
  R3 nasycenie > 0.75 przy jasnosci > 0.55 poza rampa flame
  R4 kontur: brzegowy piksel przedmiotu (sasiad przezroczysty) to kontur fg/deep,
     najciemniejszy ton rampy albo plum[0..1] (kontur selektywny)
  R5 rozmiar pliku = wpis w atlasie/tiles.json (przedmioty: wielokrotnosc 16)
  R6 paski czerwono-biale (brick/linen o okresie <= 3) i szachownica 4x4
  R7 cien kontaktowy plum[1] pod przedmiotami warstwy floor/ground
"""
from __future__ import annotations

import colorsys
from collections import Counter
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H  # noqa: E402

ROOT = H.ROOT
FORBIDDEN = {H._hex(c) for c in H._pal["forbidden"]["colors"]}
FLAME = set(H.RAMPS["flame"])
EDGE_OK = {H.OUTLINE_FG, H.OUTLINE_DEEP, H.RAMPS["plum"][0], H.RAMPS["plum"][1]} | {
    r[0] for r in H.RAMPS.values()}
NO_OUTLINE = {"fairy_lights"}   # cienki sznur 1 px: kontur zepsulby sylwete
BRICK = set(H.RAMPS["brick"])
LINEN = set(H.RAMPS["linen"])


def _load(path):
    return Image.open(path).convert("RGBA")


def r1_r2_r3(im):
    out = {"R1": 0, "R2": 0, "R3": 0}
    data = im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()
    for p, n in Counter(data).items():
        if not p[3]:
            continue
        c = p[:3]
        if c in FORBIDDEN:
            out["R2"] += n
        if c not in H.PALETTE:
            out["R1"] += n
        h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c))
        if s > 0.75 and v > 0.55 and c not in FLAME:
            out["R3"] += n
    return out


def r4_outline(im):
    px = im.load()
    w, h = im.size
    bad = 0
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if not p[3]:
                continue
            edge = any(0 <= x + dx < w and 0 <= y + dy < h and not px[x + dx, y + dy][3]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge and p[:3] not in EDGE_OK:
                bad += 1
    return bad


def r6_patterns(im):
    px = im.load()
    w, h = im.size
    found = 0
    # szachownica 4x4 z dwoch kolorow
    for y in range(h - 3):
        for x in range(w - 3):
            a, b = px[x, y], px[x + 1, y]
            if a == b or not a[3] or not b[3]:
                continue
            if all(px[x + i, y + j] == (a if (i + j) % 2 == 0 else b)
                   for i in range(4) for j in range(4)):
                found += 1
    # paski brick/linen: >= 4 kolejne przemienne biegi o dlugosci <= 3 (poziomo i pionowo)
    def runs(line):
        res, cur, n = [], line[0], 1
        for c in line[1:]:
            if c == cur:
                n += 1
            else:
                res.append((cur, n)); cur, n = c, 1
        res.append((cur, n))
        return res
    def stripes(line):
        rs = runs(line)
        cnt = 0
        for i in range(len(rs)):
            seq = rs[i:i + 4]
            if len(seq) < 4 or any(n > 3 for _, n in seq):
                continue
            fam = [("b" if c[:3] in BRICK else "l" if c[:3] in LINEN else "?") for c, _ in seq]
            if fam in (["b", "l", "b", "l"], ["l", "b", "l", "b"]):
                cnt += 1
        return cnt
    for y in range(h):
        found += stripes([px[x, y] for x in range(w)])
    for x in range(w):
        found += stripes([px[x, y] for y in range(h)])
    return found


def r7_shadow(im):
    """True gdy pod najnizszym wierszem (lub w nim) jest plum[1]."""
    px = im.load()
    w, h = im.size
    sh = H.SHADOW
    rows = [y for y in range(h) for x in range(w) if px[x, y][3]]
    if not rows:
        return True
    bottom = max(rows)
    for y in (bottom, bottom - 1):
        if y >= 0 and any(px[x, y][:3] == sh and px[x, y][3] for x in range(w)):
            return True
    return False


def check_image(path, kind="item", size=None, layer=None, name=""):
    """kind: item | tile | bg. Zwraca dict regula -> liczba naruszen."""
    im = _load(path)
    res = r1_r2_r3(im)
    if kind in ("item", "prop"):
        res["R4"] = r4_outline(im) if name not in NO_OUTLINE else 0
        if kind == "item" and (im.width % 16 or im.height % 16):
            res["R5"] = 1
    else:
        res["R4"] = 0
    if size and list(im.size) != list(size):
        res["R5"] = res.get("R5", 0) + 1
    res.setdefault("R5", 0)
    res["R6"] = r6_patterns(im)
    res["R7"] = 0 if (kind != "item" or layer not in ("floor", "ground") or r7_shadow(im)) else 1
    return res


def world_files():
    atlas = json.loads(H.ATLAS_FILE.read_text(encoding="utf-8"))["items"]
    items = json.loads((ROOT / "assets/data/world_items.json").read_text(encoding="utf-8"))["items"]
    layers = {i["id"]: i.get("layer") for i in items}
    for iid, e in atlas.items():
        yield iid, H.WORLD_DIR / e["file"], "item", e["size"], layers.get(iid)
    t = json.loads(H.TILES_FILE.read_text(encoding="utf-8"))
    for tid, e in t["tiles"].items():
        yield "tile:" + tid, H.WORLD_DIR / e["file"], "tile", e["size"], None
    for bid, e in t["bg"].items():
        yield "bg:" + bid, H.WORLD_DIR / e["file"], "bg", e["size"], None
    for mid, e in t["market"].items():
        yield "market:" + mid, H.WORLD_DIR / e["file"], "prop", e["size"], None


def run(paths=None):
    rows = []
    if paths:
        for p in paths:
            rows.append((Path(p).stem, check_image(p)))
    else:
        for name, path, kind, size, layer in world_files():
            if not Path(path).exists():
                rows.append((name, {"R5": 1, "missing": 1}))
                continue
            rows.append((name, check_image(path, kind, size, layer, name)))
    return rows


def report(rows):
    rules = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]
    lines = ["plik\t" + "\t".join(rules)]
    totals = dict.fromkeys(rules, 0)
    files_bad = 0
    for name, r in rows:
        v = [r.get(k, 0) for k in rules]
        for k, n in zip(rules, v):
            totals[k] += n
        if any(v):
            files_bad += 1
        lines.append(name + "\t" + "\t".join(map(str, v)))
    head = [f"Pliki: {len(rows)}, z naruszeniami: {files_bad}",
            "Suma (piksele lub wystapienia): " + ", ".join(f"{k}={totals[k]}" for k in rules), ""]
    return "\n".join(head + lines) + "\n", files_bad


if __name__ == "__main__":
    args = sys.argv[1:]
    strict = "--strict" in args
    baseline = None
    if "--baseline" in args:
        i = args.index("--baseline")
        baseline = args[i + 1]
        del args[i:i + 2]
    args = [a for a in args if not a.startswith("--")]
    text, bad = report(run(args or None))
    if baseline:
        Path(baseline).parent.mkdir(parents=True, exist_ok=True)
        Path(baseline).write_text(text, encoding="utf-8")
        print(text.split("\n\n")[0])
    else:
        print(text)
    if strict and bad:
        sys.exit(1)
