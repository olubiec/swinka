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
    /// Główny menedżer dźwięków świnki na pulpit (Zadanie F1).
    /// Odpowiada za:
    /// - Wczytanie i buforowanie 10 klipów WAV z /swinka/dzwieki
    /// - Mapowanie zdarzeń gry i animacji na dźwięki
    /// - Kontrolę głośności i wyciszenie (Mute)
    /// - Sprawdzanie godzin ciszy (domyślnie 22:00 - 07:00)
    /// - Wyciszenie przy grach i aplikacjach na pełnym ekranie (SHQueryUserNotificationState)
    /// - Losową lekką zmianę wysokości dźwięku (pitch variation +/-6%)
    /// - Ścisły limit częstotliwości kwiczenia (maks. 1 kwiknięcie na 2 minuty)
    /// </summary>
    public sealed class SoundManager : IDisposable
    {
        private static SoundManager _instance;
        public static SoundManager Instance => _instance;

        // Bufor surowych danych PCM i formatów dla każdego klipu
        private readonly Dictionary<string, byte[]> _cachedPcm = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, WaveFormat> _cachedFormats = new Dictionary<string, WaveFormat>(StringComparer.OrdinalIgnoreCase);

        // Reguły polityki audio
        private readonly QuietHoursConfig _quietHours = new QuietHoursConfig(new TimeSpan(22, 0, 0), new TimeSpan(7, 0, 0), enabled: true);
        private readonly WheekRateLimiter _wheekLimiter = new WheekRateLimiter(TimeSpan.FromMinutes(2));
        private readonly Random _random = new Random();
        private readonly object _lock = new object();

        // Aktywne instancje odtwarzaczy do prawidłowego zwalniania zasobów
        private readonly List<WaveOutEvent> _activePlayers = new List<WaveOutEvent>();

        // Stan mruczenia (głaskanie może się zapętlać)
        private bool _isPurring;
        private WaveOutEvent _purrPlayer;

        // Stan chrupania (jedzenie: powtarzaj co 0.3-0.6s)
        private bool _isEating;
        private TimeSpan _eatingCrunchTimer = TimeSpan.Zero;

        // Cache detekcji pełnego ekranu (by nie odpytywać Win32 przy każdym dźwięku)
        private DateTime _lastFullScreenCheckUtc = DateTime.MinValue;
        private bool _lastFullScreenResult;
        private const int FullScreenCacheTtlMs = 1500;

        // Flagi konfiguracyjne
        public bool IsMuted { get; set; } = false;
        public bool MuteOnFullScreen { get; set; } = true;
        public double MaxPitchVariation { get; set; } = PitchCalculator.DefaultVariation;

        public QuietHoursConfig QuietHours => _quietHours;
        public WheekRateLimiter WheekLimiter => _wheekLimiter;

        /// <summary>
        /// Głośność w skali 0.0 - 1.0. Zsynchronizowana z Program.MyData.
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
                catch { }
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
                catch { }
            }
        }
        private float _volumeFallback = 0.8f;

        public SoundManager()
        {
            _instance = this;
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

        // ---- Wczytywanie klipów z /swinka/dzwieki -----------------------------

        private void LoadSounds()
        {
            string[] soundFiles = new string[]
            {
                "chrupanie_1.wav",
                "chrupanie_2.wav",
                "cwierkanie.wav",
                "kwik_1.wav",
                "kwik_2.wav",
                "kwik_3.wav",
                "mruczenie.wav",
                "pisk_strachu.wav",
                "pisk_zlosci.wav",
                "pop.wav"
            };

            int loadedCount = 0;
            foreach (var fileName in soundFiles)
            {
                string path = FindSoundFile(fileName);
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
                            string key = Path.GetFileNameWithoutExtension(fileName).ToLowerInvariant();
                            _cachedPcm[key] = pcm;
                            _cachedFormats[key] = reader.WaveFormat;
                            loadedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log(string.Format("[Dźwięk] Błąd ładowania {0}: {1}", fileName, ex.Message));
                    }
                }
            }

            BrainController.Log(string.Format("[Dźwięk] Zainicjalizowano SoundManager. Załadowano {0}/{1} klipów audio.",
                loadedCount, soundFiles.Length));
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
                catch { }
            }

            return null;
        }

        // ---- Wykrywanie pełnego ekranu (Win32 API) ---------------------------

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
                // 1. Sprawdzenie stanu powiadomień użytkownika w Windows Shell
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

                // 2. Fallback: sprawdzenie czy aktywne okno na wierzchu pokrywa cały ekran
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
                                    // Sprawdź czy to nie jest okno naszej świnki
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
            catch { }

            _lastFullScreenResult = isFs;
            return isFs;
        }

        // ---- Sprawdzanie wyciszenia dźwięków ---------------------------------

        /// <summary>
        /// Zwraca true jeśli odtwarzanie dźwięków powinno być w tej chwili wstrzymane
        /// (wyciszenie, głośność 0, godziny ciszy lub pełny ekran).
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
                reason = "Głośność 0%";
                return true;
            }

            if (_quietHours.IsInQuietHours(DateTime.Now))
            {
                reason = "Godziny ciszy";
                return true;
            }

            if (MuteOnFullScreen && IsFullScreenOrBusy())
            {
                reason = "Pełny ekran";
                return true;
            }

            reason = null;
            return false;
        }

        // ---- Rdzeń odtwarzania NAudio z wariacją tonu ------------------------

        /// <summary>
        /// Odtwarza pojedynczy klip audio z losową lekką zmianą wysokości dźwięku (pitch variation).
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
                BrainController.Log(string.Format("[Dźwięk] Zablokowano odtworzenie {0} ({1}).", clipKey, suppressReason));
                return false;
            }

            try
            {
                // Obliczenie losowej wariacji tonu
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
                    catch { }
                };

                waveOut.Play();
                return true;
            }
            catch (Exception ex)
            {
                BrainController.Log(string.Format("[Dźwięk] Błąd odtwarzania {0}: {1}", clipKey, ex.Message));
                return false;
            }
        }

        // ---- Obsługa specyficznych zachowań i reguł gry -----------------------

        /// <summary>
        /// Odtwarza dźwięk kwiczenia z losowaniem z puli kwik_1, kwik_2, kwik_3.
        /// Wymóg: maks. jeden dźwięk kwiczenia na 2 minuty.
        /// </summary>
        public bool PlayWheek(string reason = "głód")
        {
            DateTime nowUtc = DateTime.UtcNow;
            if (!_wheekLimiter.TryWheek(nowUtc))
            {
                _wheekLimiter.CanWheek(nowUtc, out TimeSpan rem);
                BrainController.Log(string.Format("[Dźwięk] Pominięto kwik ({0}) - cooldown aktywny jeszcze przez {1:0}s.",
                    reason, rem.TotalSeconds));
                return false;
            }

            string[] wheeks = new string[] { "kwik_1", "kwik_2", "kwik_3" };
            string chosen = wheeks[_random.Next(wheeks.Length)];
            bool played = PlayClip(chosen);
            if (played)
            {
                BrainController.Log(string.Format("[Dźwięk] Odtworzono kwik ({0}, plik: {1}).", reason, chosen));
            }
            return played;
        }

        /// <summary>
        /// Odtwarza mruczenie. Przy głaskaniu mruczenie może się zapętlać.
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

            if (!_cachedPcm.TryGetValue("mruczenie", out byte[] pcmData) ||
                !_cachedFormats.TryGetValue("mruczenie", out WaveFormat baseFormat))
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
                    catch { }

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
            catch { }
            _purrPlayer = null;
        }

        /// <summary>
        /// Odtwarza pojedyncze mruczenie (np. po pogłaskaniu).
        /// </summary>
        public void PlayPurr()
        {
            PlayClip("mruczenie");
        }

        /// <summary>
        /// Odtwarza podskok z radości (popcorning).
        /// </summary>
        public void PlayPopcorn()
        {
            PlayClip("pop");
        }

        /// <summary>
        /// Odtwarza ćwierkanie zadowolenia lub malucha.
        /// </summary>
        public void PlayChirp()
        {
            PlayClip("cwierkanie");
        }

        /// <summary>
        /// Odtwarza pisk strachu (flee, startle).
        /// </summary>
        public void PlayFear()
        {
            PlayClip("pisk_strachu");
        }

        /// <summary>
        /// Odtwarza pisk złości / irytacji (chatter, zgrzytanie zębami).
        /// </summary>
        public void PlayAnger()
        {
            PlayClip("pisk_zlosci");
        }

        // ---- Obsługa chrupania podczas jedzenia -------------------------------

        public void StartEatingCrunch()
        {
            _isEating = true;
            _eatingCrunchTimer = TimeSpan.Zero; // pierwsze chrupnięcie natychmiast
        }

        public void StopEatingCrunch()
        {
            _isEating = false;
        }

        /// <summary>
        /// Wywoływane co krok aktualizacji gry (np. w SwinkaBrainController.Update lub SwinkaFoodManager.Update).
        /// Powtarza chrupanie co 0.3 - 0.6 sekundy z lekką zmianą tonu.
        /// </summary>
        public void UpdateEating(TimeSpan gameElapsed)
        {
            if (!_isEating) return;

            _eatingCrunchTimer -= gameElapsed;
            if (_eatingCrunchTimer <= TimeSpan.Zero)
            {
                string[] crunches = new string[] { "chrupanie_1", "chrupanie_2" };
                string chosen = crunches[_random.Next(crunches.Length)];
                PlayClip(chosen);

                // Następne chrupnięcie za 300 - 600 ms
                int nextMs = _random.Next(300, 601);
                _eatingCrunchTimer = TimeSpan.FromMilliseconds(nextMs);
            }
        }

        // ---- Reakcja na animacje (SoundEventMapper) ---------------------------

        /// <summary>
        /// Wywoływane gdy w FormPet lub Brain uruchamia się animacja.
        /// </summary>
        public void OnAnimationStarted(string animName)
        {
            if (string.IsNullOrEmpty(animName)) return;

            SoundEvent soundEvent = SoundEventMapper.MapAnimationToSound(animName);
            switch (soundEvent)
            {
                case SoundEvent.Wheek:
                    PlayWheek("animacja_" + animName);
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
                    // Jedzenie: uruchom chrupanie
                    StartEatingCrunch();
                    break;
                default:
                    // Jeśli to inna animacja niż jedzenie, upewnij się że chrupanie nie trwa w nieskończoność
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
                    try { p.Stop(); p.Dispose(); } catch { }
                }
                _activePlayers.Clear();
            }

            _cachedPcm.Clear();
            _cachedFormats.Clear();
        }
    }
}
