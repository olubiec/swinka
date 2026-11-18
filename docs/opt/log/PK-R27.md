# PK-R27 Log
- Decyzje: `edit-skins.js` obsługuje zarówno obiekty `{id, name, owned}` z `RoomsFeature.cs:284-302`, jak i stringi ze starego mocka; `EditTemplates.plan` zwraca `{messages: [], noop: true}` gdy skórki są już ustawione; zakładki `EditFilters` to 5 stałych kategorii, a `Outdoor` dokłada `edit-panel.js` tylko na dworze.
- Różnice w kodzie: `features/rooms/mock.js:150` ma stringi w `skins`, a `features/places/mock.js` nie ma `room_skin`; `.edit-drawer` w `edit-panel.css:49` ma `bottom: 0` i obecnie zasłania `#btnMore` (PK-PE2 musi go podnieść nad `.actions-section`).
- API: `window.EditSkins.{isIndoorRoom, listOwned, build}`, `window.EditFilters.{TABS, EMPTY_MESSAGE, categorize, tabs, filterItems, build}`, `window.EditTemplates.{themes, plan, build}`.
- Pytania do właściciela (rozstrzygnięte autonomicznie): czy na dworze ukrywać Skins/Themes (tak, brak ścian/motywów); czy zapytanie w szukajce przeżywa zmianę pokoju (tak).
- Weryfikacja: `node tools/qa/foundation-check.js docs/opt/foundations/R27.md 7` -> uruchomiona po zapisie.
