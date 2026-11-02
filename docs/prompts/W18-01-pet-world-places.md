# W18-01: Pet.World: unlock and upgrade places and rooms
Zmieniaj: src/Cuy.Core/Pet.World.cs, src/Cuy.Core/Events.cs, tests/Cuy.Core.Tests/PetWorldTests.cs
Wymagane: src/Cuy.Core/Pet.World.cs, tests/Cuy.Core.Tests/PetWorldTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs
Goal: A pet can unlock places and rooms and raise their levels, paying clovers.
Depends on: W17 merged.
Facts: `Pet` is partial (follow `Pet.Economy.cs`). Spend with `TrySpendClovers`, count with `Count(name, by)` (`places_unlocked`, `plots_owned` is set elsewhere). Everything is behind `Balance.PlacesActive` (off: methods return `Disabled`). The farm gives its `welcome_items` (starter seeds) when first unlocked. Holds `PlaceCatalog`/`WorldItemCatalog`/`FarmConfig` as injectable properties with lazy defaults (like `HayTable`). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Events: `PlaceUnlockedEventArgs(string id)`, `PlaceUpgradedEventArgs(string id, int level)`.
2. `WorldResult UnlockPlace(string id)`, `UnlockRoom(string id)`, `UpgradePlace(string id)` mapping `PlaceUnlock` results and clovers (`Ok`, `NotEnoughClovers`, `Locked`, `MaxLevel`, `Unknown`, `Disabled`); on success spend, raise the event, count, and for the farm set `FarmState.PlotsOwned = StartPlots` and add starter seeds to `Inventory`.
3. Tests: unlocking the garden with 399 clovers fails and with 400 succeeds and leaves 0; the farm without the garden is `Locked`; unlocking the farm grants 4 plots and 2+2+2 seeds; upgrading the salon twice costs 530 + 1200; max level is refused; with the flag off nothing changes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
