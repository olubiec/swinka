# Task F2-04: Illnesses in the running game – VetFeature (C#), health ticking and visible symptoms

Read `AGENTS.md` and `jules/contracts.md` (section **vet**) first and follow them exactly.
Requires F1-01 (feature plugins), F1-06 (economy) and F1-08 (health core) merged.

## Goal
Illnesses from the Core model actually happen in the game, show on the desktop pig, lower the displayed health, and can
be treated through the vet clinic page (built in parallel, task F2-03).

## Files you may add / change
new `src/Cuy/dotNet/Features/VetFeature.cs`; `src/Cuy/dotNet/StatusBubble.cs` (only the health line, see 4).
Do not edit HomeWindow.cs, Brain.cs, BrainController.cs, FormPet*.cs.

## Specification
1. `VetFeature : HomeFeatureBase`, `Id = "vet"`:
   - `Tick(gameElapsed)`: `pet.TickHealth(gameElapsed)` (from F1-08; uses a `Random` owned by the feature). When a new
     condition appears: log `[Health] <id> started`, `HomeWindow.NotifyStateChanged()`, play the fear squeal once
     (`SoundManager.Instance?.PlayFear()`), and save.
   - Symptoms on the desktop: while `pet.IsSick`, every 4-8 real minutes (random) request the condition's animation
     (`brain.RequestAnimation(pet.SicknessAnimation)` – `sick`, `sad`, `shiver`, `scratch`) unless the pig is asleep,
     dragged or inside Home. Mites (`ScratchingFactor` > 1): request `scratch` that many times more often.
   - `AddState`: the contract object (names/info/prices from the definitions; unknown conditions hidden as the contract
     says; `symptoms`: scurvy → "Tired", "Rough fur"; dental → "Not eating treats", "Drooling"; bumblefoot → "Limping";
     mites → "Scratching a lot", "Bald spots"; respiratory → "Sneezing", "Crusty eyes"; gi_stasis → "Not eating",
     "Hunched"; tummy_ache → "Soft poops"; dedupe), `cureHint` from `cure_need` ("Vitamin C above 60" etc.).
   - `HandleMessage`: `vet_checkup`, `vet_treat`, `vet_dose` per contract, payments via `pet.TryPay(price, "vet")`;
     on failure `HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" })`. Save after each.
2. Health shown to the player (Home `needs.health` and the desktop bubble) must include the illness penalty: the Home
   payload's `needs.health` is produced in HomeWindow.cs (off limits) – instead `AddState` writes the key
   `healthDisplay` (= max(5, needs.Health - pet.HealthPenalty)) and the web reads it later; ALSO note this in the PR so a
   later task switches the Home bar to `healthDisplay`.
3. Gentle rules: no condition makes needs drop below 5 (Core handles decay; double-check and clamp here if needed).
4. `StatusBubble.cs`: where the health percentage is shown, subtract `pet.HealthPenalty` (min 5) and, when sick, show a
   small red cross icon (`PetIcons.GetIconBitmap("vet")`) next to it with tooltip "Sick – visit the vet in Home".

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and Core tests pass.
- PR "Windows check for the human": Debug build, Clock 60x, do not feed vitamin C for a day of game time → scurvy appears
  (symptom animations), check-up and treatment in Home work, doses on 3 days cure it.

When done, open a pull request against `main` titled `F2-04: Illnesses in game and vet backend`.
