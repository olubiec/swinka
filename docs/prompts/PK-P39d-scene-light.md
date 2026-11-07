# PK-P39d: Scene light and ambient in all scenes
Zmieniaj: web/home/features/places/feature.js, web/home/lib/lights.js, tools/qa/ux-p39-light.js, docs/opt/log/PK-P39d.md
Wymagane: tools/qa/ux-p39-light.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check tools/qa/ux-p39-light.js && node tools/qa/ux-p39-light.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Every scene in the main window gets the same time-of-day light as the garden and farm windows (ambient tint, lamp glow, dust) via `CanvasPig.setLightScene`. The owner liked this shader in the old preview.
Depends on: PK-P36a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. grep in `features/garden/feature.js`: `lightPeriod`, `loadLights`, `activeSources`, `ambientFor`, `lightsData` (about lines 47-215) and in `canvas-pig.js` `setLightScene`, `applySceneLight`, `sceneAmbient` (lines ~92, 1222-1360). Read only those ranges.
2. In `places/feature.js`, in `applyScene` (the function that switches scenes) build the light scene like the garden does: `Lights.periodOf(new Date())` (allow a test override `window.__cuyNow`), kind `outdoor` for garden/park/farm/market and `indoor` for rooms, `Lights.ambientFor(lightsData, period)`, lamp sources from the placed items of that scene (`Lights.activeSources`) with their toggles, then `CanvasPig.setLightScene(sceneLight)`. Load `lib/lights.js` and `data/lights.json` once, lazily; missing lib or file = null light, no error. Share code: if a helper is needed in two features, add a small `window.CuyLight.build(sceneId, placed, toggles)` in `places/feature.js` and leave the garden window untouched.
3. The pig and shadow are lit by the same scene (existing `drawPig(ctx, lightScene)`).
4. Tests FIRST, `tools/qa/ux-p39-light.js` (Playwright, mock `seven`, `window.__cuyNow` set before load):
   - Li1 `light-scene-set`: `CanvasPig.debug().lightScene` is non-null in every scene.
   - Li2 `night-darker`: mean luminance of the garden canvas at 23:00 is at least 25% lower than at 12:00.
   - Li3 `period-changes`: switching `__cuyNow` from 12:00 to 18:30 and re-applying changes the ambient colour.
   - Li4 `lamp-glow`: a placed lamp in the salon at night: pixels within 20 px of the lamp are brighter than 60 px away; a toggled-off lamp does not glow.
   - Li5 `missing-lib-safe`: with `lights.json` request failing the scene still renders, no console error.
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
