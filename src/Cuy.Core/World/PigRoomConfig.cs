using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json.Linq;
using Cuy.Core;

namespace Cuy.Core.World
{
    /// <summary>
    /// Look of one pig's room: skins are ids of items_decor.json, starter and signature items are ids of world_items.json.
    /// WallTile and FloorTile are optional tile ids of assets/world/tiles.json (null = use the skin).
    /// </summary>
    public sealed class PigRoomTheme
    {
        public string Wallpaper { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;
        public string WallTile { get; set; }
        public string FloorTile { get; set; }
        public IReadOnlyList<string> Starter { get; set; } = new List<string>();
        public string Signature { get; set; } = string.Empty;
        public string Mood { get; set; } = string.Empty;
    }

    /// <summary>The shared bedroom (dorm) that pigs share after it is unlocked.</summary>
    public sealed class PigRoomDorm
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int UnlockCost { get; set; }
        public int RequiresPigs { get; set; }
        public int MaxResidents { get; set; }
        public double BondGainBonus { get; set; }
        public IReadOnlyList<GridLevel> Levels { get; set; } = new List<GridLevel>();
    }

    /// <summary>
    /// Loader for assets/data/pig_rooms.json. Bad values are clamped or dropped and each change is logged
    /// through ItemCatalog.ErrorLogger. Code defaults equal the numbers of the file.
    /// </summary>
    public sealed class PigRoomConfig
    {
        private const int MinVariantCount = 1;
        private const int MaxVariantCount = 8;
        private const int MinResidents = 2;
        private const int MaxResidents = 6;
        private const int StarterItemCount = 3;

        private static readonly object _syncLock = new object();
        private static PigRoomConfig _current;

        public static PigRoomConfig Current
        {
            get
            {
                if (_current != null) return _current;
                lock (_syncLock)
                {
                    if (_current == null)
                    {
                        _current = LoadDefault();
                    }
                }
                return _current;
            }
        }

        public string IdPrefix { get; private set; }
        public string NameTemplate { get; private set; }
        public string MemorialNameTemplate { get; private set; }
        public int MaxNameLen { get; private set; }
        public IReadOnlyList<GridLevel> Levels { get; private set; }
        public double ComfortOwn { get; private set; }
        public double ComfortCommon { get; private set; }
        public double ComfortOthers { get; private set; }
        public IReadOnlyList<string> CommonPlaces { get; private set; }
        public int VariantCount { get; private set; }
        public PigRoomDorm Dorm { get; private set; }
        public IReadOnlyList<PigRoomTheme> DefaultThemes { get; private set; }
        public IReadOnlyDictionary<string, PigRoomTheme> Themes { get; private set; }

        private PigRoomConfig()
        {
            IdPrefix = "pig:";
            NameTemplate = "{name}'s room";
            MemorialNameTemplate = "{name}'s memory room";
            MaxNameLen = 24;
            Levels = DefaultPigLevels();
            ComfortOwn = 1.0;
            ComfortCommon = 0.5;
            ComfortOthers = 0.0;
            CommonPlaces = DefaultCommonPlaces();
            VariantCount = 4;
            Dorm = new PigRoomDorm
            {
                Id = "dorm",
                Name = "Shared bedroom",
                UnlockCost = 1500,
                RequiresPigs = 2,
                MaxResidents = 6,
                BondGainBonus = 0.05,
                Levels = DefaultDormLevels(),
            };
            DefaultThemes = DefaultThemeList();
            Themes = BuildThemeMap(DefaultNamedThemes());
        }

        /// <summary>Config with the code defaults (the numbers of pig_rooms.json).</summary>
        public static PigRoomConfig CreateDefault()
        {
            return new PigRoomConfig();
        }

        public static PigRoomConfig LoadDefault()
        {
            string[] starts = { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var start in starts)
            {
                if (string.IsNullOrEmpty(start)) continue;
                var dir = new DirectoryInfo(start);
                for (int depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
                {
                    string path = Path.Combine(dir.FullName, "assets", "data", "pig_rooms.json");
                    if (!File.Exists(path)) continue;
                    try
                    {
                        return Load(File.ReadAllText(path));
                    }
                    catch (Exception ex)
                    {
                        Log($"could not read {path} ({ex.Message}), using code defaults.");
                        return CreateDefault();
                    }
                }
            }
            Log("pig_rooms.json not found, using code defaults.");
            return CreateDefault();
        }

        public static PigRoomConfig Load(string json)
        {
            var cfg = new PigRoomConfig();
            if (string.IsNullOrWhiteSpace(json))
            {
                Log("empty JSON, using code defaults.");
                return cfg;
            }

            JObject root;
            try
            {
                root = JObject.Parse(json);
            }
            catch (Exception ex)
            {
                Log($"bad JSON ({ex.Message}), using code defaults.");
                return cfg;
            }

            cfg.ApplyTemplate(Obj(root, "template"));
            cfg.ApplyComfort(Obj(root, "comfort"));
            cfg.VariantCount = Clamp(Read(Obj(root, "variants"), "count", 4), MinVariantCount, MaxVariantCount, "variants.count");
            cfg.ApplyDorm(Obj(root, "dorm"));

            var defaults = ParseThemeArray(root["default_themes"] as JArray, DefaultThemeList(), "default_themes");
            cfg.DefaultThemes = defaults.Count > 0 ? defaults : DefaultThemeList();

            var named = new List<PigRoomTheme>();
            var names = new Dictionary<string, PigRoomTheme>(StringComparer.OrdinalIgnoreCase);
            if (root["themes"] is JObject themes)
            {
                foreach (var prop in themes.Properties())
                {
                    var theme = ParseTheme(prop.Value as JObject, "themes." + prop.Name, new PigRoomTheme(), cfg.DefaultThemes[0].Starter);
                    names[prop.Name] = theme;
                }
            }
            else
            {
                Log("'themes' is missing, no named themes.");
            }
            cfg.Themes = names;

            return cfg;
        }

        /// <summary>Room id of a pig: prefix + pig id (for example 'pig:kuki').</summary>
        public string RoomId(string pigId)
        {
            return IdPrefix + pigId;
        }

        public bool TryParseRoomId(string roomId, out string pigId)
        {
            pigId = null;
            if (string.IsNullOrEmpty(roomId) || !roomId.StartsWith(IdPrefix, StringComparison.Ordinal)) return false;
            string rest = roomId.Substring(IdPrefix.Length);
            if (rest.Length == 0) return false;
            pigId = rest;
            return true;
        }

        /// <summary>Room name from the template. The pig name is cut to MaxNameLen characters.</summary>
        public string NameFor(string pigName, bool memorial)
        {
            string name = string.IsNullOrWhiteSpace(pigName) ? "Pig" : pigName.Trim();
            if (name.Length > MaxNameLen) name = name.Substring(0, MaxNameLen);
            return (memorial ? MemorialNameTemplate : NameTemplate).Replace("{name}", name);
        }

        /// <summary>Named theme of the pig; other pigs get DefaultThemes[randomIndex] (modulo the count).</summary>
        public PigRoomTheme ThemeFor(string pigId, int randomIndex)
        {
            if (pigId != null && Themes.TryGetValue(pigId, out var theme)) return theme;
            int n = DefaultThemes.Count;
            int index = ((randomIndex % n) + n) % n;
            return DefaultThemes[index];
        }

        private void ApplyTemplate(JObject template)
        {
            IdPrefix = Read(template, "id_prefix", IdPrefix);
            NameTemplate = Read(template, "name", NameTemplate);
            MemorialNameTemplate = Read(template, "memorial_name", MemorialNameTemplate);
            int maxLen = Read(template, "max_name_len", MaxNameLen);
            if (maxLen < 1)
            {
                Log($"template.max_name_len {maxLen} is too small, using {MaxNameLen}.");
            }
            else
            {
                MaxNameLen = maxLen;
            }
            Levels = ParseLevels(template?["levels"] as JArray, DefaultPigLevels(), "template.levels");
        }

        private void ApplyComfort(JObject comfort)
        {
            ComfortOwn = Clamp(Read(comfort, "own", ComfortOwn), 0.0, 1.0, "comfort.own");
            ComfortCommon = Clamp(Read(comfort, "common", ComfortCommon), 0.0, 1.0, "comfort.common");
            ComfortOthers = Clamp(Read(comfort, "others", ComfortOthers), 0.0, 1.0, "comfort.others");
            if (ComfortCommon > ComfortOwn)
            {
                Log("comfort.common was above comfort.own, lowered to own.");
                ComfortCommon = ComfortOwn;
            }
            if (ComfortOthers > ComfortCommon)
            {
                Log("comfort.others was above comfort.common, lowered to common.");
                ComfortOthers = ComfortCommon;
            }
            if (comfort?["common_places"] is JArray places)
            {
                var list = new List<string>();
                foreach (var p in places)
                {
                    string s = p.Type == JTokenType.String ? (string)p : null;
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
                }
                CommonPlaces = list;
            }
        }

        private void ApplyDorm(JObject dorm)
        {
            var d = Dorm;
            d.Id = Read(dorm, "id", d.Id);
            d.Name = Read(dorm, "name", d.Name);
            d.UnlockCost = Read(dorm, "unlock_cost", d.UnlockCost);
            d.RequiresPigs = Read(dorm, "requires_pigs", d.RequiresPigs);
            d.MaxResidents = Clamp(Read(dorm, "max_residents", d.MaxResidents), MinResidents, MaxResidents, "dorm.max_residents");
            d.BondGainBonus = Read(dorm, "bond_gain_bonus", d.BondGainBonus);
            d.Levels = ParseLevels(dorm?["levels"] as JArray, DefaultDormLevels(), "dorm.levels");
        }

        private static IReadOnlyList<GridLevel> ParseLevels(JArray array, List<GridLevel> fallback, string where)
        {
            if (array == null)
            {
                Log($"{where} is missing, using code defaults.");
                return fallback;
            }

            var result = new List<GridLevel>();
            foreach (var token in array)
            {
                var o = token as JObject;
                int cols = Read(o, "cols", 0);
                int rows = Read(o, "rows", 0);
                int cost = Read(o, "cost", 0);
                if (cols < 1 || rows < 1)
                {
                    Log($"{where}: level with size {cols}x{rows} dropped.");
                    continue;
                }
                if (result.Count == 0)
                {
                    if (cost != 0) Log($"{where}: first level cost {cost} forced to 0.");
                    cost = 0;
                }
                else
                {
                    var prev = result[result.Count - 1];
                    if (cols < prev.Cols || rows < prev.Rows)
                    {
                        Log($"{where}: level {cols}x{rows} shrinks below {prev.Cols}x{prev.Rows}, dropped.");
                        continue;
                    }
                }
                result.Add(new GridLevel(cols, rows, cost));
            }

            if (result.Count == 0)
            {
                Log($"{where} has no valid level, using code defaults.");
                return fallback;
            }
            return result;
        }

        private static List<PigRoomTheme> ParseThemeArray(JArray array, List<PigRoomTheme> fallback, string where)
        {
            var result = new List<PigRoomTheme>();
            if (array == null) return result;
            foreach (var token in array)
            {
                var o = token as JObject;
                if (o == null)
                {
                    Log($"{where}: entry is not an object, dropped.");
                    continue;
                }
                result.Add(ParseTheme(o, where, new PigRoomTheme(), fallback[0].Starter));
            }
            return result;
        }

        private static PigRoomTheme ParseTheme(JObject o, string where, PigRoomTheme fieldFallback, IReadOnlyList<string> starterFill)
        {
            if (o == null)
            {
                Log($"{where} is not an object, using the default theme.");
                return DefaultThemeList()[0];
            }

            var starter = new List<string>();
            if (o["starter"] is JArray items)
            {
                foreach (var item in items)
                {
                    if (item.Type == JTokenType.String) starter.Add((string)item);
                }
            }
            else
            {
                Log($"{where}: starter is missing.");
            }
            if (starter.Count != StarterItemCount)
            {
                Log($"{where}: starter has {starter.Count} items, adjusted to {StarterItemCount} from the default theme.");
                starter = FixStarter(starter, starterFill);
            }

            return new PigRoomTheme
            {
                Wallpaper = Read(o, "wallpaper", fieldFallback.Wallpaper),
                Floor = Read(o, "floor", fieldFallback.Floor),
                WallTile = Read(o, "wall_tile", fieldFallback.WallTile),
                FloorTile = Read(o, "floor_tile", fieldFallback.FloorTile),
                Starter = starter,
                Signature = Read(o, "signature", fieldFallback.Signature),
                Mood = Read(o, "mood", fieldFallback.Mood),
            };
        }

        private static List<string> FixStarter(List<string> starter, IReadOnlyList<string> fill)
        {
            var list = new List<string>(starter);
            if (list.Count > StarterItemCount) list.RemoveRange(StarterItemCount, list.Count - StarterItemCount);
            foreach (var f in fill)
            {
                if (list.Count >= StarterItemCount) break;
                if (!list.Contains(f)) list.Add(f);
            }
            for (int i = 0; list.Count < StarterItemCount; i++)
            {
                list.Add(fill[i % fill.Count]);
            }
            return list;
        }

        private static Dictionary<string, PigRoomTheme> BuildThemeMap(IEnumerable<KeyValuePair<string, PigRoomTheme>> pairs)
        {
            var map = new Dictionary<string, PigRoomTheme>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in pairs) map[p.Key] = p.Value;
            return map;
        }

        private static JObject Obj(JObject parent, string key)
        {
            return parent?[key] as JObject;
        }

        private static T Read<T>(JObject parent, string key, T fallback)
        {
            if (parent == null) return fallback;
            JToken token = parent[key];
            if (token == null || token.Type == JTokenType.Null) return fallback;
            try
            {
                return token.Value<T>();
            }
            catch (Exception)
            {
                Log($"'{key}' has the wrong type, using the default.");
                return fallback;
            }
        }

        private static int Clamp(int value, int min, int max, string what)
        {
            int v = Math.Max(min, Math.Min(max, value));
            if (v != value) Log($"{what} {value} clamped to {v}.");
            return v;
        }

        private static double Clamp(double value, double min, double max, string what)
        {
            double v = Math.Max(min, Math.Min(max, value));
            if (v != value) Log($"{what} {value} clamped to {v}.");
            return v;
        }

        private static void Log(string message)
        {
            ItemCatalog.ErrorLogger?.Invoke("PigRoomConfig: " + message);
        }

        private static List<GridLevel> DefaultPigLevels()
        {
            return new List<GridLevel> { new GridLevel(10, 6, 0), new GridLevel(12, 7, 400), new GridLevel(14, 8, 900) };
        }

        private static List<GridLevel> DefaultDormLevels()
        {
            return new List<GridLevel> { new GridLevel(16, 8, 0), new GridLevel(20, 9, 1100), new GridLevel(24, 10, 1800) };
        }

        private static List<string> DefaultCommonPlaces()
        {
            return new List<string> { "salon", "bedroom", "playroom", "dorm", "garden", "park" };
        }

        private static List<PigRoomTheme> DefaultThemeList()
        {
            return new List<PigRoomTheme>
            {
                new PigRoomTheme { Wallpaper = "wallpaper_mint", Floor = "floor_wood_light", Starter = new List<string> { "cushion_big", "window_sun", "side_table" } },
                new PigRoomTheme { Wallpaper = "wallpaper_peach", Floor = "floor_wood_light", Starter = new List<string> { "cushion_big", "wall_clock", "toy_basket" } },
                new PigRoomTheme { Wallpaper = "wallpaper_sky", Floor = "floor_wood_light", Starter = new List<string> { "cushion_big", "curtains_dots", "side_table" } },
            };
        }

        private static List<KeyValuePair<string, PigRoomTheme>> DefaultNamedThemes()
        {
            return new List<KeyValuePair<string, PigRoomTheme>>
            {
                new KeyValuePair<string, PigRoomTheme>("kuki", new PigRoomTheme { Wallpaper = "wallpaper_mint", Floor = "floor_wood_light", Starter = new List<string> { "cushion_big", "window_sun", "side_table" }, Signature = "sig_kuki_blanket", Mood = "calm meadow", WallTile = "wall_pig_kuki", FloorTile = "floor_pig_kuki" }),
                new KeyValuePair<string, PigRoomTheme>("ned", new PigRoomTheme { Wallpaper = "wallpaper_peach", Floor = "floor_carpet_red", Starter = new List<string> { "hay_bar_wood", "cushion_big", "shelf_small" }, Signature = "sig_ned_snack_nook", Mood = "snack nook", WallTile = "wall_pig_ned", FloorTile = "floor_pig_ned" }),
                new KeyValuePair<string, PigRoomTheme>("james", new PigRoomTheme { Wallpaper = "wallpaper_night", Floor = "floor_tiles_checker", Starter = new List<string> { "cosy_nook", "curtains_dots", "fairy_lights" }, Signature = "sig_james_hideout", Mood = "safe hideout", WallTile = "wall_pig_james", FloorTile = "floor_pig_james" }),
                new KeyValuePair<string, PigRoomTheme>("glen", new PigRoomTheme { Wallpaper = "wallpaper_lilac", Floor = "floor_wood_light", Starter = new List<string> { "armchair", "bookshelf", "cushion_big" }, Signature = "sig_glen_knit_bed", Mood = "cosy reading corner", WallTile = "wall_pig_glen", FloorTile = "floor_pig_glen" }),
                new KeyValuePair<string, PigRoomTheme>("racuch", new PigRoomTheme { Wallpaper = "wallpaper_sky", Floor = "floor_grass", Starter = new List<string> { "toy_basket", "fairy_lights", "hanging_planter" }, Signature = "sig_racuch_hop_pad", Mood = "play corner", WallTile = "wall_pig_racuch", FloorTile = "floor_pig_racuch" }),
            };
        }
    }
}
