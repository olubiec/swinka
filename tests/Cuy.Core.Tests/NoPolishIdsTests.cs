using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace Cuy.Core.Tests
{
    public class NoPolishIdsTests
    {
        private static string GetRepoRoot()
        {
            string? dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return dir;
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException("Cannot find repo root (folder containing Cuy.sln).");
        }

        private static HashSet<string> LoadPolishIdentifiers(string repoRoot)
        {
            string namesPath = Path.Combine(repoRoot, "docs", "NAMES.md");
            if (!File.Exists(namesPath))
                throw new FileNotFoundException($"Cannot find {namesPath}");

            string[] lines = File.ReadAllLines(namesPath);
            var polishIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var englishWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "cuy", "assets", "sprites", "adult", "baby", "senior", "legend", "companion", "black", "white",
                "agouti", "cream", "icons", "pig", "head", "sounds", "wheek", "purr", "chirp", "fear", "squeal",
                "angry", "crunch", "simulation", "home", "minigames", "shop", "album", "diary", "clovers", "poop",
                "bond", "hay", "rack", "junior", "fullness", "vitamin_c", "energy", "mood", "cleanliness", "teeth",
                "needs", "decay_per_hour", "actions", "events", "animation", "duration_s", "effects", "conditions",
                "condition", "base_weight", "daily_limit", "hourly_limit", "stage_multiplier", "time_multiplier",
                "multiplier", "satisfies", "consumes", "hay_in_rack", "item", "items", "enter", "exit", "moves",
                "signal", "distance_px", "day_budget", "time_share_percent", "times_of_day", "activity", "naps",
                "rare_per_day", "selection", "currency", "name", "description", "price", "category", "icon",
                "unlimited", "uses", "permanent", "reward_clovers", "stage_min", "every_minutes", "then", "health_max",
                "temperature_min", "temperature_max", "bell_pepper", "parsley", "cucumber", "pellets", "chew_stick",
                "ball", "tunnel", "house", "water_bottle", "cake", "kale", "rest", "sniffing", "walk", "eat_hay",
                "drink", "nap", "sleep", "sleep_in_house", "wheeking", "begging", "app", "min", "max", "e.g.", "need",
                "names", "png", "json", "ico", "desktoppet"
            };

            var candidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (string rawLine in lines)
            {
                string line = rawLine.Trim();
                if (line.StartsWith("|") && !line.StartsWith("| ---"))
                {
                    string[] cols = line.Split('|');
                    var parts = cols.Skip(1).Take(cols.Length - 2).Select(c => c.Trim()).ToArray();
                    if (parts.Length >= 2 && !parts[0].StartsWith("Old", StringComparison.OrdinalIgnoreCase))
                    {
                        candidates.Add(parts[0]);
                        if (parts.Length >= 4 && !parts[2].StartsWith("Old", StringComparison.OrdinalIgnoreCase))
                        {
                            candidates.Add(parts[2]);
                        }
                    }
                }
                else if (line.StartsWith("Ids follow", StringComparison.OrdinalIgnoreCase))
                {
                    foreach (Match match in Regex.Matches(line, @"([a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\-\./]+)\s*→"))
                    {
                        candidates.Add(match.Groups[1].Value);
                    }
                }
            }

            foreach (string candidate in candidates)
            {
                string cleaned = Regex.Replace(candidate, @"\.(png|json|ico)", "");
                cleaned = cleaned.Replace("<need>", "").Replace("(_min)", "");
                foreach (Match wordMatch in Regex.Matches(cleaned, @"[a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+"))
                {
                    string word = wordMatch.Value;
                    if (word.Length < 3 || englishWords.Contains(word) || int.TryParse(word, out _))
                        continue;

                    polishIds.Add(word);
                }
            }

            // Canonical Polish identifiers mentioned in docs/NAMES.md
            string[] canonical =
            {
                "papryka", "natka", "ogorek", "granulat", "gryzak", "pilka", "tunel", "domek", "poidlo",
                "tort", "jarmuz", "siano", "odpoczynek", "weszenie", "spacer", "jedzenie_siana", "picie",
                "drzemka", "sen", "sen_w_domku", "kwiczenie", "proszenie", "najedzenie", "witamina_c",
                "czystosc", "zabki", "maluch", "mlodzik", "dorosla", "legenda", "potrzeby", "spadek_na_godzine",
                "czynnosci", "zdarzenia", "animacja", "czas_s", "efekty", "warunki", "warunek", "waga_bazowa",
                "limit_dzienny", "limit_na_godzine", "mnoznik_etapu", "mnoznik_pory", "mnoznik", "zaspokaja",
                "zuzywa", "siano_w_pasniku", "przedmiot", "przedmioty", "wejscie", "wyjscie", "ruch",
                "sygnal", "dystans_px", "budzet_dnia", "procent_czasu", "pory", "aktywnosc", "drzemki",
                "rzadkie_na_dobe", "wybor", "waluta", "nazwa", "cena", "kategoria", "ikona", "bez_limitu",
                "uzycia", "trwale", "nagroda_koniczynki", "etap_min", "co_minut", "potem", "zdrowie_max",
                "temperatura_min", "temperatura_max", "wiez", "koniczynki", "bobek", "pasnik", "swinka", "swinkacore"
            };

            foreach (string id in canonical)
            {
                polishIds.Add(id);
            }

            return polishIds;
        }

        private static string StripComments(string code)
        {
            string noBlock = Regex.Replace(code, @"/\*[\s\S]*?\*/", "");
            return Regex.Replace(noBlock, @"//.*$", "", RegexOptions.Multiline);
        }

        [Fact]
        public void NamesDocument_ContainsExpectedPolishIdentifiers()
        {
            string repoRoot = GetRepoRoot();
            var polishIds = LoadPolishIdentifiers(repoRoot);

            Assert.NotEmpty(polishIds);
            Assert.Contains("papryka", polishIds);
            Assert.Contains("siano", polishIds);
            Assert.Contains("domek", polishIds);
            Assert.Contains("granulat", polishIds);
            Assert.Contains("najedzenie", polishIds);
            Assert.Contains("potrzeby", polishIds);
        }

        [Fact]
        public void SaveSystem_ContainsLegacyPolishMigrationKeys()
        {
            string repoRoot = GetRepoRoot();
            string saveSystemPath = Path.Combine(repoRoot, "src", "Cuy.Core", "Save", "SaveSystem.cs");
            Assert.True(File.Exists(saveSystemPath), $"SaveSystem.cs not found at {saveSystemPath}");

            string code = File.ReadAllText(saveSystemPath);
            Assert.Contains("siano", code);
            Assert.Contains("papryka", code);
            Assert.Contains("granulat", code);
            Assert.Contains("Swinka", code);
        }

        [Fact]
        public void PolishIdentifiers_AppearOnlyInSaveSystem_AndNowhereElseInCoreOrApp()
        {
            string repoRoot = GetRepoRoot();
            var polishIds = LoadPolishIdentifiers(repoRoot);

            var searchDirectories = new[]
            {
                Path.Combine(repoRoot, "src", "Cuy.Core"),
                Path.Combine(repoRoot, "src", "Cuy")
            };

            var saveSystemMatches = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var violations = new List<string>();

            foreach (string dir in searchDirectories)
            {
                if (!Directory.Exists(dir))
                    continue;

                foreach (string file in Directory.EnumerateFiles(dir, "*.cs", SearchOption.AllDirectories))
                {
                    string relPath = Path.GetRelativePath(repoRoot, file).Replace('\\', '/');
                    bool isSaveSystem = relPath.Equals("src/Cuy.Core/Save/SaveSystem.cs", StringComparison.OrdinalIgnoreCase);

                    string content = File.ReadAllText(file);
                    string clean = StripComments(content);
                    clean = clean.Replace("olubiec/swinka", "");

                    foreach (string id in polishIds)
                    {
                        string pattern = $@"\b{Regex.Escape(id)}\b";
                        if (Regex.IsMatch(clean, pattern, RegexOptions.IgnoreCase))
                        {
                            if (isSaveSystem)
                            {
                                saveSystemMatches.Add(id);
                            }
                            else
                            {
                                violations.Add($"{relPath}: Polish identifier '{id}' found.");
                            }
                        }
                    }
                }
            }

            Assert.NotEmpty(saveSystemMatches);
            Assert.Contains("siano", saveSystemMatches);
            Assert.Contains("papryka", saveSystemMatches);

            Assert.True(violations.Count == 0,
                $"Found Polish identifiers outside SaveSystem.cs:{Environment.NewLine}{string.Join(Environment.NewLine, violations)}");
        }
    }
}
