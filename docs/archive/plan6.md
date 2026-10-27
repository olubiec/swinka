Okay, `ValidateAnimations()` only needs to be executed once per session (meaning once per loaded animation set). I can add it to `FormPet(Animations, Xml)` and put a static guard.
```csharp
#if DEBUG
        private static bool _animationsValidated = false;
        private void ValidateAnimations()
        {
            if (_animationsValidated) return;
            _animationsValidated = true;

            int spriteCount = Program.MyData?.Frames?.Count ?? 0;
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
And add `#if DEBUG \n ValidateAnimations(); \n #endif` at the end of the `FormPet(Animations animations, Xml xml)` constructor. Wait, wait. `Program.MyData` doesn't load frames until AFTER XML is loaded... But actually `FormPet` is instantiated AFTER frames are loaded because it's part of the normal start sequence:
In `AddSheep`: `FormPet p = new FormPet(...)`. And then `for(int i=0; i<Program.MyData.Frames.Count; i++) { p.AddImage(...) }`. So `Program.MyData.Frames` is populated by then.

Let's review the fixes again for `NextStep()`.
```csharp
<<<<<<< SEARCH
            if (_brain == null) _brain = BrainController.Instance;
            _brain?.Update();

            if (InteractionManager.Instance == null || InteractionManager.Instance.LookState != LookAtUserState.TrackingCursor)
            {
                // If there is no repeat, we don't need to calculate the frame index.
                if (AnimationStep < CurrentAnimation.Sequence.Frames.Count)
                {
                    pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[AnimationStep]);
                }
                else
                {
                    int index = ((AnimationStep - CurrentAnimation.Sequence.Frames.Count + CurrentAnimation.Sequence.RepeatFrom) % (CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom)) + CurrentAnimation.Sequence.RepeatFrom;
                    pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[index]);
                }
            }

                // Get interval (if not in tossing mode), opacity and offset interpolated from START and END values.
            if(!IsTossing)
                timer1.Interval = CurrentAnimation.Start.Interval.Value + ((CurrentAnimation.End.Interval.Value - CurrentAnimation.Start.Interval.Value) * AnimationStep / CurrentAnimation.Sequence.TotalSteps);
            int movementDuration = timer1.Interval;
            if (_forcedVisibleAnimId != CurrentAnimation.ID)
            {
                Opacity = CurrentAnimation.Start.Opacity + (CurrentAnimation.End.Opacity - CurrentAnimation.Start.Opacity) * AnimationStep / CurrentAnimation.Sequence.TotalSteps;
            }
            EnsurePetVisible();
			OffsetY = CurrentAnimation.Start.OffsetY + (double)((CurrentAnimation.End.OffsetY - CurrentAnimation.Start.OffsetY) * AnimationStep / CurrentAnimation.Sequence.TotalSteps);

                // If dragging is enabled, move the pet to the mouse position.
            if (IsDragging)
            {
                // Position follows mouse messages and the independent render timer.
                return;
            }

            // Physics runs on the independent motion clock, not sprite frames.
            if (IsTossing) return;

            double x = CurrentAnimation.Start.X.Value;
            double y = CurrentAnimation.Start.Y.Value;
            // if TotalSteps is more than 1, we have to interpolate START and END values)
            if (CurrentAnimation.Sequence.TotalSteps > 1)
            {
                x += ((CurrentAnimation.End.X.Value - CurrentAnimation.Start.X.Value) * (double)AnimationStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
                y += ((CurrentAnimation.End.Y.Value - CurrentAnimation.Start.Y.Value) * (double)AnimationStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
            }
=======
            if (_brain == null) _brain = BrainController.Instance;
            _brain?.Update();

            int currentStep = Math.Max(0, AnimationStep);

            if (InteractionManager.Instance == null || InteractionManager.Instance.LookState != LookAtUserState.TrackingCursor)
            {
                // If there is no repeat, we don't need to calculate the frame index.
                if (currentStep < CurrentAnimation.Sequence.Frames.Count)
                {
                    pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[currentStep]);
                }
                else
                {
                    int repeatLen = Math.Max(1, CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom);
                    int index = ((currentStep - CurrentAnimation.Sequence.Frames.Count + CurrentAnimation.Sequence.RepeatFrom) % repeatLen) + CurrentAnimation.Sequence.RepeatFrom;
                    index = Math.Max(0, Math.Min(index, CurrentAnimation.Sequence.Frames.Count - 1));
                    if (CurrentAnimation.Sequence.Frames.Count > 0)
                    {
                        pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[index]);
                    }
                }
            }

                // Get interval (if not in tossing mode), opacity and offset interpolated from START and END values.
            if(!IsTossing)
                timer1.Interval = CurrentAnimation.Start.Interval.Value + ((CurrentAnimation.End.Interval.Value - CurrentAnimation.Start.Interval.Value) * currentStep / CurrentAnimation.Sequence.TotalSteps);
            int movementDuration = timer1.Interval;
            if (_forcedVisibleAnimId != CurrentAnimation.ID)
            {
                Opacity = CurrentAnimation.Start.Opacity + (CurrentAnimation.End.Opacity - CurrentAnimation.Start.Opacity) * currentStep / CurrentAnimation.Sequence.TotalSteps;
            }
            EnsurePetVisible();
			OffsetY = CurrentAnimation.Start.OffsetY + (double)((CurrentAnimation.End.OffsetY - CurrentAnimation.Start.OffsetY) * currentStep / CurrentAnimation.Sequence.TotalSteps);

                // If dragging is enabled, move the pet to the mouse position.
            if (IsDragging)
            {
                // Position follows mouse messages and the independent render timer.
                return;
            }

            // Physics runs on the independent motion clock, not sprite frames.
            if (IsTossing) return;

            double x = CurrentAnimation.Start.X.Value;
            double y = CurrentAnimation.Start.Y.Value;
            // if TotalSteps is more than 1, we have to interpolate START and END values)
            if (CurrentAnimation.Sequence.TotalSteps > 1)
            {
                x += ((CurrentAnimation.End.X.Value - CurrentAnimation.Start.X.Value) * (double)currentStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
                y += ((CurrentAnimation.End.Y.Value - CurrentAnimation.Start.Y.Value) * (double)currentStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
            }
>>>>>>> REPLACE
```
This perfectly matches the instructions.

Wait, the prompt says "when the probability lists are empty return -1 instead of indexing".
```csharp
<<<<<<< SEARCH
                int iRandMax = 0;
                foreach (TNextAnimation anim in list)
                {
                    if (anim.only != TNextAnimation.TOnly.NONE && (anim.only & where) == 0) continue;

                    iRandMax += anim.Probability;
                }
                iVal = rand.Next(1, iRandMax+1);
=======
                int iRandMax = 0;
                foreach (TNextAnimation anim in list)
                {
                    if (anim.only != TNextAnimation.TOnly.NONE && (anim.only & where) == 0) continue;

                    iRandMax += anim.Probability;
                }

                if (iRandMax <= 0) return -1;

                iVal = rand.Next(1, iRandMax+1);
>>>>>>> REPLACE
```
In `Animations.cs`.
Is there anywhere else that calls `rand.Next` on a probability list?
Let's check `Animations.cs` for other occurrences:
```csharp
        public TSpawn GetNextSpawn(int forceSpawn = -1)
        {
            ...
            int percent = 0;
            foreach (TSpawn spawn in SheepSpawn.Values)
            {
                percent += spawn.Probability;
            }
                // Get random number
            randValue = rand.Next(0, percent);
```
Wait! If `percent` is 0, `rand.Next(0, 0)` throws `ArgumentOutOfRangeException`!
Is `SheepSpawn` empty? It's possible if the XML defines no spawns. The user said: "when the probability lists are empty return -1 instead of indexing".
Wait, `GetNextSpawn` returns a `TSpawn`, not an `int`. But wait, in `GetNextSpawn`:
```csharp
        public TSpawn GetNextSpawn(int forceSpawn = -1)
        {
            if (SheepSpawn.Count == 0)
            {
                // Returns a default spawn if no spawn is available
                TSpawn retSpawn = new TSpawn("NULL");
                ...
                return retSpawn;
            }
```
If `Count > 0` but `percent` is 0 (all probabilities are 0)?
```csharp
            if (percent <= 0) return SheepSpawn.Values.First(); // Fallback?
```
The prompt specifically says "when the probability lists are empty return -1 instead of indexing". This most likely refers to the `SetNextGeneralAnimation` function which returns an `int` (the ID of the next animation), and a return value of `-1` triggers a respawn.

Let's check `SetNextGeneralAnimation` again:
```csharp
        private int SetNextGeneralAnimation(List<TNextAnimation> list, TNextAnimation.TOnly where)
        {
            int iDefaultID = -1;
            if (list.Count > 0)     // Find the next animation only if there is at least 1 animation in the list
            {
```
If `list.Count == 0`, it goes to `else` which returns `-1`.
But if `list.Count > 0` and all `anim.Probability` are 0, or all fail the `only` check, `iRandMax` is 0.
Then `rand.Next(1, 0+1)` -> `rand.Next(1, 1)` -> throws.
Returning `-1` in this case makes perfect sense!

Let's create the plan and execute it.
