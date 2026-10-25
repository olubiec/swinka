# Task F4-02: Birthday party on the desktop (cake, party animation, present, diary line)

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
`Pet.Birthday` fires (see `Pet.CheckBirthdays`, every pig year = about 17.4 real days; after a long offline period it
fires once per missed birthday). Nothing reacts to it on the desktop. Make a birthday a small event.

## Files you may change
`src/Cuy.Core/Pet.cs` (only the Birthday handling), new `src/Cuy.Core/Pet.Birthday.cs`,
`tests/Cuy.Core.Tests/BirthdayTests.cs`, `src/Cuy/dotNet/BrainController.cs`, `assets/data/actions.json` (`events.birthday`
already holds `animation: party` and `reward_clovers: 100`; read it, do not duplicate numbers in code).

## Specification
1. Core: on Birthday, `Pet.Birthday.cs` grants `reward_clovers` through the economy path (`AddClovers`; if F1-06's
   `Pet.AwardX` helper exists use it), adds one cake item (`AddItem("cake")`), and adds a diary line through
   `AddDiaryEntry` ("Happy birthday to me! I am N year(s) old today." - N = pig years). Missed birthdays after a long
   offline time: grant everything once per missed birthday but at most 3 in total, and show one cake.
2. Tests: single birthday; three missed birthdays capped at 3; clovers and cake correct; diary text correct; no double
   grant after a save/load round trip (`BirthdaysCelebrated` already persists).
3. Desktop: `BrainController` subscribes to `Pet.Birthday`; when the pig is on the desktop it plays `party`
   (`RequestAnimation("party")`), plays the pop sound through `SoundManager.PlayPopcorn()`, and shows a speech bubble
   "Happy birthday!" using the existing `StatusBubble`. If Home is open, only the state refresh happens.
4. Cake: the `cake` item already exists in the catalog (`party` animation). Feeding it from the Feed menu must make the
   pig play `party` (check `HandleFeed` in `HomeWindow.cs` reads the animation from `items.json`; if not, fix minimally).

## Checks
- `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes; build of `Cuy.csproj` passes.

When done, open a pull request against `main` titled `F4-02: Birthday event`.
