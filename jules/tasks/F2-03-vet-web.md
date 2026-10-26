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
6. A short "Good to know" section always visible at the bottom: 3 rotating real facts, static texts in the feature, only
   these (R8.2, R8.3 – veterinary sources Merck, Wood Green): fresh vitamin C food every day, unlimited hay for teeth, weigh
   weekly and see a vet about any weight loss, a vet check about once a year, nails every few weeks.
7. Toasts: listen to page messages `toast` and show them inside the feature if open.
8. Mock mode (no `state.vet`): demo state with one known scurvy (treated, day 1 of 3) and one unknown condition, label
   "(demo)".
9. Register: `CuyHome.registerFeature({ id: 'vet', title: 'Vet clinic', icon: 'icon-vet', order: 15, open, close, onState })`.

## Wording rules (from R8, mandatory)
- No weight-loss percentage and no gram threshold anywhere in the page (no source gives one). No vitamin C amounts
  (no mg per day, no mg per 100 g) in any text.
- Each diagnosed condition card shows an urgency tag taken from `urgency` in the condition object (`today`, `asap`, `days`,
  absent = no tag): `today` = "See a vet today", `asap` = "See a vet as soon as possible", `days` = "See a vet within a few days".
  The tag is optional; if the field is missing show nothing. Do not invent hours or day counts.
- Severity is shown as the bar only; if you label it, use three bands (calm / worrying / urgent) by severity ranges
  0-0.33, 0.34-0.66, 0.67-1.0 — no other numbers.
- Footer line on every card: "Cuy is a game, not a vet. If your real guinea pig seems unwell, call a vet."
- `cureHint` is shown as received (text without numbers is built by F2-04).

## Checks
- `node --check web/home/features/vet/feature.js`; smoke test with `"vet"` temporarily listed
  (`npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`),
  revert the list. Screenshots of healthy, sick-unknown and treated states in the PR.

## Gotowe pliki
None: no ready-made code exists for this task (UI only). Wording rules come from `DECYZJE.md` (rows Choroby, Opieka, Witamina C).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` VET-01): the urgency buckets for scurvy, bumblefoot and mites (`days`) are a design choice, no
  veterinary source gives a timeframe (R8.3, UNVERIFIED). Read the three cards with a person who keeps guinea pigs.
- In the PR: screenshots of a card with each urgency tag and of the footer line.

When done, open a pull request against `main` titled `F2-03: Vet clinic UI`.
