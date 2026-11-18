Status: BLOCKED (ux-p40-edit-move.js M1-M7 FAIL: Selected item uid should be u1, null !== 'u1'; pre-existing PK-P47r roomOffset/viewport mismatch)
Files: web/home/features/places/edit-panel.js, web/home/features/places/edit-panel.css, tools/qa/ux-p52-edit-wiring.js, docs/opt/log/PK-PE2.md
Decisions:
- Added #editSkinsBtn, #editTemplatesBtn, .edit-hint, #editDrawerFilters, #editDrawerSubpanel; hidden on outdoor scenes.
- Mounted EditFilters (_filterState preserved across rooms, Outdoor tab only on outdoor scenes, resets Outdoor->All indoors), EditSkins, EditTemplates ({ state, roomId, send }).
- Blocked room_remove for isFixtureItem (fixture===true || removable===false || uid startsWith 'fx:') in drag-to-drawer, #editItemRemoveBtn, Delete/Backspace with toast "You can move this fixture, not stash it."; room_move allowed.
- Added grab cursor over movable objects in Edit, .edit-hint visible only when CuyEdit.isOpen(), subtracted stageOffset in toRoomLocalCoords for indoor room_place/room_move, lifted .edit-drawer above #btnMore/below #placesBar.
STUBs in ux-p52-edit-wiring.js: addScriptTag for edit-{filters,templates,skins}.js; STUB CanvasPig.cellValid/setGhost in E2/E3/E5/E6/E12/E13.
Verification: ux-p52-edit-wiring.js 15/15 PASS; ux-p40-edit-drawer.js 6/6 PASS; ux-p40-edit-move.js M1-M7 FAIL (M8 PASS); ux-p40-edit-{place,upgrade}.js not reached.
