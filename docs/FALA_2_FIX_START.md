# Fala 2 — F2-FIX: naprawa 9 błędów z testów w grze (instrukcja ręczna)

Stan 19.11.2026. Fala naprawcza po testach na żywo (`Cuy.exe`), wykonywana przed startem `F3-1` (`docs/FALA_3_START.md`).
Zasady, szablon promptu startowego i sposób commitowania są identyczne jak w `docs/FALA_2_START.md` (`KROK = F2F-1` .. `F2F-6`).
Lista paczek każdego kroku z plikami i komendą weryfikacji: `bash tools/release-wave.sh F2F-1` (tak samo `F2F-1` .. `F2F-6`).
**6 kroków, 24 małych subagentów**, w każdym kroku pliki `Zmieniaj` są w 100% rozłączne (weryfikowane przez `node tools/qa/plan-audit.js`), a każdy prompt ma jawne sekcje `Czytaj tylko` oraz `Nie czytaj`.

## Co naprawia F2-FIX (9 zgłoszeń z gry)
1. **Zacinanie gry co sekundę i wysoki koszt klatki**: `places/feature.js` (`PK-PF-PL`) porównuje sygnatury stanu i nie wywołuje `CanvasPig.setThings(things, true)` / `setLightScene` / `setPresentPigs` co 1 s bez zmiany danych; `canvas-pig.js` (`PK-PF-CV`) cache'uje `litFrame` (zamiast `getImageData` 64×64 na każdej klatce 60 FPS), cache'uje `createPattern` i usuwa podwójne synchroniczne `inst.render()` w `setLightScene`.
2. **Stary, czysty pasek zmiany miejsc (`#placesBar`)**: `PK-PF-BAR` przywraca klasyczny drewniany pasek 24 px ze strzałkami, ciemną tabliczką nazwy miejsca i czytelnym tekstowym przyciskiem **`Edit`**.
3. **Przeciąganie świnki myszką na żywo**: `PK-PF-CV` i `PK-PF-PL` naprawiają aktualizację `pigEntries[0]` przy `_multiPigActive === true` w trakcie `this.drag` oraz blokują nadpisywanie pozycji świnki przez 1-sekundowy `state` push podczas trzymania przycisku myszy (`CanvasPig.isDragging()`).
4. **Dopasowanie sceny bez wielkich brązowych ramek**: `PK-PF-BAR` ustawia `#pigCanvas` na `width: 100%; height: auto; aspect-ratio: 16 / 9;` wewnątrz `.stage-viewport { flex: 0 0 auto; height: auto; }`, dzięki czemu scena wypełnia całą szerokość ramki, a dolny pasek z `More` mieści się w oknie `420x640`.
5. **Bogatsze tła plenerowe i pełny Park (10 obiektów zamiast 5)**: `PK-PF-BG` przywraca sznur świecących lampek i plakaty za straganami na Targu, drewniany płot na horyzoncie Farmy, furtkę i drzewka horyzontu w Ogrodzie oraz altanę, dalekie drzewa i mostek w Parku; `PK-PF-DATA` i `PK-PF-SC` naprawiają współrzędne 5 obiektów Parku (`x < 16`) w `outdoor_defaults.json`, `OutdoorDefaults.cs`, `OutdoorSeed.cs` i `places/mock.js`.
6. **Kolizje świnki z meblami i obiektami plenerowymi**: `PK-PF-CV` naprawia przeliczanie `w, h` z kratek siatki (`1..3`) na piksele (`16..48 px`) w `rebuildGrid()`, a `PK-PF-SP` dodaje sprawdzanie odcinka (`isSegmentFree`) i ślizg wokół przeszkody w `scene-pigs.js`.
7. **Wyłączanie i włączanie lamp kliknięciem**: `PK-PF-HS` i `PK-PF-SC` naprawiają wymiary hotspotów lamp z `1×2 px` (kratki) na pełne piksele sprite'a (`16×32 px`), dodają `garden_lantern` i `lantern_post` do `isLampItem`, a `PK-PF-PL` wymusza natychmiastowe odświeżenie światła po `lamp_toggle`.
8. **Zamykanie menu grządki i straganu kliknięciem w tło oraz przyciskiem `×`**: `PK-PF-FRM` dodaje przycisk `.farm-popover-close` (`×`) do menu grządki, a `PK-PF-FRM` i `PK-PF-MKT` zamykają otwarty popover po kliknięciu w tło sceny (`#pigCanvas`).
9. **Czytelny Targ (szyldy na straganach, osobne kategorie, tablica zleceń) i Farma (stan posiadania w plecaku)**:
   - `PK-PF-SC` rysuje na daszkach 3 straganów wyraźne szyldy z ikonkami (kiełek = **Seed Stall**, marchewka = **Food Stall**, gwiazdka/zabawka = **Craft & Decor Stall**).
   - `PK-PF-MKT` i `PK-PF-HS` przypisują każdemu straganowi jego własną kategorię oraz aktywują klikalną tablicę zleceń (`order_board` -> **Market Orders** do sprzedaży plonów z farmy).
   - `PK-PF-FRM` pokazuje przy każdej roślinie do zasadzenia posiadaną liczbę w plecaku (`In bag: X`) oraz przycisk przejścia na Targ (`Go to Market`).

## Kroki F2-FIX
| Krok | Agentów | Rola | Paczki |
|---|---|---|---|
| **F2F-1** | 6 | badania i kotwice (tylko odczyt) | `PK-RF1`, `PK-RF2`, `PK-RF3`, `PK-RF4`, `PK-RF5`, `PK-RF6` -> `docs/opt/foundations/RF1..RF6.md` |
| **F2F-2** | 7 | implementacja na rozłącznych plikach | `PK-PF-BG`, `PK-PF-DATA`, `PK-PF-HS`, `PK-PF-SP`, `PK-PF-BAR`, `PK-PF-MKT`, `PK-PF-FRM` |
| **F2F-3** | 2 | analiza sklejenia gorących plików (tylko odczyt) | `PK-RIF1`, `PK-RIF2` -> `docs/opt/foundations/RIF1..RIF2.md` |
| **F2F-4** | 3 | sklejanie gorących plików | `PK-PF-CV` (`canvas-pig.js`), `PK-PF-SC` (`places/scenes.js`, `places/mock.js`), `PK-PF-PL` (`places/feature.js`) |
| **F2F-5** | 4 | niezależne testy logiczne i wizualne | `PK-TF1` (`ux-p71-lag-and-drag-fix.js`), `PK-TF2` (`ux-p72-layout-bar-bgs.js`), `PK-TF3` (`ux-p73-drag-collision-lamps.js`), `PK-TF4` (`ux-p74-market-farm-ux.js`) |
| **F2F-6** | 2 | bramka + zrzuty właściciela | `PK-QF1` (build Release + Debug, `Cuy.exe --selftest`, testy Core i UX), `PK-QF2` (`ux-p70-owner-shots.js`, `docs/qa/UX_WAVE_CHECKS.md`) |
