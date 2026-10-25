# Task F6-07: The companion walks on the desktop

Read `AGENTS.md` first and follow it. Requires F6-06, F4-01 (`SpriteSheetLoader`) and F4-09 merged.

## Specification
1. `CompanionBehavior` (`src/Cuy/dotNet/Behaviors/`): when `Pet.State.Companion != null`, create a second `FormPet`
   (use `StartUp.AddSheep()`/`MaxPets` machinery; raise `MaxPets` to 2 if needed) whose sprites come from
   `SpriteSheetLoader.Load("companion_" + coat)`. It is NOT driven by the full `Brain`; it has a small own state machine
   (new class `CompanionAi` in the same folder): idle, wander (short walks), eat when the main pig eats, sleep when the main
   pig sleeps, and the pair actions below. Same physics, taskbar and windows rules as the main pig (use the same FormPet code).
2. Pair actions when the two pigs are within 150 px for at least 3 s (cooldown 60 s): `nose_touch` (both), `follow`
   (companion follows the main pig for 10-20 s), `groom_other`, and `sleep_together` (both lie down next to each other when
   the main pig naps). `Pet.State.Companion.Together = true` while any pair action runs or the pigs are within 150 px.
3. The companion can be petted (reuse `InteractionManager`-style petting through a small hook: purr + hearts, mood +5 for
   the companion, no clover reward), dragged and thrown like the main pig, and clicking never counts towards the main pig's
   sulking.
4. Sounds: the companion uses the same `SoundManager` with a +12 % pitch (squeak) and never wheeks within 20 s of the
   main pig.
5. Hide with the main pig during the fullscreen hide (F6-03) if it exists; leave Home with the main pig when Home opens
   (the companion stays on the desktop unless F6-08 puts it inside Home).
6. Restart-safe: positions are not saved; on start it appears next to the main pig. Log `[Companion] ...`.

## Checks
Build passes; `--selftest` still passes. PR "Windows check": adopt (dev save edit or F6-08), watch pair actions.

When done, open a pull request against `main` titled `F6-07: Companion on the desktop`.
