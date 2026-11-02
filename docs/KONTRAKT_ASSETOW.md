# Kontrakt plików grafiki (dla kodu, 2.11.2026)

Format jest ostateczny. Kod tylko wczytuje i rysuje; jeśli pliku brak, rysuje glif zapasowy. Wszystkie sprite'y mają wersję `_x2` (nearest neighbour) dla HiDPI. Skala w grze: całkowita, `image-rendering: pixelated`.

| Co | Plik | Format |
|---|---|---|
| Świnki z kolekcji | `assets/sprites/pigs/<id>/<etap>/spritesheet(.x2).png`, `animations(.x2).json`; indeks `assets/sprites/pigs/pigs.json` | arkusz 1024x3840 (x2: 2048x7680), 60 animacji, bez przemapowania kolorów |
| Obrót | `rotation.json` w folderze etapu | `turn_smooth` (8 klatek), `idle_34` (4 klatki) |
| Świnka generyczna | `assets/sprites/<etap>/` (smooth_normal) i `assets/sprites/breeds/<rasa>_<budowa>/<etap>/`; indeks `breeds.json` | arkusz główny kodowany strefami + `palettes.json` (dokładne przemapowanie) |
| Portrety | `assets/sprites/portraits/<id>.png` | 128x128, okrągła plakietka, `ned kuki glen james racuch` |
| Ikony | `assets/icons/icons_16.png` + `icons.json` | pasek 161 ikon 16x16, indeksy 0-160, klasy `.icon-*` w `style.css` |
| Przedmioty świata | `assets/world/atlas.json` -> `items[id]` | `file`, `file_x2`, `cells [w,h]`, `size`, `anchor` (dół, środek); `id` = `world_items.json` |
| Uprawy i grządki | `assets/world/farm/farm.png` + `farm.json` | `frames[id] = [[x,y,w,h],...]`; `crop_<id>` 4 klatki (nasiono, kiełek, rośnie, dojrzała), `tree_<id>` 3 klatki 16x32, `bed_empty`, `bed_wet`, `soil`, `water_anim` (4), `great_harvest` (4) |
| Tła | `assets/world/bg/<garden|park>_<morning|day|evening|night>.png`, `farm.png`, `market.png` | ogród i farma 256x144, park 384x192, targ 256x144 |
| Kafelki | `assets/world/tiles/<id>.png` + `assets/world/tiles.json` | 16x16: `grass_1/2`, `grass_park`, `water_0..3` (animacja), `fence_00..15` (maska 1 N, 2 E, 4 S, 8 W), `wall_/floor_<bedroom|playroom>_1..4`; `memory_stone` 32x32 |
| Targ | `assets/world/market/<id>.png` | `stall_basic` 48x40, `stall_big` 64x40, `order_board` 32x32, `promo_1..3` 32x16 |
| Dekoracje starego sklepu | `assets/decor/decor.png` + `decor.json` | atlas 40 przedmiotów |
| Podgląd wszystkiego | `docs/album/podglad/*.png` | do oglądania, nie do gry |

Generatory: `tools/art/*` (numpy + Pillow). Regeneracja: `python3 tools/art/export_all.py assets`, `export_named.py assets`, `icons_world.py assets`, `farm_art.py assets`, `items_art.py assets`, `tiles_art.py assets`, `portraits.py assets`.
