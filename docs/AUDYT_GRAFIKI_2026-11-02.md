# Audyt grafik i animacji (2026-11-02)

Metoda: skrypty w przeglądarce (Playwright, Chromium) i analiza PNG (Pillow). Aplikacji Windows (C#) nie dało się uruchomić w środowisku Linux, więc pulpit sprawdzono tylko statycznie.

## Co działa
- web-smoke, layout selftest, maze-test, składnia JS/JSON: bez błędów.
- 8 wariantów sprite'ów (baby, junior, adult, senior, legend, 3x companion): 1024x3840, 60 animacji, 592 klatki, wersje x2 identyczne z 1x, brak pustych klatek poza `peek`[0] i [11] (zamierzone).
- Wszystkie 4 minigry (Veggie Rain, Nyan Cuy, Veggie Memory, Hay Maze) startują, rysują się, reagują na wejście, bez błędów strony.

## Problemy
1. Home gra tylko 23 z 60 animacji: `ANIM_DEFS` w canvas-pig.js; pozostałe 37 (startle, spin, hurdle, wheek, dance, sad, sick, party...) cicho zamieniają się w idle. Senior/legend ignorują własne fps. -> W9-01
2. Junior używa sprite'ów baby w 3 miejscach (canvas-pig.js, minigames-api.js, app.js album), choć `sprites/junior/` istnieje. -> W9-01..03
3. Wszystkie 4 minigry: canvas 360 px w kontenerze 320 px z overflow:hidden, ucięty HUD i przycisk [ Finish ]. -> W9-04..07, test W10-01
4. Karty świnek: portret to ikona domku dla wszystkich; umaszczenie (paletteId) nie jest pokazane. Kod ma 5 ras x 5 umaszczeń, a grafika tylko 3 companion + etapy; żadna ścieżka kodu (web ani C#) nie używa sprite'ów companion_*. -> W9-08 (rozwiązanie tymczasowe); prawdziwe umaszczenia i rasy wymagają decyzji i pracy w tools/art.
5. Hay Maze: świnka to prostokąty 12x8 rysowane w kodzie, nie sprite (inaczej niż w pozostałych grach). Do osobnego zadania po W9-07.
6. web-smoke ukrywa błąd `addEventListener` null w vet/feature.js. -> W9-10
7. Adult i senior różnią się tylko ~0,5% pikseli (senior prawie nie wygląda na starszego).

## Pulpit (C#), tylko statycznie
Brak użycia Breed/PaletteId w src/Cuy: druga świnka nie dostaje własnego wyglądu.
