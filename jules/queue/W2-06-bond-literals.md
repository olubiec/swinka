Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>".

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
