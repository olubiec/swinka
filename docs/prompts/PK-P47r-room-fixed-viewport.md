# PK-P47r: Room fixed 256x144 viewport (wave P47r)
Zmieniaj: web/home/features/places/room-geometry.js, web/home/canvas-pig.js, tools/qa/ux-p47-room.js, docs/opt/log/PK-P47r.md
Wymagane: tools/qa/ux-p47-room.js
Weryfikacja: node --check web/home/features/places/room-geometry.js && node --check web/home/canvas-pig.js && node --check tools/qa/ux-p47-room.js && node tools/qa/ux-p47-room.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The canvas keeps a fixed 256x144 size on every scene, including rooms (decision of `R47.md` section 3, option c): a smaller room is drawn inside the stage framed by continuous wallpaper and skirting; logical bounds and saved coordinates do not change.
Depends on: PK-P46b merged (`scenes.js` draws outdoor instances), PK-P44b merged.

## Kontekst (fakty sprawdzone 11.11.2026, nie szukaj drugi raz)
- Pokój domyślnie 192x112 (12x7 kratek po 16 px; `DEFAULT_COLS = 12`, `DEFAULT_ROWS = 7`, `DEFAULT_WALL_ROWS = 2` w `web/home/features/places/room-geometry.js:6-8`), `place_scenes.json:14` ma `size_from_layout: true`. Przełączenie scen zmienia rozmiar płótna (`canvas-pig.js` okolice linii 347 i 778), więc okno skacze; brief wymaga stałego rozmiaru.
- Ulepszenia pokoju: salon 12x7 -> 16x8 -> 20x9, pokoje świnek 10x6 -> 12x7 -> 14x8 (`assets/data/places.json`, `assets/data/pig_rooms.json`). Zapisane współrzędne kratek (0..11, 0..6) muszą pozostać poprawne: ZERO migracji zapisu.
- Poza zakresem tej paczki: tła ogrodu/parku/farmy/targu (PK-P47a), `scenes.js`, `place_scenes.json`.

## Steps
1. W `canvas-pig.js` ustaw stały rozmiar sceny 256x144 dla każdej sceny (także gdy `size_from_layout`); zmieniaj tylko to, co wylicza rozmiar płótna i przesunięcie sceny w kadrze. Pokój mniejszy niż 256x144 rysuj wyśrodkowany w kadrze (obszar poza pokojem: ciągła tapeta i listwa przypodłogowa z istniejących kafelków podłogi/ściany, bez nowych plików graficznych; jeśli kafelków nie da się powielić, wypełnij kolorem ściany/podłogi z palety).
2. W `room-geometry.js` dodaj funkcję zwracającą przesunięcie pokoju w kadrze (`stageOffset(cols, rows)`) i użyj jej tam, gdzie przeliczane są piksele <-> kratki (rysowanie, trafianie myszą, przeciąganie w Edit, chodzenie świnki). Granice logiczne (`cols`, `rows`, `wallRows`) zostają bez zmian.
3. Testy FIRST, `tools/qa/ux-p47-room.js` (Playwright, `tools/qa/lib/ux.js`, `CuyScenesMock.state('seven')`): T1 po przejściu przez wszystkie 7 scen `CanvasPig.debug()` zwraca ten sam rozmiar 256x144 (brak zmiany szerokości i wysokości); T2 pokój 12x7 jest wyśrodkowany (offset > 0), a kliknięcie w kratkę (0,0) i (11,6) trafia w tę samą kratkę co przed zmianą; T3 pozycje zapisane jako kratki (np. przedmiot na (3,2)) rysują się w tym samym miejscu względem pokoju; T4 po ulepszeniu do 16x8 offset maleje, a pokój nadal mieści się w kadrze; T5 brak błędów w konsoli.
4. Uruchom Weryfikacja; napraw do zielonego.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P47r.md` (max 10 lines: nazwy dodanych funkcji, jak wypełniony jest kadr poza pokojem, różnice od planu, BLOCKED reason if any).
