using System;
using System.Diagnostics;
using NAudio.CoreAudioApi;

namespace Cuy.Platform
{
    /// <summary>
    /// Reads the loudest peak (0..1) of the audio sessions on the default playback device, without capturing audio.
    /// Uses the Windows per-session peak meters (IAudioMeterInformation) through NAudio 2.2.x:
    /// - no WASAPI loopback, so no "no data during silence" problem and almost no CPU,
    /// - Windows system sounds and Cuy's own sounds are ignored (the pig must not dance to its own wheek),
    /// - survives having no audio device and re-resolves the device when the default changes (headphones).
    /// Poll from a timer (every 50-100 ms) and push the value into Cuy.Core.Audio.MusicDetector.
    /// Must be created and used on ONE thread (the UI thread is fine; each call takes well under 1 ms).
    /// </summary>
    public sealed class AudioSessionProbe : IDisposable
    {
        private readonly uint _ownPid = (uint)Process.GetCurrentProcess().Id;
        private MMDeviceEnumerator _enumerator;
        private MMDevice _device;
        private string _deviceId;
        private DateTime _nextDeviceCheckUtc = DateTime.MinValue;
        private int _errors;

        /// <summary>Name of the process that was loudest in the last ReadPeak call (for the log), or null.</summary>
        public string LastLoudestProcess { get; private set; }

        /// <summary>Loudest peak of all non-system, non-Cuy sessions; 0 when there is no device or on any error.</summary>
        public float ReadPeak()
        {
            try
            {
                EnsureDevice();
                if (_device == null) return 0f;

                var manager = _device.AudioSessionManager;
                manager.RefreshSessions();
                var sessions = manager.Sessions;

                float max = 0f;
                uint loudestPid = 0;
                for (int i = 0; i < sessions.Count; i++)
                {
                    var s = sessions[i];
                    if (s.IsSystemSoundsSession) continue;
                    if (s.State != NAudio.CoreAudioApi.Interfaces.AudioSessionState.AudioSessionStateActive) continue;
                    uint pid = s.GetProcessID;
                    if (pid == _ownPid) continue;
                    float peak = s.AudioMeterInformation.MasterPeakValue;
                    if (peak > max)
                    {
                        max = peak;
                        loudestPid = pid;
                    }
                }

                LastLoudestProcess = loudestPid == 0 ? null : SafeProcessName(loudestPid);
                _errors = 0;
                return max;
            }
            catch (Exception)
            {
                // Device unplugged or the session went away between calls: drop the device and try again later.
                _errors++;
                DropDevice();
                _nextDeviceCheckUtc = DateTime.UtcNow.AddSeconds(Math.Min(30, 2 * _errors));
                return 0f;
            }
        }

        private void EnsureDevice()
        {
            var now = DateTime.UtcNow;
            if (now < _nextDeviceCheckUtc) return;
            _nextDeviceCheckUtc = now.AddSeconds(5); // re-check the default device every 5 s

            if (_enumerator == null) _enumerator = new MMDeviceEnumerator();
            if (!_enumerator.HasDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia))
            {
                DropDevice();
                return;
            }

            var def = _enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            if (_device != null && def.ID == _deviceId)
            {
                def.Dispose();
                return;
            }

            DropDevice();
            _device = def;
            _deviceId = def.ID;
        }

        private void DropDevice()
        {
            try { _device?.Dispose(); } catch { }
            _device = null;
            _deviceId = null;
        }

        private static string SafeProcessName(uint pid)
        {
            try { using (var p = Process.GetProcessById((int)pid)) return p.ProcessName; }
            catch { return "pid " + pid; }
        }

        public void Dispose()
        {
            DropDevice();
            try { _enumerator?.Dispose(); } catch { }
            _enumerator = null;
        }
    }
}
