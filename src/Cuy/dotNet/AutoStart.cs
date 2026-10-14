using System;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Cuy
{
    /// <summary>
    /// "Start with Windows": the value "Cuy" in HKCU\Software\Microsoft\Windows\CurrentVersion\Run
    /// holds the quoted full path of this exe.
    /// </summary>
    public static class AutoStart
    {
        private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string ValueName = "Cuy";

        private static string ExpectedValue
        {
            get { return "\"" + Application.ExecutablePath + "\""; }
        }

        public static bool IsEnabled
        {
            get { return StoredValue() != null; }
        }

        public static void Enable()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(RunKeyPath))
                {
                    key.SetValue(ValueName, ExpectedValue, RegistryValueKind.String);
                }
            }
            catch (Exception ex) { BrainController.Log("[WARN] AutoStart.Enable: " + ex.Message); }
        }

        public static void Disable()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKeyPath, true))
                {
                    key?.DeleteValue(ValueName, false);
                }
            }
            catch (Exception ex) { BrainController.Log("[WARN] AutoStart.Disable: " + ex.Message); }
        }

        /// <summary>If enabled and the stored path is not this exe (the folder was moved), rewrites it.</summary>
        public static void RefreshPath()
        {
            string stored = StoredValue();
            if (stored != null && !string.Equals(stored, ExpectedValue, StringComparison.OrdinalIgnoreCase))
            {
                BrainController.Log("[AutoStart] Updating the stored path to " + ExpectedValue);
                Enable();
            }
        }

        private static string StoredValue()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKeyPath, false))
                {
                    return key?.GetValue(ValueName) as string;
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] AutoStart.StoredValue: " + ex.Message);
                return null;
            }
        }
    }
}
