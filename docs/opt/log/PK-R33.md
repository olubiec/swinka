Status: OK (do weryfikacji)
Decyzje:
- `features/index.json:17` zawiera `"places/edit-panel"`, ale w repo istnieje płaski `edit-panel.js` w `index.html:308` (i `SelfTest.cs:640-651` wymaga 1:1 z podkatalogami `feature.js`): w `R33.md` wskazano usunięcie tego wpisu przez `PK-APP2`.
- Global edytora to `window.CuyEdit` (`edit-panel.js:1562`), nie `EditPanel`; silnik światła z `lib/lights.js:2` to `window.Lights`, a `window.CuyLight` to lokalny builder w `places/feature.js:168`.
- Nowe moduły `lib/*.js` i `edit-*.js` nie istnieją jeszcze w repo (F2-2); wskazano kolejność `<script>` w `index.html` i obowiązkowe strażniki `window.X && typeof window.X.fn === 'function'`.
Pytania do właściciela (rozstrzygnięte samodzielnie):
- Czy usuwać `"places/edit-panel"` z `features/index.json`? Wybrano tak, bo inaczej `SelfTest.CheckFeatures()` rzuca wyjątek, a przeglądarka dostaje 404.
- Czy `PK-P47c` koliduje z F2-4? Nie przy scaleniu F2-2 przed F2-4; w samym F2-4 paczki `PK-PF2`, `PK-PE2`, `PK-APP2` mają rozłączne pliki.
API: `window.CuyHome`, `window.CuyPlaces`, `window.CuyEdit`, `window.CuyScenes`, `window.Lights`, `window.CuyLight`, `window.CanvasPig`, `window.PigCanvas`, `window.CuyRoom`, `window.bridge`.
