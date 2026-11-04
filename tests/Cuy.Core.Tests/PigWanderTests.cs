using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigWanderTests
    {
        private const string OwnRoom = "pig_kuki";

        private static readonly string[] Rooms = { OwnRoom, "salon", "playroom", "garden", "park" };

        private static DateTime At(int day, int hour, int minute = 0)
        {
            return new DateTime(2026, 3, day, hour, minute, 0, DateTimeKind.Unspecified);
        }

        [Fact]
        public void SameInputs_GiveSameResult()
        {
            var cfg = HomeEconomyConfig.CreateDefault();
            var home = new PigHomeState();
            var now = At(10, 14, 40);

            var first = PigWander.Where("kuki", home, OwnRoom, Rooms, now, cfg);
            var second = PigWander.Where("kuki", home, OwnRoom, Rooms, now, cfg);

            Assert.Equal(first.RoomId, second.RoomId);
            Assert.Equal(first.Activity, second.Activity);
            Assert.Equal(first.SlotIndex, second.SlotIndex);
        }

        [Fact]
        public void TiedPig_IsAlwaysInItsRoom()
        {
            var cfg = HomeEconomyConfig.CreateDefault();
            var home = new PigHomeState { Mode = PigHomeState.ModeRoom, Room = "playroom" };

            for (int slot = 0; slot < 72; slot++)
            {
                var now = At(10, 0).AddMinutes(slot * 20);
                Assert.Equal("playroom", PigWander.Where("kuki", home, OwnRoom, Rooms, now, cfg).RoomId);
            }
        }

        [Fact]
        public void At0300_EveryRoamingPigSleepsInItsOwnRoom()
        {
            var cfg = HomeEconomyConfig.CreateDefault();
            var home = new PigHomeState();

            foreach (var pigId in new[] { "kuki", "ned", "pip" })
            {
                var result = PigWander.Where(pigId, home, OwnRoom, Rooms, At(10, 3), cfg);
                Assert.Equal(OwnRoom, result.RoomId);
                Assert.Equal(PigWander.ActivitySleep, result.Activity);
            }
        }

        [Fact]
        public void OverAWeek_RoamingPigVisitsEveryRoom_AndNoRoomTakesMoreThanSixtyPercent()
        {
            var cfg = HomeEconomyConfig.CreateDefault();
            var home = new PigHomeState();
            var counts = Rooms.ToDictionary(r => r, r => 0);
            int total = 0;

            for (int day = 2; day < 9; day++)
            {
                for (int slot = 0; slot < 72; slot++)
                {
                    var result = PigWander.Where("kuki", home, OwnRoom, Rooms, At(day, 0).AddMinutes(slot * 20), cfg);
                    counts[result.RoomId]++;
                    total++;
                }
            }

            foreach (var room in Rooms)
            {
                Assert.True(counts[room] > 0, "Room never visited: " + room);
                Assert.True(counts[room] <= total * 0.6, "Room takes too many slots: " + room);
            }
        }

        [Fact]
        public void At2300_ActivityIsSleep()
        {
            var cfg = HomeEconomyConfig.CreateDefault();

            var roaming = PigWander.Where("kuki", new PigHomeState(), OwnRoom, Rooms, At(10, 23), cfg);
            var tied = PigWander.Where("kuki", new PigHomeState { Mode = PigHomeState.ModeRoom, Room = "garden" }, OwnRoom, Rooms, At(10, 23), cfg);

            Assert.Equal(PigWander.ActivitySleep, roaming.Activity);
            Assert.Equal(PigWander.ActivitySleep, tied.Activity);
        }

        [Fact]
        public void EmptyVisitableList_ReturnsOwnRoom()
        {
            var cfg = HomeEconomyConfig.CreateDefault();

            var result = PigWander.Where("kuki", new PigHomeState(), OwnRoom, new List<string>(), At(10, 14), cfg);

            Assert.Equal(OwnRoom, result.RoomId);
        }

        [Fact]
        public void TwoPigs_DoNotShareTheSameSchedule()
        {
            var cfg = HomeEconomyConfig.CreateDefault();
            var home = new PigHomeState();

            var kuki = Enumerable.Range(0, 20).Select(i => PigWander.Where("kuki", home, OwnRoom, Rooms, At(10, 8).AddMinutes(i * 20), cfg).RoomId).ToList();
            var ned = Enumerable.Range(0, 20).Select(i => PigWander.Where("ned", home, "pig_ned", Rooms, At(10, 8).AddMinutes(i * 20), cfg).RoomId).ToList();

            Assert.NotEqual(kuki, ned);
        }

        [Theory]
        [InlineData(21, 59, false)]
        [InlineData(22, 0, true)]
        [InlineData(23, 30, true)]
        [InlineData(0, 0, true)]
        [InlineData(6, 59, true)]
        [InlineData(7, 0, false)]
        [InlineData(14, 0, false)]
        public void IsNight_FollowsConfiguredHours(int hour, int minute, bool expected)
        {
            var cfg = HomeEconomyConfig.CreateDefault();

            Assert.Equal(expected, PigWander.IsNight(At(10, hour, minute), cfg));
        }
    }
}
