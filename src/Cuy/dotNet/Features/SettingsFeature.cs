using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Cuy.Core;

namespace Cuy.Features
{
    public class SettingsFeature : HomeFeatureBase
    {
        public override string Id => "settings";

        private static bool _updateAvailable = false;
        private static string _updateVersion = "1.0.0";
        private static string _updateStatus = "idle";
        private static string _updateNotes = "";
        private static string _updateDownloadUrl = "";
        private static int _updateProgress = 0;
        private static bool _updateDownloading = false;
        private static bool _updatePopupDismissed = false;
        private static System.Threading.Timer _bgUpdateTimer;

        public static bool IsUpdateAvailable => _updateAvailable;
        public static string AvailableVersion => _updateVersion;

        public static void StartBackgroundCheck()
        {
            if (_bgUpdateTimer != null) return;
            _bgUpdateTimer = new System.Threading.Timer(_ =>
            {
                _ = RunUpdateCheckAsync(clearCache: false, notifyToastIfAvailable: true);
            }, null, TimeSpan.FromSeconds(15), TimeSpan.FromHours(4));
        }

        private static async Task RunUpdateCheckAsync(bool clearCache, bool notifyToastIfAvailable)
        {
            try
            {
                if (clearCache)
                {
                    Cuy.Core.Platform.UpdateChecker.ClearCache();
                }

                var info = await Cuy.Core.Platform.UpdateChecker
                    .CheckForUpdateAsync(CurrentVersion, "olubiec/swinka")
                    .ConfigureAwait(false);

                if (info != null)
                {
                    _updateAvailable = info.IsNewer;
                    _updateVersion = string.IsNullOrEmpty(info.Version) ? CurrentVersion : info.Version;
                    _updateDownloadUrl = info.DownloadUrl ?? "";
                    _updateNotes = info.ReleaseNotes ?? "";
                    _updateStatus = info.IsNewer ? "available" : "up_to_date";
                    if (info.IsNewer && notifyToastIfAvailable)
                    {
                        _updatePopupDismissed = false;
                    }
                    HomeWindow.NotifyStateChanged();
                    if (info.IsNewer && notifyToastIfAvailable)
                    {
                        HomeWindow.PostToPage(new
                        {
                            type = "update_available",
                            version = _updateVersion,
                            notes = _updateNotes
                        });
                    }
                    return;
                }

                _updateAvailable = false;
                _updateStatus = "up_to_date";
            }
            catch (Exception ex)
            {
                BrainController.Log("[Settings] Check update error: " + ex.Message);
                _updateAvailable = false;
                _updateStatus = "idle";
            }
            finally
            {
                HomeWindow.NotifyStateChanged();
            }
        }

        private static string CurrentVersion =>
            System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString(3);

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var settings = new Dictionary<string, object>();

            settings["petSize"] = Program.MyData.GetScale() == 1 ? "small" : "big";
            settings["sounds"] = SoundManager.Instance == null || SoundManager.Instance.SoundsEnabled;
            settings["autostart"] = AutoStart.IsEnabled;
            settings["notifyHarvest"] = brain == null || brain.NotifyHarvest;

            if (SoundManager.Instance != null)
            {
                settings["volume"] = (int)(SoundManager.Instance.Volume * 100);

                var qh = SoundManager.Instance.QuietHours;
                var qhObj = new Dictionary<string, object>();
                qhObj["enabled"] = qh.Enabled;
                qhObj["start"] = qh.Start.ToString(@"hh\:mm");
                qhObj["end"] = qh.End.ToString(@"hh\:mm");
                settings["quietHours"] = qhObj;

                settings["muteFullscreen"] = SoundManager.Instance.MuteOnFullScreen;
                settings["soundSuppressed"] = SoundManager.Instance.IsSoundSuppressed(out _);
            }

            var screens = System.Windows.Forms.Screen.AllScreens;
            var monitorList = new List<object>();
            for (int i = 0; i < screens.Length; i++)
            {
                var sc = screens[i];
                monitorList.Add(new
                {
                    index = i,
                    name = sc.DeviceName,
                    width = sc.Bounds.Width,
                    height = sc.Bounds.Height,
                    primary = sc.Primary
                });
            }
            settings["monitors"] = monitorList;
            settings["monitor"] = Program.MyData.GetMonitor();

            state["settings"] = settings;

            var update = new Dictionary<string, object>
            {
                { "available", _updateAvailable },
                { "version", _updateVersion },
                { "currentVersion", CurrentVersion },
                { "status", _updateStatus },
                { "notes", _updateNotes },
                { "downloadUrl", _updateDownloadUrl },
                { "progress", _updateProgress },
                { "downloading", _updateDownloading },
                { "popupDismissed", _updatePopupDismissed }
            };
            state["update"] = update;
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type == "settings_pet_size")
            {
                string size = message["size"]?.ToString();
                if (size != null)
                {
                    SetPetSize(size == "small" ? 1 : 2);
                }
                return true;
            }
            if (type == "settings_sounds")
            {
                bool? on = message["on"]?.ToObject<bool>();
                if (on.HasValue && SoundManager.Instance != null)
                {
                    SoundManager.Instance.SoundsEnabled = on.Value;
                }
                return true;
            }
            if (type == "settings_autostart")
            {
                bool? on = message["on"]?.ToObject<bool>();
                if (on.HasValue)
                {
                    if (on.Value)
                    {
                        AutoStart.Enable();
                    }
                    else
                    {
                        AutoStart.Disable();
                    }
                }
                return true;
            }
            if (type == "settings_volume")
            {
                int? value = message["value"]?.ToObject<int>();
                if (value.HasValue && value.Value >= 0 && value.Value <= 100 && SoundManager.Instance != null)
                {
                    SoundManager.Instance.Volume = value.Value / 100f;
                }
                return true;
            }
            if (type == "settings_quiet_hours")
            {
                bool? enabled = message["enabled"]?.ToObject<bool>();
                string startRaw = message["start"]?.ToString();
                string endRaw = message["end"]?.ToString();

                if (enabled.HasValue && startRaw != null && endRaw != null && SoundManager.Instance != null)
                {
                    if (Cuy.Core.Care.CareInput.TryTime(startRaw, out string startStr) && Cuy.Core.Care.CareInput.TryTime(endRaw, out string endStr))
                    {
                        if (TimeSpan.TryParse(startStr, out TimeSpan start) && TimeSpan.TryParse(endStr, out TimeSpan end))
                        {
                            SoundManager.Instance.SetQuietHours(enabled.Value, start, end);
                        }
                        else
                        {
                            BrainController.Log(string.Format("[Settings] ignored quiet_hours (invalid timespan): {0} - {1}", startRaw, endRaw));
                        }
                    }
                    else
                    {
                        BrainController.Log(string.Format("[Settings] ignored quiet_hours (invalid time format): {0} - {1}", startRaw, endRaw));
                    }
                }
                return true;
            }
            if (type == "settings_notify_harvest")
            {
                bool? on = message["on"]?.ToObject<bool>();
                if (on.HasValue && brain != null)
                {
                    brain.NotifyHarvest = on.Value;
                }
                return true;
            }
            if (type == "settings_mute_fullscreen")
            {
                bool? on = message["on"]?.ToObject<bool>();
                if (on.HasValue && SoundManager.Instance != null)
                {
                    SoundManager.Instance.MuteOnFullScreen = on.Value;
                }
                return true;
            }
            if (type == "dismiss_update_popup")
            {
                _updatePopupDismissed = true;
                HomeWindow.NotifyStateChanged();
                return true;
            }
            if (type == "check_update" || type == "settings_check_update")
            {
                if (message != null && (message["mock"]?.ToObject<bool>() == true || message["force_available"]?.ToObject<bool>() == true))
                {
                    _updateAvailable = true;
                    _updateVersion = "1.1.0";
                    _updateNotes = "Performance improvements and bug fixes.";
                    _updateStatus = "available";
                    _updatePopupDismissed = false;
                    HomeWindow.NotifyStateChanged();
                    return true;
                }

                _updateStatus = "checking";
                HomeWindow.NotifyStateChanged();
                Task.Run(() => RunUpdateCheckAsync(clearCache: true, notifyToastIfAvailable: false));
                return true;
            }
            if (type == "apply_update" || type == "settings_apply_update")
            {
                if (_updateDownloading) return true;
                _updateDownloading = true;
                _updateProgress = 0;
                _updateStatus = "downloading";
                HomeWindow.NotifyStateChanged();

                Task.Run(async () =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(_updateDownloadUrl))
                        {
                            var info = await Cuy.Core.Platform.UpdateChecker
                                .CheckForUpdateAsync(CurrentVersion, "olubiec/swinka")
                                .ConfigureAwait(false);
                            if (info != null && !string.IsNullOrEmpty(info.DownloadUrl))
                            {
                                _updateDownloadUrl = info.DownloadUrl;
                            }
                        }

                        if (string.IsNullOrEmpty(_updateDownloadUrl))
                        {
                            _updateDownloading = false;
                            _updateStatus = "available";
                            HomeWindow.NotifyStateChanged();
                            HomeWindow.PostToPage(new { type = "toast", text = "No update package found in release." });
                            return;
                        }

                        var progress = new Progress<int>(pct =>
                        {
                            if (pct != _updateProgress)
                            {
                                _updateProgress = pct;
                                HomeWindow.NotifyStateChanged();
                            }
                        });

                        string zipPath = await Cuy.Platform.UpdateApplier
                            .DownloadUpdateAsync(_updateDownloadUrl, progress)
                            .ConfigureAwait(false);

                        _updateStatus = "applying";
                        HomeWindow.NotifyStateChanged();

                        bool started = Cuy.Platform.UpdateApplier.ApplyAndRestart(zipPath, AppDomain.CurrentDomain.BaseDirectory);
                        if (!started)
                        {
                            _updateDownloading = false;
                            _updateStatus = "available";
                            HomeWindow.NotifyStateChanged();
                            HomeWindow.PostToPage(new { type = "toast", text = "Could not launch updater script." });
                        }
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log("[Settings] Apply update error: " + ex.Message);
                        _updateDownloading = false;
                        _updateStatus = "available";
                        HomeWindow.NotifyStateChanged();
                        HomeWindow.PostToPage(new { type = "toast", text = "Update failed: " + ex.Message });
                    }
                });

                return true;
            }

            if (type == "settings_reset_confirmed")
            {
                BrainController.Log("[Settings] Reset confirmed by user.");
                var saveSystem = brain?.Session?.SaveSystem ?? new Cuy.Core.Save.SaveSystem();
                saveSystem.RequestReset();
                HomeWindow.PostToPage(new { type = "toast", text = "Cuy closes now. Start it again to meet your new pig." });

                Task.Run(async () =>
                {
                    await Task.Delay(1500).ConfigureAwait(false);
                    try
                    {
                        BrainController.Instance?.Close();
                    }
                    catch (Exception ex) { BrainController.Log("[WARN] Settings.Reset close: " + ex.Message); }
                    Program.Mainthread?.KillPets(true);
                });

                return true;
            }

            return false;
        }

        public static void SetPetSize(int newScale)
        {
            if (newScale != Program.MyData.GetScale())
            {
                Program.MyData.SetScale(newScale);
                BrainController.Log(string.Format("[Settings] Pet size -> {0}", newScale == 1 ? "Small" : "Big"));
                Program.Mainthread?.ReloadSize();
            }
        }
    }
}
