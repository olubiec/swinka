using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using NAudio.CoreAudioApi;
using NAudio.CoreAudioApi.Interfaces;
using Newtonsoft.Json.Linq;

namespace Cuy.Platform
{
    /// <summary>
    /// Reads the loudest peak (0..1) of active non-excluded audio sessions on the default playback device.
    /// Uses Windows per-session peak meters (IAudioMeterInformation) via NAudio:
    /// - excludes Windows system sounds, Cuy's own process, and processes listed in assets/data/audio_exclusions.json
    /// - handles missing/unplugged audio devices without throwing.
    /// Must be created and used on one thread (e.g. the UI thread).
    /// </summary>
    public sealed class AudioSessionProbe : IDisposable
    {
        private readonly uint _ownPid = (uint)Process.GetCurrentProcess().Id;
        private readonly HashSet<string> _excludedProcesses;
        private MMDeviceEnumerator _enumerator;
        private MMDevice _device;
        private string _deviceId;
        private DateTime _nextDeviceCheckUtc = DateTime.MinValue;
        private int _errors;

        /// <summary>Name of the process that was loudest in the last ReadPeak call, or null.</summary>
        public string LastLoudestProcess { get; private set; }

        public AudioSessionProbe()
        {
            _excludedProcesses = LoadExclusions();
        }

        /// <summary>Loudest peak of all active non-excluded sessions; 0 when no device is available or on error.</summary>
        public float ReadPeak()
        {
            try
            {
                EnsureDevice();
                if (_device == null)
                {
                    LastLoudestProcess = null;
                    return 0f;
                }

                var manager = _device.AudioSessionManager;
                if (manager == null)
                {
                    LastLoudestProcess = null;
                    return 0f;
                }

                manager.RefreshSessions();
                var sessions = manager.Sessions;
                if (sessions == null)
                {
                    LastLoudestProcess = null;
                    return 0f;
                }

                float max = 0f;
                string loudestName = null;

                for (int i = 0; i < sessions.Count; i++)
                {
                    AudioSessionControl session = null;
                    try
                    {
                        session = sessions[i];
                        if (session == null) continue;
                        if (session.IsSystemSoundsSession) continue;
                        if (session.State != AudioSessionState.AudioSessionStateActive) continue;

                        uint pid = session.GetProcessID;
                        if (pid == 0 || pid == _ownPid) continue;

                        var meter = session.AudioMeterInformation;
                        if (meter == null) continue;

                        string procName = SafeProcessName(pid);
                        if (!string.IsNullOrEmpty(procName) && _excludedProcesses.Contains(procName))
                        {
                            continue;
                        }

                        float peak = meter.MasterPeakValue;
                        if (peak > max)
                        {
                            max = peak;
                            loudestName = procName ?? ("pid " + pid);
                        }
                    }
                    finally
                    {
                        try { session?.Dispose(); } catch { }
                    }
                }

                LastLoudestProcess = loudestName;
                _errors = 0;
                return max;
            }
            catch (Exception)
            {
                _errors++;
                LastLoudestProcess = null;
                DropDevice();
                _nextDeviceCheckUtc = DateTime.UtcNow.AddSeconds(Math.Min(30, 2 * _errors));
                return 0f;
            }
        }

        private void EnsureDevice()
        {
            var now = DateTime.UtcNow;
            if (now < _nextDeviceCheckUtc) return;
            _nextDeviceCheckUtc = now.AddSeconds(5);

            if (_enumerator == null) _enumerator = new MMDeviceEnumerator();
            if (!_enumerator.HasDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia))
            {
                DropDevice();
                return;
            }

            var def = _enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            if (def == null)
            {
                DropDevice();
                return;
            }

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
            try
            {
                using (var p = Process.GetProcessById((int)pid))
                {
                    return p.ProcessName;
                }
            }
            catch
            {
                return null;
            }
        }

        private static HashSet<string> LoadExclusions()
        {
            var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "data", "audio_exclusions.json");
                if (!File.Exists(path)) return result;

                string json = File.ReadAllText(path);
                var token = JToken.Parse(json);
                JArray arr = token as JArray;
                if (arr == null && token is JObject obj)
                {
                    arr = (obj["excluded_processes"] ?? obj["excludedProcesses"] ?? obj["processes"]) as JArray;
                }

                if (arr != null)
                {
                    foreach (var item in arr)
                    {
                        string name = item?.ToString()?.Trim();
                        if (string.IsNullOrEmpty(name)) continue;
                        if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                        {
                            name = name.Substring(0, name.Length - 4);
                        }
                        if (!string.IsNullOrEmpty(name))
                        {
                            result.Add(name);
                        }
                    }
                }
            }
            catch
            {
                // Keep empty exclusion set if file cannot be parsed
            }
            return result;
        }

        public void Dispose()
        {
            DropDevice();
            try { _enumerator?.Dispose(); } catch { }
            _enumerator = null;
        }
    }
}
