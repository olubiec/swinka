using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.Pigs;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    /// <summary>My Pigs: publishes the roster (breed, palette, traits) and handles adopting and bringing pigs to the desk.</summary>
    public class PigsFeature : HomeFeatureBase
    {
        private static readonly string[] DefaultNames = { "Piko", "Milo", "Luna", "Koko", "Buba", "Zuzu" };

        public override string Id { get { return "pigs"; } }

        private static JObject LoadConfig()
        {
            try
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "data", "pigs.json");
                if (File.Exists(path)) return JObject.Parse(File.ReadAllText(path));
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PigsFeature.LoadConfig: " + ex.Message);
            }
            return new JObject();
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var gs = brain?.Pet?.State;
            if (gs == null) return;
            gs.EnsureRosterInitialized();
            state["roster"] = gs.Roster.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                breed = p.Breed,
                paletteId = p.PaletteId,
                traits = p.Traits,
                discoveredTraits = p.DiscoveredTraits != null ? p.DiscoveredTraits.ToList() : new List<string>()
            }).ToList();
            state["activePigIds"] = gs.ActivePigIds.ToList();
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "adopt_pig" && type != "toggle_pig_active") return false;
            var pet = brain?.Pet;
            var gs = pet?.State;
            if (gs == null) return true;
            gs.EnsureRosterInitialized();

            if (type == "adopt_pig")
            {
                var cfg = LoadConfig();
                int cost = (int?)cfg["adopt_cost"] ?? 80;
                int maxRoster = (int?)cfg["max_roster"] ?? 6;
                var names = cfg["names"] != null ? cfg["names"].Select(t => (string)t).ToArray() : DefaultNames;
                if (names.Length == 0) names = DefaultNames;
                if (gs.Roster.Count >= maxRoster)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "The family is full" });
                    return true;
                }
                if (!pet.TrySpendClovers(cost))
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    return true;
                }
                var rng = new Random();
                var profile = PigProfile.CreateRandom(names[rng.Next(names.Length)], rng);
                gs.Roster.Add(profile);
                BrainController.Log("[Pigs] adopted " + profile.Name + " (" + profile.Breed + ", " + profile.PaletteId + ")");
                HomeWindow.PostToPage(new { type = "toast", text = "Welcome " + profile.Name + " to the family!" });
            }
            else
            {
                string id = message?.Value<string>("pigId");
                if (string.IsNullOrEmpty(id) || !gs.Roster.Any(p => p.Id == id)) return true;
                var act = gs.ActivePigIds;
                if (act.Contains(id))
                {
                    if (act.Count > 1) act.Remove(id);
                }
                else
                {
                    if (act.Count >= 2) act.RemoveAt(0);
                    act.Add(id);
                }
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] PigsFeature save: " + ex.Message); }
            PigLook.RefreshAll();
            return true;
        }
    }
}
