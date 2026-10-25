# Task F2-10: Find and fix the "Index out of range" frame error of the desktop pet

Read `AGENTS.md` first and follow it.

## Bug
`cuy.log` regularly shows `[FormPet] Error in Timer1_Tick: Index was out of range. Must be non-negative and less than the
size of the collection` (Polish Windows: "Indeks był spoza zakresu..."). It happened right after Home was closed
(`LeaveHome`), right after the first-run scene started, and every few minutes. The message is the one thrown by
`List<T>`'s indexer (`ArgumentOutOfRangeException`), not by arrays or ImageList. Since a recent fix the timer recovers
and the full stack trace is logged for the first 5 errors, but the cause is still there.

## Files you may change
`src/Cuy/dotNet/FormPet.cs`, `src/Cuy/dotNet/FormPet.Motion.cs`, `src/Cuy/dotNet/Animations.cs`, `src/Cuy/dotNet/Xml.cs`.

## Steps
1. Read `NextStep()` and everything it calls, listing every `List<T>` index access: `Sequence.Frames[...]`,
   `Animations` next/border/gravity lists (`SetNextSequenceAnimation`, `SetNextBorderAnimation`,
   `SetNextGravityAnimation` and the random choice among `TNextAnimation` entries), spawn lists, child lists, window
   lists in `FallDetect`, `flippedSprites` (dictionary – fine) etc. For each, write down when the index can be invalid.
   Known facts that matter: `AnimationStep` is set to -1 by `SetNewAnimation` and clamped to 0 at the start of the tick;
   animations added by `tools/add_sprite_animations.py` have `repeat="0"`, no `<border>` element and only one `<next>`;
   some code paths change `CurrentAnimation` in the middle of `NextStep` (Brain requests via `PlayAnimationByName`,
   `EnterHome/LeaveHome`, scripted scenes) – after such a change the old `AnimationStep` may exceed the new frame count.
2. Fix every unsafe access with a clear rule (e.g. clamp the frame index into the frame list; when the probability
   lists are empty return -1 instead of indexing; after `SetNewAnimation` inside `NextStep` stop using the previous
   animation's step). Do not change the timing/behaviour of normal animations.
3. Add a DEBUG-only self-check method `FormPet.ValidateAnimations()` called once after loading that logs any animation
   with 0 frames, frame index >= sprite count, or `next` ids that do not exist.

## Checks
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`. In the PR: the list from step 1 with the
verdict for each access, and which one(s) explained the logged error.

When done, open a pull request against `main` titled `F2-10: Fix the pet frame index error`.
