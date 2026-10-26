using System;
using Cuy.Core.Audio;
using Cuy.Platform;

namespace Cuy.Behaviors
{
    /// <summary>
    /// F6-01 (replacement design): the pig dances while another app plays music.
    /// Source: per-session peak meters (AudioSessionProbe, NAudio 2.2.1) -> MusicDetector (Cuy.Core, tested).
    /// No WASAPI loopback, no DSP, no BPM: less code, no silence watchdog, CPU well below 1 %.
    /// Written against the F4-09 contract (IDesktopBehavior / BehaviorContext); adjust member names if F4-09 differs.
    /// </summary>
    public sealed class DanceToMusicBehavior : IDesktopBehavior
    {
        public string Id => "dance_to_music";

        private static readonly TimeSpan PollEvery = TimeSpan.FromMilliseconds(100);
        private static readonly TimeSpan Cooldown = TimeSpan.FromMinutes(3);
        private static readonly TimeSpan MaxBout = TimeSpan.FromSeconds(20);

        private BehaviorContext _ctx;
        private AudioSessionProbe _probe;
        private readonly MusicDetector _detector = new MusicDetector();
        private TimeSpan _sincePoll;
        private DateTime _boutStartUtc;
        private DateTime _nextAllowedUtc = DateTime.MinValue;
        private bool _dancing;
        private readonly LocalData _settings = new LocalData();
        private bool _enabled = true;
        private TimeSpan _sinceSettings = TimeSpan.MaxValue;

        public void Start(BehaviorContext ctx)
        {
            _ctx = ctx;
            _probe = new AudioSessionProbe();
            _detector.MusicChanged += on => _ctx.Log("[Dance] music " + (on ? "ON (" + (_probe.LastLoudestProcess ?? "?") + ")" : "OFF"));
        }

        public void Tick(TimeSpan dt)
        {
            // Setting "DanceToMusicOff" in cuy.config: missing/0 = dancing on (GetIntValue returns 0 for missing keys).
            _sinceSettings = _sinceSettings == TimeSpan.MaxValue ? TimeSpan.FromSeconds(5) : _sinceSettings + dt;
            if (_sinceSettings >= TimeSpan.FromSeconds(5))
            {
                _sinceSettings = TimeSpan.Zero;
                _enabled = _settings.GetIntValue("DanceToMusicOff") == 0;
            }
            if (!_enabled) { StopDance(); return; }

            _sincePoll += dt;
            if (_sincePoll < PollEvery) return;
            _sincePoll = TimeSpan.Zero;

            var now = DateTime.UtcNow;
            _detector.Push(_probe.ReadPeak(), now);

            bool canDance = _detector.IsMusic && !_ctx.IsBusy && !_ctx.IsHomeOpen
                            && !_ctx.Brain.IsCurrentlySleeping() && !(SoundManager.Instance?.QuietHours.IsInQuietHours(DateTime.Now.TimeOfDay) ?? false);

            if (_dancing)
            {
                if (!canDance || now - _boutStartUtc > MaxBout) StopDance();
                else _ctx.RequestAnimation("dance"); // re-request: the host ignores it while dance is already playing
                return;
            }

            if (canDance && now >= _nextAllowedUtc && _ctx.RequestAnimation("dance"))
            {
                _dancing = true;
                _boutStartUtc = now;
                _ctx.Log("[Dance] start");
            }
        }

        private void StopDance()
        {
            if (!_dancing) return;
            _dancing = false;
            _nextAllowedUtc = DateTime.UtcNow + Cooldown;
            _ctx.RequestAnimation("idle");
            _ctx.Log("[Dance] stop");
        }

        public void Stop()
        {
            StopDance();
            _probe?.Dispose();
            _probe = null;
        }
    }
}
