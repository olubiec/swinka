namespace Cuy.Core
{
    public sealed partial class GameState
    {
        /// <summary>Whether the optional companion is enabled in garden/park scenes (default: off).</summary>
        public bool CompanionEnabled { get; set; } = false;

        /// <summary>Selected companion identifier (default: "garden_friend").</summary>
        public string CompanionId { get; set; } = "garden_friend";
    }
}
