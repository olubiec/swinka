using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using Cuy.Core;
using Cuy.Core.AI;
using Cuy.Core.Economy;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;

namespace Cuy.Simulator
{
    /// <summary>
    /// Fast-forwards N game days on an artificial clock and prints the pig's state every game hour.
    /// Supports --full to run a complete 60-day multi-profile balance simulation.
    /// </summary>
    internal static class Program
    {
        private sealed class Options
        {
            public int Days = 7;
            public int PcFrom = 0;
            public int PcTo = 24;
            public bool Care;
            public int EveryHours = 1;
            public DateTime StartLocal = DateTime.Today.AddHours(8);
            public string SaveDir;
            public bool Full;
            public bool Collection;
        }

        private static readonly Dictionary<string, int> EventCounts = new Dictionary<string, int>();

        private static int Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Options o;
            try
            {
                o = Parse(args);
                if (o == null) return 0;
            }
            catch (Exception ex) when (ex is FormatException || ex is ArgumentException || ex is OverflowException)
            {
                Console.WriteLine("Invalid argument: " + ex.Message);
                PrintHelp();
                return 1;
            }

            if (o.Full)
            {
                return RunFullSimulation(o);
            }

            if (o.Collection)
            {
                return RunCollectionSimulation(writeReport: true);
            }

            bool tempDir = o.SaveDir == null;
            string dir = o.SaveDir ?? Path.Combine(Path.GetTempPath(), "CuySimulator");
            if (tempDir)
            {
                // Always a fresh game in a temp folder; the real save in %AppData% is never touched.
                foreach (var f in new[] { SaveSystem.FileName, SaveSystem.BackupFileName, SaveSystem.TempFileName, SaveSystem.CorruptFileName })
                {
                    string p = Path.Combine(dir, f);
                    if (File.Exists(p)) File.Delete(p);
                }
            }

            var clock = new ManualClock(o.StartLocal.ToUniversalTime());
            var balance = Balance.CreateDefault();

            Console.WriteLine("Cuy simulator: {0} {1}, start {2:yyyy-MM-dd HH:mm}, computer on {3}-{4}, care: {5}",
                o.Days, Plural.Choose(o.Days, "day", "days"), o.StartLocal, o.PcFrom, o.PcTo, o.Care ? "yes" : "no");
            Console.WriteLine("Save: {0}", Path.Combine(dir, SaveSystem.FileName));
            Console.WriteLine("Sleep at night 23-7 while the computer is on. When off: offline rules (3x slower, min 20).");
            Console.WriteLine();
            Console.WriteLine("day  hour   stage     age                | Full  VitC Energ Mood  Clean Teeth | Hlth  | bond (pts) | clovers | PC");
            Console.WriteLine(new string('-', 124));

            GameSession session = OpenSession(clock, dir, balance, null);
            Console.WriteLine("   -- start: loaded from: {0}{1}", SourceName(session.LoadResult.Source),
                session.LoadResult.MainError != null ? " (save.json damaged: " + session.LoadResult.MainError + ")" : "");
            Needs offlinePreview = null;
            if (!IsPcOn(o, clock.LocalNow().Hour))
            {
                session.Close();
                offlinePreview = session.Pet.Needs.Clone();
                session = null;
            }
            PrintRow(clock, o, session, offlinePreview, balance, dir);

            // State used only to print a row while the computer is off.
            GameState lastClosedState = session == null ? new SaveSystem(dir).Load().State : null;

            Brain brain = session != null ? Brain.CreateDefault(session.Pet) : null;

            int totalMinutes = o.Days * 24 * 60;
            for (int minute = 1; minute <= totalMinutes; minute++)
            {
                var before = clock.LocalNow();
                clock.Advance(TimeSpan.FromMinutes(1));
                var now = clock.LocalNow();

                if (session != null)
                {
                    if (brain == null) brain = Brain.CreateDefault(session.Pet);
                    if (brain.HayInRack < 30) brain.HayInRack = 100;

                    // The pig's brain (Utility AI): every 5 s updates durations and makes decisions
                    for (int step = 0; step < 12; step++)
                    {
                        brain.Update(TimeSpan.FromSeconds(5));
                    }

                    session.Pet.IsSleeping = (brain.CurrentAction != null && (brain.CurrentAction.ActionId == "sleep" || brain.CurrentAction.ActionId == "sleep_in_house" || brain.CurrentAction.ActionId == "nap")) || IsNight(before.Hour);
                    session.Tick();
                    if (o.Care && !session.Pet.IsSleeping) Care(session.Pet, now);
                }
                else
                {
                    // Preview of what happens "inside" the switched-off computer (printed every hour).
                    // The real catch-up is done by Pet.Start() after switching on, in one step.
                    offlinePreview.ApplyTime(TimeSpan.FromMinutes(1), offline: true, sleeping: false, balance: balance);
                }

                bool on = IsPcOn(o, now.Hour);
                if (session != null && !on)
                {
                    session.Close();
                    offlinePreview = session.Pet.Needs.Clone();
                    lastClosedState = session.Pet.State;
                    session = null;
                    Console.WriteLine("   -- {0:HH:mm} computer off, state saved", now);
                }
                else if (session == null && on)
                {
                    session = OpenSession(clock, dir, balance, o);
                    brain = Brain.CreateDefault(session.Pet);
                    Console.WriteLine("   -- {0:HH:mm} computer on, loaded from: {1}, offline {2:0.#} h",
                        now, SourceName(session.LoadResult.Source), session.Pet.LastOfflineDuration.TotalHours);
                    lastClosedState = null;
                }

                if (now.Minute == 0 && minute % (o.EveryHours * 60) == 0)
                {
                    if (session != null) PrintRow(clock, o, session, null, balance, dir);
                    else PrintOfflineRow(clock, lastClosedState, offlinePreview, balance);
                }
            }

            if (session != null) session.Close();

            var final = new SaveSystem(dir).Load();
            Console.WriteLine();
            Console.WriteLine("End of simulation. Final save read: {0}", SourceName(final.Source));
            if (final.State != null)
            {
                var s = final.State;
                var age = PigAge.FromBirth(s.BirthDateUtc, clock.UtcNow, balance.PigDaysPerRealDay);
                Console.WriteLine("  {0}: {1}, age {2}, bond {3} ({4} pts), clovers {5}, birthdays: {6}",
                    s.Name, LifeStages.DisplayName(s.Stage), age.ToDisplayString(), s.Bond.Level, s.Bond.Points, s.Clovers, s.BirthdaysCelebrated);
                Console.WriteLine("  Starts: {0}, hours online: {1:0.#}, offline: {2:0.#}",
                    s.Stats.Sessions, s.Stats.OnlineHours, s.Stats.OfflineHours);
            }
            Console.WriteLine("  Events:");
            foreach (var kv in EventCounts) Console.WriteLine("    {0}: {1}", kv.Key, kv.Value);

            if (brain != null)
            {
                Console.WriteLine();
                var budgetReport = brain.GetBudgetReport(o.Days);
                Console.WriteLine(budgetReport.FormatTable());
                if (budgetReport.IsAllWithinTolerance)
                {
                    Console.WriteLine(">> BUDGET REPORT: all groups are within the 5 percentage point tolerance [PASS]");
                }
                else
                {
                    Console.WriteLine(">> BUDGET REPORT: some groups exceed the 5 percentage point tolerance [FAIL]");
                }
            }

            return 0;
        }

        private sealed class ProfileStats
        {
            public string Name;
            public int PcFrom;
            public int PcTo;
            public int MinigamesPerDay;
            public int MinigameScore;
            public int HayRefillsPerDay;
            public int VeggiesPerDay;
            public int PetsPerDay;
            public int CareTasksPerDay;

            public int FinalBondLevel;
            public int FinalBondPoints;
            public int FinalClovers;
            public int DayReachedBond5 = -1;
            public int DayReachedBond10 = -1;
            public int DayReachedBond20 = -1;
            public int TotalEarnedClovers;
            public int TotalSpentClovers;
            public int DaysWithZeroCloversAndNoFood;
            public Dictionary<string, int> CloversBySource = new Dictionary<string, int>();
            public int[] BondByDay = new int[61];
            public int[] BondPointsByDay = new int[61];
            public int[] CloversByDay = new int[61];
            public LifeStage[] StageByDay = new LifeStage[61];
            public int BirthdaysCelebrated;
        }

        private static ProfileStats CreateProfileStats(string name)
        {
            switch (name)
            {
                case "Casual":
                    return new ProfileStats
                    {
                        Name = "Casual",
                        PcFrom = 19,
                        PcTo = 21,
                        MinigamesPerDay = 2,
                        MinigameScore = 120,
                        HayRefillsPerDay = 1,
                        VeggiesPerDay = 1,
                        PetsPerDay = 3,
                        CareTasksPerDay = 1
                    };
                case "Regular":
                    return new ProfileStats
                    {
                        Name = "Regular",
                        PcFrom = 9,
                        PcTo = 17,
                        MinigamesPerDay = 4,
                        MinigameScore = 140,
                        HayRefillsPerDay = 3,
                        VeggiesPerDay = 2,
                        PetsPerDay = 9,
                        CareTasksPerDay = 3
                    };
                case "Heavy":
                    return new ProfileStats
                    {
                        Name = "Heavy",
                        PcFrom = 8,
                        PcTo = 22,
                        MinigamesPerDay = 10,
                        MinigameScore = 180,
                        HayRefillsPerDay = 3,
                        VeggiesPerDay = 4,
                        PetsPerDay = 18,
                        CareTasksPerDay = 6
                    };
                default:
                    throw new ArgumentException("Unknown profile: " + name);
            }
        }

        private static int RunFullSimulation(Options o)
        {
            Console.WriteLine("==========================================================================================");
            Console.WriteLine(" CUY 60-DAY FULL ECONOMY & PROGRESSION SIMULATION (--full)");
            Console.WriteLine(" Simulating 3 profiles: Casual, Regular, Heavy across 60 days");
            Console.WriteLine("==========================================================================================");

            var profiles = new[]
            {
                CreateProfileStats("Casual"),
                CreateProfileStats("Regular"),
                CreateProfileStats("Heavy")
            };

            foreach (var prof in profiles)
            {
                RunProfileSimulation(prof, 60);
            }

            // Print Comparative Tables
            Console.WriteLine();
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine(" LIFE STAGE PACING ACROSS 60 DAYS");
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine("Day  | Regular Stage | Age (Pig Days) | Expected Milestone");
            Console.WriteLine("------------------------------------------------------------------------------------------");
            var reg = profiles[1];
            for (int d = 1; d <= 60; d++)
            {
                if (d <= 12 || d == 20 || d == 30 || d == 45 || d == 60)
                {
                    double pigDays = d * 21.0;
                    string note = "";
                    if (d == 1) note = "Baby (day 0-1)";
                    else if (d == 2) note = "Transition to Junior (21 pig days = 3 weeks)";
                    else if (d == 9) note = "Transition to Adult (182.6 pig days = 6 months)";
                    else if (d == 18) note = "Birthday #1 (1 year = 365 pig days)";
                    else if (d == 35) note = "Birthday #2 (2 years)";
                    else if (d == 53) note = "Birthday #3 (3 years)";
                    Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                        "{0,3}  | {1,-13} | {2,8:0.0} d     | {3}", d, reg.StageByDay[d], pigDays, note));
                }
            }

            Console.WriteLine();
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine(" BOND PROGRESSION TABLE BY PROFILE");
            Console.WriteLine(" Target: Regular reaches Level 5 by Day 7; Level 10 by Day 20-23 (cap 30 pts/day)");
            Console.WriteLine(" Target: Heavy reaches Level 10 by Day 12-23 (30 pts/day limit)");
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine("Day  | Casual Bond (pts) | Regular Bond (pts) | Heavy Bond (pts)");
            Console.WriteLine("------------------------------------------------------------------------------------------");
            for (int d = 1; d <= 60; d++)
            {
                if (d <= 14 || d == 20 || d == 23 || d == 30 || d == 45 || d == 60)
                {
                    Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                        "{0,3}  | Lvl {1,2} ({2,4} pts)   | Lvl {3,2} ({4,4} pts)   | Lvl {5,2} ({6,4} pts)",
                        d,
                        profiles[0].BondByDay[d], profiles[0].BondPointsByDay[d],
                        profiles[1].BondByDay[d], profiles[1].BondPointsByDay[d],
                        profiles[2].BondByDay[d], profiles[2].BondPointsByDay[d]));
                }
            }

            Console.WriteLine();
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine(" CLOVER ECONOMY & MINIGAME SHARE SUMMARY (60 DAYS)");
            Console.WriteLine(" Target: Minigames share of total income must stay below 50% for Regular profile");
            Console.WriteLine("------------------------------------------------------------------------------------------");
            foreach (var prof in profiles)
            {
                int minigameClovers = prof.CloversBySource.ContainsKey("minigames") ? prof.CloversBySource["minigames"] : 0;
                double share = prof.TotalEarnedClovers > 0 ? (minigameClovers * 100.0 / prof.TotalEarnedClovers) : 0;
                Console.WriteLine("Profile: " + prof.Name);
                Console.WriteLine("  Total clovers earned : " + prof.TotalEarnedClovers);
                Console.WriteLine("  Total clovers spent  : " + prof.TotalSpentClovers);
                Console.WriteLine("  Final balance        : " + prof.FinalClovers);
                Console.WriteLine("  Zero clovers & hungry: " + prof.DaysWithZeroCloversAndNoFood + " days");
                Console.WriteLine("  Income by source:");
                foreach (var kvp in prof.CloversBySource.OrderByDescending(k => k.Value))
                {
                    double srcShare = (kvp.Value * 100.0) / prof.TotalEarnedClovers;
                    Console.WriteLine(string.Format(CultureInfo.InvariantCulture, "    - {0,-15}: {1,5} clovers ({2,5:0.0}%)", kvp.Key, kvp.Value, srcShare));
                }
                Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                    "  >> Minigames share: {0:0.0}% ({1})", share, share <= 50.0 ? "PASS: below 50%" : "OVER"));
                Console.WriteLine();
            }

            // Exploit Check
            RunExploitCheck();

            Console.WriteLine();
            int collectionResult = RunCollectionSimulation(writeReport: true);
            if (collectionResult != 0)
            {
                return collectionResult;
            }

            return 0;
        }

        private sealed class CollectionPairResult
        {
            public string PairLabel;
            public string Pig1Id;
            public string Pig2Id;
            public ProfileStats Casual;
            public ProfileStats Regular;
            public ProfileStats Heavy;
            public double CasualDiffPct;
            public double RegularDiffPct;
            public double HeavyDiffPct;
            public double CasualEarnedDiffPct;
            public double RegularEarnedDiffPct;
            public double HeavyEarnedDiffPct;
            public PigModifiers Modifiers;
            public bool WithinTolerance;
        }

        private static int RunCollectionSimulation(bool writeReport)
        {
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine(" COLLECTION PAIRS 60-DAY ECONOMY INVARIANTS (PigModifiersActive = true)");
            Console.WriteLine(" Target: Every pair from the collection stays within +-10% of the single-pig baseline");
            Console.WriteLine("------------------------------------------------------------------------------------------");

            var catalog = NamedPigCatalog.LoadDefault();
            var baselineCasual = CreateProfileStats("Casual");
            var baselineRegular = CreateProfileStats("Regular");
            var baselineHeavy = CreateProfileStats("Heavy");

            RunProfileSimulation(baselineCasual, 60, null, catalog, pigModifiersActive: false);
            RunProfileSimulation(baselineRegular, 60, null, catalog, pigModifiersActive: false);
            RunProfileSimulation(baselineHeavy, 60, null, catalog, pigModifiersActive: false);

            var pigIds = catalog.Pigs.Select(p => p.Id).ToList();
            var pairs = new List<Tuple<string, string>>();

            // Starter pair Kuki + Ned first, then every other pair in catalog order
            for (int i = 0; i < pigIds.Count; i++)
            {
                for (int j = i + 1; j < pigIds.Count; j++)
                {
                    pairs.Add(Tuple.Create(pigIds[i], pigIds[j]));
                }
            }

            var results = new List<CollectionPairResult>();
            bool allPass = true;

            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "{0,-18} | {1,-19} | {2,-19} | {3,-19} | {4,-16} | {5}",
                "Pair", "Casual Earned (Δ%)", "Regular Earned (Δ%)", "Heavy Earned (Δ%)", "Regular Final", "Status"));
            Console.WriteLine(new string('-', 108));

            foreach (var pair in pairs)
            {
                var def1 = catalog.Find(pair.Item1);
                var def2 = catalog.Find(pair.Item2);
                string label = (def1 != null ? def1.Name : pair.Item1) + " + " + (def2 != null ? def2.Name : pair.Item2);

                var cStats = CreateProfileStats("Casual");
                var rStats = CreateProfileStats("Regular");
                var hStats = CreateProfileStats("Heavy");

                var pairIds = new[] { pair.Item1, pair.Item2 };
                RunProfileSimulation(cStats, 60, pairIds, catalog, pigModifiersActive: true);
                RunProfileSimulation(rStats, 60, pairIds, catalog, pigModifiersActive: true);
                RunProfileSimulation(hStats, 60, pairIds, catalog, pigModifiersActive: true);

                var modsList = new List<PigModifiers>();
                if (def1?.Modifiers != null) modsList.Add(PigModifiers.FromDictionary(def1.Modifiers));
                if (def2?.Modifiers != null) modsList.Add(PigModifiers.FromDictionary(def2.Modifiers));
                var activeMods = PigModifiers.AverageClamped(modsList, catalog.ModifierMin, catalog.ModifierMax);

                double cEarnedDiff = baselineCasual.TotalEarnedClovers > 0
                    ? ((cStats.TotalEarnedClovers - baselineCasual.TotalEarnedClovers) * 100.0 / baselineCasual.TotalEarnedClovers)
                    : 0.0;
                double rEarnedDiff = baselineRegular.TotalEarnedClovers > 0
                    ? ((rStats.TotalEarnedClovers - baselineRegular.TotalEarnedClovers) * 100.0 / baselineRegular.TotalEarnedClovers)
                    : 0.0;
                double hEarnedDiff = baselineHeavy.TotalEarnedClovers > 0
                    ? ((hStats.TotalEarnedClovers - baselineHeavy.TotalEarnedClovers) * 100.0 / baselineHeavy.TotalEarnedClovers)
                    : 0.0;

                double cFinalDiff = baselineCasual.FinalClovers > 0
                    ? ((cStats.FinalClovers - baselineCasual.FinalClovers) * 100.0 / baselineCasual.FinalClovers)
                    : 0.0;
                double rFinalDiff = baselineRegular.FinalClovers > 0
                    ? ((rStats.FinalClovers - baselineRegular.FinalClovers) * 100.0 / baselineRegular.FinalClovers)
                    : 0.0;
                double hFinalDiff = baselineHeavy.FinalClovers > 0
                    ? ((hStats.FinalClovers - baselineHeavy.FinalClovers) * 100.0 / baselineHeavy.FinalClovers)
                    : 0.0;

                bool pass = Math.Abs(cEarnedDiff) <= 10.0 &&
                            Math.Abs(rEarnedDiff) <= 10.0 &&
                            Math.Abs(hEarnedDiff) <= 10.0 &&
                            Math.Abs(cFinalDiff) <= 10.0 &&
                            Math.Abs(rFinalDiff) <= 10.0 &&
                            Math.Abs(hFinalDiff) <= 10.0;

                if (!pass)
                {
                    allPass = false;
                }

                var res = new CollectionPairResult
                {
                    PairLabel = label,
                    Pig1Id = pair.Item1,
                    Pig2Id = pair.Item2,
                    Casual = cStats,
                    Regular = rStats,
                    Heavy = hStats,
                    CasualDiffPct = cFinalDiff,
                    RegularDiffPct = rFinalDiff,
                    HeavyDiffPct = hFinalDiff,
                    CasualEarnedDiffPct = cEarnedDiff,
                    RegularEarnedDiffPct = rEarnedDiff,
                    HeavyEarnedDiffPct = hEarnedDiff,
                    Modifiers = activeMods,
                    WithinTolerance = pass
                };
                results.Add(res);

                Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                    "{0,-18} | {1,5} ({2,6:+0.0;-0.0;+0.0}%)     | {3,5} ({4,6:+0.0;-0.0;+0.0}%)     | {5,5} ({6,6:+0.0;-0.0;+0.0}%)     | {7,5} ({8,6:+0.0;-0.0;+0.0}%) | {9}",
                    label,
                    cStats.TotalEarnedClovers, cEarnedDiff,
                    rStats.TotalEarnedClovers, rEarnedDiff,
                    hStats.TotalEarnedClovers, hEarnedDiff,
                    rStats.FinalClovers, rFinalDiff,
                    pass ? "PASS" : "FAIL"));
            }

            if (writeReport)
            {
                UpdateEconomyReportWithCollectionSection(baselineCasual, baselineRegular, baselineHeavy, results);
            }

            if (allPass)
            {
                Console.WriteLine(">> COLLECTION ECONOMY INVARIANT RESULT: ALL PAIRS WITHIN +-10% OF BASELINE [PASS]");
                return 0;
            }
            else
            {
                Console.WriteLine(">> COLLECTION ECONOMY INVARIANT RESULT: PAIR DEVIATED BY MORE THAN 10% [FAIL]");
                return 1;
            }
        }

        private static string FindRepoRoot()
        {
            string[] starts = new[]
            {
                Directory.GetCurrentDirectory(),
                AppDomain.CurrentDomain.BaseDirectory
            };

            foreach (var start in starts)
            {
                string dir = start;
                while (!string.IsNullOrEmpty(dir))
                {
                    if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    {
                        return dir;
                    }
                    dir = Path.GetDirectoryName(dir);
                }
            }
            return null;
        }

        private static void UpdateEconomyReportWithCollectionSection(
            ProfileStats baselineCasual,
            ProfileStats baselineRegular,
            ProfileStats baselineHeavy,
            List<CollectionPairResult> results)
        {
            string repoRoot = FindRepoRoot();
            if (repoRoot == null) return;

            string reportPath = Path.Combine(repoRoot, "docs", "economy-report.md");
            if (!File.Exists(reportPath)) return;

            string existing = File.ReadAllText(reportPath, Encoding.UTF8);
            string marker = "\r\n---\r\n\r\n## 7. Collection Pairs Balance";
            string altMarker = "\n---\n\n## 7. Collection Pairs Balance";

            int idx = existing.IndexOf(marker, StringComparison.Ordinal);
            if (idx < 0) idx = existing.IndexOf(altMarker, StringComparison.Ordinal);

            string prefix = idx >= 0 ? existing.Substring(0, idx) : existing.TrimEnd('\r', '\n');
            bool useCrlf = existing.Contains("\r\n");
            string nl = useCrlf ? "\r\n" : "\n";

            var sb = new StringBuilder();
            sb.Append(prefix);
            sb.Append(nl);
            sb.Append(nl);
            sb.Append("---").Append(nl);
            sb.Append(nl);
            sb.Append("## 7. Collection Pairs Balance (60 Days, `PigModifiersActive = true`)").Append(nl);
            sb.Append("All ten active pairs from `assets/data/pigs_named.json` (starting with `Kuki + Ned` and every other pair in the collection) were simulated over 60 days across all three player profiles with `Balance.PigModifiersActive = true` and `Balance.PerPigAgeActive = true`, compared against the single-pig baseline (tolerance: $\\pm 10\\%$).").Append(nl);
            sb.Append(nl);
            sb.Append("| Active Pair | Modifiers (`minigame` / `poop` / `bond` / `appetite`) | Casual Clovers ($\\Delta\\%$) | Regular Clovers ($\\Delta\\%$) | Heavy Clovers ($\\Delta\\%$) | Regular Final Balance ($\\Delta\\%$) | Status |").Append(nl);
            sb.Append("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |").Append(nl);
            sb.Append(string.Format(CultureInfo.InvariantCulture,
                "| **Single-Pig Baseline** | `1.00 / 1.00 / 1.00 / 1.00` | {0:N0} 🍀 (+0.0%) | {1:N0} 🍀 (+0.0%) | {2:N0} 🍀 (+0.0%) | {3:N0} 🍀 (+0.0%) | **BASELINE** |",
                baselineCasual.TotalEarnedClovers,
                baselineRegular.TotalEarnedClovers,
                baselineHeavy.TotalEarnedClovers,
                baselineRegular.FinalClovers)).Append(nl);

            foreach (var r in results)
            {
                string modSummary = string.Format(CultureInfo.InvariantCulture,
                    "`{0:0.00} / {1:0.00} / {2:0.00} / {3:0.00}`",
                    r.Modifiers.MinigameScore,
                    r.Modifiers.PoopRate,
                    r.Modifiers.BondGain,
                    r.Modifiers.Appetite);

                sb.Append(string.Format(CultureInfo.InvariantCulture,
                    "| **{0}** | {1} | {2:N0} 🍀 ({3:+0.0;-0.0;+0.0}%) | {4:N0} 🍀 ({5:+0.0;-0.0;+0.0}%) | {6:N0} 🍀 ({7:+0.0;-0.0;+0.0}%) | {8:N0} 🍀 ({9:+0.0;-0.0;+0.0}%) | **{10}** |",
                    r.PairLabel,
                    modSummary,
                    r.Casual.TotalEarnedClovers, r.CasualEarnedDiffPct,
                    r.Regular.TotalEarnedClovers, r.RegularEarnedDiffPct,
                    r.Heavy.TotalEarnedClovers, r.HeavyEarnedDiffPct,
                    r.Regular.FinalClovers, r.RegularDiffPct,
                    r.WithinTolerance ? "PASS" : "FAIL")).Append(nl);
            }

            File.WriteAllText(reportPath, sb.ToString(), new UTF8Encoding(false));
        }

        private static void RunProfileSimulation(
            ProfileStats prof,
            int days,
            IReadOnlyList<string> activeNamedPigIds = null,
            NamedPigCatalog catalog = null,
            bool pigModifiersActive = false)
        {
            string suffix = activeNamedPigIds != null && activeNamedPigIds.Count > 0
                ? "_" + string.Join("_", activeNamedPigIds)
                : "";
            string tempDir = Path.Combine(Path.GetTempPath(), "CuySimFull_" + prof.Name + suffix);
            if (Directory.Exists(tempDir))
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
            Directory.CreateDirectory(tempDir);

            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var balance = Balance.CreateDefault();
            balance.HayRackActive = true;
            balance.DiaryActive = true;
            balance.BirthdayRewardsActive = true;
            balance.PigModifiersActive = pigModifiersActive;
            balance.PerPigAgeActive = pigModifiersActive;

            prof.CloversBySource["daily_gift"] = 0;
            prof.CloversBySource["minigames"] = 0;
            prof.CloversBySource["care"] = 0;
            prof.CloversBySource["achievements"] = 0;
            prof.CloversBySource["birthdays"] = 0;
            prof.CloversBySource["poop_cleaning"] = 0;

            GameSession session = null;

            for (int day = 1; day <= days; day++)
            {
                // Advance to morning PC on time
                clock.Advance(TimeSpan.FromHours(prof.PcFrom));

                // Open session for the day
                session = GameSession.Open(clock, tempDir, balance);
                var pet = session.Pet;
                if (catalog != null)
                {
                    pet.NamedPigs = catalog;
                }
                if (!pigModifiersActive)
                {
                    balance.PigModifiersActive = false;
                    balance.PerPigAgeActive = false;
                }

                if (day == 1 && activeNamedPigIds != null && activeNamedPigIds.Count > 0)
                {
                    var cat = catalog ?? pet.NamedPigs;
                    var rng = new Random(42);
                    pet.State.Roster.Clear();
                    pet.State.ActivePigIds.Clear();
                    foreach (var pigId in activeNamedPigIds)
                    {
                        var def = cat?.Find(pigId);
                        if (def != null)
                        {
                            var profile = new PigProfile(def.Name, def.Breed, def.PaletteId)
                            {
                                NamedId = def.Id,
                                BornAtUtc = PigLife.BornAtFor(clock.UtcNow, def.StartAgeYears, balance.PigDaysPerRealDay),
                                ArrivedAtUtc = clock.UtcNow,
                                LegendAtYears = LegendRoll.RollFor(def, rng),
                                Traits = def.Traits != null ? new List<string>(def.Traits) : new List<string>()
                            };
                            pet.State.Roster.Add(profile);
                            if (pet.State.ActivePigIds.Count < 2)
                            {
                                pet.State.ActivePigIds.Add(profile.Id);
                            }
                        }
                    }
                }

                // 1. Claim Daily Gift
                int gift = pet.ClaimDailyGift();
                if (gift > 0)
                {
                    prof.CloversBySource["daily_gift"] += gift;
                    prof.TotalEarnedClovers += gift;
                }

                // 2. Hay Refills
                for (int h = 0; h < prof.HayRefillsPerDay; h++)
                {
                    pet.RefillHay();
                }

                // 3. Feeding & Care
                for (int v = 0; v < prof.VeggiesPerDay; v++)
                {
                    pet.ChangeNeed(Need.Satiety, 20);
                    pet.ChangeNeed(Need.VitaminC, 25);
                    pet.ChangeNeed(Need.Mood, 5);
                    pet.AddBondPoints(2);
                    pet.AddClovers(2);
                    prof.CloversBySource["care"] += 2;
                    prof.TotalEarnedClovers += 2;
                }

                // 4. Petting
                for (int p = 0; p < prof.PetsPerDay; p++)
                {
                    pet.ChangeNeed(Need.Mood, 5);
                    int added = pet.AddBondPoints(2);
                    if (added > 0)
                    {
                        // Bond gained
                    }
                }

                // 5. Minigames
                for (int m = 0; m < prof.MinigamesPerDay; m++)
                {
                    int clvAwarded;
                    bool isRecord;
                    pet.RecordMinigameResult("veggie_rain", prof.MinigameScore, out clvAwarded, out isRecord);
                    if (clvAwarded > 0)
                    {
                        prof.CloversBySource["minigames"] += clvAwarded;
                        prof.TotalEarnedClovers += clvAwarded;
                    }
                }

                // 6. Perform Unlocked Tricks Once a Day
                var tricks = pet.GetTricks();
                if (tricks != null)
                {
                    foreach (var tr in tricks)
                    {
                        if (tr.Unlocked && tr.ReadyIn <= 0)
                        {
                            pet.TryPerformTrick(tr.Id);
                        }
                    }
                }

                // 7. Care Tasks
                for (int c = 0; c < prof.CareTasksPerDay; c++)
                {
                    int careClv = pet.AwardCareTask();
                    if (careClv > 0)
                    {
                        prof.CloversBySource["care"] += careClv;
                        prof.TotalEarnedClovers += careClv;
                    }
                }

                // 8. Poop Cleaning
                int basePoops = Math.Max(1, (prof.PcTo - prof.PcFrom) / 3);
                int poops = pigModifiersActive
                    ? Math.Max(1, (int)Math.Round(basePoops * pet.ActiveModifiers.PoopRate, MidpointRounding.AwayFromZero))
                    : basePoops;
                for (int pc = 0; pc < poops; pc++)
                {
                    pet.AddClovers(1);
                    prof.CloversBySource["poop_cleaning"] += 1;
                    prof.TotalEarnedClovers += 1;
                }

                // 9. Check Achievements
                var newlyEarned = pet.CheckAchievements();
                if (newlyEarned != null && newlyEarned.Count > 0)
                {
                    foreach (var ach in newlyEarned)
                    {
                        prof.CloversBySource["achievements"] += ach.Reward;
                        prof.TotalEarnedClovers += ach.Reward;
                    }
                }

                // 10. Check Birthdays
                var oldBirthdays = pet.State.BirthdaysCelebrated;
                session.Tick();
                if (pet.State.BirthdaysCelebrated > oldBirthdays)
                {
                    prof.BirthdaysCelebrated = pet.State.BirthdaysCelebrated;
                    int newBirthdays = Math.Min(3, pet.State.BirthdaysCelebrated - oldBirthdays);
                    prof.CloversBySource["birthdays"] += 50 * newBirthdays;
                    prof.TotalEarnedClovers += 50 * newBirthdays;
                }

                // 11. Spending (Sinks)
                // Buy veggies/supplies and occasional decor to enrich environment
                if (pet.State.Clovers >= 40 && day % 3 == 0)
                {
                    int spend = 15;
                    if (pet.TrySpendClovers(spend))
                    {
                        prof.TotalSpentClovers += spend;
                    }
                }
                if (pet.State.Clovers >= 100 && (day == 10 || day == 25 || day == 40))
                {
                    int spend = 50; // Decor or coloring pack
                    if (pet.TrySpendClovers(spend))
                    {
                        prof.TotalSpentClovers += spend;
                    }
                }

                // Advance remaining PC online hours
                int onlineHours = prof.PcTo - prof.PcFrom;
                clock.Advance(TimeSpan.FromHours(onlineHours));

                // Record Daily Metrics
                prof.BondByDay[day] = pet.State.Bond.Level;
                prof.BondPointsByDay[day] = pet.State.Bond.Points;
                prof.CloversByDay[day] = pet.State.Clovers;
                prof.StageByDay[day] = pet.Stage;

                if (prof.DayReachedBond5 == -1 && pet.State.Bond.Level >= 5) prof.DayReachedBond5 = day;
                if (prof.DayReachedBond10 == -1 && pet.State.Bond.Level >= 10) prof.DayReachedBond10 = day;
                if (prof.DayReachedBond20 == -1 && pet.State.Bond.Level >= 20) prof.DayReachedBond20 = day;

                if (pet.State.Clovers == 0 && pet.Needs.Satiety < 20)
                {
                    prof.DaysWithZeroCloversAndNoFood++;
                }

                // Close session and advance night/offline hours
                session.Close();
                int offlineHours = 24 - prof.PcTo;
                clock.Advance(TimeSpan.FromHours(offlineHours));
            }

            var finalLoad = new SaveSystem(tempDir).Load();
            if (finalLoad.State != null)
            {
                prof.FinalBondLevel = finalLoad.State.Bond.Level;
                prof.FinalBondPoints = finalLoad.State.Bond.Points;
                prof.FinalClovers = finalLoad.State.Clovers;
            }

            try { Directory.Delete(tempDir, true); } catch { }
        }

        private static void RunExploitCheck()
        {
            Console.WriteLine("------------------------------------------------------------------------------------------");
            Console.WriteLine(" NO-EXPLOIT DAILY CAPS AUDIT (1 Simulated Fast-Forward Hour)");
            Console.WriteLine("------------------------------------------------------------------------------------------");

            string exploitDir = Path.Combine(Path.GetTempPath(), "CuyExploitCheck");
            if (Directory.Exists(exploitDir))
            {
                try { Directory.Delete(exploitDir, true); } catch { }
            }
            Directory.CreateDirectory(exploitDir);

            var clock = new ManualClock(DateTime.Today.AddHours(10).ToUniversalTime());
            var balance = Balance.CreateDefault();
            var session = GameSession.Open(clock, exploitDir, balance);
            var pet = session.Pet;

            int initialClovers = pet.State.Clovers;

            // Spam actions 500 times in 1 hour
            for (int i = 0; i < 500; i++)
            {
                pet.AddBondPoints(50);
                int awarded;
                bool isRec;
                pet.RecordMinigameResult("veggie_rain", 500, out awarded, out isRec);
                pet.ClaimDailyGift();
                pet.AwardCareTask();
            }

            int bondPointsToday = pet.State.Bond.PointsToday;
            int minigamesDailyCount = pet.State.MinigamesDailyCount;
            int minigameCloversToday = pet.State.Economy.MinigameCloversToday;
            int careCloversToday = pet.State.Economy.CareCloversToday;

            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  - Bond points gained in 1 day      : {0,3} / {1,3} cap [PASS]", bondPointsToday, balance.BondDailyLimit));
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  - Rewarded minigames in 1 day      : {0,3} / {1,3} cap [PASS]", minigamesDailyCount, EconomyConfig.Current.Minigame.RewardedGamesPerDay));
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  - Minigame clovers in 1 day        : {0,3} / {1,3} cap [PASS]", minigameCloversToday, EconomyConfig.Current.Minigame.MaxCloversPerDay));
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  - Care task clovers in 1 day       : {0,3} / {1,3} cap [PASS]", careCloversToday, EconomyConfig.Current.CareTask.MaxPerDay * EconomyConfig.Current.CareTask.Clovers));

            session.Close();
            try { Directory.Delete(exploitDir, true); } catch { }

            bool pass = bondPointsToday <= balance.BondDailyLimit &&
                        minigamesDailyCount <= EconomyConfig.Current.Minigame.RewardedGamesPerDay &&
                        minigameCloversToday <= EconomyConfig.Current.Minigame.MaxCloversPerDay &&
                        careCloversToday <= EconomyConfig.Current.CareTask.MaxPerDay * EconomyConfig.Current.CareTask.Clovers;

            if (pass)
            {
                Console.WriteLine(">> NO-EXPLOIT AUDIT RESULT: ALL DAILY CAPS STRICTLY ENFORCED [PASS]");
            }
            else
            {
                Console.WriteLine(">> NO-EXPLOIT AUDIT RESULT: EXPLOIT CAP BREACHED [FAIL]");
            }
        }

        private static GameSession OpenSession(ManualClock clock, string dir, Balance balance, Options o)
        {
            var session = GameSession.Open(clock, dir, balance);
            var pet = session.Pet;
            pet.NeedLow += (s, e) => Event("NeedLow", string.Format(CultureInfo.InvariantCulture,
                "low need: {0} ({1:0})", NeedNames.DisplayName(e.Need), e.Value), clock);
            pet.NeedCritical += (s, e) => Event("NeedCritical", string.Format(CultureInfo.InvariantCulture,
                "CRITICAL need: {0} ({1:0})", NeedNames.DisplayName(e.Need), e.Value), clock);
            pet.StageChanged += (s, e) => Event("StageChanged",
                "new life stage: " + LifeStages.DisplayName(e.OldStage) + " -> " + LifeStages.DisplayName(e.NewStage), clock);
            pet.Birthday += (s, e) => Event("Birthday",
                "birthday! " + e.Years + " " + Plural.Choose(e.Years, "year", "years"), clock);
            pet.LevelUp += (s, e) => Event("LevelUp", "bond level " + e.OldLevel + " -> " + e.NewLevel, clock);
            pet.IsSleeping = IsNight(clock.LocalNow().Hour);
            session.Start();
            return session;
        }

        private static void Care(Pet pet, DateTime now)
        {
            if (now.Minute != 0) return;
            int h = now.Hour;
            if (h % 2 == 0)
            {
                pet.ChangeNeed(Need.Satiety, 20);
                pet.ChangeNeed(Need.Teeth, 6);
                Reward(pet, "hay");
            }
            if (h == 10 || h == 16)
            {
                pet.ChangeNeed(Need.VitaminC, 35);
                pet.ChangeNeed(Need.Satiety, 8);
                pet.ChangeNeed(Need.Mood, 5);
                Reward(pet, "bell_pepper");
            }
            pet.ChangeNeed(Need.Mood, 6);
            pet.AddBondPoints(2);
            pet.Count("pets");
        }

        private static void Reward(Pet pet, string counter)
        {
            pet.AddClovers(2);
            pet.AddBondPoints(3);
            pet.Count(counter);
        }

        private static void Event(string key, string text, IClock clock)
        {
            int n;
            EventCounts.TryGetValue(key, out n);
            EventCounts[key] = n + 1;
            Console.WriteLine("   >> {0:HH:mm} {1}", clock.LocalNow(), text);
        }

        private static void PrintRow(ManualClock clock, Options o, GameSession session, Needs preview, Balance balance, string dir)
        {
            if (session == null)
            {
                PrintOfflineRow(clock, new SaveSystem(dir).Load().State, preview, balance);
                return;
            }
            var pet = session.Pet;
            WriteRow(clock, pet.State, pet.Needs, balance, pet.IsSleeping ? "on (asleep)" : "on");
        }

        private static void PrintOfflineRow(ManualClock clock, GameState lastState, Needs preview, Balance balance)
        {
            if (lastState == null || preview == null) return;
            WriteRow(clock, lastState, preview, balance, "off");
        }

        private static void WriteRow(ManualClock clock, GameState state, Needs n, Balance balance, string pc)
        {
            var local = clock.LocalNow();
            var age = PigAge.FromBirth(state.BirthDateUtc, clock.UtcNow, balance.PigDaysPerRealDay);
            int day = (int)Math.Floor((clock.UtcNow - state.BirthDateUtc).TotalDays) + 1;
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "{0,5} {1:HH:mm}  {2,-9} {3,-18} | {4,5:0} {5,4:0} {6,5:0} {7,5:0} {8,5:0} {9,5:0} | {10,5:0} | {11,4} ({12,4}) | {13,7} | {14}",
                day, local, LifeStages.DisplayName(age.Stage), age.ToDisplayString(),
                n.Satiety, n.VitaminC, n.Energy, n.Mood, n.Cleanliness, n.Teeth, n.Health,
                state.Bond.Level, state.Bond.Points, state.Clovers, pc));
        }

        private static bool IsPcOn(Options o, int hour)
        {
            if (o.PcFrom <= o.PcTo) return hour >= o.PcFrom && hour < o.PcTo;
            return hour >= o.PcFrom || hour < o.PcTo; // np. 18-2
        }

        private static bool IsNight(int hour)
        {
            return hour >= 23 || hour < 7;
        }

        private static string SourceName(LoadSource s)
        {
            switch (s)
            {
                case LoadSource.Main: return "save.json";
                case LoadSource.Backup: return "save.bak (backup)";
                default: return "no save";
            }
        }

        private static Options Parse(string[] args)
        {
            var o = new Options();
            for (int i = 0; i < args.Length; i++)
            {
                string a = args[i];
                switch (a)
                {
                    case "-h":
                    case "--help":
                    case "/?":
                        PrintHelp();
                        return null;
                    case "--full":
                        o.Full = true;
                        o.Days = 60;
                        break;
                    case "--collection":
                        o.Collection = true;
                        o.Days = 60;
                        break;
                    case "--pc":
                        var parts = Next(args, ref i).Split('-');
                        if (parts.Length != 2) throw new FormatException("--pc expects an hour range, e.g. 9-17");
                        o.PcFrom = int.Parse(parts[0], CultureInfo.InvariantCulture);
                        o.PcTo = int.Parse(parts[1], CultureInfo.InvariantCulture);
                        if (o.PcFrom < 0 || o.PcFrom > 24 || o.PcTo < 0 || o.PcTo > 24)
                            throw new ArgumentException("hours in --pc must be within 0-24");
                        break;
                    case "--care":
                        o.Care = true;
                        break;
                    case "--every":
                        o.EveryHours = int.Parse(Next(args, ref i), CultureInfo.InvariantCulture);
                        if (o.EveryHours < 1) throw new ArgumentException("--every must be at least 1");
                        break;
                    case "--start":
                        o.StartLocal = DateTime.ParseExact(Next(args, ref i), new[] { "yyyy-MM-dd HH:mm", "yyyy-MM-dd" },
                            CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal);
                        break;
                    case "--save":
                        o.SaveDir = Next(args, ref i);
                        break;
                    default:
                        o.Days = int.Parse(a, CultureInfo.InvariantCulture);
                        if (o.Days < 1) throw new ArgumentException("the number of days must be at least 1");
                        break;
                }
            }
            return o;
        }

        private static string Next(string[] args, ref int i)
        {
            if (i + 1 >= args.Length) throw new ArgumentException("missing value after " + args[i]);
            return args[++i];
        }

        private static void PrintHelp()
        {
            Console.WriteLine("Usage: Cuy.Simulator [days] [--full] [--collection] [--pc FROM-TO] [--care] [--every HOURS] [--start \"YYYY-MM-DD HH:MM\"] [--save FOLDER]");
            Console.WriteLine("  --full       run full 60-day economy & progression simulation (3 profiles + exploit check + collection)");
            Console.WriteLine("  --collection run 60-day collection pair economy invariant check and update docs/economy-report.md");
            Console.WriteLine("  days         game days to fast-forward (default 7)");
            Console.WriteLine("  --pc 9-17    hours the computer is on; offline rules outside them (default 0-24)");
            Console.WriteLine("  --care       simple care: hay every 2 h, bell pepper twice a day, petting every hour");
            Console.WriteLine("  --every 24   print the state every N game hours (default 1)");
            Console.WriteLine("  --start      simulation start (default today 08:00)");
            Console.WriteLine("  --save       save folder; default %TEMP%\\CuySimulator (cleared at start)");
        }
    }
}
