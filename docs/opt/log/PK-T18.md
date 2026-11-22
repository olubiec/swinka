# PK-T18: Garden Run Adversarial Tests
Core (`RunAdversarialTests`): 7 PASS, 0 DEFECT, 1 SKIP (`RUN_AssignOverCapacity_PetRunDeferred` - `Pet.Run` deferred in F3-2).
Full `Cuy.Core.Tests`: 1296 passed, 2 skipped, 7 pre-existing failures in `WorldMessageTests`/`PigPinMessagesTests`/`WorldItemCatalogTests`.
JS (`ux-p124-run-adv.js`): 4 PASS, 1 DEFECT, 1 SKIP (`RUN-pig-actually-runs-in-run` - `run_overlay` draws static markers only).
DEFECT `RUN-assign-flow`: `.run-assign-btn[data-pig-id="starter"]` missing after opening `#runEntryBtn` in garden mock mode.
- Repro: open Home in mock mode -> `CuyPlaces.openPlace('garden')` -> click `#runEntryBtn`.
- Expected: candidate list renders `starter` (`Let out` button) from `run/mock.js`.
- Actual: `.run-candidate-list` has no `.run-assign-btn[data-pig-id="starter"]` (30s timeout).
Decisions: used `CuyPlaces.openPlace` to switch scenes; left unrelated pre-existing Core failures untouched.
