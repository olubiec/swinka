Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>".

# W2-07: Items know their life stages; Core ranks food by the pig's low needs
Goal: Core can say which items are available at a life stage and in which order the Feed menu should list foods when a need is low (chew sticks first when the teeth are low).
Depends on: W1-11 (the five new items with `stages` in `items_shop.json`) merged. Facts: `ItemDefinition` has no `Stages` yet; the shop (`ShopFeature.cs`) reads items through the desktop class `ItemCatalogLoader`, not through Core `ItemCatalog`: this task does not touch the desktop (a later task connects the shop).
Change: `src/Cuy.Core/ItemDefinition.cs`, `src/Cuy.Core/ItemCatalog.cs`, new `src/Cuy.Core/Pet.StageCare.cs`, new `tests/Cuy.Core.Tests/StageCareTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `src/Cuy/*`, `assets/data/*`.
Steps:
1. `ItemDefinition.Stages` (`List<string>`, empty = available at every stage) and `bool IsAvailableFor(LifeStage stage)` (compares with `LifeStages.DataKey(stage)`, ignoring case; an empty list is always true).
2. `ItemCatalog.LoadJsonFiles` reads the optional `stages` array (strings). Unknown stage names are dropped and reported through `ItemCatalog.ErrorLogger`. Add `IEnumerable<ItemDefinition> AvailableFor(LifeStage stage)`.
3. `Pet.StageCare.cs` (`partial class Pet`): `IReadOnlyList<string> RankFeedItems(IEnumerable<string> itemIds, ItemCatalog catalog = null)` (catalog null means `ItemCatalog.Default`). It drops ids that are unknown or not available for `Stage`, then orders the rest by a score: the sum, over every need whose current value is below 30, of the item's effect on that need (use `NeedNames.DataKey(need)` and `ItemDefinition.GetEffect`), highest first; ties keep the input order (stable). Nothing hard-coded about chew sticks: they come first at teeth 20 because their `teeth` effect is the largest.
4. Tests (build catalogs from small JSON strings, plus one test with the real `items.json`, `items_shop.json` and `items_decor.json` through `RepoFile`): `IsAvailableFor` for no stages, `["senior","legend"]` and a mixed-case value; a junior cannot see `soft_pellets` and a senior can; unknown stage name dropped and logged; ranking at teeth 20 puts `chew_stick` or `dental_chew` before `hay`; ranking with all needs high keeps the input order; ranking drops stage-locked and unknown ids; a stage change makes the item available.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
