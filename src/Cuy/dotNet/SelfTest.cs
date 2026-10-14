using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Web.WebView2.Core;
using NAudio.Wave;
using Newtonsoft.Json.Linq;

namespace Cuy
{
    /// <summary>
    /// Cuy.exe --selftest: checks that the data, sprites, icons, sounds, WebView2 and the save folder are usable.
    /// Opens no windows. Writes "PASS name" / "FAIL name: reason" to %TEMP%\cuy-selftest.txt and to the parent console.
    /// </summary>
    internal static class SelfTest
    {
        private const int FrameSize = 64;
        private const int SheetWidth = 16 * FrameSize;
        private const int SheetHeight = 60 * FrameSize;

        [DllImport("kernel32.dll")]
        private static extern bool AttachConsole(int dwProcessId);

        private static readonly List<string> Lines = new List<string>();
        private static bool _failed;
        private static string _assets;

        /// <summary>Returns the process exit code: 0 if every check passed, otherwise 1.</summary>
        public static int Run()
        {
            Lines.Clear();
            _failed = false;
            _assets = FindAssets();

            Check("assets folder", () =>
            {
                if (_assets == null) throw new Exception("not found next to the exe");
            });
            Check("actions.json", () => ParseData("actions.json"));
            Check("items.json", () => ParseData("items.json"));
            Check("actions animations", CheckActionAnimations);
            Check("sprite sheets", CheckSpriteSheets);
            Check("icons.json", () => ParseIcons());
            Check("icons_16.png", () =>
            {
                using (var bmp = new Bitmap(Path.Combine(_assets, "icons", "icons_16.png")))
                {
                    if (bmp.Width < 16 || bmp.Height < 16 || bmp.Width % 16 != 0 || bmp.Height % 16 != 0)
                        throw new Exception("unexpected size " + bmp.Width + "x" + bmp.Height);
                }
            });
            Check("sounds", CheckSounds);
            Check("WebView2", () =>
            {
                string version = CoreWebView2Environment.GetAvailableBrowserVersionString();
                if (string.IsNullOrEmpty(version)) throw new Exception("runtime not installed");
                Lines.Add("     version " + version);
            });
            Check("save folder writable", CheckSaveFolder);

            Lines.Add(_failed ? "SELFTEST FAILED" : "SELFTEST OK");
            Output();
            return _failed ? 1 : 0;
        }

        private static void Check(string name, Action test)
        {
            try
            {
                test();
                Lines.Add("PASS " + name);
            }
            catch (Exception ex)
            {
                _failed = true;
                Lines.Add("FAIL " + name + ": " + ex.Message);
            }
        }

        private static void Output()
        {
            try { File.WriteAllLines(Path.Combine(Path.GetTempPath(), "cuy-selftest.txt"), Lines.ToArray()); }
            catch (Exception) { }

            try
            {
                AttachConsole(-1);
                using (var writer = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true })
                {
                    foreach (string line in Lines) writer.WriteLine(line);
                }
            }
            catch (Exception) { }
        }

        private static string FindAssets()
        {
            DirectoryInfo dir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
            while (dir != null)
            {
                string candidate = Path.Combine(dir.FullName, "assets");
                if (Directory.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }
            return null;
        }

        private static JObject ParseData(string file)
        {
            return JObject.Parse(File.ReadAllText(Path.Combine(_assets, "data", file)));
        }

        private static void ParseIcons()
        {
            JObject icons = JObject.Parse(File.ReadAllText(Path.Combine(_assets, "icons", "icons.json")));
            if (icons["icons"] == null) throw new Exception("no \"icons\" key");
        }

        private static void CheckActionAnimations()
        {
            JObject animations = JObject.Parse(File.ReadAllText(Path.Combine(_assets, "sprites", "baby", "animations.json")));
            var known = new HashSet<string>();
            foreach (var p in ((JObject)animations["animations"]).Properties()) known.Add(p.Name);

            JObject data = ParseData("actions.json");
            var missing = new List<string>();
            foreach (JToken action in (JArray)data["actions"])
            {
                string name = (string)action["animation"];
                if (name != null && !known.Contains(name)) missing.Add(name);
            }
            if (missing.Count > 0) throw new Exception("missing in baby/animations.json: " + string.Join(", ", missing));
        }

        private static void CheckSpriteSheets()
        {
            string sprites = Path.Combine(_assets, "sprites");
            int count = 0;
            foreach (string dir in Directory.GetDirectories(sprites))
            {
                string sheet = Path.Combine(dir, "spritesheet.png");
                if (!File.Exists(sheet)) continue;
                using (var bmp = new Bitmap(sheet))
                {
                    if (bmp.Width != SheetWidth || bmp.Height != SheetHeight)
                        throw new Exception(Path.GetFileName(dir) + " is " + bmp.Width + "x" + bmp.Height
                            + ", expected " + SheetWidth + "x" + SheetHeight);
                }
                count++;
            }
            if (count == 0 || !File.Exists(Path.Combine(sprites, "baby", "spritesheet.png")))
                throw new Exception("baby/spritesheet.png not found");
        }

        private static void CheckSounds()
        {
            string[] files = Directory.GetFiles(Path.Combine(_assets, "sounds"), "*.wav");
            if (files.Length == 0) throw new Exception("no sound files");
            foreach (string file in files)
            {
                try
                {
                    using (var reader = new WaveFileReader(file))
                    {
                        if (reader.TotalTime <= TimeSpan.Zero) throw new Exception("empty");
                    }
                }
                catch (Exception ex)
                {
                    throw new Exception(Path.GetFileName(file) + ": " + ex.Message);
                }
            }
        }

        private static void CheckSaveFolder()
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Cuy");
            Directory.CreateDirectory(dir);
            string probe = Path.Combine(dir, "selftest.tmp");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
        }
    }
}
