# Task F2-11: Daily gift popup

Read `AGENTS.md` and `jules/contracts.md` (section **daily**) first and follow them exactly.
Requires F1-01 (plugins) and F1-06 (economy core) merged.

## Goal
Once a day, when Home opens, a small gift box pops up: "Day 3 in a row! +20 🍀" with a Claim button; the streak grows
the reward (rules in Core). Also reachable from More → Daily gift (shows "Come back tomorrow" when claimed).

## Files you may add
`src/Cuy/dotNet/Features/DailyFeature.cs`, `web/home/features/daily/feature.js`, `web/home/features/daily/feature.css`.

## Specification
1. `DailyFeature` (`Id = "daily"`): `AddState` → `pet.GetDailyGift()` per contract; `daily_claim` → `pet.ClaimDailyGift()`,
   save, post `{ type: 'daily_claimed', amount, streak }`, `brain.RequestAnimation("popcorn")`. Do not auto-claim.
2. Web: on the first `onState` after Home becomes visible (track `document.visibilityState` and a session flag) with
   `daily.available` true, `state.needsNaming` false, no first-run/onboarding view visible and no other feature/modal
   open → open itself: pixel gift box drawn with CSS (icon `icon-gift`
   at x2 + a bouncing animation), text "Day N in a row!", amount, a row of 7 small boxes showing this week's streak days,
   **Claim** → send `daily_claim`; on `daily_claimed` show a burst of clover icons and "+N clovers", close after 1.5 s.
   In More (`order: 1`, title `Daily gift`, icon `icon-gift`): the same view; when not available: "Come back tomorrow –
   tomorrow's gift: +X" (X = min(50, amount + 5)).
3. Mock mode: demo `daily` state, claim works locally.

## Checks
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; `node --check`; smoke test with
`"daily"` temporarily listed (revert).

When done, open a pull request against `main` titled `F2-11: Daily gift`.
