using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;
using Newtonsoft.Json.Linq;

namespace Cuy
{
    /// <summary>Gives every desktop pet the sprite sheet (breed + stage) and coat palette of its own PigProfile.</summary>
    public static class PigLook
    {
        /// <summary>Profile for desktop pet slot i: the i-th active pig, else roster entries in order. Null when there is no roster yet.</summary>
        public static PigProfile ProfileForSlot(int slot)
        {
            try
            {
                var state = BrainController.Instance?.Pet?.State;
                if (state == null) return null;
                state.EnsureRosterInitialized();
                if (state.Roster == null || state.Roster.Count == 0) return null;
                if (state.ActivePigIds != null && slot >= 0 && slot < state.ActivePigIds.Count)
                {
                    var active = state.Roster.FirstOrDefault(p => p.Id == state.ActivePigIds[slot]);
                    if (active != null) return active;
                }
                return state.Roster[Math.Max(0, slot) % state.Roster.Count];
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PigLook.ProfileForSlot: " + ex.Message);
                return null;
            }
        }

        public static string CurrentStageKey()
        {
            return CurrentStageKey(null);
        }

        public static string CurrentStageKey(PigProfile profile)
        {
            var pet = BrainController.Instance?.Pet;
            if (pet != null && pet.Balance != null && pet.Balance.PerPigAgeActive && profile != null)
            {
                if (profile.Memorial) return LifeStages.DataKey(LifeStage.Legend);
                if (!pet.Balance.GrowthActive) return LifeStages.DataKey(LifeStage.Baby);
                var nowUtc = pet.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;
                var fallbackBirth = pet.State != null ? pet.State.BirthDateUtc : nowUtc;
                var stage = PigLife.StageOf(profile, nowUtc, pet.Balance.PigDaysPerRealDay, fallbackBirth);
                return LifeStages.DataKey(stage);
            }
            return LifeStages.DataKey(pet != null ? pet.Stage : LifeStage.Baby);
        }

        private static readonly object _pigsJsonLock = new object();
        private static bool _pigsJsonLoaded = false;
        private static Dictionary<string, HashSet<string>> _pigsJsonMetadata;
        private static bool _pigsJsonExists = false;

        private static void EnsurePigsJsonLoaded()
        {
            if (_pigsJsonLoaded) return;
            lock (_pigsJsonLock)
            {
                if (_pigsJsonLoaded) return;
                _pigsJsonLoaded = true;
                _pigsJsonMetadata = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

                try
                {
                    string spritesDir = Xml.ResolveAssetsSpritesDir();
                    string jsonPath = Path.Combine(spritesDir, "pigs", "pigs.json");
                    if (File.Exists(jsonPath))
                    {
                        _pigsJsonExists = true;
                        string content = File.ReadAllText(jsonPath);
                        var obj = JObject.Parse(content);
                        var pigs = obj["pigs"] as JObject;
                        if (pigs != null)
                        {
                            foreach (var prop in pigs.Properties())
                            {
                                var stages = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                                var stagesArr = prop.Value?["stages"] as JArray;
                                if (stagesArr != null)
                                {
                                    foreach (var s in stagesArr)
                                    {
                                        string val = s?.ToString();
                                        if (!string.IsNullOrEmpty(val)) stages.Add(val);
                                    }
                                }
                                _pigsJsonMetadata[prop.Name] = stages;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    BrainController.Log("[WARN] PigLook: failed reading pigs.json: " + ex.Message);
                }
            }
        }

        public static bool IsNamedPigAvailable(string pigId, string stageKey)
        {
            if (string.IsNullOrEmpty(pigId) || string.IsNullOrEmpty(stageKey)) return false;
            EnsurePigsJsonLoaded();

            if (_pigsJsonExists && _pigsJsonMetadata != null)
            {
                if (!_pigsJsonMetadata.TryGetValue(pigId, out var stages))
                {
                    return false;
                }
                if (stages != null && stages.Count > 0 && !stages.Contains(stageKey))
                {
                    return false;
                }
            }

            try
            {
                string spritesDir = Xml.ResolveAssetsSpritesDir();
                string folder = Path.Combine(spritesDir, "pigs", pigId.ToLowerInvariant(), stageKey.ToLowerInvariant());
                if (!Directory.Exists(folder)) return false;
                string sheet = Path.Combine(folder, "spritesheet.png");
                return File.Exists(sheet);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>Replaces the pet's sprites with the look of its own profile (smooth + default palette when it has none).</summary>
        public static void Apply(FormPet pet, Xml xml, string stageKey = null)
        {
            if (pet == null || xml == null) return;
            try
            {
                string effectiveStageKey = stageKey;
                var corePet = BrainController.Instance?.Pet;
                if (corePet != null && corePet.Balance != null && corePet.Balance.PerPigAgeActive && pet.Profile != null)
                {
                    effectiveStageKey = CurrentStageKey(pet.Profile);
                }
                if (string.IsNullOrEmpty(effectiveStageKey))
                {
                    effectiveStageKey = CurrentStageKey();
                }

                var profile = pet.Profile;
                var descriptor = PigLookResolver.Resolve(profile, effectiveStageKey);
                string namedId = descriptor?.Named;
                if (!string.IsNullOrWhiteSpace(namedId) && IsNamedPigAvailable(namedId, effectiveStageKey))
                {
                    try
                    {
                        var namedSprites = xml.BuildNamedPigSprites(namedId, effectiveStageKey);
                        if (namedSprites != null)
                        {
                            pet.ReplaceSprites(namedSprites);
                            BrainController.Log("[Look] " + (profile != null ? profile.Name : "pet") + ": " + namedId + "/" + effectiveStageKey);
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log("[WARN] PigLook.Apply (named): " + ex.Message);
                    }
                }

                // Fall back to shape + palette path
                string breed = descriptor?.Breed ?? (profile != null ? profile.Breed : "smooth");
                string palette = descriptor?.Coat ?? (profile != null ? profile.PaletteId : null);
                if (palette == null) palette = PaletteRemap.Table.Default;
                var sprites = xml.BuildStageSprites(effectiveStageKey, breed, palette);
                if (sprites != null)
                {
                    pet.ReplaceSprites(sprites);
                    BrainController.Log("[Look] " + (profile != null ? profile.Name : "pet") + ": " + breed + "/" + effectiveStageKey + "/" + palette);
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PigLook.Apply: " + ex.Message);
            }
        }

        /// <summary>Re-reads profiles for all pets (after adopting or switching active pigs) and re-applies looks.</summary>
        public static void RefreshAll()
        {
            try
            {
                var pets = FormPet.AllPets.ToArray();
                for (int i = 0; i < pets.Length; i++)
                {
                    pets[i].Profile = ProfileForSlot(i);
                    Apply(pets[i], pets[i].Xml, CurrentStageKey(pets[i].Profile));
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PigLook.RefreshAll: " + ex.Message);
            }
        }
    }
}
