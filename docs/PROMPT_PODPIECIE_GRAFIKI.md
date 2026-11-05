# Prompt: podpięcie całej grafiki Cuy (kod)

Jesteś programistą projektu Cuy (`olubiec/swinka`). Cała grafika jest już w `assets/` i przechodzi testy (`python3 tools/art/style_check.py` = 0 naruszeń, `node tools/qa/check-assets.js`, `check-icons.js`, `lights-test.js` OK). NIE rysuj i NIE zmieniaj plików w `assets/`, `tools/art/`. Twoje zadanie to tylko kod: `web/home/`, `src/`. Teksty w grze po angielsku, dokumentacja po polsku. Bazę ścieżek dają `assetsBase()` w `web/home/lib/sprites.js` i `web/home/lib/ui-assets.js` (WebView2: `https://cuy.assets/`, przeglądarka: `../../assets/`). Raport końcowy max 15 linii, bez PR-ów, push `git push -q origin HEAD:main`.

## 1. Gdzie leży grafika (wszystko względem `assets/`)

| Co | Gdzie | Opis / indeks |
|---|---|---|
| Ikony 16x16 | `icons/icons_16.png` + `icons/icons.json` | jeden rząd, 316 pól; `icons.json` mapuje nazwa → indeks |
| Ikona okna | `app-icon/` | `cuy.ico`, `icon_16/32/256.png`, `logo_256.png` |
| Kafle ścian i podłóg, płotów, trawy, wody | `world/tiles/*.png` (+ `_x2`) | indeks: `world/tiles.json` → `tiles` (68), `bg` (12), `market` (9) |
| Tła pokoi i okolic | `world/bg/` | garden/park × morning/day/evening/night, `farm`, `market`, `menu`, `orchard` (+ `_x2`); rozmiary w `tiles.json` → `bg` |
| Przedmioty świata (sprite'y) | `world/house/`, `world/garden/`, `world/park/`, `world/farm/`, `world/market/` | indeks: `world/atlas.json` → `items` (103) |
| Światła i efekty | `world/fx/` (`beam_window`, `cone_fireplace`, `cone_shade`, `dust_motes`, `glow_round`), `world/house/lamp_*` | konfiguracja: `data/lights.json` (ścieżki względem `assets/world/`, nie `assets/`) |
| Rekwizyty | `props/` (`ball`, `hay_ball`, `house`, `tunnel` + `_x2`), `props/props.json` | |
| Świnki | `sprites/{baby,junior,adult,senior,legend,companion_*}/`, `sprites/pigs/`, `sprites/portraits/`, `sprites/breeds/` | indeksy: `sprites/breeds.json`, `variants.json`, `palettes.json` |
| Interfejs 9-slice | `ui/*.png` + `ui/ui.json` | 48 elementów, każdy: `file`, `size`, `slice`; `ui/ui_tokens.css` |
| Efekty muzyki | `fx/fx_notes.png` | |
| Płyty | `records/manifest.json`, `records/sleeve/` (24 okładki), `records/s<seria>_<id>_<stan>.png` (stany: mint, worn, scratched, cracked, warped), ramki `records/frame_{common,rare,unique}.png` (32x32) | 24 płyty w 4 seriach; ikony płyt `rec_*` w `icons.json` |
| Odtwarzacze | `records/players_design.json` (projekt, zasady, szkic ekonomii), UI `ui/mp_*.png`, `ui/shelf_plank.png` | 6 odtwarzaczy |
| Muzyka | `music/tracks.json` + 5 plików `.ogg` | płyty mają jeszcze `tracks: 0` |
| Kolorowanki, dane | `coloring/*.json`, `data/*.json` (m.in. `style_palette.json`, `world_items.json`, `items*.json`, `lights.json`) | |
| Stary dekor | `decor/decor.png` | nieużywany, do decyzji (usunąć albo podpiąć) |

Dokumenty: `docs/KONTRAKT_ASSETOW.md` (kontrakt), `docs/UI_DESIGN.md` (zasady interfejsu), `docs/STYL_SWIATA.md` (styl), `docs/PRZEKAZANIE_PODPIECIA.txt`, `docs/PRZEKAZANIE_ODTWARZACZE.md`, `docs/PLAN_ODTWARZACZ.md`, `docs/VISUAL_LOG.md`, `docs/ui/preview.html` + `preview.png` (podgląd wszystkich elementów UI).

## 2. Zadania

1. **Ikony (pewne braki).** W `web/home/style.css` (ok. linii 703) `--icon-count: 278`, a arkusz ma **316** pól; brakuje 39 reguł `.icon-*`. Gotowy blok jest w `docs/icons_css_block.css` (generuje go `tools/art/world/icons_auto.py`): ustaw `--icon-count: 316` i wklej brakujące reguły. Popraw indeks `candle`. Alias `icon-pig` → ikona `pig_head`. Test: każda nazwa z `icons.json` ma regułę; `node tools/qa/check-icons.js`.
2. **Interfejs 9-slice.** `lib/ui-assets.js` ustawia `--ui-<id>` z `ui.json`. Sprawdź, że wszystkie 48 elementów są użyte tam, gdzie powinny (panele, przyciski normal/hover/pressed w 5 kolorach, zakładki, pola, karty, tooltipy, sloty, suwaki, paski, `header_banner`, `shop_panel`, `badge_wear_*`). Dla `sep_h`, `sep_v` i `bar_fill_*` ustaw `border-image-repeat: repeat` (inaczej ścieg się rozciąga). Środek 9-slice jest jednolity: nie dokładaj tam obrazków.
3. **Kafle.** Ściany `wallpaper_mint/peach/sky/lilac/night/cream` i podłogi `floor_wood_light, floor_wood, floor_tiles_checker, floor_carpet_red, floor_grass, floor_soil, floor_stone, floor_straw, floor_fleece` istnieją w `world/tiles/` i `tiles.json`. Rysuj je z kafli zamiast płaskich kolorów (`FLOOR_COLORS`, `FALLBACK_LOOK`).
4. **Światła.** `rooms/garden/farm/market feature.js` ładują ścieżki z `lights.json` względem `assets/`, a mają być względem `assets/world/` (`'world/' + ścieżka`). Test: `node tools/qa/lights-test.js` i podgląd lamp wieczorem.
5. **Przedmioty.** 81 pozycji w `data/world_items.json` ma sprite (`atlas.json`) i ikonę. Sprawdź, że sklep i edytor pokoju czytają ikony po polu `icon`, a sprite po `atlas.json`.
6. **Odtwarzacz muzyki (jeszcze nie ma kodu).** Nic w `web/` ani `src/` nie czyta `records/manifest.json` ani `players_design.json`. Zbuduj: półkę płyt (`records/`, ramki rarity 32x32 wokół okładki, stan płyty = plik `_stan.png`), 6 odtwarzaczy z `ui/mp_*.png`, efekty `fx/fx_notes.png`. Zasady i ekonomia są w `players_design.json` (ekonomia to szkic do dopracowania, ceny ustala człowiek). Tańczące świnki przy odtwarzaczu: `docs/PLAN_ODTWARZACZ.md`.
7. **Do decyzji człowieka:** `decor/decor.png` (usunąć czy podpiąć), niebieski przycisk `btn_blue` względem legendy stylu, wąsy kędzierzawe i ucho Glena (wymagają reeksportu 25 arkuszy świnek, robi grafik).

## 3. Weryfikacja

`python3 tools/art/style_check.py`, `node tools/qa/check-assets.js`, `node tools/qa/check-icons.js`, `node tools/qa/lights-test.js`, potem build: `powershell -ExecutionPolicy Bypass -File tools/build.ps1`. Wizualnie porównaj z `docs/ui/preview.png`.
