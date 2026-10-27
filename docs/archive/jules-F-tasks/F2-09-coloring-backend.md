# Task F2-09: Colouring – saved progress, rewards and pack unlocking (Core + C# feature)

Read `AGENTS.md` and `jules/contracts.md` (section **coloring**) first and follow them exactly.
Requires F1-01, F1-06 (AwardColoring), F1-10 (pictures), F1-11 (game UI) merged.

## Goal
Colouring progress must survive restarts (stored in the save, not in browser storage), finished pictures give clovers
within the daily limit, and emoji packs can be unlocked for clovers.

## Files you may add
`src/Cuy.Core/Coloring/ColoringState.cs`, `src/Cuy.Core/GameState.Coloring.cs`, `src/Cuy.Core/Pet.Coloring.cs`,
`src/Cuy/dotNet/Features/ColoringFeature.cs`, `tests/Cuy.Core.Tests/ColoringTests.cs`. Do not edit other files.

## Specification
1. `ColoringState` (lazy `Coloring` property): `Dictionary<string, string> Progress` (pictureId → painted string of
   0/1), `List<string> Completed`, `List<string> UnlockedPacks` (default contains `guinea_pigs`, `food_and_toys`),
   `LastRewardPictureId`, `LastRewardClovers`.
   Size guard: keep at most 300 in-progress entries (drop the oldest started ones beyond that; completed pictures do not
   need their progress string – remove it when completed).
2. `Pet.Coloring.cs`: `SaveColoringProgress(id, painted)` (validate `^[01]{1,4096}$`), `GetColoringProgress(id)`,
   `CompleteColoring(id, colourableCells, int paintedOnes)` → only if `paintedOnes == colourableCells` and not completed
   before: add to Completed, clovers = `AwardColoring(cells)` (F1-06; respects the daily limit), store LastReward;
   returns clovers. `UnlockColoringPack(packId, price)` → `TryPay(price, "coloring")`, add to UnlockedPacks.
   Tests for all of it (incl. completing twice = no second reward, invalid strings rejected, daily limit).
3. `ColoringFeature` (`Id = "coloring"`): loads `assets/coloring/index.json` once (pack prices; locate the file like
   ItemCatalogLoader does). Messages per contract: `coloring_load` → `HomeWindow.PostToPage(new { type = "coloring_progress", pictureId, painted })`;
   `coloring_save`; `coloring_done { pictureId, cells }` → the painted string must exist with exactly `cells` ones
   (count from the saved progress; the page saves before sending done – if the latest save is missing, accept
   `painted` if the message includes it); `coloring_unlock { packId }` with the price from index.json (unknown pack →
   toast). After a reward: `brain.RequestAnimation("popcorn")` and toast `+<n> clovers!`. `AddState` per contract,
   `maxRewardedPerDay` from `EconomyConfig.Current.Coloring`.

## Checks
Core tests; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
PR "Windows check": colour a small picture, restart Cuy, progress kept; finishing gives clovers once.

When done, open a pull request against `main` titled `F2-09: Colouring progress and rewards`.
