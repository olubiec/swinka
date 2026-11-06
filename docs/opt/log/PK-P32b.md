# PK-P32b: scenes.js and browser mock
- Implemented CuyScenes in web/home/features/places/scenes.js and CuyScenesMock in mock.js.
- API: CuyScenes.load(), CuyScenes.order(state), CuyScenes.neighbor(id, dir, state), CuyScenes.def(id, tod), CuyScenes.timeOfDay(), CuyScenes.pigScene(state, pigId).
- CuyScenes.def returns { id, kind, title, size: [w,h], walk: [x0,y0,x1,y1], depthScale: [far,near], bgUrl, exits }.
- House rooms (salon, pig:*, dorm) and unknown ids use room template with bgUrl=null; outdoor scenes resolve tod background.
- CuyScenesMock.state(variant) exports mock states ('default'/'garden_unlocked' with 3 pig rooms + dorm + 4 places; 'seven' with 7 scenes).
- tests/qa: ux-p32-scenes-data.js tests S1 (order), S2 (ring), S3 (bg-by-time), S4 (band), S5 (unknown), S6 (pig-scene).
- Decisions: index.json already registers 'places'; app.js loads feature IDs, so places/scenes.js is loaded alongside feature/mock.
- Verification passes: syntax checks on scenes.js, mock.js, ux-p32-scenes-data.js, test suite, and place-scenes-check.js.
