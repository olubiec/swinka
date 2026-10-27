# Task F2-04: Illnesses in the running game – VetFeature (C#), health ticking and visible symptoms

Read `AGENTS.md` and `jules/contracts.md` (section **vet**) first and follow them exactly.
Requires F1-01 (feature plugins), F1-06 (economy) and F1-08 (health core) merged.

## Goal
Illnesses from the Core model actually happen in the game, show on the desktop pig, lower the displayed health, and can
be treated through the vet clinic page (built in parallel, task F2-03).

## Files you may add / change
new `src/Cuy/dotNet/Features/VetFeature.cs`; `src/Cuy/dotNet/StatusBubble.cs` (only the health line, see 4); data and
loader changes of step 5: `assets/data/health.json`, `assets/data/care.json`, `assets/data/actions.json`,
`src/Cuy.Core/Health/ConditionDefinition.cs`, `src/Cuy.Core/Care/CareTaskDefinition.cs`, `src/Cuy.Core/Pet.Care.cs`
(weight alert only), `jules/contracts.md` (section vet: add `urgency`, `cureHint` text rule), tests for the changed rules.
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
     "Hunched"; tummy_ache → "Soft poops"; dedupe), `cureHint` from the new `cure_hint` text of each condition in `health.json` (step 5; plain words, NO numbers), `urgency` from
     `urgency` in `health.json`.
   - `HandleMessage`: `vet_checkup`, `vet_treat`, `vet_dose` per contract, payments via `pet.TryPay(price, "vet")`;
     on failure `HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" })`. Save after each.
2. Health shown to the player (Home `needs.health` and the desktop bubble) must include the illness penalty: the Home
   payload's `needs.health` is produced in HomeWindow.cs (off limits) – instead `AddState` writes the key
   `healthDisplay` (= max(5, needs.Health - pet.HealthPenalty)) and the web reads it later; ALSO note this in the PR so a
   later task switches the Home bar to `healthDisplay`.
3. Gentle rules: no condition makes needs drop below 5 (Core handles decay; double-check and clamp here if needed).
4. `StatusBubble.cs`: where the health percentage is shown, subtract `pet.HealthPenalty` (min 5) and, when sick, show a
   small red cross icon (`PetIcons.GetIconBitmap("vet")`) next to it with tooltip "Sick – visit the vet in Home".

5. R8 data corrections (the care and health data merged in F1-07/F1-08 contain numbers no veterinary source supports):
   - `health.json`: add per condition `"urgency"` and `"cure_hint"`. Urgency (R8.3): `gi_stasis` and `respiratory` = `"today"`,
     `dental` = `"asap"`, `scurvy`, `bumblefoot`, `mites` = `"days"` (design choice, no source gives a timeframe), `tummy_ache` = none.
     `cure_hint` examples: scurvy "Give vitamin C rich food every day (bell pepper, parsley, kale)", bumblefoot "Keep the bedding clean
     and dry", gi_stasis "Hay and water always available". `cure_need` thresholds stay: they are game-need values, not veterinary
     amounts. No text may contain mg figures. Keep `info` texts; the respiratory text must say "see a vet quickly".
   - `care.json`: remove `weight_alert.drop_grams` and `drop_percent` (hard-coded weight-loss numbers). New rule in `Pet.Care.cs`: an alert
     whenever a weigh-in is lower than the previous one; the text states the grams lost and says "Watch her and see a vet if it
     continues" (no threshold). Change the loader/definition, the default `WeightAlertsConfig`, the contract example and the tests
     that assert 50 g / 5 %. Nail trim text: "every few weeks" (Merck) / `every_days` stays 28 as the game reminder cadence.
   - `actions.json`: the `day_budget.description` and `rare_per_day` texts claim sources (4-6 h sleep, active at dawn and dusk, popcorn
     counts per age) that research R8.5 did not confirm. Reword them as "game design choice, not veterinary fact"; keep the numbers;
     remove "active at dawn and dusk". Do not change behaviour.

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and Core tests pass.
- PR "Windows check for the human": Debug build, Clock 60x, do not feed vitamin C for a day of game time → scurvy appears
  (symptom animations), check-up and treatment in Home work, doses on 3 days cure it.

## Gotowe pliki
None: no ready-made code exists for this task. Source of the rules: `DECYZJE.md` (rows Choroby, Opieka, Witamina C, Budżet czasu).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` VET-01, VET-02): urgency buckets for scurvy/bumblefoot/mites are a design choice (R8.3);
  life-stage ages are not used here (PetMD only, R8.4).
- Windows check in the PR: weigh-in lower than the previous one shows the new alert; a first weigh-in shows none.

When done, open a pull request against `main` titled `F2-04: Illnesses in game and vet backend`.
