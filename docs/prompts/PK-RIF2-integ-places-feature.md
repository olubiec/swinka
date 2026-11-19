# PK-RIF2: Integration analysis: places/feature.js state diffing, drag guard and popover coordination for F2F-4
Zmieniaj: docs/opt/foundations/RIF2.md, docs/opt/log/PK-RIF2.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RIF2.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: After F2F-2 is merged, inspect `web/home/features/places/feature.js` and the updated `BAR`/`MKT`/`FRM` packages to write the exact anchors for `PK-PF-PL` (`places/feature.js`).

Depends on: kroki F2F-1 i F2F-2 scalone w `main`. Biegnie w kroku F2F-3 równolegle z `PK-RIF1`.

Produces (names other packages rely on): `docs/opt/foundations/RIF2.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Status of F2F-2 UI packages (`PK-PF-BAR`, `PK-PF-MKT`, `PK-PF-FRM`)
- `## 2.` Exact anchors in `web/home/features/places/feature.js` for 1 Hz `applyScene` signature diffing (`lastThingsSig`, `lastLightSig`, `lastPresentSig`, `lastHotspotsSig`, `lastWeatherSig`)
- `## 3.` Drag guard (`CanvasPig.isDragging()`) and lamp toggle immediate refresh in `places/feature.js`
- `## 4.` Edit button text/state compatibility with `PK-PF-BAR` and `ux-p47-bar.js`
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF1.md`, `RF2.md`, `RF5.md`, `RF6.md`
- `docs/opt/log/PK-PF-BAR.md`, `PK-PF-MKT.md`, `PK-PF-FRM.md`
- `web/home/features/places/feature.js` linie 1-220, 820-1120

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Sprawdź logi `PK-PF-BAR`, `PK-PF-MKT`, `PK-PF-FRM`.
2. Przeczytaj `web/home/features/places/feature.js` (linie 1-220, 820-1120) i wskaż dokładne linie dla `PK-PF-PL`:
   - gdzie przechowywać i kiedy resetować (przy zmianie `currentPlace` lub zamknięciu/otwarciu `Edit`) sygnatury `lastAppliedSceneKey`, `lastThingsSig`, `lastLightSig`, `lastPresentSig`, `lastHotspotsSig`, `lastWeatherSig`,
   - dlaczego `CanvasPig.setThings(things, true)` wolno wołać tylko wtedy, gdy `thingsSig !== lastThingsSig` lub zmieniła się scena (`sceneKey !== lastAppliedSceneKey`),
   - jak pominąć `CanvasPig.setPresentPigs(presentList)`, gdy `window.CanvasPig.isDragging && window.CanvasPig.isDragging()` zwraca `true`,
   - jak przy kliknięciu hotspotu `lamp_toggle` wymusić natychmiastowe przeliczenie `lastLightSig = ''` i `applyScene(currentPlace)`, żeby wyłączenie/włączenie lampy było widoczne od razu w tej samej klatce.
3. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RIF2.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RIF2.md` (max 10 linii).
