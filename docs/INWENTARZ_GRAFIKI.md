# Inwentarz grafiki (2.11.2026)

Spis tego, co jest w `assets/`, i tego, czego brakuje. Liczby sprawdzone skryptem na plikach, nie z pamięci. Rozmiar `assets/`: 51 MB (budżet paczki 60 MB).

## Jest (sprawdzone)
| Element | Stan | Gdzie |
|---|---|---|
| Pięć świnek z kolekcji (Ned, Kuki, Glen, James, Racuch) | 5 x 5 etapów (baby, junior, adult, senior, legend), po 60 animacji, arkusze x1 i x2, `animations.json`, `rotation.json` | `assets/sprites/pigs/<id>/<etap>/`, `pigs.json` |
| Świnka generyczna | 5 etapów x 8 kształtów (smooth/teddy/rosette/peruvian x normal/chubby/lean), 60 animacji | `assets/sprites/<etap>/`, `assets/sprites/breeds/<kształt>/<etap>/`, `breeds.json` |
| Towarzysze | agouti, czarno-biała, kremowa (dorosłe) | `assets/sprites/companion_*` |
| Maści | 13 wzorów x 10 palet, 13 stref, palety seniora, 5 nazwanych | `assets/sprites/palettes.json` |
| Obrót | `turn` 0/30/60/90, `turn_smooth` 8 klatek, `idle_34` 4 klatki | `rotation.json` w każdym folderze |
| Ikony 16x16 | 120 (indeksy 0-119), w tym wzory, rasy, cechy, pogoda, odznaki | `assets/icons/icons_16.png`, `icons.json` |
| Dekoracje sklepu | 40 przedmiotów w atlasie | `assets/decor/decor.png`, `decor.json` |
| Dźwięki i muzyka | 10 efektów, 5 utworów | `assets/sounds/`, `assets/music/` |
| Ikona aplikacji, kolorowanki | tak | `assets/app-icon/`, `assets/coloring/` |

## Dodane w paczce finalnej (2.11.2026)
| Element | Ile | Gdzie |
|---|---|---|
| Ikony R4 (5 wzorów), R7 (4), S0 (24), produkty farmy i nasiono (8) | 41, indeksy 120-160 | `assets/icons/icons_16.png`, `icons.json` (generator `tools/art/icons_world.py`) |
| Portrety 128 px (R3) | 5 | `assets/sprites/portraits/<id>.png` |
| Rex: kędzierzawe nakrapianie Jamesa (R1) | 5 etapów | `assets/sprites/pigs/james/` |
| Uprawy (S1): 11 jednorocznych x 4 klatki, 4 drzewka x 3, grządki, podlewanie, błysk zbioru | 67 klatek | `assets/world/farm/farm.png` + `farm.json` (+x2) |
| Przedmioty S2-S5 | 45 (dom 14, ogród 15, park 12, farma 4) | `assets/world/<miejsce>/<id>.png` + `atlas.json` |
| Tła: ogród i park x4 pory, farma, targ | 10 | `assets/world/bg/` |
| Kafelki: trawa, woda x4, płot x16, tapety i podłogi sypialni i pokoju zabaw (16), kamień pamięci | 39 | `assets/world/tiles/`, `tiles.json` |
| Targ: 2 stragany, tablica zleceń, 3 tabliczki | 6 | `assets/world/market/` |
| Podgląd wszystkiego | 13 plików | `docs/album/podglad/` (`tools/art/podglad.py`) |

## Nadal brak
| Co | Uwagi |
|---|---|
| Głowy wg rasy (R2) | nadal wspólna głowa dla wszystkich kształtów |
| Wzmocnienie wirów generycznych (R5) | niezrobione |
| Prawdziwe wąsy kędzierzawe (R1) | James ma nakrapianie sierści, wąsy bez zmian |
| Ucho Glena z rdzawą smugą | |
Sprite'y świata są pierwszą wersją i wymagają przeglądu w grze (kod wczytujący `assets/world/` to kontrakt, nie moja część).

Poza grafiką (kod, nie robię): wczytanie `pigs.json`, życie osobne dla każdej świnki, odblokowania, odtwarzanie obrotu, rysowanie dekoracji (kontrakty T1-T10 w `docs/PLAN_GRAFIK_V2.md`).

## Uwagi do świnek
- Ned: serduszko jest po jednej stronie grzbietu, ale z profilu czyta się raczej jako plama.
- James: jednolicie szary, bez rexowych wąsów i bez nakrapiania ze zdjęcia.
- Glen: rozetki i rdzawy pasek poprawione w tej rundzie; ucho bez rdzawej smugi.
- Kuki i Racuch: łaty zgodne z profilem, przodem i tyłem.
