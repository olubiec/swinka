using System;
using System.Collections.Generic;
using System.IO;

namespace Cuy.Core.Pigs
{
    /// <summary>
    /// Descriptor for a pig's visual appearance across all renderers (desktop and web).
    /// </summary>
    public class PigLookDescriptor
    {
        public string SpriteKey { get; set; }
        public string Breed { get; set; }
        public string Coat { get; set; }
        public string Stage { get; set; }
        public string Named { get; set; }

        public bool IsNamed => !string.IsNullOrEmpty(Named);

        // Lowercase accessors for serialization convenience
        public string spriteKey => SpriteKey;
        public string breed => Breed;
        public string coat => Coat;
        public string stage => Stage;
        public string named => Named;

        public Dictionary<string, object> ToLookState()
        {
            return new Dictionary<string, object>
            {
                ["spriteKey"] = SpriteKey,
                ["breed"] = Breed,
                ["coat"] = Coat,
                ["stage"] = Stage
            };
        }

        public Dictionary<string, object> ToMap()
        {
            var map = ToLookState();
            map["named"] = Named;
            return map;
        }
    }

    /// <summary>
    /// Single source of truth for resolving guinea pig looks.
    /// Unifies desktop and Home window rendering.
    /// </summary>
    public static class PigLookResolver
    {
        private static readonly HashSet<string> KnownNamedPigs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "kuki", "ned", "glen", "james", "racuch", "cuy"
        };

        private static readonly HashSet<string> ValidStages = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "baby", "junior", "adult", "senior", "legend"
        };

        public static string NormalizeStage(string stage)
        {
            if (string.IsNullOrWhiteSpace(stage)) return "adult";
            stage = stage.Trim().ToLowerInvariant();
            return ValidStages.Contains(stage) ? stage : "adult";
        }

        public static string NormalizeBreed(string breed)
        {
            if (string.IsNullOrWhiteSpace(breed)) return "smooth";
            breed = breed.Trim().ToLowerInvariant();

            switch (breed)
            {
                case "smooth":
                case "smooth_normal":
                    return "smooth";
                case "chubby":
                case "smooth_chubby":
                    return "smooth_chubby";
                case "skinny":
                case "smooth_lean":
                    return "smooth_lean";
                case "rosette":
                case "rosette_normal":
                    return "rosette_normal";
                case "rosette_lean":
                    return "rosette_lean";
                case "peruvian":
                case "peruvian_normal":
                    return "peruvian_normal";
                case "teddy":
                case "teddy_normal":
                    return "teddy_normal";
                case "teddy_chubby":
                    return "teddy_chubby";
                default:
                    return "smooth";
            }
        }

        public static PigLookDescriptor Resolve(PigProfile pig, string stage = null)
        {
            if (pig == null)
            {
                return Resolve("smooth", "blaze_only.ginger", stage ?? "adult", null);
            }

            string effectiveStage = stage;
            if (string.IsNullOrEmpty(effectiveStage))
            {
                effectiveStage = pig.Memorial ? "legend" : "adult";
            }

            return Resolve(pig.Breed, pig.PaletteId, effectiveStage, pig.NamedId);
        }

        public static PigLookDescriptor Resolve(string breed, string coat, string stage = null, string namedId = null)
        {
            string normStage = NormalizeStage(stage);
            string normBreed = NormalizeBreed(breed);
            string normCoat = string.IsNullOrWhiteSpace(coat) ? "blaze_only.ginger" : coat.Trim();
            if (string.Equals(normCoat, "tricolor", StringComparison.OrdinalIgnoreCase))
            {
                normCoat = "blaze_only.ginger";
            }

            string normNamed = null;
            if (!string.IsNullOrWhiteSpace(namedId))
            {
                string candidate = namedId.Trim().ToLowerInvariant();
                if (KnownNamedPigs.Contains(candidate))
                {
                    normNamed = candidate;
                }
            }

            string spriteKey;
            if (normNamed != null)
            {
                spriteKey = "sprites/pigs/" + normNamed + "/" + normStage + "/spritesheet.png";
            }
            else if (normBreed == "smooth")
            {
                spriteKey = "sprites/" + normStage + "/spritesheet.png";
            }
            else
            {
                spriteKey = "sprites/breeds/" + normBreed + "/" + normStage + "/spritesheet.png";
            }

            return new PigLookDescriptor
            {
                SpriteKey = spriteKey,
                Breed = normBreed,
                Coat = normCoat,
                Stage = normStage,
                Named = normNamed
            };
        }
    }

    /// <summary>
    /// Roster helper for building look descriptors in page state.
    /// </summary>
    public static class PigRoster
    {
        public static Dictionary<string, object> BuildPigLook(PigProfile pig, string stage = null)
        {
            var descriptor = PigLookResolver.Resolve(pig, stage);
            return descriptor.ToLookState();
        }

        public static void AttachLook(IDictionary<string, object> pigMap, PigProfile pig, string stage = null)
        {
            if (pigMap == null || pig == null) return;
            pigMap["look"] = BuildPigLook(pig, stage);
        }
    }
}
