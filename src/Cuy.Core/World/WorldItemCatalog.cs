using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class WorldItemDefinition
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public IReadOnlyList<string> Place { get; set; }
        public IReadOnlyList<string> Places => Place;
        public int W { get; set; }
        public int H { get; set; }
        public int Width => W;
        public int Height => H;
        public int Price { get; set; }
        public int Comfort { get; set; }
        public string Layer { get; set; }
        public string Icon { get; set; }
        public bool Free { get; set; }
        public bool IsFree => Free || Price == 0;
        public string Requires { get; set; }
        public bool Repeatable { get; set; }
        public string Note { get; set; }
        public string SignatureOf { get; set; }
        public string PropOf { get; set; }
        public bool Recolor { get; set; }

        public WorldItemDefinition()
        {
            Place = Array.Empty<string>();
        }

        public WorldItemDefinition(
            string id,
            string name,
            IReadOnlyList<string> place,
            int w,
            int h,
            int price,
            int comfort,
            string layer,
            string icon,
            bool free = false,
            string requires = null,
            bool repeatable = false,
            string note = null,
            string signatureOf = null,
            string propOf = null,
            bool recolor = false)
        {
            Id = id;
            Name = name;
            Place = place ?? Array.Empty<string>();
            W = w;
            H = h;
            Price = price;
            Comfort = comfort;
            Layer = layer;
            Icon = icon;
            Free = free;
            Requires = requires;
            Repeatable = repeatable;
            Note = note;
            SignatureOf = signatureOf;
            PropOf = propOf;
            Recolor = recolor;
        }
    }

    public sealed class WorldItemCatalog
    {
        private static readonly object _syncLock = new object();
        private static WorldItemCatalog _current;

        public static WorldItemCatalog Current
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

        private readonly List<WorldItemDefinition> _items = new List<WorldItemDefinition>();
        private readonly Dictionary<string, WorldItemDefinition> _itemsById = new Dictionary<string, WorldItemDefinition>(StringComparer.OrdinalIgnoreCase);
        private readonly List<string> _layers = new List<string>();

        public IReadOnlyList<WorldItemDefinition> Items => _items;
        public IReadOnlyList<WorldItemDefinition> All => _items;
        public IReadOnlyList<string> Layers => _layers;

        public WorldItemCatalog()
        {
            _layers.AddRange(new[] { "ground", "floor", "wall" });
        }

        public WorldItemCatalog(IEnumerable<WorldItemDefinition> items, IEnumerable<string> layers = null)
        {
            if (layers != null)
            {
                foreach (var l in layers)
                {
                    if (!string.IsNullOrWhiteSpace(l) && !_layers.Contains(l, StringComparer.OrdinalIgnoreCase))
                        _layers.Add(l.Trim());
                }
            }
            if (_layers.Count == 0)
            {
                _layers.AddRange(new[] { "ground", "floor", "wall" });
            }

            if (items != null)
            {
                foreach (var item in items)
                {
                    if (item == null || string.IsNullOrWhiteSpace(item.Id)) continue;
                    if (!_itemsById.ContainsKey(item.Id))
                    {
                        _itemsById[item.Id] = item;
                        _items.Add(item);
                    }
                }
            }
        }

        public WorldItemDefinition Find(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            _itemsById.TryGetValue(id, out var def);
            return def;
        }

        public bool TryGet(string id, out WorldItemDefinition item)
        {
            if (string.IsNullOrEmpty(id))
            {
                item = null;
                return false;
            }
            return _itemsById.TryGetValue(id, out item);
        }

        public IReadOnlyList<WorldItemDefinition> ForPlace(string placeId)
        {
            if (string.IsNullOrEmpty(placeId)) return Array.Empty<WorldItemDefinition>();
            var result = new List<WorldItemDefinition>();
            foreach (var item in _items)
            {
                if (item.Place != null)
                {
                    foreach (var p in item.Place)
                    {
                        if (string.Equals(p, placeId, StringComparison.OrdinalIgnoreCase))
                        {
                            result.Add(item);
                            break;
                        }
                    }
                }
            }
            return result;
        }

        public static WorldItemCatalog Load(string json)
        {
            var catalog = new WorldItemCatalog();
            catalog._layers.Clear();

            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("[WorldItemCatalog] Empty or null JSON provided.");
                catalog._layers.AddRange(new[] { "ground", "floor", "wall" });
                return catalog;
            }

            try
            {
                var root = JObject.Parse(json);

                // Layers
                if (root["layers"] is JArray layersArr)
                {
                    foreach (var l in layersArr)
                    {
                        var lStr = (string)l;
                        if (!string.IsNullOrWhiteSpace(lStr) && !catalog._layers.Contains(lStr.Trim(), StringComparer.OrdinalIgnoreCase))
                        {
                            catalog._layers.Add(lStr.Trim());
                        }
                    }
                }
                if (catalog._layers.Count == 0)
                {
                    catalog._layers.AddRange(new[] { "ground", "floor", "wall" });
                }

                var knownLayers = new HashSet<string>(catalog._layers, StringComparer.OrdinalIgnoreCase);
                knownLayers.Add("ground");
                knownLayers.Add("floor");
                knownLayers.Add("wall");

                var knownPlaces = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "house", "garden", "park", "farm", "market"
                };

                // Items
                if (root["items"] is JArray itemsArr)
                {
                    foreach (var token in itemsArr)
                    {
                        try
                        {
                            string id = (string)token["id"];
                            if (string.IsNullOrWhiteSpace(id))
                            {
                                continue;
                            }
                            id = id.Trim();

                            // Rule: duplicate ids keep the first
                            if (catalog._itemsById.ContainsKey(id))
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Duplicate item id skipped: {id}");
                                continue;
                            }

                            // Layer
                            string layer = (string)token["layer"];
                            if (string.IsNullOrWhiteSpace(layer) || !knownLayers.Contains(layer.Trim()))
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Item '{id}' has unknown layer '{layer}', dropped.");
                                continue;
                            }
                            layer = layer.Trim();

                            // Places
                            var placeList = new List<string>();
                            if (token["place"] is JArray placeArr)
                            {
                                foreach (var p in placeArr)
                                {
                                    var pStr = (string)p;
                                    if (!string.IsNullOrWhiteSpace(pStr))
                                        placeList.Add(pStr.Trim());
                                }
                            }
                            else if (token["place"] != null)
                            {
                                var pStr = (string)token["place"];
                                if (!string.IsNullOrWhiteSpace(pStr))
                                    placeList.Add(pStr.Trim());
                            }

                            if (placeList.Count == 0)
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Item '{id}' has no places, dropped.");
                                continue;
                            }

                            bool hasUnknownPlace = false;
                            foreach (var p in placeList)
                            {
                                if (!knownPlaces.Contains(p))
                                {
                                    hasUnknownPlace = true;
                                    ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Item '{id}' has unknown place id '{p}', dropped.");
                                    break;
                                }
                            }
                            if (hasUnknownPlace)
                            {
                                continue;
                            }

                            // Dimensions: w/h outside 1-6 drop it
                            int w = (int?)token["w"] ?? 0;
                            int h = (int?)token["h"] ?? 0;
                            if (w < 1 || w > 6 || h < 1 || h > 6)
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Item '{id}' has invalid dimensions {w}x{h}, dropped.");
                                continue;
                            }

                            // Price: negative price becomes 0
                            int price = (int?)token["price"] ?? 0;
                            if (price < 0)
                            {
                                price = 0;
                            }

                            // Comfort: clamped 0-10
                            int comfort = (int?)token["comfort"] ?? 0;
                            if (comfort < 0) comfort = 0;
                            if (comfort > 10) comfort = 10;

                            string name = (string)token["name"] ?? id;
                            string icon = (string)token["icon"];
                            bool free = (bool?)token["free"] ?? (price == 0);
                            string requires = (string)token["requires"];

                            // Repeatable: explicit flag if present; default true for ground layer and fences
                            bool repeatable;
                            if (token["repeatable"] != null)
                            {
                                repeatable = (bool)token["repeatable"];
                            }
                            else
                            {
                                repeatable = string.Equals(layer, "ground", StringComparison.OrdinalIgnoreCase) ||
                                             id.IndexOf("fence", StringComparison.OrdinalIgnoreCase) >= 0;
                            }

                            string note = (string)token["note"];
                            string signatureOf = (string)token["signature_of"];
                            string propOf = (string)token["prop_of"];
                            bool recolor = (bool?)token["recolor"] ?? false;

                            var def = new WorldItemDefinition(
                                id,
                                name,
                                placeList.AsReadOnly(),
                                w,
                                h,
                                price,
                                comfort,
                                layer,
                                icon,
                                free,
                                requires,
                                repeatable,
                                note,
                                signatureOf,
                                propOf,
                                recolor);

                            catalog._itemsById[id] = def;
                            catalog._items.Add(def);
                        }
                        catch (Exception ex)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Error parsing item: {ex.Message}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[WorldItemCatalog] Failed to parse JSON: {ex.Message}");
                if (catalog._layers.Count == 0)
                {
                    catalog._layers.AddRange(new[] { "ground", "floor", "wall" });
                }
            }

            return catalog;
        }

        public static WorldItemCatalog LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("world_items.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static WorldItemCatalog LoadDefault()
        {
            string dir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            while (!string.IsNullOrEmpty(dir))
            {
                string candidate = Path.Combine(dir, "assets", "data", "world_items.json");
                if (File.Exists(candidate))
                {
                    return LoadFromFile(candidate);
                }
                string parent = Path.GetDirectoryName(dir);
                if (parent == null || parent == dir) break;
                dir = parent;
            }

            string curDir = Directory.GetCurrentDirectory();
            while (!string.IsNullOrEmpty(curDir))
            {
                string candidate = Path.Combine(curDir, "assets", "data", "world_items.json");
                if (File.Exists(candidate))
                {
                    return LoadFromFile(candidate);
                }
                string parent = Path.GetDirectoryName(curDir);
                if (parent == null || parent == curDir) break;
                curDir = parent;
            }

            var asm = typeof(WorldItemCatalog).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("world_items.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return Load(reader.ReadToEnd());
                            }
                        }
                    }
                }
            }

            ItemCatalog.ErrorLogger?.Invoke("[WorldItemCatalog] world_items.json not found, using empty catalog.");
            return new WorldItemCatalog();
        }
    }
}
