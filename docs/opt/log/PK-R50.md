# PK-R50 Log
- Decyzje: `StageLooks` jako czysty UMD (`window.StageLooks` / `module.exports`) bez nowych binarek; tabliczka `housePlate` rysowana pikselowo na `#pigCanvas` wzorem `drawMarketSignboards`.
- API: `StageLooks.{STAGES, NAMED_PIGS, normStage, normBreed, setData, getData, lookFor, badge, housePlate}` oraz `assets/data/stage_looks.json` (`scaleMul`, `bubbleOffsetY`, `slowMul`, `plateTitle`, `bgHex`).
- Pytanie do właściciela: Czy nieznany etap w `normStage` ma wpadać w `baby` (jak `sprites.js:22`) czy `adult` (jak `canvas-pig.js:44`), i czy `'young'` ma być aliasem `'junior'`? Wybrałem `adult` i alias `young -> junior` (zgodne z `LifeStage.cs` i `CuyLook`).
- Pytanie do właściciela: Czy „wygląd etapów w Domku” wymaga nowych PNG tabliczek? Wybrałem istniejące ikony (`icons.json`) + prymitywy 2D bez nowych binarek.
- Różnice od kontekstu: `web/home/lib/look.js` nie istnieje (`CuyLook` jest w `canvas-pig.js:14-209` i `features/pigs/feature.js:37-209`); `RI6.md` jeszcze nie istnieje (powstanie w F4-3).
- Weryfikacja: `node tools/qa/foundation-check.js docs/opt/foundations/R50.md 6` -> PASS.
