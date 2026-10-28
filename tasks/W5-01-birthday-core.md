# W5-01: Birthday in Core: reward, cake and diary line (behind a flag)
Zmieniaj: src/Cuy.Core/Pet.cs, src/Cuy.Core/Pet.Birthday.cs, src/Cuy.Core/Balance.cs, src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/BirthdayTests.cs
Wymagane: src/Cuy.Core/Pet.Birthday.cs, tests/Cuy.Core.Tests/BirthdayTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: When the pig has a birthday, Core pays the reward from `actions.json`, adds one cake and writes a diary line. Behind a flag so old tests keep their numbers.
Depends on: W3-03 (flag pattern `Balance.DiaryActive` switched on in `GameSession.Open`), W4-07 not required.
Facts: `Pet.CheckBirthdays()` in `Pet.cs` raises `Birthday` once per pig year (about 17.4 real days); after a long offline gap it loops once per missed birthday. `State.BirthdaysCelebrated` is saved. `assets/data/actions.json` has `events.birthday: { animation: "party", reward_clovers: 100 }`: read the number from there (find how Core already reads `actions.json`; add a small accessor inside `Pet.Birthday.cs` if none exists), never copy it into code. The `cake` item exists in the catalog.
Steps:
1. `Balance.BirthdayRewardsActive` (bool, default false; switched on in `GameSession.Open` next to `DiaryActive` and `HayRackActive`).
2. `Pet.Birthday.cs`: `internal void GrantBirthday(int years, bool reward)`; when the flag is on and `reward` is true: `AddClovers(reward_clovers)`, `AddItem("cake")` (once per `CheckBirthdays` call, even for several missed years), `AddDiaryEntry("Happy birthday to me! I am N year(s) old today.")` (N = pig years; singular for 1), counter `birthdays`.
3. `Pet.cs`: only inside `CheckBirthdays()`: call `GrantBirthday` for each year, with `reward` true for at most the first 3 years of one call; the `Birthday` event is still raised for every year. Nothing else changes.
4. Tests: a single birthday; three missed birthdays pay exactly 3 times and give one cake; five missed birthdays still pay 3 times; diary text correct, including the singular; no double grant after a save and load round trip (`BirthdaysCelebrated` persists); with the default `new Balance()` nothing is paid.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
