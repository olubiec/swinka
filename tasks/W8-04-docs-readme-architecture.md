# W8-04: README and ARCHITECTURE match the finished code
Zmieniaj: README.md, ARCHITECTURE.md
Wymagane: ARCHITECTURE.md
Weryfikacja: git diff shows only the files listed in "Zmieniaj"
Nie ruszaj: src/*, web/*, docs/PLAN.md, AGENTS.md, docs/PLAN.md, tasks/*
Goal: A new reader (or agent) gets a correct picture of the code from the two top-level documents.
Depends on: all earlier waves merged. Read the code you describe; do not describe plans.
Steps:
1. `ARCHITECTURE.md`: sections for life stages on the desktop (sheet per stage, hot-swap on `StageChanged`, `SpriteSheetLoader`), behaviour plug-ins (`IDesktopBehavior`, `BehaviorHost`, `FullscreenHideBehavior`, `MouseFearBehavior`), Home features (web modules in `web/home/features/<id>`, C# `IHomeFeature` in `src/Cuy/dotNet/Features`, reflection discovery, mock mode reads `index.json`, state keys in `docs/contracts.md`), the Core systems (Economy, Care, Health, Coloring, Decor, Input, Bond, Hay, Diary, Tricks, Achievements, Birthday, Away) and the data files in `assets/data`, the minigame loader (`games.json`), and the Jules Loop (one paragraph pointing to `docs/JULES_LOOP.md`).
2. `README.md`: update only the table of folders and paths that changed; keep the SmartScreen / Smart App Control and WebView2 sections and their hedged wording exactly. Remove nothing that is still true.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
