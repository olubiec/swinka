# Task F6-07: The companion walks on the desktop

Read `AGENTS.md` first and follow it. Requires F6-06, F4-01 (`SpriteSheetLoader`) and F4-09 merged.

## Findings from research (R14) to respect
- eSheep (MIT since 2026-10-14; keep its attribution in `THIRD_PARTY_NOTICES.md`) keeps pets in `StartUp.sheeps[]`, `MAX_SHEEPS = 16`, added
  by `AddSheep()`; pet-to-pet interaction there is matched by WINDOW TITLE (a window titled "Sheep") and position. The companion window
  therefore gets a UNIQUE window title (`Cuy companion`, different from the main pig's) and an own limit of 2 pets in Cuy (not 16).
- Ideas taken from Shimeji: spawn the companion with a start behaviour (Breed + BornBehavior) and cap the count with one global counter.
- Before integrating, on a clone of eSheep run `git log --since=2024-01-01` and read what changed in `FormPet`/`StartUp` (the list was
  not retrieved in research; DPI/multi-monitor changes were not found in the 4 releases 1.3.2-1.6.0). Report what you found.

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

## Gotowe pliki
None: no ready-made code (pattern only: eSheep `StartUp.AddSheep()` and `FormPet`).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` ESH-01..ESH-03): two pigs do not react to each other through the title match by accident; limit 2 holds;
  the companion never appears twice after a restart.

When done, open a pull request against `main` titled `F6-07: Companion on the desktop`.
