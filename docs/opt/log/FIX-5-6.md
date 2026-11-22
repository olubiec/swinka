# FIX-5-6 Log
- Fixed `isSceneLocked` and `getPlaceInfo` in `edit-panel.js` so `salon` and `pig:*` rooms never report locked, and `#placesLockedHint` fallback only applies when state has no `places`/`world.places`.
- Healed orphan `pig:starter`/`pig:pig_1`/`pig:<guid>` rooms and restricted `GetRoomIds` in `PlacesFeature.cs` and `RoomsFeature.cs` to active canonical roster pig rooms; resolved `pig:*` target room IDs on move/place/edit.
- Updated `feature.js` `applyScene` to always invoke `CanvasPig.setScene` on scene change and notify `CuyEdit.render`.
- Bridged classic shop equipment (`bed`->`cushion_big`, `hay_rack`->`hay_bar_wood`, `water_bottle`->`mug_steam`, `house`->`cosy_nook`, `ball`/`tunnel`->`toy_basket`), seeded starter room essentials in `RoomsFeature.cs`, and sorted owned items first in `edit-panel.js`.
- Stacked `.edit-drawer-header` into two clean non-overlapping rows in `edit-panel.css` and gated `renderDrawerContent` by content signature in `edit-panel.js` so 1s state ticks never interrupt clicks/drags or reset scroll.
