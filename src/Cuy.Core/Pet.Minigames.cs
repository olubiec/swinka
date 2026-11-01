namespace Cuy.Core
{
    public class MinigameResult
    {
        public string GameId { get; set; }
        public int Score { get; set; }
        public int Clovers { get; set; }
        public double Mood { get; set; }
        public bool IsNewRecord { get; set; }
        public bool Rewarded { get; set; }
    }

    public partial class Pet
    {
        public MinigameResult LastMinigameResult { get; private set; }
    }
}
