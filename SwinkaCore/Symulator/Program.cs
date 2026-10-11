using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using SwinkaCore;
using SwinkaCore.AI;
using SwinkaCore.Save;
using SwinkaCore.Time;

namespace Symulator
{
    /// <summary>
    /// Przewija N dni gry na sztucznym zegarze i wypisuje stan świnki co godzinę gry.
    /// Używa prawdziwego SaveSystem (w folderze tymczasowym), więc przy wyłączaniu "komputera"
    /// stan jest zapisywany i wczytywany tak samo jak w aplikacji.
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
                Console.WriteLine("Błędny parametr: " + ex.Message);
                PrintHelp();
                return 1;
            }

            bool tempDir = o.SaveDir == null;
            string dir = o.SaveDir ?? Path.Combine(Path.GetTempPath(), "SwinkaSymulator");
            if (tempDir)
            {
                // Zawsze świeża gra w folderze tymczasowym; prawdziwego zapisu z %AppData% nie dotykamy.
                foreach (var f in new[] { SaveSystem.FileName, SaveSystem.BackupFileName, SaveSystem.TempFileName, SaveSystem.CorruptFileName })
                {
                    string p = Path.Combine(dir, f);
                    if (File.Exists(p)) File.Delete(p);
                }
            }

            var clock = new ManualClock(o.StartLocal.ToUniversalTime());
            var balance = Balance.CreateDefault();

            Console.WriteLine("Symulator Świnki: {0} {1}, start {2:yyyy-MM-dd HH:mm}, komputer włączony {3}-{4}, opieka: {5}",
                o.Days, PolishPlural.Choose(o.Days, "dzień", "dni", "dni"), o.StartLocal, o.PcFrom, o.PcTo, o.Care ? "tak" : "nie");
            Console.WriteLine("Zapis: {0}", Path.Combine(dir, SaveSystem.FileName));
            Console.WriteLine("Sen w nocy 23-7 przy włączonym komputerze. Przy wyłączonym: zasady offline (3x wolniej, min. 20).");
            Console.WriteLine();
            Console.WriteLine("dzień godz.  etap      wiek               | Najed WitC Energ Humor Czyst Ząbki | Zdrow | więź (pkt) | konicz. | PC");
            Console.WriteLine(new string('-', 124));

            GameSession session = OpenSession(clock, dir, balance, null);
            Console.WriteLine("   -- start: wczytano z: {0}{1}", SourceName(session.LoadResult.Source),
                session.LoadResult.MainError != null ? " (save.json uszkodzony: " + session.LoadResult.MainError + ")" : "");
            Needs offlinePreview = null;
            if (!IsPcOn(o, clock.LocalNow().Hour))
            {
                session.Close();
                offlinePreview = session.Pet.Needs.Clone();
                session = null;
            }
            PrintRow(clock, o, session, offlinePreview, balance, dir);

            // Stan potrzebny tylko do wypisania wiersza, gdy komputer jest wyłączony.
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

                    // Mózg świnki (Utility AI): co 5 s aktualizuje czas trwania i podejmuje decyzje
                    for (int step = 0; step < 12; step++)
                    {
                        brain.Update(TimeSpan.FromSeconds(5));
                    }

                    session.Pet.IsSleeping = (brain.CurrentAction != null && (brain.CurrentAction.ActionId == "sen" || brain.CurrentAction.ActionId == "sen_w_domku" || brain.CurrentAction.ActionId == "drzemka")) || IsNight(before.Hour);
                    session.Tick();
                    if (o.Care && !session.Pet.IsSleeping) Care(session.Pet, now);
                }
                else
                {
                    // Podgląd tego, co się dzieje "w środku" wyłączonego komputera (do wypisania co godzinę).
                    // Prawdziwe naliczenie robi Pet.Start() po włączeniu, w jednym kroku.
                    offlinePreview.ApplyTime(TimeSpan.FromMinutes(1), offline: true, sleeping: false, balance: balance);
                }

                bool on = IsPcOn(o, now.Hour);
                if (session != null && !on)
                {
                    session.Close();
                    offlinePreview = session.Pet.Needs.Clone();
                    lastClosedState = session.Pet.State;
                    session = null;
                    Console.WriteLine("   -- {0:HH:mm} komputer wyłączony, stan zapisany", now);
                }
                else if (session == null && on)
                {
                    session = OpenSession(clock, dir, balance, o);
                    brain = Brain.CreateDefault(session.Pet);
                    Console.WriteLine("   -- {0:HH:mm} komputer włączony, wczytano z: {1}, offline {2:0.#} h",
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
            Console.WriteLine("Koniec symulacji. Odczyt końcowego zapisu: {0}", SourceName(final.Source));
            if (final.State != null)
            {
                var s = final.State;
                var age = PigAge.FromBirth(s.BirthDateUtc, clock.UtcNow, balance.PigDaysPerRealDay);
                Console.WriteLine("  {0}: {1}, wiek {2}, więź {3} ({4} pkt), koniczynki {5}, urodziny: {6}",
                    s.Name, LifeStages.Polish(s.Stage), age.ToPolishString(), s.Bond.Level, s.Bond.Points, s.Clovers, s.BirthdaysCelebrated);
                Console.WriteLine("  Uruchomienia: {0}, godziny online: {1:0.#}, offline: {2:0.#}",
                    s.Stats.Sessions, s.Stats.OnlineHours, s.Stats.OfflineHours);
            }
            Console.WriteLine("  Zdarzenia:");
            foreach (var kv in EventCounts) Console.WriteLine("    {0}: {1}", kv.Key, kv.Value);

            if (brain != null)
            {
                Console.WriteLine();
                var budgetReport = brain.GetBudgetReport(o.Days);
                Console.WriteLine(budgetReport.FormatTable());
                if (budgetReport.IsAllWithinTolerance)
                {
                    Console.WriteLine(">> RAPORT BUDŻETU: Wszystkie grupy mieszczą się w tolerancji <= 5 punktów procentowych [PASS]");
                }
                else
                {
                    Console.WriteLine(">> RAPORT BUDŻETU: Niektóre grupy przekroczyły tolerancję 5 punktów procentowych [FAIL]");
                }
            }

            return 0;
        }

        private static GameSession OpenSession(ManualClock clock, string dir, Balance balance, Options o)
        {
            var session = GameSession.Open(clock, dir, balance);
            var pet = session.Pet;
            pet.NeedLow += (s, e) => Event("NeedLow", string.Format(CultureInfo.InvariantCulture,
                "niska potrzeba: {0} ({1:0})", NeedNames.Polish(e.Need), e.Value), clock);
            pet.NeedCritical += (s, e) => Event("NeedCritical", string.Format(CultureInfo.InvariantCulture,
                "KRYTYCZNA potrzeba: {0} ({1:0})", NeedNames.Polish(e.Need), e.Value), clock);
            pet.StageChanged += (s, e) => Event("StageChanged",
                "nowy etap życia: " + LifeStages.Polish(e.OldStage) + " -> " + LifeStages.Polish(e.NewStage), clock);
            pet.Birthday += (s, e) => Event("Birthday",
                "urodziny! " + e.Years + " " + PolishPlural.Choose(e.Years, "rok", "lata", "lat"), clock);
            pet.LevelUp += (s, e) => Event("LevelUp", "poziom więzi " + e.OldLevel + " -> " + e.NewLevel, clock);
            pet.IsSleeping = IsNight(clock.LocalNow().Hour);
            session.Start();
            return session;
        }

        /// <summary>
        /// Uproszczona opieka do symulacji (prawdziwe karmienie to fazy B6/C3).
        /// Siano co 2 h (zastępuje paśnik, który dojdzie w B2/B6), papryka 2x dziennie, głaskanie co godzinę.
        /// </summary>
        private static void Care(Pet pet, DateTime now)
        {
            if (now.Minute != 0) return;
            int h = now.Hour;
            if (h % 2 == 0)
            {
                pet.ChangeNeed(Need.Satiety, 20);
                pet.ChangeNeed(Need.Teeth, 6);
                Reward(pet, "siano");
            }
            if (h == 10 || h == 16)
            {
                pet.ChangeNeed(Need.VitaminC, 35);
                pet.ChangeNeed(Need.Satiety, 8);
                pet.ChangeNeed(Need.Mood, 5);
                Reward(pet, "papryka");
            }
            pet.ChangeNeed(Need.Mood, 6);
            pet.AddBondPoints(2);
            pet.Count("glaskanie");
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
            WriteRow(clock, pet.State, pet.Needs, balance, pet.IsSleeping ? "wł. (śpi)" : "wł.");
        }

        private static void PrintOfflineRow(ManualClock clock, GameState lastState, Needs preview, Balance balance)
        {
            if (lastState == null || preview == null) return;
            WriteRow(clock, lastState, preview, balance, "wył.");
        }

        private static void WriteRow(ManualClock clock, GameState state, Needs n, Balance balance, string pc)
        {
            var local = clock.LocalNow();
            var age = PigAge.FromBirth(state.BirthDateUtc, clock.UtcNow, balance.PigDaysPerRealDay);
            int day = (int)Math.Floor((clock.UtcNow - state.BirthDateUtc).TotalDays) + 1;
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "{0,5} {1:HH:mm}  {2,-9} {3,-18} | {4,5:0} {5,4:0} {6,5:0} {7,5:0} {8,5:0} {9,5:0} | {10,5:0} | {11,4} ({12,4}) | {13,7} | {14}",
                day, local, LifeStages.Polish(age.Stage), age.ToPolishString(),
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
                case LoadSource.Backup: return "save.bak (kopia)";
                default: return "brak zapisu";
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
                    case "--pomoc":
                    case "-h":
                    case "--help":
                    case "/?":
                        PrintHelp();
                        return null;
                    case "--pc":
                        var parts = Next(args, ref i).Split('-');
                        if (parts.Length != 2) throw new FormatException("--pc oczekuje zakresu godzin, np. 9-17");
                        o.PcFrom = int.Parse(parts[0], CultureInfo.InvariantCulture);
                        o.PcTo = int.Parse(parts[1], CultureInfo.InvariantCulture);
                        if (o.PcFrom < 0 || o.PcFrom > 24 || o.PcTo < 0 || o.PcTo > 24)
                            throw new ArgumentException("godziny w --pc muszą być w zakresie 0-24");
                        break;
                    case "--opieka":
                        o.Care = true;
                        break;
                    case "--co":
                        o.EveryHours = int.Parse(Next(args, ref i), CultureInfo.InvariantCulture);
                        if (o.EveryHours < 1) throw new ArgumentException("--co musi być co najmniej 1");
                        break;
                    case "--start":
                        o.StartLocal = DateTime.ParseExact(Next(args, ref i), new[] { "yyyy-MM-dd HH:mm", "yyyy-MM-dd" },
                            CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal);
                        break;
                    case "--zapis":
                        o.SaveDir = Next(args, ref i);
                        break;
                    default:
                        o.Days = int.Parse(a, CultureInfo.InvariantCulture);
                        if (o.Days < 1) throw new ArgumentException("liczba dni musi być co najmniej 1");
                        break;
                }
            }
            return o;
        }

        private static string Next(string[] args, ref int i)
        {
            if (i + 1 >= args.Length) throw new ArgumentException("brak wartości po " + args[i]);
            return args[++i];
        }

        private static void PrintHelp()
        {
            Console.WriteLine("Użycie: Symulator [dni] [--pc OD-DO] [--opieka] [--co GODZ] [--start \"RRRR-MM-DD GG:MM\"] [--zapis FOLDER]");
            Console.WriteLine("  dni        ile dni gry przewinąć (domyślnie 7)");
            Console.WriteLine("  --pc 9-17  godziny włączonego komputera; poza nimi zasady offline (domyślnie 0-24)");
            Console.WriteLine("  --opieka   prosta opieka: siano co 2 h, papryka 2x dziennie, głaskanie co godzinę");
            Console.WriteLine("  --co 24    wypisuj stan co tyle godzin gry (domyślnie 1)");
            Console.WriteLine("  --start    początek symulacji (domyślnie dziś 08:00)");
            Console.WriteLine("  --zapis    folder zapisu; domyślnie %TEMP%\\SwinkaSymulator (czyszczony na starcie)");
        }
    }
}
