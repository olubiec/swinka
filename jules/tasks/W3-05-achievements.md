# Task W3-05: Achievements with clover rewards (Core + Home screen)

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: W3-02 merged (shared `HomeWindow.cs` and Home files). Counters that the old text lists for the companion and weather are not built: skip those achievements ("companion adopted") and list what you skipped in the PR.
Replaces old task(s): F8-01. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Goal
Clovers come from achievements too (plan: 50–200 each). Add about 20 one-time achievements, a Home screen to see them, and
a desktop toast when one is earned.

## Files you may change
New: `assets/data/achievements.json`, `src/Cuy.Core/Achievements/AchievementCatalog.cs`, `AchievementEvaluator.cs`,
`src/Cuy.Core/GameState.Achievements.cs` (property `Achievements`: set of earned ids + dates), `src/Cuy.Core/Pet.Achievements.cs`,
`tests/Cuy.Core.Tests/AchievementTests.cs`; `web/home/features/achievements/feature.js` (+ `feature.css`);
`src/Cuy/dotNet/HomeWindow.cs` (state key), `web/home/bridge.js` (mock).

## Design rules from research (R5.3)
A short list (about 20; no source fixes a number), weighted to easy and medium with only a few hard ones (reference split 20 % easy,
20 % medium, the rest harder; UNVERIFIED for cozy games). No trivial and no grind achievements: reward care and discovery. Rewards are small multiples
of one day's income (no source gives the ratio: use the numbers from the F7-02 simulation, do not guess).

## Specification
1. `achievements.json` entries: `{ "id", "title", "text", "rule": { "counter": "feed", "atLeast": 1 }, "reward": 50 }`.
   Include at least: first meal, 100 pettings, 10 minigame plays, 3 minigame plays in one day, first colouring picture
   finished, first vet check-up, first illness cured, 7-day gift streak, first birthday, reached Junior, Adult, Senior,
   Legend, companion adopted, all tricks learned, 50 poops cleaned, 30 care tasks done, 100 hay refills.
   Rewards from 50 to 200 (keep the numbers in the file only).
2. `AchievementEvaluator.Check(GameState)` runs after every relevant event (each counter increment, stage change, adoption,
   birthday) and grants each achievement once: clovers via `AddClovers`, a diary line, and an event `AchievementEarned`.
3. Tests: each rule fires once only, reward added once, save/load keeps earned ids, unknown counter names are ignored.
4. Home feature `achievements`: grid of cards; earned = coloured with date, not earned = greyed with the text but no hint
   for hidden ones (`hidden: true` in json shows "???"). Use the icon `trophy` (CSS `.icon-trophy`) in the screen header and on cards;
   optional per-category colour via `badge_care`, `badge_play`, `badge_growth`, `badge_social` (all exist in `assets/icons`, fall back to `trophy`). State key `achievements: [{ id, title, text, reward, earned, date, hidden }]`.
5. Desktop: toast/bubble "Achievement: <title> +<reward> clovers" through `StatusBubble`, once per achievement.

## Checks
`dotnet test ... -c Release`; `node --check`; `node tools/qa/web-smoke.js`; Cuy.csproj builds.

## Gotowe pliki
None: no ready-made code exists for this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC: nothing UNVERIFIED depends on code. In the PR: list of achievements by difficulty (easy/medium/hard counts).

When done, open a pull request against `main` titled `W3-05: Achievements`.
