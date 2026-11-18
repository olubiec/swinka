Decyzje: wskazano CSS jako jedyną przyczynę ucinania #btnMore (PK-P47c), a PK-P24c oznaczono jako NO-OP.
Pomiary Playwright (MS Edge, body.webview-mode) na 4 rozmiarach i 7 scenach (Farm/Market zablokowane wyliczone analogicznie do Garden+hint).
API/selektory: HomeWindow.PositionNearTray (dpiScale, _fitZoom), .game-device, .stage-viewport, #pigCanvas, .actions-section, #btnMore, .edit-drawer.
Pytanie do właściciela: czy w trybie Edit szuflada .edit-drawer może zakrywać #btnMore jako position:fixed; wybrano tak (brak scrolla body, #btnMore pozostaje <= innerHeight).
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R24.md 6
