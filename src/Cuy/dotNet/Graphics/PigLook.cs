using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;

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
            var pet = BrainController.Instance?.Pet;
            return LifeStages.DataKey(pet != null ? pet.Stage : LifeStage.Baby);
        }

        /// <summary>Replaces the pet's sprites with the look of its own profile (smooth + default palette when it has none).</summary>
        public static void Apply(FormPet pet, Xml xml, string stageKey)
        {
            if (pet == null || xml == null) return;
            try
            {
                string breed = pet.Profile != null ? pet.Profile.Breed : "smooth";
                string palette = pet.Profile != null ? pet.Profile.PaletteId : null;
                if (palette == null) palette = PaletteRemap.Table.Default;
                var sprites = xml.BuildStageSprites(stageKey, breed, palette);
                if (sprites != null)
                {
                    pet.ReplaceSprites(sprites);
                    BrainController.Log("[Look] " + (pet.Profile != null ? pet.Profile.Name : "pet") + ": " + breed + "/" + stageKey + "/" + palette);
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
                string stageKey = CurrentStageKey();
                var pets = FormPet.AllPets.ToArray();
                for (int i = 0; i < pets.Length; i++)
                {
                    pets[i].Profile = ProfileForSlot(i);
                    Apply(pets[i], pets[i].Xml, stageKey);
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PigLook.RefreshAll: " + ex.Message);
            }
        }
    }
}
