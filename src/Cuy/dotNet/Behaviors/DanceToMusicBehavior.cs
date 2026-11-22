using System;
using Cuy.Core.Audio;
using Cuy.Platform;

namespace Cuy.Behaviors
{
    /// <summary>
    /// Makes desktop guinea pigs dance when another application plays music.
    /// Polls per-session peak meters via AudioSessionProbe at ~100 ms and feeds MusicDetector.
    /// </summary>
    public sealed class DanceToMusicBehavior : IDesktopBehavior
    {
        public string Id => "dance_to_music";

        private static readonly TimeSpan PollEvery = TimeSpan.FromMilliseconds(100);
        private static readonly TimeSpan ReRequestEvery = TimeSpan.FromSeconds(3.5);
        private static readonly TimeSpan Cooldown = TimeSpan.FromMinutes(3);
        private static readonly TimeSpan MaxBout = TimeSpan.FromSeconds(20);

        private BehaviorContext _ctx;
        private AudioSessionProbe _probe;
        private readonly MusicDetector _detector = new MusicDetector();
        private TimeSpan _sincePoll;
        private DateTime _boutStartUtc;
        private DateTime _lastRequestUtc;
        private DateTime _nextAllowedUtc = DateTime.MinValue;
        private bool _dancing;
        private readonly LocalData _settings = new LocalData();
        private bool _enabled = true;
        private TimeSpan _sinceSettings = TimeSpan.MaxValue;

        public void Start(BehaviorContext ctx)
        {
            _ctx = ctx;
            _probe = new AudioSessionProbe();
            _detector.MusicChanged += on =>
                _ctx?.Log("[Dance] music " + (on ? "ON (" + (_probe?.LastLoudestProcess ?? "?") + ")" : "OFF"));
        }

        public void Tick(TimeSpan dt)
        {
            if (_ctx == null || _probe == null) return;

            // Setting "DanceToMusicOff" in cuy.config: missing/0 = dancing on.
            _sinceSettings = _sinceSettings == TimeSpan.MaxValue ? TimeSpan.FromSeconds(5) : _sinceSettings + dt;
            if (_sinceSettings >= TimeSpan.FromSeconds(5))
            {
                _sinceSettings = TimeSpan.Zero;
                _enabled = _settings.GetIntValue("DanceToMusicOff") == 0;
            }
            if (!_enabled)
            {
                StopDance();
                return;
            }

            _sincePoll += dt;
            if (_sincePoll < PollEvery) return;
            _sincePoll = TimeSpan.Zero;

            var nowUtc = DateTime.UtcNow;
            _detector.Push(_probe.ReadPeak(), nowUtc);

            bool inQuietHours = SoundManager.Instance?.QuietHours.IsInQuietHours(DateTime.Now) ?? false;
            bool isSleeping = _ctx.Brain?.IsCurrentlySleeping() ?? false;
            bool canDance = _detector.IsMusic && !_ctx.IsBusy && !_ctx.IsHomeOpen && !isSleeping && !inQuietHours;

            if (_dancing)
            {
                if (!canDance || nowUtc - _boutStartUtc > MaxBout)
                {
                    StopDance();
                    return;
                }

                if (nowUtc - _lastRequestUtc >= ReRequestEvery)
                {
                    _lastRequestUtc = nowUtc;
                    TriggerDanceOnAllPets();
                }
                return;
            }

            if (canDance && nowUtc >= _nextAllowedUtc && TriggerDanceOnAllPets())
            {
                _dancing = true;
                _boutStartUtc = nowUtc;
                _lastRequestUtc = nowUtc;
                _ctx.Log("[Dance] start");
            }
        }

        private bool TriggerDanceOnAllPets()
        {
            bool started = _ctx.Brain != null
                ? _ctx.Brain.ForceAction("dancing")
                : _ctx.RequestAnimation("dancing");

            foreach (var pet in FormPet.AllPets)
            {
                if (!IsPetEligible(pet)) continue;
                if (pet.IsAmbientCompanion || pet != _ctx.ActivePet)
                {
                    pet.PlayAnimationByName("dance");
                    started = true;
                }
            }

            return started;
        }

        private static bool IsPetEligible(FormPet pet)
        {
            if (pet == null || pet.IsDisposed || !pet.Visible) return false;
            if (pet.IsDragging || pet.IsTossing || pet.ScriptHoldsPosition) return false;
            if (string.Equals(pet.CurrentAnimationName, "sulk", StringComparison.OrdinalIgnoreCase)) return false;
            return true;
        }

        private void StopDance()
        {
            if (!_dancing) return;
            _dancing = false;
            _nextAllowedUtc = DateTime.UtcNow + Cooldown;

            if (_ctx?.ActivePet != null && string.Equals(_ctx.ActivePet.CurrentAnimationName, "dance", StringComparison.OrdinalIgnoreCase))
            {
                _ctx.RequestAnimation("rest");
            }

            foreach (var pet in FormPet.AllPets)
            {
                if (pet == null || pet.IsDisposed) continue;
                if ((pet.IsAmbientCompanion || pet != _ctx?.ActivePet)
                    && string.Equals(pet.CurrentAnimationName, "dance", StringComparison.OrdinalIgnoreCase))
                {
                    pet.PlayAnimationByName("idle");
                }
            }

            _ctx?.Log("[Dance] stop");
        }

        public void Stop()
        {
            StopDance();
            _probe?.Dispose();
            _probe = null;
        }
    }
}
