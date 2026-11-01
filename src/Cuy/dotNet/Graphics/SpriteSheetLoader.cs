using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using Newtonsoft.Json.Linq;

namespace Cuy
{
    public static class SpriteSheetLoader
    {
        private static readonly ConcurrentDictionary<string, Bitmap[]> _cache = new ConcurrentDictionary<string, Bitmap[]>(StringComparer.OrdinalIgnoreCase);
        private static readonly HashSet<string> _loggedMissing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private static readonly object _lock = new object();

        private static string AssetsSpritesDir
        {
            get
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string candidate = Path.Combine(baseDir, "assets", "sprites");
                if (Directory.Exists(candidate)) return candidate;

                // Development fallback walking up
                string dir = baseDir;
                while (dir != null)
                {
                    string p = Path.Combine(dir, "assets", "sprites");
                    if (Directory.Exists(p)) return p;
                    var parent = Directory.GetParent(dir);
                    dir = parent?.FullName;
                }
                return candidate;
            }
        }

        public static Size FrameSize(string stage)
        {
            if (string.IsNullOrEmpty(stage)) return new Size(64, 64);
            try
            {
                string framesJsonPath = Path.Combine(AssetsSpritesDir, stage, "frames.json");
                if (File.Exists(framesJsonPath))
                {
                    string json = File.ReadAllText(framesJsonPath);
                    var obj = JObject.Parse(json);
                    int w = (int?)obj["frameWidth"] ?? 64;
                    int h = (int?)obj["frameHeight"] ?? 64;
                    return new Size(w, h);
                }
            }
            catch { }
            return new Size(64, 64);
        }

        public static Bitmap[] Load(string stage)
        {
            if (string.IsNullOrEmpty(stage)) return null;

            if (_cache.TryGetValue(stage, out var cached))
            {
                return cached;
            }

            lock (_lock)
            {
                if (_cache.TryGetValue(stage, out cached)) return cached;

                string sheetPath = Path.Combine(AssetsSpritesDir, stage, "spritesheet.png");
                if (!File.Exists(sheetPath))
                {
                    if (!_loggedMissing.Contains(stage))
                    {
                        _loggedMissing.Add(stage);
                        BrainController.Log($"[Stage] sheet missing: {stage}");
                    }
                    return null;
                }

                try
                {
                    byte[] bytes = File.ReadAllBytes(sheetPath);
                    using (var ms = new MemoryStream(bytes))
                    using (var masterBmp = new Bitmap(ms))
                    {
                        var size = FrameSize(stage);
                        int frameW = size.Width;
                        int frameH = size.Height;
                        int cols = 16;
                        int rows = masterBmp.Height / frameH;
                        int totalFrames = cols * rows;

                        var frames = new Bitmap[totalFrames];
                        for (int r = 0; r < rows; r++)
                        {
                            for (int c = 0; c < cols; c++)
                            {
                                int idx = r * cols + c;
                                var rect = new Rectangle(c * frameW, r * frameH, frameW, frameH);
                                var frame = new Bitmap(frameW, frameH, PixelFormat.Format32bppArgb);
                                using (var g = System.Drawing.Graphics.FromImage(frame))
                                {
                                    g.DrawImage(masterBmp, new Rectangle(0, 0, frameW, frameH), rect, GraphicsUnit.Pixel);
                                }
                                frames[idx] = frame;
                            }
                        }

                        _cache[stage] = frames;
                        return frames;
                    }
                }
                catch (Exception ex)
                {
                    if (!_loggedMissing.Contains(stage))
                    {
                        _loggedMissing.Add(stage);
                        BrainController.Log($"[Stage] sheet missing: {stage} ({ex.Message})");
                    }
                    return null;
                }
            }
        }

        public static Bitmap GetFrame(string stage, int index)
        {
            try
            {
                var frames = Load(stage);
                if (frames == null || index < 0 || index >= frames.Length) return null;
                return frames[index];
            }
            catch
            {
                return null;
            }
        }
    }
}
