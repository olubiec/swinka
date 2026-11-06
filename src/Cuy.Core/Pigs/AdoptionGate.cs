using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Pigs
{
    /// <summary>Tunable numbers of the adoption gate (assets/data/adoption_gate.json).</summary>
    public sealed class AdoptionGateConfig
    {
        public LifeStage StarterStage { get; }
        public double DelayDaysMin { get; }
        public double DelayDaysMax { get; }
        public string OfferGroup { get; }
        public string StarterBreed { get; }
        public string StarterPaletteId { get; }

        public AdoptionGateConfig(LifeStage starterStage, double delayDaysMin, double delayDaysMax, string offerGroup, string starterBreed, string starterPaletteId)
        {
            if (delayDaysMin < 0 || double.IsNaN(delayDaysMin) || double.IsInfinity(delayDaysMin)) delayDaysMin = 0;
            if (delayDaysMax < delayDaysMin || double.IsNaN(delayDaysMax) || double.IsInfinity(delayDaysMax)) delayDaysMax = delayDaysMin;
            StarterStage = starterStage;
            DelayDaysMin = delayDaysMin;
            DelayDaysMax = delayDaysMax;
            OfferGroup = string.IsNullOrEmpty(offerGroup) ? "starter" : offerGroup;
            StarterBreed = string.IsNullOrEmpty(starterBreed) ? "smooth" : starterBreed;
            StarterPaletteId = string.IsNullOrEmpty(starterPaletteId) ? "tricolor" : starterPaletteId;
        }

        private static readonly object _syncLock = new object();
        private static AdoptionGateConfig _current;

        public static AdoptionGateConfig Current
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
            set
            {
                lock (_syncLock) { _current = value; }
            }
        }

        public static AdoptionGateConfig CodeDefaults()
        {
            return new AdoptionGateConfig(LifeStage.Junior, 1, 3, "starter", "smooth", "tricolor");
        }

        public static AdoptionGateConfig Load(string json)
        {
            var defaults = CodeDefaults();
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("AdoptionGateConfig: JSON is empty, using defaults.");
                return defaults;
            }

            try
            {
                var root = JObject.Parse(json);
                var stage = defaults.StarterStage;
                string stageText = (string)root["starter_stage"];
                if (!string.IsNullOrEmpty(stageText))
                {
                    LifeStage parsed;
                    if (Enum.TryParse(stageText, true, out parsed)) stage = parsed;
                    else ItemCatalog.ErrorLogger?.Invoke($"AdoptionGateConfig: unknown starter_stage '{stageText}', using junior.");
                }

                double min = (double?)root["delay_days"]?["min"] ?? defaults.DelayDaysMin;
                double max = (double?)root["delay_days"]?["max"] ?? defaults.DelayDaysMax;
                string group = (string)root["offer_group"];
                string breed = (string)root["starter_look"]?["breed"];
                string palette = (string)root["starter_look"]?["palette_id"];
                return new AdoptionGateConfig(stage, min, max, group, breed, palette);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("AdoptionGateConfig: invalid JSON, using defaults: " + ex.Message);
                return defaults;
            }
        }

        public static AdoptionGateConfig LoadDefault()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidates =
            {
                Path.Combine(baseDir, "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "adoption_gate.json"),
                Path.Combine(baseDir, "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "adoption_gate.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "adoption_gate.json")
            };

            foreach (var path in candidates)
            {
                try
                {
                    string full = Path.GetFullPath(path);
                    if (File.Exists(full)) return Load(File.ReadAllText(full));
                }
                catch (Exception ex)
                {
                    ItemCatalog.ErrorLogger?.Invoke("AdoptionGateConfig: cannot read " + path + ": " + ex.Message);
                }
            }

            return CodeDefaults();
        }
    }

    /// <summary>Breed and coat used to draw a pig. One source for the desktop pet and the Home page.</summary>
    public sealed class PigLookSpec
    {
        public string Breed { get; }
        public string PaletteId { get; }

        public PigLookSpec(string breed, string paletteId)
        {
            Breed = breed ?? string.Empty;
            PaletteId = paletteId ?? string.Empty;
        }

        public bool SameAs(PigLookSpec other)
        {
            return other != null &&
                   string.Equals(Breed, other.Breed, StringComparison.OrdinalIgnoreCase) &&
                   string.Equals(PaletteId, other.PaletteId, StringComparison.OrdinalIgnoreCase);
        }
    }

    /// <summary>Pure rules of the adoption gate: Kuki and Ned appear as one offer after the starter pig has grown.</summary>
    public static class AdoptionGate
    {
        /// <summary>Look of a roster pig: named pigs use their own coat, any other pig uses the default starter skin.</summary>
        public static PigLookSpec LookOf(PigProfile pig, AdoptionGateConfig config = null)
        {
            config = config ?? AdoptionGateConfig.Current;
            if (pig != null && !string.IsNullOrEmpty(pig.NamedId))
            {
                return new PigLookSpec(pig.Breed, pig.PaletteId);
            }
            return new PigLookSpec(config.StarterBreed, config.StarterPaletteId);
        }

        /// <summary>Named pigs keep their fixed names. Returns false when the rename is rejected.</summary>
        public static bool TryRename(PigProfile pig, string newName)
        {
            if (pig == null || string.IsNullOrWhiteSpace(newName)) return false;
            if (!string.IsNullOrEmpty(pig.NamedId)) return false;
            pig.Name = newName.Trim();
            return true;
        }

        public static bool IsGateMember(string namedId, AdoptionGateConfig config, NamedPigCatalog catalog)
        {
            if (string.IsNullOrEmpty(namedId) || catalog == null) return false;
            var group = catalog.OfferGroup((config ?? AdoptionGateConfig.Current).OfferGroup);
            foreach (var def in group)
            {
                if (def != null && string.Equals(def.Id, namedId, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        /// <summary>True when the pig can be adopted now: it is in the gate group and the offer is pending. Other named pigs are not governed by the gate.</summary>
        public static bool IsAdoptable(GameState state, string namedId, AdoptionGateConfig config, NamedPigCatalog catalog)
        {
            if (state == null || string.IsNullOrEmpty(namedId)) return false;
            if (!IsGateMember(namedId, config, catalog)) return true;
            if (HasPig(state, namedId)) return false;
            return state.IsAdoptionOfferPending(config, catalog);
        }

        /// <summary>Whether the pig is visible (in the roster or offered). Gate members stay hidden until the offer is pending.</summary>
        public static bool IsVisible(GameState state, string namedId, AdoptionGateConfig config, NamedPigCatalog catalog)
        {
            if (state == null || string.IsNullOrEmpty(namedId)) return false;
            if (HasPig(state, namedId)) return true;
            return IsAdoptable(state, namedId, config, catalog);
        }

        public static bool HasPig(GameState state, string namedId)
        {
            if (state?.Roster == null || string.IsNullOrEmpty(namedId)) return false;
            foreach (var p in state.Roster)
            {
                if (p == null) continue;
                if (string.Equals(p.NamedId, namedId, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.Id, namedId, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        /// <summary>Moves the gate forward: migration for old saves, stage detection, offer time. Call on load and about once a minute.</summary>
        public static void Evaluate(GameState state, DateTime nowUtc, double pigDaysPerRealDay, Random rng, AdoptionGateConfig config, NamedPigCatalog catalog)
        {
            if (state == null) return;
            config = config ?? AdoptionGateConfig.Current;
            if (state.AdoptionGateOpen) return;

            // Migration: a save that already holds a gate pig has the gate open and shows no offer.
            var group = catalog?.OfferGroup(config.OfferGroup);
            if (group != null)
            {
                foreach (var def in group)
                {
                    if (def != null && HasPig(state, def.Id))
                    {
                        state.AdoptionGateOpen = true;
                        state.AdoptionAccepted = true; // nothing left to offer
                        return;
                    }
                }
            }

            if (!state.AdoptionOfferAtUtc.HasValue)
            {
                PigProfile starter = null;
                if (state.Roster != null)
                {
                    foreach (var p in state.Roster)
                    {
                        if (p != null && string.IsNullOrEmpty(p.NamedId) && !p.Memorial) { starter = p; break; }
                    }
                }
                if (starter == null) return;

                var stage = PigLife.StageOf(starter, nowUtc, pigDaysPerRealDay, state.BirthDateUtc);
                if ((int)stage < (int)config.StarterStage) return;

                double span = config.DelayDaysMax - config.DelayDaysMin;
                double roll = (rng ?? new Random()).NextDouble();
                state.AdoptionStageReachedUtc = nowUtc;
                state.AdoptionOfferAtUtc = nowUtc.AddDays(config.DelayDaysMin + roll * span);
            }

            if (nowUtc >= state.AdoptionOfferAtUtc.Value)
            {
                state.AdoptionGateOpen = true;
            }
        }

        /// <summary>Accepting the offer adds the whole group to the roster. Needs the gate open.</summary>
        public static AdoptResult Accept(Pet pet, Random rng, DateTime nowUtc, AdoptionGateConfig config = null)
        {
            if (pet == null) return AdoptResult.UnknownPig;
            config = config ?? AdoptionGateConfig.Current;
            var catalog = pet.NamedPigs;
            double pdr = pet.Balance != null ? pet.Balance.PigDaysPerRealDay : 21.0;
            Evaluate(pet.State, nowUtc, pdr, rng, config, catalog);
            if (!pet.State.IsAdoptionOfferPending(config, catalog)) return AdoptResult.NotUnlocked;

            var result = pet.AdoptGroup(config.OfferGroup, rng, nowUtc);
            if (result == AdoptResult.Ok) pet.State.AdoptionAccepted = true;
            return result;
        }
    }
}
