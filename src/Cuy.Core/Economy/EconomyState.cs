namespace Cuy.Core.Economy
{
    public sealed class EconomyState
    {
        public string LastGiftLocalDate { get; set; }
        public int GiftStreak { get; set; }
        public string DayLocalDate { get; set; }
        public int MinigameCloversToday { get; set; }
        public int ColoringRewardedToday { get; set; }
        public int CareCloversToday { get; set; }
    }
}
