using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class OutdoorDefaultItem
    {
        public string Id { get; }
        public string ItemId { get; }
        public int X { get; }
        public int Y { get; }
        public bool Flip { get; }
        public bool Movable { get; }
        public bool Removable { get; }

        public OutdoorDefaultItem(
            string id,
            string itemId,
            int x,
            int y,
            bool flip = false,
            bool movable = true,
            bool removable = true)
        {
            Id = id ?? string.Empty;
            ItemId = itemId ?? string.Empty;
            X = x;
            Y = y;
            Flip = flip;
            Movable = movable;
            Removable = removable;
        }
    }

    public sealed class OutdoorDefaults
    {
        private static readonly object _syncLock = new object();
        private static OutdoorDefaults _current;

        private readonly Dictionary<string, IReadOnlyList<OutdoorDefaultItem>> _scenes;
        private readonly HashSet<string> _lockedFixtureUids;

        public static OutdoorDefaults Current
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
            set
            {
                lock (_syncLock)
                {
                    _current = value;
                }
            }
        }

        public IReadOnlyDictionary<string, IReadOnlyList<OutdoorDefaultItem>> Scenes => _scenes;

        public OutdoorDefaults(IDictionary<string, IReadOnlyList<OutdoorDefaultItem>> scenes = null)
        {
            _scenes = new Dictionary<string, IReadOnlyList<OutdoorDefaultItem>>(StringComparer.OrdinalIgnoreCase);
            _lockedFixtureUids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (scenes != null)
            {
                foreach (var kv in scenes)
                {
                    if (string.IsNullOrWhiteSpace(kv.Key) || kv.Value == null) continue;
                    var list = new List<OutdoorDefaultItem>();
                    foreach (var item in kv.Value)
                    {
                        if (item == null) continue;
                        list.Add(item);
                        if (!item.Removable && !string.IsNullOrEmpty(item.Id))
                        {
                            _lockedFixtureUids.Add(OutdoorSeed.BuildUid(kv.Key.Trim(), item.Id));
                        }
                    }
                    _scenes[kv.Key.Trim()] = list;
                }
            }
        }

        public IReadOnlyList<OutdoorDefaultItem> ForScene(string sceneId)
        {
            if (string.IsNullOrWhiteSpace(sceneId)) return Array.Empty<OutdoorDefaultItem>();
            return _scenes.TryGetValue(sceneId.Trim(), out var items)
                ? items
                : Array.Empty<OutdoorDefaultItem>();
        }

        public bool IsLockedFixture(string uid)
        {
            return !string.IsNullOrEmpty(uid) && _lockedFixtureUids.Contains(uid);
        }

        public static OutdoorDefaults Load(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            {
                ItemCatalog.ErrorLogger?.Invoke($"[OutdoorDefaults] File not found: {path}");
                return CreateCodeDefaults();
            }

            try
            {
                string json = File.ReadAllText(path);
                return LoadFromJson(json);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[OutdoorDefaults] Failed to load '{path}': {ex.Message}");
                return CreateCodeDefaults();
            }
        }

        public static OutdoorDefaults LoadFromJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("[OutdoorDefaults] Empty JSON provided.");
                return CreateCodeDefaults();
            }

            try
            {
                var root = JObject.Parse(json);
                var scenesObj = root["scenes"] as JObject;
                if (scenesObj == null)
                {
                    ItemCatalog.ErrorLogger?.Invoke("[OutdoorDefaults] Missing 'scenes' object.");
                    return CreateCodeDefaults();
                }

                var scenes = new Dictionary<string, IReadOnlyList<OutdoorDefaultItem>>(StringComparer.OrdinalIgnoreCase);
                foreach (var prop in scenesObj.Properties())
                {
                    if (!(prop.Value is JArray arr)) continue;
                    var list = new List<OutdoorDefaultItem>();
                    foreach (var token in arr)
                    {
                        string id = ((string)token["id"])?.Trim();
                        string itemId = ((string)token["itemId"])?.Trim();
                        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(itemId)) continue;

                        int x = (int?)token["x"] ?? 0;
                        int y = (int?)token["y"] ?? 0;
                        bool flip = (bool?)token["flip"] ?? false;
                        bool movable = (bool?)token["movable"] ?? true;
                        bool removable = (bool?)token["removable"] ?? true;
                        list.Add(new OutdoorDefaultItem(id, itemId, x, y, flip, movable, removable));
                    }
                    scenes[prop.Name] = list;
                }
                return new OutdoorDefaults(scenes);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[OutdoorDefaults] JSON parse error: {ex.Message}");
                return CreateCodeDefaults();
            }
        }

        public static OutdoorDefaults LoadDefault()
        {
            var candidates = new List<string>();

            var baseDir = AppContext.BaseDirectory;
            if (!string.IsNullOrEmpty(baseDir))
            {
                candidates.Add(Path.Combine(baseDir, "assets", "data", "outdoor_defaults.json"));
                var dir = new DirectoryInfo(baseDir);
                for (int i = 0; i < 6 && dir != null; i++, dir = dir.Parent)
                {
                    candidates.Add(Path.Combine(dir.FullName, "assets", "data", "outdoor_defaults.json"));
                }
            }

            var cwd = Directory.GetCurrentDirectory();
            if (!string.IsNullOrEmpty(cwd))
            {
                candidates.Add(Path.Combine(cwd, "assets", "data", "outdoor_defaults.json"));
            }

            foreach (var path in candidates)
            {
                if (File.Exists(path))
                {
                    return Load(path);
                }
            }

            var asm = typeof(OutdoorDefaults).GetTypeInfo().Assembly;
            var resName = "Cuy.Core.assets.data.outdoor_defaults.json";
            using (var stream = asm.GetManifestResourceStream(resName))
            {
                if (stream != null)
                {
                    using (var reader = new StreamReader(stream))
                    {
                        return LoadFromJson(reader.ReadToEnd());
                    }
                }
            }

            ItemCatalog.ErrorLogger?.Invoke("[OutdoorDefaults] No outdoor_defaults.json found, using code defaults.");
            return CreateCodeDefaults();
        }

        public static OutdoorDefaults CreateCodeDefaults()
        {
            var scenes = new Dictionary<string, IReadOnlyList<OutdoorDefaultItem>>(StringComparer.OrdinalIgnoreCase)
            {
                ["garden"] = new[]
                {
                    new OutdoorDefaultItem("bench", "bench_wood", 9, 6, false, true, true),
                    new OutdoorDefaultItem("fountain", "bird_bath", 4, 7, false, true, true),
                    new OutdoorDefaultItem("flower_bed_left", "flowerbed_tulip", 1, 7, false, true, true),
                    new OutdoorDefaultItem("flower_bed_right", "flowerbed_daisy", 12, 7, false, true, true),
                    new OutdoorDefaultItem("tree_left", "tree_small", 12, 3, false, true, true),
                    new OutdoorDefaultItem("tree_right", "tree_small", 14, 3, false, true, true),
                    new OutdoorDefaultItem("hedge", "hedge", 11, 4, false, true, true),
                    new OutdoorDefaultItem("burrow", "willow_tunnel", 1, 4, false, true, false)
                },
                ["park"] = new[]
                {
                    new OutdoorDefaultItem("gazebo", "gazebo", 3, 3, false, true, true),
                    new OutdoorDefaultItem("bench_left", "bench_park", 5, 6, false, true, true),
                    new OutdoorDefaultItem("bench_right", "bench_park", 12, 6, false, true, true),
                    new OutdoorDefaultItem("bridge", "bridge_wood", 9, 3, false, true, false),
                    new OutdoorDefaultItem("tree_1", "tree_big", 0, 0, false, true, true),
                    new OutdoorDefaultItem("tree_2", "tree_big", 0, 4, false, true, true),
                    new OutdoorDefaultItem("tree_3", "tree_big", 13, 0, false, true, true),
                    new OutdoorDefaultItem("tree_4", "tree_big", 5, 0, false, true, true),
                    new OutdoorDefaultItem("lamp_left", "lamp_post", 1, 7, false, true, true),
                    new OutdoorDefaultItem("lamp_mid", "lamp_post", 8, 4, false, true, true),
                    new OutdoorDefaultItem("lamp_right", "lamp_post", 13, 4, false, true, true)
                },
                ["farm"] = new[]
                {
                    new OutdoorDefaultItem("barn", "barn_hay", 11, 1, false, true, false),
                    new OutdoorDefaultItem("fence_left", "fence_farm", 0, 4, false, true, true),
                    new OutdoorDefaultItem("fence_right", "fence_farm", 15, 4, false, true, true),
                    new OutdoorDefaultItem("plot:0", "plot_empty", 2, 5, false, true, false),
                    new OutdoorDefaultItem("plot:1", "plot_empty", 5, 5, false, true, false),
                    new OutdoorDefaultItem("plot:2", "plot_empty", 8, 5, false, true, false),
                    new OutdoorDefaultItem("plot:3", "plot_empty", 11, 5, false, true, false)
                },
                ["market"] = new[]
                {
                    new OutdoorDefaultItem("stall_left", "stall_basic", 1, 5, false, true, false),
                    new OutdoorDefaultItem("stall_center", "stall_big", 6, 5, false, true, false),
                    new OutdoorDefaultItem("stall_right", "stall_basic", 12, 5, false, true, false),
                    new OutdoorDefaultItem("notice_board", "order_board", 4, 6, false, true, true),
                    new OutdoorDefaultItem("sign_right", "signpost", 15, 6, false, true, true)
                }
            };
            return new OutdoorDefaults(scenes);
        }
    }
}
