# PK-P1c: "Decorate" opens the room editor (package, wave P1)
Zmieniaj: web/home/features/decor/feature.js, web/home/features/rooms/feature.js, web/home/features/rooms/mock.js, tools/qa/ux-p1-decorate.js, docs/opt/log/PK-P1c.md
Wymagane: tools/qa/ux-p1-decorate.js
Weryfikacja: node --check web/home/features/decor/feature.js && node --check web/home/features/rooms/feature.js && node --check web/home/features/rooms/mock.js && node --check tools/qa/ux-p1-decorate.js && node tools/qa/ux-p1-decorate.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "Mushroom lamp: Decorate does nothing." A bought decor item must be placeable. For now (full stash and free placement come in wave P6) make Decorate open the room editor of the pig's room with that item ready to place.
Depends on: PK-P1a merged (`tools/qa/lib/ux.js`, one feature-window lifecycle, `openFeature(id, arg, opts)`).

## Facts already found
- `items_decor.json`: `lamp_mushroom` has `slot: "lamp"`, one_time. The `decor` feature (title "Decorate") lists owned items per slot and applies them with `decor_apply`-style messages; the room editor lives in the `rooms` feature (`web/home/features/rooms/feature.js`, `plan.js`, `customize.js`). `openFeature(id, arg)` passes `arg` to `feat.open(container, api, arg)`.
- Find the exact click handler of the lamp "Decorate"/"Use" button in `decor/feature.js` (grep `data-` and `addEventListener` near the slot lists) and see why it does nothing (message not sent, wrong message type, state not changing visibly because the lamp has no visible effect in the mini preview, or the room view not redrawn).

## Steps
1. Test first. `tools/qa/ux-p1-decorate.js` with `tools/qa/lib/ux.js` (PASS/FAIL, exit 1 on FAIL or page error). Run before the fix, record which failed.
   - D1 `decorate-lamp-visible-change`: in mock state give the pig `lamp_mushroom` (inventory 1; use a mock handler or the shop purchase flow `shop_buy`), openMore -> "Decorate", click the lamp's button: within 1500 ms the mini preview canvas content changed (compare `toDataURL()` before/after) OR the room editor opened (D2). Either way something visible happens.
   - D2 `decorate-opens-room-editor`: the button of an owned, not yet placed decor item has the label "Place in room"; clicking it opens the rooms feature in editor mode (`.rooms-editor` or the plan view element that `rooms/feature.js` renders) for the pig's room, with the item selected as the one being placed (a `.placing-item` marker or equivalent) and a visible hint "Tap the room to place it". Back returns to Decorate.
   - D3 `place-and-save`: click a free cell in the editor: the mock receives the room-layout message (use the existing one, find it in `rooms/feature.js`), the item is no longer "not placed", and the room preview shows it. A second click on an occupied cell does not place it (existing rule) and shows a toast.
   - D4 `no-dead-buttons`: for every button inside the Decorate panel (iterate `.decor-panel button`), click it and assert that either the state, the canvas or the DOM changed within 1500 ms. List buttons that change nothing in the log and fix them.
2. Fix `decor/feature.js` and `rooms/feature.js` so the scenarios pass: open the editor with `window.CuyHome.openFeature('rooms', {edit: true, place: itemId, from: 'decor'})`; `rooms/feature.js` reads that `arg` in `open`, enters the editor with the item preselected, and its Back returns to Decorate. Add the matching mock behaviour in `rooms/mock.js` if the placement message has no mock yet. Use only message types that already exist in `docs/contracts/rooms.md` or `decor.md`; if a new one is needed, record it in the log instead of inventing it (it is not in Zmieniaj).
3. Verification line, fix until green. Log (max 10 lines): why the button did nothing, scenarios failed before, left undone (free placement, physics and stash come in wave P6/P7).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P1c.md` (max 10 lines). Do not run git.
