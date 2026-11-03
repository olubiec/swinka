# W11-05: Achievements for adopting family members
Zmieniaj: assets/data/achievements.json, tests/Cuy.Core.Tests/NamedPigAchievementsTests.cs
Wymagane: tests/Cuy.Core.Tests/NamedPigAchievementsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, assets/data/pigs_named.json
Goal: Three new achievements reward adopting the named pigs, driven by the counters `pigs_arrived` and `memorial_pigs`.
Depends on: nothing (wave start). The counters are incremented in W13-03 (`pigs_arrived`: a named pig adopted from an offer other than the starter pair; `memorial_pigs`: a pig switched to or adopted in memorial mode).
Facts: `assets/data/achievements.json` has 20 entries with `rule: { kind: "counter", name, atLeast }` and a `reward` in clovers (policy 50-200). `AchievementCatalog.Load(json)` parses it; the existing test only requires at least 15 unique ids, so adding entries is safe. Counters live in `State.Stats.Counters` (`Pet.Count(name, by)`). Follow the pattern of `tests/Cuy.Core.Tests/AchievementTests.cs` (it shows how a pet is created and how earned achievements are checked and paid).
Steps:
1. Append three entries: `new_friend` (title "New Friend", text "A new guinea pig joins the family.", category `social`, hidden false, rule counter `pigs_arrived` atLeast 1, reward 50) and `full_house` (title "Full House", text "The whole family has arrived.", category `social`, hidden false, rule counter `pigs_arrived` atLeast 3, reward 150) and `forever_family` (title "Forever in the Family", text "A special friend stays close, always.", category `social`, hidden false, rule counter `memorial_pigs` atLeast 1, reward 50). Keep the file's formatting; do not touch other entries.
2. Tests (`NamedPigAchievementsTests.cs`): the real catalog contains the three ids once with the exact rules and rewards above; ids are still unique; with the counter at 0 neither is earned; at 1 only `new_friend` is earned and pays 50; at 3 `full_house` is earned and pays 150; `memorial_pigs` at 1 earns `forever_family` and pays 50; earning is paid once (a second check pays nothing).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
