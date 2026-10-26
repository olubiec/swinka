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
