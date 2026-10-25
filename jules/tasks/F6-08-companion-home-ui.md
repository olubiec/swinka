# Task F6-08: Adoption screen and the companion in the Home room

Read `AGENTS.md` first and follow it. Requires F6-06, F0-02 and F1-04 (`CuyRoom` layer API) merged.

## Specification
1. Home feature `companion` (`web/home/features/companion/`): if `state.companion.canAdopt`: an adoption card with three
   preview sprites (`idle` animation of each coat, drawn from the sprite sheets with the same sprite code as the pig canvas),
   a name input (1-16 characters), an Adopt button -> `companion_adopt { name, coat }`. If the requirement is not met: a locked
   card with `state.companion.reason`. If adopted: a card with the companion's name, coat, needs bars and the text
   "Together: yes/no".
2. The second pig appears in the Home room (`web/home/canvas-pig.js` / `CuyRoom` layer): it idles and wanders slowly on
   the floor, sleeps when the main pig sleeps, with its own shadow. The pig drag-out of Home applies to the main pig only.
3. After adoption show a one-time toast "Say hello to <name>!" and send the diary hook (`companion_adopted` counter).
4. Smoke test: mock state with `canAdopt: true`, adopt in the mock bridge, screenshot before/after.

## Checks
`node --check`; `node tools/qa/web-smoke.js`; build passes.

When done, open a pull request against `main` titled `F6-08: Companion adoption UI`.
