Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>". Nie zadawaj pytań i nie zatrzymuj się. Jeśli coś jest niejasne, wybierz najprostsze rozwiązanie zgodne z plikiem zadania i AGENTS.md, a decyzję opisz w PR-ze w sekcji „Decisions”. Jeśli test nie przechodzi, znajdź przyczynę w kodzie i napraw ją w zakresie „Change”; nie zmieniaj asercji.

# W2-10: Home state for diary, album dates, next bond unlock and hay rack (new keys only)
Goal: the Home page receives the new state keys `diary`, `albumDates`, `bondNext` and `hayRack` without any existing key changing its shape.
Depends on: W1-06 (`Pet.NextUnlock`) and W1-07 (`GameState.HayRack`, `HayConfig`) merged. Facts: `HomeWindow.cs` already sends `bond` as `{ level, points, pointsToday, maxPointsToday }`, `album` as a list of animation names and `minigames` as `{ records, dailyRewardedDate, dailyRewardedCount }`; the current JS reads exactly those shapes, so they stay as they are. A C#-only feature (no web folder, like `ToysFeature.cs`) adds new keys in `AddState`; `HomeFeatures.AddAllState` runs after the base payload is built.
Change: new `src/Cuy/dotNet/Features/ProgressFeature.cs`, `docs/contracts.md`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `HomeWindow.cs`, `web/*`.
Steps:
1. `ProgressFeature : HomeFeatureBase`, `Id = "progress"` (copy the structure of `ToysFeature.cs`). `AddState` writes four keys into the state dictionary:
   - `diary`: the last 60 entries of `pet.State.Diary`, newest first, `[ { "date": "2026-10-24", "text": "..." } ]` (`date` is the local date of `DateUtc`, format `yyyy-MM-dd`).
   - `albumDates`: `{ "<animation key>": "yyyy-MM-dd" }` from `pet.State.Album` (local date of the stored UTC time).
   - `bondNext`: `pet.NextUnlock()` as `{ "level": 5, "id": "trick_spin", "title": "...", "pointsToNext": 12 }` or `null` at the last level; `pointsToNext = max(0, pet.Balance.BondPointsForLevel(level) - pet.State.Bond.Points)`.
   - `hayRack`: `{ "value": <rack rounded to int>, "max": <HayConfig max> }` (use `pet.HayTable`, which falls back to `HayConfig.Current`).
2. No messages handled (`HandleMessage` returns false). All reads null-safe (no pet, empty lists); never throws.
3. `docs/contracts.md`: rewrite the sections `diary and album`, `bond` and `hayRack` so they match the code exactly: `bond` keeps its real current shape (`level, points, pointsToday, maxPointsToday`), `bondNext`, `album` stays a list of keys and `albumDates` is the date map, `diary` and `hayRack` as above. Say in one line that the keys are produced by `ProgressFeature`. Do not touch the other sections.
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` pass.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, a sample of the JSON the page receives for each key, how to check by hand; screenshot if the change is visual.
