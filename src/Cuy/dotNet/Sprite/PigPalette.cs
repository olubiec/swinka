using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using Cuy.Core.Pigs;
using Newtonsoft.Json.Linq;

namespace Cuy.Sprite
{
    /// <summary>
    /// Represents the color palette and pattern for a desktop pet pig,
    /// including base coat, primary patch, and secondary patch (Patch2) colors.
    /// </summary>
    public class PigPalette
    {
        public string PigId { get; set; }
        public string Name { get; set; }
        public string Breed { get; set; }
        public string Pattern { get; set; }
        public string PaletteId { get; set; }

        public Color BaseColor { get; set; } = Color.FromArgb(247, 180, 110);
        public Color BaseCoat
        {
            get => BaseColor;
            set => BaseColor = value;
        }

        public Color? Patch { get; set; }
        public Color? Patch1
        {
            get => Patch;
            set => Patch = value;
        }

        /// <summary>
        /// Secondary patch color used for named pigs with 'patched' or 'tricolor' patterns,
        /// or when an explicit secondary patch color is specified in data.
        /// </summary>
        public Color? Patch2 { get; set; }

        public Color? Outline { get; set; }
        public Color? Belly { get; set; }
        public Color? Skin { get; set; }
        public Color? Eye { get; set; }
        public Color? Feet { get; set; }
        public Color? Ear { get; set; }

        public bool HasPatch2 => Patch2.HasValue && !Patch2.Value.IsEmpty;

        public PigPalette()
        {
        }

        public PigPalette(Color baseColor, Color? patch = null, Color? patch2 = null)
        {
            BaseColor = baseColor;
            Patch = patch;
            Patch2 = patch2;
        }

        public PigPalette(string pattern, Color baseColor, Color? patch = null, Color? patch2 = null)
        {
            Pattern = pattern;
            BaseColor = baseColor;
            Patch = patch;
            Patch2 = patch2;
        }

        public static Color ParseColor(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return Color.Empty;
            value = value.Trim();
            if (value.StartsWith("#"))
            {
                try
                {
                    return ColorTranslator.FromHtml(value);
                }
                catch { }
            }

            // Named colors / palette aliases
            switch (value.ToLowerInvariant())
            {
                case "white": return Color.FromArgb(255, 253, 248);
                case "ginger": return Color.FromArgb(247, 180, 110);
                case "chocolate": return Color.FromArgb(140, 94, 74);
                case "black": return Color.FromArgb(85, 82, 92);
                case "slate": return Color.FromArgb(180, 180, 184);
                case "cream": return Color.FromArgb(255, 243, 214);
                case "cinnamon": return Color.FromArgb(213, 138, 82);
                case "agouti": return Color.FromArgb(196, 171, 132);
                case "chestnut": return Color.FromArgb(185, 114, 74);
            }

            try
            {
                return Color.FromName(value);
            }
            catch { }

            return Color.Empty;
        }

        public static PigPalette FromNamedPig(NamedPigDefinition def)
        {
            if (def == null) return new PigPalette();

            var palette = new PigPalette
            {
                PigId = def.Id,
                Name = def.Name,
                Breed = def.Breed,
                Pattern = def.Pattern,
                PaletteId = def.PaletteId
            };

            Color baseColor = Color.FromArgb(247, 180, 110);
            Color? patch1 = null;
            Color? patch2 = null;

            string pattern = def.Pattern;
            string paletteName = def.Palette;

            // Infer pattern and palette if PaletteId is composite (e.g. "two_tone.ginger")
            if (!string.IsNullOrEmpty(def.PaletteId) && def.PaletteId.Contains("."))
            {
                var parts = def.PaletteId.Split('.');
                if (string.IsNullOrEmpty(pattern)) pattern = parts[0];
                if (string.IsNullOrEmpty(paletteName) && parts.Length > 1) paletteName = parts[1];
            }

            // 1. Check if def.Palette is JSON containing Patch2 or color fields
            if (!string.IsNullOrWhiteSpace(def.Palette) && def.Palette.TrimStart().StartsWith("{"))
            {
                try
                {
                    var obj = JObject.Parse(def.Palette);
                    if (obj["patch2"] != null)
                    {
                        var c = ParseColor(obj["patch2"].ToString());
                        if (!c.IsEmpty) patch2 = c;
                    }
                    else if (obj["Patch2"] != null)
                    {
                        var c = ParseColor(obj["Patch2"].ToString());
                        if (!c.IsEmpty) patch2 = c;
                    }

                    if (obj["base"] != null)
                    {
                        var c = ParseColor(obj["base"].ToString());
                        if (!c.IsEmpty) baseColor = c;
                    }
                    if (obj["patch"] != null)
                    {
                        var c = ParseColor(obj["patch"].ToString());
                        if (!c.IsEmpty) patch1 = c;
                    }
                }
                catch { }
            }

            // 2. Check if assets/data/pigs_named.json has look.patch2 or look.palette.patch2
            TryLoadFromPigsNamedJson(def.Id, ref patch2, ref baseColor, ref patch1, ref pattern);

            // 3. Known named pigs of the collection (from docs/NAMED_PIGS.md and coatgen.py / RAMPS)
            if (!string.IsNullOrEmpty(def.Id))
            {
                switch (def.Id.ToLowerInvariant())
                {
                    case "kuki":
                        baseColor = ColorTranslator.FromHtml("#f4ac48"); // ginger-gold
                        patch1 = ColorTranslator.FromHtml("#73502f");    // dark brown
                        if (!patch2.HasValue) patch2 = ColorTranslator.FromHtml("#fffdf8"); // white blaze
                        break;
                    case "ned":
                        baseColor = ColorTranslator.FromHtml("#fffdf8"); // white-cream
                        patch1 = ColorTranslator.FromHtml("#8e6c5a");    // chocolate
                        if (!patch2.HasValue) patch2 = ColorTranslator.FromHtml("#cdb9a8"); // pale brown
                        break;
                    case "james":
                        baseColor = ColorTranslator.FromHtml("#9aa0a8"); // slate/grey
                        patch1 = ColorTranslator.FromHtml("#b4bac2");    // light ticks
                        if (!patch2.HasValue) patch2 = ColorTranslator.FromHtml("#6a6e77"); // dark muzzle/legs
                        break;
                    case "glen":
                        baseColor = ColorTranslator.FromHtml("#5a6070"); // black
                        patch1 = ColorTranslator.FromHtml("#d08236");    // ginger streak
                        if (!patch2.HasValue) patch2 = ColorTranslator.FromHtml("#98a2ba"); // sheen highlight
                        palette.Feet = ColorTranslator.FromHtml("#1c1d22"); // black paws
                        break;
                    case "racuch":
                        baseColor = ColorTranslator.FromHtml("#f7ac52"); // ginger
                        patch1 = ColorTranslator.FromHtml("#544f5a");    // black saddle
                        if (!patch2.HasValue) patch2 = ColorTranslator.FromHtml("#fffdf8"); // white
                        break;
                }
            }

            // 4. Default secondary patch color for "patched" or "tricolor" patterns if not yet assigned
            bool isPatchedOrTricolor = !string.IsNullOrEmpty(pattern) &&
                (pattern.Equals("patched", StringComparison.OrdinalIgnoreCase) ||
                 pattern.Equals("tricolor", StringComparison.OrdinalIgnoreCase) ||
                 pattern.IndexOf("patched", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 pattern.IndexOf("tricolor", StringComparison.OrdinalIgnoreCase) >= 0);

            if (isPatchedOrTricolor && !patch2.HasValue)
            {
                string palKey = (paletteName ?? string.Empty).ToLowerInvariant();
                switch (palKey)
                {
                    case "chocolate":
                        patch2 = ColorTranslator.FromHtml("#4a3028");
                        break;
                    case "slate":
                        patch2 = ColorTranslator.FromHtml("#6c6c74");
                        break;
                    case "black":
                        patch2 = ColorTranslator.FromHtml("#27252c");
                        break;
                    case "cream":
                        patch2 = ColorTranslator.FromHtml("#b88c60");
                        break;
                    case "cinnamon":
                        patch2 = ColorTranslator.FromHtml("#6c3a22");
                        break;
                    case "agouti":
                        patch2 = ColorTranslator.FromHtml("#6a5640");
                        break;
                    default:
                        // Canonical ginger/tricolor dark patch
                        patch2 = ColorTranslator.FromHtml("#4b3f45");
                        break;
                }

                if (!patch1.HasValue)
                {
                    patch1 = ColorTranslator.FromHtml("#fffdf8"); // white patch
                }
            }

            palette.BaseColor = baseColor;
            palette.Patch = patch1;
            palette.Patch2 = patch2;
            palette.Pattern = pattern;
            palette.Outline = Color.FromArgb(30, 25, 28);
            palette.Skin = Color.FromArgb(240, 180, 180);
            palette.Eye = Color.FromArgb(43, 23, 18);

            return palette;
        }

        public static PigPalette FromNamedPig(string pigId)
        {
            if (string.IsNullOrEmpty(pigId)) return new PigPalette();
            try
            {
                var catalog = NamedPigCatalog.Current;
                var def = catalog?.Find(pigId);
                if (def != null) return FromNamedPig(def);
            }
            catch { }

            try
            {
                var def = NamedPigCatalog.CreateCodeDefaults()?.Find(pigId);
                if (def != null) return FromNamedPig(def);
            }
            catch { }

            return new PigPalette { PigId = pigId };
        }

        public static PigPalette FromNamedPigCatalog(string pigId) => FromNamedPig(pigId);

        public static PigPalette FromCatalog(NamedPigCatalog catalog, string pigId)
        {
            var def = catalog?.Find(pigId);
            return def != null ? FromNamedPig(def) : FromNamedPig(pigId);
        }

        public static PigPalette FromPaletteId(string paletteId, string pattern = null)
        {
            var p = new PigPalette { PaletteId = paletteId, Pattern = pattern };
            if (string.IsNullOrEmpty(paletteId)) return p;

            string pal = paletteId;
            string pat = pattern;
            if (pal.Contains("."))
            {
                var parts = pal.Split('.');
                if (string.IsNullOrEmpty(pat)) pat = parts[0];
                pal = parts[1];
            }

            p.Pattern = pat;
            Color baseColor = Color.FromArgb(247, 180, 110);
            Color? patch1 = null;
            Color? patch2 = null;

            switch (pal.ToLowerInvariant())
            {
                case "chocolate":
                    baseColor = ColorTranslator.FromHtml("#8c5e4a");
                    patch1 = ColorTranslator.FromHtml("#7c5240");
                    break;
                case "black":
                    baseColor = ColorTranslator.FromHtml("#55525c");
                    patch1 = ColorTranslator.FromHtml("#dc7445");
                    break;
                case "slate":
                    baseColor = ColorTranslator.FromHtml("#b4b4b8");
                    patch1 = ColorTranslator.FromHtml("#8e8e94");
                    break;
                case "cream":
                    baseColor = ColorTranslator.FromHtml("#fff3d6");
                    patch1 = ColorTranslator.FromHtml("#f4cc98");
                    break;
                case "cinnamon":
                    baseColor = ColorTranslator.FromHtml("#d58a52");
                    patch1 = ColorTranslator.FromHtml("#a65634");
                    break;
                case "agouti":
                    baseColor = ColorTranslator.FromHtml("#c4ab84");
                    patch1 = ColorTranslator.FromHtml("#94775a");
                    break;
                default:
                    baseColor = ColorTranslator.FromHtml("#f7b46e");
                    patch1 = ColorTranslator.FromHtml("#7a4a30");
                    break;
            }

            if (!string.IsNullOrEmpty(pat) &&
                (pat.Equals("tricolor", StringComparison.OrdinalIgnoreCase) ||
                 pat.Equals("patched", StringComparison.OrdinalIgnoreCase)))
            {
                patch1 = ColorTranslator.FromHtml("#fffdf8");
                patch2 = ColorTranslator.FromHtml("#4b3f45");
            }

            p.BaseColor = baseColor;
            p.Patch = patch1;
            p.Patch2 = patch2;
            return p;
        }

        private static void TryLoadFromPigsNamedJson(string pigId, ref Color? patch2, ref Color baseColor, ref Color? patch1, ref string pattern)
        {
            if (string.IsNullOrEmpty(pigId)) return;
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
                string[] candidatePaths = new[]
                {
                    Path.Combine(baseDir, "assets", "data", "pigs_named.json"),
                    Path.Combine(baseDir, "..", "assets", "data", "pigs_named.json"),
                    Path.Combine(baseDir, "..", "..", "assets", "data", "pigs_named.json"),
                    Path.Combine(baseDir, "..", "..", "..", "assets", "data", "pigs_named.json"),
                    Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "pigs_named.json"),
                    Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "pigs_named.json")
                };

                foreach (var path in candidatePaths)
                {
                    if (File.Exists(path))
                    {
                        string json = File.ReadAllText(path);
                        var root = JObject.Parse(json);
                        var pigs = root["pigs"] as JArray;
                        if (pigs != null)
                        {
                            foreach (var pToken in pigs)
                            {
                                if (string.Equals(pToken["id"]?.ToString(), pigId, StringComparison.OrdinalIgnoreCase))
                                {
                                    var look = pToken["look"];
                                    if (look != null)
                                    {
                                        if (look["pattern"] != null && string.IsNullOrEmpty(pattern))
                                        {
                                            pattern = look["pattern"].ToString();
                                        }

                                        if (look["patch2"] != null)
                                        {
                                            var c = ParseColor(look["patch2"].ToString());
                                            if (!c.IsEmpty) patch2 = c;
                                        }
                                        else if (look["palette"] is JObject palObj && palObj["patch2"] != null)
                                        {
                                            var c = ParseColor(palObj["patch2"].ToString());
                                            if (!c.IsEmpty) patch2 = c;
                                        }
                                    }
                                    return;
                                }
                            }
                        }
                        return;
                    }
                }
            }
            catch { }
        }
    }
}
