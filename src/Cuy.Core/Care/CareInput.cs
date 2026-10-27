using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Cuy.Core.Care
{
    public static class CareInput
    {
        public static bool TryPigName(string raw, out string name)
        {
            name = null;
            if (string.IsNullOrWhiteSpace(raw)) return false;

            string trimmed = raw.Trim();
            if (trimmed.Length < 1 || trimmed.Length > 16) return false;

            bool wasSpace = false;
            foreach (char c in trimmed)
            {
                if (char.IsControl(c)) return false;

                if (c == ' ')
                {
                    if (wasSpace) return false;
                    wasSpace = true;
                }
                else
                {
                    if (!char.IsLetter(c) && !char.IsDigit(c)) return false;
                    wasSpace = false;
                }
            }

            name = trimmed;
            return true;
        }

        public static List<string> CleanPigNames(IEnumerable<string> raw)
        {
            var result = new List<string>();
            if (raw == null) return result;

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var r in raw)
            {
                if (TryPigName(r, out var name))
                {
                    if (seen.Add(name))
                    {
                        result.Add(name);
                        if (result.Count >= 8)
                        {
                            break;
                        }
                    }
                }
            }

            return result;
        }

        public static bool TryGrams(int grams)
        {
            return grams >= 50 && grams <= 3000;
        }

        private static readonly Regex TimeRegex = new Regex(@"^([01][0-9]|2[0-3]):[0-5][0-9]$", RegexOptions.Compiled);

        public static bool TryTime(string raw, out string hhmm)
        {
            hhmm = null;
            if (raw == null) return false;

            if (TimeRegex.IsMatch(raw))
            {
                hhmm = raw;
                return true;
            }

            return false;
        }

        public static bool TryWeekday(int day)
        {
            return day >= 0 && day <= 6;
        }

        public static bool TryEveryDays(int days)
        {
            return days >= 1 && days <= 730;
        }

        public static bool TrySnoozeMinutes(int minutes)
        {
            return minutes >= 1 && minutes <= 1440;
        }

        public static bool TryDate(string raw, DateTime todayLocal, out string date)
        {
            date = null;
            if (string.IsNullOrWhiteSpace(raw)) return false;

            if (DateTime.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                if (parsed >= new DateTime(2020, 1, 1) && parsed <= todayLocal.Date)
                {
                    date = parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                    return true;
                }
            }

            return false;
        }
    }
}
