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
    /// Zarządza ikonami pixel art projektu Cuy (z arkusza assets/icons/icons_16.png).
    /// Udostępnia m.in. ikonę główki świnki do zasobnika (pet_head / glowa_swinki) oraz ikony przedmiotów do menu.
    /// </summary>
    public static class PetIcons
    {
        // Indeksy ikon w arkuszu icons_16.png (400x16 px, 25 ikon w rzędzie, każda 16x16 px)
        private static readonly Dictionary<string, int> IconIndices = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            // English IDs
            { "bell_pepper", 0 },
            { "cucumber", 1 },
            { "parsley", 2 },
            { "carrot", 3 },
            { "pellets", 4 },
            { "chew_toy", 5 },
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
            { "need_satiety", 18 },
            { "need_vitamin_c", 19 },
            { "need_energy", 20 },
            { "need_mood", 21 },
            { "need_cleanliness", 22 },
            { "need_teeth", 23 },
            { "pet_head", 24 },

            // Polish legacy aliases
            { "papryka", 0 },
            { "ogorek", 1 },
            { "natka", 2 },
            { "marchewka", 3 },
            { "granulat", 4 },
            { "gryzak", 5 },
            { "pilka", 6 },
            { "tunel", 7 },
            { "domek", 8 },
            { "poidlo", 9 },
            { "bobek", 10 },
            { "tort", 11 },
            { "siano", 12 },
            { "koniczynka", 13 },
            { "jarmuz", 14 },
            { "truskawka", 15 },
            { "cebula", 16 },
            { "czekolada", 17 },
            { "potrzeba_najedzenie", 18 },
            { "potrzeba_witamina_c", 19 },
            { "potrzeba_energia", 20 },
            { "potrzeba_humor", 21 },
            { "potrzeba_czystosc", 22 },
            { "potrzeba_zabki", 23 },
            { "glowa_swinki", 24 }
        };

        // Zapasowy base64 dla ikony pet_head (z animations.xml), gwarantujący poprawne działanie zawsze
        private const string FallbackGlowaSwinkiBase64 =
            "AAABAAEAEBAAAAAAIAAgAQAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAQAAAAEAgGAAAAH/P/YQAAAOdJREFUeJxjYBgFKMBKVvw/Oh+bGDKfBVmi0UKcoZ6BAa7g6IOHYNpaQR4uBlNz7PFLRrgBVlDNclqRDI0Myxls4h1QXLZ3ejiYPrLwAFwNzBAmVE8wwDVzeHaB6Z8fnjIwWuYzfLpxhUHPXARdOQKAXPF9S95/bXEhMP7x9i4Khom/7HHCCBcwAAmCFIAAuiEwPkwO2QAmBjSgIyGMLoRXjgmZs6/UAM4+e+00w99tR8EYxIaBuUGyOC1gADkN5EeY05+c3wp2LogG4ROZ+tj9j24ITAOMjUyjqwcnBmyGYBOHJR6qAgD3dJ+4l2IhiAAAAABJRU5ErkJggg==";

        private static readonly object _syncLock = new object();
        private static Bitmap _iconsStrip;
        private static Icon _trayIcon;
        private static readonly Dictionary<string, Bitmap> _cachedBitmaps = new Dictionary<string, Bitmap>(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Zwraca obiekt Icon reprezentujący ikonę 'pet_head' z assets/icons/icons_16.png (lub pet_head.ico).
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
            // 1. Sprawdź czy plik pet_head.ico lub glowa_swinki.ico istnieje na dysku
            string icoPath = FindFile(Path.Combine("assets", "icons", "pet_head.ico"))
                          ?? FindFile(Path.Combine("assets", "icons", "glowa_swinki.ico"))
                          ?? FindFile(Path.Combine("assets", "app-icon", "icon.ico"));

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
                catch { }
            }

            // 2. Wytnij ikonę nr 24 (pet_head) z arkusza icons_16.png
            Bitmap headBmp = GetIconBitmap("pet_head") ?? GetIconBitmap("glowa_swinki");
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
                catch { }
            }

            // 3. Ostateczny fallback: wbudowany strumień ICO base64
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
        /// Zwraca kafelek 16x16 px dla podanej nazwy ikony (np. "hay", "house", "bell_pepper").
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

        private static void EnsureStripLoaded()
        {
            if (_iconsStrip != null) return;

            string pngPath = FindFile(Path.Combine("assets", "icons", "icons_16.png"))
                          ?? FindFile(Path.Combine("assets", "icons", "ikony_16.png"))
                          ?? FindFile(Path.Combine("web", "home", "assets", "ikony_16.png"));

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
                    BrainController.Log("[Błąd] Nie udało się załadować icons_16.png: " + ex.Message);
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
                catch { }
            }

            return null;
        }
    }

    /// <summary>Alias dla kompatybilności wstecznej.</summary>
    public static class SwinkaIcons
    {
        public static Icon GetTrayIcon() => PetIcons.GetTrayIcon();
        public static Bitmap GetIconBitmap(string iconName) => PetIcons.GetIconBitmap(iconName);
    }
}
