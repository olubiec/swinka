using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using Cuy.Core;

namespace Cuy.Features
{
    public class SettingsFeature : HomeFeatureBase
    {
        public override string Id => "settings";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var settings = new Dictionary<string, object>();

            settings["petSize"] = Program.MyData.GetScale() == 1 ? "small" : "big";
            settings["sounds"] = SoundManager.Instance == null || SoundManager.Instance.SoundsEnabled;
            settings["autostart"] = AutoStart.IsEnabled;

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

            state["settings"] = settings;
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
            if (type == "settings_mute_fullscreen")
            {
                bool? on = message["on"]?.ToObject<bool>();
                if (on.HasValue && SoundManager.Instance != null)
                {
                    SoundManager.Instance.MuteOnFullScreen = on.Value;
                }
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
