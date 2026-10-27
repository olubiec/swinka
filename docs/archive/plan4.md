Wait, if the user requested:
"3. Add a DEBUG-only self-check method `FormPet.ValidateAnimations()` called once after loading that logs any animation with 0 frames, frame index >= sprite count, or `next` ids that do not exist."
Where should we call `FormPet.ValidateAnimations()`? We can call it inside `FormPet`'s constructor, or maybe after `animations` is fully populated.
Actually, in `FormPet`'s constructor:
```csharp
        public FormPet(Animations animations, Xml xml)
        {
            InitializeComponent();
            ...
```
Wait, we could just call it at the end of `FormPet` constructor:
```csharp
#if DEBUG
            ValidateAnimations();
#endif
```
Wait, `FormPet` accesses `Program.MyData.Frames.Count` to check `sprite count`.
Is `Program.MyData.Frames` populated at `FormPet` construction time?
Yes, `FormPet` adds sprites:
```csharp
            for (int i = 0; i < Program.MyData.Frames.Count; i++)
            {
                AddImage(Program.MyData.Frames[i]);
            }
```
Wait, in `FormPet.cs`:
```csharp
        public FormPet(Animations animations, Xml xml)
        {
            ...
#if DEBUG
            ValidateAnimations();
#endif
        }
```
Yes!

Wait, `ValidateAnimations()` needs to iterate through `Animations.SheepAnimations` and check:
- `Frames.Count == 0`
- `frame index >= sprite count` (since it's checking `Sequence.Frames` which contains indexes, we check if any index is >= `Program.MyData.Frames.Count`)
- `next` ids that do not exist in `Animations.SheepAnimations`.
Wait! For `next` ids: `EndAnimation`, `EndBorder`, `EndGravity`, and `Sequence.Next`?
No, wait. `next` ids are in `EndAnimation`, `EndBorder`, `EndGravity` lists of `TNextAnimation`. Also `TSpawn` has a `Next` property. Also `TChild` has a `Next` property. Also `TSequence` has `Next`? Wait, sequences don't have `Next`, the `TAnimation` has `EndAnimation` etc.
Let's look at `TAnimation`:
```csharp
        public List<TNextAnimation> EndAnimation;
        public List<TNextAnimation> EndBorder;
        public List<TNextAnimation> EndGravity;
```
For `next` ids, we should check:
```csharp
#if DEBUG
        private void ValidateAnimations()
        {
            int spriteCount = Program.MyData.Frames.Count;
            foreach (var kvp in Animations.SheepAnimations)
            {
                var anim = kvp.Value;
                if (anim.Sequence.Frames.Count == 0)
                {
                    BrainController.Log($"[DEBUG] Validation Error: Animation '{anim.Name}' ({anim.ID}) has 0 frames.");
                }
                foreach (int frameIdx in anim.Sequence.Frames)
                {
                    if (frameIdx >= spriteCount || frameIdx < 0)
                    {
                        BrainController.Log($"[DEBUG] Validation Error: Animation '{anim.Name}' ({anim.ID}) references frame {frameIdx}, but sprite count is {spriteCount}.");
                    }
                }
                Action<List<TNextAnimation>, string> checkNexts = (list, listName) =>
                {
                    foreach (var nextAnim in list)
                    {
                        if (nextAnim.ID != -1 && nextAnim.ID != -2 && !Animations.SheepAnimations.ContainsKey(nextAnim.ID))
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
Wait, if it's called on EVERY `FormPet` creation, it might log multiple times (since multiple pets can be created, e.g. children). The prompt says: "called once after loading".
Where is the loading done?
`StartUp.LoadNewXMLFromString` creates `Animations` and `Xml`.
```csharp
            xml = new Xml(Program.MyData.GetScale());
            animations = new Animations(xml);
            xml.Load(Program.MyData.GetXmlByte());
            animations.Load(xml.GetXmlDocument());
```
Then it calls `AddSheep()`.
So `AddSheep()` creates `FormPet`!
If we put it in `FormPet(Animations animations, Xml xml)` and only call it once?
We can use a `static bool _validated = false;` in `FormPet`.
```csharp
#if DEBUG
        private static bool _animationsValidated = false;
        private void ValidateAnimations()
        {
            if (_animationsValidated) return;
            _animationsValidated = true;
            // ...
```
This perfectly fulfills "called once after loading".

Let's summarize the fixes required:
1. In `NextStep()`: Cache `AnimationStep` to prevent `-1` accesses.
   ```csharp
            int currentStep = Math.Max(0, AnimationStep);
   ```
   Wait, if we use `currentStep`, it MUST be captured AFTER `_brain?.Update();` and `LeaveHome();`. Yes! Right before `if (InteractionManager.Instance == null ...)`:
   ```csharp
            int currentStep = Math.Max(0, AnimationStep);
   ```
   Then replace `AnimationStep` with `currentStep` in these lines:
   - `if (currentStep < CurrentAnimation.Sequence.Frames.Count)`
   - `pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[currentStep]);`
   - `int index = ((currentStep - ...)`
   - `timer1.Interval = ... * currentStep / ...`
   - `Opacity = ... * currentStep / ...`
   - `OffsetY = ... * currentStep / ...`
   - `x += ... * currentStep / ...`
   - `y += ... * currentStep / ...`

   Wait, what about the else branch where `index` is calculated?
   ```csharp
                else
                {
                    int repeatLen = CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom;
                    if (repeatLen <= 0) repeatLen = 1;
                    int index = ((currentStep - CurrentAnimation.Sequence.Frames.Count + CurrentAnimation.Sequence.RepeatFrom) % repeatLen) + CurrentAnimation.Sequence.RepeatFrom;
                    index = Math.Max(0, Math.Min(index, CurrentAnimation.Sequence.Frames.Count - 1));
                    if (CurrentAnimation.Sequence.Frames.Count > 0)
                        pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[index]);
                }
   ```
   Wait, in the original code, it was:
   ```csharp
                    int index = ((AnimationStep - CurrentAnimation.Sequence.Frames.Count + CurrentAnimation.Sequence.RepeatFrom) % (CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom)) + CurrentAnimation.Sequence.RepeatFrom;
                    pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[index]);
   ```
   If we use `Math.Max(1, CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom)`, it avoids modulo by 0.
   ```csharp
                else
                {
                    int repeatLen = Math.Max(1, CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom);
                    int index = ((currentStep - CurrentAnimation.Sequence.Frames.Count + CurrentAnimation.Sequence.RepeatFrom) % repeatLen) + CurrentAnimation.Sequence.RepeatFrom;
                    index = Math.Max(0, Math.Min(index, CurrentAnimation.Sequence.Frames.Count - 1));
                    if (CurrentAnimation.Sequence.Frames.Count > 0)
                        pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[index]);
                }
   ```
   Is there any issue with this? No, it clamps correctly.

2. In `Animations.cs`, `SetNextGeneralAnimation`:
   ```csharp
                int iRandMax = 0;
                foreach (TNextAnimation anim in list)
                {
                    if (anim.only != TNextAnimation.TOnly.NONE && (anim.only & where) == 0) continue;
                    iRandMax += anim.Probability;
                }
                if (iRandMax <= 0) return -1; // when the probability lists are empty return -1 instead of indexing
                iVal = rand.Next(1, iRandMax+1);
   ```
   This prevents `ArgumentOutOfRangeException` from `rand.Next(1, 1)`.

3. Ensure we add `ValidateAnimations()` inside `#if DEBUG` block and call it in `FormPet` constructor.
