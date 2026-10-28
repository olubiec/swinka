# W6-02: Feeding refills the hay rack, and cake starts the party animation
Zmieniaj: src/Cuy/dotNet/HomeWindow.cs, src/Cuy/dotNet/FoodManager.cs
Wymagane: src/Cuy/dotNet/HomeWindow.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: src/Cuy.Core/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Giving hay (from Home or on the desktop) really refills the hay rack, and the cake plays its own animation instead of a plain eat.
Depends on: W1-07 / W2-04 (hay rack in Core: `Pet.RefillHay()`) merged.
Facts: `Pet.RefillHay()` exists in `src/Cuy.Core/Pet.Hay.cs` but nothing in the app calls it. `HomeWindow.HandleFeed` always plays `eat` (unlimited items) or `eat_treat`. The item catalog (`ItemCatalogLoader.AddDefault`, `items.json`) already stores an animation per item (`cake` has `party`, `hay` has `eat`).
Steps:
1. In `HandleFeed` (Home) and in the matching place in `FoodManager` (food dropped on the desktop): after a successful hay meal call `pet.RefillHay()` and `pet.Count("hay_refills")`; hay keeps its unlimited behaviour.
2. Use the animation stored in the item definition when it is set (cake: `party`), else the current `eat` / `eat_treat` choice. Find the field name in `CuyItemDef`; do not add a new one.
3. Refusal rules stay as they are (full pig, teeth pain, daily limits). After the change send the state so the page sees the rack (`SendStateToWebView` is already called after handled messages).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": feed hay, the rack bar rises; feed cake, the pig plays the party animation..
