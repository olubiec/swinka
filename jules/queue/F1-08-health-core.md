# Task F1-08: Guinea pig illnesses – model, triggers and treatment rules (Cuy.Core + data + tests)

Read `AGENTS.md` first and follow it.

## Goal
Add real guinea pig illnesses that grow out of neglected needs, so care matters and the (later) vet clinic has a
purpose. Educational and gentle: the pig never dies; an untreated illness only makes it "very sick" (low health, sad
animations) until treated. This task is ONLY the model and rules with tests; UI and desktop effects come later.

## Files you may add
`assets/data/health.json`, `src/Cuy.Core/Health/ConditionDefinition.cs`, `src/Cuy.Core/Health/HealthState.cs`,
`src/Cuy.Core/Health/HealthSystem.cs`, `src/Cuy.Core/GameState.Health.cs`, `src/Cuy.Core/Pet.Health.cs`,
`tests/Cuy.Core.Tests/HealthSystemTests.cs`. Do not edit existing files.

## Data (assets/data/health.json) – exact content
```json
{ "checkup_price": 30,
  "severity_growth_per_day": 0.35,
  "conditions": [
  { "id": "scurvy", "name": "Scurvy (vitamin C deficiency)",
    "trigger": { "need": "vitamin_c", "below": 20, "for_hours": 24 }, "chance_per_day": 1.0,
    "extra_decay_per_hour": { "energy": 2, "mood": 2 }, "animation": "sick",
    "treatment": { "price": 40, "course_days": 3, "cure_need": { "need": "vitamin_c", "above": 60 } },
    "info": "Guinea pigs cannot make vitamin C themselves, like people. They need it every day from fresh vegetables such as bell pepper, parsley or kale." },
  { "id": "dental", "name": "Overgrown teeth",
    "trigger": { "need": "teeth", "below": 15, "for_hours": 24 }, "chance_per_day": 1.0,
    "extra_decay_per_hour": { "fullness": 2 }, "refuses_treats": true, "animation": "sad",
    "treatment": { "price": 60, "course_days": 0 },
    "info": "A guinea pig's teeth grow all the time. Lots of hay wears them down; without it they can overgrow and hurt." },
  { "id": "bumblefoot", "name": "Bumblefoot (sore feet)",
    "trigger": { "need": "cleanliness", "below": 25, "for_hours": 48 }, "chance_per_day": 1.0,
    "extra_decay_per_hour": { "mood": 2 }, "slow_walk": true, "animation": "sad",
    "treatment": { "price": 50, "course_days": 5, "cure_need": { "need": "cleanliness", "above": 75 } },
    "info": "Dirty, wet bedding and hard floors make the soles of the feet sore and swollen. Clean, soft bedding prevents it." },
  { "id": "mites", "name": "Mites",
    "trigger": { "need": "cleanliness", "below": 50, "for_hours": 24 }, "chance_per_day": 0.15,
    "extra_decay_per_hour": { "mood": 1 }, "scratching": 4.0, "animation": "scratch",
    "treatment": { "price": 35, "course_days": 2 },
    "info": "Tiny mites cause itching, scratching and bald spots. A vet gives a safe treatment; never use dog or cat products." },
  { "id": "respiratory", "name": "Respiratory infection",
    "trigger": { "random": true }, "chance_per_day": 0.01,
    "risk_multipliers": { "mood_below_30": 3.0, "energy_below_25": 2.0, "cleanliness_below_40": 2.0 },
    "extra_decay_per_hour": { "energy": 3, "fullness": 1 }, "animation": "shiver",
    "treatment": { "price": 50, "course_days": 5 },
    "info": "Sneezing, crusty eyes or noisy breathing need a vet quickly. Draughts and dirty bedding make it more likely." },
  { "id": "gi_stasis", "name": "Gut stasis",
    "trigger": { "need": "fullness", "below": 10, "for_hours": 12 }, "chance_per_day": 1.0,
    "extra_decay_per_hour": { "mood": 3, "energy": 1 }, "animation": "sad",
    "treatment": { "price": 70, "course_days": 0, "cure_need": { "need": "fullness", "above": 40 } },
    "info": "A guinea pig's gut must keep moving. Without food for many hours it can stop – an emergency. Hay must always be there." },
  { "id": "tummy_ache", "name": "Upset tummy (too many treats)",
    "trigger": { "sweet_treats_today_above": 3 }, "chance_per_day": 1.0,
    "extra_decay_per_hour": { "mood": 1 }, "animation": "sad",
    "treatment": { "price": 20, "course_days": 0 },
    "info": "Fruit and carrots are sweet. Small pieces now and then are fine; too many upset the stomach." }
  ] }
```
Sweet treats = items `carrot`, `strawberry` (count today from `Pet.State.Stats.Counters` or keep an own daily counter
in HealthState that a later task feeds via `Pet.RecordTreat(itemId)` – add that method).

## Model and rules
- `HealthState` (saved, lazy property `Health` in `GameState.Health.cs` like other partial files): `List<ActiveCondition>`
  (`Id`, `SinceUtc`, `Severity` 0..1, `Known` (diagnosed at the vet), `Treated`, `CourseDaysLeft`, `LastDoseLocalDate`),
  `Dictionary<string, double> LowNeedHours` (hours each need has been below its trigger), `LastCheckupUtc`,
  `SweetTreatsToday`, `TreatsLocalDate`, `RandomSeed` handling not saved.
- `HealthSystem.Tick(Pet pet, TimeSpan gameElapsed, Random rng)`: 
  1. update `LowNeedHours` per trigger (reset to 0 when the need is back above the threshold);
  2. once per game day (track `LastRollLocalDate`) roll each not-active condition: triggered ones by `chance_per_day`,
     random ones by `chance_per_day * product(risk multipliers that apply)`; at most ONE new condition per day; never
     more than 2 active at once;
  3. active untreated: `Severity += severity_growth_per_day * days`, max 1; apply `extra_decay_per_hour * hours *
     (0.5 + Severity)` to the needs through `pet.ChangeNeed(need, -value)`;
  4. treated with a course: severity falls by 1/(course_days+1) per completed daily dose; finished course + cure_need
     satisfied (if any) → condition removed, history entry added (`List<HealthHistoryEntry>`: id, start, end).
     Treated with course 0: removed right away if cure_need is satisfied (or none); otherwise stays treated
     (no extra decay) until the need is satisfied.
- `Pet.Health.cs`: `HealthSystem` instance; `TickHealth(TimeSpan elapsed)` (the desktop calls it later),
  `Checkup()` → marks all active as `Known`, sets `LastCheckupUtc`, returns the list (price is charged by the caller),
  `Treat(conditionId)` → sets Treated, CourseDaysLeft = course_days, first dose today; `GiveDose(conditionId)` → once
  per local day, decrements CourseDaysLeft; `bool IsSick`, `bool RefusesTreats`, `bool SlowWalk`,
  `double ScratchingFactor`, `string SicknessAnimation` (animation of the most severe active condition or null),
  `double HealthPenalty` = 15 * sum(severity) (cap 60; the display health = needs health - penalty, min 5).
- Clock: `pet.Clock`, local dates via `Clock.LocalNow()`. Randomness: injectable `Random`.

## Tests (HealthSystemTests.cs, ManualClock, seeded Random)
scurvy appears after 24 h below 20 vitamin C and not before; at most one new per day, max 2 active; random respiratory
uses multipliers (statistical test with fixed seed: higher rate with low mood); severity grows and extra decay applies;
treatment with course 3 needs 3 daily doses (two doses same day count once) and cure_need; course 0 removal;
`RefusesTreats` with dental; health penalty cap; old save without Health loads.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` all green.

When done, open a pull request against `main` titled `F1-08: Illness model and treatment rules`.
