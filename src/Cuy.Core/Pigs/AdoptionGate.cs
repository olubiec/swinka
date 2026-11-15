using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Pigs
{
    public class AdoptionGateConfig
    {
        private static readonly object _syncLock = new object();
        private static AdoptionGateConfig _current;

        public string StageThreshold { get; set; } = "junior";
        public int DelayDaysMin { get; set; } = 1;
        public int DelayDaysMax { get; set; } = 3;
        public List<string> PigIds { get; set; } = new List<string> { "kuki", "ned" };

        public static AdoptionGateConfig Current
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

        public static AdoptionGateConfig CreateDefault()
        {
            return new AdoptionGateConfig
            {
                StageThreshold = "junior",
                DelayDaysMin = 1,
                DelayDaysMax = 3,
                PigIds = new List<string> { "kuki", "ned" }
            };
        }

        public static AdoptionGateConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("AdoptionGateConfig: JSON is empty, using code defaults.");
                return CreateDefault();
            }

            try
            {
                var root = JObject.Parse(json);
                var config = new AdoptionGateConfig();

                if (root["stage_threshold"] != null)
                {
                    config.StageThreshold = root["stage_threshold"].ToString();
                }

                if (root["delay_days_min"] != null)
                {
                    config.DelayDaysMin = (int)root["delay_days_min"];
                }

                if (root["delay_days_max"] != null)
                {
                    config.DelayDaysMax = (int)root["delay_days_max"];
                }

                var pigsArray = root["pigs"] as JArray;
                if (pigsArray != null)
                {
                    config.PigIds = pigsArray.Select(p => p.ToString()).Where(s => !string.IsNullOrEmpty(s)).ToList();
                }

                return config;
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("AdoptionGateConfig: error parsing JSON: " + ex.Message);
                return CreateDefault();
            }
        }

        public static AdoptionGateConfig LoadDefault()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "adoption_gate.json"),
                Path.Combine(baseDir, "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "adoption_gate.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        string json = File.ReadAllText(fullPath);
                        return Load(json);
                    }
                }
                catch { }
            }

            var asm = typeof(AdoptionGateConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("adoption_gate.json", StringComparison.OrdinalIgnoreCase))
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

            return CreateDefault();
        }
    }

    public class AdoptionOffer
    {
        public string Id { get; set; } = "kuki_and_ned";
        public IReadOnlyList<NamedPigDefinition> Pigs { get; set; } = new List<NamedPigDefinition>();
    }

    public static class AdoptionGate
    {
        public static bool IsOpen(GameState state)
        {
            if (state == null) return false;
            if (state.AdoptionGateOpen) return true;
            if (state.HasNamedPig("kuki") || state.HasNamedPig("ned"))
            {
                state.AdoptionGateOpen = true;
                state.AdoptionOfferAccepted = true;
                return true;
            }
            return false;
        }

        public static void EnsureMigrated(GameState state)
        {
            if (state == null) return;
            state.SyncAdoptionGate();
        }

        public static bool IsStarterAtThreshold(GameState state, DateTime nowUtc, AdoptionGateConfig config = null, double pigDaysPerRealDay = 1.0)
        {
            if (state == null || state.Roster == null || state.Roster.Count == 0) return false;
            var starter = state.Roster[0];
            if (starter == null) return false;

            config = config ?? AdoptionGateConfig.Current;
            var fallbackBirth = state.BirthDateUtc;

            var stage = PigLife.StageOf(starter, nowUtc, pigDaysPerRealDay, fallbackBirth);
            int currentStageOrder = StageOrder(stage);

            LifeStage targetStage;
            if (Enum.TryParse<LifeStage>(config.StageThreshold, true, out targetStage))
            {
                return currentStageOrder >= StageOrder(targetStage);
            }

            // Fallback: junior is stage 1 (baby is 0)
            return currentStageOrder >= 1;
        }

        private static int StageOrder(LifeStage stage)
        {
            switch (stage)
            {
                case LifeStage.Baby: return 0;
                case LifeStage.Junior: return 1;
                case LifeStage.Adult: return 2;
                case LifeStage.Senior: return 3;
                case LifeStage.Legend: return 4;
                default: return 0;
            }
        }

        public static bool IsOfferAvailable(GameState state, DateTime nowUtc, Random rng = null, AdoptionGateConfig config = null, double pigDaysPerRealDay = 1.0)
        {
            if (state == null) return false;
            if (IsOpen(state) || state.AdoptionOfferAccepted) return false;

            config = config ?? AdoptionGateConfig.Current;
            if (!IsStarterAtThreshold(state, nowUtc, config, pigDaysPerRealDay))
            {
                return false;
            }

            if (!state.AdoptionOfferAvailableAtUtc.HasValue)
            {
                rng = rng ?? new Random();
                int min = Math.Max(0, config.DelayDaysMin);
                int max = Math.Max(min, config.DelayDaysMax);
                int delayDays = rng.Next(min, max + 1);
                state.AdoptionOfferAvailableAtUtc = nowUtc.AddDays(delayDays);
            }

            return nowUtc >= state.AdoptionOfferAvailableAtUtc.Value;
        }

        public static AdoptionOffer GetOffer(GameState state, NamedPigCatalog catalog = null, AdoptionGateConfig config = null)
        {
            config = config ?? AdoptionGateConfig.Current;
            catalog = catalog ?? NamedPigCatalog.Current;

            var pigs = new List<NamedPigDefinition>();
            foreach (var pigId in config.PigIds)
            {
                var def = catalog?.Find(pigId);
                if (def != null)
                {
                    pigs.Add(def);
                }
            }

            return new AdoptionOffer
            {
                Id = "kuki_and_ned",
                Pigs = pigs
            };
        }

        public static bool AcceptOffer(GameState state, NamedPigCatalog catalog = null, DateTime? nowUtc = null, Random rng = null, AdoptionGateConfig config = null)
        {
            if (state == null) return false;
            config = config ?? AdoptionGateConfig.Current;
            catalog = catalog ?? NamedPigCatalog.Current;
            var now = nowUtc ?? DateTime.UtcNow;
            var r = rng ?? new Random();

            if (state.Roster == null) state.Roster = new List<PigProfile>();
            if (state.ActivePigIds == null) state.ActivePigIds = new List<string>();

            foreach (var pigId in config.PigIds)
            {
                if (state.HasNamedPig(pigId)) continue;

                var def = catalog?.Find(pigId);
                if (def != null)
                {
                    var pig = new PigProfile(def.Name, def.Breed, def.PaletteId)
                    {
                        NamedId = def.Id,
                        BornAtUtc = PigLife.BornAtFor(now, def.StartAgeYears, new Balance().PigDaysPerRealDay),
                        ArrivedAtUtc = now,
                        Traits = def.Traits != null ? new List<string>(def.Traits) : new List<string>()
                    };
                    LegendRoll.Assign(pig, def, r);
                    state.Roster.Add(pig);
                }
            }

            state.AdoptionGateOpen = true;
            state.AdoptionOfferAccepted = true;
            return true;
        }

        public static bool CanRename(PigProfile pig)
        {
            if (pig == null) return false;
            return string.IsNullOrEmpty(pig.NamedId);
        }

        public static bool TryRename(PigProfile pig, string newName)
        {
            if (pig == null || !CanRename(pig)) return false;
            if (string.IsNullOrWhiteSpace(newName)) return false;
            pig.Name = newName.Trim();
            return true;
        }
    }
}
