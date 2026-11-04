# W32-06: G13: pig lighting and contact shadow in Home scenes
Zmieniaj: web/home/canvas-pig.js
Wymagane: web/home/canvas-pig.js
Weryfikacja: node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/app.js, web/home/lib/*, web/home/features/*, assets/*, AGENTS.md, docs/*, tasks/*
Goal: Pigs shown inside a room, garden or farm scene are lit by the scene light and have a contact shadow; pigs on the desktop are unchanged.
Depends on: W31 merged (`lib/lights.js`).
Facts: Rules are in `docs/SWIATLO_SWINEK.md`: draw `assets/world/fx/shadow_pig_{baby,junior,adult}.png` (30x6, 38x6, 46x6) at (32 - width/2, 57) inside the 64x64 pig frame, before the world light pass; light the pig itself separately without dither using the same sources in pig-frame coordinates and strength 0.5 (use `Lights.tint`, ambient `level`), so coats never burn out. Home only; the desktop app (WinForms) is not touched. The file is the canvas drawing code for Home pigs: read how it composes a frame first. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Add an optional `scene` argument/option (`{period, sources, origin}`) to the draw call; without it behave exactly as today.
2. When `scene` is given: shadow first, then the pig tinted by the ambient and the nearest sources.
3. Pick the shadow by life stage (`baby`, `junior`, `adult`; senior and legend use `adult`).
4. Run the verification command.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
