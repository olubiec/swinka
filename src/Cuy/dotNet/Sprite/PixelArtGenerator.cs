using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using Cuy.Core.Pigs;

namespace Cuy.Sprite
{
    /// <summary>
    /// Generates desktop sprites and applies palettes for guinea pigs,
    /// supporting primary and secondary patch regions (Patch2) for named pigs with patched or tricolor patterns.
    /// </summary>
    public static class PixelArtGenerator
    {
        // Known secondary patch colors (slot K in palettes.json and coatgen RAMPS)
        private static readonly HashSet<int> KnownSecondaryPatchRgb = new HashSet<int>
        {
            0x4b3f45, 0x35292f, 0x251c22, 0x170f14, // ginger slot K
            0x4a3028, 0x38241e, 0x291912, 0x1a0f0b, // chocolate/chestnut slot K
            0x3a3841, 0x27252c, 0x1b1a1f, 0x101014, // black slot K
            0x6c6c74, 0x50505a, 0x3a3a42, 0x27272d, // slate slot K
            0xb88c60, 0x96704a, 0x745438, 0x553b27, // cream slot K
            0xd8d0c4, 0xb8ae9f, 0x968a7a, 0x73685a, // white slot K
            0x6c3a22, 0x552c1b, 0x3f2014, 0x2a140d, // cinnamon slot K
            0x6a5640, 0x4e3f2c, 0x382c1f, 0x231b13, // agouti slot K
            0x544f5a, 0x39353f, 0x262329, 0x151418, // racuch saddle
            0xcdb9a8, 0xad9382, 0x8b7260, 0x695344, // ned pale brown
            0x6a6e77, 0x545861, 0x3b3e46, 0x25272d, // james muzzle/legs
            0x98a2ba, 0x737c92, 0x4d5466, 0x2f3340  // glen sheen
        };

        /// <summary>
        /// Resolves the color to use for the second patch region:
        /// Uses Patch2 when present, else falls back to Patch or base coat.
        /// </summary>
        public static Color ResolveSecondPatchColor(PigPalette palette)
        {
            if (palette == null) return Color.FromArgb(247, 180, 110);
            if (palette.Patch2.HasValue && !palette.Patch2.Value.IsEmpty)
                return palette.Patch2.Value;
            if (palette.Patch.HasValue && !palette.Patch.Value.IsEmpty)
                return palette.Patch.Value;
            return palette.BaseColor;
        }

        /// <summary>
        /// Checks whether the pig has a second patch region (pattern is 'patched' or 'tricolor', or Patch2 is non-empty).
        /// </summary>
        public static bool HasSecondPatchRegion(PigPalette palette)
        {
            if (palette == null) return false;
            if (palette.Patch2.HasValue && !palette.Patch2.Value.IsEmpty)
                return true;
            if (!string.IsNullOrEmpty(palette.Pattern))
            {
                string pat = palette.Pattern.Trim().ToLowerInvariant();
                if (pat == "patched" || pat == "tricolor" || pat.Contains("patch") || pat.Contains("tricolor"))
                    return true;
            }
            return false;
        }

        public static bool IsSecondaryPatchApplicable(PigPalette palette) => HasSecondPatchRegion(palette);

        /// <summary>
        /// Generates or loads a desktop sprite for a named pig.
        /// When generating desktop sprites for named pigs with pattern "patched" or "tricolor" / non-empty Patch2,
        /// uses Patch2 (when present, else falling back to Patch or base coat) for the second patch region.
        /// </summary>
        public static Bitmap GenerateDesktopSprite(NamedPigDefinition def, string stageKey = "adult", PigPalette palette = null)
        {
            if (palette == null && def != null)
            {
                palette = PigPalette.FromNamedPig(def);
            }
            string pigId = def?.Id ?? palette?.PigId;
            return GenerateDesktopSprite(pigId, stageKey, palette);
        }

        /// <summary>
        /// Generates or loads a desktop sprite for a named pig id.
        /// Uses Patch2 (when present, else falling back to Patch or base coat) for the second patch region.
        /// </summary>
        public static Bitmap GenerateDesktopSprite(string pigId, string stageKey = "adult", PigPalette palette = null)
        {
            if (palette == null && !string.IsNullOrEmpty(pigId))
            {
                palette = PigPalette.FromNamedPig(pigId);
            }
            if (palette == null)
            {
                palette = new PigPalette();
            }

            // 1. Try to load existing baked sheet if present
            if (!string.IsNullOrEmpty(pigId))
            {
                try
                {
                    string spritesDir = Xml.ResolveAssetsSpritesDir();
                    string sheetPath = Path.Combine(spritesDir, "pigs", pigId.ToLowerInvariant(), (stageKey ?? "adult").ToLowerInvariant(), "spritesheet.png");
                    if (File.Exists(sheetPath))
                    {
                        byte[] bytes = File.ReadAllBytes(sheetPath);
                        using (var ms = new MemoryStream(bytes))
                        using (var master = new Bitmap(ms))
                        {
                            int frameW = 64;
                            int frameH = 64;
                            var frame = new Bitmap(frameW, frameH, PixelFormat.Format32bppArgb);
                            using (var g = Graphics.FromImage(frame))
                            {
                                g.DrawImage(master, new Rectangle(0, 0, frameW, frameH), new Rectangle(0, 0, frameW, frameH), GraphicsUnit.Pixel);
                            }

                            if (HasSecondPatchRegion(palette))
                            {
                                var remapped = ApplyPalette(frame, palette);
                                frame.Dispose();
                                return remapped;
                            }
                            return frame;
                        }
                    }
                }
                catch (Exception ex)
                {
                    BrainController.Log("[WARN] PixelArtGenerator.GenerateDesktopSprite: " + ex.Message);
                }
            }

            // 2. Procedural pixel art sprite generation
            return GenerateSprite(palette, 64, 64);
        }

        /// <summary>
        /// Generates a list of desktop sprite frames for a named pig.
        /// </summary>
        public static IList<Bitmap> GenerateNamedPigSprites(string pigId, string stageKey = "adult", PigPalette palette = null)
        {
            var bmp = GenerateDesktopSprite(pigId, stageKey, palette);
            return new List<Bitmap> { bmp };
        }

        /// <summary>
        /// Generates a procedural 64x64 pixel art guinea pig sprite with accurate coat regions.
        /// The second patch region uses Patch2 (when present, else falling back to Patch or base coat).
        /// </summary>
        public static Bitmap GenerateSprite(PigPalette palette, int width = 64, int height = 64)
        {
            if (palette == null) palette = new PigPalette();

            var bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
            Color baseColor = palette.BaseColor;
            Color patch1Color = palette.Patch ?? palette.BaseColor;
            Color secondPatchColor = ResolveSecondPatchColor(palette);
            bool useSecondPatch = HasSecondPatchRegion(palette);

            Color outline = palette.Outline ?? Color.FromArgb(30, 25, 28);
            Color skin = palette.Skin ?? Color.FromArgb(240, 180, 180);
            Color eye = palette.Eye ?? Color.FromArgb(43, 23, 18);
            Color feet = palette.Feet ?? skin;

            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
            }

            // Draw procedural 64x64 guinea pig:
            // Centered body: x=14..50, y=20..44
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    // Silhouette distance function for guinea pig bean shape
                    // Head center at (22, 32), Body center at (36, 33)
                    double dxHead = (x - 22.0) / 10.0;
                    double dyHead = (y - 32.0) / 9.0;
                    double dHead = dxHead * dxHead + dyHead * dyHead;

                    double dxBody = (x - 36.0) / 14.0;
                    double dyBody = (y - 33.0) / 11.0;
                    double dBody = dxBody * dxBody + dyBody * dyBody;

                    bool inHead = dHead <= 1.0;
                    bool inBody = dBody <= 1.0;
                    bool inPaws = (y >= 43 && y <= 45) && ((x >= 18 && x <= 22) || (x >= 40 && x <= 44));
                    bool inEar = (y >= 19 && y <= 23) && (x >= 25 && x <= 28);

                    if (inPaws)
                    {
                        bmp.SetPixel(x, y, feet);
                        continue;
                    }

                    if (inEar)
                    {
                        bmp.SetPixel(x, y, skin);
                        continue;
                    }

                    if (inHead || inBody)
                    {
                        // Check outline boundary
                        bool isBorder = dHead > 0.78 && dBody > 0.78;
                        if (isBorder)
                        {
                            bmp.SetPixel(x, y, outline);
                            continue;
                        }

                        // Eye at (18, 28)
                        if ((x == 18 || x == 19) && (y == 28 || y == 29))
                        {
                            bmp.SetPixel(x, y, eye);
                            continue;
                        }
                        // Eye catchlight at (18, 28)
                        if (x == 18 && y == 28)
                        {
                            bmp.SetPixel(x, y, Color.White);
                            continue;
                        }
                        // Nose at (13, 33)
                        if (x <= 14 && y >= 32 && y <= 34)
                        {
                            bmp.SetPixel(x, y, skin);
                            continue;
                        }

                        // Determine coat region:
                        // Second patch region: rear/rump region (x >= 38)
                        // Primary patch region: mid saddle / face blaze (x >= 24 && x < 38)
                        // Base coat: remaining head and body
                        if (x >= 38)
                        {
                            // Second patch region:
                            // Use Patch2 (when present, else falling back to Patch or base coat)
                            Color c = useSecondPatch ? secondPatchColor : patch1Color;
                            bmp.SetPixel(x, y, c);
                        }
                        else if (x >= 24)
                        {
                            // Primary patch region (Patch1)
                            bmp.SetPixel(x, y, patch1Color);
                        }
                        else
                        {
                            // Base coat region
                            bmp.SetPixel(x, y, baseColor);
                        }
                    }
                }
            }

            return bmp;
        }

        /// <summary>
        /// Generates an array of sprite frames for a given palette.
        /// </summary>
        public static Bitmap[] GenerateFrames(PigPalette palette, int frameCount = 1, int width = 64, int height = 64)
        {
            int count = Math.Max(1, frameCount);
            var frames = new Bitmap[count];
            for (int i = 0; i < count; i++)
            {
                frames[i] = GenerateSprite(palette, width, height);
            }
            return frames;
        }

        /// <summary>
        /// Generates a full sprite sheet bitmap.
        /// </summary>
        public static Bitmap GenerateSheet(PigPalette palette, int cols = 16, int rows = 31, int frameWidth = 64, int frameHeight = 64)
        {
            var sheet = new Bitmap(cols * frameWidth, rows * frameHeight, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(sheet))
            {
                g.Clear(Color.Transparent);
                using (var frame = GenerateSprite(palette, frameWidth, frameHeight))
                {
                    for (int r = 0; r < rows; r++)
                    {
                        for (int c = 0; c < cols; c++)
                        {
                            g.DrawImage(frame, c * frameWidth, r * frameHeight, frameWidth, frameHeight);
                        }
                    }
                }
            }
            return sheet;
        }

        /// <summary>
        /// Applies the palette to an existing sprite or template bitmap, remapping the second patch region
        /// to Patch2 (falling back to Patch or base coat) when the pig is patched or tricolor / has non-empty Patch2.
        /// </summary>
        public static Bitmap ApplyPalette(Bitmap source, PigPalette palette)
        {
            if (source == null) return null;
            if (palette == null) return new Bitmap(source);

            Color secondPatchColor = ResolveSecondPatchColor(palette);
            bool useSecondPatch = HasSecondPatchRegion(palette);
            Color patch1Color = palette.Patch ?? palette.BaseColor;

            var result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
            var rect = new Rectangle(0, 0, source.Width, source.Height);
            var srcData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var dstData = result.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

            try
            {
                int bytes = Math.Abs(srcData.Stride) * source.Height;
                var buf = new byte[bytes];
                Marshal.Copy(srcData.Scan0, buf, 0, bytes);

                for (int y = 0; y < source.Height; y++)
                {
                    int row = y * srcData.Stride;
                    for (int x = 0; x < source.Width; x++)
                    {
                        int i = row + x * 4;
                        byte a = buf[i + 3];
                        if (a == 0) continue;

                        byte b = buf[i];
                        byte g = buf[i + 1];
                        byte r = buf[i + 2];
                        int rgb = (r << 16) | (g << 8) | b;

                        if (KnownSecondaryPatchRgb.Contains(rgb))
                        {
                            Color target = useSecondPatch ? secondPatchColor : patch1Color;
                            buf[i] = target.B;
                            buf[i + 1] = target.G;
                            buf[i + 2] = target.R;
                        }
                    }
                }

                Marshal.Copy(buf, 0, dstData.Scan0, bytes);
            }
            finally
            {
                source.UnlockBits(srcData);
                result.UnlockBits(dstData);
            }

            return result;
        }
    }
}
