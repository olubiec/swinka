using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using Cuy.Core.Pigs;

namespace Cuy
{
    /// <summary>Applies a coat palette (exact colour match, fully opaque pixels only) to a ginger sprite sheet.</summary>
    public static class PaletteRemap
    {
        private static Palettes _palettes;
        private static readonly object _lock = new object();

        public static Palettes Palettes
        {
            get
            {
                lock (_lock)
                {
                    if (_palettes == null)
                    {
                        string json = null;
                        foreach (var dir in new[] { AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory() })
                        {
                            var d = dir;
                            for (int i = 0; i < 6 && d != null && json == null; i++)
                            {
                                var p = Path.Combine(d, "assets", "sprites", "palettes.json");
                                if (File.Exists(p)) json = File.ReadAllText(p);
                                d = Directory.GetParent(d)?.FullName;
                            }
                            if (json != null) break;
                        }
                        _palettes = json != null ? Palettes.Parse(json) : Palettes.Parse("{\"palettes\":{}}");
                    }
                    return _palettes;
                }
            }
        }

        /// <summary>Returns a new bitmap with the palette applied. Unknown ids use the default palette.</summary>
        public static Bitmap Apply(Bitmap source, string paletteId)
        {
            return Apply(source, Palettes.Get(paletteId));
        }

        public static Bitmap Apply(Bitmap source, Palettes.Pair[] pairs)
        {
            var map = new Dictionary<int, int>();
            foreach (var p in pairs) map[p.From] = p.To;
            var result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
            var rect = new Rectangle(0, 0, source.Width, source.Height);
            var src = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var dst = result.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            try
            {
                int bytes = Math.Abs(src.Stride) * source.Height;
                var buf = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(src.Scan0, buf, 0, bytes);
                for (int y = 0; y < source.Height; y++)
                {
                    int row = y * src.Stride;
                    for (int x = 0; x < source.Width; x++)
                    {
                        int i = row + x * 4; // BGRA
                        if (buf[i + 3] != 255) continue;
                        int rgb = (buf[i + 2] << 16) | (buf[i + 1] << 8) | buf[i];
                        int to;
                        if (map.TryGetValue(rgb, out to))
                        {
                            buf[i + 2] = (byte)(to >> 16);
                            buf[i + 1] = (byte)(to >> 8);
                            buf[i] = (byte)to;
                        }
                    }
                }
                System.Runtime.InteropServices.Marshal.Copy(buf, 0, dst.Scan0, bytes);
            }
            finally
            {
                source.UnlockBits(src);
                result.UnlockBits(dst);
            }
            return result;
        }
    }
}
