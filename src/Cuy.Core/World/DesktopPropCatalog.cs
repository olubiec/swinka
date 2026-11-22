using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class DesktopPropDef
    {
        public string ItemId { get; set; }
        public string RoomItemId { get; set; }
        public string Name { get; set; }
        public string Sprite { get; set; }
        public string Icon { get; set; }
        public string Source { get; set; } // "world" | "inventory"
    }

    /// <summary>
    /// Catalogue of items that can sit on the Windows desktop.
    /// Reads assets/data/desktop_props.json following the HomeEconomyConfig pattern.
    /// </summary>
    public sealed class DesktopPropCatalog
    {
        private const int DefaultMaxOnDesktop = 6;
        private const int MinMaxOnDesktop = 1;
        private const int MaxMaxOnDesktop = 12;

        private static readonly object _syncLock = new object();
        private static DesktopPropCatalog _current;

        private readonly Dictionary<string, DesktopPropDef> _byId;
        private readonly List<DesktopPropDef> _all;
        private readonly List<string> _ids;

        public static DesktopPropCatalog Current
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

        public int MaxOnDesktop { get; }
        public IReadOnlyList<string> PropIds => _ids;
        public IReadOnlyList<DesktopPropDef> All => _all;

        private DesktopPropCatalog(IEnumerable<DesktopPropDef> defs, int maxOnDesktop)
        {
            MaxOnDesktop = ClampMax(maxOnDesktop);
            _byId = new Dictionary<string, DesktopPropDef>(StringComparer.OrdinalIgnoreCase);
            _all = new List<DesktopPropDef>();
            _ids = new List<string>();

            if (defs == null) return;

            foreach (var def in defs)
            {
                if (def == null || string.IsNullOrWhiteSpace(def.ItemId)) continue;
                if (_byId.ContainsKey(def.ItemId)) continue;

                var normalized = new DesktopPropDef
                {
                    ItemId = def.ItemId.Trim(),
                    RoomItemId = string.IsNullOrWhiteSpace(def.RoomItemId) ? null : def.RoomItemId.Trim(),
                    Name = string.IsNullOrWhiteSpace(def.Name) ? def.ItemId.Trim() : def.Name.Trim(),
                    Sprite = string.IsNullOrWhiteSpace(def.Sprite) ? null : def.Sprite.Trim(),
                    Icon = string.IsNullOrWhiteSpace(def.Icon) ? def.ItemId.Trim() : def.Icon.Trim(),
                    Source = string.Equals(def.Source, "inventory", StringComparison.OrdinalIgnoreCase) ? "inventory" : "world"
                };

                _byId[normalized.ItemId] = normalized;
                _all.Add(normalized);
                _ids.Add(normalized.ItemId);
            }
        }

        public static DesktopPropCatalog CreateDefault()
        {
            return new DesktopPropCatalog(BuildDefaultDefs(), DefaultMaxOnDesktop);
        }

        public static DesktopPropCatalog LoadDefault()
        {
            string[] starts = { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var start in starts)
            {
                if (string.IsNullOrEmpty(start)) continue;
                var dir = new DirectoryInfo(start);
                for (int depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
                {
                    string path = Path.Combine(dir.FullName, "assets", "data", "desktop_props.json");
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
            Log("desktop_props.json not found, using code defaults.");
            return CreateDefault();
        }

        public static DesktopPropCatalog Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                Log("empty JSON, using code defaults.");
                return CreateDefault();
            }

            JObject root;
            try
            {
                root = JObject.Parse(json);
            }
            catch (Exception ex)
            {
                Log($"bad JSON ({ex.Message}), using code defaults.");
                return CreateDefault();
            }

            int maxOnDesktop = DefaultMaxOnDesktop;
            var maxTok = root["max_on_desktop"];
            if (maxTok != null && maxTok.Type == JTokenType.Integer)
            {
                maxOnDesktop = maxTok.Value<int>();
            }

            var defs = new List<DesktopPropDef>();
            if (root["props"] is JArray arr)
            {
                foreach (var tok in arr)
                {
                    if (!(tok is JObject obj)) continue;
                    string itemId = obj["itemId"]?.Value<string>();
                    if (string.IsNullOrWhiteSpace(itemId)) continue;

                    defs.Add(new DesktopPropDef
                    {
                        ItemId = itemId,
                        RoomItemId = obj["roomItemId"]?.Value<string>(),
                        Name = obj["name"]?.Value<string>(),
                        Sprite = obj["sprite"]?.Value<string>(),
                        Icon = obj["icon"]?.Value<string>(),
                        Source = obj["source"]?.Value<string>()
                    });
                }
            }

            if (defs.Count == 0)
            {
                Log("no props in JSON, using code defaults.");
                return CreateDefault();
            }

            return new DesktopPropCatalog(defs, maxOnDesktop);
        }

        public static DesktopPropCatalog FromWorldCatalog(WorldItemCatalog items, int maxOnDesktop = 6)
        {
            if (items == null)
            {
                return new DesktopPropCatalog(Array.Empty<DesktopPropDef>(), maxOnDesktop);
            }

            var defs = new List<DesktopPropDef>();
            foreach (var item in items.All)
            {
                if (item == null || string.IsNullOrWhiteSpace(item.PropOf)) continue;
                defs.Add(new DesktopPropDef
                {
                    ItemId = item.PropOf,
                    RoomItemId = item.Id,
                    Name = item.Name,
                    Sprite = null,
                    Icon = item.Icon,
                    Source = "world"
                });
            }

            return new DesktopPropCatalog(defs, maxOnDesktop);
        }

        public bool IsProp(string itemId)
        {
            return !string.IsNullOrWhiteSpace(itemId) && _byId.ContainsKey(itemId.Trim());
        }

        public DesktopPropDef Find(string itemId)
        {
            if (string.IsNullOrWhiteSpace(itemId)) return null;
            return _byId.TryGetValue(itemId.Trim(), out var def) ? def : null;
        }

        public string RoomItemFor(string itemId)
        {
            return Find(itemId)?.RoomItemId;
        }

        public string InventoryFor(string roomItemId)
        {
            if (string.IsNullOrWhiteSpace(roomItemId)) return null;
            string target = roomItemId.Trim();

            var inventoryMatch = _all.FirstOrDefault(d =>
                string.Equals(d.RoomItemId, target, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(d.Source, "inventory", StringComparison.OrdinalIgnoreCase));
            if (inventoryMatch != null) return inventoryMatch.ItemId;

            var anyMatch = _all.FirstOrDefault(d =>
                string.Equals(d.RoomItemId, target, StringComparison.OrdinalIgnoreCase));
            return anyMatch?.ItemId;
        }

        private static int ClampMax(int value)
        {
            if (value < MinMaxOnDesktop) return MinMaxOnDesktop;
            if (value > MaxMaxOnDesktop) return MaxMaxOnDesktop;
            return value;
        }

        private static void Log(string message)
        {
            ItemCatalog.ErrorLogger?.Invoke("DesktopPropCatalog: " + message);
        }

        private static IEnumerable<DesktopPropDef> BuildDefaultDefs()
        {
            return new[]
            {
                new DesktopPropDef { ItemId = "toy_basket", RoomItemId = "toy_basket", Name = "Toy basket", Sprite = "props/ball.png", Icon = "toy_basket", Source = "world" },
                new DesktopPropDef { ItemId = "cushion_big", RoomItemId = "cushion_big", Name = "Big cushion", Sprite = "world/house/cushion_big.png", Icon = "cushion_big", Source = "world" },
                new DesktopPropDef { ItemId = "cosy_nook", RoomItemId = "cosy_nook", Name = "Cosy nook", Sprite = "props/house.png", Icon = "cosy_nook", Source = "world" },
                new DesktopPropDef { ItemId = "hay_basket", RoomItemId = "hay_basket", Name = "Hay basket", Sprite = "props/hay_ball.png", Icon = "hay_basket", Source = "world" },
                new DesktopPropDef { ItemId = "pigloo_garden", RoomItemId = "pigloo_garden", Name = "Garden hideout", Sprite = "props/house.png", Icon = "pigloo_garden", Source = "world" },
                new DesktopPropDef { ItemId = "willow_tunnel", RoomItemId = "willow_tunnel", Name = "Willow tunnel", Sprite = "props/tunnel.png", Icon = "tunnel", Source = "world" },
                new DesktopPropDef { ItemId = "golden_bowl", RoomItemId = null, Name = "Golden bowl", Sprite = "props/ball.png", Icon = "golden_bowl", Source = "inventory" },
                new DesktopPropDef { ItemId = "warm_house_bed", RoomItemId = "cosy_nook", Name = "Warm bed", Sprite = "props/house.png", Icon = "bed", Source = "inventory" }
            };
        }
    }
}
