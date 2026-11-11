# PK-P47a: Clean 256x144 backgrounds without painted fixtures (wave P47a)
Zmieniaj: tools/art/world/garden_bg.py, tools/art/world/park_bg.py, tools/art/world/farm_bg.py, tools/art/world/market_bg.py, assets/world/bg/garden_morning.png, assets/world/bg/garden_day.png, assets/world/bg/garden_evening.png, assets/world/bg/garden_night.png, assets/world/bg/park_morning.png, assets/world/bg/park_day.png, assets/world/bg/park_evening.png, assets/world/bg/park_night.png, assets/world/bg/farm.png, assets/world/bg/market.png, assets/data/place_scenes.json, tools/qa/ux-p47-bg.js, docs/opt/log/PK-P47a.md
Wymagane: tools/qa/ux-p47-bg.js
Weryfikacja: node --check tools/qa/ux-p47-bg.js && node tools/qa/ux-p47-bg.js && node tools/qa/place-scenes-check.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz zakresy linii znalezione przez grep; PNG wolno oglądać tylko pliki tła z Zmieniaj (po jednym zrzucie na scenę). Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Regenerate the outdoor backgrounds (garden, park, farm, market) at 256x144 without the fixtures that are now saved instances, and mark those scenes `bg_clean: true`.
Depends on: PK-P46a, PK-P46b merged (`assets/data/outdoor_defaults.json`, flaga `bg_clean` i wyliczanie blockerów z instancji w `scenes.js`; read `docs/opt/log/PK-P46a.md` and `PK-P46b.md`). Decyzje: `docs/opt/foundations/R47.md` sekcje 1, 4 i 7 (GO IN-HOUSE).

## Kontekst (fakty sprawdzone 11.11.2026, nie szukaj drugi raz)
- Generatory: `tools/art/world/{garden_bg,park_bg,farm_bg,market_bg}.py` zapisują `assets/world/bg/<scena>_<pora>.png` (garden i park: morning, day, evening, night; farm i market: jeden plik). Uruchamiaj z katalogu głównego repo: `python3 tools/art/world/<nazwa>.py`.
- Sceny: `assets/data/place_scenes.json` (garden/farm/market `size [256,144]`, park `size [384,192]`, `walk`, `behindLine`, `exits`, `blockers`).
- Stałe obiekty plenerowe, które są teraz instancjami `fx:<scena>:<id>`: lista w `assets/data/outdoor_defaults.json` (z P46a). TYLKO te obiekty znikają z tła. Rzeczy spoza tej listy (np. ścieżki, rzeka, mostek, płot sceny, jeśli nie są instancjami) zostają namalowane i zachowują swoje `blockers`.
- Zasady grafiki: `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md` rozdz. 5 i 7 (tylko paleta z `assets/data/style_palette.json`, twarde piksele, światło z lewej-góry, pory dnia spójne). `check-assets.js` waliduje PNG.
- Wymiar: wszystkie tła mają mieć identyczny rozmiar 256x144, żeby okno nie skakało przy przełączaniu.

## Steps
1. Dla każdej sceny: przeczytaj generator, znajdź kod rysujący obiekty z `outdoor_defaults.json` dla tej sceny (np. fontanna, ławki, krzewy, kłody drzew, nora, stragany, stodoła) i usuń je z tła; zostaw podłoże, ścieżki, światło, cienie otoczenia. Zachowaj wszystkie 4 pory dnia dla garden i park.
2. Park: wygeneruj 256x144 (zamiast 384x192) wg `R47.md` sekcja 4: `size [256,144]`, `walk [8,80,248,138]`, `behindLine 74`, `exits.right.x 252`; usuń z `blockers` wpisy poza kadrem (`tree_trunk_3`, `tree_trunk_4`, `bench_right`, `lantern_mid`, `lantern_right`, `river_bank_right`) lub przytnij je do 256x144 jeśli opisują zostający na tle element; kompozycja zostaje (altana, strumień, mostek, ścieżka).
3. W `place_scenes.json` ustaw `"bg_clean": true` dla garden, park, farm, market (nie dla `room`/pokoi). Statyczne `blockers` obiektów-instancji usuń z tych scen (blokery wylicza kod z instancji; zostaw tylko te bez instancji).
4. Testy FIRST, `tools/qa/ux-p47-bg.js` (czysty Node, bez przeglądarki; odczytaj wymiar PNG z nagłówka IHDR): T1 każde tło garden/park/farm/market ma dokładnie 256x144; T2 `size` w `place_scenes.json` równa się wymiarom PNG; T3 `walk`, `exits` i wszystkie `blockers` mieszczą się w 256x144; T4 `bg_clean` jest true dla 4 scen i nie istnieje blocker o id obiektu z `outdoor_defaults.json` w scenach `bg_clean`; T5 generatory uruchomione dwukrotnie dają identyczne pliki (porównaj sumy kontrolne); T6 pory dnia garden i park istnieją w komplecie.
5. Uruchom generatory, potem Weryfikacja; napraw do zielonego. Jeśli `place-scenes-check.js` wymaga zmiany spoza Zmieniaj, zapisz to w logu jako BLOCKED.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P47a.md` (max 10 lines: które obiekty usunięto z której sceny, nowe wartości `place_scenes.json` parku, różnice od planu, BLOCKED reason if any).
