# W3-07: Sound settings in the Settings screen and a ZzFX sound engine
Zmieniaj: web/home/features/settings/feature.js, web/home/features/settings/feature.css, web/home/sound.js, web/home/lib/zzfx.min.js, THIRD_PARTY_NOTICES.md
Wymagane: web/home/sound.js, web/home/lib/zzfx.min.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/sound.js web/home/features/settings/feature.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/bridge.js, web/home/index.html, tools/qa/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: the player can set volume, quiet hours and "mute when a fullscreen app runs"; Home sounds come from a small synth library and respect the volume.
Depends on: W2-09 (desktop state keys `settings.volume`, `settings.quietHours`, `settings.muteFullscreen`, `settings.soundSuppressed` and messages `settings_volume`, `settings_quiet_hours`, `settings_mute_fullscreen`; shapes in `docs/contracts.md`) merged. Facts: `web/home/sound.js` is a Web Audio synth with a global `Sound` object; the Settings feature lives in `web/home/features/settings/`. When `state.settings.volume` is undefined (browser mock, old builds) the defaults are volume 0.7, quiet hours off (22:00-07:00), mute fullscreen on. `bridge.js` is NOT edited here (the mock already ignores unknown messages).
Steps:
1. Get ZzFX 1.4.0 (npm `zzfx` package or the GitHub repo KilledByAPixel/ZzFX, license MIT) into `web/home/lib/zzfx.min.js`. If it cannot be fetched, STOP and say so in the PR; do not write it from memory.
2. `sound.js`: keep the `Sound` API unchanged; play through ZzFX with the volume `ZZFX.volume = settings.volume * 0.3`; resume the `AudioContext` on the first `pointerdown` or `keydown` (autoplay policy); nothing plays while `state.settings.soundSuppressed` is true. Missing settings mean the defaults above.
3. Settings screen: a "Sound" section with a volume slider (0-100, shows a short test sound on release), a "Quiet hours" checkbox with two `<input type="time">` (from, to), and a "Mute when a fullscreen app runs" checkbox. Changes are sent with `api.send('settings_volume', { value })`, `api.send('settings_quiet_hours', { enabled, from, to })`, `api.send('settings_mute_fullscreen', { enabled })` (exact payload names as in `docs/contracts.md`). The screen shows the values from `api.getState().settings` and updates on `onState`.
4. `THIRD_PARTY_NOTICES.md`: append the ZzFX entry (name, version, MIT license text, source URL).
Verify: `node tools/qa/web-smoke.js` prints `WEB SMOKE OK`; `node --check` on every changed JS file.
Prohibited: changing or deleting existing test assertions, new npm dependencies (the library is a vendored file), touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; a screenshot of the Sound section.
