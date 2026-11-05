"""M1: 6 odtwarzacz-radio (stan off + 4 klatki on). Uzycie: python3 tools/art/world/players_m1.py
-> assets/world/house/player_*.png (+_on), atlas.json, lights.json (zrodla), album docs/album/przebudowa/m1_odtwarzacze.png"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image
P = "house"


def disc(im, cx, cy, r, c, c2=None):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r // 2: H.put(im, x, y, c)
    if c2: H.put(im, cx, cy, c2)


def fin(im):
    H.break_checkers(im); im = H.outline(im)
    return H.contact_shadow(im, rows=1, spread=1)


def turntable(f=None):  # 32x16 gramofon drewniany
    im = H.canvas(32, 16); H.rect(im, 2, 6, 29, 13, "wood.2"); H.hline(im, 2, 29, 6, "wood.3"); H.hline(im, 2, 29, 13, "wood.1")
    H.rect(im, 3, 3, 28, 5, "wood.3"); H.hline(im, 3, 28, 3, "linen.1")                      # uchylona pokrywa
    disc(im, 11, 9, 4, "plum.2", "hay.3"); H.put(im, 9, 7, "dusk.3")                          # talerz z plyta
    if f is not None: H.put(im, 11 + (0, 3, 0, -3)[f], 9 + (-3, 0, 3, 0)[f], "linen.2")       # kropka obrotu
    H.hline(im, 17, 25, 8, "hay.2"); H.put(im, 25, 7, "hay.3"); H.put(im, 17, 9, "hay.1")      # ramie
    H.put(im, 22, 11, "hay.3"); H.put(im, 25, 11, "flame.2"); H.put(im, 27, 11, "linen.3")
    return fin(im)


def portable(f=None):  # 32x16 walizkowy
    im = H.canvas(32, 16); H.rect(im, 3, 4, 28, 13, "brick.2"); H.hline(im, 3, 28, 4, "brick.3"); H.vline(im, 3, 4, 13, "brick.3")
    H.hline(im, 3, 28, 13, "brick.1"); H.rect(im, 5, 6, 26, 11, "linen.2")
    disc(im, 11, 9, 3, "plum.2", "rose.1"); H.hline(im, 17, 23, 7, "hay.2"); H.put(im, 23, 6, "hay.3")
    for x in (19, 21, 23, 25): H.put(im, x, 10, "wood.3")
    if f is not None: H.put(im, 11 + (0, 2, 0, -2)[f], 9 + (-2, 0, 2, 0)[f], "linen.3")
    H.rect(im, 14, 2, 17, 3, "hay.2"); H.hline(im, 14, 17, 2, "hay.3")                          # raczka
    H.put(im, 5, 5, "hay.3"); H.put(im, 26, 5, "hay.3")
    return fin(im)


def gramophone(f=None):  # 32x32 fonograf z tuba
    im = H.canvas(32, 32); H.rect(im, 4, 22, 22, 29, "wood.2"); H.hline(im, 4, 22, 22, "wood.3"); H.hline(im, 4, 22, 29, "wood.1")
    disc(im, 13, 22, 4, "plum.2", "hay.3")
    H.vline(im, 22, 24, 28, "wood.1"); H.rect(im, 24, 24, 27, 26, "hay.2"); H.hline(im, 24, 27, 24, "hay.3")    # korba
    if f is not None: H.put(im, 25 + (0, 1, 0, -1)[f], 25 + (-1, 0, 1, 0)[f], "linen.3")
    H.rect(im, 12, 15, 14, 21, "hay.2")                                                               # szyja tuby
    for i, (x0, x1) in enumerate(((13, 16), (13, 18), (14, 20), (15, 22), (16, 24), (17, 26))):
        y = 14 - i * 2; H.hline(im, x0 + 2, x1 + 2, y, "hay.3" if i % 2 else "hay.2"); H.hline(im, x0 + 2, x1 + 2, y - 1, "hay.2")
    H.vline(im, 27, 2, 10, "hay.1"); H.rect(im, 20, 3, 27, 4, "hay.1")
    H.put(im, 21, 5, "hay.3")
    return fin(im)


def cassette(f=None):  # 32x16 magnetofon
    im = H.canvas(32, 16); H.rect(im, 2, 3, 29, 13, "linen.2"); H.hline(im, 2, 29, 3, "linen.3"); H.vline(im, 2, 3, 13, "linen.3"); H.hline(im, 2, 29, 13, "linen.0")
    H.rect(im, 5, 5, 20, 10, "dusk.4")
    for cx in (9, 16):
        disc(im, cx, 8, 2, "linen.3", "dusk.4")
        if f is not None: H.put(im, cx + (0, 1, 0, -1)[f], 8 + (-1, 0, 1, 0)[f], "dusk.4")
    H.hline(im, 7, 18, 10, "wood.2")
    for i, c in enumerate(("brick.2", "moss.2", "hay.2", "rose.1")): H.rect(im, 22 + i * 2 % 8, 6 + i // 4, 23 + i * 2 % 8, 7, c)
    H.hline(im, 22, 28, 10, "linen.1"); H.hline(im, 5, 20, 12, "hay.1")
    return fin(im)


def jukebox(f=None):  # 32x32 szafa grajaca
    im = H.canvas(32, 32); H.rect(im, 6, 8, 25, 29, "wood.2"); H.vline(im, 6, 8, 29, "wood.3"); H.vline(im, 25, 8, 29, "wood.1")
    for i, w in enumerate((8, 12, 14, 16)): H.hline(im, 16 - w // 2, 15 + w // 2, 3 + i * 2, "wood.2" if i % 2 else "wood.3")
    H.rect(im, 8, 8, 23, 10, "brick.2")                                                               # gorny pas
    H.rect(im, 9, 12, 22, 21, "dusk.4"); H.hline(im, 9, 22, 12, "dusk.2")
    disc(im, 15, 17, 4, "plum.2", "hay.3"); H.hline(im, 10, 21, 19, "hay.2")                          # okienko z plyta
    lamp = ("flame.2", "flame.3", "hay.2", "flame.3")[f] if f is not None else "hay.1"
    for x in (9, 11, 13, 15, 17, 19, 21): H.put(im, x, 23, lamp if (x // 2 + (f or 0)) % 2 == 0 else "brick.2")
    H.rect(im, 9, 25, 22, 28, "hay.1"); H.hline(im, 9, 22, 25, "hay.3")
    for x in (11, 15, 19): H.put(im, x, 27, "wood.1")
    H.rect(im, 4, 12, 5, 28, "hay.2"); H.rect(im, 26, 12, 27, 28, "hay.2")                           # chromowane boki
    return fin(im)


def boombox(f=None):  # 32x16 radiomagnetofon
    im = H.canvas(32, 16); H.rect(im, 1, 4, 30, 14, "dusk.3"); H.hline(im, 1, 30, 4, "dusk.2"); H.hline(im, 1, 30, 14, "dusk.4")
    for cx in (7, 24):
        disc(im, cx, 9, 4, "dusk.4"); disc(im, cx, 9, 2, "dusk.3", "hay.3")
        if f in (1, 3): disc(im, cx, 9, 3, "dusk.4"); disc(im, cx, 9, 1, "dusk.3", "hay.3")
    H.rect(im, 12, 6, 19, 9, "linen.2"); H.hline(im, 12, 19, 6, "linen.3")
    for i in range(4):
        h = (1, 2, 3, 2)[(i + (f or 0)) % 4] if f is not None else 1
        H.vline(im, 13 + i * 2, 9 - h, 8, "moss.2")
    H.hline(im, 12, 19, 11, "flame.2"); H.put(im, 13, 12, "hay.3"); H.put(im, 16, 12, "rose.1"); H.put(im, 19, 12, "moss.2")
    H.vline(im, 27, 0, 3, "linen.2"); H.put(im, 28, 0, "linen.3")                                      # antena
    return fin(im)


PLAYERS = [("player_turntable", turntable, "Wooden turntable", 8), ("player_portable", portable, "Suitcase record player", 8),
           ("player_gramophone", gramophone, "Horn gramophone", 8), ("player_cassette", cassette, "Cassette deck", 8),
           ("player_jukebox", jukebox, "Jukebox", 8), ("player_boombox", boombox, "Boombox", 8)]
# zrodlo swiatla: lekkie cieple tlo; tylko szafa i boombox mocniejsze
LIGHT = {"player_turntable": ([1.0, 0.72, 0.4], 2.0, 0.35), "player_portable": ([1.0, 0.72, 0.4], 2.0, 0.3), "player_gramophone": ([1.0, 0.75, 0.4], 2.0, 0.3),
         "player_cassette": ([1.0, 0.8, 0.5], 2.0, 0.3), "player_jukebox": ([1.0, 0.5, 0.3], 4.0, 0.9), "player_boombox": ([0.9, 0.9, 0.5], 3.0, 0.5)}

if __name__ == "__main__":
    for pid, fn, _, fps in PLAYERS:
        H.register_states(pid, P, fn(None), [fn(i) for i in range(4)], pid, fps=4)
    p = H.ROOT / "assets/data/lights.json"; d = json.loads(p.read_text(encoding="utf-8"))
    for pid, fn, _, _ in PLAYERS:
        col, rad, st = LIGHT[pid]; im = fn(None)
        d["sources"][pid] = {"place": "indoor", "color": col, "radius_cells": rad, "strength": st, "flicker": 0.04, "toggle": True,
                             "note": "odtwarzacz-radio, miekka poswiata gdy gra", "item": pid, "file": f"house/{pid}.png",
                             "on_file": f"house/{pid}_on.png", "frames": 4, "fps": 4, "glow": [im.width // 2, im.height // 2]}
    p.write_text(json.dumps(d, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    out = H.ROOT / "docs/album/przebudowa/m1_odtwarzacze.png"
    sh = Image.new("RGBA", (36 * len(PLAYERS), 76), (120, 110, 100, 255))
    for k, (pid, fn, _, _) in enumerate(PLAYERS):
        sh.alpha_composite(fn(None), (36 * k + 2, 36 - fn(None).height)); sh.alpha_composite(fn(1), (36 * k + 2, 74 - fn(1).height))
    sh.resize((sh.width * 4, sh.height * 4), Image.NEAREST).save(out); print(len(PLAYERS))
