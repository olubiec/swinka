# PK-24b: Pig rooms for old saves and diary lines
Zmieniaj: src/Cuy.Core/GameState.PigRooms.cs, tests/Cuy.Core.Tests/PigRoomsMigrationTests.cs, assets/data/diary.json, tests/Cuy.Core.Tests/PigRoomDiaryTests.cs, docs/opt/log/PK-24b.md
Wymagane: src/Cuy.Core/GameState.PigRooms.cs, tests/Cuy.Core.Tests/PigRoomsMigrationTests.cs, tests/Cuy.Core.Tests/PigRoomDiaryTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W24-05, W24-06
Goal: Pig rooms for old saves and diary lines.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-24b.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W24-05: GameState.PigRooms: rooms for old saves
Files of this item: src/Cuy.Core/GameState.PigRooms.cs, tests/Cuy.Core.Tests/PigRoomsMigrationTests.cs
Goal: Opening any save creates the missing pig rooms and loses nothing.
Depends on: W23 merged.
Facts: Like `GameState.World.cs` (`EnsureWorld`): `public int EnsurePigRooms(PigRoomConfig, WorldItemCatalog, ...)` creates rooms for every roster pig that has none (uses `PigRoomOps`), returns how many it created. Called by the session in W26-08, here only tested. Do not bump `GameState.CurrentVersion`.
Steps:
1. Implement idempotently.
2. Tests: a state with 3 roster pigs (one memorial) gets 3 rooms; a second call returns 0; an old save JSON (fixtures) loads and works; existing salon layouts and `Decor` are untouched; the pre-World save without `World` works after `EnsureWorld` then `EnsurePigRooms`.

## Item W24-06: Diary lines for pig rooms
Files of this item: assets/data/diary.json, tests/Cuy.Core.Tests/PigRoomDiaryTests.cs
Goal: The diary has at least 10 new lines about the pig's own room and the shared bedroom.
Depends on: W23 merged.
Facts: Same rules as W18-06 (`docs/diary-grammar.md`, `DiaryTemplatesTests.cs`). Events: a new decoration in my room, I got my own room, a recoloured item, rename of the room, a cosy evening in my room, moved in with a friend (shared bedroom), napping next to a friend, a visit to my memory room (soft wording, no mention of death). English, the pig's voice, warm, no amounts.
Steps:
1. Append at least 10 templates (and symbols) without changing existing ones.
2. Tests: the ids exist, parse, give non-empty text for 50 seeds, contain no unresolved `#symbol#`, no Polish letters, and none of the words dead/died/death.
