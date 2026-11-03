using System;
using System.Collections.Generic;

namespace Cuy.Core.Pigs
{
    public class PigProfile
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Name { get; set; } = "Cuy";
        public string Breed { get; set; } = "smooth"; // smooth, rosette, peruvian, chubby, skinny
        public string PaletteId { get; set; } = "tricolor"; // tricolor, dutch, agouti, albino, cinnamon
        public List<string> Traits { get; set; } = new List<string>();
        public HashSet<string> DiscoveredTraits { get; set; } = new HashSet<string>();

        public string NamedId { get; set; }
        public DateTime? BornAtUtc { get; set; }
        public DateTime? ArrivedAtUtc { get; set; }
        public double? LegendAtYears { get; set; }
        public bool Memorial { get; set; }

        public PigProfile()
        {
        }

        public PigProfile(string name, string breed = "smooth", string paletteId = "tricolor")
        {
            Name = name ?? "Cuy";
            Breed = breed ?? "smooth";
            PaletteId = paletteId ?? "tricolor";
        }

        public bool DiscoverTrait(string trait)
        {
            if (string.IsNullOrWhiteSpace(trait)) return false;
            if (DiscoveredTraits == null) DiscoveredTraits = new HashSet<string>();
            return DiscoveredTraits.Add(trait);
        }

        public bool IsTraitDiscovered(string trait)
        {
            if (string.IsNullOrWhiteSpace(trait) || DiscoveredTraits == null) return false;
            return DiscoveredTraits.Contains(trait);
        }

        public static PigProfile CreateRandom(string name = null, Random rng = null)
        {
            rng = rng ?? new Random();
            string[] breeds = { "smooth", "rosette", "peruvian", "chubby", "skinny" };
            string[] palettes = { "tricolor", "dutch", "agouti", "albino", "cinnamon" };
            string[] allTraits = { "cuddly", "glutton", "explorer", "sleepyhead", "popcorning", "vocal" };

            var profile = new PigProfile(
                name ?? "Piggy",
                breeds[rng.Next(breeds.Length)],
                palettes[rng.Next(palettes.Length)]
            );

            // Give 2 random traits
            var picked = new HashSet<string>();
            while (picked.Count < 2)
            {
                picked.Add(allTraits[rng.Next(allTraits.Length)]);
            }
            profile.Traits.AddRange(picked);

            return profile;
        }
    }
}

