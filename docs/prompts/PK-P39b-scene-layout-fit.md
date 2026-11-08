# PK-P39b: Whole scene visible in the main window (CSS only)
Zmieniaj: web/home/style.css, tools/qa/ux-p39-layout.js, docs/opt/log/PK-P39b.md
Wymagane: tools/qa/ux-p39-layout.js
Weryfikacja: node --check tools/qa/ux-p39-layout.js && node tools/qa/ux-p39-layout.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
## Kontekst (fakty zweryfikowane 8.11.2026, nie szukaj drugi raz)
- Cel: każde miejsce to scena w głównym oknie Home (widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y). Dane scen: `assets/data/place_scenes.json` (słownik `scenes` z kluczami `room`, `garden`, `park`, `farm`, `market`; pola snake_case: `kind`, `size`, `walk` [x0,y0,x1,y1], `depth_scale`, `bg`, `exits`). Pokoje domku (salon, `pig:<id>`, dorm) używają szablonu `room` (240x130, bez `bg`). `features/places/scenes.js` `def(id,tod)` (linie 311-345) zwraca camelCase `{id,kind,title,size,walk,depthScale,bgUrl,exits}`. Płótno: `web/home/canvas-pig.js` (klasa `PigCanvas`, API `CanvasPig.*`, instancja `window.CuyPig.mainInstance`).
- Test właściciela 7.11: świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; scena jest przycięta (drzewa w parku, domek na farmie); tła nie mają światła.
- Pasek miejsc (`#placesBar`, index.html:71) jest już w normalnym przepływie PRZED sceną i ma 32 px (style.css:1499; zdublowana reguła w `features/places/feature.css:2`). Właściwa przyczyna przycięcia: `.stage-viewport` (style.css:368-379) ma stałe `flex: 0 0 132px; height: 132px; overflow:hidden`, a `#pigCanvas` (style.css:380-388) `width/height:100%` + `object-fit: cover; object-position: 50% 100%`. Atrybuty `width/height` płótna są ustawiane na rozmiar sceny w `PigCanvas.setScene` (canvas-pig.js:392-394), więc płótno ma właściwy stosunek boków (240x130, 256x144, 384x192).
- Okno gry to `.game-device` (style.css:~100): kolumna flex, `overflow:hidden`, w webview max 400x620 (style.css:87-92). Sekcje pod sceną (`.needs-section` itd.) nie mogą zostać obcięte.
- Mapowanie myszy `toScene` w canvas-pig.js (linia ~661) zakłada `cover`; zmieni je PK-P39c2 na `contain`. Tu go NIE ruszaj.
Goal: Pasek miejsc nie zasłania ani nie przycina sceny: cała scena (cały obraz tła) jest widoczna bez rozciągania, pikselowo, pod paskiem.
Depends on: PK-P36a, PK-P37a merged.

## Pliki i elementy
- `web/home/style.css`: `.stage-viewport` -> `flex: 0 1 auto; height: auto; min-height: 132px;` (może się zmniejszyć, gdy reszta okna potrzebuje miejsca; tło `--ui-wood-0` zostaje jako listwa); `#pigCanvas` -> `width: 100%; height: auto; max-height: 100%; object-fit: contain; object-position: 50% 100%;` oraz `image-rendering: pixelated` (zostaje). Nigdy `cover`, nigdy nierównomierne skalowanie. Nie ruszaj app.js, index.html ani features/places/*.

## Steps
1. Test najpierw `tools/qa/ux-p39-layout.js` (Playwright przez `tools/qa/lib/ux.js` `openHome`; domyślny viewport 400x620, drugi przebieg po `page.setViewportSize({width:360,height:640})`). Dla każdej sceny z `CuyScenes.order(state)` (stan `window.CuyScenesMock.state('all_unlocked')` przypisany do `st.places`, potem `bridge.broadcastState()` i `CuyPlaces.openPlace(id)`, wzór w `tools/qa/ux-p36-bar.js` `setAllUnlocked`): Ly1 `bar-above-canvas` (dół `#placesBar` <= góra `.stage-viewport`); Ly2 `canvas-inside-window` (prostokąt `#pigCanvas` w całości w `.game-device`); Ly3 `whole-scene-shown` (computed `object-fit` = `contain`; wyświetlony obraz = `s=min(w/sceneW,h/sceneH)`, `s*sceneW <= rect.width+0.5`, `s*sceneH <= rect.height+0.5`, czyli nic nie jest ucięte); Ly4 `park-and-farm-fit` (dla `park` i `farm` wyświetlona szerokość obrazu >= 70% szerokości płótna; zapisz w logu faktyczne `s` per scena); Ly5 `pixelated` (computed `image-rendering` zaczyna się od `pixelated` lub `crisp-edges`); Ly6 `rest-not-clipped` (dół ostatniej sekcji `.game-device` mieści się w `.game-device` i przycisk zamknięcia `#btnClose` jest widoczny).
2. Popraw CSS (jak wyżej). Gdy Ly6 pada: zmniejsz tylko `min-height` lub przejdź na `flex: 0 1 auto` z `max-height: 46vh`, nie ruszaj innych sekcji. Zapisz w logu, co wybrano.
3. Uruchom Weryfikacja; popraw do zielonego.

Prohibited: zmiana lub usuwanie istniejących asercji, nowe zależności, pliki spoza „Zmieniaj", dodatkowe refaktory.
Log: write `docs/opt/log/PK-P39b.md` (max 10 linii: decyzje, końcowe reguły CSS, zmierzone wysokości sceny na 400x620, BLOCKED jeśli dotyczy). Do not run git.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma.
- Interfejs jak reszta gry: kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych.
