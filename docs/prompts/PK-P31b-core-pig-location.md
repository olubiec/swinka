# PK-P31b: Core: each pig has ONE location (wave P31)
Zmieniaj: src/Cuy.Core/Pigs/PigLocation.cs, src/Cuy.Core/Pigs/PigRoamingConfig.cs, src/Cuy.Core/GameState.PigLocation.cs, assets/data/pig_roaming.json, tests/Cuy.Core.Tests/PigLocationTests.cs, docs/opt/log/PK-P31b.md
Wymagane: tests/Cuy.Core.Tests/PigLocationTests.cs
Weryfikacja: dotnet build src/Cuy.Core/Cuy.Core.csproj -c Release && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigLocation"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: A pig is in exactly one scene at a time and moves between neighbouring scenes over time; a pinned pig stays. Pure Core logic, no UI. Pulls forward P5-01 of docs/PLAN_POPRAWEK_UX.md (P5-01 is now done by this package).
Depends on: nothing (runs in parallel with PK-P31a; disjoint files).

## Steps
1. grep Core for: the clock interface and `ManualClock` (tests), how a config JSON loader is written (e.g. `HomeEconomyConfig`), the pig roster type and ids, how `GameState` partials add saved fields with safe defaults, how places unlock is stored. Read only those ranges. Reuse them; do not add a second clock, loader style or unlock check.
2. `assets/data/pig_roaming.json`: `{"interval_min_s": 600, "interval_max_s": 1800, "sleep_hours": [22,7], "pinned_default": false}`. Numbers live in JSON only.
3. Tests FIRST, `tests/Cuy.Core.Tests/PigLocationTests.cs`, with `ManualClock` and a seeded `Random`. The ring order is passed in by the caller as `IReadOnlyList<string> order` (scene ids: `salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`) plus `Func<string,bool> isUnlocked`; the Core does not know the places.
   - L1 `start`: a new game has the starter pig at `salon`, not pinned.
   - L2 `adjacent-only`: after the interval a free pig moves to the previous or next scene in `order` (ring), never further.
   - L3 `locked-skipped`: never moves into a locked scene; if both neighbours are locked it stays.
   - L4 `pinned-stays`: a pinned pig does not move however much time passes.
   - L5 `one-location`: a pig has exactly one location; two pigs may be in one scene; moving a pig never duplicates or loses it.
   - L6 `old-save`: loading a save without the field puts every pig at `salon`, free; nothing duplicated.
   - L7 `deterministic`: same seed + same clock steps = same route; different seeds can differ.
   - L8 `interval`: no move earlier than `interval_min_s`; at the latest at `interval_max_s`.
   - L9 `night-home`: during `sleep_hours` a pig goes to its own room (`pig:<id>`) if that is unlocked and stays there until morning.
   - L10 `scene-removed`: if the scene a pig is in disappears from `order`, the pig is placed at `salon` on the next tick.
4. Implement `PigLocation` (record: PigId, SceneId, Pinned, NextMoveAt) and `PigRoamer.Tick(...)` in `src/Cuy.Core/Pigs/PigLocation.cs`, config loader in `PigRoamingConfig.cs`, saved fields in `GameState.PigLocation.cs` with safe defaults. Public API names go to the log, exactly (PK-P32a uses them).
5. Run the Weryfikacja line; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P31b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
