using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Pigs
{
    public sealed class NamedPigDefinition
    {
        public string Id { get; }
        public string Name { get; }
        public string Breed { get; }
        public string PaletteId { get; }
        public string Pattern { get; }
        public string Palette { get; }
        public double StartAgeYears { get; }
        public double LegendYearsMin { get; }
        public double LegendYearsMax { get; }
        public string OfferGroup { get; }
        public int OfferAfterDays { get; }
        public int OfferCost { get; }
        public IReadOnlyList<string> Traits { get; }
        public string Blurb { get; }
        public int? WeightG { get; }
        public IReadOnlyDictionary<string, double> Modifiers { get; }

        public NamedPigDefinition(
            string id,
            string name,
            string breed,
            string paletteId,
            string pattern,
            string palette,
            double startAgeYears,
            double legendYearsMin,
            double legendYearsMax,
            string offerGroup,
            int offerAfterDays,
            int offerCost,
            IReadOnlyList<string> traits,
            string blurb,
            int? weightG,
            IReadOnlyDictionary<string, double> modifiers)
        {
            Id = id ?? string.Empty;
            Name = name ?? string.Empty;
            Breed = breed ?? string.Empty;
            PaletteId = paletteId ?? string.Empty;
            Pattern = pattern ?? string.Empty;
            Palette = palette ?? string.Empty;
            StartAgeYears = startAgeYears;
            LegendYearsMin = legendYearsMin;
            LegendYearsMax = legendYearsMax;
            OfferGroup = offerGroup;
            OfferAfterDays = offerAfterDays;
            OfferCost = offerCost;
            Traits = traits ?? new string[0];
            Blurb = blurb ?? string.Empty;
            WeightG = weightG;
            Modifiers = modifiers ?? new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        }
    }

    public sealed class OfferGroupDefinition
    {
        public string Id { get; }
        public string Label { get; }
        public IReadOnlyList<string> PigIds { get; }

        public OfferGroupDefinition(string id, string label, IReadOnlyList<string> pigIds)
        {
            Id = id ?? string.Empty;
            Label = label ?? string.Empty;
            PigIds = pigIds ?? new string[0];
        }
    }

    public sealed class NamedPigCatalog
    {
        private static readonly string[] StandardModifierKeys = new[]
        {
            "appetite",
            "poop_rate",
            "activity",
            "bond_gain",
            "minigame_score",
            "wheek_rate",
            "startle",
            "joy_weight"
        };

        private static readonly object _syncLock = new object();
        private static NamedPigCatalog _current;

        public static NamedPigCatalog Current
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

        public IReadOnlyList<NamedPigDefinition> Pigs { get; }
        public int WelcomeClovers { get; }
        public IReadOnlyDictionary<string, int> WelcomeItems { get; }
        public double ModifierMin { get; }
        public double ModifierMax { get; }
        public IReadOnlyList<OfferGroupDefinition> Groups { get; }

        private readonly Dictionary<string, NamedPigDefinition> _pigsById;

        public NamedPigCatalog(
            IEnumerable<NamedPigDefinition> pigs,
            int welcomeClovers,
            IDictionary<string, int> welcomeItems,
            double modifierMin,
            double modifierMax,
            IEnumerable<OfferGroupDefinition> groups)
        {
            var pigsList = new List<NamedPigDefinition>();
            _pigsById = new Dictionary<string, NamedPigDefinition>(StringComparer.OrdinalIgnoreCase);
            if (pigs != null)
            {
                foreach (var pig in pigs)
                {
                    if (pig == null || string.IsNullOrEmpty(pig.Id)) continue;
                    if (!_pigsById.ContainsKey(pig.Id))
                    {
                        _pigsById[pig.Id] = pig;
                        pigsList.Add(pig);
                    }
                }
            }
            Pigs = pigsList;

            WelcomeClovers = welcomeClovers;
            WelcomeItems = welcomeItems != null
                ? new Dictionary<string, int>(welcomeItems, StringComparer.OrdinalIgnoreCase)
                : (IReadOnlyDictionary<string, int>)new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            ModifierMin = modifierMin;
            ModifierMax = modifierMax;
            Groups = groups != null ? groups.ToList() : new List<OfferGroupDefinition>();
        }

        public NamedPigDefinition Find(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            NamedPigDefinition pig;
            return _pigsById.TryGetValue(id, out pig) ? pig : null;
        }

        public IReadOnlyList<NamedPigDefinition> OfferGroup(string groupId)
        {
            if (string.IsNullOrEmpty(groupId)) return new NamedPigDefinition[0];
            foreach (var group in Groups)
            {
                if (string.Equals(group.Id, groupId, StringComparison.OrdinalIgnoreCase))
                {
                    var result = new List<NamedPigDefinition>();
                    foreach (var pigId in group.PigIds)
                    {
                        var pig = Find(pigId);
                        if (pig != null)
                        {
                            result.Add(pig);
                        }
                    }
                    return result;
                }
            }
            return new NamedPigDefinition[0];
        }

        /// <summary>
        /// Code defaults containing the five pigs with id, name, breed, palette id, start age and arrival only,
        /// neutral modifiers. Used only when the pigs_named.json file is missing or invalid.
        /// </summary>
        public static NamedPigCatalog CreateCodeDefaults()
        {
            var neutralModifiers = StandardModifierKeys.ToDictionary(k => k, k => 1.0, StringComparer.OrdinalIgnoreCase);

            var pigs = new List<NamedPigDefinition>
            {
                new NamedPigDefinition(
                    id: "kuki",
                    name: "Kuki",
                    breed: "rosette_normal",
                    paletteId: "two_tone.ginger",
                    pattern: "two_tone",
                    palette: "ginger",
                    startAgeYears: 0.1,
                    legendYearsMin: 6.5,
                    legendYearsMax: 9.5,
                    offerGroup: "starter",
                    offerAfterDays: 0,
                    offerCost: 0,
                    traits: new string[0],
                    blurb: string.Empty,
                    weightG: null,
                    modifiers: neutralModifiers),
                new NamedPigDefinition(
                    id: "ned",
                    name: "Ned",
                    breed: "teddy_chubby",
                    paletteId: "bicolor_head.chocolate",
                    pattern: "bicolor_head",
                    palette: "chocolate",
                    startAgeYears: 0.0,
                    legendYearsMin: 6.5,
                    legendYearsMax: 9.5,
                    offerGroup: "starter",
                    offerAfterDays: 0,
                    offerCost: 0,
                    traits: new string[0],
                    blurb: string.Empty,
                    weightG: null,
                    modifiers: neutralModifiers),
                new NamedPigDefinition(
                    id: "james",
                    name: "James",
                    breed: "teddy_normal",
                    paletteId: "roan.slate",
                    pattern: "roan",
                    palette: "slate",
                    startAgeYears: 0.0,
                    legendYearsMin: 6.5,
                    legendYearsMax: 9.5,
                    offerGroup: null,
                    offerAfterDays: 90,
                    offerCost: 100,
                    traits: new string[0],
                    blurb: string.Empty,
                    weightG: null,
                    modifiers: neutralModifiers),
                new NamedPigDefinition(
                    id: "glen",
                    name: "Glen",
                    breed: "rosette_lean",
                    paletteId: "self.black",
                    pattern: "self",
                    palette: "black",
                    startAgeYears: 1.2,
                    legendYearsMin: 6.5,
                    legendYearsMax: 9.5,
                    offerGroup: null,
                    offerAfterDays: 105,
                    offerCost: 100,
                    traits: new string[0],
                    blurb: string.Empty,
                    weightG: null,
                    modifiers: neutralModifiers),
                new NamedPigDefinition(
                    id: "racuch",
                    name: "Racuch",
                    breed: "smooth_chubby",
                    paletteId: "saddle.ginger",
                    pattern: "saddle",
                    palette: "ginger",
                    startAgeYears: 0.0,
                    legendYearsMin: 6.5,
                    legendYearsMax: 9.5,
                    offerGroup: null,
                    offerAfterDays: 130,
                    offerCost: 100,
                    traits: new string[0],
                    blurb: string.Empty,
                    weightG: null,
                    modifiers: neutralModifiers)
            };

            var welcomeItems = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "bell_pepper", 2 },
                { "parsley", 2 }
            };

            var groups = new List<OfferGroupDefinition>
            {
                new OfferGroupDefinition("starter", "Adopt both", new[] { "kuki", "ned" })
            };

            return new NamedPigCatalog(pigs, welcomeClovers: 0, welcomeItems: welcomeItems, modifierMin: 0.5, modifierMax: 1.5, groups: groups);
        }

        public static NamedPigCatalog Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("NamedPigCatalog: JSON is empty, using hardcoded defaults.");
                return CreateCodeDefaults();
            }

            try
            {
                var root = JObject.Parse(json);

                // Welcome pack
                int welcomeClovers = 0;
                var welcomeToken = root["welcome"];
                if (welcomeToken?["clovers"] != null)
                {
                    welcomeClovers = (int)welcomeToken["clovers"];
                }

                var welcomeItems = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                var welcomeItemsObj = welcomeToken?["items"] as JObject;
                if (welcomeItemsObj != null)
                {
                    foreach (var prop in welcomeItemsObj.Properties())
                    {
                        welcomeItems[prop.Name] = (int)prop.Value;
                    }
                }

                // Modifier limits
                double modMin = 0.5;
                double modMax = 1.5;
                var modLimitsToken = root["modifier_limits"];
                if (modLimitsToken?["min"] != null)
                {
                    modMin = (double)modLimitsToken["min"];
                }
                if (modLimitsToken?["max"] != null)
                {
                    modMax = (double)modLimitsToken["max"];
                }

                // Default legend range
                double defLegendMin = 6.5;
                double defLegendMax = 9.5;
                var defLegendToken = root["legend_years_default"];
                if (defLegendToken?["min"] != null && defLegendToken?["max"] != null)
                {
                    double dMin = (double)defLegendToken["min"];
                    double dMax = (double)defLegendToken["max"];
                    if (dMin < dMax && dMin >= 4.5)
                    {
                        defLegendMin = dMin;
                        defLegendMax = dMax;
                    }
                    else
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: legend_years_default invalid ({dMin}-{dMax}), falling back to 6.5-9.5.");
                    }
                }

                // Modifier keys to expect
                var expectedModifierKeys = new HashSet<string>(StandardModifierKeys, StringComparer.OrdinalIgnoreCase);
                var modKeysToken = root["modifier_keys"] as JObject;
                if (modKeysToken != null)
                {
                    foreach (var prop in modKeysToken.Properties())
                    {
                        expectedModifierKeys.Add(prop.Name);
                    }
                }

                // Pigs
                var pigs = new List<NamedPigDefinition>();
                var pigsById = new Dictionary<string, NamedPigDefinition>(StringComparer.OrdinalIgnoreCase);

                var pigsArray = root["pigs"] as JArray;
                if (pigsArray != null)
                {
                    foreach (var pigToken in pigsArray)
                    {
                        string id = pigToken["id"]?.ToString();
                        if (string.IsNullOrWhiteSpace(id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke("NamedPigCatalog: Dropped pig with empty id.");
                            continue;
                        }

                        if (pigsById.ContainsKey(id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Duplicate pig id '{id}' ignored.");
                            continue;
                        }

                        string name = pigToken["name"]?.ToString() ?? string.Empty;

                        // Look
                        var lookToken = pigToken["look"];
                        string breed = lookToken?["breed"]?.ToString() ?? string.Empty;
                        string paletteId = lookToken?["palette_id"]?.ToString() ?? string.Empty;
                        string pattern = lookToken?["pattern"]?.ToString() ?? string.Empty;
                        string palette = lookToken?["palette"]?.ToString() ?? string.Empty;

                        double startAgeYears = pigToken["start_age_years"] != null
                            ? (double)pigToken["start_age_years"]
                            : 0.0;

                        // Legend range
                        double legendMin = defLegendMin;
                        double legendMax = defLegendMax;
                        var legendObj = pigToken["legend_years"];
                        if (legendObj != null && legendObj["min"] != null && legendObj["max"] != null)
                        {
                            double pMin = (double)legendObj["min"];
                            double pMax = (double)legendObj["max"];
                            if (pMin >= pMax || pMin < 4.5)
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Pig '{id}' invalid legend range ({pMin}-{pMax}), falling back to default range ({defLegendMin}-{defLegendMax}).");
                                legendMin = defLegendMin;
                                legendMax = defLegendMax;
                            }
                            else
                            {
                                legendMin = pMin;
                                legendMax = pMax;
                            }
                        }

                        // Offer
                        var offerObj = pigToken["offer"];
                        string offerGroup = offerObj?["group"]?.ToString();
                        int afterDays = 0;
                        if (offerObj?["after_days"] != null)
                        {
                            afterDays = (int)offerObj["after_days"];
                            if (afterDays < 0)
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Pig '{id}' negative after_days ({afterDays}) clamped to 0.");
                                afterDays = 0;
                            }
                        }

                        int cost = 0;
                        if (offerObj?["cost"] != null)
                        {
                            cost = (int)offerObj["cost"];
                            if (cost < 0)
                            {
                                ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Pig '{id}' negative cost ({cost}) clamped to 0.");
                                cost = 0;
                            }
                        }

                        // Traits
                        var traits = new List<string>();
                        var traitsToken = pigToken["traits"] as JArray;
                        if (traitsToken != null)
                        {
                            foreach (var t in traitsToken)
                            {
                                if (t != null) traits.Add(t.ToString());
                            }
                        }

                        string blurb = pigToken["blurb"]?.ToString() ?? string.Empty;

                        // WeightG
                        int? weightG = null;
                        var weightToken = pigToken["weight_g"];
                        if (weightToken != null && weightToken.Type == JTokenType.Integer)
                        {
                            weightG = (int)weightToken;
                        }

                        // Modifiers
                        var modifiersDict = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
                        var pigModifiersObj = pigToken["modifiers"] as JObject;

                        var allPigModKeys = new HashSet<string>(expectedModifierKeys, StringComparer.OrdinalIgnoreCase);
                        if (pigModifiersObj != null)
                        {
                            foreach (var prop in pigModifiersObj.Properties())
                            {
                                allPigModKeys.Add(prop.Name);
                            }
                        }

                        foreach (var key in allPigModKeys)
                        {
                            var valToken = pigModifiersObj?[key];
                            if (valToken == null)
                            {
                                modifiersDict[key] = 1.0;
                            }
                            else
                            {
                                double val = 1.0;
                                bool valid = false;
                                try
                                {
                                    val = (double)valToken;
                                    valid = !double.IsNaN(val) && !double.IsInfinity(val) && val > 0.0;
                                }
                                catch
                                {
                                    valid = false;
                                }

                                if (!valid)
                                {
                                    ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Pig '{id}' modifier '{key}' value not finite or <= 0, resetting to 1.0.");
                                    val = 1.0;
                                }
                                else if (val < modMin)
                                {
                                    val = modMin;
                                }
                                else if (val > modMax)
                                {
                                    val = modMax;
                                }
                                modifiersDict[key] = val;
                            }
                        }

                        var def = new NamedPigDefinition(
                            id: id,
                            name: name,
                            breed: breed,
                            paletteId: paletteId,
                            pattern: pattern,
                            palette: palette,
                            startAgeYears: startAgeYears,
                            legendYearsMin: legendMin,
                            legendYearsMax: legendMax,
                            offerGroup: offerGroup,
                            offerAfterDays: afterDays,
                            offerCost: cost,
                            traits: traits,
                            blurb: blurb,
                            weightG: weightG,
                            modifiers: modifiersDict);

                        pigs.Add(def);
                        pigsById[id] = def;
                    }
                }

                // Offer groups
                var groups = new List<OfferGroupDefinition>();
                var groupsArray = root["offer_groups"] as JArray;
                if (groupsArray != null)
                {
                    foreach (var groupToken in groupsArray)
                    {
                        string gId = groupToken["id"]?.ToString() ?? string.Empty;
                        string gLabel = groupToken["label"]?.ToString() ?? string.Empty;
                        var pigsInGroup = new List<string>();
                        var gPigsArray = groupToken["pigs"] as JArray;
                        if (gPigsArray != null)
                        {
                            foreach (var pIdToken in gPigsArray)
                            {
                                string pId = pIdToken?.ToString();
                                if (string.IsNullOrEmpty(pId)) continue;
                                if (pigsById.ContainsKey(pId))
                                {
                                    pigsInGroup.Add(pId);
                                }
                                else
                                {
                                    ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Offer group '{gId}' references unknown pig '{pId}', dropped from group.");
                                }
                            }
                        }
                        groups.Add(new OfferGroupDefinition(gId, gLabel, pigsInGroup));
                    }
                }

                return new NamedPigCatalog(pigs, welcomeClovers, welcomeItems, modMin, modMax, groups);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"NamedPigCatalog: Error parsing JSON: {ex.Message}");
                return CreateCodeDefaults();
            }
        }

        public static NamedPigCatalog LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("pigs_named.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static NamedPigCatalog LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "pigs_named.json"),
                Path.Combine(baseDir, "pigs_named.json"),
                Path.Combine(baseDir, "..", "assets", "data", "pigs_named.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "pigs_named.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "pigs_named.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "pigs_named.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "pigs_named.json")
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
            var asm = typeof(NamedPigCatalog).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("pigs_named.json", StringComparison.OrdinalIgnoreCase))
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
            ItemCatalog.ErrorLogger?.Invoke("NamedPigCatalog: pigs_named.json not found, using hardcoded defaults.");
            return CreateCodeDefaults();
        }
    }
}
