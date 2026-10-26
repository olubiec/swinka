# Task F6-05: Tricks unlocked by the bond level

Read `AGENTS.md` first and follow it. Requires F4-05 (bond unlocks), F4-09 and F0-02 merged.

## Specification
1. Core (`Pet.Tricks.cs`, tests `TricksTests.cs`): `TrickResult Pet.TryPerformTrick(string id)` for `spin`, `stand_up`, `popcorn`,
   `hurdle` (unlock ids `trick_spin` L5, `trick_stand_up` L9, `trick_popcorn` L12, `trick_hurdle` L15 from `bond.json`).
   Results: `Ok`, `Locked`, `Tired` (energy < 25), `Cooldown` (30 s per trick), `Sleeping`. `Ok` costs 10 energy, gives
   +2 bond points (the daily bond limit still applies), +3 mood, and counts a diary stat. Numbers in `assets/data/tricks.json`.
2. Message `trick { id }`; the C# answer plays the animation on the desktop pig (or in Home if the pig is inside),
   `Tired` plays `yawn` and sends a page toast "Too tired for tricks".
3. Home feature `tricks` (web/home/features/tricks): four pixel buttons with the animation sprite, locked ones show the `padlock` icon (CSS `.icon-padlock`, exists in `assets/icons`)
   and "Level N"; state key `tricks: [{ id, unlocked, readyIn }]` (see `contracts.md`, add the section).
4. Tray menu: submenu `Tricks` with the unlocked tricks (edit `ContextMenus.cs` minimally).
5. Tricks respect `ScriptAnimation`/busy states (no trick while held, thrown or in the first-run intro).

## Checks
`dotnet test ... -c Release`, `node --check`, smoke test (assert the four buttons render), build passes.

When done, open a pull request against `main` titled `F6-05: Tricks`.
