using System.IO;
using Cuy.Core.Save;
using Xunit;

namespace Cuy.Core.Tests
{
    public class StarterMigrationTests
    {
        /// <summary>
        /// A v2 save with the old unnamed tricolor starter gets the "cuy" sheet and its room moves to the new key.
        /// </summary>
        [Fact]
        public void OldTricolorStarter_GetsCuyNamedIdAndRoomMoves()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "Cuy_StarterMig_" + System.Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                File.WriteAllText(Path.Combine(tempDir, "save.json"), @"{
                    ""Version"": 2,
                    ""Name"": ""Kropka"",
                    ""Roster"": [ { ""Id"": ""pig_old1"", ""Name"": ""Kropka"", ""Breed"": ""smooth"", ""PaletteId"": ""tricolor"" } ],
                    ""World"": { ""Rooms"": { ""room_pig_old1"": { ""Wallpaper"": ""w"", ""Floor"": ""f"" } }, ""PigRoomsEnsured"": [ ""pig_old1"" ] }
                }");

                var state = new SaveSystem(tempDir).Load().State;

                Assert.Equal(GameState.CurrentVersion, state.Version);
                Assert.Equal("cuy", state.Roster[0].NamedId);
                Assert.True(state.World.Rooms.ContainsKey("room_cuy"));
                Assert.False(state.World.Rooms.ContainsKey("room_pig_old1"));
                Assert.Contains("cuy", state.World.PigRoomsEnsured);
                Assert.DoesNotContain("pig_old1", state.World.PigRoomsEnsured);
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }
    }
}
