# W29-08: Home: the 'On your desktop' tray and dropping props into rooms
Zmieniaj: web/home/features/rooms/tray.js, web/home/features/rooms/tray.css
Wymagane: web/home/features/rooms/tray.js
Weryfikacja: node --check web/home/features/rooms/tray.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/features/rooms/feature.js, web/home/app.js, web/home/bridge.js
Goal: Props on the desktop appear as chips attached to the Home page; dragging a chip into a room puts it there, and a placed prop can go back to the desktop.
Depends on: W28 merged; messages from W29-05; wiring in W29-09.
Facts: Export `window.PropTray = { mount(container, ctx), acceptDrop(canvas, cellFromPoint, roomId) }` with `ctx = { state (the `props` object), send }`. The tray is a thin strip under the room tabs titled 'On your desktop' with one chip per `props.desktop` entry (icon, name), a counter 'N of max'. Dragging a chip (pointer events, with a ghost) onto the room canvas converts the pointer to a grid cell and sends `prop_to_room { uid, room, x, y }`; dropping outside does nothing. Items in the room that are props (item ids starting with `prop_`) get a context button 'Back to the desktop' sending `prop_from_room`. Free copies (`props.free`) appear as faded chips with a '+' that sends `prop_to_desktop` (x,y = 0.5). Keyboard: Enter on a chip then arrow keys and Enter to drop in the current room at the selected cell (same message). Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the tray and the drop logic; harmless when `props` is missing.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
