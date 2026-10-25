# Task F2-03: Vet clinic in Home (web feature)

Read `AGENTS.md` and `jules/contracts.md` (section **vet**) first and follow them exactly.

## Goal
A friendly pixel vet clinic: the player sees symptoms, pays for a check-up, learns the diagnosis with a short real-life
explanation, pays for treatment and gives daily doses until the pig is well. Educational, never scary.
The C# half (`VetFeature`, task F2-04) is built in parallel.

## Files you may add
`web/home/features/vet/feature.js`, `web/home/features/vet/feature.css`. Nothing else (no `features/index.json` edit
in the commit; add `"vet"` only temporarily for local testing).

## UI (modal ~360x520, pixel style, selectors prefixed `.feature-vet`)
1. Header: a small clinic illustration drawn with CSS/canvas (counter, cross sign using `icon-vet`), and the pig's state:
   "Your pig looks healthy" or the `symptoms` list as tags.
2. If sick and no check-up done since the condition started: big button **Check-up – 30 🍀** (`vet_checkup`), disabled
   with the reason when clovers are too low (`state.clovers`).
3. Diagnosed conditions (cards): name, severity bar (green → red), `info` text, `cureHint`, then:
   - not treated: **Treat – <price> 🍀** (`vet_treat`);
   - treated with a course: "Medicine: day X of N" and **Give today's dose** (`vet_dose`) when `doseDueToday`, else
     "Next dose tomorrow ✓";
   - treated, waiting for the cure condition: the hint ("Give vitamin C rich food: bell pepper, parsley").
4. Undiagnosed conditions: one card "Something is wrong" with the symptoms and the check-up button.
5. History list (collapsed by default): past illnesses with dates.
6. A short "Good to know" section always visible at the bottom: 3 rotating real facts (vitamin C every day, unlimited
   hay for teeth, weekly weighing) – static texts in the feature.
7. Toasts: listen to page messages `toast` and show them inside the feature if open.
8. Mock mode (no `state.vet`): demo state with one known scurvy (treated, day 1 of 3) and one unknown condition, label
   "(demo)".
9. Register: `CuyHome.registerFeature({ id: 'vet', title: 'Vet clinic', icon: 'icon-vet', order: 15, open, close, onState })`.

## Checks
- `node --check web/home/features/vet/feature.js`; smoke test with `"vet"` temporarily listed
  (`npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`),
  revert the list. Screenshots of healthy, sick-unknown and treated states in the PR.

When done, open a pull request against `main` titled `F2-03: Vet clinic UI`.
