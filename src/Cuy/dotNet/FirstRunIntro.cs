using System;
using System.Drawing;
using System.Windows.Forms;

namespace Cuy
{
    /// <summary>
    /// First start of a new game: the pig is hidden behind the left screen edge, peeks out with its nose,
    /// hides again, peeks a little more, then walks out onto the taskbar and wheeks. After that Home opens
    /// for naming and the short tutorial.
    /// </summary>
    internal sealed class FirstRunIntro
    {
        private const int TickMs = 50;

        private readonly Timer _timer = new Timer { Interval = TickMs };
        private readonly Action _onDone;
        private int _phase;
        private double _phaseMs;
        private double _waitMs;
        private double _fromX;
        private bool _finished;

        private FirstRunIntro(Action onDone)
        {
            _onDone = onDone;
            _timer.Tick += (s, e) => Tick();
        }

        public static void Start(Action onDone)
        {
            var intro = new FirstRunIntro(onDone);
            intro._timer.Start();
            BrainController.Log("[Intro] First-run intro started.");
        }

        private void Tick()
        {
            try
            {
                Step();
            }
            catch (Exception ex)
            {
                BrainController.Log("[ERROR] FirstRunIntro: " + ex.Message);
                Finish();
            }
        }

        private void Step()
        {
            var pet = FormPet.ActivePet;
            var brain = BrainController.Instance;

            // Wait until the desktop pet exists (StartUp creates it about a second after launch).
            if (pet == null || pet.IsDisposed || !pet.Visible || brain == null)
            {
                _waitMs += TickMs;
                if (_waitMs > 20000) Finish();
                return;
            }

            Rectangle wa = Screen.PrimaryScreen.WorkingArea;
            double w = pet.Width;
            // The pig faces right; in the 64 px frame the nose is at about 80 % of the width.
            double hiddenX = wa.Left - w * 0.9;   // completely behind the edge
            double noseX = wa.Left - w * 0.74;    // only the nose shows
            double headX = wa.Left - w * 0.55;    // nose and eyes show
            double outX = wa.Left + 90;           // fully out on the taskbar

            _phaseMs += TickMs;

            switch (_phase)
            {
                case 0: // set up behind the edge
                    brain.ScriptAnimation = "idle";
                    pet.ScriptBegin(hiddenX);
                    pet.PlayAnimationByName("idle");
                    Next(hiddenX);
                    break;

                case 1: // short pause, then the nose slides out
                    if (_phaseMs < 1500) break;
                    Animate(pet, "sniff");
                    if (Slide(pet, noseX, 900, 1500)) break;
                    if (_phaseMs < 1500 + 2500) break;
                    Next(noseX);
                    break;

                case 2: // shy: hides again
                    Animate(pet, "idle");
                    if (Slide(pet, hiddenX, 300, 0)) break;
                    if (_phaseMs < 1600) break;
                    Next(hiddenX);
                    break;

                case 3: // peeks out a bit more and sniffs around
                    Animate(pet, "sniff");
                    if (Slide(pet, headX, 1300, 0)) break;
                    if (_phaseMs < 1300 + 2500) break;
                    Next(headX);
                    break;

                case 4: // walks out confidently (about 30 px per second)
                    Animate(pet, "walk");
                    double x = Math.Min(outX, pet.PositionX + 1.6);
                    pet.ScriptMoveTo(x);
                    if (x >= outX) Next(outX);
                    break;

                case 5: // happy wheek
                    if (_phaseMs <= TickMs)
                    {
                        Animate(pet, "greet");
                        SoundManager.Instance?.PlayWheek("greet");
                    }
                    if (_phaseMs < 1800) break;
                    Finish();
                    break;
            }
        }

        private void Next(double fromX)
        {
            _phase++;
            _phaseMs = 0;
            _fromX = fromX;
        }

        /// <summary>Moves from the phase start position to targetX between startMs and startMs + durationMs. Returns true while moving.</summary>
        private bool Slide(FormPet pet, double targetX, double durationMs, double startMs)
        {
            double t = (_phaseMs - startMs) / durationMs;
            if (t < 0) return true;
            if (t > 1) t = 1;
            double eased = t * t * (3 - 2 * t);
            pet.ScriptMoveTo(_fromX + (targetX - _fromX) * eased);
            return t < 1;
        }

        private static void Animate(FormPet pet, string animation)
        {
            var brain = BrainController.Instance;
            if (brain == null || brain.ScriptAnimation == animation) return;
            brain.ScriptAnimation = animation;
            pet.PlayAnimationByName(animation);
        }

        private void Finish()
        {
            if (_finished) return;
            _finished = true;
            _timer.Stop();
            _timer.Dispose();

            var brain = BrainController.Instance;
            if (brain != null) brain.ScriptAnimation = null;
            var pet = FormPet.ActivePet;
            if (pet != null && !pet.IsDisposed)
            {
                pet.ScriptEnd();
                pet.PlayAnimationByName("idle");
            }
            BrainController.Log("[Intro] First-run intro finished.");

            try { _onDone?.Invoke(); }
            catch (Exception ex) { BrainController.Log("[ERROR] FirstRunIntro done callback: " + ex.Message); }
        }
    }
}
