# W28-09: Audit: what is shown on the desktop today and how toys are used
Zmieniaj: docs/DESKTOP_PROPS.md
Wymagane: docs/DESKTOP_PROPS.md
Weryfikacja: git diff --stat
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, assets/*, AGENTS.md, tasks/*
Goal: `docs/DESKTOP_PROPS.md` describes exactly how toys and other props appear on the desktop now, so the next wave can attach them to the house.
Depends on: W27 merged.
Facts: Read code, change nothing except the new doc. Start with `src/Cuy/dotNet/Features/ToysFeature.cs`, `ContextMenus.cs` (toy menu), `HomeWindow.cs`, `BrainController.cs`, `Behaviors/*`, and `src/Cuy.Core/AI/Brain.cs` + `assets/data/actions*.json` (`ball_play`, `tunnel`, `hay_ball_play`, `sleep_house`), the hay rack (`Pet.Hay.cs`, `HayRackActive`) and anything else drawn on the desktop (poop, bowls, props). Question to answer for each: is the thing a real object on the desktop (a window or a sprite with a position), or only an animation of the pig? Where is its position kept (memory or save)? What happens to it when the Home window opens or the app restarts? Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the doc in English: a table (prop, how it is drawn, where its state lives, what happens on Home open and on restart), the classes involved with file names and line ranges, and a short list of gaps relative to this target: 'Every prop on the desktop is saved, stays attached to the Home page as a chip while Home is open, and can be dropped into a room (then it is in the house, not on the desktop) and taken back'.
2. Mark every statement you could not verify by reading the code as 'unverified'.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
