using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    /// <summary>
    /// Cały stan gry zapisywany do %AppData%/Cuy/save.json.
    /// Zwykła klasa danych: logika jest w <see cref="Pet"/>.
    /// </summary>
    public sealed class GameState
    {
        /// <summary>Aktualna wersja formatu zapisu. Podbij przy zmianie formatu i dodaj migrację w SaveSystem.</summary>
        public const int CurrentVersion = 2;

        public int Version { get; set; } = CurrentVersion;

        /// <summary>Imię świnki.</summary>
        public string Name { get; set; } = "Cuy";

        /// <summary>Data urodzenia (czas gry, UTC). Wiek liczy się od niej.</summary>
        public DateTime BirthDateUtc { get; set; }

        /// <summary>Ostatni moment, w którym gra działała (czas gry, UTC). Od niego liczy się czas offline.</summary>
        public DateTime LastActiveUtc { get; set; }

        public Needs Needs { get; set; } = new Needs();

        /// <summary>Ostatni znany etap życia (do wykrywania zmiany, także po powrocie z offline).</summary>
        public LifeStage Stage { get; set; } = LifeStage.Baby;

        /// <summary>Ile urodzin już obchodziła (lata świnki).</summary>
        public int BirthdaysCelebrated { get; set; }

        public Bond Bond { get; set; } = new Bond();

        /// <summary>Koniczynki (waluta). Nigdy poniżej 0.</summary>
        public int Clovers { get; set; }

        /// <summary>Liczba bobków świnki (wpływa na czystość klatki, max 8).</summary>
        public int PoopCount { get; set; }

        /// <summary>Lista bobków leżących na ekranie (pozycja, okno itp.).</summary>
        public List<PoopItem> Poops { get; set; } = new List<PoopItem>();

        /// <summary>Ekwipunek: id przedmiotu z items.json -> liczba sztuk.</summary>
        public Dictionary<string, int> Inventory { get; set; } = new Dictionary<string, int>();

        /// <summary>Rekordy minigier: id gry -> najwyższy wynik.</summary>
        public Dictionary<string, int> HighScores { get; set; } = new Dictionary<string, int>();

        /// <summary>Lokalna data dnia gier z nagrodą (format yyyy-MM-dd) do limitu dziennego (max 10).</summary>
        public string MinigamesDailyDate { get; set; }

        /// <summary>Liczba nagrodzonych gier rozegranych w dniu MinigamesDailyDate (maks. 10).</summary>
        public int MinigamesDailyCount { get; set; }

        /// <summary>Lokalna data ostatniego odebrania dziennej nagrody (format yyyy-MM-dd).</summary>
        public string DailyRewardLastDate { get; set; }

        /// <summary>Liczba kolejnych dni z rzędu z odebraną nagrodą (seria streak).</summary>
        public int DailyRewardStreak { get; set; }

        /// <summary>Album zachowań: nazwa animacji -> kiedy zobaczona pierwszy raz (czas gry, UTC).</summary>
        public Dictionary<string, DateTime> Album { get; set; } = new Dictionary<string, DateTime>();

        /// <summary>Pamiętnik świnki.</summary>
        public List<DiaryEntry> Diary { get; set; } = new List<DiaryEntry>();

        public Statistics Stats { get; set; } = new Statistics();

        public static GameState CreateNew(string name, DateTime nowUtc)
        {
            return new GameState
            {
                Name = string.IsNullOrWhiteSpace(name) ? "Cuy" : name,
                BirthDateUtc = nowUtc,
                LastActiveUtc = nowUtc,
                Stats = new Statistics { FirstStartUtc = nowUtc },
            };
        }

        /// <summary>Uzupełnia braki po wczytaniu (np. starszy plik bez jakiegoś pola).</summary>
        public void Normalize()
        {
            if (Version <= 0) Version = CurrentVersion;
            if (string.IsNullOrWhiteSpace(Name)) Name = "Cuy";
            if (Needs == null) Needs = new Needs();
            if (Bond == null) Bond = new Bond();
            if (Bond.Level < 1) Bond.Level = 1;
            if (Bond.Points < 0) Bond.Points = 0;
            if (Clovers < 0) Clovers = 0;
            if (DailyRewardStreak < 0) DailyRewardStreak = 0;
            if (Inventory == null) Inventory = new Dictionary<string, int>();
            if (HighScores == null) HighScores = new Dictionary<string, int>();
            if (Album == null) Album = new Dictionary<string, DateTime>();
            if (Diary == null) Diary = new List<DiaryEntry>();
            if (Stats == null) Stats = new Statistics();
            if (Stats.Counters == null) Stats.Counters = new Dictionary<string, int>();
            if (Poops == null) Poops = new List<PoopItem>();
            if (PoopCount < 0) PoopCount = 0;
            if (PoopCount > 8) PoopCount = 8;
            if (PoopCount < Poops.Count) PoopCount = Poops.Count;
            BirthDateUtc = AsUtc(BirthDateUtc);
            LastActiveUtc = AsUtc(LastActiveUtc);
            if (LastActiveUtc < BirthDateUtc) LastActiveUtc = BirthDateUtc;
        }

        private static DateTime AsUtc(DateTime d)
        {
            if (d.Kind == DateTimeKind.Local) return d.ToUniversalTime();
            return DateTime.SpecifyKind(d, DateTimeKind.Utc);
        }
    }

    /// <summary>Poziom i punkty więzi (1-20).</summary>
    public sealed class Bond
    {
        public int Level { get; set; } = 1;

        /// <summary>Łączna liczba zdobytych punktów.</summary>
        public int Points { get; set; }

        /// <summary>Punkty zdobyte w dniu <see cref="PointsTodayDate"/> (do dziennego limitu).</summary>
        public int PointsToday { get; set; }

        /// <summary>Lokalna data dnia, którego dotyczy PointsToday, w formacie yyyy-MM-dd.</summary>
        public string PointsTodayDate { get; set; }
    }

    public sealed class DiaryEntry
    {
        /// <summary>Czas gry (UTC).</summary>
        public DateTime DateUtc { get; set; }
        public string Text { get; set; }
    }

    public sealed class Statistics
    {
        /// <summary>Pierwsze uruchomienie (czas gry, UTC).</summary>
        public DateTime FirstStartUtc { get; set; }

        /// <summary>Liczba uruchomień gry.</summary>
        public int Sessions { get; set; }

        /// <summary>Godziny gry przy włączonej aplikacji.</summary>
        public double OnlineHours { get; set; }

        /// <summary>Godziny gry przy zamkniętej aplikacji.</summary>
        public double OfflineHours { get; set; }

        /// <summary>Dowolne liczniki, np. "karmienia", "bell_pepper", "popcorn".</summary>
        public Dictionary<string, int> Counters { get; set; } = new Dictionary<string, int>();
    }

    /// <summary>
    /// Informacje o pojedynczym bobku na ekranie (zapisywane w save.json).
    /// </summary>
    public sealed class PoopItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public int X { get; set; }
        public int Y { get; set; }
        public bool OnTaskbar { get; set; } = true;
        public string WindowTitle { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
