"""handart: reczne rysowanie pikseli w palecie "domek z siana" (cuy-hay-house).

Sprite to lista wierszy-znakow. Domyslna legenda (jeden znak = jeden kolor palety):

  .  przezroczysty (spacja tez)
  wood  a b c d e      (ciemny -> jasny)     hay   f g h i
  linen j k l m        brick n o p q         flame r s t u
  moss  v w x y z      dusk  A B C D E       plum  F G H I
  rose  J K L          berry M N
  O kontur pierwszego planu (#3a1d17)        P kontur glebokiej nocy (#241824)

Wlasna legenda: dict znak -> "rampa.indeks" (np. {"#": "wood.2"}) lub "#rrggbb"
z palety. Kazdy kolor spoza palety konczy sie bledem: nie da sie narysowac
niezgodnego piksela.

Narzedzia: outline (kontur zewnetrzny), selout (kontur w tonie rampy),
contact_shadow (cien kontaktowy plum[1]), mirror, rot90, recolor (zamiana rampy),
save_png (indeksowany, tylko x1) i register_item / register_tile (wpis do
atlas.json / tiles.json). Bez zaleznosci poza Pillow.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PALETTE_FILE = ROOT / "assets" / "data" / "style_palette.json"
ATLAS_FILE = ROOT / "assets" / "world" / "atlas.json"
TILES_FILE = ROOT / "assets" / "world" / "tiles.json"
WORLD_DIR = ROOT / "assets" / "world"

# kolejnosc ramp i ich znakow (ramp -> lancuch znakow, ciemny -> jasny)
RAMP_CHARS = {
    "wood": "abcde", "hay": "fghi", "linen": "jklm", "brick": "nopq",
    "flame": "rstu", "moss": "vwxyz", "dusk": "ABCDE", "plum": "FGHI",
    "rose": "JKL", "berry": "MN",
}
TRANSPARENT = (".", " ")

_pal = json.loads(PALETTE_FILE.read_text(encoding="utf-8"))


def _hex(c: str):
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))


RAMPS = {n: [_hex(c) for c in cols] for n, cols in _pal["ramps"].items()}
OUTLINE_FG = _hex(_pal["outline"]["fg"])
OUTLINE_DEEP = _hex(_pal["outline"]["deep"])
PALETTE = {c for r in RAMPS.values() for c in r} | {OUTLINE_FG, OUTLINE_DEEP}
SHADOW = RAMPS["plum"][1]

for _n, _s in RAMP_CHARS.items():
    assert len(_s) == len(RAMPS[_n]), _n

DEFAULT_LEGEND = {}
for _n, _s in RAMP_CHARS.items():
    for _i, _ch in enumerate(_s):
        DEFAULT_LEGEND[_ch] = RAMPS[_n][_i]
DEFAULT_LEGEND["O"] = OUTLINE_FG
DEFAULT_LEGEND["P"] = OUTLINE_DEEP


def color(spec):
    """'wood.2' | '#rrggbb' | (r,g,b) -> (r,g,b) z palety (inaczej ValueError)."""
    if isinstance(spec, tuple):
        c = spec
    elif spec.startswith("#"):
        c = _hex(spec)
    else:
        name, idx = spec.split(".")
        if name == "outline":
            c = OUTLINE_FG if idx == "fg" else OUTLINE_DEEP
        else:
            c = RAMPS[name][int(idx)]
    if c not in PALETTE:
        raise ValueError(f"kolor poza paleta: {c}")
    return c


def ramp_of(c):
    """(nazwa_rampy, indeks) dla koloru z palety albo None (kontury)."""
    for n, r in RAMPS.items():
        if c in r:
            return n, r.index(c)
    return None


def sprite(rows, legend=None):
    """Lista wierszy -> RGBA. Wiersze musza miec te sama dlugosc."""
    lg = dict(DEFAULT_LEGEND)
    for k, v in (legend or {}).items():
        lg[k] = color(v)
    w = len(rows[0])
    for i, r in enumerate(rows):
        if len(r) != w:
            raise ValueError(f"wiersz {i} ma {len(r)} znakow, oczekiwano {w}")
    im = Image.new("RGBA", (w, len(rows)), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in TRANSPARENT:
                continue
            if ch not in lg:
                raise ValueError(f"nieznany znak {ch!r} w wierszu {y}")
            px[x, y] = lg[ch] + (255,)
    return im


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def paste(dst, src, x, y):
    dst.alpha_composite(src, (x, y))
    return dst


def outline(im, deep=False, sides="nesw"):
    """Kontur zewnetrzny 1 px na przezroczystych sasiadach pikseli (4-sasiedztwo).
    sides: ktore kierunki konturowac (n,e,s,w), np. 'esw' = bez gory."""
    col = (OUTLINE_DEEP if deep else OUTLINE_FG) + (255,)
    out = im.copy()
    src, dst = im.load(), out.load()
    w, h = im.size
    d = {"n": (0, 1), "e": (-1, 0), "s": (0, -1), "w": (1, 0)}
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for s in sides:
                dx, dy = d[s]
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    dst[x, y] = col
                    break
    return out


def selout(im):
    """Kontur selektywny: krawedziowe piksele rampy dostaja ton ciemniejszy o 1
    stopien w tej samej rampie (bez ramp = bez zmian). Krawedz = sasiad przezroczysty."""
    out = im.copy()
    src, dst = im.load(), out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            p = src[x, y]
            if not p[3]:
                continue
            edge = any(
                not (0 <= x + dx < w and 0 <= y + dy < h) or not src[x + dx, y + dy][3]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if not edge:
                continue
            r = ramp_of(p[:3])
            if r and r[1] > 0:
                dst[x, y] = RAMPS[r[0]][r[1] - 1] + (255,)
    return out


def contact_shadow(im, rows=1, spread=1):
    """Cien kontaktowy plum[1]: `rows` wierszy pod najnizszym nieprzezroczystym
    wierszem, szerszy o `spread` px z kazdej strony, tylko na przezroczystym."""
    out = im.copy()
    src, dst = im.load(), out.load()
    w, h = im.size
    bottom = max((y for y in range(h) for x in range(w) if src[x, y][3]), default=None)
    if bottom is None:
        return out
    xs = [x for x in range(w) if src[x, bottom][3]]
    x0, x1 = min(xs) - spread, max(xs) + spread
    for k in range(1, rows + 1):
        y = bottom + k
        if y >= h:
            break
        for x in range(max(0, x0 + (k - 1)), min(w, x1 + 1 - (k - 1))):
            if not src[x, y][3]:
                dst[x, y] = SHADOW + (255,)
    return out


def mirror(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def rot90(im, k=1):
    for _ in range(k % 4):
        im = im.transpose(Image.ROTATE_270)
    return im


def recolor(im, src_ramp, dst_ramp):
    """Zamiana rampy po pozycji wzglednej (4 -> 5 stopni dobiera najblizszy)."""
    a, b = RAMPS[src_ramp], RAMPS[dst_ramp]
    m = {}
    for i, c in enumerate(a):
        j = round(i * (len(b) - 1) / (len(a) - 1)) if len(a) > 1 else 0
        m[c] = b[j]
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if p[3] and p[:3] in m:
                px[x, y] = m[p[:3]] + (255,)
    return out


def used_colors(im):
    return {p[:3] for p in im.getdata() if p[3]}


def check_palette(im):
    bad = used_colors(im) - PALETTE
    if bad:
        raise ValueError("kolory poza paleta: " + ", ".join("#%02x%02x%02x" % c for c in sorted(bad)))


def save_png(im, path, indexed=True):
    """Zapis x1. Sprawdza palete. Indeksowany PNG (przezroczystosc = indeks 0)."""
    check_palette(im)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not indexed:
        im.save(path)
        return path
    cols = sorted(used_colors(im))
    pal = [(0, 0, 0)] + cols
    flat = []
    for c in pal:
        flat += list(c)
    flat += [0] * (768 - len(flat))
    idx = {c: i + 1 for i, c in enumerate(cols)}
    out = Image.new("P", im.size, 0)
    out.putpalette(flat)
    px, src = out.load(), im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = src[x, y]
            px[x, y] = idx[p[:3]] if p[3] else 0
    out.save(path, transparency=0, optimize=True)
    return path


def _update_json(path, fn):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    fn(data)
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def register_item(item_id, place, im, rel_file=None, atlas=ATLAS_FILE, world_dir=WORLD_DIR, **extra):
    """Zapisuje PNG do <world_dir>/<place>/<id>.png i wpis w atlas.json.
    Rozmiar musi byc wielokrotnoscia 16 (siatka). Kotwica: dol-srodek.
    Pole file_x2 nie jest juz zapisywane (po G14)."""
    w, h = im.size
    if w % 16 or h % 16:
        raise ValueError(f"{item_id}: rozmiar {w}x{h} nie jest wielokrotnoscia 16")
    rel = rel_file or f"{place}/{item_id}.png"
    save_png(im, Path(world_dir) / rel)

    def upd(d):
        e = d["items"].setdefault(item_id, {})
        e.update({"place": place, "cells": [w // 16, h // 16], "size": [w, h],
                  "file": rel, "anchor": [w // 2, h]})
        e.update(extra)
    _update_json(atlas, upd)
    return rel


def register_tile(tile_id, im, rel_file=None, tiles=TILES_FILE, world_dir=WORLD_DIR):
    rel = rel_file or f"tiles/{tile_id}.png"
    save_png(im, Path(world_dir) / rel)

    def upd(d):
        d["tiles"][tile_id] = {"file": rel, "size": [im.width, im.height]}
    _update_json(tiles, upd)
    return rel


def sheet(images, scale=4, pad=4, bg=(0x2b, 0x3c, 0x4e)):
    """Szybki arkusz podgladu: obrazki obok siebie, powiekszone nearest."""
    ims = [i.resize((i.width * scale, i.height * scale), Image.NEAREST) for i in images]
    W = sum(i.width for i in ims) + pad * (len(ims) + 1)
    H = max(i.height for i in ims) + 2 * pad
    out = Image.new("RGB", (W, H), bg)
    x = pad
    for i in ims:
        out.paste(i, (x, pad), i)
        x += i.width + pad
    return out


# ---- prymitywy rysunkowe (bryly cieniowane recznie ustawianymi tonami) ----
def put(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), color(c) + (255,))


def put_in(im, x, y, c):
    """Rysuje tylko na juz nieprzezroczystym pikselu (detal wewnatrz bryly, nic nie wystaje)."""
    if 0 <= x < im.width and 0 <= y < im.height and im.getpixel((x, y))[3]:
        im.putpixel((x, y), color(c) + (255,))


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(im, x, y, c)


def hline(im, x0, x1, y, c):
    rect(im, x0, y, x1, y, c)


def vline(im, x, y0, y1, c):
    rect(im, x, y0, x, y1, c)


def rrect(im, x0, y0, x1, y1, r, tones):
    """Zaokraglony prostokat z cieniowaniem: tones = (cien, baza, swiatlo, blysk).
    Gora: swiatlo (1 wiersz) + blysk na lewym-gornym naroznikach, dol i prawo: cien."""
    sh, base, lt, hi = [color(t) for t in tones]
    def inside(x, y):
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            return False
        dx = max(x0 + r - x, 0, x - (x1 - r))
        dy = max(y0 + r - y, 0, y - (y1 - r))
        return dx * dx + dy * dy <= r * r + r * 0.6
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if not inside(x, y):
                continue
            c = base
            if not inside(x, y - 1) or not inside(x - 1, y - 1) and y - y0 < 3:
                c = lt
            if (x - x0 < 2 and y - y0 < 4 + r) and not inside(x - 1, y):
                c = lt
            if not inside(x, y + 1) or (not inside(x + 1, y) and y - y0 > r):
                c = sh
            put(im, x, y, c)
    return im


def register_states(item_id, place, off, on_frames, light_kind, fps=8, atlas=ATLAS_FILE, world_dir=WORLD_DIR):
    """Przedmiot-zrodlo swiatla: <id>.png = wylaczony, <id>_on.png = pasek klatek
    wlaczonego (klatki obok siebie). Wpis: light {kind, on_file, frames, fps}."""
    w, h = off.size
    strip = canvas(w * len(on_frames), h)
    for i, f in enumerate(on_frames):
        strip.alpha_composite(f, (i * w, 0))
    on_rel = f"{place}/{item_id}_on.png"
    save_png(strip, Path(world_dir) / on_rel)
    return register_item(item_id, place, off, atlas=atlas, world_dir=world_dir,
                         light={"kind": light_kind, "on_file": on_rel, "frames": len(on_frames), "fps": fps})


def break_checkers(im, limit=50):
    """Usuwa szachownice 4x4 (regula R6): zmienia srodkowy piksel o ton w rampie."""
    px = im.load()
    for _ in range(limit):
        hit = None
        for y in range(im.height - 3):
            for x in range(im.width - 3):
                a, b = px[x, y], px[x + 1, y]
                if a != b and a[3] and b[3] and all(
                        px[x + i, y + j] == (a if (i + j) % 2 == 0 else b) for i in range(4) for j in range(4)):
                    hit = (x + 1, y + 1, a)
                    break
            if hit:
                break
        if not hit:
            return im
        x, y, a = hit
        r = ramp_of(px[x, y][:3])
        if r:
            n, i = r
            px[x, y] = RAMPS[n][i + 1 if i + 1 < len(RAMPS[n]) else i - 1] + (255,)
    return im


def ground(im, rows=1, spread=1):
    """Kontur + cien kontaktowy. Gdy przedmiot siega dolu komorki (brak miejsca na cien),
    dolny wiersz konturu zamienia sie w cien plum[1] (kontur selektywny)."""
    im = outline(im)
    px = im.load()
    bottom = max((y for y in range(im.height) for x in range(im.width) if px[x, y][3]), default=-1)
    if bottom >= im.height - 1:
        for x in range(im.width):
            if px[x, bottom][:3] == OUTLINE_FG and px[x, bottom][3]:
                px[x, bottom] = SHADOW + (255,)
        return im
    return contact_shadow(im, rows=rows, spread=spread)
