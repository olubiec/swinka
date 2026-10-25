Wait, if `AnimationStep` is used later in `NextStep()`:
```csharp
            if(!IsTossing)
                timer1.Interval = CurrentAnimation.Start.Interval.Value + ((CurrentAnimation.End.Interval.Value - CurrentAnimation.Start.Interval.Value) * AnimationStep / CurrentAnimation.Sequence.TotalSteps);
            int movementDuration = timer1.Interval;
            if (_forcedVisibleAnimId != CurrentAnimation.ID)
            {
                Opacity = CurrentAnimation.Start.Opacity + (CurrentAnimation.End.Opacity - CurrentAnimation.Start.Opacity) * AnimationStep / CurrentAnimation.Sequence.TotalSteps;
            }
            EnsurePetVisible();
			OffsetY = CurrentAnimation.Start.OffsetY + (double)((CurrentAnimation.End.OffsetY - CurrentAnimation.Start.OffsetY) * AnimationStep / CurrentAnimation.Sequence.TotalSteps);

            // ...
            if (CurrentAnimation.Sequence.TotalSteps > 1)
            {
                x += ((CurrentAnimation.End.X.Value - CurrentAnimation.Start.X.Value) * (double)AnimationStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
                y += ((CurrentAnimation.End.Y.Value - CurrentAnimation.Start.Y.Value) * (double)AnimationStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
            }
```
If `AnimationStep` is `-1`, then `AnimationStep / TotalSteps` will be negative. This alters the timing/position.
So we should cache `int currentStep = Math.Max(0, AnimationStep);` and use `currentStep` instead of `AnimationStep` throughout `NextStep()`?
"after SetNewAnimation inside NextStep stop using the previous animation's step. Do not change the timing/behaviour of normal animations."
If we replace `AnimationStep` with `currentStep = Math.Max(0, AnimationStep)` throughout `NextStep()`, we will use `0` instead of `-1` for all interpolations, which is correct for the first frame!
Wait, but if `SetNewAnimation` is called in the *middle* of `NextStep` (e.g. from `CheckFullScreen` or border detection), it sets `AnimationStep = -1`. But wait, border detection happens AFTER the interpolation and frame setting!
```csharp
            if (PositionX + x < ScreenArea.X)    // left screen border!
            {
                int iBorderAnimation = Animations.SetNextBorderAnimation(CurrentAnimation.ID, TNextAnimation.TOnly.VERTICAL);
                if (iBorderAnimation >= 0)
                {
                    ...
                    SetNewAnimation(iBorderAnimation);
                    bNewAnimation = true;
                }
            }
```
If `bNewAnimation` is true, we have this at the end of `NextStep`:
```csharp
            if(bNewAnimation)
            {
                timer1.Interval = 1;    // execute immediately the first step of the next animation.
                pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[0]);
            }
```
This already properly handles `bNewAnimation = true`.
So we don't need to recalculate interpolation if `bNewAnimation` becomes true at the end. We just need to ensure that the initial frame rendering and interpolation don't use `-1`.
Let's replace all `AnimationStep` reads inside `NextStep()` with `currentStep`, where `int currentStep = Math.Max(0, AnimationStep);` at the top of `NextStep()`.
Wait, NO!
If `EnterHome()` or `_brain?.Update()` sets `AnimationStep` to `-1`, it also changes `CurrentAnimation`. If we captured `currentStep = Math.Max(0, AnimationStep)` BEFORE `_brain?.Update()`, we would capture `currentStep = 5`. Then `_brain?.Update()` changes `CurrentAnimation` and sets `AnimationStep = -1`. But we would still use `currentStep = 5` for the new `CurrentAnimation`!
Ah!! "after such a change the old AnimationStep may exceed the new frame count."
If we cache `currentStep` BEFORE `_brain?.Update()`, we use 5 on the new animation.
So we MUST cache `currentStep = Math.Max(0, AnimationStep)` AFTER `_brain?.Update()`!
```csharp
            if (_brain == null) _brain = BrainController.Instance;
            _brain?.Update();

            int currentStep = Math.Max(0, AnimationStep);
```
Yes! If `_brain?.Update()` changed the animation, `AnimationStep` is now `-1`, so `currentStep` becomes `0`. We correctly use `0` for the NEW animation.
If it didn't change it, `AnimationStep` is still 5, so `currentStep` is 5.
Wait, what if `LeaveHome` was called earlier?
```csharp
            else if (!HomeWindow.IsOpen && _inHome && !Visible)
            {
                var wa = Screen.PrimaryScreen.WorkingArea;
                LeaveHome(new Point(wa.Left + wa.Width / 2, wa.Bottom));
                BrainController.Log("[Home] Bug corrected: forced pig out of Home.");
            }
```
It also sets `AnimationStep = -1`. If we cache `currentStep` after all of these, it will be 0.
So we should define `int currentStep = Math.Max(0, AnimationStep);` right before the `InteractionManager` block:

```csharp
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
                    int repeatLen = CurrentAnimation.Sequence.Frames.Count - CurrentAnimation.Sequence.RepeatFrom;
                    if (repeatLen <= 0) repeatLen = 1;
                    int index = ((currentStep - CurrentAnimation.Sequence.Frames.Count + CurrentAnimation.Sequence.RepeatFrom) % repeatLen) + CurrentAnimation.Sequence.RepeatFrom;

                    // Clamp the index to the valid range to prevent ArgumentOutOfRangeException
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

            // ... further down
            if (CurrentAnimation.Sequence.TotalSteps > 1)
            {
                x += ((CurrentAnimation.End.X.Value - CurrentAnimation.Start.X.Value) * (double)currentStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
                y += ((CurrentAnimation.End.Y.Value - CurrentAnimation.Start.Y.Value) * (double)currentStep / (CurrentAnimation.Sequence.TotalSteps - 1.0));
            }
```

Wait, what about later uses of `AnimationStep`?
```csharp
            if (AnimationStep >= CurrentAnimation.Sequence.TotalSteps) // animation over
```
Wait, if `AnimationStep` was `-1`, `currentStep` is 0. If `TotalSteps` is 1, `currentStep >= 1` is false.
But wait! If we replace `AnimationStep` with `currentStep` there:
```csharp
            if (currentStep >= CurrentAnimation.Sequence.TotalSteps) // animation over
```
This seems fine. But wait, `AnimationStep` is what gets incremented by the Timer tick.
If `AnimationStep` was `-1` because `SetNewAnimation` was called, it will NOT enter `if (AnimationStep >= TotalSteps)`. If we use `currentStep`, it will be 0, which is also `< TotalSteps`. So it's fine.

Are there any other places in `NextStep()` that use `AnimationStep`?
```csharp
                    else
                    {
                        Left -= Width;
                        pictureBox1.Left = Width + 1;
                        AnimationStep += CurrentAnimation.Sequence.Frames.Count / 3;
                    }
```
and
```csharp
                    else
                    {
                        Left += Width;
                        pictureBox1.Left = Width + 1;
                        AnimationStep += CurrentAnimation.Sequence.Frames.Count / 3;
                    }
```
and
```csharp
                    else
                    {
                        Top -= Height;
                        pictureBox1.Top = Height + 1;
                        AnimationStep += CurrentAnimation.Sequence.Frames.Count / 3;
                    }
```
If we modify `AnimationStep`, we shouldn't replace it with `currentStep` there, we should modify the actual `AnimationStep` field. The prompt says "after SetNewAnimation inside NextStep stop using the previous animation's step. Do not change the timing/behaviour of normal animations."
So just caching it for read operations makes sense.

Let's check `Animations.cs` for the probability list empty issue:
```csharp
        private int SetNextGeneralAnimation(List<TNextAnimation> list, TNextAnimation.TOnly where)
        {
            int iDefaultID = -1;
            if (list.Count > 0)     // Find the next animation only if there is at least 1 animation in the list
            {
                int iVal;
                int iSum = 0;
                int iRandMax = 0;
                foreach (TNextAnimation anim in list)
                {
                    if (anim.only != TNextAnimation.TOnly.NONE && (anim.only & where) == 0) continue;

                    iRandMax += anim.Probability;
                }

                if (iRandMax <= 0) return -1; // ADD THIS CHECK to prevent ArgumentOutOfRangeException in rand.Next

                iVal = rand.Next(1, iRandMax+1);
```

Let's check the third task step:
"3. Add a DEBUG-only self-check method `FormPet.ValidateAnimations()` called once after loading that logs any animation with 0 frames, frame index >= sprite count, or `next` ids that do not exist."
Wait, "called once after loading". Where is the loading done?
`FormPet.cs` constructor or `OnHandleCreated`?
Let's see `FormPet` constructor:
```csharp
        public FormPet(Animations animations, Xml xml, Point location, bool movingLeft = true, int displayIndex = 0)
        {
            InitializeComponent();
            ...
```
Or maybe after `Program.MyData` sets up frames?
Let's check `FormPet` constructor to see if frames are loaded.
