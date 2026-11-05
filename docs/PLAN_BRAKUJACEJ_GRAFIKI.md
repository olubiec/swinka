# Plan: brakująca grafika (audyt 5.11.2026)

Status: **audyt zrobiony, grafika jeszcze niewygenerowana** (czeka na zgodę). Audyt: porównanie id z kodu i danych (`web/home`, `src/Cuy.Core`, `assets/data/*.json`) z plikami w `assets/`; testy `check-assets.js`, `check-icons.js`, `style_check.py` (lint 0).

## 1. Wyniki audytu
| # | Znalezisko | Liczba | Rodzaj |
|---|---|---|---|
| A | Brak kafli ścian i podłóg dla id używanych w kodzie: ściany `wallpaper_mint/peach/sky/lilac/night/cream`, podłogi `floor_wood_light, floor_tiles_checker, floor_grass, floor_carpet_red, floor_wood, floor_straw, floor_fleece, floor_soil, floor_stone` (dziś rysuje je kod płaskim kolorem/CSS, `tiles.json` ma 53 wpisy, żaden z tych id) | **15** | grafika |
| B | Brak ikon 16x16 dla 55 przedmiotów świata (`world_items.json`, pole `icon` = id, brak w `icons.json`): dom 19, ogród 16, park 12, farma 4, rekwizyty `prop_*` 4 (w tym 5 `sig_*` w domu) | **55** | grafika |
| C | 32 przedmioty narysowane w atlasie, ale bez wpisu w `world_items.json` (nie da się ich kupić ani postawić); do ikon potrzebnych jest 26 (bez `candle`, który ma ikonę, i bez 5 elementów konstrukcyjnych: `house_frame, dorm_nest, barn_hay, plot_lawn, plot_orchard`) | **26** ikon | grafika + dane |
| D | 10 przedmiotów sklepu „dekor" ma tylko rysunek z kodu (canvas, stary styl): `rug_round_pink, rug_stripes, rug_heart, plant_fern, plant_cactus, plant_flowers, picture_pig, picture_sunset, picture_carrot, lamp_star` (`lamp_mushroom` już ma sprite) | **10** | grafika (opcjonalne) |
| E | `icon-pig` (CSS pigs) nie ma wpisu w `icons.json` — to alias ikony `pig_head` (indeks 24); sprawa kodu | 1 | kod |
| F | Tekstury świateł **istnieją**: `assets/world/fx/{dust_motes,cone_shade,beam_window,cone_fireplace,glow_round}.png`, `assets/world/house/lamp_floor{,_on}.png` itd. Są „brakujące" tylko dlatego, że `rooms/garden/farm/market feature.js` ładują `lights.json` → `file/mask/dust.file` względem `assets/`, a kontrakt i `check-assets.js` mówią: względem `assets/world/` | 0 plików | **kod** |
| G | Arkusz `icons_16.png` ma 174 pola, `icons.json` 173 wpisy (dziura w indeksie 125); CSS: `--icon-count: 161` i brak reguł dla 11 ikon 162–173 (`bedroom, run, gate, tray, storage, swatch, wander, bond, rename, color-lock, house-plan`); `candle` ma w CSS indeks 125, w JSON 161 | – | kod |
| H | `assets/decor/decor.png` (40 starych przedmiotów, id typu `bed_aspen`) nie pasuje do żadnego id w danych; nikt go nie ładuje | – | decyzja: usunąć albo podpiąć |
| I | Drobne z paczki: wąsy kędzierzawe (R1), ucho Glena z rdzawą smugą | 2 | opcjonalne |

Razem do narysowania: **15 kafli + 81 ikon** obowiązkowo (A, B, C), do **10 sprite'ów** dekoru (D) i 2 poprawki świnek (I).

## 2. Plan generowania (fale C1–C5; reguły jak w `docs/PLAN_PRZEBUDOWY.md` §2)
Bramka każdej fali: lint `style_check.py` = 0, arkusz kontaktowy obejrzany, `check-assets.js` bez nowych błędów, kontrakt zaktualizowany. Skrypty w `tools/art/world/`, paleta `cuy-hay-house`, ikony wg `icons_a.py` (kontur `#3a1d17`, światło z lewej góry).

| Fala | Zadanie | Wynik | Uwagi |
|---|---|---|---|
| **C1 kafle** (15) | C1-1 ściany: `wallpaper_mint` (pasy), `_peach` (kropki), `_sky` (chmurki), `_lilac` (romby), `_night` (gwiazdy), `_cream` (gładka z lekkim wzorem); C1-2 podłogi: `floor_wood_light`, `floor_wood`, `floor_tiles_checker` (szachownica 2 tony), `floor_carpet_red` (dzianina, rampa `brick`), `floor_grass`, `floor_soil`, `floor_stone`, `floor_straw`, `floor_fleece`; C1-3 wpisy w `tiles.json`, arkusz, test układania 3x3 (szew niewidoczny) | `assets/world/tiles/*.png` 16x16 + wpisy | rozszerzyć `build_tiles.py`; szachownica i pasy to wzory celowe: dopisać wyjątek R6 jak przy istniejących kaflach; 3 oświetlenia |
| **C2 ikony świata I** (55) | C2-1 dom 19 (w tym `sig_*` 5), C2-2 ogród 16, C2-3 park 12, C2-4 farma 4 + `prop_*` 4 | ikony 174–228, wpisy w `icons.json`, dopisane na końcu `icons_16.png` | każda ikona to uproszczona sylwetka sprite'a z atlasu (ta sama rampa); recolor-owe (12) w rampie `brick` |
| **C3 ikony świata II** (26) | `fireplace, lamp_mushroom, lamp_floor, lamp_arc, lantern_paper, lamp_salt, lamp_lava, pouf_boucle, lace_curtain, gramophone, mug_steam, rug_fringed, blanket_folded, mirror_wavy, frames_gallery, plant_pot, plant_shelf, plant_trailing, memory_frame, willow_tunnel, torch, lamp_oil, brazier, watering_can, hay_basket, stump_seat` | ikony 229–254 | dane do `world_items.json` (rozmiar `w×h`, `place`, `layer`) przygotuję jako `assets/data/world_items_proposed.json`; ceny i komfort ustala człowiek |
| **C4 dekor sklepu** (10, opcjonalnie) | sprite'y 16x16/32x16 dla pozycji D w legendzie „domek z siana", wpisy w `atlas.json` | `assets/world/house/*.png` | zastępują rysunek z kodu; bez nich gra działa jak dziś |
| **C5 domknięcie** | C5-1 poprawka wąsów (R1) i ucha Glena (I); C5-2 `docs/KONTRAKT_ASSETOW.md`, `INWENTARZ_GRAFIKI.md`, `VISUAL_LOG.md`; C5-3 album końcowy; C5-4 `check-assets.js` zielony (poza pozycjami E) | commit + push | |

Kolejność: C1 → C2 → C3 → C5 (C4 na życzenie). Przybliżony czas: 2–3 przebiegi na falę zgodnie z zasadą „2–3 fale na przebieg" → razem około 4 przebiegi.

## 3. Zadania dla kodu (nie moje; dopisane jako G17 w `docs/PLAN.md`)
1. **Światła:** w `rooms/garden/farm/market feature.js` ładować `file`, `on_file`, `mask`, `window_tods[*]` i `dust.file` jako `'world/' + ścieżka` (jak sprite'y przedmiotów). Test: `node tools/qa/lights-test.js` + podgląd lamp wieczorem.
2. **Ikony:** `icon-pig` → `icon-pig-head` (pigs `feature.css/js`); w `style.css` ustawić `--icon-count` na liczbę pól arkusza (po C3: 255), dodać 11 brakujących reguł (162–173), poprawić indeks `candle` na 161; po C2/C3 dodać reguły `.icon-<id>` dla nowych 81 ikon (generator: `tools/art/world/icons_a.py` może wypisać gotowy blok CSS).
3. **Kafle:** rysować podłogi i ściany z `tiles.json` (po C1) zamiast kolorów `FLOOR_COLORS` i `FALLBACK_LOOK`.
4. **Dane:** dopisać do `world_items.json` 26 przedmiotów z C3 (z `world_items_proposed.json`); zdecydować o `assets/decor/decor.png` (H).
