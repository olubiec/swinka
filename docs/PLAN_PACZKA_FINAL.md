# Plan fal: domknięcie paczki graficznej (2.11.2026)

Cel: wszystko z `docs/GRAFIKA_KOLEJKA.md` ma plik w `assets/`, a `docs/INWENTARZ_GRAFIKI.md` nie ma pozycji "Brak". Zakres: tylko grafika (`tools/art/`, `assets/`, `docs/`).

| Fala | Zakres | Wynik |
|---|---|---|
| F1 | Świnki: wąsy rexa (James), głowy wg rasy, wzmocnione wiry generyczne, portrety 128 px | przeliczone arkusze, `assets/sprites/portraits/` |
| F2 | Ikony: R4 (5), R7 (4), S0 (24), produkty farmy i nasiono (8) | ikony 120-180 w `icons_16.png` |
| F3 | Farma: 15 upraw (klatki wzrostu), grządki, podlewanie, błysk zbioru | `assets/world/farm/` |
| F4 | Przedmioty: salon 14, ogród 15, park 12, farma 4 | `assets/world/<miejsce>/` + `atlas.json` |
| F5 | Tła (ogród, park x4 pory; farma; targ), kafelki (trawa, woda, płot, tapety, podłogi), targ, kamień pamięci | `assets/world/tiles/`, `assets/world/bg/` |
| F6 | Podgląd wszystkich świnek, miejsc i elementów | `docs/album/podglad/` + strona HTML |
| F7 | Testy (`check_sprites`, `anim-test`, `palette-test`, `web-smoke`), budżet, inwentarz, log | commit i push |

Każdy sprite ma `_x2` (nearest neighbour), atlas `assets/world/atlas.json` z `id,x,y,w,h`. Style: kontur `#3a1d17`, światło z lewej góry, bez antyaliasingu.
