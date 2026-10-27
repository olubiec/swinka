# Brakująca grafika (stan 26.10.2026)

Wszystko z listy jest narysowane (commity `art: ikony pogody, padlock, trophy`, `art: odznaki osiągnięć`, `art: wariant junior`):
60 animacji w 8 wariantach (w tym `junior`) i 61 ikon w `assets/icons/icons.json`. Nic już nie brakuje; zastępniki z poprzedniej wersji tej listy
są zbędne. Grafika jest rysowana proceduralnie w Pythonie (`tools/art/`, numpy + Pillow), więc nowe elementy powstają jako skrypty.

## Co dodano
| # | Element | Indeksy / miejsce | Używa go |
| --- | --- | --- | --- |
| 1 | `weather_clear`, `weather_cloudy`, `weather_fog`, `weather_rain`, `weather_snow`, `weather_storm` | ikony 49–54, `.icon-weather-*` | F6-04 |
| 2 | `padlock` | ikona 55, `.icon-padlock` | F6-05 |
| 3 | `trophy` | ikona 56, `.icon-trophy` | F8-01 |
| 4 | `badge_care`, `badge_play`, `badge_growth`, `badge_social` | ikony 57–60, `.icon-badge-*` | F8-01 (opcjonalnie) |
| 5 | wariant `junior` (1024×3840, 60 animacji, 592 klatki) | `assets/sprites/junior/`, wpis w `variants.json` | F4-01, F8-02 |

Uwaga: `export.py` nie tworzy pliku `swinka_spritesheet_x2.json`, którego `english_assets.py` używa do `floor_y` wersji x2 (wartość 118).
Przy ponownym generowaniu wariantu trzeba go podłożyć w katalogu eksportu.

## Zasady stylu (muszą się zgadzać z istniejącą grafiką)
- Ikony 16×16, kontur `#3a1d17`, 2–4 odcienie na materiał, przezroczyste tło, światło z lewej góry. Kolejność ikon w arkuszu nie może się zmienić (nowe dopisujemy na końcu `icons_16.png`, indeksy w `assets/icons/icons.json`).
- Świnka: klatka 64×64, podłoga na y=59, patrzy w prawo, ta sama siatka animacji co w `baby/` (16 kolumn × 60 wierszy, plik `spritesheet.png` 1024×3840 + `animations.json` + wersje `_x2`).
- Junior ma proporcje pośrednie między `baby` (kb=0,78, kh=0,88) i `adult` (1,0, 1,0), kolor jak dorosła ruda, bez cech seniora.

## Wanted later: own icons
- `soft_pellets` (borrows `pellets`)
- `warm_house_bed` (borrows `house`)
- `dental_chew` (borrows `chew_stick`)
- `vitamin_mix` (borrows `vitamin_drops`)
- `carrot_top` (borrows `carrot`)
