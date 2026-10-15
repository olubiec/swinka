using System;
using System.Drawing;
using System.Windows.Forms;

namespace Cuy
{
    /// <summary>
    /// First start of a new game: the pig stands on the taskbar hidden behind the left screen edge and shows
    /// only its nose. When the cursor comes close it hides; when left alone for a while it shows more of its head
    /// and finally walks out and lives as usual. A few seconds later Home opens for naming and the tutorial.
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

        // Phases
        private const int Setup = 0, Peek = 1, Retreat = 2, PeekMore = 3, WalkOut = 4;

        private double _calmMs;      // how long the cursor has stayed away from the pig
        private double _totalMs;

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
            double noseX = wa.Left - w * 0.72;    // only the nose sticks out
            double headX = wa.Left - w * 0.5;     // half of the head
            double outX = wa.Left + 90;           // fully out on the taskbar

            _phaseMs += TickMs;
            _totalMs += TickMs;

            // Is the cursor close to the corner where the pig hides?
            Point c = Cursor.Position;
            double dx = c.X - wa.Left;
            double dy = c.Y - (pet.Top + pet.Height / 2.0);
            bool cursorNear = dx < 220 && Math.Abs(dy) < 220;
            _calmMs = cursorNear ? 0 : _calmMs + TickMs;

            // Safety net: never keep her waiting forever.
            bool forceOut = _totalMs > 120000;

            switch (_phase)
            {
                case Setup: // behind the edge, a moment of nothing
                    Animate(pet, "idle");
                    pet.ScriptBegin(hiddenX);
                    if (_phaseMs < 2500) break;
                    Go(Peek, hiddenX);
                    break;

                case Peek: // only the nose, sniffing
                    Animate(pet, "sniff");
                    Slide(pet, noseX, 900);
                    if (cursorNear && !forceOut) { Go(Retreat, pet.PositionX); break; }
                    if (_phaseMs > 900 && (_calmMs > 6000 || forceOut)) Go(PeekMore, pet.PositionX);
                    break;

                case Retreat: // the cursor came close: hides quickly and waits until it is gone
                    Animate(pet, "idle");
                    Slide(pet, hiddenX, 250);
                    if (_phaseMs > 250 && _calmMs > 2500) Go(Peek, pet.PositionX);
                    break;

                case PeekMore: // more of the head, still careful
                    Animate(pet, "sniff");
                    Slide(pet, headX, 1400);
                    if (cursorNear && !forceOut) { Go(Retreat, pet.PositionX); break; }
                    if (_phaseMs > 1400 && (_calmMs > 4000 || forceOut)) Go(WalkOut, pet.PositionX);
                    break;

                case WalkOut: // comes out and from here on lives as usual
                    Animate(pet, "walk");
                    double x = Math.Min(outX, pet.PositionX + 1.6);
                    pet.ScriptMoveTo(x);
                    if (x >= outX) Finish();
                    break;
            }
        }

        private void Go(int phase, double fromX)
        {
            _phase = phase;
            _phaseMs = 0;
            _fromX = fromX;
        }

        /// <summary>Eases from the phase start position to targetX over durationMs.</summary>
        private void Slide(FormPet pet, double targetX, double durationMs)
        {
            double t = Math.Min(1.0, _phaseMs / durationMs);
            double eased = t * t * (3 - 2 * t);
            pet.ScriptMoveTo(_fromX + (targetX - _fromX) * eased);
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
            BrainController.Log("[Intro] First-run intro finished; naming opens in a few seconds.");

            // Let her watch the pig wander for a moment before Home opens for naming.
            var later = new Timer { Interval = 8000 };
            later.Tick += (s2, e2) =>
            {
                later.Stop();
                later.Dispose();
                try { _onDone?.Invoke(); }
                catch (Exception ex) { BrainController.Log("[ERROR] FirstRunIntro done callback: " + ex.Message); }
            };
            later.Start();
        }
    }
}
