The reviewer is completely right! `Program.MyData.Frames.Count` does not exist. `imageList1.Images.Count` is what I need.
So in `ValidateAnimations()`:
```csharp
#if DEBUG
        private static bool _animationsValidated = false;
        private void ValidateAnimations()
        {
            if (_animationsValidated) return;
            _animationsValidated = true;

            int spriteCount = imageList1?.Images?.Count ?? 0;
            if (Animations?.SheepAnimations == null) return;

            foreach (var kvp in Animations.SheepAnimations)
            {
                var anim = kvp.Value;
                if (anim.Sequence.Frames.Count == 0)
                {
                    BrainController.Log($"[DEBUG] Validation Error: Animation '{anim.Name}' ({anim.ID}) has 0 frames.");
                }
                else
                {
                    foreach (int frameIdx in anim.Sequence.Frames)
                    {
                        if (frameIdx >= spriteCount || frameIdx < 0)
                        {
                            BrainController.Log($"[DEBUG] Validation Error: Animation '{anim.Name}' ({anim.ID}) references frame {frameIdx}, but sprite count is {spriteCount}.");
                        }
                    }
                }

                Action<List<TNextAnimation>, string> checkNexts = (list, listName) =>
                {
                    if (list == null) return;
                    foreach (var nextAnim in list)
                    {
                        if (nextAnim.ID > 0 && !Animations.SheepAnimations.ContainsKey(nextAnim.ID))
                        {
                            BrainController.Log($"[DEBUG] Validation Error: Animation '{anim.Name}' ({anim.ID}) has {listName} pointing to non-existent ID {nextAnim.ID}.");
                        }
                    }
                };

                checkNexts(anim.EndAnimation, "EndAnimation");
                checkNexts(anim.EndBorder, "EndBorder");
                checkNexts(anim.EndGravity, "EndGravity");
            }
        }
#endif
```
Wait! `ValidateAnimations()` is called in the `FormPet` constructor:
```csharp
#if DEBUG
            ValidateAnimations();
#endif
```
BUT wait! At the end of `FormPet` constructor, `imageList1.Images` is EMPTY!
The `FormPet` is constructed, and THEN `StartUp.cs` adds images:
```csharp
                    newSheep.AddImage(sprite);
```
So `imageList1.Images.Count` will be 0 when `FormPet`'s constructor finishes.
Ah!
When is `imageList1` completely populated?
Maybe I can hook it into `OnHandleCreated`? Or the FIRST `Timer1_Tick`? Or we can call `ValidateAnimations()` when the first frame is set?
If I use a `_animationsValidated` guard, I can just call it in `NextStep` on the first tick!
```csharp
        private void NextStep()
        {
#if DEBUG
            ValidateAnimations();
#endif
```
Because by the time `NextStep()` runs, `imageList1` MUST be populated.
Or better, I can expose a `public void ValidateAnimations()` and let `StartUp.cs` call it after adding images. But the prompt specifically asks to add a method:
"Add a DEBUG-only self-check method `FormPet.ValidateAnimations()` called once after loading"
I'll just add it to `FormPet` and call it from the first `NextStep()`. Or I can check `StartUp.cs` and see if there's an `OnLoad` or something. I'll just call it from `NextStep()`.

The plan steps:
1. **Fix `NextStep()` unsafe list access:** Replace `AnimationStep` reads with `currentStep = Math.Max(0, AnimationStep)`.
2. **Fix Probability List Error:** Add `if (iRandMax <= 0) return -1;` to `SetNextGeneralAnimation`.
3. **Run Core Tests:** Run `export DOTNET_ROLL_FORWARD=Major; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` to ensure no regressions.
4. **Add Validation Method:** Add `ValidateAnimations()` using `imageList1.Images.Count`, and call it at the start of `NextStep()` guarded by a `static bool`.
5. **Complete pre-commit steps:** Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit:** Submit PR.
