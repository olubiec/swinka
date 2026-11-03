"""Kafle 16x16 w stylu domku z siana: podlogi, tapety, trawa, woda, plot, kamien pamieci.
Tekstury kafli sa proceduralne ale ZAWINIETE (torus): kafel zawsze laczy sie sam ze soba."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H

N = 16


def tile():
    return H.canvas(N, N)


def wp(im, x, y, c):
    H.put(im, x % N, y % N, c)


def fill(im, c):
    H.rect(im, 0, 0, N - 1, N - 1, c)


def planks(base, dark, light, seed, rows=4, joints=True):
    """Deski poziome (4 px wysokosci): jasna krawedz u gory, ciemna szczelina u dolu, sekacz, rozsuniete styki."""
    r = random.Random(seed)
    im = tile(); fill(im, base)
    bh = N // rows
    for b in range(rows):
        y0 = b * bh
        for x in range(N):
            wp(im, x, y0, light)
            wp(im, x, y0 + bh - 1, dark)
        if joints:
            jx = r.randint(2, 13)
            for y in range(y0, y0 + bh):
                wp(im, jx, y, dark)
        for _ in range(3):                       # slady slojow
            x, y = r.randint(0, N - 1), y0 + r.randint(1, bh - 2)
            for k in range(r.randint(2, 4)):
                wp(im, x + k, y, dark if r.random() < 0.5 else light)
        if r.random() < 0.6:                     # sek
            wp(im, r.randint(1, 14), y0 + 1 + r.randint(0, bh - 3), dark)
    return im


def wicker(base, dark, light):
    """Wiklina: skosna krata w rytmie 2x2, wypukla."""
    im = tile(); fill(im, base)
    for y in range(N):
        for x in range(N):
            k = ((x + y) // 2 + (x - y) // 2) % 2
            u = (x + y) % 4
            if u == 0: wp(im, x, y, dark)
            elif (x - y) % 4 == 0: wp(im, x, y, light if k else base)
    return im


def knit(base, dark, light):
    """Dzianina: rzad 'v' sciegu."""
    im = tile(); fill(im, base)
    for y in range(0, N, 2):
        for x in range(0, N, 2):
            off = (y // 2) % 2
            wp(im, x + off, y, dark); wp(im, x + off + 1, y + 1, dark)
            wp(im, x + off + 1, y, light)
    return im


def straw(base, dark, light, seed):
    """Siano: luzne zdzbla pod katem."""
    r = random.Random(seed)
    im = tile(); fill(im, base)
    for _ in range(26):
        x, y = r.randint(0, N - 1), r.randint(0, N - 1)
        c = dark if r.random() < 0.4 else light
        L = r.randint(3, 6)
        for k in range(L):
            wp(im, x + k, y - k // 2, c)
    return im


def paper(base, motif, seed, kind):
    """Tapeta: jednolita baza + wzor co 8 px (przesuniety w co drugim rzedzie)."""
    im = tile(); fill(im, base)
    for gy in range(2):
        for gx in range(2):
            x = gx * 8 + (4 if gy else 0) + 2
            y = gy * 8 + 3
            if kind == "dots":
                wp(im, x, y, motif); wp(im, x + 1, y, motif)
            elif kind == "flower":
                wp(im, x, y, motif); wp(im, x - 1, y + 1, motif); wp(im, x + 1, y + 1, motif); wp(im, x, y + 2, motif)
            elif kind == "paw":
                wp(im, x, y + 1, motif); wp(im, x + 1, y + 1, motif); wp(im, x, y, motif); wp(im, x + 2, y, motif)
                wp(im, x + 1, y + 2, motif)
            elif kind == "sprig":
                for k in range(3): wp(im, x, y + k, motif)
                wp(im, x - 1, y + 1, motif); wp(im, x + 1, y, motif)
            elif kind == "star":
                wp(im, x, y, motif); wp(im, x - 1, y, motif); wp(im, x + 1, y, motif); wp(im, x, y - 1, motif); wp(im, x, y + 1, motif)
            elif kind == "lattice":
                wp(im, x, y, motif); wp(im, x + 1, y + 1, motif); wp(im, x + 2, y + 2, motif)
                wp(im, x + 2, y, motif); wp(im, x, y + 2, motif)
            elif kind == "cloud":
                H.hline(im, x - 1, x + 2, y, motif) if False else None
                for k in range(-1, 3): wp(im, x + k, y + 1, motif)
                wp(im, x, y, motif); wp(im, x + 1, y, motif)
            elif kind == "heart":
                wp(im, x, y, motif); wp(im, x + 2, y, motif); wp(im, x, y + 1, motif); wp(im, x + 1, y + 1, motif); wp(im, x + 2, y + 1, motif); wp(im, x + 1, y + 2, motif)
    return im


def tiles_floor(base, dark, light, seed):
    """Plytki 8x8 z fuga i lekko zroznicowanym tonem (bez szachownicy)."""
    r = random.Random(seed)
    im = tile(); fill(im, base)
    for gy in range(2):
        for gx in range(2):
            c = r.choice([base, light, base])
            H.rect(im, gx * 8 + 1, gy * 8 + 1, gx * 8 + 7, gy * 8 + 7, c)
    for i in range(N):
        wp(im, i, 0, dark); wp(im, i, 8, dark); wp(im, 0, i, dark); wp(im, 8, i, dark)
    for gy in range(2):
        for gx in range(2):
            wp(im, gx * 8 + 2, gy * 8 + 2, light); wp(im, gx * 8 + 3, gy * 8 + 2, light)
    return im


def grass(base, dark, light, seed, flowers=True, regular=False):
    """Trawa: kepy w roznych kierunkach, kwiaty jako punkty."""
    r = random.Random(seed)
    im = tile(); fill(im, base)
    for _ in range(5 if not regular else 8):
        x, y = r.randint(0, N - 1), r.randint(0, N - 1)
        lean = r.choice([-1, 0, 1])
        for k in range(r.randint(2, 4)):
            wp(im, x + lean * (k // 2), y - k, light if k > 0 else dark)
        wp(im, x, y + 1, dark)
    for _ in range(4):
        wp(im, r.randint(0, N - 1), r.randint(0, N - 1), dark)
    if flowers:
        for c in (r.choice(["rose.1", "hay.2", "linen.2"]),):
            if r.random() < 0.6:
                wp(im, r.randint(1, 14), r.randint(1, 14), c)
    return im


def water(frame):
    """Woda: pasy dusk plynace w poziomie (petla co 4 klatki), odbicie nieba, punktowy blask."""
    im = tile(); fill(im, "dusk.2")
    for y in range(N):
        for x in range(N):
            ph = (x + frame * 4 + 3 * (y // 3) + (y % 3 == 0) * 2) % N
            band = (y * 5 + (2 if y % 4 < 2 else 0)) % N
            if (ph + y * 2) % 16 < 4 and y % 3 == 1:
                wp(im, x, y, "dusk.3")
            elif (ph - y * 3) % 16 < 3 and y % 3 == 2:
                wp(im, x, y, "dusk.1")
    for k in range(5):
        wp(im, (4 + k + frame * 4) % N, 5, "dusk.4")
    wp(im, (11 + frame * 4) % N, 11, "linen.3")
    return im


def fence(mask):
    """Plot: slupek na srodku + poprzeczki w strone sasiadow. Bity: 1 N, 2 E, 4 S, 8 W."""
    im = H.canvas(N, N)
    rail_h = lambda x0, x1: [H.hline(im, x0, x1, 7, "wood.3"), H.hline(im, x0, x1, 8, "wood.2"), H.hline(im, x0, x1, 9, "wood.1"),
                            H.hline(im, x0, x1, 11, "wood.3"), H.hline(im, x0, x1, 12, "wood.2"), H.hline(im, x0, x1, 13, "wood.1")]
    if mask & 2: rail_h(8, 15)
    if mask & 8: rail_h(0, 7)
    if mask & 1:
        H.rect(im, 7, 0, 8, 7, "wood.2"); H.vline(im, 7, 0, 7, "wood.3"); H.vline(im, 8, 0, 7, "wood.1")
    if mask & 4:
        H.rect(im, 7, 9, 8, 15, "wood.2"); H.vline(im, 7, 9, 15, "wood.3"); H.vline(im, 8, 9, 15, "wood.1")
    H.rect(im, 6, 4, 9, 14, "wood.2")                               # slupek
    H.vline(im, 6, 4, 14, "wood.3"); H.vline(im, 9, 4, 14, "wood.0")
    H.hline(im, 6, 9, 3, "wood.3"); H.put(im, 7, 2, "wood.3"); H.put(im, 8, 2, "wood.2")      # czapeczka
    H.put(im, 7, 9, "wood.0"); H.put(im, 8, 11, "wood.1")
    H.hline(im, 5, 10, 15, "plum.1")                                   # cien u podstawy
    return H.outline(im, sides="nesw") if False else H.outline(im)


def memory_stone():
    im = tile()
    H.rrect(im, 3, 3, 12, 14, 3, ("linen.0", "linen.1", "linen.2", "linen.3"))
    H.rect(im, 5, 7, 10, 9, "linen.3"); H.hline(im, 5, 10, 9, "linen.0"); H.hline(im, 6, 9, 8, "plum.2")
    H.put(im, 4, 14, "moss.2"); H.put(im, 5, 14, "moss.3"); H.put(im, 11, 14, "moss.2"); H.put(im, 12, 13, "moss.3")
    H.put(im, 2, 14, "rose.1"); H.put(im, 13, 14, "hay.2"); H.put(im, 7, 4, "plum.3")
    im = H.outline(im)
    return H.contact_shadow(im, 0) if False else im
