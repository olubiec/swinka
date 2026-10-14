using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using Cuy.Core;
using Cuy.Core.AI;
using Cuy.Core.Save;
using Cuy.Core.Time;

namespace Cuy.Simulator
{
    /// <summary>
    /// Fast-forwards N game days on an artificial clock and prints the pig's state every game hour.
    /// Uses the real SaveSystem (in a temp folder), so when the "computer" is switched off
    /// the state is saved and loaded exactly as in the app.
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

        /// <summary>
        /// Simplified care for the simulation (real feeding lives in the app).
        /// Hay every 2 h, bell pepper twice a day, petting every hour.
        /// </summary>
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
            Console.WriteLine("Usage: Cuy.Simulator [days] [--pc FROM-TO] [--care] [--every HOURS] [--start \"YYYY-MM-DD HH:MM\"] [--save FOLDER]");
            Console.WriteLine("  days       game days to fast-forward (default 7)");
            Console.WriteLine("  --pc 9-17  hours the computer is on; offline rules outside them (default 0-24)");
            Console.WriteLine("  --care     simple care: hay every 2 h, bell pepper twice a day, petting every hour");
            Console.WriteLine("  --every 24 print the state every N game hours (default 1)");
            Console.WriteLine("  --start    simulation start (default today 08:00)");
            Console.WriteLine("  --save     save folder; default %TEMP%\\CuySimulator (cleared at start)");
        }
    }
}
