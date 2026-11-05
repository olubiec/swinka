# Przekazanie: odtwarzacze i płyty (dla programisty i agenta audio)

Zakres graficzny jest gotowy (M1-M4). Design i zasady: `docs/PLAN_ODTWARZACZ.md` (sekcje 7, 9, 10, 11). Notatki projektowe w danych: `assets/records/players_design.json`, `assets/records/manifest.json`.

## Co jest w repo (grafika)
| Co | Gdzie |
|---|---|
| 6 odtwarzaczy, stan wyłączony i `_on` (4 klatki) | `assets/world/house/player_*.png`, światła w `assets/data/lights.json` |
| 24 płyty x 5 stanów (dysk 16x16) | `assets/records/<id>_<mint|worn|scratched|cracked|warped>.png` |
| Rękawy 24x24, ramki rzadkości 28x28, pusty slot | `assets/records/sleeve/`, `frame_common/rare/unique.png`, `sleeve_empty.png` |
| Manifest 24 płyt (id, seria, rzadkość, pliki, ikona) | `assets/records/manifest.json` (v3) |
| Ikony: 6 `m_player_*`, 8 sterowania, 24 `rec_<id>`; `play`/`pause` istnieją | `icons_16.png` indeksy 278-315, `icons.json`, `docs/icons_css_block.css` |
| UI: `mp_panel`, `mp_display`, `mp_btn`, `mp_btn_pressed`, `mp_knob`, `mp_thumb`, `shelf_plank`, `badge_wear_*` | `assets/ui/` (wpisy w `ui.json`, 9-slice) |
| Efekty: nutki, VU, odkrycie płyty | `assets/fx/fx_notes.png` (8x8 x8), `fx_vu.png` (12x8 x4), `fx_record_reveal.png` (32x32 x6) |
| Podgląd ekranów | `docs/ui/music_preview.png`, albumy `docs/album/przebudowa/m1/m2/m3_*.png` |

## Do zrobienia w kodzie (nie moje)
1. `--icon-count` w `web/home/style.css` = **316** (jest 161, G17).
2. `world_items.json`: 6 odtwarzaczy (id `player_*`, rozmiar z pliku, światło jest w `lights.json`).
3. Dane: `players.json` (z `players_design.json`: zasięg, filtr, bonus, styl tańca) i `records.json` (z `manifest.json` plus tytuły utworów, cena, `tracks`).
4. Zapis gry: posiadane płyty (id + stan), odtwarzacze (miejsce, aktualna płyta, włączony, głośność).
5. UI: mini-odtwarzacz, półka, album (4 strony x 6, licznik n/24), zakładka sklepu, odkrycie płyty (kolejność kadrów `fx_record_reveal`).
6. Taniec świnek: patrz `PLAN_ODTWARZACZ.md` §11 (popcorn, obrót, kołysanie w rytm, nutki z `fx_notes`).
7. **Ekonomia do dopracowania** (§10 i `players_design.json` `economy_draft`): ceny, rotacja sklepu, limit bonusu nastroju, koszt/limit odtwarzaczy. Wartości w plikach są orientacyjne.

## Dla agenta audio
- 24 zestawy: utwory (pętle) + krótkie dźwięki wg serii i motywu rękawa (np. deszcz, pszczoły, świetliki, sowa, arcade, disco, synth).
- Brzmienie odtwarzaczy (filtr): turntable ciepły z trzaskiem, portable radiowy, gramophone mono z szumem, cassette z falowaniem (wow/flutter), boombox z basem, jukebox pełny.
- Stany płyt: worn = lekkie trzaski, scratched = wyraźny trzask co obrót, cracked = trzask + przeskok, warped = falowanie tonu, mint = czysto. Scratch (przeciągnięcie talerza) = osobny dźwięk.
- Tempo wg serii (taniec): 1 i 3 wolne, 2 średnie, 4 szybkie. Licencje w `assets/LICENSES`.
