using System.Windows.Forms;
using System.Linq;
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
            Check("spritesheet", CheckSpriteSheetLoader);
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
            Check("data json", CheckDataJson);
            Check("item ids", CheckItemIds);
            Check("core data tables", CheckCoreDataTables);
            Check("music", CheckMusic);
            Check("coloring", CheckColoring);
            Check("features", CheckFeatures);
            Check("games", CheckGames);
            Check("icon indexes", CheckIconIndexes);
            Check("stage sheets", CheckStageSheets);
            Check("breed sheets", CheckBreedSheets);
            Check("palettes", CheckPalettes);
            CheckWebView2();
            Check("mouse shake detector", CheckMouseShake);
            Check("behaviors", CheckBehaviors);
            Check("save folder writable", CheckSaveFolder);
#if !DEBUG
            Check("release menu", CheckReleaseMenu);
#else
            Lines.Add("PASS release menu (skipped in Debug)");
#endif
            Check("runtime files", CheckRuntimeFiles);

            Lines.Add(_failed ? "SELFTEST FAILED" : "SELFTEST OK");
            Output();
            return _failed ? 1 : 0;
        }

        private static void Warn(string name, string message)
        {
            Lines.Add("WARN " + name + ": " + message);
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

                private static void CheckSpriteSheetLoader()
        {
            var missing = SpriteSheetLoader.Load("nonexistent_stage_xyz");
            if (missing != null) throw new Exception("expected null for nonexistent stage");

            string[] stages = { "baby", "junior", "adult", "senior", "legend" };
            foreach (var s in stages)
            {
                string sheetPath = Path.Combine(_assets, "sprites", s, "spritesheet.png");
                if (File.Exists(sheetPath))
                {
                    var frames = SpriteSheetLoader.Load(s);
                    if (frames == null || frames.Length == 0 || frames[0] == null)
                        throw new Exception("failed to load frames for stage " + s);
                }
            }
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

        private static void CheckMouseShake()
        {
            var d = new Cuy.Core.Input.MouseShakeDetector();
            int hits = 0;
            var t0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            for (int i = 0; i < 45; i++)
            {
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, t0.AddMilliseconds(i * 33))) hits++;
            }
            if (hits != 1) throw new Exception("zig-zag not flagged exactly once (hits: " + hits + ")");

            d.Reset();
            hits = 0;
            for (int i = 0; i < 45; i++)
            {
                int x = 500 + (i * 150 / 45);
                if (d.Push(x, 400, 100, t0.AddMilliseconds(i * 33))) hits++;
            }
            if (hits != 0) throw new Exception("straight line flagged");
        }

        private static void CheckBehaviors()
        {
            var host = new Cuy.Behaviors.BehaviorHost();
            if (!host.DisabledIds.Contains("sample")) throw new Exception("DisabledIds does not contain sample");
            host.DisabledIds.Remove("sample");

            var ctx = new Cuy.Behaviors.BehaviorContext(
                null, null, null, s => Cuy.BrainController.Log(s), false, false, a => false
            );
            host.Start(ctx);
            host.Tick(TimeSpan.FromSeconds(0.1));
            host.Stop();
        }

        private static void CheckSaveFolder()
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Cuy");
            Directory.CreateDirectory(dir);
            string probe = Path.Combine(dir, "selftest.tmp");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
        }

        private static void CheckWebView2()
        {
            try
            {
                string version = CoreWebView2Environment.GetAvailableBrowserVersionString();
                if (string.IsNullOrEmpty(version))
                {
                    Warn("WebView2", "runtime not installed (Home will not open)");
                }
                else
                {
                    Lines.Add("PASS WebView2");
                    Lines.Add("     version " + version);
                }
            }
            catch (Exception)
            {
                Warn("WebView2", "runtime not installed (Home will not open)");
            }
        }

        private static void CheckDataJson()
        {
            string dataDir = Path.Combine(_assets, "data");
            if (!Directory.Exists(dataDir)) throw new Exception("data dir missing");
            foreach (var f in Directory.GetFiles(dataDir, "*.json"))
            {
                try
                {
                    JToken.Parse(File.ReadAllText(f));
                }
                catch (Exception ex)
                {
                    throw new Exception(Path.GetFileName(f) + ": " + ex.Message);
                }
            }
        }

        private static void CheckItemIds()
        {
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            string[] files = { "items.json", "items_shop.json", "items_decor.json" };
            foreach (var file in files)
            {
                string path = Path.Combine(_assets, "data", file);
                if (!File.Exists(path)) continue;
                var root = JObject.Parse(File.ReadAllText(path));
                var items = root["items"] as JArray;
                if (items == null) continue;
                foreach (var it in items)
                {
                    string id = (string)it["id"];
                    if (string.IsNullOrEmpty(id)) continue;
                    if (!seen.Add(id))
                        throw new Exception("duplicate item id: " + id + " in " + file);
                }
            }
        }

        private static void CheckCoreDataTables()
        {
            if (Cuy.Core.Care.CareData.LoadDefault() == null) throw new Exception("care data failed to load");
            if (Cuy.Core.Economy.EconomyConfig.LoadDefault() == null) throw new Exception("economy config failed to load");
            if (new Cuy.Core.Health.HealthSystem() == null) throw new Exception("health data failed to load");
            if (Cuy.Core.BondUnlocks.LoadDefault() == null) throw new Exception("bond unlocks failed to load");
            if (Cuy.Core.Hay.HayConfig.LoadDefault() == null) throw new Exception("hay config failed to load");
            if (Cuy.Core.TricksConfig.LoadDefault() == null) throw new Exception("tricks config failed to load");
            if (Cuy.Core.Achievements.AchievementCatalog.LoadDefault() == null) throw new Exception("achievements catalog failed to load");
            if (Cuy.Core.Diary.DiaryWriter.LoadDefault() == null) throw new Exception("diary writer failed to load");
        }

        private static void CheckMusic()
        {
            string tracksPath = Path.Combine(_assets, "music", "tracks.json");
            if (!File.Exists(tracksPath)) throw new Exception("tracks.json missing");
            var arr = JArray.Parse(File.ReadAllText(tracksPath));
            foreach (var token in arr)
            {
                string rel = (string)token["file"];
                if (string.IsNullOrEmpty(rel)) throw new Exception("track missing file property");
                string fullPath = Path.Combine(_assets, rel.Replace('/', Path.DirectorySeparatorChar));
                if (!File.Exists(fullPath)) throw new Exception("missing music file: " + rel);
                var fi = new FileInfo(fullPath);
                if (fi.Length <= 10 * 1024) throw new Exception("music file under 10 KB: " + rel);
            }
        }

        private static void CheckColoring()
        {
            string idxPath = Path.Combine(_assets, "coloring", "index.json");
            if (!File.Exists(idxPath)) throw new Exception("coloring index.json missing");
            var root = JObject.Parse(File.ReadAllText(idxPath));
            var packs = root["packs"] as JArray;
            if (packs == null) throw new Exception("no packs array");
            foreach (var p in packs)
            {
                string packId = (string)p["id"];
                int count = (int)p["count"];
                string packFile = Path.Combine(_assets, "coloring", packId + ".json");
                if (!File.Exists(packFile)) throw new Exception("missing pack file: " + packId + ".json");
                var packRoot = JObject.Parse(File.ReadAllText(packFile));
                var pictures = packRoot["pictures"] as JArray;
                if (pictures == null || pictures.Count != count)
                    throw new Exception("picture count mismatch in pack " + packId);
                foreach (var pic in pictures)
                {
                    int w = (int)pic["w"];
                    int h = (int)pic["h"];
                    string cells = (string)pic["cells"];
                    if (cells == null || cells.Length != w * h)
                        throw new Exception("cells length mismatch in picture " + (string)pic["id"]);
                }
            }
        }

        private static void CheckFeatures()
        {
            string rootDir = Path.GetFullPath(Path.Combine(_assets, ".."));
            string featuresDir = Path.Combine(rootDir, "web", "home", "features");
            if (!Directory.Exists(featuresDir)) return;
            string idxFile = Path.Combine(featuresDir, "index.json");
            if (!File.Exists(idxFile)) throw new Exception("features/index.json missing");
            var ids = JArray.Parse(File.ReadAllText(idxFile)).Select(t => (string)t).ToList();
            var dirs = Directory.GetDirectories(featuresDir).Select(Path.GetFileName).ToList();
            foreach (var d in dirs)
            {
                if (!File.Exists(Path.Combine(featuresDir, d, "feature.js")))
                    throw new Exception("missing feature.js in " + d);
            }
            if (ids.Count != dirs.Count || ids.Except(dirs).Any())
                throw new Exception("feature ids mismatch between index.json and directories");
        }

        private static void CheckGames()
        {
            string rootDir = Path.GetFullPath(Path.Combine(_assets, ".."));
            string gamesJson = Path.Combine(rootDir, "web", "home", "minigames", "games.json");
            if (!File.Exists(gamesJson)) return;
            var arr = JArray.Parse(File.ReadAllText(gamesJson));
            var fileList = arr.Select(t => (string)t).ToList();
            string[] required = { "veggie-rain.js", "veggie-memory.js", "hay-maze.js" };
            foreach (var req in required)
            {
                if (!fileList.Contains(req))
                    throw new Exception("games.json does not list required minigame: " + req);
            }
            foreach (var f in fileList)
            {
                string fullPath = Path.Combine(rootDir, "web", "home", "minigames", f);
                if (!File.Exists(fullPath)) throw new Exception("missing minigame file: " + f);
            }
        }

#if !DEBUG
        private static void CheckReleaseMenu()
        {
            var menu = new ContextMenus().Create();
            string[] forbidden = { "clock", "debug", "diagnostics", "test" };
            void CheckItem(ToolStripItem item)
            {
                string text = item.Text ?? "";
                foreach (var f in forbidden)
                {
                    if (text.IndexOf(f, StringComparison.OrdinalIgnoreCase) >= 0)
                        throw new Exception("forbidden text in menu item: " + text);
                }
                if (item is ToolStripMenuItem tsmi)
                {
                    foreach (ToolStripItem sub in tsmi.DropDownItems)
                    {
                        CheckItem(sub);
                    }
                }
            }
            foreach (ToolStripItem item in menu.Items)
            {
                CheckItem(item);
            }
        }
#endif

        private static void CheckRuntimeFiles()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string jsonDll = Path.Combine(exeDir, "Newtonsoft.Json.dll");
            string naudioDll = Path.Combine(exeDir, "NAudio.dll");
            if (!File.Exists(jsonDll)) throw new Exception("Newtonsoft.Json.dll missing next to exe");
            if (!File.Exists(naudioDll)) throw new Exception("NAudio.dll missing next to exe");

            string readme = Path.Combine(exeDir, "README.txt");
            string notices = Path.Combine(exeDir, "THIRD_PARTY_NOTICES.md");
            string licenses = Path.Combine(exeDir, "assets", "LICENSES");

            if (!File.Exists(readme)) Warn("runtime files", "README.txt missing next to exe");
            if (!File.Exists(notices)) Warn("runtime files", "THIRD_PARTY_NOTICES.md missing next to exe");
            if (!Directory.Exists(licenses)) Warn("runtime files", "assets\\LICENSES folder missing next to exe");
        }

        private static void CheckBreedSheets()
        {
            string[] breeds = { "smooth", "chubby", "skinny", "rosette", "peruvian" };
            string[] stages = { "baby", "junior", "adult", "senior", "legend" };
            foreach (var breed in breeds)
            {
                foreach (var stage in stages)
                {
                    string path = Path.Combine(_assets, "sprites", SpriteSheetLoader.SheetFolder(stage, breed), "spritesheet.png");
                    if (!File.Exists(path)) throw new Exception("missing " + breed + "/" + stage);
                    using (var bmp = new Bitmap(path))
                    {
                        if (bmp.Width != 1024 || bmp.Height != 3840)
                            throw new Exception(breed + "/" + stage + " is " + bmp.Width + "x" + bmp.Height + ", expected 1024x3840");
                    }
                }
            }
        }

        private static void CheckPalettes()
        {
            var table = PaletteRemap.Table;
            string[] ids = { "tricolor", "dutch", "agouti", "albino", "cinnamon" };
            using (var probe = new Bitmap(4, 4))
            {
                foreach (var id in ids)
                {
                    if (!table.Has(id)) throw new Exception("palette missing: " + id);
                    using (var remapped = PaletteRemap.Apply(probe, id)) { }
                }
                using (var remapped = PaletteRemap.Apply(probe, "no-such-palette")) { }
            }
        }

        private static void CheckIconIndexes()
        {
            string iconsJson = Path.Combine(_assets, "icons", "icons.json");
            string iconsPng = Path.Combine(_assets, "icons", "icons_16.png");
            if (!File.Exists(iconsJson) || !File.Exists(iconsPng)) return;
            var root = JObject.Parse(File.ReadAllText(iconsJson));
            var icons = root["icons"] as JObject;
            if (icons == null) throw new Exception("no icons object");
            using (var bmp = new Bitmap(iconsPng))
            {
                int cols = bmp.Width / 16;
                int rows = bmp.Height / 16;
                int maxIdx = cols * rows;
                foreach (var prop in icons.Properties())
                {
                    int idx = (int)prop.Value;
                    if (idx < 0 || idx >= maxIdx)
                        throw new Exception("icon " + prop.Name + " index " + idx + " out of bounds (" + maxIdx + ")");
                }
            }
        }

        private static void CheckStageSheets()
        {
            string[] stages = { "baby", "junior", "adult", "senior", "legend" };
            int expectedCount = -1;
            foreach (var s in stages)
            {
                var frames = SpriteSheetLoader.Load(s);
                if (frames == null || frames.Length == 0)
                    throw new Exception("failed to load frames for stage " + s);
                if (expectedCount == -1) expectedCount = frames.Length;
                else if (frames.Length != expectedCount)
                    throw new Exception("frame count mismatch for stage " + s + ": " + frames.Length + " vs " + expectedCount);
                if (frames[0].Width != 64 || frames[0].Height != 64)
                    throw new Exception("frame size mismatch for stage " + s + ": " + frames[0].Width + "x" + frames[0].Height);
            }
        }
    }
}
