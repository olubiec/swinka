using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class GameSessionHomeExtrasTests : IDisposable
    {
        private readonly string _testDir;

        public GameSessionHomeExtrasTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyGameSessionHomeExtras_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try { Directory.Delete(_testDir, true); } catch (IOException) { }
        }

        private static ManualClock NewClock()
        {
            return new ManualClock(new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc));
        }

        [Fact]
        public void NewSession_TurnsHomesOn()
        {
            using (var session = GameSession.Open(NewClock(), _testDir))
            {
                Assert.True(session.Pet.Balance.HomesActive);
            }
        }

        [Fact]
        public void OpenWithGivenBalance_TurnsHomesOn()
        {
            using (var session = GameSession.Open(NewClock(), _testDir, new Balance()))
            {
                Assert.True(session.Pet.Balance.HomesActive);
            }
        }

        [Fact]
        public void NewSession_EveryPigHasALocation()
        {
            using (var session = GameSession.Open(NewClock(), _testDir))
            {
                var locations = session.Pet.Locations();
                Assert.Equal(session.Pet.State.Roster.Count, locations.Count);
                Assert.All(locations, l => Assert.False(string.IsNullOrEmpty(l.room)));
            }
        }
    }
}
