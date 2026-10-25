using System;
using System.Globalization;
using Cuy.Core.Economy;
using Cuy.Core.Time;

namespace Cuy.Core
{
    public struct DailyGiftInfo
    {
        public bool Available { get; set; }
        public int Amount { get; set; }
        public int Streak { get; set; }
    }

    public partial class Pet
    {
        public event EventHandler<DailyRewardEventArgs> DailyGiftClaimed;

        private void CheckEconomyDay()
        {
            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (State.Economy.DayLocalDate != today)
            {
                State.Economy.DayLocalDate = today;
                State.Economy.MinigameCloversToday = 0;
                State.Economy.ColoringRewardedToday = 0;
                State.Economy.CareCloversToday = 0;
            }
        }

        public DailyGiftInfo GetDailyGift()
        {
            var config = EconomyConfig.Current.DailyGift;
            DateTime now = Clock.LocalNow();
            string today = now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            bool available = State.Economy.LastGiftLocalDate != today;

            int currentStreak = State.Economy.GiftStreak;

            if (!string.IsNullOrEmpty(State.Economy.LastGiftLocalDate))
            {
                if (DateTime.TryParseExact(State.Economy.LastGiftLocalDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime lastDate))
                {
                    TimeSpan diff = now.Date - lastDate.Date;
                    if (diff.TotalDays > config.StreakResetsAfterMissedDays)
                    {
                        currentStreak = 0;
                    }
                }
            }

            int streakForAmount = currentStreak;
            if (available)
            {
                streakForAmount += 1;
            }

            int amount = config.Base + config.PerStreakDay * (streakForAmount - 1);
            if (amount > config.Max)
            {
                amount = config.Max;
            }
            if (amount < config.Base)
            {
                amount = config.Base; // To handle potential negative numbers if something goes wrong
            }

            return new DailyGiftInfo
            {
                Available = available,
                Amount = amount,
                Streak = streakForAmount
            };
        }

        public int ClaimDailyGift()
        {
            var info = GetDailyGift();
            if (!info.Available) return 0;

            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            State.Economy.LastGiftLocalDate = today;
            State.Economy.GiftStreak = info.Streak;

            AddClovers(info.Amount);

            Raise(DailyGiftClaimed, new DailyRewardEventArgs(info.Amount, info.Streak));

            return info.Amount;
        }

        public int AwardColoring(int paintedCells)
        {
            CheckEconomyDay();
            var config = EconomyConfig.Current.Coloring;

            if (State.Economy.ColoringRewardedToday >= config.RewardedPicturesPerDay) return 0;

            int clovers = paintedCells / config.CellsPerClover;

            if (clovers < config.MinPerPicture) clovers = config.MinPerPicture;
            if (clovers > config.MaxPerPicture) clovers = config.MaxPerPicture;

            AddClovers(clovers);
            State.Economy.ColoringRewardedToday++;

            return clovers;
        }

        public int AwardCareTask()
        {
            CheckEconomyDay();
            var config = EconomyConfig.Current.CareTask;

            int clovers = config.Clovers;
            int maxDaily = config.MaxPerDay * config.Clovers;

            if (State.Economy.CareCloversToday + clovers <= maxDaily)
            {
                AddClovers(clovers);
                State.Economy.CareCloversToday += clovers;
                return clovers;
            }

            return 0;
        }

        public bool TryPay(int price, string reason)
        {
            if (TrySpendClovers(price))
            {
                Count("spent_" + reason);
                Count("spent_clovers", price);
                return true;
            }
            return false;
        }

        public void ApplyNewGameEconomy()
        {
            AddClovers(EconomyConfig.Current.StartingClovers);
        }
    }
}
