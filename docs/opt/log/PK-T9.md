# PK-T9 Log
- Wynik: 11 PASS, 0 DEFECT, 0 SKIP (`V1`..`V11` w `tools/qa/ux-p66-viewport-matrix.js`).
- `V1`: macierz 4 rozmiarów (`420x640`, `400x620`, `420x600`, `360x560`) x 7 scen x 3 tryby (`normal`, `edit`, `edit_drawer_subpanel`) — `#btnMore` i `#placesBar` mieszczą się w oknie i `.game-device`, brak pionowego paska przewijania.
- `V2`..`V7`: stały kadr logiczny `256x144` i stały rozmiar CSS płótna we wszystkich scenach i poziomach ulepszeń (`10x6`..`20x9`), stała skala świnki `[0.75, 0.875]` dla `baby..legend`, zachowanie współrzędnych kratek po ulepszeniu, trafianie w kratki i wyrównanie ducha przeciągania z `stageOffset`.
- `V8`..`V11`: najdłuższa nazwa miejsca w tabliczce tytułu, spójny układ CSS i `image-rendering: pixelated` przy `deviceScaleFactor` 1/1.25/1.5/2, statyczna kontrola `HomeWindow.cs` (`420x640`, `Math.Min(1f, ...)`), zero błędów konsoli.
- DEFECT: brak.
- BLOCKED: brak.
