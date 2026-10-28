using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using NAudio.Wave;
using Cuy.Core.Audio;

namespace Cuy
{
    /// <summary>
    /// Main sound manager of the desktop guinea pig:
    /// Responsible for:
    /// - Loads and caches the 10 WAV clips from assets/sounds
    /// - Maps game events and animations to sounds
    /// - Volume control and mute
    /// - Quiet hours check (default 22:00 - 08:00)
    /// - Muted during games and full-screen apps (SHQueryUserNotificationState)
    /// - Slight random pitch variation (+/-6%)
    /// - Strict wheek rate limit (max 1 wheek per 2 minutes)
    /// </summary>
    public sealed class SoundManager : IDisposable
    {
        private static SoundManager _instance;
        public static SoundManager Instance => _instance;

        // Raw PCM data and formats for each clip
        private readonly Dictionary<string, byte[]> _cachedPcm = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, WaveFormat> _cachedFormats = new Dictionary<string, WaveFormat>(StringComparer.OrdinalIgnoreCase);

        // Audio policy rules
        private readonly QuietHoursConfig _quietHours = new QuietHoursConfig(new TimeSpan(22, 0, 0), new TimeSpan(8, 0, 0), enabled: true);
        private readonly WheekRateLimiter _wheekLimiter = new WheekRateLimiter(TimeSpan.FromMinutes(2));
        private readonly Random _random = new Random();
        private readonly object _lock = new object();

        // Active player instances, so resources are released properly
        private readonly List<WaveOutEvent> _activePlayers = new List<WaveOutEvent>();

        // Purr state (petting can loop)
        private bool _isPurring;
        private WaveOutEvent _purrPlayer;

        // Crunch state (eating: repeat every 0.3-0.6 s)
        private bool _isEating;
        private TimeSpan _eatingCrunchTimer = TimeSpan.Zero;

        // Full-screen detection cache (so Win32 is not queried for every sound)
        private DateTime _lastFullScreenCheckUtc = DateTime.MinValue;
        private bool _lastFullScreenResult;
        private const int FullScreenCacheTtlMs = 1500;

        // Configuration flags
        public bool IsMuted { get; set; } = false;

        /// <summary>The tray menu "Sounds" switch, saved in the settings.</summary>
        public bool SoundsEnabled
        {
            get { return !IsMuted; }
            set
            {
                IsMuted = !value;
                try { Program.MyData?.SetSoundsEnabled(value); }
                catch (Exception ex) { BrainController.Log("[WARN] SoundManager.SoundsEnabled: " + ex.Message); }
            }
        }
        public bool MuteOnFullScreen
        {
            get { return _muteOnFullScreen; }
            set
            {
                _muteOnFullScreen = value;
                try { Program.MyData?.SetMuteFullscreen(value); }
                catch (Exception ex) { BrainController.Log("[WARN] SoundManager.MuteOnFullScreen: " + ex.Message); }
            }
        }
        private bool _muteOnFullScreen = true;
        public double MaxPitchVariation { get; set; } = PitchCalculator.DefaultVariation;

        public QuietHoursConfig QuietHours => _quietHours;
        public WheekRateLimiter WheekLimiter => _wheekLimiter;

        /// <summary>
        /// Volume on a 0.0 - 1.0 scale. Synced with Program.MyData.
        /// </summary>
        public float Volume
        {
            get
            {
                try
                {
                    if (Program.MyData != null)
                    {
                        return Program.MyData.GetVolume();
                    }
                }
                catch (Exception ex) { BrainController.Log("[WARN] SoundManager.Volume: " + ex.Message); }
                return _volumeFallback;
            }
            set
            {
                float clamped = Math.Max(0.0f, Math.Min(1.0f, value));
                _volumeFallback = clamped;
                try
                {
                    if (Program.MyData != null)
                    {
                        Program.MyData.SetVolume(clamped);
                    }
                }
                catch (Exception ex) { BrainController.Log("[WARN] SoundManager.Volume: " + ex.Message); }
            }
        }
        private float _volumeFallback = 0.8f;

        public void SetQuietHours(bool enabled, TimeSpan start, TimeSpan end)
        {
            _quietHours.Enabled = enabled;
            _quietHours.Start = start;
            _quietHours.End = end;
            try
            {
                Program.MyData?.SetQuietHours(enabled, start, end);
            }
            catch (Exception ex) { BrainController.Log("[WARN] SoundManager.SetQuietHours: " + ex.Message); }
        }

        public SoundManager()
        {
            _instance = this;
            try
            {
                IsMuted = !Program.MyData.GetSoundsEnabled();

                Program.MyData.GetQuietHours(out bool qhEnabled, out TimeSpan qhStart, out TimeSpan qhEnd);
                _quietHours.Enabled = qhEnabled;
                _quietHours.Start = qhStart;
                _quietHours.End = qhEnd;

                _muteOnFullScreen = Program.MyData.GetMuteFullscreen();
            }
            catch (Exception ex) { BrainController.Log("[WARN] SoundManager: " + ex.Message); }
            LoadSounds();
        }

        public static SoundManager Initialize()
        {
            if (_instance == null)
            {
                new SoundManager();
            }
            return _instance;
        }

        // ---- Loading clips from assets/sounds ---------------------------------

        private void LoadSounds()
        {
            string[] soundNames =
            {
                "crunch_1", "crunch_2", "chirp", "wheek_1", "wheek_2", "wheek_3",
                "purr", "fear_squeal", "angry_squeal", "pop"
            };

            int loadedCount = 0;
            foreach (string name in soundNames)
            {
                string path = FindSoundFile(name + ".wav");
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    try
                    {
                        byte[] fileBytes = File.ReadAllBytes(path);
                        using (var ms = new MemoryStream(fileBytes))
                        using (var reader = new WaveFileReader(ms))
                        {
                            byte[] pcm = new byte[reader.Length];
                            int read = reader.Read(pcm, 0, pcm.Length);
                            _cachedPcm[name] = pcm;
                            _cachedFormats[name] = reader.WaveFormat;
                            loadedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log(string.Format("[Sound] Failed to load {0}: {1}", name, ex.Message));
                    }
                }
                else
                {
                    BrainController.Log("[WARN] Sound file missing: " + name + ".wav");
                }
            }

            BrainController.Log(string.Format("[Sound] SoundManager ready. Loaded {0}/{1} clips.",
                loadedCount, soundNames.Length));
        }

        private static string FindSoundFile(string fileName)
        {
            string rel1 = Path.Combine("assets", "sounds", fileName);
            string rel2 = Path.Combine("sounds", fileName);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] searchPaths = new string[]
            {
                Path.Combine(baseDir, rel1),
                Path.Combine(baseDir, rel2),
                Path.Combine(baseDir, "..", rel1),
                Path.Combine(baseDir, "..", rel2),
                Path.Combine(baseDir, "..", "..", rel1),
                Path.Combine(baseDir, "..", "..", rel2),
                Path.Combine(baseDir, "..", "..", "..", rel1),
                Path.Combine(baseDir, "..", "..", "..", rel2),
                Path.Combine(baseDir, "..", "..", "..", "..", rel1),
                Path.Combine(baseDir, "..", "..", "..", "..", rel2),
                Path.Combine(Directory.GetCurrentDirectory(), rel1),
                Path.Combine(Directory.GetCurrentDirectory(), rel2)
            };

            foreach (var p in searchPaths)
            {
                try
                {
                    if (File.Exists(p)) return Path.GetFullPath(p);
                }
                catch (Exception ex) { BrainController.Log("[WARN] SoundManager.FindSoundFile: " + ex.Message); }
            }

            return null;
        }

        // ---- Full-screen detection (Win32 API) -------------------------------

        private enum QUERY_USER_NOTIFICATION_STATE
        {
            QUNS_NOT_PRESENT = 1,
            QUNS_BUSY = 2,
            QUNS_RUNNING_D3D_FULL_SCREEN = 3,
            QUNS_PRESENTATION_MODE = 4,
            QUNS_ACCEPTS_NOTIFICATIONS = 5,
            QUNS_QUIET_TIME = 6,
            QUNS_APP = 7
        }

        [DllImport("shell32.dll", SetLastError = false)]
        private static extern int SHQueryUserNotificationState(out QUERY_USER_NOTIFICATION_STATE pquns);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public bool IsFullScreenOrBusy()
        {
            DateTime now = DateTime.UtcNow;
            if ((now - _lastFullScreenCheckUtc).TotalMilliseconds < FullScreenCacheTtlMs)
            {
                return _lastFullScreenResult;
            }

            _lastFullScreenCheckUtc = now;
            bool isFs = false;

            try
            {
                // 1. Check the user notification state in the Windows shell
                int hr = SHQueryUserNotificationState(out var state);
                if (hr == 0) // S_OK
                {
                    if (state == QUERY_USER_NOTIFICATION_STATE.QUNS_BUSY ||
                        state == QUERY_USER_NOTIFICATION_STATE.QUNS_RUNNING_D3D_FULL_SCREEN ||
                        state == QUERY_USER_NOTIFICATION_STATE.QUNS_PRESENTATION_MODE)
                    {
                        isFs = true;
                    }
                }

                // 2. Fallback: check whether the foreground window covers the whole screen
                if (!isFs)
                {
                    IntPtr fgHwnd = GetForegroundWindow();
                    if (fgHwnd != IntPtr.Zero)
                    {
                        if (GetWindowRect(fgHwnd, out var rct))
                        {
                            var primary = Screen.PrimaryScreen;
                            if (primary != null)
                            {
                                int w = rct.Right - rct.Left;
                                int h = rct.Bottom - rct.Top;
                                if (w >= primary.Bounds.Width && h >= primary.Bounds.Height &&
                                    rct.Left <= primary.Bounds.Left && rct.Top <= primary.Bounds.Top)
                                {
                                    // Make sure it is not our own pig window
                                    var activePet = FormPet.ActivePet;
                                    if (activePet == null || fgHwnd != activePet.Handle)
                                    {
                                        isFs = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex) { BrainController.Log("[WARN] SoundManager.IsFullScreenOrBusy: " + ex.Message); }

            _lastFullScreenResult = isFs;
            return isFs;
        }

        // ---- Mute checks ------------------------------------------------------

        /// <summary>
        /// Returns true if sounds should be held back right now
        /// (muted, volume 0, quiet hours or full screen).
        /// </summary>
        public bool IsSoundSuppressed(out string reason)
        {
            if (IsMuted)
            {
                reason = "Mute";
                return true;
            }

            if (Volume <= 0.001f)
            {
                reason = "Volume 0%";
                return true;
            }

            if (_quietHours.IsInQuietHours(DateTime.Now))
            {
                reason = "Quiet hours";
                return true;
            }

            if (MuteOnFullScreen && IsFullScreenOrBusy())
            {
                reason = "Full screen";
                return true;
            }

            reason = null;
            return false;
        }

        // ---- NAudio playback core with pitch variation ------------------------

        /// <summary>
        /// Plays a single audio clip with a slight random pitch variation.
        /// </summary>
        public bool PlayClip(string clipKey, float volumeFactor = 1.0f)
        {
            if (string.IsNullOrEmpty(clipKey)) return false;

            clipKey = clipKey.ToLowerInvariant();
            if (!_cachedPcm.TryGetValue(clipKey, out byte[] pcmData) ||
                !_cachedFormats.TryGetValue(clipKey, out WaveFormat baseFormat))
            {
                return false;
            }

            if (IsSoundSuppressed(out string suppressReason))
            {
                BrainController.Log(string.Format("[Sound] Blocked playing {0} ({1}).", clipKey, suppressReason));
                return false;
            }

            try
            {
            // Compute the random pitch variation
                double pitchFactor = PitchCalculator.CalculateFactor(_random.NextDouble(), MaxPitchVariation);
                int pitchedSampleRate = (int)Math.Round(baseFormat.SampleRate * pitchFactor);
                var pitchedFormat = new WaveFormat(pitchedSampleRate, baseFormat.BitsPerSample, baseFormat.Channels);

                var memStream = new MemoryStream(pcmData, writable: false);
                var rawStream = new RawSourceWaveStream(memStream, pitchedFormat);

                var waveOut = new WaveOutEvent();
                float finalVol = Math.Max(0.0f, Math.Min(1.0f, Volume * volumeFactor));
                waveOut.Volume = finalVol;
                waveOut.Init(rawStream);

                lock (_lock)
                {
                    _activePlayers.Add(waveOut);
                }

                waveOut.PlaybackStopped += (s, e) =>
                {
                    lock (_lock)
                    {
                        _activePlayers.Remove(waveOut);
                    }
                    try
                    {
                        waveOut.Dispose();
                        rawStream.Dispose();
                        memStream.Dispose();
                    }
                    catch (Exception ex) { BrainController.Log("[WARN] SoundManager.PlayClip: " + ex.Message); }
                };

                waveOut.Play();
                return true;
            }
            catch (Exception ex)
            {
                BrainController.Log(string.Format("[Sound] Playback error {0}: {1}", clipKey, ex.Message));
                return false;
            }
        }

        // ---- Specific behaviours and game rules -------------------------------

        /// <summary>
        /// Plays a wheek picked at random from wheek_1, wheek_2, wheek_3.
        /// Rule: at most one wheek sound per 2 minutes.
        /// </summary>
        public bool PlayWheek(string reason = "hunger")
        {
            DateTime nowUtc = DateTime.UtcNow;
            if (!_wheekLimiter.TryWheek(nowUtc))
            {
                _wheekLimiter.CanWheek(nowUtc, out TimeSpan rem);
                BrainController.Log(string.Format("[Sound] Wheek skipped ({0}) - cooldown active for another {1:0}s.",
                    reason, rem.TotalSeconds));
                return false;
            }

            string[] wheeks = new string[] { "wheek_1", "wheek_2", "wheek_3" };
            string chosen = wheeks[_random.Next(wheeks.Length)];
            bool played = PlayClip(chosen);
            if (played)
            {
                BrainController.Log(string.Format("[Sound] Wheek played ({0}, file: {1}).", reason, chosen));
            }
            return played;
        }

        /// <summary>
        /// Plays the purr. While petting the purr can loop.
        /// </summary>
        public void StartPurrLoop()
        {
            if (_isPurring) return;
            _isPurring = true;
            PlayNextPurr();
        }

        private void PlayNextPurr()
        {
            if (!_isPurring) return;

            if (IsSoundSuppressed(out _))
            {
                _isPurring = false;
                return;
            }

            if (!_cachedPcm.TryGetValue("purr", out byte[] pcmData) ||
                !_cachedFormats.TryGetValue("purr", out WaveFormat baseFormat))
            {
                _isPurring = false;
                return;
            }

            try
            {
                double pitchFactor = PitchCalculator.CalculateFactor(_random.NextDouble(), MaxPitchVariation);
                int pitchedSampleRate = (int)Math.Round(baseFormat.SampleRate * pitchFactor);
                var pitchedFormat = new WaveFormat(pitchedSampleRate, baseFormat.BitsPerSample, baseFormat.Channels);

                var memStream = new MemoryStream(pcmData, writable: false);
                var rawStream = new RawSourceWaveStream(memStream, pitchedFormat);

                var player = new WaveOutEvent();
                player.Volume = Math.Max(0.0f, Math.Min(1.0f, Volume));
                player.Init(rawStream);
                _purrPlayer = player;

                player.PlaybackStopped += (s, e) =>
                {
                    try
                    {
                        player.Dispose();
                        rawStream.Dispose();
                        memStream.Dispose();
                    }
                    catch (Exception ex) { BrainController.Log("[WARN] SoundManager.PlayNextPurr: " + ex.Message); }

                    if (_isPurring)
                    {
                        PlayNextPurr();
                    }
                };

                player.Play();
            }
            catch
            {
                _isPurring = false;
            }
        }

        public void StopPurrLoop()
        {
            _isPurring = false;
            try
            {
                _purrPlayer?.Stop();
            }
            catch (Exception ex) { BrainController.Log("[WARN] SoundManager.StopPurrLoop: " + ex.Message); }
            _purrPlayer = null;
        }

        /// <summary>
        /// Plays a single purr (e.g. after a pet).
        /// </summary>
        public void PlayPurr()
        {
            PlayClip("purr");
        }

        /// <summary>
        /// Plays the jump for joy (popcorning).
        /// </summary>
        public void PlayPopcorn()
        {
            PlayClip("pop");
        }

        /// <summary>
        /// Plays the contented or baby chirp.
        /// </summary>
        public void PlayChirp()
        {
            PlayClip("chirp");
        }

        /// <summary>
        /// Plays the fear squeal (flee, startle).
        /// </summary>
        public void PlayFear()
        {
            PlayClip("fear_squeal");
        }

        /// <summary>
        /// Plays the angry squeal (chatter, teeth grinding).
        /// </summary>
        public void PlayAnger()
        {
            PlayClip("angry_squeal");
        }

        // ---- Crunching while eating -------------------------------------------

        public void StartEatingCrunch()
        {
            _isEating = true;
            _eatingCrunchTimer = TimeSpan.Zero; // first crunch right away
        }

        public void StopEatingCrunch()
        {
            _isEating = false;
        }

        /// <summary>
        /// Called on every game update step (e.g. in BrainController.Update or FoodManager.Update).
        /// Repeats the crunch every 0.3 - 0.6 seconds with a slight pitch change.
        /// </summary>
        public void UpdateEating(TimeSpan gameElapsed)
        {
            if (!_isEating) return;

            _eatingCrunchTimer -= gameElapsed;
            if (_eatingCrunchTimer <= TimeSpan.Zero)
            {
                string[] crunches = new string[] { "crunch_1", "crunch_2" };
                string chosen = crunches[_random.Next(crunches.Length)];
                PlayClip(chosen);

                // Next crunch in 300 - 600 ms
                int nextMs = _random.Next(300, 601);
                _eatingCrunchTimer = TimeSpan.FromMilliseconds(nextMs);
            }
        }

        // ---- Reacting to animations (SoundEventMapper) ------------------------

        /// <summary>
        /// Called when FormPet or Brain starts an animation.
        /// </summary>
        public void OnAnimationStarted(string animName)
        {
            if (string.IsNullOrEmpty(animName)) return;

            SoundEvent soundEvent = SoundEventMapper.MapAnimationToSound(animName);
            switch (soundEvent)
            {
                case SoundEvent.Wheek:
                    PlayWheek("animation_" + animName);
                    break;
                case SoundEvent.Purr:
                    PlayPurr();
                    break;
                case SoundEvent.Pop:
                    PlayPopcorn();
                    break;
                case SoundEvent.Chirp:
                    PlayChirp();
                    break;
                case SoundEvent.Fear:
                    PlayFear();
                    break;
                case SoundEvent.Anger:
                    PlayAnger();
                    break;
                case SoundEvent.Crunch:
                    // Eating: start crunching
                    StartEatingCrunch();
                    break;
                default:
                    // For any other animation make sure crunching does not run forever
                    if (_isEating && animName != "eat" && animName != "eat_treat" && animName != "eat_bowl" && animName != "eat_big")
                    {
                        StopEatingCrunch();
                    }
                    break;
            }
        }

        public void Dispose()
        {
            StopPurrLoop();
            StopEatingCrunch();

            lock (_lock)
            {
                foreach (var p in _activePlayers)
                {
                    try { p.Stop(); p.Dispose(); } catch (Exception ex) { BrainController.Log("[WARN] SoundManager.Dispose: " + ex.Message); }
                }
                _activePlayers.Clear();
            }

            _cachedPcm.Clear();
            _cachedFormats.Clear();
        }
    }
}
