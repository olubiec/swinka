using System;
using System.Collections.Generic;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml.Serialization;

namespace Cuy
{
    /// <summary>
    /// LocalData for the portable version.
    /// Todo: Create an interface (Portable + Store version)
    /// </summary>
    public class LocalData
    {
        Configuration AppConfiguration = null;
        KeyValueConfigurationCollection AppSettings = null;
		readonly bool isInstalled = false;

        /// <summary>
        /// Keys for valid Application Settings
        /// </summary>
        public static class SettingName
        {
            /// <summary>
            /// If Undefined is set, no Setting will be modified
            /// </summary>
            public const string Undefined = "";
            /// <summary>
            /// Volume-Key
            /// </summary>
            public const string Volume = "Volume";
            /// <summary>
            /// Pet-Scaling-Key
            /// </summary>
            public const string PetScale = "Scale";
            /// <summary>
            /// Multiscreen-Key
            /// </summary>
			public const string Multiscreen = "Multiscreen";
            /// <summary>
            /// Window To Foreground-Key
            /// </summary>
            public const string WinForeground = "WinForeground";
            /// <summary>
            /// Steal Taskbar-Key
            /// </summary>
            public const string StealTaskbarFocus = "StealTaskbarFocus";
            /// <summary>
            /// Autostart Pets when application starts - Key
            /// </summary>
			public const string AutostartPets = "AutostartPets";
            /// <summary>
            /// Smooth animations-Key
            /// </summary>
			public const string SmoothMovements = "Smooth";
            /// <summary>
            /// Sounds on/off-Key
            /// </summary>
			public const string SoundsEnabled = "SoundsEnabled";
            /// <summary>
            /// Quiet hours enabled
            /// </summary>
            public const string QuietHoursEnabled = "QuietHoursEnabled";
            /// <summary>
            /// Quiet hours start
            /// </summary>
            public const string QuietHoursStart = "QuietHoursStart";
            /// <summary>
            /// Quiet hours end
            /// </summary>
            public const string QuietHoursEnd = "QuietHoursEnd";
            /// <summary>
            /// Mute on full screen
            /// </summary>
            public const string MuteFullscreen = "MuteFullscreen";
            /// <summary>
            /// Disabled behaviors
            /// </summary>
            public const string DisabledBehaviors = "DisabledBehaviors";
		};

		/// <summary>
		/// Initializes a new instance of the <see cref="LocalData"/> class.
		/// </summary>
		public LocalData()
        {
			try
            {
				string configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Cuy");
				if (!Directory.Exists(configDir))
					Directory.CreateDirectory(configDir);

				string configFile = Path.Combine(configDir, "cuy.config");
				AppConfiguration = ConfigurationManager.OpenMappedExeConfiguration(
					new ExeConfigurationFileMap { ExeConfigFilename = configFile }, ConfigurationUserLevel.None);

				LoadSettings();
            }
            catch(Exception ex)
            {
                MessageBox.Show("Error opening settings: " + ex.Message, "Settings", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

		/// <summary>
		/// Loads the settings from the configuration file (if installed, the cofiguration is in the user data folder)
		/// </summary>
		public void LoadSettings()
        {
            //var settings = AppConfiguration.AppSettings.Settings;
            foreach (SettingsProperty currentProperty in Properties.Settings.Default.Properties)
            {
                if (AppConfiguration.AppSettings.Settings[currentProperty.Name] == null)
                {
                    AppConfiguration.AppSettings.Settings.Add(currentProperty.Name, currentProperty.DefaultValue.ToString());
                }
            }
            AppSettings = AppConfiguration.AppSettings.Settings;
        }

        public IEnumerable<string> GetDisabledBehaviors()
        {
            if (AppSettings.AllKeys.Contains(SettingName.DisabledBehaviors) && AppSettings[SettingName.DisabledBehaviors] != null)
            {
                string val = AppSettings[SettingName.DisabledBehaviors].Value;
                if (!string.IsNullOrEmpty(val))
                {
                    return val.Split(',');
                }
            }
            return new string[0];
        }

        public void SetDisabledBehaviors(IEnumerable<string> disabled)
        {
            string val = string.Join(",", disabled ?? new string[0]);
            if (AppSettings.AllKeys.Contains(SettingName.DisabledBehaviors) && AppSettings[SettingName.DisabledBehaviors] != null)
            {
                if (AppSettings[SettingName.DisabledBehaviors].Value != val)
                {
                    AppSettings[SettingName.DisabledBehaviors].Value = val;
                    try { Properties.Settings.Default["DisabledBehaviors"] = val; } catch { }
                    Save();
                }
            }
            else
            {
                AppSettings.Add(SettingName.DisabledBehaviors, val);
                try { Properties.Settings.Default["DisabledBehaviors"] = val; } catch { }
                Save();
            }
        }

		/// <summary>
		/// Set FX-Sound volume (0.0 - 1.0)
		/// </summary>
		/// <param name="volume">Value from 0 to 1.0</param>
		public void SetVolume(double volume)
        {
            int iVolume = (int)(volume * 100);
            if (iVolume.ToString() != AppSettings[SettingName.Volume].Value)
            {
                Properties.Settings.Default.Volume = iVolume;
                AppSettings[SettingName.Volume].Value = iVolume.ToString();
                Save();
            }
        }

		/// <summary>
		/// Get the FX-Sound volume (0.0 - 1.0)
		/// </summary>
		/// <returns>Value from 0 for no sound to 1.0 for full sound</returns>
		public float GetVolume()
        {
            string raw = AppSettings[SettingName.Volume].Value;
            if (int.TryParse(raw, out int iVolume)) return (float)(iVolume / 100.0);
            // The default value is a fraction such as "0.6"
            if (float.TryParse(raw, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float fraction))
                return Math.Max(0f, Math.Min(1f, fraction));
            return 0.6f;
        }

        /// <summary>
        /// Sounds on/off (the tray menu item "Sounds"). Default: on.
        /// </summary>
        public bool GetSoundsEnabled()
        {
            return !bool.TryParse(AppSettings[SettingName.SoundsEnabled].Value, out bool on) || on;
        }

        public void SetSoundsEnabled(bool on)
        {
            if (on.ToString() != AppSettings[SettingName.SoundsEnabled].Value)
            {
                Properties.Settings.Default.SoundsEnabled = on;
                AppSettings[SettingName.SoundsEnabled].Value = on.ToString();
                Save();
            }
        }

        public void GetQuietHours(out bool enabled, out TimeSpan start, out TimeSpan end)
        {
            enabled = true;
            if (AppSettings[SettingName.QuietHoursEnabled] != null)
            {
                if (bool.TryParse(AppSettings[SettingName.QuietHoursEnabled].Value, out bool val))
                {
                    enabled = val;
                }
            }

            start = new TimeSpan(22, 0, 0);
            if (AppSettings[SettingName.QuietHoursStart] != null)
            {
                if (TimeSpan.TryParse(AppSettings[SettingName.QuietHoursStart].Value, out TimeSpan s))
                {
                    start = s;
                }
            }

            end = new TimeSpan(7, 0, 0);
            if (AppSettings[SettingName.QuietHoursEnd] != null)
            {
                if (TimeSpan.TryParse(AppSettings[SettingName.QuietHoursEnd].Value, out TimeSpan e))
                {
                    end = e;
                }
            }
        }

        public void SetQuietHours(bool enabled, TimeSpan start, TimeSpan end)
        {
            bool changed = false;

            if (enabled.ToString() != AppSettings[SettingName.QuietHoursEnabled]?.Value)
            {
                Properties.Settings.Default["QuietHoursEnabled"] = enabled;
                if (AppSettings[SettingName.QuietHoursEnabled] != null) AppSettings[SettingName.QuietHoursEnabled].Value = enabled.ToString();
                changed = true;
            }

            string sStr = start.ToString(@"hh\:mm");
            if (sStr != AppSettings[SettingName.QuietHoursStart]?.Value)
            {
                Properties.Settings.Default["QuietHoursStart"] = sStr;
                if (AppSettings[SettingName.QuietHoursStart] != null) AppSettings[SettingName.QuietHoursStart].Value = sStr;
                changed = true;
            }

            string eStr = end.ToString(@"hh\:mm");
            if (eStr != AppSettings[SettingName.QuietHoursEnd]?.Value)
            {
                Properties.Settings.Default["QuietHoursEnd"] = eStr;
                if (AppSettings[SettingName.QuietHoursEnd] != null) AppSettings[SettingName.QuietHoursEnd].Value = eStr;
                changed = true;
            }

            if (changed)
            {
                Save();
            }
        }

        public bool GetMuteFullscreen()
        {
            if (AppSettings[SettingName.MuteFullscreen] != null)
            {
                if (bool.TryParse(AppSettings[SettingName.MuteFullscreen].Value, out bool on))
                {
                    return on;
                }
            }
            return true;
        }

        public void SetMuteFullscreen(bool on)
        {
            if (on.ToString() != AppSettings[SettingName.MuteFullscreen]?.Value)
            {
                Properties.Settings.Default["MuteFullscreen"] = on;
                if (AppSettings[SettingName.MuteFullscreen] != null) AppSettings[SettingName.MuteFullscreen].Value = on.ToString();
                Save();
            }
        }

		/// <summary>
		/// Set the sprite scale factor of the pet (1 or 2).
		/// </summary>
		/// <param name="scaleFactor">Integer sprite scale (1 = small, 2 = big)</param>
		public void SetScale(int scaleFactor)
        {
            if (scaleFactor.ToString() != AppSettings[SettingName.PetScale].Value)
            {
                Properties.Settings.Default.Scale = scaleFactor;
                AppSettings[SettingName.PetScale].Value = scaleFactor.ToString();
                Save();
            }
        }
        /// <summary>
        /// Get the current integer sprite scale factor of the pet (1 or 2).
        /// If the setting has never been written, it defaults to 2 if the primary screen's WorkingArea.Height >= 900 physical pixels, else 1.
        /// </summary>
        /// <returns>Integer sprite scale</returns>
        public int GetScale()
        {
            if (int.TryParse(AppSettings[SettingName.PetScale].Value, out int iScale))
            {
                // In case an old save has 0 (from the old power of 2 format), convert it to 1.
                return iScale == 0 ? 1 : iScale;
            }
            // New install: setting has never been written. Determine default based on screen height.
            int defaultScale = System.Windows.Forms.Screen.PrimaryScreen.WorkingArea.Height >= 900 ? 2 : 1;
            SetScale(defaultScale);
            return defaultScale;
        }

        /// <summary>
        /// If multiscreen is enable in the option
        /// </summary>
        /// <returns>true, if multiscreen is enabled and the pet should move between screens</returns>
        public bool GetMultiscreen()
        {
            bool.TryParse(AppSettings[SettingName.Multiscreen].Value, out bool ret);
            return ret;
        }

		/// <summary>
		/// Set if the pet should move between screens (multiscreen)
		/// </summary>
		/// <param name="multi">true, if you want to see the pet moving over 2 screens</param>
		public void SetMultiscreen(bool multi)
        {
            if (multi.ToString() != AppSettings[SettingName.Multiscreen].Value)
            {
                Properties.Settings.Default.Multiscreen = multi;
                AppSettings[SettingName.Multiscreen].Value = multi.ToString();
                Save();
            }
        }

        /// <summary>
        /// If foreground is set in the options.
        /// </summary>
        /// <returns>true, if the pet should be in the foreground</returns>
        public bool GetWindowForeground()
        {
            bool.TryParse(AppSettings[SettingName.WinForeground].Value, out bool ret);
            return ret;
        }

		/// <summary>
		/// Set if the pet should be in the foreground (always on top)
		/// </summary>
		/// <param name="foreground">true, if the pet should be in the foreground</param>
		public void SetWindowForeground(bool foreground)
        {
            if (foreground.ToString() != AppSettings[SettingName.WinForeground].Value)
            {
                Properties.Settings.Default.WinForeground = foreground;
                AppSettings[SettingName.WinForeground].Value = foreground.ToString();
                Save();
            }
        }

		/// <summary>
		/// Taskbar has a high priority for the focus, so the pet will go to background on it. If this option is set, the pet will steal the focus from the taskbar and will be in the foreground.
        /// Note: this will have strange effects on Windows.
		/// </summary>
		/// <param name="steal">true, if the pet should steal the taskbar focus</param>
		public void SetStealTaskbarFocus(bool steal)
        {
            if (steal.ToString() != AppSettings[SettingName.StealTaskbarFocus].Value)
            {
                Properties.Settings.Default.WinForeground = steal;
                AppSettings[SettingName.StealTaskbarFocus].Value = steal.ToString();
                Save();
            }
        }

		/// <summary>
		/// Get if the pet should steal the taskbar focus. If this option is set, the pet will steal the focus from the taskbar and will be in the foreground.
		/// </summary>
		/// <returns>true, if the pet should steal the taskbar focus</returns>
		public bool GetStealTaskbarFocus()
        {
            bool.TryParse(AppSettings[SettingName.StealTaskbarFocus].Value, out bool ret);
            return ret;
        }

		/// <summary>
		/// Get the number of pets that should be started automatically. The default is 1.
		/// </summary>
		/// <returns>the number of pets to start automatically</returns>
		public int GetAutoStartPets()
        {
            return 1;
        }

		/// <summary>
		/// Set the number of pets that should be started automatically. The default is 1.
		/// </summary>
		/// <param name="autostart">the number of pets to start automatically</param>
		public void SetAutoStartPets(int autostart)
        {
            if (autostart.ToString() != AppSettings[SettingName.AutostartPets].Value)
            {
                Properties.Settings.Default.AutostartPets = autostart;
                AppSettings[SettingName.AutostartPets].Value = autostart.ToString();
                Save();
            }
        }

        /// <summary>
        /// If the Movements of the pet should be smooth
        /// </summary>
        /// <returns>true, if movements should be smoother</returns>
        public bool GetSmoothMovements()
        {
			bool.TryParse(AppSettings[SettingName.SmoothMovements].Value, out bool ret);
			return ret;
		}

		/// <summary>
		/// To "serialize" the settings, every setting can be retrieved as integer
		/// </summary>
		/// <param name="setting">Name of the setting, <see cref="SettingName"/></param>
		/// <returns>Value of the setting, or 0</returns>
		public int GetIntValue(string setting)
        {
            if(AppSettings.AllKeys.Contains(setting) && setting != SettingName.Undefined)
            {
                if (AppSettings[setting] == null) // If setting is not present in the local machine, create it
                {
                    AppSettings.Add(setting, "0");
                }

                if(int.TryParse(AppSettings[setting].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int ret1))
                {
                    return ret1;
                }
				else if (float.TryParse(AppSettings[setting].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out float ret3))
				{
					return (int)(ret3 * 100);
				}
				else if(bool.TryParse(AppSettings[setting].Value, out bool ret2))
                {
                    return (ret2 ? 1 : 0);
                }
            }
            return 0;
        }

		/// <summary>
		/// Set a setting with key and value
		/// </summary>
		/// <param name="setting">Name of the setting, <see cref="SettingName"/></param>
		/// <param name="value">integer Value of the setting (checkbox: 0 or 1), (combobox:one of the values in the list)</param>
		/// <returns>true if setting was set successfully</returns>
		public bool SetIntValue(string setting, int value)
        {
			if (AppSettings.AllKeys.Contains(setting) && setting != SettingName.Undefined)
			{
				if (int.TryParse(AppSettings[setting].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int ret1))
				{
                    try
                    {
                        Properties.Settings.Default[setting] = value;
                    }
                    catch(Exception)
                    {
						Properties.Settings.Default[setting] = (float)value; // we have floats and int (both can be parsed as int, but must be saved separately)
					}
					AppSettings[setting].Value = value.ToString(CultureInfo.InvariantCulture);
					Save();
					return true;
				}
				else if (bool.TryParse(AppSettings[setting].Value, out bool ret2))
				{
					Properties.Settings.Default[setting] = (value > 0);
					AppSettings[setting].Value = ((bool)(value > 0)).ToString(CultureInfo.InvariantCulture);
					Save();
					return true;
				}
			}
            return false;
		}

		/// <summary>
		/// Set the XML data for the pet. The XML is a string containing the entire pet animation.
		/// </summary>
		/// <param name="xml">xml as string</param>
		/// <param name="folder">is not used yet (should be removed)</param>
		public void SetXml(string xml, string folder)
        {
            Properties.Settings.Default.xml = xml;
            AppSettings["xml"].Value = xml;
            Save();
        }

		/// <summary>
		/// The XML data for the pet. The XML is a string containing the entire pet animation.
		/// </summary>
		/// <returns>xml as string</returns>
		public string GetXml()
        {
#if PORTABLE
            string localXml = Path.Combine(Application.StartupPath, "animations.xml");
            if (File.Exists(localXml))
            {
                try
                {
                    string sXml = File.ReadAllText(localXml, System.Text.Encoding.UTF8);
                    if (!string.IsNullOrEmpty(sXml))
                    {
                        if (AppSettings["xml"] == null || AppSettings["xml"].Value != sXml)
                        {
                            SetXml(sXml, "");
                        }
                        return sXml;
                    }
                }
                catch (Exception ex) { BrainController.Log("[WARN] LocalData.GetXml: " + ex.Message); }
            }
#endif
            return AppSettings["xml"].Value;
        }

		/// <summary>
		/// Load the XML data for the pet. The XML is a string containing the entire pet animation. The XML can be loaded from a local file, a web URL or from the settings.
		/// </summary>
		/// <returns>xml as string</returns>
		public string LoadXML()
        {
            //XmlSerializer mySerializer = new XmlSerializer(typeof(XmlData.RootNode));
            // To read the file, create a FileStream.
            MemoryStream stream = new MemoryStream();
            StreamWriter writer = new StreamWriter(stream);

#if PORTABLE
            string localFile = Path.Combine(Application.StartupPath, "animations.xml");
            if (File.Exists(localFile))
            {
                string sXML = File.ReadAllText(localFile, System.Text.Encoding.UTF8);
                writer.Write(sXML);
                SetXml(sXML, "");
                return sXML;
            }
            else if (Program.ArgumentLocalXML != "")
            {
                string sXML = System.Text.Encoding.Default.GetString(File.ReadAllBytes(Program.ArgumentLocalXML));
                writer.Write(sXML);
                return sXML;
            }
            else
#endif
            {
                writer.Write(AppSettings["xml"].Value);
                return AppSettings["xml"].Value;
            }
        }

		/// <summary>
		/// Get the images from the pets.
		/// </summary>
		/// <returns>a base64 encoded string of the images</returns>
		public string GetImages()
        {
            return AppSettings["Images"].Value;
        }

		/// <summary>
		/// Set the images for the pets. The images are stored as a base64 encoded string.
		/// </summary>
		/// <param name="images">a base64 encoded string of the images</param>
		public void SetImages(string images)
        {
            Properties.Settings.Default.Images = images;
            AppSettings["Images"].Value = images;
            //Save();
        }

		/// <summary>
		/// Get the icon for the application. The icon is stored as a base64 encoded string.
		/// </summary>
		/// <returns>a base64 encoded string of the icon</returns>
		public string GetIcon()
        {
            return AppSettings["Icon"].Value;
        }

		/// <summary>
		/// Set the icon for the application. The icon is stored as a base64 encoded string.
		/// </summary>
		/// <param name="icon">a base64 encoded string of the icon</param>
		public void SetIcon(string icon)
        {
            Properties.Settings.Default.Icon = icon;
            AppSettings["Icon"].Value = icon;
            //Save();
        }

		/// <summary>
		/// Check if this is the first boot of the application. This is not implemented in the portable version.
		/// </summary>
		/// <returns>always returns false</returns>
		public bool IsFirstBoot()
        {
            return false;
        }
		/// <summary>
		/// Can list for changes, to reload the XML or the options. This is not implemented in the portable version.
		/// </summary>
		/// <param name="source"></param>
		/// <param name="e"></param>
		public delegate void MyFunction(object source, FileSystemEventArgs e);

		/// <summary>
		/// Listen for changes in the XML file. This is not implemented in the portable version.
		/// </summary>
		/// <param name="f"></param>
		public void ListenOnXMLChanged(MyFunction f)
        {
            // not implemented in the portable version
        }

		/// <summary>
		/// Listen for changes in the options. This is not implemented in the portable version.
		/// </summary>
		/// <param name="f"></param>
		public void ListenOnOptionsChanged(MyFunction f)
        {
            // not implemented in the portable version
        }

        /// <summary>
        /// Save the settings in the option dialog.
        /// </summary>
        private void Save()
        {
            try
            {
                if (isInstalled)
                {
                    Properties.Settings.Default.Save();
                    AppConfiguration?.Save();
                }
                else
                {
                    AppConfiguration?.Save();
                }
            }
            catch (Exception ex) { BrainController.Log("[WARN] LocalData.Save: " + ex.Message); }
        }
    }
}
