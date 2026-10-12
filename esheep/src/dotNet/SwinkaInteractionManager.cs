using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace DesktopPet
{
    public enum LookAtUserState
    {
        None,
        TurningToFront,
        TrackingCursor,
        TurningToSide
    }

    public enum CallPetState
    {
        None,
        ComeCalled,
        RunningToTarget,
        Greeting
    }

    /// <summary>
    /// Menedżer interakcji świnki z kursorem (Zadanie I1):
    /// 1. Głaskanie (Pocket-Bird): 3 zwroty kursora w 1,5s -> purr_pet + serduszka, humor +5, więź +1 (max 10/h).
    ///    Głaskanie śpiącej świnki budzi ją i obniża humor o 2.
    /// 2. Patrzenie na ciebie: kursor nieruchomo 1-3s w 250px -> turn, front_idle i śledzenie klatkami front_look.
    ///    Po 5s lub oddaleniu powrót bokiem. Cooldown 2 minuty.
    /// 3. Zawołaj: come_called, bieg do miejsca pod kursorem na pasku/oknie, greet (kwiknięcie i podskok).
    /// 4. Powitanie po starcie: greet jeśli więź >= 3, inaczej sniff.
    /// 5. Ponad 8 kliknięć w 3s -> chatter i 30s obrażenia (nie przychodzi na zawołanie).
    /// </summary>
    public sealed class SwinkaInteractionManager
    {
        private readonly FormPet _petForm;

        // Głaskanie
        private readonly List<DateTime> _reversalTimes = new List<DateTime>();
        private readonly List<DateTime> _rewardedPettingTimes = new List<DateTime>();
        private int _lastPetX = -1;
        private int _lastPetDir = 0;

        // Patrzenie na ciebie
        private LookAtUserState _lookState = LookAtUserState.None;
        private DateTime _lastLookAtUserTime = DateTime.MinValue;
        private Point _lastStationaryPos = Point.Empty;
        private double _stationarySeconds = 0.0;
        private double _lookStateTimer = 0.0;
        private double _trackingTotalSeconds = 0.0;

        // Zawołaj
        private CallPetState _callState = CallPetState.None;
        private int _callTargetX = 0;
        private double _callTimer = 0.0;

        // Irytacja (za dużo kliknięć)
        private readonly List<DateTime> _clickTimes = new List<DateTime>();
        private DateTime _offendedUntil = DateTime.MinValue;

        // Powitanie startowe
        private bool _hasGreetedOnStartup = false;

        public SwinkaInteractionManager(FormPet petForm)
        {
            _petForm = petForm ?? throw new ArgumentNullException(nameof(petForm));
        }

        public static SwinkaInteractionManager Instance { get; private set; }

        public static void Initialize(FormPet petForm)
        {
            Instance = new SwinkaInteractionManager(petForm);
        }

        public bool IsOffended => DateTime.UtcNow < _offendedUntil;

        public double OffendedRemainingSeconds => IsOffended ? (_offendedUntil - DateTime.UtcNow).TotalSeconds : 0.0;

        public LookAtUserState LookState => _lookState;

        public CallPetState CallState => _callState;

        public bool IsActiveInteraction => _lookState != LookAtUserState.None || _callState != CallPetState.None;

        public IReadOnlyList<DateTime> RewardedPettingTimes => _rewardedPettingTimes;

        // ---- Głaskanie --------------------------------------------------------

        public void OnMouseMove(Point screenPos)
        {
            if (_petForm == null || _petForm.IsDisposed) return;
            if (_petForm.IsDragging || _petForm.IsTossing) return;

            Rectangle petBounds = _petForm.Bounds;
            if (petBounds.Contains(screenPos))
            {
                DateTime now = DateTime.UtcNow;
                int curX = screenPos.X;

                if (_lastPetX >= 0)
                {
                    int dx = curX - _lastPetX;
                    if (Math.Abs(dx) >= 6) // Próg przesunięcia, aby odsiać mikro-drgania myszy
                    {
                        int dir = Math.Sign(dx);
                        if (_lastPetDir != 0 && dir != _lastPetDir)
                        {
                            _reversalTimes.Add(now);
                            _lastPetDir = dir;
                        }
                        else if (_lastPetDir == 0)
                        {
                            _lastPetDir = dir;
                        }
                        _lastPetX = curX;
                    }
                }
                else
                {
                    _lastPetX = curX;
                }

                // Sprawdzamy okno 1,5 s
                _reversalTimes.RemoveAll(t => (now - t).TotalSeconds > 1.5);

                if (_reversalTimes.Count >= 3)
                {
                    _reversalTimes.Clear();
                    _lastPetX = -1;
                    _lastPetDir = 0;
                    TriggerPetting();
                }
            }
            else
            {
                _lastPetX = -1;
                _lastPetDir = 0;
                _reversalTimes.RemoveAll(t => (DateTime.UtcNow - t).TotalSeconds > 1.5);
            }
        }

        public void TriggerPetting()
        {
            if (_petForm == null || _petForm.IsDisposed) return;

            var controller = SwinkaBrainController.Instance;
            var pet = controller?.Pet;

            // Sprawdzamy czy świnka śpi
            TAnimation currentAnim = _petForm.CurrentAnimation;
            string curAnimName = currentAnim.Name;
            bool isSleeping = (curAnimName == "sleep" ||
                               curAnimName == "doze" ||
                               curAnimName == "lie_down" ||
                               curAnimName == "sleep_house") ||
                              (pet != null && pet.IsSleeping);

            if (isSleeping)
            {
                if (pet != null)
                {
                    pet.IsSleeping = false;
                    pet.Needs.Mood = Math.Max(0.0, pet.Needs.Mood - 2.0);
                    SwinkaBrainController.Log(string.Format(
                        "[Głaskanie] Głaskanie śpiącej świnki ją budzi! Humor -2 (aktualny humor: {0:0.#}%).",
                        pet.Needs.Mood));
                    FormDomek.NotifyStateChanged();
                }
                _petForm.PlayAnimationByName("wake_up");
            }
            else
            {
                // Obudzona świnka: mruczenie purr_pet + serduszka (wbudowane w animację)
                DateTime now = DateTime.UtcNow;
                _rewardedPettingTimes.RemoveAll(t => (now - t).TotalSeconds > 3600.0);

                if (_rewardedPettingTimes.Count < 10)
                {
                    _rewardedPettingTimes.Add(now);
                    if (pet != null)
                    {
                        pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 5.0);
                        pet.AddBondPoints(1);
                        pet.Count("glaskanie");
                        SwinkaBrainController.Log(string.Format(
                            "[Głaskanie] Głaskanie udane! purr_pet, humor +5 ({0:0.#}%), więź +1. Nagrodzonych w tej godzinie: {1}/10.",
                            pet.Needs.Mood, _rewardedPettingTimes.Count));
                        FormDomek.NotifyStateChanged();
                    }
                }
                else
                {
                    SwinkaBrainController.Log(
                        "[Głaskanie] Osiągnięto limit 10 nagradzanych głaskań na godzinę. Świnka tylko mruczy (purr_pet).");
                }

                _petForm.PlayAnimationByName("purr_pet");
            }
        }

        // ---- Kliknięcia i irytacja -------------------------------------------

        public bool RegisterClick()
        {
            DateTime now = DateTime.UtcNow;
            _clickTimes.Add(now);
            _clickTimes.RemoveAll(t => (now - t).TotalSeconds > 3.0);

            if (_clickTimes.Count > 8)
            {
                _clickTimes.Clear();
                _offendedUntil = now.AddSeconds(30.0);

                // Przerwanie bieżących interakcji
                _lookState = LookAtUserState.None;
                _callState = CallPetState.None;

                _petForm.HideStatusBubble();
                _petForm.PlayAnimationByName("chatter");

                SwinkaBrainController.Log(
                    "[Irytacja] Ponad 8 kliknięć w świnkę w 3 s! Świnka zgrzyta ząbkami (chatter) i jest obrażona przez 30 sekund.");
                return true;
            }

            return false;
        }

        // ---- Zawołaj ---------------------------------------------------------

        public bool CallPet()
        {
            if (_petForm == null || _petForm.IsDisposed) return false;

            if (IsOffended)
            {
                SwinkaBrainController.Log(string.Format(
                    "[Zawołaj] Świnka jest obrażona (pozostało {0:0.#}s) i nie przychodzi na zawołanie!",
                    OffendedRemainingSeconds));
                _petForm.PlayAnimationByName("chatter");
                return false;
            }

            if (_petForm.IsDragging || _petForm.IsTossing) return false;

            // Jeśli trwało patrzenie na ciebie, przerywamy je na rzecz zawołania
            _lookState = LookAtUserState.None;

            Point mousePos = Cursor.Position;
            int targetX = mousePos.X - (_petForm.Width / 2);

            // Ograniczenie pozycji X do bieżącej powierzchni
            if (_petForm.CurrentHwndWindow != IntPtr.Zero)
            {
                if (NativeMethods.GetWindowRect(new System.Runtime.InteropServices.HandleRef(_petForm, _petForm.CurrentHwndWindow), out NativeMethods.RECT rct))
                {
                    targetX = Math.Max(rct.Left, Math.Min(rct.Right - _petForm.Width, targetX));
                }
            }
            else
            {
                Rectangle screenArea = _petForm.ScreenArea;
                targetX = Math.Max(screenArea.Left, Math.Min(screenArea.Right - _petForm.Width, targetX));
            }

            _callTargetX = targetX;
            _callState = CallPetState.ComeCalled;
            _callTimer = 1.0; // 10 klatek @ 100 ms = 1.0 s

            // Ustawienie zwrotu w stronę celu
            _petForm.SetFacing(_callTargetX < _petForm.PositionX);
            _petForm.PlayAnimationByName("come_called");

            SwinkaBrainController.Log(string.Format(
                "[Zawołaj] Zawołano świnkę! Animacja come_called, cel X={0}.", _callTargetX));

            return true;
        }

        // ---- Powitanie po uruchomieniu ---------------------------------------

        public void CheckStartupGreeting()
        {
            if (_hasGreetedOnStartup) return;
            if (_petForm == null || _petForm.IsDisposed) return;

            _hasGreetedOnStartup = true;
            var pet = SwinkaBrainController.Instance?.Pet;
            int bondLevel = pet?.State?.Bond?.Level ?? 1;

            if (bondLevel >= 3)
            {
                _petForm.PlayAnimationByName("greet");
                SwinkaBrainController.Log(string.Format(
                    "[Powitanie] Powitanie po starcie: poziom więzi {0} >= 3 -> powitanie greet (kwiknięcie i podskok)!",
                    bondLevel));
            }
            else
            {
                _petForm.PlayAnimationByName("sniff");
                SwinkaBrainController.Log(string.Format(
                    "[Powitanie] Powitanie po starcie: poziom więzi {0} < 3 -> węszenie sniff.",
                    bondLevel));
            }
        }

        // ---- Pętla aktualizacji (wywoływana w każdym kroku FormPet) ------------

        public void Update(TimeSpan elapsed)
        {
            if (_petForm == null || _petForm.IsDisposed) return;
            if (_petForm.IsDragging || _petForm.IsTossing)
            {
                _lookState = LookAtUserState.None;
                _callState = CallPetState.None;
                return;
            }

            // 1. Sprawdzanie powitania startowego po pierwszym lądowaniu
            if (!_hasGreetedOnStartup && (_petForm.IsOnTaskbar || _petForm.IsOnWindow))
            {
                CheckStartupGreeting();
            }

            // 2. Aktualizacja stanu Zawołania
            if (_callState != CallPetState.None)
            {
                UpdateCallState(elapsed);
                return; // Zawołanie ma pierwszeństwo przed patrzeniem
            }

            // 3. Aktualizacja stanu Patrzenia na ciebie
            UpdateLookAtUserState(elapsed);
        }

        private void UpdateCallState(TimeSpan elapsed)
        {
            switch (_callState)
            {
                case CallPetState.ComeCalled:
                    _callTimer -= elapsed.TotalSeconds;
                    if (_callTimer <= 0)
                    {
                        _callState = CallPetState.RunningToTarget;
                        _petForm.PlayAnimationByName("run");
                    }
                    break;

                case CallPetState.RunningToTarget:
                    int diff = _callTargetX - (int)_petForm.PositionX;
                    if (Math.Abs(diff) <= 8)
                    {
                        // Dotarła na miejsce: kwiknięcie i podskok (greet)
                        _petForm.PositionX = _callTargetX;
                        _petForm.Location = new Point((int)_petForm.PositionX, (int)(_petForm.PositionY + _petForm.OffsetY));

                        _callState = CallPetState.Greeting;
                        _callTimer = 1.4; // 14 klatek @ 100 ms = 1.4 s
                        _petForm.PlayAnimationByName("greet");

                        var pet = SwinkaBrainController.Instance?.Pet;
                        if (pet != null)
                        {
                            pet.AddBondPoints(1);
                            pet.Count("zawolania");
                        }
                        SwinkaBrainController.Log("[Zawołaj] Świnka dotarła pod kursor i wykonała powitanie (greet)!");
                    }
                    else
                    {
                        _petForm.RunTowards(_callTargetX, 6);
                    }
                    break;

                case CallPetState.Greeting:
                    _callTimer -= elapsed.TotalSeconds;
                    if (_callTimer <= 0)
                    {
                        _callState = CallPetState.None;
                        _petForm.PlayAnimationByName("idle");
                    }
                    break;
            }
        }

        private void UpdateLookAtUserState(TimeSpan elapsed)
        {
            DateTime now = DateTime.UtcNow;
            Point cursorPos = Cursor.Position;
            Point petCenter = new Point((int)_petForm.PositionX + (_petForm.Width / 2), (int)_petForm.PositionY + (_petForm.Height / 2));
            double dist = Math.Sqrt(Math.Pow(cursorPos.X - petCenter.X, 2) + Math.Pow(cursorPos.Y - petCenter.Y, 2));

            switch (_lookState)
            {
                case LookAtUserState.None:
                    // Warunki startu:
                    // - odpoczywająca świnka (animacja idle)
                    // - nie jest obrażona
                    // - cooldown 2 minuty
                    // - kursor w promieniu 250 px
                    // - kursor nieruchomo 1-3 s
                    TAnimation restingAnim = _petForm.CurrentAnimation;
                    bool isResting = restingAnim.Name == "idle";
                    if (!isResting || IsOffended)
                    {
                        _stationarySeconds = 0.0;
                        _lastStationaryPos = cursorPos;
                        return;
                    }

                    if ((now - _lastLookAtUserTime).TotalSeconds < 120.0)
                    {
                        _stationarySeconds = 0.0;
                        _lastStationaryPos = cursorPos;
                        return;
                    }

                    if (dist <= 250.0)
                    {
                        double moveDist = Math.Sqrt(Math.Pow(cursorPos.X - _lastStationaryPos.X, 2) + Math.Pow(cursorPos.Y - _lastStationaryPos.Y, 2));
                        if (moveDist < 6.0)
                        {
                            _stationarySeconds += elapsed.TotalSeconds;
                        }
                        else
                        {
                            _stationarySeconds = 0.0;
                            _lastStationaryPos = cursorPos;
                        }

                        if (_stationarySeconds >= 1.5) // W zakresie 1-3 s
                        {
                            _stationarySeconds = 0.0;
                            _lookState = LookAtUserState.TurningToFront;
                            _lookStateTimer = 0.4; // turn: 4 klatki @ 100 ms = 0.4 s
                            _petForm.PlayAnimationByName("turn");
                            SwinkaBrainController.Log(
                                "[Patrzenie] Kursor nieruchomy w promieniu 250 px. Świnka odwraca się przodem (turn).");
                        }
                    }
                    else
                    {
                        _stationarySeconds = 0.0;
                        _lastStationaryPos = cursorPos;
                    }
                    break;

                case LookAtUserState.TurningToFront:
                    _lookStateTimer -= elapsed.TotalSeconds;
                    if (_lookStateTimer <= 0)
                    {
                        _lookState = LookAtUserState.TrackingCursor;
                        _trackingTotalSeconds = 0.0;
                    }
                    break;

                case LookAtUserState.TrackingCursor:
                    _trackingTotalSeconds += elapsed.TotalSeconds;

                    // Warunek końca: minęło 5 s lub kursor odjechał poza 250 px
                    if (dist > 250.0 || _trackingTotalSeconds >= 5.0)
                    {
                        _lookState = LookAtUserState.TurningToSide;
                        _lookStateTimer = 0.3;
                        _lastLookAtUserTime = now;
                        _petForm.PlayAnimationByName("turn");
                        SwinkaBrainController.Log(
                            "[Patrzenie] Kursor odjechał lub minęło 5 s. Świnka wraca bokiem do spoczynku.");
                        return;
                    }

                    // Śledzenie kursora klatkami front_look (wiersz 22: klatki 352-356)
                    // 0 lewo (352), 1 prawo (353), 2 góra (354), 3 dół (355), 4 środek (356)
                    int dx = cursorPos.X - petCenter.X;
                    int dy = cursorPos.Y - petCenter.Y;

                    int frameIdx;
                    if (dist < 35.0)
                    {
                        frameIdx = 356; // 4: środek
                    }
                    else if (Math.Abs(dx) >= Math.Abs(dy))
                    {
                        frameIdx = dx < 0 ? 352 : 353; // 0: lewo, 1: prawo
                    }
                    else
                    {
                        frameIdx = dy < 0 ? 354 : 355; // 2: góra, 3: dół
                    }

                    _petForm.ShowCustomSprite(frameIdx);
                    break;

                case LookAtUserState.TurningToSide:
                    _lookStateTimer -= elapsed.TotalSeconds;
                    if (_lookStateTimer <= 0)
                    {
                        _lookState = LookAtUserState.None;
                        _petForm.ReturnFromCustomSprite();
                    }
                    break;
            }
        }
    }
}
