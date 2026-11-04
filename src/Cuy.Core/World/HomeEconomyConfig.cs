using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Cuy.Core;

namespace Cuy.Core.World
{
    /// <summary>
    /// Loader for assets/data/home_economy.json: prices of item colours, skins, the run, desktop props and roaming.
    /// Bad values are clamped and each change is logged through ItemCatalog.ErrorLogger.
    /// Decorations are never resold: <see cref="ResaleAllowed"/> is always false.
    /// </summary>
    public sealed class HomeEconomyConfig
    {
        private const int MinUnlockPercent = 1;
        private const int MaxUnlockPercent = 50;
        private const int MinCellsPerPig = 3;
        private const int MaxCellsPerPig = 20;
        private const int MinClockHour = 0;
        private const int MaxClockHour = 23;
        private const double MinMoodPerHour = 0.0;
        private const double MaxMoodPerHour = 3.0;
        private const int MinMoodCapPerDay = 0;
        private const int MaxMoodCapPerDay = 10;
        private const int MinMaxOnDesktop = 1;
        private const int MaxMaxOnDesktop = 12;

        private static readonly object _syncLock = new object();
        private static HomeEconomyConfig _current;

        public static HomeEconomyConfig Current
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

        // variants
        public int VariantUnlockPercent { get; private set; }
        public int VariantMinPrice { get; private set; }

        // skins
        public int PigSkinPrice { get; private set; }

        // resale: decorations are never resold
        public bool ResaleAllowed { get; private set; }

        // roam
        public int RoamSlotMinutes { get; private set; }
        public int RoamNightFromHour { get; private set; }
        public int RoamNightToHour { get; private set; }
        public string RoamDefaultMode { get; private set; }

        // run
        public int RunMinCells { get; private set; }
        public int RunCellsPerPig { get; private set; }
        public string RunGateItem { get; private set; }
        public IReadOnlyList<string> RunBlockers { get; private set; }
        public int RunMaxHoursPerDay { get; private set; }
        public int RunDayFromHour { get; private set; }
        public int RunDayToHour { get; private set; }
        public int RunMinTempC { get; private set; }
        public int RunMaxTempC { get; private set; }
        public IReadOnlyList<string> RunAllowedConditions { get; private set; }
        public double RunMoodPerHour { get; private set; }
        public int RunMoodCapPerDay { get; private set; }

        // props
        public int MaxPropsOnDesktop { get; private set; }

        private HomeEconomyConfig()
        {
            VariantUnlockPercent = 15;
            VariantMinPrice = 5;
            PigSkinPrice = 180;
            ResaleAllowed = false;
            RoamSlotMinutes = 20;
            RoamNightFromHour = 22;
            RoamNightToHour = 7;
            RoamDefaultMode = "free";
            RunMinCells = 12;
            RunCellsPerPig = 6;
            RunGateItem = "gate_garden";
            RunBlockers = new List<string> { "fence_wood", "hedge", "gate_garden" };
            RunMaxHoursPerDay = 6;
            RunDayFromHour = 8;
            RunDayToHour = 19;
            RunMinTempC = 10;
            RunMaxTempC = 28;
            RunAllowedConditions = new List<string> { "Clear", "Cloudy" };
            RunMoodPerHour = 1.0;
            RunMoodCapPerDay = 6;
            MaxPropsOnDesktop = 6;
        }

        /// <summary>Config with the code defaults (the numbers of home_economy.json).</summary>
        public static HomeEconomyConfig CreateDefault()
        {
            return new HomeEconomyConfig();
        }

        public static HomeEconomyConfig LoadDefault()
        {
            string[] starts = { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var start in starts)
            {
                if (string.IsNullOrEmpty(start)) continue;
                var dir = new DirectoryInfo(start);
                for (int depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
                {
                    string path = Path.Combine(dir.FullName, "assets", "data", "home_economy.json");
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
            Log("home_economy.json not found, using code defaults.");
            return CreateDefault();
        }

        public static HomeEconomyConfig Load(string json)
        {
            var cfg = new HomeEconomyConfig();
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

            cfg.ApplyVariants(Obj(root, "variants"));
            cfg.PigSkinPrice = Math.Max(0, Read(Obj(root, "skins"), "pig_skin_price", cfg.PigSkinPrice));
            cfg.ApplyResale(Obj(root, "resale"));
            cfg.ApplyRoam(Obj(root, "roam"));
            cfg.ApplyRun(Obj(root, "run"));
            cfg.MaxPropsOnDesktop = Clamp(Read(Obj(root, "props"), "max_on_desktop", cfg.MaxPropsOnDesktop), MinMaxOnDesktop, MaxMaxOnDesktop, "props.max_on_desktop");

            return cfg;
        }

        /// <summary>
        /// Price of colour variant 1-3 of an item: 0 for free items, otherwise
        /// max(min_price, ceil(price * unlock_percent / 100)).
        /// </summary>
        public int VariantPrice(int itemPrice)
        {
            if (itemPrice <= 0) return 0;
            int percentPrice = (int)Math.Ceiling(itemPrice * VariantUnlockPercent / 100.0);
            return Math.Max(VariantMinPrice, percentPrice);
        }

        private void ApplyVariants(JObject variants)
        {
            VariantUnlockPercent = Clamp(Read(variants, "unlock_percent", VariantUnlockPercent), MinUnlockPercent, MaxUnlockPercent, "variants.unlock_percent");
            VariantMinPrice = Read(variants, "min_price", VariantMinPrice);
            if (VariantMinPrice < 0)
            {
                Log($"variants.min_price {VariantMinPrice} clamped to 0.");
                VariantMinPrice = 0;
            }
        }

        private void ApplyResale(JObject resale)
        {
            if (Read(resale, "allowed", false))
            {
                Log("resale.allowed is true, forced to false (decorations are never resold).");
            }
            ResaleAllowed = false;
        }

        private void ApplyRoam(JObject roam)
        {
            RoamSlotMinutes = Read(roam, "slot_minutes", RoamSlotMinutes);
            RoamNightFromHour = Clamp(Read(roam, "night_from_hour", RoamNightFromHour), MinClockHour, MaxClockHour, "roam.night_from_hour");
            RoamNightToHour = Clamp(Read(roam, "night_to_hour", RoamNightToHour), MinClockHour, MaxClockHour, "roam.night_to_hour");
            RoamDefaultMode = Read(roam, "default_mode", RoamDefaultMode);
        }

        private void ApplyRun(JObject run)
        {
            RunCellsPerPig = Clamp(Read(run, "cells_per_pig", RunCellsPerPig), MinCellsPerPig, MaxCellsPerPig, "run.cells_per_pig");
            RunMinCells = Read(run, "min_cells", RunMinCells);
            if (RunMinCells < 2 * RunCellsPerPig)
            {
                Log($"run.min_cells {RunMinCells} raised to {2 * RunCellsPerPig} (twice cells_per_pig).");
                RunMinCells = 2 * RunCellsPerPig;
            }

            RunGateItem = Read(run, "gate_item", RunGateItem);
            RunBlockers = ParseStrings(run?["blockers"] as JArray, RunBlockers, "run.blockers");
            if (!RunBlockers.Contains(RunGateItem))
            {
                Log($"run.blockers did not contain gate_item '{RunGateItem}', added.");
                var list = new List<string>(RunBlockers) { RunGateItem };
                RunBlockers = list;
            }

            RunMaxHoursPerDay = Read(run, "max_hours_per_day", RunMaxHoursPerDay);
            RunDayFromHour = Clamp(Read(run, "day_from_hour", RunDayFromHour), MinClockHour, MaxClockHour, "run.day_from_hour");
            RunDayToHour = Clamp(Read(run, "day_to_hour", RunDayToHour), MinClockHour, MaxClockHour, "run.day_to_hour");

            RunMinTempC = Read(run, "min_temp_c", RunMinTempC);
            RunMaxTempC = Read(run, "max_temp_c", RunMaxTempC);
            if (RunMaxTempC < RunMinTempC)
            {
                Log($"run.max_temp_c {RunMaxTempC} was below min_temp_c, raised to {RunMinTempC}.");
                RunMaxTempC = RunMinTempC;
            }

            RunAllowedConditions = ParseStrings(run?["allowed_conditions"] as JArray, RunAllowedConditions, "run.allowed_conditions");
            RunMoodPerHour = Clamp(Read(run, "mood_per_hour", RunMoodPerHour), MinMoodPerHour, MaxMoodPerHour, "run.mood_per_hour");
            RunMoodCapPerDay = Clamp(Read(run, "mood_cap_per_day", RunMoodCapPerDay), MinMoodCapPerDay, MaxMoodCapPerDay, "run.mood_cap_per_day");
        }

        private static IReadOnlyList<string> ParseStrings(JArray array, IReadOnlyList<string> fallback, string where)
        {
            if (array == null)
            {
                Log($"{where} is missing, using code defaults.");
                return fallback;
            }
            var list = new List<string>();
            foreach (var token in array)
            {
                if (token.Type == JTokenType.String)
                {
                    string s = (string)token;
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
                }
            }
            return list;
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
            ItemCatalog.ErrorLogger?.Invoke("HomeEconomyConfig: " + message);
        }
    }
}
