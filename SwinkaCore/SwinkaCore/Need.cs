using System;
using System.Collections.Generic;

namespace SwinkaCore
{
    /// <summary>
    /// Sześć potrzeb świnki z PLAN.md (sekcja "Model świnki").
    /// Kolejność jak w swinka/dane/actions.json.
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

    /// <summary>Nazwy potrzeb: polskie (dla użytkownika) i klucze z plików w swinka/dane/.</summary>
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

        /// <summary>Klucz używany w actions.json i items.json, np. "witamina_c".</summary>
        public static string DataKey(Need need)
        {
            switch (need)
            {
                case Need.Satiety: return "najedzenie";
                case Need.VitaminC: return "witamina_c";
                case Need.Energy: return "energia";
                case Need.Mood: return "humor";
                case Need.Cleanliness: return "czystosc";
                case Need.Teeth: return "zabki";
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
