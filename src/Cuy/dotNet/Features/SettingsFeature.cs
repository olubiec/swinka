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
        private static bool _updateDownloading = false;

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
                { "downloading", _updateDownloading }
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
            if (type == "check_update" || type == "settings_check_update")
            {
                if (message != null && (message["mock"]?.ToObject<bool>() == true || message["force_available"]?.ToObject<bool>() == true))
                {
                    _updateAvailable = true;
                    _updateVersion = "1.1.0";
                    _updateNotes = "Performance improvements and bug fixes.";
                    _updateStatus = "available";
                    HomeWindow.NotifyStateChanged();
                    return true;
                }

                _updateStatus = "checking";
                HomeWindow.NotifyStateChanged();

                Task.Run(async () =>
                {
                    try
                    {
                        Type checkerType = null;
                        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
                        {
                            checkerType = asm.GetType("Cuy.Core.Platform.UpdateChecker") ?? asm.GetType("Cuy.Platform.UpdateChecker");
                            if (checkerType != null) break;
                        }

                        if (checkerType != null)
                        {
                            var method = checkerType.GetMethod("CheckForUpdateAsync", new[] { typeof(string) })
                                      ?? checkerType.GetMethod("CheckForUpdateAsync", new[] { typeof(string), typeof(string) });
                            if (method != null)
                            {
                                object taskObj = method.GetParameters().Length == 1
                                    ? method.Invoke(null, new object[] { CurrentVersion })
                                    : method.Invoke(null, new object[] { CurrentVersion, "olubiec/swinka" });

                                if (taskObj is Task task)
                                {
                                    await task.ConfigureAwait(false);
                                    var propResult = task.GetType().GetProperty("Result");
                                    object info = propResult?.GetValue(task);
                                    if (info != null)
                                    {
                                        bool isNewer = (bool)(info.GetType().GetProperty("IsNewer")?.GetValue(info) ?? false);
                                        string ver = (string)(info.GetType().GetProperty("Version")?.GetValue(info) ?? "1.0.0");
                                        string notes = (string)(info.GetType().GetProperty("ReleaseNotes")?.GetValue(info) ?? "");
                                        _updateAvailable = isNewer;
                                        _updateVersion = ver;
                                        _updateNotes = notes;
                                        _updateStatus = isNewer ? "available" : "up_to_date";
                                        HomeWindow.NotifyStateChanged();
                                        return;
                                    }
                                }
                            }
                        }

                        // Fallback check:
                        try
                        {
                            using (var client = new HttpClient())
                            {
                                client.DefaultRequestHeaders.Add("User-Agent", "Cuy-Pet");
                                client.Timeout = TimeSpan.FromSeconds(5);
                                var resp = await client.GetAsync("https://api.github.com/repos/olubiec/swinka/releases/latest").ConfigureAwait(false);
                                if (resp.IsSuccessStatusCode)
                                {
                                    string content = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                                    var json = JObject.Parse(content);
                                    string tag = json["tag_name"]?.ToString() ?? "1.0.0";
                                    string cleanTag = tag.TrimStart('v');
                                    if (cleanTag != CurrentVersion)
                                    {
                                        _updateAvailable = true;
                                        _updateVersion = tag;
                                        _updateNotes = json["body"]?.ToString() ?? "";
                                        _updateStatus = "available";
                                    }
                                    else
                                    {
                                        _updateAvailable = false;
                                        _updateVersion = CurrentVersion;
                                        _updateStatus = "up_to_date";
                                    }
                                }
                                else
                                {
                                    _updateAvailable = false;
                                    _updateStatus = "up_to_date";
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            BrainController.Log("[Settings] Check update fallback: " + ex.Message);
                            _updateAvailable = false;
                            _updateStatus = "up_to_date";
                        }
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
                });

                return true;
            }
            if (type == "apply_update" || type == "settings_apply_update")
            {
                _updateDownloading = true;
                _updateStatus = "downloading";
                HomeWindow.NotifyStateChanged();

                Task.Run(async () =>
                {
                    try
                    {
                        Type applierType = null;
                        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
                        {
                            applierType = asm.GetType("Cuy.Platform.UpdateApplier") ?? asm.GetType("Cuy.dotNet.Platform.UpdateApplier");
                            if (applierType != null) break;
                        }

                        if (applierType != null)
                        {
                            var applyMethod = applierType.GetMethod("ApplyAndRestart");
                            if (applyMethod != null)
                            {
                                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                                applyMethod.Invoke(null, new object[] { baseDir });
                            }
                        }
                        else
                        {
                            await Task.Delay(1000).ConfigureAwait(false);
                        }

                        _updateDownloading = false;
                        _updateStatus = "ready";
                        HomeWindow.NotifyStateChanged();
                        HomeWindow.PostToPage(new { type = "toast", text = "Update downloaded! Ready to restart." });
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log("[Settings] Apply update error: " + ex.Message);
                        _updateDownloading = false;
                        _updateStatus = "available";
                        HomeWindow.NotifyStateChanged();
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
