# Task F6-06: Companion guinea pig - Core model

Read `AGENTS.md` first and follow it. Requires F4-05 (bond unlocks) merged.

## Goal
A second guinea pig can be adopted (level-10 bond, at least one birthday). Art exists:
`assets/sprites/companion_black_white`, `companion_agouti`, `companion_cream`. This task is the logic only.

## Files you may change
New: `src/Cuy.Core/Companion/CompanionState.cs`, `src/Cuy.Core/GameState.Companion.cs` (property `Companion`, null by default),
`src/Cuy.Core/Pet.Companion.cs`, `assets/data/companion.json`, `tests/Cuy.Core.Tests/CompanionTests.cs`;
`src/Cuy/dotNet/HomeWindow.cs` (state + message `companion_adopt { name, coat }`).

## Specification
1. `CompanionState { Name, Coat ("black_white"|"agouti"|"cream"), AdoptedUtc, Needs, Together (bool, set by the desktop) }`.
2. `Pet.CanAdoptCompanion()` = bond unlock `companion` AND `BirthdaysCelebrated >= 1` AND no companion yet;
   `Pet.TryAdoptCompanion(name, coat)` validates the name (1-16 characters, trimmed) and coat and creates the state.
   Adoption is free (a gift, not a purchase); one companion only. Name validation: same rules as the pig name.
3. Needs: the companion has its own fullness/energy/mood/vitamin C/teeth (cleanliness is shared). It decays at 0.8x the
   main rate. Care shared: feeding/petting the main pig also applies 70 % of the effect to the companion; the hay rack
   feeds both. Mood of BOTH decays 30 % slower while `Together` is true (numbers in `companion.json`).
4. The companion never poops (cleanliness counts one pig). The companion cannot get ill in this task (the health system
   of F1-08 stays single-pig; add a comment).
5. Save: old saves load with `Companion == null`. Tests: adoption rules, name validation, shared care, together bonus,
   offline catch-up applies to both, save/load round trip.
6. State key `companion` (contract): `{ "canAdopt": true, "reason": "Reach bond level 10", "pig": { "name": "Oreo", "coat": "cream", "needs": {..}, "together": true } | null }`.

## Checks
`dotnet test ... -c Release`; Cuy.csproj builds.

When done, open a pull request against `main` titled `F6-06: Companion core`.
