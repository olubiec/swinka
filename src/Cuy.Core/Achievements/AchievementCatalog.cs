using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Achievements
{
    public class AchievementRule
    {
        public string Kind { get; set; }
        public string Name { get; set; }
        public int AtLeast { get; set; }
    }

    public class AchievementDef
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Text { get; set; }
        public string Category { get; set; }
        public bool Hidden { get; set; }
        public AchievementRule Rule { get; set; }
        public int Reward { get; set; }
    }

    public sealed class AchievementCatalog
    {
        private static readonly object _syncLock = new object();
        private static AchievementCatalog _current;

        public static AchievementCatalog Current
        {
            get
            {
                if (_current != null) return _current;
                lock (_syncLock)
                {
                    if (_current == null) _current = LoadDefault();
                    return _current;
                }
            }
        }

        private readonly Dictionary<string, AchievementDef> _achievements = new Dictionary<string, AchievementDef>(StringComparer.OrdinalIgnoreCase);

        public IReadOnlyCollection<AchievementDef> All => _achievements.Values;

        public bool TryGet(string id, out AchievementDef def)
        {
            if (string.IsNullOrEmpty(id)) { def = null; return false; }
            return _achievements.TryGetValue(id, out def);
        }

        public static AchievementCatalog Load(string json)
        {
            var catalog = new AchievementCatalog();
            if (string.IsNullOrWhiteSpace(json)) return catalog;

            try
            {
                var root = JObject.Parse(json);
                var arr = root["achievements"] as JArray;
                if (arr != null)
                {
                    foreach (var token in arr)
                    {
                        try
                        {
                            var def = token.ToObject<AchievementDef>();
                            if (def != null && !string.IsNullOrWhiteSpace(def.Id))
                            {
                                if (!catalog._achievements.ContainsKey(def.Id))
                                {
                                    catalog._achievements[def.Id] = def;
                                }
                                else
                                {
                                    ItemCatalog.ErrorLogger?.Invoke($"[AchievementCatalog] Duplicate achievement id: {def.Id}");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"[AchievementCatalog] Error parsing achievement: {ex.Message}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[AchievementCatalog] Failed to parse JSON: {ex.Message}");
            }
            return catalog;
        }

        public static AchievementCatalog LoadDefault()
        {
            string[] candidates = {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "data", "achievements.json"),
                Path.Combine(AppContext.BaseDirectory, "assets", "data", "achievements.json")
            };

            foreach (var path in candidates)
            {
                if (File.Exists(path))
                {
                    try
                    {
                        return Load(File.ReadAllText(path));
                    }
                    catch (Exception ex)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"[AchievementCatalog] Error reading {path}: {ex.Message}");
                    }
                }
            }

            // Fallback walking up
            string dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                string p = Path.Combine(dir, "assets", "data", "achievements.json");
                if (File.Exists(p))
                {
                    try { return Load(File.ReadAllText(p)); } catch { }
                }
                var parent = Directory.GetParent(dir);
                dir = parent?.FullName;
            }

            return new AchievementCatalog();
        }
    }
}
