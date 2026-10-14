using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

namespace Cuy
{
    /// <summary>
    /// Manages the Cuy pixel art icons (from the assets/icons/icons_16.png sheet).
    /// Provides the pig head icon for the tray (pig_head) and the item icons for menus, among others.
    /// </summary>
    public static class PetIcons
    {
        // Icon indexes in icons_16.png (400x16 px, 25 icons in a row, each 16x16 px)
        // Hardcoded fallback; replaced by assets/icons/icons.json when it can be read.
        private static Dictionary<string, int> IconIndices = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            // English IDs
            { "bell_pepper", 0 },
            { "cucumber", 1 },
            { "parsley", 2 },
            { "carrot", 3 },
            { "pellets", 4 },
            { "chew_stick", 5 },
            { "ball", 6 },
            { "tunnel", 7 },
            { "house", 8 },
            { "water_bottle", 9 },
            { "poop", 10 },
            { "cake", 11 },
            { "hay", 12 },
            { "clover", 13 },
            { "kale", 14 },
            { "strawberry", 15 },
            { "onion", 16 },
            { "chocolate", 17 },
            { "need_fullness", 18 },
            { "need_vitamin_c", 19 },
            { "need_energy", 20 },
            { "need_mood", 21 },
            { "need_cleanliness", 22 },
            { "need_teeth", 23 },
            { "pig_head", 24 }
        };

        // Fallback base64 for the pig_head icon (from animations.xml), so it always works
        private const string FallbackGlowaSwinkiBase64 =
            "AAABAAEAEBAAAAAAIAAgAQAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAQAAAAEAgGAAAAH/P/YQAAAOdJREFUeJxjYBgFKMBKVvw/Oh+bGDKfBVmi0UKcoZ6BAa7g6IOHYNpaQR4uBlNz7PFLRrgBVlDNclqRDI0Myxls4h1QXLZ3ejiYPrLwAFwNzBAmVE8wwDVzeHaB6Z8fnjIwWuYzfLpxhUHPXARdOQKAXPF9S95/bXEhMP7x9i4Khom/7HHCCBcwAAmCFIAAuiEwPkwO2QAmBjSgIyGMLoRXjgmZs6/UAM4+e+00w99tR8EYxIaBuUGyOC1gADkN5EeY05+c3wp2LogG4ROZ+tj9j24ITAOMjUyjqwcnBmyGYBOHJR6qAgD3dJ+4l2IhiAAAAABJRU5ErkJggg==";

        private static readonly object _syncLock = new object();
        private static Bitmap _iconsStrip;
        private static Icon _trayIcon;
        private static readonly Dictionary<string, Bitmap> _cachedBitmaps = new Dictionary<string, Bitmap>(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Returns an Icon for 'pig_head' from assets/icons/pig_head.ico (or icons_16.png).
        /// </summary>
        public static Icon GetTrayIcon()
        {
            lock (_syncLock)
            {
                if (_trayIcon == null)
                {
                    LoadTrayIcon();
                }

                try
                {
                    return (Icon)_trayIcon.Clone();
                }
                catch (ObjectDisposedException)
                {
                    _trayIcon = null;
                    LoadTrayIcon();
                    return (Icon)_trayIcon.Clone();
                }
            }
        }

        private static void LoadTrayIcon()
        {
            // 1. Check whether pig_head.ico exists on disk
            string icoPath = FindFile(Path.Combine("assets", "icons", "pig_head.ico"))
                                                    ?? FindFile(Path.Combine("assets", "app-icon", "cuy.ico"));

            if (!string.IsNullOrEmpty(icoPath))
            {
                try
                {
                    using (var fs = new FileStream(icoPath, FileMode.Open, FileAccess.Read, FileShare.Read))
                    {
                        _trayIcon = new Icon(fs);
                        return;
                    }
                }
                catch (Exception ex) { BrainController.Log("[WARN] PetIcons.LoadTrayIcon: " + ex.Message); }
            }

            // 2. Cut icon no. 24 (pig_head) out of the icons_16.png sheet
            Bitmap headBmp = GetIconBitmap("pig_head");
            if (headBmp != null)
            {
                try
                {
                    using (var ms = new MemoryStream())
                    {
                        headBmp.Save(ms, ImageFormat.Png);
                        byte[] pngBytes = ms.ToArray();
                        _trayIcon = CreateIcoFromPngBytes(pngBytes);
                        if (_trayIcon != null) return;
                    }
                }
                catch (Exception ex) { BrainController.Log("[WARN] PetIcons.LoadTrayIcon: " + ex.Message); }
            }

            // 3. Last fallback: embedded base64 ICO stream
            try
            {
                byte[] icoBytes = Convert.FromBase64String(FallbackGlowaSwinkiBase64);
                using (var ms = new MemoryStream(icoBytes))
                {
                    _trayIcon = new Icon(ms);
                    return;
                }
            }
            catch
            {
                _trayIcon = SystemIcons.Application;
            }
        }

        /// <summary>
        /// Returns the 16x16 px tile for the given icon name (e.g. "hay", "house", "bell_pepper").
        /// </summary>
        public static Bitmap GetIconBitmap(string iconName)
        {
            if (string.IsNullOrEmpty(iconName)) return null;

            lock (_syncLock)
            {
                Bitmap cached;
                if (_cachedBitmaps.TryGetValue(iconName, out cached))
                {
                    return cached;
                }

                EnsureIndicesLoaded();
                EnsureStripLoaded();
                if (_iconsStrip == null)
                {
                    return null;
                }

                int index;
                if (!IconIndices.TryGetValue(iconName, out index))
                {
                    return null;
                }

                int x = index * 16;
                if (x + 16 > _iconsStrip.Width)
                {
                    return null;
                }

                Bitmap subBmp = new Bitmap(16, 16, PixelFormat.Format32bppArgb);
                using (Graphics g = Graphics.FromImage(subBmp))
                {
                    g.InterpolationMode = InterpolationMode.NearestNeighbor;
                    g.PixelOffsetMode = PixelOffsetMode.Half;
                    g.DrawImage(_iconsStrip, new Rectangle(0, 0, 16, 16), new Rectangle(x, 0, 16, 16), GraphicsUnit.Pixel);
                }

                _cachedBitmaps[iconName] = subBmp;
                return subBmp;
            }
        }

        private static bool _indicesLoaded;

        private static void EnsureIndicesLoaded()
        {
            if (_indicesLoaded) return;
            _indicesLoaded = true;

            string jsonPath = FindFile(Path.Combine("assets", "icons", "icons.json"));
            if (string.IsNullOrEmpty(jsonPath)) return;
            try
            {
                var root = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(jsonPath));
                var icons = root["icons"] as Newtonsoft.Json.Linq.JObject;
                if (icons == null) return;
                var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                foreach (var prop in icons.Properties())
                {
                    map[prop.Name] = (int)prop.Value;
                }
                if (map.Count > 0) IconIndices = map;
            }
            catch (Exception ex)
            {
                BrainController.Log("[ERROR] Failed to read icons.json: " + ex.Message);
            }
        }

        private static void EnsureStripLoaded()
        {
            if (_iconsStrip != null) return;

            string pngPath = FindFile(Path.Combine("assets", "icons", "icons_16.png"));

            if (!string.IsNullOrEmpty(pngPath))
            {
                try
                {
                    using (var fs = new FileStream(pngPath, FileMode.Open, FileAccess.Read, FileShare.Read))
                    using (var temp = Image.FromStream(fs))
                    {
                        _iconsStrip = new Bitmap(temp);
                    }
                }
                catch (Exception ex)
                {
                    BrainController.Log("[ERROR] Failed to load icons_16.png: " + ex.Message);
                }
            }
        }

        private static Icon CreateIcoFromPngBytes(byte[] pngBytes)
        {
            if (pngBytes == null || pngBytes.Length == 0) return null;

            using (var ms = new MemoryStream())
            using (var bw = new BinaryWriter(ms))
            {
                // ICONDIR (6 bytes)
                bw.Write((ushort)0); // reserved
                bw.Write((ushort)1); // 1 = ICO
                bw.Write((ushort)1); // 1 image

                // ICONDIRENTRY (16 bytes)
                bw.Write((byte)16);  // width
                bw.Write((byte)16);  // height
                bw.Write((byte)0);   // colors
                bw.Write((byte)0);   // reserved
                bw.Write((ushort)1); // color planes
                bw.Write((ushort)32);// bit count
                bw.Write((uint)pngBytes.Length); // bytes in resource
                bw.Write((uint)22);  // image offset = 6 + 16 = 22

                // PNG data
                bw.Write(pngBytes);
                bw.Flush();

                ms.Position = 0;
                return new Icon(ms);
            }
        }

        private static string FindFile(string relativePath)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] searchPaths = new string[]
            {
                Path.Combine(baseDir, relativePath),
                Path.Combine(baseDir, "..", relativePath),
                Path.Combine(baseDir, "..", "..", relativePath),
                Path.Combine(baseDir, "..", "..", "..", relativePath),
                Path.Combine(baseDir, "..", "..", "..", "..", relativePath),
                Path.Combine(Directory.GetCurrentDirectory(), relativePath)
            };

            foreach (var p in searchPaths)
            {
                try
                {
                    if (File.Exists(p)) return Path.GetFullPath(p);
                }
                catch (Exception ex) { BrainController.Log("[WARN] PetIcons.FindFile: " + ex.Message); }
            }

            return null;
        }
    }
}
