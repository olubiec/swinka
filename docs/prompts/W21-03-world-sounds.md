# W21-03: Sounds for planting, harvesting, coins and placing
Zmieniaj: web/home/sound.js
Wymagane: web/home/sound.js
Weryfikacja: node --check web/home/sound.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/*
Goal: Small sound cues accompany the new actions.
Depends on: W20 merged.
Facts: `sound.js` wraps ZzFX (`lib/zzfx.min.js`) with named cues (read the file for the pattern and the mute setting). Add cues `plant`, `water`, `harvest`, `coin`, `place`, `error` as short ZzFX parameter arrays (soft, no longer than 0.25 s), respecting mute and volume. Export them the same way as the others; wiring into the features happens in the next fix wave if the features do not already call `sound.play(name)` for unknown names - list in the PR which calls are missing. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the six cues and a tiny self-check that every cue is an array of numbers.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
