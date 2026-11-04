using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class GridLevel
    {
        public int Cols { get; set; }
        public int Rows { get; set; }
        public int Cost { get; set; }

        public GridLevel() { }

        public GridLevel(int cols, int rows, int cost = 0)
        {
            Cols = cols;
            Rows = rows;
            Cost = cost;
        }

        public override string ToString() => $"{Cols}x{Rows} (cost: {Cost})";
    }

    public sealed class RoomDefinition
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public bool UnlockedAtStart { get; set; }
        public int Cost { get; set; }
        public IReadOnlyList<GridLevel> Levels { get; set; } = new List<GridLevel>();

        public override string ToString() => $"Room:{Id} ({Name})";
    }

    public sealed class PlaceDefinition
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public bool UnlockedAtStart { get; set; }
        public int Cost { get; set; }
        public IReadOnlyList<string> Requires { get; set; } = new List<string>();
        public IReadOnlyList<GridLevel> Levels { get; set; } = new List<GridLevel>();
        public IReadOnlyList<RoomDefinition> Rooms { get; set; } = new List<RoomDefinition>();
        public IReadOnlyDictionary<string, int> WelcomeItems { get; set; } = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        public override string ToString() => $"Place:{Id} ({Name})";
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

        private readonly Dictionary<string, PlaceDefinition> _placesById;
        private readonly List<PlaceDefinition> _placesList;
        private readonly Dictionary<string, RoomDefinition> _roomsById;
        private readonly List<RoomDefinition> _roomsList;

        public IReadOnlyList<PlaceDefinition> Places => _placesList;
        public IReadOnlyList<PlaceDefinition> All => _placesList;
        public IReadOnlyList<RoomDefinition> Rooms => _roomsList;

        public int WallRows { get; }
        public int ComfortCap { get; }
        public double MoodDecayReductionAtCap { get; }
        public int WalkPerDay { get; }
        public int WalkMood { get; }
        public int WalkMinComfortGarden { get; }

        public PlaceCatalog(
            IEnumerable<PlaceDefinition> places,
            int wallRows = 2,
            int comfortCap = 100,
            double moodDecayReductionAtCap = 0.15,
            int walkPerDay = 3,
            int walkMood = 6,
            int walkMinComfortGarden = 10)
        {
            WallRows = wallRows;
            ComfortCap = Math.Max(10, Math.Min(500, comfortCap));
            MoodDecayReductionAtCap = Math.Max(0.0, Math.Min(0.5, moodDecayReductionAtCap));
            WalkPerDay = walkPerDay;
            WalkMood = walkMood;
            WalkMinComfortGarden = walkMinComfortGarden;

            _placesById = new Dictionary<string, PlaceDefinition>(StringComparer.OrdinalIgnoreCase);
            _placesList = new List<PlaceDefinition>();
            _roomsById = new Dictionary<string, RoomDefinition>(StringComparer.OrdinalIgnoreCase);
            _roomsList = new List<RoomDefinition>();

            if (places != null)
            {
                foreach (var place in places)
                {
                    if (place == null || string.IsNullOrWhiteSpace(place.Id)) continue;
                    if (_placesById.ContainsKey(place.Id))
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Duplicate place id: {place.Id}");
                        continue;
                    }

                    // Enforce level list rule for place
                    if (place.Levels != null && place.Levels.Count > 0 && place.Levels[0].Cost != 0)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Level list for place '{place.Id}' must start at cost 0 (was {place.Levels[0].Cost}); forcing first level cost to 0.");
                        place.Levels[0].Cost = 0;
                    }

                    // Collect rooms and enforce level list rule for each room
                    if (place.Rooms != null)
                    {
                        foreach (var room in place.Rooms)
                        {
                            if (room == null || string.IsNullOrWhiteSpace(room.Id)) continue;
                            if (room.Levels != null && room.Levels.Count > 0 && room.Levels[0].Cost != 0)
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Level list for room '{room.Id}' must start at cost 0 (was {room.Levels[0].Cost}); forcing first level cost to 0.");
                                room.Levels[0].Cost = 0;
                            }

                            if (!_roomsById.ContainsKey(room.Id))
                            {
                                _roomsById[room.Id] = room;
                                _roomsList.Add(room);
                            }
                            else
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Duplicate room id '{room.Id}' found in place '{place.Id}'.");
                            }
                        }
                    }

                    _placesById[place.Id] = place;
                    _placesList.Add(place);
                }

                // Rule: a 'requires' id that is not a place is dropped and logged
                foreach (var place in _placesList)
                {
                    if (place.Requires != null && place.Requires.Count > 0)
                    {
                        var validRequires = new List<string>();
                        foreach (var req in place.Requires)
                        {
                            if (_placesById.ContainsKey(req))
                            {
                                validRequires.Add(req);
                            }
                            else
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Place '{place.Id}' requires unknown place '{req}', dropping requirement.");
                            }
                        }
                        place.Requires = validRequires;
                    }
                }
            }
        }

        public PlaceDefinition Find(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return null;
            _placesById.TryGetValue(id, out var place);
            return place;
        }

        public RoomDefinition FindRoom(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return null;
            _roomsById.TryGetValue(id, out var room);
            return room;
        }

        public static PlaceCatalog Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("[PlaceCatalog] Provided JSON is null or empty, using minimal default.");
                return CreateMinimalDefault();
            }

            try
            {
                var root = JObject.Parse(json);

                int wallRows = 2;
                if (root["grid"] is JObject gridObj && gridObj["wall_rows"] != null)
                {
                    wallRows = (int)gridObj["wall_rows"];
                }

                int comfortCap = 100;
                double moodDecayReductionAtCap = 0.15;
                if (root["comfort"] is JObject comfortObj)
                {
                    if (comfortObj["cap"] != null)
                        comfortCap = (int)comfortObj["cap"];
                    if (comfortObj["mood_decay_reduction_at_cap"] != null)
                        moodDecayReductionAtCap = (double)comfortObj["mood_decay_reduction_at_cap"];
                }

                int walkPerDay = 3;
                int walkMood = 6;
                int walkMinComfortGarden = 10;
                if (root["walk"] is JObject walkObj)
                {
                    if (walkObj["per_day"] != null)
                        walkPerDay = (int)walkObj["per_day"];
                    if (walkObj["mood"] != null)
                        walkMood = (int)walkObj["mood"];
                    if (walkObj["min_comfort_garden"] != null)
                        walkMinComfortGarden = (int)walkObj["min_comfort_garden"];
                }

                var rawPlaces = root["places"] as JArray;
                if (rawPlaces == null)
                {
                    ItemCatalog.ErrorLogger?.Invoke("[PlaceCatalog] 'places' array missing in JSON, using minimal default.");
                    return CreateMinimalDefault();
                }

                var places = new List<PlaceDefinition>();
                foreach (var token in rawPlaces)
                {
                    if (!(token is JObject pObj)) continue;
                    string id = pObj.Value<string>("id");
                    if (string.IsNullOrWhiteSpace(id))
                    {
                        ItemCatalog.ErrorLogger?.Invoke("[PlaceCatalog] Skipping place with missing id.");
                        continue;
                    }

                    string name = pObj.Value<string>("name") ?? id;
                    bool unlockedAtStart = pObj.Value<bool?>("unlocked_at_start") ?? false;
                    int cost = pObj.Value<int?>("cost") ?? 0;

                    var requiresList = new List<string>();
                    if (pObj["requires"] is JArray reqArr)
                    {
                        foreach (var reqTok in reqArr)
                        {
                            string reqStr = reqTok.Value<string>();
                            if (!string.IsNullOrWhiteSpace(reqStr))
                                requiresList.Add(reqStr);
                        }
                    }

                    var welcomeItems = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    if (pObj["welcome_items"] is JObject wiObj)
                    {
                        foreach (var prop in wiObj.Properties())
                        {
                            welcomeItems[prop.Name] = (int)prop.Value;
                        }
                    }

                    var levels = ParseLevels(pObj["levels"] as JArray, id);

                    var rooms = new List<RoomDefinition>();
                    if (pObj["rooms"] is JArray roomsArr)
                    {
                        foreach (var rTok in roomsArr)
                        {
                            if (!(rTok is JObject rObj)) continue;
                            string rId = rObj.Value<string>("id");
                            if (string.IsNullOrWhiteSpace(rId))
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Place '{id}' contains a room without id, skipping.");
                                continue;
                            }

                            string rName = rObj.Value<string>("name") ?? rId;
                            bool rUnlocked = rObj.Value<bool?>("unlocked_at_start") ?? false;
                            int rCost = rObj.Value<int?>("cost") ?? 0;
                            var rLevels = ParseLevels(rObj["levels"] as JArray, $"{id}.{rId}");

                            rooms.Add(new RoomDefinition
                            {
                                Id = rId,
                                Name = rName,
                                UnlockedAtStart = rUnlocked,
                                Cost = rCost,
                                Levels = rLevels
                            });
                        }
                    }

                    places.Add(new PlaceDefinition
                    {
                        Id = id,
                        Name = name,
                        UnlockedAtStart = unlockedAtStart,
                        Cost = cost,
                        Requires = requiresList,
                        Levels = levels,
                        Rooms = rooms,
                        WelcomeItems = welcomeItems
                    });
                }

                if (places.Count == 0)
                {
                    ItemCatalog.ErrorLogger?.Invoke("[PlaceCatalog] No valid places found in JSON, using minimal default.");
                    return CreateMinimalDefault();
                }

                return new PlaceCatalog(places, wallRows, comfortCap, moodDecayReductionAtCap, walkPerDay, walkMood, walkMinComfortGarden);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Failed to parse JSON: {ex.Message}");
                return CreateMinimalDefault();
            }
        }

        private static List<GridLevel> ParseLevels(JArray levelsArr, string ownerId)
        {
            var list = new List<GridLevel>();
            if (levelsArr == null) return list;

            foreach (var lvlTok in levelsArr)
            {
                if (!(lvlTok is JObject obj)) continue;
                int cols = obj.Value<int?>("cols") ?? 0;
                int rows = obj.Value<int?>("rows") ?? 0;
                int cost = obj.Value<int?>("cost") ?? 0;
                list.Add(new GridLevel(cols, rows, cost));
            }

            if (list.Count > 0 && list[0].Cost != 0)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Level list for '{ownerId}' must start at cost 0 (was {list[0].Cost}); forcing first level cost to 0.");
                list[0].Cost = 0;
            }

            return list;
        }

        public static PlaceCatalog LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] File not found: {filePath}");
                return CreateMinimalDefault();
            }
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static PlaceCatalog LoadDefault()
        {
            string baseDir = AppContext.BaseDirectory ?? AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();

            string dir = baseDir;
            while (!string.IsNullOrEmpty(dir))
            {
                string candidate = Path.Combine(dir, "assets", "data", "places.json");
                if (File.Exists(candidate))
                {
                    try
                    {
                        return LoadFromFile(candidate);
                    }
                    catch (Exception ex)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"[PlaceCatalog] Error loading '{candidate}': {ex.Message}");
                    }
                }
                string parent = Path.GetDirectoryName(dir);
                if (parent == dir) break;
                dir = parent;
            }

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

            ItemCatalog.ErrorLogger?.Invoke("[PlaceCatalog] places.json not found, using minimal default.");
            return CreateMinimalDefault();
        }

        public static PlaceCatalog CreateMinimalDefault()
        {
            var salon = new RoomDefinition
            {
                Id = "salon",
                Name = "Living room",
                UnlockedAtStart = true,
                Cost = 0,
                Levels = new List<GridLevel>
                {
                    new GridLevel(12, 7, 0),
                    new GridLevel(16, 8, 530),
                    new GridLevel(20, 9, 1200)
                }
            };

            var house = new PlaceDefinition
            {
                Id = "house",
                Name = "House",
                UnlockedAtStart = true,
                Cost = 0,
                Requires = new List<string>(),
                Levels = new List<GridLevel>(),
                Rooms = new List<RoomDefinition> { salon },
                WelcomeItems = new Dictionary<string, int>()
            };

            var market = new PlaceDefinition
            {
                Id = "market",
                Name = "Market",
                UnlockedAtStart = true,
                Cost = 0,
                Requires = new List<string>(),
                Levels = new List<GridLevel>(),
                Rooms = new List<RoomDefinition>(),
                WelcomeItems = new Dictionary<string, int>()
            };

            return new PlaceCatalog(
                new[] { house, market },
                wallRows: 2,
                comfortCap: 100,
                moodDecayReductionAtCap: 0.15,
                walkPerDay: 3,
                walkMood: 6,
                walkMinComfortGarden: 10
            );
        }
    }
}
