using System;
using System.Collections.Generic;
using System.Globalization;
using Cuy.Core.Diary;
using Cuy.Core.Time;

namespace Cuy.Core
{
    public sealed partial class Pet
    {
        public bool TryWriteDiary(DiaryWriter writer = null, Random rng = null)
        {
            if (!Balance.DiaryActive) return false;

            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            if (State.DayLogDate != today || State.DayLogCounters == null)
            {
                State.DayLogDate = today;
                var currentCounters = State.Stats?.Counters;
                State.DayLogCounters = currentCounters != null
                    ? new Dictionary<string, int>(currentCounters)
                    : new Dictionary<string, int>();
                return false;
            }

            if (Clock.LocalNow().Hour < Balance.DiaryWriteHour || State.DiaryLastWrittenDate == today)
            {
                return false;
            }

            var stats = DayStats.FromCounters(today, State.DayLogCounters, State.Stats.Counters);
            if (stats.Fed == 0 && stats.Pets == 0 && stats.Games == 0 && stats.Poops == 0) return false;

            State.DiaryLastWrittenDate = today;

            string moodCategory = "ok";
            if (State.Needs.Mood < 35) moodCategory = "low";
            else if (State.Needs.Mood > 70) moodCategory = "high";

            var ctx = new DiaryContext
            {
                Name = State.Name,
                Stage = State.Stage,
                Mood = moodCategory,
                Sick = IsSick,
                Birthday = false,
                Weather = "any",
                Fed = stats.Fed,
                Pets = stats.Pets,
                Games = stats.Games,
                Poops = stats.Poops,
                Clovers = State.Clovers,
                FavoriteVegetable = GetFavoriteVegetable(),
                PreviousTemplateId = State.DiaryLastTemplateId
            };

            var actualWriter = writer ?? DiaryWriter.Current;
            var actualRng = rng ?? new Random();

            var result = actualWriter.Render(ctx, actualRng);
            if (result != null)
            {
                AddDiaryEntry(result.Text);
                State.DiaryLastTemplateId = result.TemplateId;

                while (State.Diary.Count > 365)
                {
                    State.Diary.RemoveAt(0);
                }
                return true;
            }

            return false;
        }
    }
}
