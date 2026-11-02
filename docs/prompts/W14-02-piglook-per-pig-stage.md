# W14-02: PigLook and Xml: each pig's own stage and baked sheets
Zmieniaj: src/Cuy/dotNet/Graphics/PigLook.cs, src/Cuy/dotNet/Xml.cs
Wymagane: src/Cuy/dotNet/Graphics/PigLook.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*, assets/*
Goal: Every pig on the desktop uses its own life stage and, for named pigs, its baked sheet folder.
Depends on: W13 merged (pigs have NamedId, stage per pig). Art: assets/sprites/pigs/<id>/<stage>/ and assets/sprites/pigs/pigs.json exist.
Facts: `PigLook.CurrentStageKey()` is global for all pets; `PigLook.Apply` calls `xml.BuildStageSprites(stageKey, breed, palette)` (Xml.cs ~613). New rule: stage key = the pet's own stage (`PigLife.StageOf` through the Core API from W12-03); for a profile with `NamedId` whose folder `assets/sprites/pigs/<id>/<stage>/` exists (listed in `assets/sprites/pigs/pigs.json`, read it once, tolerate a missing file), load that sheet as is, with no palette remap; all other pigs keep the shape + palette path. Memorial pigs use the `legend` stage. Fall back to the old path on any error and log it with the existing logger. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add a `Xml.BuildNamedPigSprites(string pigId, string stageKey)` (or extend `BuildStageSprites` with an optional folder) that returns the same structure as the shape path from `assets/sprites/pigs/<id>/<stage>/`.
2. Make `PigLook` choose the stage per pet and call the named path when available. No behaviour change when `PerPigAgeActive` is off (use the old global stage).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
