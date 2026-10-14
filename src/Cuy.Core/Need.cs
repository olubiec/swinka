using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    /// <summary>
    /// Sześć potrzeb świnki z PLAN.md (sekcja "Model świnki").
    /// Kolejność jak w assets/data/actions.json.
    /// </summary>
    public enum Need
    {
        /// <summary>Najedzenie.</summary>
        Satiety,
        /// <summary>Witamina C.</summary>
        VitaminC,
        /// <summary>Energia.</summary>
        Energy,
        /// <summary>Humor.</summary>
        Mood,
        /// <summary>Czystość klatki.</summary>
        Cleanliness,
        /// <summary>Ząbki.</summary>
        Teeth
    }

    /// <summary>Nazwy potrzeb: polskie (dla użytkownika) i klucze z plików w assets/data/.</summary>
    public static class NeedNames
    {
        public static readonly IReadOnlyList<Need> All = (Need[])Enum.GetValues(typeof(Need));

        public static string Polish(Need need)
        {
            switch (need)
            {
                case Need.Satiety: return "Najedzenie";
                case Need.VitaminC: return "Witamina C";
                case Need.Energy: return "Energia";
                case Need.Mood: return "Humor";
                case Need.Cleanliness: return "Czystość klatki";
                case Need.Teeth: return "Ząbki";
                default: throw new ArgumentOutOfRangeException(nameof(need));
            }
        }

        /// <summary>Klucz używany w actions.json i items.json, np. "vitamin_c".</summary>
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
