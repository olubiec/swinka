using System;
using System.Drawing;
using Cuy.Platform;

namespace Cuy.Behaviors
{
    /// <summary>
    /// F6-03 (replacement detector): the pig leaves during full-screen games, videos and presentations ON ITS MONITOR.
    /// Detection = FullscreenDetector (port of Chromium fullscreen_win.cc + desktop-shell fix).
    /// Debounce: 2 positive checks to leave (2 x 3 s), 2 negative checks to come back.
    /// Hide/show uses the members F6-03 adds: PoopManager/FoodManager HideAll/ShowAll and Pet.SetAway(bool).
    /// </summary>
    public sealed class FullscreenHideBehavior : IDesktopBehavior
    {
        public string Id => "fullscreen_hide";

        private static readonly TimeSpan CheckEvery = TimeSpan.FromSeconds(3);
        private const int ChecksToChange = 2;

        private BehaviorContext _ctx;
        private TimeSpan _sinceCheck;
        private int _streak;
        private bool _away;

        public void Start(BehaviorContext ctx) { _ctx = ctx; }

        public void Tick(TimeSpan dt)
        {
            _sinceCheck += dt;
            if (_sinceCheck < CheckEvery) return;
            _sinceCheck = TimeSpan.Zero;

            var pet = _ctx.ActivePet;
            if (pet == null) return;
            if (!_away && _ctx.IsBusy) return; // never during the first-run intro, a drag or a toss

            var r = FullscreenDetector.Check();
            var petCenter = new Point(pet.Left + pet.Width / 2, pet.Top + pet.Height / 2);
            bool covered = r.Covers(petCenter);

            if (covered == _away) { _streak = 0; return; }
            if (++_streak < ChecksToChange) return;
            _streak = 0;

            if (covered) GoAway(r.Reason);
            else ComeBack();
        }

        private void GoAway(string reason)
        {
            _away = true;
            _ctx.Log("[Away] full screen (" + reason + "), hiding");
            _ctx.Pet.SetAway(true);               // F6-03 Core: offline-like decay, poop timer paused
            _ctx.ActivePet.HideStatusBubble();
            PoopManager.Instance?.HideAll();      // F6-03 adds HideAll/ShowAll
            FoodManager.Instance?.HideAll();
            _ctx.ActivePet.Hide();
        }

        private void ComeBack()
        {
            _away = false;
            _ctx.Log("[Away] full screen ended, coming back");
            _ctx.Pet.SetAway(false);
            PoopManager.Instance?.ShowAll();
            FoodManager.Instance?.ShowAll();
            _ctx.ActivePet.Show();
            _ctx.RequestAnimation("peek");        // or start an EdgePeekScene from the nearest edge (F1-05)
        }

        public void Stop()
        {
            if (_away) ComeBack();
        }
    }
}
