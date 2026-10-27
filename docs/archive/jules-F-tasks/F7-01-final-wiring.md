# Task F7-01: Wire waves 4-6 together and extend the smoke test

Read `AGENTS.md` and `jules/contracts.md` first. All F4, F5 and F6 tasks are merged.

## Files you may change
`web/home/features/index.json`, `tools/qa/web-smoke.js`, `web/home/app.js` and feature files ONLY for bugs the checks find
(list each fix in the PR), `jules/contracts.md` (bring it in line with what was really built).

## Steps
1. `features/index.json` order: daily, shop, calendar, vet, coloring, decor, tricks, companion, diary, settings.
   Check the More grid with 10 tiles fits the 400x620 window without scrolling the page.
2. Smoke test additions: open every new feature (diary, tricks, companion, album) with mock state (companion `canAdopt`
   true, bond level 12 so three tricks are unlocked, 3 diary entries); screenshot each; click Adopt in the mock and
   assert the companion card changes; click an unlocked trick and assert a message `trick` was sent.
3. Start every minigame (`hay_hop`, `hay_maze`, `veggie_memory`, `veggie_rain`) for 2 s, assert no console error.
4. Fix every page error, overflow, cut-off text and unreachable button you find.
5. Check that the first-run flow still shows only the welcome/naming view (mock `needsNaming: true`) with no feature
   opening over it, and that the intro cards still end by closing Home.
6. Reconcile `contracts.md` sections diary, album, bond, hayRack, minigames, tricks, companion, settings, weather with the code.

## Checks
`node --check`; `node tools/qa/web-smoke.js`; build passes.

When done, open a pull request against `main` titled `F7-01: Final wiring and smoke test`.
