using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    /// <summary>
    /// The guinea pig's six needs from PLAN.md (pig model section).
    /// Order as in assets/data/actions.json.
    /// </summary>
    public enum Need
    {
        /// <summary>Fullness.</summary>
        Satiety,
        /// <summary>Vitamin C.</summary>
        VitaminC,
        /// <summary>Energia.</summary>
        Energy,
        /// <summary>Mood.</summary>
        Mood,
        /// <summary>Cage cleanliness.</summary>
        Cleanliness,
        /// <summary>Teeth.</summary>
        Teeth
    }

    /// <summary>Need names: display names for the player and keys from the files in assets/data/.</summary>
    public static class NeedNames
    {
        public static readonly IReadOnlyList<Need> All = (Need[])Enum.GetValues(typeof(Need));

        public static string DisplayName(Need need)
        {
            switch (need)
            {
                case Need.Satiety: return "Fullness";
                case Need.VitaminC: return "Vitamin C";
                case Need.Energy: return "Energy";
                case Need.Mood: return "Mood";
                case Need.Cleanliness: return "Cleanliness";
                case Need.Teeth: return "Teeth";
                default: throw new ArgumentOutOfRangeException(nameof(need));
            }
        }

        /// <summary>Key used in actions.json and items.json, e.g. "vitamin_c".</summary>
        public static string DataKey(Need need)
        {
            switch (need)
            {
                case Need.Satiety: return "fullness";
                case Need.VitaminC: return "vitamin_c";
                case Need.Energy: return "energy";
                case Need.Mood: return "mood";
                case Need.Cleanliness: return "cleanliness";
                case Need.Teeth: return "teeth";
                default: throw new ArgumentOutOfRangeException(nameof(need));
            }
        }

        public static bool TryParseDataKey(string key, out Need need)
        {
            foreach (var n in All)
            {
                if (string.Equals(DataKey(n), key, StringComparison.OrdinalIgnoreCase))
                {
                    need = n;
                    return true;
                }
            }
            need = default(Need);
            return false;
        }
    }
}
