# Brakująca grafika (stan 26.10.2026)

Wszystkie 60 animacji w 7 wariantach i 49 ikon są gotowe. Poniżej to, czego jeszcze brakuje. Nic z tego nie blokuje fal 3–8,
bo gra ma dla każdej pozycji zastępnik. Grafika jest rysowana proceduralnie w Pythonie (`tools/art/`, numpy + Pillow), więc
nowe elementy powstają jako skrypty, nie jako ręcznie malowane pliki.

## Lista
| # | Element | Po co | Zastępnik, gdy go nie ma | Potrzebne przed |
| --- | --- | --- | --- | --- |
| 1 | Ikony pogody: `weather_clear`, `weather_cloudy`, `weather_fog`, `weather_rain`, `weather_snow`, `weather_storm` (16×16) | F6-04: obok temperatury w Domku i w ustawieniach | sam tekst | falą 6 |
| 2 | Ikona `padlock` (16×16) | F6-05: zablokowane triki | emoji lub tekst "locked" | falą 6 |
| 3 | Ikona `trophy` (16×16) | F8-01: nagłówek i karty osiągnięć | ikona `clover` | falą 8 |
| 4 | Odznaki osiągnięć (opcjonalnie, 16×16): `badge_care`, `badge_play`, `badge_growth`, `badge_social` | F8-01: kolor karty wg kategorii | jedna ikona `trophy` dla wszystkich | falą 8 |
| 5 | Wariant `junior` (arkusz klatek 64×64, 60 animacji) | F4-01 i F8-02: etap Junior wygląda inaczej niż Baby | grafika `baby` (gra to obsługuje) | falą 4 (opcjonalnie) |

## Zasady stylu (muszą się zgadzać z istniejącą grafiką)
- Ikony 16×16, kontur `#3a1d17`, 2–4 odcienie na materiał, przezroczyste tło, światło z lewej góry. Kolejność ikon w arkuszu nie może się zmienić (nowe dopisujemy na końcu `icons_16.png`, indeksy w `assets/icons/icons.json`).
- Świnka: klatka 64×64, podłoga na y=59, patrzy w prawo, ta sama siatka animacji co w `baby/` (16 kolumn × 60 wierszy, plik `spritesheet.png` 1024×3840 + `animations.json` + wersje `_x2`).
- Junior ma proporcje pośrednie między `baby` (kb=0,78, kh=0,88) i `adult` (1,0, 1,0), kolor jak dorosła ruda, bez cech seniora.

## Prompt do sesji z dostępem do repo (Claude Code, model Sonnet)
Wklej poniższy blok do nowej sesji. Zrobi wszystko w jednej sesji, w 3 commitach, bez pushu.

```
Zadanie: dorysuj brakującą grafikę do projektu Cuy (repo olubiec/swinka). Wszystko w Pythonie w tools/art/, grafika proceduralna.
Czytaj RULES.md raz. Nie czytaj assets/sprites/*/*.png ani animations.xml. Nie zmieniaj niczego poza wymienionymi plikami.
Nie pushuj, dopóki nie napiszę "pushuj". Jeden commit na część. Raport na końcu max 12 linii.
Środowisko: Python 3 z numpy i Pillow (pip install --break-system-packages numpy pillow, jeśli brakuje).

CZĘŚĆ A: ikony pogody, kłódka, puchar (commit "art: ikony pogody, padlock, trophy")
1. Przeczytaj tools/art/README.md oraz tools/art/icons_extra.py (tablica icon_order ~ linia 239, funkcje rysujące, pomocniki E, shade, rect, Canvas z props.py) i jedną istniejącą ikonę jako wzór stylu.
2. Dodaj funkcje rysujące i dopisz do KOŃCA icon_order, w tej kolejności: weather_clear (słońce z promieniami), weather_cloudy (chmura),
   weather_fog (chmura z poziomymi pasmami mgły), weather_rain (chmura + 3 krople), weather_snow (chmura + 3 płatki), weather_storm (ciemna chmura + żółta błyskawica),
   padlock (kłódka zamknięta, korpus złoty, kabłąk szary), trophy (złoty puchar z uchwytami).
   Styl: kontur #3a1d17, 2-4 odcienie, przezroczyste tło, światło z lewej góry, czytelne w 16 px.
3. Uruchom: cd tools/art && python3 icons_extra.py ../../assets. Skrypt nie może zmienić indeksów istniejących ikon ani zduplikować ikon przy ponownym uruchomieniu (uruchom dwa razy i sprawdź, że icons.json ma dokładnie 8 nowych kluczy, razem 57).
4. Sprawdź, czy web/home/style.css ma linię .icon-<id> { --i: N; } dla każdej ikony (wzór: istniejące linie). Dopisz brakujące 8 linii, łącznie z --icon-count (jeśli blok go używa, zaktualizuj liczbę ikon).
5. Zrób podgląd: tools/art/ - wygeneruj PNG 8 nowych ikon powiększonych 8× na jasnym i ciemnym tle, zapisz jako scratch (nie commituj), obejrzyj Read-em i popraw ikony, które są nieczytelne.

CZĘŚĆ B: odznaki osiągnięć (opcjonalnie; commit "art: odznaki osiągnięć")
Dodaj w ten sam sposób 4 ikony na końcu icon_order: badge_care (serce na tarczy), badge_play (piłka), badge_growth (roślinka), badge_social (dwie główki świnek).
Ten sam styl, indeksy dopisane po części A (razem 61), 4 linie CSS. Pomiń, jeśli część A ma problemy.

CZĘŚĆ C: wariant junior (commit "art: wariant junior")
1. Przeczytaj tools/art/pig.py (set_style, ~linia 40), export.py (lista VARIANTS) i english_assets.py (mapy VAR, VAR_DESC).
2. W pig.set_style dodaj age == 'junior': STYLE.update(kb=0.9, kh=0.94) (pośrednio między baby 0.78/0.88 a adult 1.0/1.0).
   W export.py dodaj ('mlodzik', 'junior', 'ruda', 'Młodzik') po 'maluch'; w english_assets.py dodaj mlodzik -> junior (VAR i VAR_DESC: 'Junior').
3. Wygeneruj tylko ten wariant (nie nadpisuj innych folderów w assets/): uruchom export.py do katalogu tymczasowego, potem english_assets.py do drugiego katalogu tymczasowego
   i skopiuj do assets/sprites/junior/ TYLKO spritesheet.png, spritesheet_x2.png, animations.json, animations_x2.json. Sprawdź: spritesheet.png ma 1024×3840 px, animations.json ma 60 animacji, liczba klatek taka sama jak w baby/animations.json.
4. Zaktualizuj assets/sprites/variants.json (dopisz junior: description "Junior", folder "junior", animations 60, frames = liczba z animations.json). NIE uruchamiaj make_coloring.py i nie zmieniaj assets/coloring.
5. Zrób podgląd klatek idle, walk i sleep dla baby, junior i adult obok siebie (scratch, nie commituj). Junior ma być wyraźnie pośredni; jeśli nie jest, popraw kb/kh i wygeneruj ponownie.
6. Uruchom testy wariantów, jeśli są w tools/qa (przeczytaj nazwę z ls, nie czytaj całych plików). Dopisz do THIRD_PARTY_NOTICES.md nic (to własna grafika).

KONIEC: git status czysty, 3 commity lokalne. W raporcie: liczba ikon w icons.json, rozmiar spritesheet junior, to co nie zadziałało.
```

## Po wykonaniu
1. Napisz mi "pushuj", a ja wypchnę i dopiszę ikony do promptów F6-04, F6-05, F8-01 (ikona `padlock`, `weather_*`, `trophy`) oraz sprawdzę, że F4-01 i F8-02 wybierają folder `junior`.
2. Jeśli sesja nie zdąży z częścią C, zostaje zastępnik z `baby` i nic się nie psuje.
