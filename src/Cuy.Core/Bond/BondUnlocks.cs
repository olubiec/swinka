using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core
{
    public sealed class BondUnlock
    {
        public int Level { get; set; }
        public string Id { get; set; }
        public string Title { get; set; }
    }

    public sealed class BondUnlocks
    {
        private static readonly object _syncLock = new object();
        private static BondUnlocks _current;

        public static BondUnlocks Current
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

        private readonly List<BondUnlock> _levels;
        public IReadOnlyList<BondUnlock> Levels => _levels;

        public BondUnlocks(IEnumerable<BondUnlock> levels)
        {
            _levels = levels != null ? levels.OrderBy(l => l.Level).ToList() : new List<BondUnlock>();
        }

        public bool IsUnlocked(string id, int level)
        {
            if (string.IsNullOrEmpty(id)) return false;
            var unlock = _levels.FirstOrDefault(l => string.Equals(l.Id, id, StringComparison.OrdinalIgnoreCase));
            if (unlock == null) return false;
            return level >= unlock.Level;
        }

        public BondUnlock Next(int level)
        {
            return _levels.FirstOrDefault(l => l.Level > level);
        }

        public static BondUnlocks Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return CreateDefaultUnlocks();

            try
            {
                var root = JObject.Parse(json);
                var levelsArr = root["levels"] as JArray;
                if (levelsArr != null)
                {
                    var list = new List<BondUnlock>();
                    foreach (var tok in levelsArr)
                    {
                        list.Add(new BondUnlock
                        {
                            Level = tok["level"] != null ? (int)tok["level"] : 0,
                            Id = (string)tok["id"],
                            Title = (string)tok["title"]
                        });
                    }
                    return new BondUnlocks(list);
                }
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("BondUnlocks: Error parsing JSON: " + ex.Message);
            }

            return CreateDefaultUnlocks();
        }

        private static BondUnlocks LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("bond.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static BondUnlocks LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "bond.json"),
                Path.Combine(baseDir, "bond.json"),
                Path.Combine(baseDir, "..", "assets", "data", "bond.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "bond.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "bond.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "bond.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "bond.json")
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

            // 2. Check embedded resources
            var asm = typeof(BondUnlocks).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("bond.json", StringComparison.OrdinalIgnoreCase))
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

            // 3. Fallback to code defaults
            ItemCatalog.ErrorLogger?.Invoke("BondUnlocks: bond.json not found, using hardcoded defaults.");
            return CreateDefaultUnlocks();
        }

        private static BondUnlocks CreateDefaultUnlocks()
        {
            // Hardcoded defaults if the JSON file is missing or bad
            return new BondUnlocks(new[]
            {
                new BondUnlock { Level = 2, Id = "approach_cursor", Title = "Comes to your cursor instead of running away" },
                new BondUnlock { Level = 3, Id = "greet_on_start", Title = "Wheeks hello when you start the PC" },
                new BondUnlock { Level = 5, Id = "trick_spin", Title = "Spins around" },
                new BondUnlock { Level = 7, Id = "come_when_called", Title = "Comes running when you call" },
                new BondUnlock { Level = 9, Id = "trick_stand_up", Title = "Stands up on two legs" },
                new BondUnlock { Level = 10, Id = "companion", Title = "Allows adding a companion" },
                new BondUnlock { Level = 12, Id = "trick_popcorn", Title = "Popcorns when happy" },
                new BondUnlock { Level = 15, Id = "trick_hurdle", Title = "Jumps over a hurdle" },
                new BondUnlock { Level = 20, Id = "golden_bowl", Title = "Unlocks the golden bowl" }
            });
        }
    }
}
