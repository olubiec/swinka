using System;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class GameSessionPigRoomsTests : IDisposable
    {
        private static readonly DateTime Start = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
        private readonly string _testDir;

        public GameSessionPigRoomsTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyPigRooms_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, recursive: true);
                }
            }
            catch
            {
                // Ignore errors deleting the temp folder after the test
            }
        }

        [Fact]
        public void NewSession_HasPigRoomsAndDormFlagsOn()
        {
            var clock = new ManualClock(Start);

            using (var session = GameSession.Open(clock, _testDir))
            {
                Assert.True(session.Pet.Balance.PigRoomsActive);
                Assert.True(session.Pet.Balance.DormActive);
            }
        }

        [Fact]
        public void NewGame_WithStarterPair_HasOneRoomPerPig()
        {
            var clock = new ManualClock(Start);

            using (var session = GameSession.Open(clock, _testDir))
            {
                var world = session.Pet.EnsureWorld();
                var pigs = session.Pet.State.Roster.Where(p => p != null).ToList();

                Assert.Equal(pigs.Count, world.PigRoomsEnsured.Count);
                foreach (var pig in pigs)
                {
                    Assert.True(world.Rooms.ContainsKey(session.Pet.RoomIdOf(pig.Id)));
                }
            }
        }

        [Fact]
        public void OldSaveWithThreePigs_GetsThreeRooms()
        {
            var state = GameState.CreateNew("Old", Start);
            state.EnsureRosterInitialized();
            state.Roster.Add(new PigProfile("Second"));
            state.Roster.Add(new PigProfile("Third"));
            new SaveSystem(_testDir).Save(state);

            var clock = new ManualClock(Start);
            using (var session = GameSession.Open(clock, _testDir))
            {
                var world = session.Pet.EnsureWorld();
                var pigs = session.Pet.State.Roster.Where(p => p != null).ToList();

                Assert.True(pigs.Count >= 3);
                Assert.Equal(pigs.Count, world.PigRoomsEnsured.Count);
            }
        }

        [Fact]
        public void Reopen_CreatesNoNewRooms()
        {
            var clock = new ManualClock(Start);

            int roomsBefore;
            using (var first = GameSession.Open(clock, _testDir))
            {
                roomsBefore = first.Pet.EnsureWorld().Rooms.Count;
            }

            using (var second = GameSession.Open(clock, _testDir))
            {
                Assert.Equal(roomsBefore, second.Pet.EnsureWorld().Rooms.Count);
            }
        }

        [Fact]
        public void AdoptingAnotherPig_CreatesItsRoom()
        {
            var clock = new ManualClock(Start);

            using (var session = GameSession.Open(clock, _testDir))
            {
                var roster = session.Pet.State.Roster;
                int rosterBefore = roster.Count(p => p != null);
                string pigId = NamedPigCatalog.Current.Pigs
                    .Select(p => p.Id)
                    .First(id => !roster.Any(r => r != null && string.Equals(r.NamedId, id, StringComparison.OrdinalIgnoreCase)));

                // Memorial adoption skips the offer gate and the clover price, so the test needs no setup.
                var result = session.Pet.AdoptNamed(pigId, memorial: true, rng: new Random(1), nowUtc: Start);

                Assert.Equal(AdoptResult.Ok, result);
                Assert.Equal(rosterBefore + 1, roster.Count(p => p != null));
                Assert.True(session.Pet.EnsureWorld().Rooms.ContainsKey(session.Pet.RoomIdOf(pigId)));
            }
        }
    }
}
