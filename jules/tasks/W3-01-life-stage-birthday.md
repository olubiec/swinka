# Task W3-01: Desktop pig: life-stage look and birthday event

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: wave 2 merged (W2-01 touches `BrainController.cs` and `SelfTest.cs` too: start from the merged main).
Replaces old task(s): F4-01 + F4-02. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

Both parts live in the desktop code and share `BrainController.cs`; one PR avoids a conflict.

## Part A: life-stage sprites (from F4-01)

### Goal
`Pet.StageChanged` already fires (Baby, Junior, Adult, Senior, Legend) and the art for every stage exists in
`assets/sprites/<baby|junior|adult|senior|legend>/spritesheet.png` (+ `animations.json`, same 16x60 grid of 64 px frames
and the same animation rows in every folder; `junior` exists since the art pass of 26.10.2026: body 0.9 / head 0.94 of adult, between baby and adult). The
desktop pig, however, always uses the single sheet embedded in `Resources/animations.xml`. Make it switch.

### Files you may change
`src/Cuy/dotNet/Xml.cs`, `src/Cuy/dotNet/StartUp.cs`, `src/Cuy/dotNet/BrainController.cs`, `src/Cuy/dotNet/SelfTest.cs`;
new: `src/Cuy/dotNet/SpriteSheetLoader.cs`.

### Specification
1. `SpriteSheetLoader.Load(string stageKey)` returns the list of 64x64 frame bitmaps cut from
   `assets/sprites/<stageKey>/spritesheet.png` (path relative to the exe folder, the folder `assets/` is shipped next to
   `Cuy.exe`; if the file is missing return null and log `[Stage] sheet missing`). Order: frame index = row * 16 + column,
   the same order the embedded sheet uses (verify: slicing `baby` must be pixel-identical to the first frames of the
   embedded sprites; add this as a check in `SelfTest.cs`).
2. After `Xml.ReadXML()`, replace `xml.sprites` with the loaded frames for the pig's current stage
   (`LifeStages.DataKey(pet.Stage)`), applying the same scale step `Xml.cs` already applies to embedded sprites. Keep the
   animation definitions from the XML untouched.
3. On `StageChanged`: rebuild the sprite list and hot-swap it in the running `FormPet` (keep position, facing and the
   current animation; no restart, no flicker). Log `[Stage] Adult -> Senior, sheet reloaded`.
4. A new game starts as Baby; an existing save starts with the stage stored in the save.
5. The status bubble, poop and food offsets already use `petForm.Width/Height`; do not touch them.

### Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes; `node --check` not needed.
- PR section "Windows check for the human": `Cuy.exe --clock 1440` (or the existing time-multiplier flag) shows the
  pig growing through the stages without restarting.

## Part B: birthday event (from F4-02)

### Goal
`Pet.Birthday` fires (see `Pet.CheckBirthdays`, every pig year = about 17.4 real days; after a long offline period it
fires once per missed birthday). Nothing reacts to it on the desktop. Make a birthday a small event.

### Files you may change
`src/Cuy.Core/Pet.cs` (only the Birthday handling), new `src/Cuy.Core/Pet.Birthday.cs`,
`tests/Cuy.Core.Tests/BirthdayTests.cs`, `src/Cuy/dotNet/BrainController.cs`, `assets/data/actions.json` (`events.birthday`
already holds `animation: party` and `reward_clovers: 100`; read it, do not duplicate numbers in code).

### Specification
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

### Checks
- `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes; build of `Cuy.csproj` passes.

When done, open a pull request against `main` titled `W3-01: Life stages and birthday on the desktop`.
