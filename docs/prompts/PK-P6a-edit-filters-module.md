# PK-P6a: Edit drawer: category tabs and search (module)
Zmieniaj: web/home/features/places/edit-filters.js, tools/qa/ux-p6-filters.js, docs/opt/log/PK-P6a.md
Weryfikacja: node --check web/home/features/places/edit-filters.js && node --check tools/qa/ux-p6-filters.js && node tools/qa/ux-p6-filters.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Category tabs (All, Furniture, Lights, Plants, Decor) and a live search for the stash drawer as a self-contained module; PK-PE2 mounts it.

Depends on: pliki badawcze z kroku F2-1 (`docs/opt/foundations/R*.md`, patrz "Czytaj"); brak zależności od innych paczek tego kroku.

Produces (names other packages rely on): `window.EditFilters` with `categorize(item)`, `filterItems(items, {tab, query})`, `tabs(items)`, `build(container, {onChange})` as fixed in R27 section 3.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/R27.md` sekcja 3 (kontrakt: DOSŁOWNIE) i 5 (kotwice).
- `docs/opt/foundations/R6.md` sekcja 2.1.

## Praca równoległa (obowiązkowe)
Ta paczka startuje w tym samym kroku co kilkanaście innych paczek, a każda edytuje inne pliki. Nie czekaj na nie i nie czytaj ich testów ani logów. Stan kodu to `main` z początku kroku: API innych paczek tego kroku jeszcze nie istnieje. Dane testowe buduj we WŁASNYM pliku testu; API rodzeństwa bierz z kontraktu w pliku badawczym wskazanym w "Czytaj" i w testach zastępuj atrapą (komunikat `STUB <nazwa>`). Plików sklejających (`index.html`, `app.js`, `features/index.json`, `canvas-pig.js`, `places/feature.js`, `edit-panel.js`) nie edytujesz, jeśli nie ma ich w Zmieniaj: wpina je krok F2-4. Gdy "Prompt fixes" w pliku badawczym przeczą krokom tego promptu, wygrywa plik badawczy; różnicę zapisz w logu.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tools/qa/ux-p6-filters.js` (Playwright bez serwera: `page.setContent` z pustym kontenerem + `page.addScriptTag({path})`; logika też przez `require` w Node): F1 `categorize-known-ids` (lampy -> Lights, rośliny -> Plants, meble -> Furniture, reszta -> Decor, tabela z 20 id z `world_items.json`), F2 `tabs-counts`, F3 `search-substring-case-insensitive`, F4 `search-by-id-and-name`, F5 `tab-plus-search`, F6 `empty-result-message`, F7 `does-not-mutate-input`, F8 `build-renders-tabs-and-input` (id `editDrawerSearch`, jedna aktywna zakładka), F9 `onChange-fires-with-state`, F10 `keyboard` (strzałki zmieniają zakładkę, Enter nie wysyła formularza), F11 `no-console-errors`.
2. Zaimplementuj moduł; dokładne kategorie z `R27.md` (domyślnie 5 zakładek: `All`, `Furniture`, `Lights`, `Plants`, `Decor`). Style tylko klasy `.edit-drawer-tabs`, `.edit-drawer-search` wstrzyknięte z `<style>` utworzonego w module (nie edytujesz `edit-panel.css`: PK-PE2 może je przenieść).
3. Uruchom Weryfikację; napraw do zielonego.

Moduł JS ma działać w Node (`require`) i w przeglądarce (`window.<Nazwa>`): wzorzec UMD jak `web/home/lib/lights.js` (`if (typeof module !== "undefined") module.exports = api; else root.Nazwa = api;`), ES2020, bez zależności, logika w czystych funkcjach, losowość i czas wstrzykiwane (parametr `rng`, `now`), brak dostępu do DOM poza wyraźnie nazwaną funkcją budującą DOM.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P6a.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
