using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class WorldState
    {
        public int Version { get; set; } = 1;

        public bool LegacyDecorMigrated { get; set; } = false;

        private Dictionary<string, int> _placeLevels;
        public Dictionary<string, int> PlaceLevels
        {
            get
            {
                if (_placeLevels == null)
                {
                    _placeLevels = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                }
                return _placeLevels;
            }
            set => _placeLevels = value;
        }

        private HashSet<string> _roomsUnlocked;
        public HashSet<string> RoomsUnlocked
        {
            get
            {
                if (_roomsUnlocked == null)
                {
                    _roomsUnlocked = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                }
                return _roomsUnlocked;
            }
            set => _roomsUnlocked = value;
        }

        private Dictionary<string, RoomLayout> _rooms;
        public Dictionary<string, RoomLayout> Rooms
        {
            get
            {
                if (_rooms == null)
                {
                    _rooms = new Dictionary<string, RoomLayout>(StringComparer.OrdinalIgnoreCase);
                }
                return _rooms;
            }
            set => _rooms = value;
        }

        private Dictionary<string, int> _ownedItems;
        public Dictionary<string, int> OwnedItems
        {
            get
            {
                if (_ownedItems == null)
                {
                    _ownedItems = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                }
                return _ownedItems;
            }
            set => _ownedItems = value;
        }

        private FarmState _farm;
        public FarmState Farm
        {
            get
            {
                if (_farm == null)
                {
                    _farm = new FarmState();
                }
                return _farm;
            }
            set => _farm = value;
        }

        private MarketState _market;
        public MarketState Market
        {
            get
            {
                if (_market == null)
                {
                    _market = new MarketState();
                }
                return _market;
            }
            set => _market = value;
        }
    }

    public sealed class RoomLayout
    {
        public string Wallpaper { get; set; }
        public string Floor { get; set; }

        private List<PlacedItem> _items;
        public List<PlacedItem> Items
        {
            get
            {
                if (_items == null)
                {
                    _items = new List<PlacedItem>();
                }
                return _items;
            }
            set => _items = value;
        }
    }

    public sealed class PlacedItem
    {
        public string Uid { get; set; }
        public string ItemId { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public bool Flip { get; set; }
    }

    public sealed class MarketState
    {
        public string DayLocalDate { get; set; }

        private Dictionary<string, int> _soldToday;
        public Dictionary<string, int> SoldToday
        {
            get
            {
                if (_soldToday == null)
                {
                    _soldToday = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                }
                return _soldToday;
            }
            set => _soldToday = value;
        }

        public double SalesToday { get; set; }

        private Dictionary<string, double> _demand;
        public Dictionary<string, double> Demand
        {
            get
            {
                if (_demand == null)
                {
                    _demand = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
                }
                return _demand;
            }
            set => _demand = value;
        }

        public int StallLevel { get; set; }

        private List<OrderState> _orders;
        public List<OrderState> Orders
        {
            get
            {
                if (_orders == null)
                {
                    _orders = new List<OrderState>();
                }
                return _orders;
            }
            set => _orders = value;
        }
    }

    public sealed class OrderState
    {
        public string CropId { get; set; }
        public int Count { get; set; }
        public bool Done { get; set; }
    }

    public sealed class GridLevel
    {
        public int Cols { get; }
        public int Rows { get; }
        public int Cost { get; }

        public GridLevel(int cols, int rows, int cost)
        {
            Cols = cols;
            Rows = rows;
            Cost = cost;
        }
    }

    public sealed class RoomDefinition
    {
        public string Id { get; }
        public string Name { get; }
        public bool UnlockedAtStart { get; }
        public int Cost { get; }
        public IReadOnlyList<GridLevel> Levels { get; }

        public RoomDefinition(
            string id,
            string name,
            bool unlockedAtStart,
            int cost,
            IReadOnlyList<GridLevel> levels)
        {
            Id = id ?? string.Empty;
            Name = name ?? string.Empty;
            UnlockedAtStart = unlockedAtStart;
            Cost = cost;
            Levels = levels ?? new GridLevel[0];
        }
    }

    public sealed class PlaceDefinition
    {
        public string Id { get; }
        public string Name { get; }
        public bool UnlockedAtStart { get; }
        public int Cost { get; }
        public IReadOnlyList<string> Requires { get; }
        public IReadOnlyList<GridLevel> Levels { get; }
        public IReadOnlyList<RoomDefinition> Rooms { get; }
        public IReadOnlyDictionary<string, int> WelcomeItems { get; }

        public PlaceDefinition(
            string id,
            string name,
            bool unlockedAtStart,
            int cost,
            IReadOnlyList<string> requires,
            IReadOnlyList<GridLevel> levels,
            IReadOnlyList<RoomDefinition> rooms,
            IReadOnlyDictionary<string, int> welcomeItems)
        {
            Id = id ?? string.Empty;
            Name = name ?? string.Empty;
            UnlockedAtStart = unlockedAtStart;
            Cost = cost;
            Requires = requires ?? new string[0];
            Levels = levels ?? new GridLevel[0];
            Rooms = rooms ?? new RoomDefinition[0];
            WelcomeItems = welcomeItems ?? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        }
    }

    public sealed class PlaceCatalog
    {
        private static readonly object _syncLock = new object();
        private static PlaceCatalog _current;

        public static PlaceCatalog Current
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

        public IReadOnlyList<PlaceDefinition> Places { get; }
        public int WallRows { get; }
        public int ComfortCap { get; }
        public double MoodDecayReductionAtCap { get; }
        public int WalkPerDay { get; }
        public int WalkMood { get; }
        public int WalkMinComfortGarden { get; }

        private readonly Dictionary<string, PlaceDefinition> _placesById;
        private readonly Dictionary<string, RoomDefinition> _roomsById;

        public PlaceCatalog(
            IEnumerable<PlaceDefinition> places,
            int wallRows,
            int comfortCap,
            double moodDecayReductionAtCap,
            int walkPerDay,
            int walkMood,
            int walkMinComfortGarden)
        {
            var placesList = new List<PlaceDefinition>();
            _placesById = new Dictionary<string, PlaceDefinition>(StringComparer.OrdinalIgnoreCase);
            _roomsById = new Dictionary<string, RoomDefinition>(StringComparer.OrdinalIgnoreCase);

            if (places != null)
            {
                foreach (var p in places)
                {
                    if (p == null || string.IsNullOrEmpty(p.Id)) continue;
                    if (!_placesById.ContainsKey(p.Id))
                    {
                        _placesById[p.Id] = p;
                        placesList.Add(p);
                        if (p.Rooms != null)
                        {
                            foreach (var r in p.Rooms)
                            {
                                if (r != null && !string.IsNullOrEmpty(r.Id) && !_roomsById.ContainsKey(r.Id))
                                {
                                    _roomsById[r.Id] = r;
                                }
                            }
                        }
                    }
                }
            }

            Places = placesList;
            WallRows = wallRows;
            ComfortCap = comfortCap;
            MoodDecayReductionAtCap = moodDecayReductionAtCap;
            WalkPerDay = walkPerDay;
            WalkMood = walkMood;
            WalkMinComfortGarden = walkMinComfortGarden;
        }

        public PlaceDefinition Find(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            PlaceDefinition p;
            return _placesById.TryGetValue(id, out p) ? p : null;
        }

        public RoomDefinition FindRoom(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            RoomDefinition r;
            return _roomsById.TryGetValue(id, out r) ? r : null;
        }

        public static PlaceCatalog CreateCodeDefaults()
        {
            var salonLevels = new List<GridLevel>
            {
                new GridLevel(12, 7, 0)
            };
            var salon = new RoomDefinition("salon", "Living room", true, 0, salonLevels);
            var house = new PlaceDefinition("house", "House", true, 0, new string[0], new GridLevel[0], new[] { salon }, new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase));
            var market = new PlaceDefinition("market", "Market", true, 0, new string[0], new GridLevel[0], new RoomDefinition[0], new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase));

            return new PlaceCatalog(
                places: new[] { house, market },
                wallRows: 2,
                comfortCap: 100,
                moodDecayReductionAtCap: 0.15,
                walkPerDay: 3,
                walkMood: 6,
                walkMinComfortGarden: 10);
        }

        public static PlaceCatalog Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("PlaceCatalog: JSON is empty, using code defaults.");
                return CreateCodeDefaults();
            }

            try
            {
                var root = JObject.Parse(json);

                int wallRows = 2;
                var gridTok = root["grid"];
                if (gridTok?["wall_rows"] != null)
                {
                    wallRows = Math.Max(0, (int)gridTok["wall_rows"]);
                }

                int comfortCap = 100;
                double moodReduction = 0.15;
                var comfortTok = root["comfort"];
                if (comfortTok != null)
                {
                    if (comfortTok["cap"] != null)
                    {
                        comfortCap = (int)comfortTok["cap"];
                        if (comfortCap < 10)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: comfort.cap ({comfortCap}) < 10, clamped to 10.");
                            comfortCap = 10;
                        }
                        else if (comfortCap > 500)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: comfort.cap ({comfortCap}) > 500, clamped to 500.");
                            comfortCap = 500;
                        }
                    }

                    if (comfortTok["mood_decay_reduction_at_cap"] != null)
                    {
                        moodReduction = (double)comfortTok["mood_decay_reduction_at_cap"];
                        if (double.IsNaN(moodReduction) || double.IsInfinity(moodReduction) || moodReduction < 0.0)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: mood_decay_reduction_at_cap ({moodReduction}) < 0, clamped to 0.");
                            moodReduction = 0.0;
                        }
                        else if (moodReduction > 0.5)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: mood_decay_reduction_at_cap ({moodReduction}) > 0.5, clamped to 0.5.");
                            moodReduction = 0.5;
                        }
                    }
                }

                int walkPerDay = 3;
                int walkMood = 6;
                int walkMinComfort = 10;
                var walkTok = root["walk"];
                if (walkTok != null)
                {
                    if (walkTok["per_day"] != null) walkPerDay = Math.Max(0, (int)walkTok["per_day"]);
                    if (walkTok["mood"] != null) walkMood = Math.Max(0, (int)walkTok["mood"]);
                    if (walkTok["min_comfort_garden"] != null) walkMinComfort = Math.Max(0, (int)walkTok["min_comfort_garden"]);
                }

                var rawPlaces = new List<JToken>();
                var knownPlaceIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var placesArr = root["places"] as JArray;
                if (placesArr != null)
                {
                    foreach (var pTok in placesArr)
                    {
                        string pId = pTok["id"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(pId) && !knownPlaceIds.Contains(pId))
                        {
                            knownPlaceIds.Add(pId);
                            rawPlaces.Add(pTok);
                        }
                    }
                }

                if (rawPlaces.Count == 0)
                {
                    return CreateCodeDefaults();
                }

                var places = new List<PlaceDefinition>();
                foreach (var pTok in rawPlaces)
                {
                    string id = pTok["id"].ToString();
                    string name = pTok["name"]?.ToString() ?? id;
                    bool unlockedAtStart = pTok["unlocked_at_start"] != null && (bool)pTok["unlocked_at_start"];
                    int cost = pTok["cost"] != null ? Math.Max(0, (int)pTok["cost"]) : 0;

                    var requires = new List<string>();
                    var reqArr = pTok["requires"] as JArray;
                    if (reqArr != null)
                    {
                        foreach (var rTok in reqArr)
                        {
                            string reqId = rTok?.ToString();
                            if (string.IsNullOrWhiteSpace(reqId)) continue;
                            if (knownPlaceIds.Contains(reqId))
                            {
                                requires.Add(reqId);
                            }
                            else
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: Place '{id}' requires unknown place '{reqId}', dropped.");
                            }
                        }
                    }

                    var levels = ParseLevels(pTok["levels"] as JArray, $"place '{id}'");

                    var rooms = new List<RoomDefinition>();
                    var roomsArr = pTok["rooms"] as JArray;
                    if (roomsArr != null)
                    {
                        foreach (var rmTok in roomsArr)
                        {
                            string rId = rmTok["id"]?.ToString();
                            if (string.IsNullOrWhiteSpace(rId)) continue;
                            string rName = rmTok["name"]?.ToString() ?? rId;
                            bool rUnlocked = rmTok["unlocked_at_start"] != null && (bool)rmTok["unlocked_at_start"];
                            int rCost = rmTok["cost"] != null ? Math.Max(0, (int)rmTok["cost"]) : 0;
                            var rLevels = ParseLevels(rmTok["levels"] as JArray, $"room '{rId}'");
                            rooms.Add(new RoomDefinition(rId, rName, rUnlocked, rCost, rLevels));
                        }
                    }

                    var welcomeItems = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    var welcomeObj = pTok["welcome_items"] as JObject;
                    if (welcomeObj != null)
                    {
                        foreach (var prop in welcomeObj.Properties())
                        {
                            welcomeItems[prop.Name] = (int)prop.Value;
                        }
                    }

                    places.Add(new PlaceDefinition(id, name, unlockedAtStart, cost, requires, levels, rooms, welcomeItems));
                }

                return new PlaceCatalog(places, wallRows, comfortCap, moodReduction, walkPerDay, walkMood, walkMinComfort);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: Error parsing JSON: {ex.Message}");
                return CreateCodeDefaults();
            }
        }

        private static List<GridLevel> ParseLevels(JArray levelsArr, string context)
        {
            var result = new List<GridLevel>();
            if (levelsArr == null) return result;

            for (int i = 0; i < levelsArr.Count; i++)
            {
                var lTok = levelsArr[i];
                int cols = lTok["cols"] != null ? Math.Max(1, (int)lTok["cols"]) : 1;
                int rows = lTok["rows"] != null ? Math.Max(1, (int)lTok["rows"]) : 1;
                int cost = lTok["cost"] != null ? Math.Max(0, (int)lTok["cost"]) : 0;
                if (i == 0 && cost != 0)
                {
                    ItemCatalog.ErrorLogger?.Invoke($"PlaceCatalog: First level of {context} had cost {cost}, forced to 0.");
                    cost = 0;
                }
                result.Add(new GridLevel(cols, rows, cost));
            }
            return result;
        }

        public static PlaceCatalog LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("places.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static PlaceCatalog LoadDefault()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "places.json"),
                Path.Combine(baseDir, "places.json"),
                Path.Combine(baseDir, "..", "assets", "data", "places.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "places.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "places.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "places.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "places.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath);
                    }
                }
                catch { }
            }

            var asm = typeof(PlaceCatalog).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("places.json", StringComparison.OrdinalIgnoreCase))
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

            ItemCatalog.ErrorLogger?.Invoke("PlaceCatalog: places.json not found, using hardcoded defaults.");
            return CreateCodeDefaults();
        }
    }

    public sealed class WorldItemDefinition
    {
        public string Id { get; }
        public string Name { get; }
        public IReadOnlyList<string> Places { get; }
        public int W { get; }
        public int H { get; }
        public int Price { get; }
        public int Comfort { get; }
        public string Layer { get; }
        public string Icon { get; }
        public bool Free { get; }
        public string Requires { get; }
        public bool Repeatable { get; }
        public string Note { get; }
        public bool Recolor { get; }
        public string SignatureOf { get; }
        public string PropOf { get; }

        public IReadOnlyList<string> Place => Places;

        public WorldItemDefinition(
            string id,
            string name,
            IReadOnlyList<string> places,
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
            bool recolor = false,
            string signatureOf = null,
            string propOf = null)
        {
            Id = id ?? string.Empty;
            Name = name ?? string.Empty;
            Places = places ?? new string[0];
            W = w;
            H = h;
            Price = price < 0 ? 0 : price;
            Comfort = comfort < 0 ? 0 : (comfort > 10 ? 10 : comfort);
            Layer = layer ?? "floor";
            Icon = icon ?? Id;
            Free = free;
            Requires = requires;
            Repeatable = repeatable;
            Note = note ?? string.Empty;
            Recolor = recolor;
            SignatureOf = signatureOf;
            PropOf = propOf;
        }

        public bool AllowsPlace(string placeId)
        {
            if (string.IsNullOrEmpty(placeId) || Places == null) return false;
            for (int i = 0; i < Places.Count; i++)
            {
                if (string.Equals(Places[i], placeId, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }
    }

    public sealed class WorldItemCatalog
    {
        private static readonly string[] ValidPlaces = new[] { "house", "garden", "park", "farm" };
        private static readonly string[] DefaultLayers = new[] { "ground", "floor", "wall" };

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

        public IReadOnlyList<WorldItemDefinition> Items { get; }
        public IReadOnlyList<string> Layers { get; }

        private readonly Dictionary<string, WorldItemDefinition> _itemsById;

        public WorldItemCatalog(IEnumerable<WorldItemDefinition> items, IEnumerable<string> layers = null)
        {
            var itemsList = new List<WorldItemDefinition>();
            _itemsById = new Dictionary<string, WorldItemDefinition>(StringComparer.OrdinalIgnoreCase);

            if (items != null)
            {
                foreach (var item in items)
                {
                    if (item == null || string.IsNullOrEmpty(item.Id)) continue;
                    if (!_itemsById.ContainsKey(item.Id))
                    {
                        _itemsById[item.Id] = item;
                        itemsList.Add(item);
                    }
                }
            }

            Items = itemsList;
            Layers = layers != null ? layers.ToList() : new List<string>(DefaultLayers);
        }

        public WorldItemDefinition Find(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            WorldItemDefinition def;
            return _itemsById.TryGetValue(id, out def) ? def : null;
        }

        public IReadOnlyList<WorldItemDefinition> ForPlace(string placeId)
        {
            if (string.IsNullOrEmpty(placeId)) return new WorldItemDefinition[0];
            var result = new List<WorldItemDefinition>();
            foreach (var item in Items)
            {
                if (item.AllowsPlace(placeId))
                {
                    result.Add(item);
                }
            }
            return result;
        }

        public void RegisterOrIgnore(WorldItemDefinition item)
        {
            if (item == null || string.IsNullOrEmpty(item.Id)) return;
            if (!_itemsById.ContainsKey(item.Id))
            {
                _itemsById[item.Id] = item;
                ((List<WorldItemDefinition>)Items).Add(item);
            }
        }

        public static WorldItemCatalog Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("WorldItemCatalog: JSON is empty, returning empty catalog.");
                return new WorldItemCatalog(new WorldItemDefinition[0], DefaultLayers);
            }

            try
            {
                var root = JObject.Parse(json);

                var layers = new List<string>();
                var layersArr = root["layers"] as JArray;
                if (layersArr != null)
                {
                    foreach (var l in layersArr)
                    {
                        string ls = l?.ToString();
                        if (!string.IsNullOrWhiteSpace(ls))
                        {
                            layers.Add(ls);
                        }
                    }
                }
                if (layers.Count == 0)
                {
                    layers.AddRange(DefaultLayers);
                }
                var validLayerSet = new HashSet<string>(layers, StringComparer.OrdinalIgnoreCase);
                var validPlaceSet = new HashSet<string>(ValidPlaces, StringComparer.OrdinalIgnoreCase);

                var items = new List<WorldItemDefinition>();
                var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                var itemsArr = root["items"] as JArray;
                if (itemsArr != null)
                {
                    foreach (var tok in itemsArr)
                    {
                        string id = tok["id"]?.ToString();
                        if (string.IsNullOrWhiteSpace(id)) continue;

                        if (seenIds.Contains(id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"WorldItemCatalog: Duplicate item id '{id}' ignored.");
                            continue;
                        }

                        string layer = tok["layer"]?.ToString();
                        if (string.IsNullOrWhiteSpace(layer) || !validLayerSet.Contains(layer))
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"WorldItemCatalog: Item '{id}' has unknown layer '{layer}', dropped.");
                            continue;
                        }

                        var placeList = new List<string>();
                        var placeArr = tok["place"] as JArray;
                        bool badPlace = false;
                        if (placeArr != null)
                        {
                            foreach (var pTok in placeArr)
                            {
                                string pStr = pTok?.ToString();
                                if (string.IsNullOrWhiteSpace(pStr) || !validPlaceSet.Contains(pStr))
                                {
                                    badPlace = true;
                                    break;
                                }
                                placeList.Add(pStr);
                            }
                        }
                        if (badPlace || placeList.Count == 0)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"WorldItemCatalog: Item '{id}' has invalid place list, dropped.");
                            continue;
                        }

                        int w = tok["w"] != null ? (int)tok["w"] : 0;
                        int h = tok["h"] != null ? (int)tok["h"] : 0;
                        if (w < 1 || w > 6 || h < 1 || h > 6)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"WorldItemCatalog: Item '{id}' footprint {w}x{h} outside 1..6, dropped.");
                            continue;
                        }

                        int price = tok["price"] != null ? (int)tok["price"] : 0;
                        if (price < 0)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"WorldItemCatalog: Item '{id}' negative price {price} clamped to 0.");
                            price = 0;
                        }

                        int comfort = tok["comfort"] != null ? (int)tok["comfort"] : 0;
                        if (comfort < 0) comfort = 0;
                        if (comfort > 10) comfort = 10;

                        string name = tok["name"]?.ToString() ?? id;
                        string icon = tok["icon"]?.ToString() ?? id;
                        bool free = tok["free"] != null && (bool)tok["free"];
                        string requires = tok["requires"]?.ToString();
                        string note = tok["note"]?.ToString();
                        bool recolor = tok["recolor"] != null && (bool)tok["recolor"];
                        string signatureOf = tok["signature_of"]?.ToString();
                        string propOf = tok["prop_of"]?.ToString();

                        bool repeatable = tok["repeatable"] != null
                            ? (bool)tok["repeatable"]
                            : (string.Equals(layer, "ground", StringComparison.OrdinalIgnoreCase)
                               || id.StartsWith("fence_", StringComparison.OrdinalIgnoreCase)
                               || string.Equals(id, "hedge", StringComparison.OrdinalIgnoreCase));

                        var def = new WorldItemDefinition(
                            id: id,
                            name: name,
                            places: placeList,
                            w: w,
                            h: h,
                            price: price,
                            comfort: comfort,
                            layer: layer,
                            icon: icon,
                            free: free,
                            requires: requires,
                            repeatable: repeatable,
                            note: note,
                            recolor: recolor,
                            signatureOf: signatureOf,
                            propOf: propOf);

                        items.Add(def);
                        seenIds.Add(id);
                    }
                }

                return new WorldItemCatalog(items, layers);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"WorldItemCatalog: Error parsing JSON: {ex.Message}");
                return new WorldItemCatalog(new WorldItemDefinition[0], DefaultLayers);
            }
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
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "world_items.json"),
                Path.Combine(baseDir, "world_items.json"),
                Path.Combine(baseDir, "..", "assets", "data", "world_items.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "world_items.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "world_items.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "world_items.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "world_items.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath);
                    }
                }
                catch { }
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

            ItemCatalog.ErrorLogger?.Invoke("WorldItemCatalog: world_items.json not found, returning empty catalog.");
            return new WorldItemCatalog(new WorldItemDefinition[0], DefaultLayers);
        }
    }
}

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private World.WorldState _world;

        public World.WorldState World
        {
            get
            {
                if (_world == null)
                {
                    _world = new World.WorldState();
                }
                return _world;
            }
            set => _world = value;
        }
    }
}
