# W2-06: Greeting and call read the bond unlock table
Goal: the desktop greeting and the call behavior depend on `Pet.IsUnlocked` instead of level literals.
Depends on: W1-06 (bond core) merged.
Change: `src/Cuy/dotNet/InteractionManager.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. Replace the literal `bond >= 3` (greeting at start) with `Pet.IsUnlocked("greet_on_start")` and `bond >= 7` (come when called) with `Pet.IsUnlocked("come_when_called")`. Minimal edit; behavior is identical at the same levels.
2. Search `InteractionManager.cs` for any other bond-level literal and list it in the PR without changing it.
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` pass.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.


Facts (checked on main): `InteractionManager.cs` has exactly one bond-level literal, the startup greeting (`int bondLevel = ...; if (bondLevel >= 3)` in `CheckStartupGreeting`). There is NO `bond >= 7` / `come_when_called` literal anywhere in `src/` (`CallPet()` in `BrainController.cs` delegates to `InteractionManager.CallPet()` without a level check). `come_when_called` is unlocked at level 7 in `assets/data/bond.json` and `BondUnlocks`.
Decision (do not ask): (1) replace only the greeting check with `pet != null && pet.IsUnlocked("greet_on_start")` and keep the existing log line; (2) do NOT add a new level check to `CallPet()`; the call behavior stays as it is. Mention in the PR that no literal for `come_when_called` was found.
