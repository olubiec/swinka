# Task W1-02: Toys: Home clicks, Play menu, pig plays by itself

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: nothing (wave 1 start).
Replaces old task(s): F2-07. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Goal
The ball, tunnel and house (and the new hay ball) can be bought but the player never sees them used. Make playing an
action the player can trigger: in Home by clicking the toy (F1-04 sends `play_toy`), and on the desktop through the tray
menu **Play ▸ Ball / Tunnel / Hay ball**; the pig also plays by itself more often once it owns toys.

## Files you may change / add
new `src/Cuy/dotNet/Features/ToysFeature.cs`, `src/Cuy.Core/AI/Brain.cs` (add `ForceAction`),
`src/Cuy/dotNet/BrainController.cs` (add `ForceAction` wrapper), `src/Cuy/dotNet/ContextMenus.cs` (Play submenu),
`assets/data/actions.json` (add `hay_ball_play`, tune two weights), `tests/Cuy.Core.Tests/BrainForceActionTests.cs`.

## Specification
1. `Brain.ForceAction(string actionId)` → returns the `ActionDecision` or null: starts that action now if its
   `conditions.item` is owned and its cooldown has passed (ignores score, daily budget and energy_min); records the
   cooldown and the daily count like a normal choice. Tests: owned+ready → started; not owned → null; cooldown → null.
2. `BrainController.ForceAction(id)`: if the pig is inside Home or a script/physics/food/interaction is active → return
   false; otherwise call the Brain, `SetupActionState`, and request the animation; log `[Play] ...`.
3. `actions.json`: add `hay_ball_play` (animation `ball_push`, duration 1.2, effects mood 10 teeth 5, conditions item
   `hay_ball` energy_min 25, cooldown_s 900, satisfies mood). Raise `base_weight` of `ball_play` and `tunnel` by 50 %
   so owned toys get used by the pig on its own (keep everything else).
4. `ToysFeature` (`Id = "toys"`): `AddState` per contract incl. `hay_ball`; `HandleMessage("play_toy")`: inside Home the
   pig cannot run on the desktop, so apply the action's effects directly (Core: `pet.ChangeNeed` for each effect) if the
   cooldown allows (shared cooldown with the desktop: keep the last play time per item in
   `pet.State.Stats.Counters["toy_last_<id>"]` as unix seconds), count `played_<id>`, mark the animation as seen in the
   album (`pet.MarkSeen("ball_push" | "tunnel_in" | "house_enter")`), save; when on cooldown post toast
   "<Toy> needs a break (2 min)".
5. Tray: `Play` submenu after `Call`: items for owned toys only (ball, tunnel, hay ball; disabled with "(not owned)" text
   hidden – show only owned; if none, one disabled item "Buy toys in the Shop"). Click → `BrainController.ForceAction`;
   if it returns false because the pig is in Home, close Home first (`HomeWindow.CloseIfOpen()`) and retry after 1.5 s.
   The submenu is rebuilt when the menu opens (owned items change).

## Checks
Core tests (new + existing BrainTests); `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
PR "Windows check for the human": buy a ball (or give it via the Debug test panel), tray → Play → Ball, the pig pushes
the ball on the taskbar.

When done, open a pull request against `main` titled `W1-02: Toys and Play menu`.
