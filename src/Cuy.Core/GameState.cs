using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    /// <summary>
    /// The whole game state, saved to %AppData%/Cuy/save.json.
    /// A plain data class: the logic lives in <see cref="Pet"/>.
    /// </summary>
    public sealed partial class GameState
    {
        /// <summary>Current save format version. Bump it when the format changes and add a migration in SaveSystem.</summary>
        public const int CurrentVersion = 2;

        public int Version { get; set; } = CurrentVersion;

        /// <summary>The pig's name.</summary>
        public string Name { get; set; } = "Cuy";

        /// <summary>Birth date (game time, UTC). Age is counted from it.</summary>
        public DateTime BirthDateUtc { get; set; }

        /// <summary>Last moment the game was running (game time, UTC). Offline time is counted from it.</summary>
        public DateTime LastActiveUtc { get; set; }

        public Needs Needs { get; set; } = new Needs();

        /// <summary>Last known life stage (to detect changes, also after coming back from offline).</summary>
        public LifeStage Stage { get; set; } = LifeStage.Baby;

        /// <summary>How many birthdays have been celebrated (pig years).</summary>
        public int BirthdaysCelebrated { get; set; }

        public Bond Bond { get; set; } = new Bond();

        /// <summary>Clovers (currency). Never below 0.</summary>
        public int Clovers { get; set; }

        /// <summary>Number of poops (affects cage cleanliness, max 8).</summary>
        public int PoopCount { get; set; }

        /// <summary>Poops lying on the screen (position, window and so on).</summary>
        public List<PoopItem> Poops { get; set; } = new List<PoopItem>();

        /// <summary>Inventory: item id from items.json -> count.</summary>
        public Dictionary<string, int> Inventory { get; set; } = new Dictionary<string, int>();

        /// <summary>Minigame records: game id -> best score.</summary>
        public Dictionary<string, int> HighScores { get; set; } = new Dictionary<string, int>();

        /// <summary>Local date of the rewarded games day (yyyy-MM-dd) for the daily limit (max 10).</summary>
        public string MinigamesDailyDate { get; set; }

        /// <summary>Number of rewarded games played on MinigamesDailyDate (max 10).</summary>
        public int MinigamesDailyCount { get; set; }

        /// <summary>Local date of the last collected daily reward (yyyy-MM-dd).</summary>
        public string DailyRewardLastDate { get; set; }

        /// <summary>Number of consecutive days with a collected reward (streak).</summary>
        public int DailyRewardStreak { get; set; }

        /// <summary>Behaviour album: animation name -> when first seen (game time, UTC).</summary>
        public Dictionary<string, DateTime> Album { get; set; } = new Dictionary<string, DateTime>();

        /// <summary>The pig's diary.</summary>
        public List<DiaryEntry> Diary { get; set; } = new List<DiaryEntry>();

        public Statistics Stats { get; set; } = new Statistics();

        /// <summary>True until the player has named the pig (first run). Missing in old saves, so false there.</summary>
        public bool NeedsNaming { get; set; }

        /// <summary>True once the gift note letter has been shown.</summary>
        public bool GiftNoteShown { get; set; }

        /// <summary>When growth started counting (first start, UTC).</summary>
        public DateTime? GrowthStartUtc { get; set; }

        public static GameState CreateNew(string name, DateTime nowUtc)
        {
            return new GameState
            {
                Name = string.IsNullOrWhiteSpace(name) ? "Cuy" : name,
                NeedsNaming = true,
                GrowthStartUtc = nowUtc,
                BirthDateUtc = nowUtc,
                LastActiveUtc = nowUtc,
                Stats = new Statistics { FirstStartUtc = nowUtc },
            };
        }

        /// <summary>Fills gaps after loading (e.g. an older file without some field).</summary>
        public void Normalize()
        {
            if (Version <= 0) Version = CurrentVersion;
            if (string.IsNullOrWhiteSpace(Name)) Name = "Cuy";
            if (Needs == null) Needs = new Needs();
            if (GrowthStartUtc == null) GrowthStartUtc = DateTime.UtcNow;
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

    /// <summary>Bond level and points (1-20).</summary>
    public sealed class Bond
    {
        public int Level { get; set; } = 1;

        /// <summary>Total points earned.</summary>
        public int Points { get; set; }

        /// <summary>Points earned on <see cref="PointsTodayDate"/> (for the daily limit).</summary>
        public int PointsToday { get; set; }

        /// <summary>Local date that PointsToday refers to, yyyy-MM-dd.</summary>
        public string PointsTodayDate { get; set; }
    }

    public sealed class DiaryEntry
    {
        /// <summary>Game time (UTC).</summary>
        public DateTime DateUtc { get; set; }
        public string Text { get; set; }
    }

    public sealed class Statistics
    {
        /// <summary>First start (game time, UTC).</summary>
        public DateTime FirstStartUtc { get; set; }

        /// <summary>Number of game starts.</summary>
        public int Sessions { get; set; }

        /// <summary>Game hours with the app running.</summary>
        public double OnlineHours { get; set; }

        /// <summary>Game hours with the app closed.</summary>
        public double OfflineHours { get; set; }

        /// <summary>Free-form counters, e.g. "feedings", "bell_pepper", "popcorn".</summary>
        public Dictionary<string, int> Counters { get; set; } = new Dictionary<string, int>();
    }

    /// <summary>
    /// A single poop on the screen (stored in save.json).
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
