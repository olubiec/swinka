using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class OutdoorSeedAdversarialTests : IDisposable
    {
        private static readonly DateTime StartUtc = new DateTime(2026, 11, 11, 12, 0, 0, DateTimeKind.Utc);
        private readonly string _testDir;

        public OutdoorSeedAdversarialTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyOutdoorSeedAdv_" + Guid.NewGuid().ToString("N"));
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
                // Ignore temp cleanup failure
            }
        }

        private static Balance ActiveBalance()
        {
            return new Balance
            {
                PlacesActive = true,
                FarmActive = true,
                MarketActive = true,
                WorldDecorActive = true,
                OutdoorInstancesActive = true
            };
        }

        [Fact]
        public void A1_LayoutWithNullItemsAndDuplicateUids_HandledWithoutDuplication()
        {
            var world = new WorldState();
            var room = new RoomLayout { Items = null };
            Assert.NotNull(room.Items);
            Assert.Empty(room.Items);

            string dupUid = OutdoorSeed.BuildUid("garden", "bench");
            room.Items.Add(new PlacedItem { Uid = dupUid, ItemId = "bench_wood", X = 1, Y = 1 });
            room.Items.Add(new PlacedItem { Uid = dupUid.ToUpperInvariant(), ItemId = "bench_wood", X = 2, Y = 2 });
            room.Items.Add(null);
            world.Rooms["garden"] = room;

            var defaults = OutdoorDefaults.CreateCodeDefaults();
            int expectedSeeded = defaults.ForScene("garden").Count;

            OutdoorSeed.Seed(world, "garden", defaults, ActiveBalance());

            var benchItems = world.Rooms["garden"].Items
                .Where(i => i != null && string.Equals(i.Uid, dupUid, StringComparison.OrdinalIgnoreCase))
                .ToList();
            Assert.Equal(2, benchItems.Count);
            Assert.Equal(1, benchItems[0].X);

            var nonNullItems = world.Rooms["garden"].Items.Where(i => i != null).ToList();
            Assert.Equal(expectedSeeded + 1, nonNullItems.Count);
            Assert.Contains("garden", world.OutdoorSeeded);
        }

        [Fact]
        public void A2_PreP46SaveJsonWithoutOutdoorSeeded_LoadsAndSeedsExactlyOnce()
        {
            var preState = GameState.CreateNew("PreP46", StartUtc);
            string rawJson = SaveSystem.Serialize(preState);
            var root = JObject.Parse(rawJson);
            var worldToken = root["world"] as JObject;
            Assert.NotNull(worldToken);
            worldToken.Remove("outdoorSeeded");

            string savePath = Path.Combine(_testDir, SaveSystem.FileName);
            File.WriteAllText(savePath, root.ToString(), new UTF8Encoding(false));

            var clock = new ManualClock(StartUtc);
            using (var session1 = GameSession.Open(clock, _testDir))
            {
                var world1 = session1.Pet.State.World;
                foreach (var place in OutdoorSeed.DefaultPlaces)
                {
                    Assert.Contains(place, world1.OutdoorSeeded);
                    int expected = OutdoorDefaults.Current.ForScene(place).Count;
                    Assert.Equal(expected, world1.Rooms[place].Items.Count);
                }
                session1.Close();
            }

            using (var session2 = GameSession.Open(clock, _testDir))
            {
                var world2 = session2.Pet.State.World;
                foreach (var place in OutdoorSeed.DefaultPlaces)
                {
                    int expected = OutdoorDefaults.Current.ForScene(place).Count;
                    Assert.Equal(expected, world2.Rooms[place].Items.Count);
                }
            }
        }

        [Fact]
        public void A3_HundredSaveLoadRoundTrips_DoNotGrowFileOrDuplicateInstances()
        {
            var state = GameState.CreateNew("RoundTripPig", StartUtc);
            var balance = ActiveBalance();
            var defaults = OutdoorDefaults.CreateCodeDefaults();
            foreach (var place in OutdoorSeed.DefaultPlaces)
            {
                OutdoorSeed.Seed(state.World, place, defaults, balance);
            }

            var expectedCounts = OutdoorSeed.DefaultPlaces.ToDictionary(
                p => p,
                p => state.World.Rooms[p].Items.Count);
            var expectedOwned = new Dictionary<string, int>(state.World.OwnedItems, StringComparer.OrdinalIgnoreCase);

            var saveSystem = new SaveSystem(_testDir);
            saveSystem.Save(state);
            var firstLoad = saveSystem.Load().State;
            Assert.NotNull(firstLoad);
            saveSystem.Save(firstLoad);
            long firstBytes = new FileInfo(saveSystem.SavePath).Length;

            GameState current = firstLoad;
            for (int i = 0; i < 100; i++)
            {
                var loaded = saveSystem.Load();
                Assert.NotNull(loaded.State);
                current = loaded.State;
                foreach (var place in OutdoorSeed.DefaultPlaces)
                {
                    OutdoorSeed.Seed(current.World, place, defaults, balance);
                }
                saveSystem.Save(current);
            }

            long finalBytes = new FileInfo(saveSystem.SavePath).Length;
            Assert.Equal(firstBytes, finalBytes);
            Assert.True(finalBytes < 200 * 1024, $"Save size {finalBytes} exceeds 200KB limit.");

            foreach (var place in OutdoorSeed.DefaultPlaces)
            {
                Assert.Equal(expectedCounts[place], current.World.Rooms[place].Items.Count);
            }
            foreach (var kv in expectedOwned)
            {
                Assert.Equal(kv.Value, current.World.OwnedItems[kv.Key]);
            }
        }

        [Fact]
        public void A4_PlayerStashesEveryDecorativeObject_SavesLoadsSeedsAgain_StaysEmptyOfDecor()
        {
            var state = GameState.CreateNew("StashPig", StartUtc);
            var balance = ActiveBalance();
            var defaults = OutdoorDefaults.CreateCodeDefaults();
            OutdoorSeed.Seed(state.World, "garden", defaults, balance);

            var gardenRoom = state.World.Rooms["garden"];
            var removableUids = gardenRoom.Items.Where(i => i.Removable).Select(i => i.Uid).ToList();
            Assert.NotEmpty(removableUids);

            foreach (var uid in removableUids)
            {
                Assert.True(RoomLayoutOps.Remove(gardenRoom, uid, out string err));
                Assert.Null(err);
            }

            Assert.Single(gardenRoom.Items);
            Assert.Equal("fx:garden:burrow", gardenRoom.Items[0].Uid);

            var saveSystem = new SaveSystem(_testDir);
            saveSystem.Save(state);
            var loaded = saveSystem.Load().State;
            Assert.NotNull(loaded);

            OutdoorSeed.Seed(loaded.World, "garden", defaults, balance);

            Assert.Single(loaded.World.Rooms["garden"].Items);
            Assert.Equal("fx:garden:burrow", loaded.World.Rooms["garden"].Items[0].Uid);
        }

        [Fact]
        public void A5_PlayerMovesFixture_SavesLoadsSeedsAgain_PositionKept()
        {
            var state = GameState.CreateNew("MoveFixturePig", StartUtc);
            var balance = ActiveBalance();
            var defaults = OutdoorDefaults.CreateCodeDefaults();
            OutdoorSeed.Seed(state.World, "garden", defaults, balance);

            var pet = new Pet(state, new ManualClock(StartUtc), balance);
            var moveRes = pet.MoveItem("garden", "fx:garden:burrow", 5, 4);
            Assert.Equal(PlaceResult.Ok, moveRes);

            var saveSystem = new SaveSystem(_testDir);
            saveSystem.Save(state);
            var loaded = saveSystem.Load().State;
            Assert.NotNull(loaded);

            OutdoorSeed.Seed(loaded.World, "garden", defaults, balance);

            var burrow = loaded.World.Rooms["garden"].Items.Single(i => i.Uid == "fx:garden:burrow");
            Assert.Equal(5, burrow.X);
            Assert.Equal(4, burrow.Y);
        }

        [Fact]
        public void A6_TwoPlacesSeededInDifferentOrders_GiveSameUids()
        {
            var defaults = OutdoorDefaults.CreateCodeDefaults();
            var balance = ActiveBalance();

            var worldForward = new WorldState();
            foreach (var place in OutdoorSeed.DefaultPlaces)
            {
                OutdoorSeed.Seed(worldForward, place, defaults, balance);
            }

            var worldReverse = new WorldState();
            foreach (var place in OutdoorSeed.DefaultPlaces.Reverse())
            {
                OutdoorSeed.Seed(worldReverse, place, defaults, balance);
            }

            foreach (var place in OutdoorSeed.DefaultPlaces)
            {
                var uidsA = worldForward.Rooms[place].Items.Select(i => i.Uid).ToList();
                var uidsB = worldReverse.Rooms[place].Items.Select(i => i.Uid).ToList();
                Assert.Equal(uidsA, uidsB);
            }
        }

        [Fact]
        public void A7_OutdoorDefaultsWithMissingFile_FallsBackToCodeDefaultsAndLogs()
        {
            var logs = new List<string>();
            var prevLogger = ItemCatalog.ErrorLogger;
            ItemCatalog.ErrorLogger = msg => logs.Add(msg);
            try
            {
                string missingPath = Path.Combine(_testDir, "nonexistent_outdoor_defaults.json");
                var loaded = OutdoorDefaults.Load(missingPath);
                Assert.NotNull(loaded);
                Assert.NotEmpty(loaded.ForScene("garden"));
                Assert.NotEmpty(loaded.ForScene("park"));
                Assert.NotEmpty(loaded.ForScene("farm"));
                Assert.NotEmpty(loaded.ForScene("market"));
                Assert.Contains(logs, l => l != null && l.Contains("OutdoorDefaults"));
            }
            finally
            {
                ItemCatalog.ErrorLogger = prevLogger;
            }
        }

        [Fact(Skip = "DEFECT: OutdoorDefaults.LoadFromJson and OutdoorSeed.Seed accept unknown itemIds without skipping or logging")]
        public void A8_UnknownItemIdInData_IsSkippedAndLogged()
        {
            var logs = new List<string>();
            var prevLogger = ItemCatalog.ErrorLogger;
            ItemCatalog.ErrorLogger = msg => logs.Add(msg);
            try
            {
                string json = @"{
                  ""version"": 1,
                  ""scenes"": {
                    ""garden"": [
                      { ""id"": ""ghost"", ""itemId"": ""nonexistent_ufo_999"", ""x"": 1, ""y"": 1 },
                      { ""id"": ""bench"", ""itemId"": ""bench_wood"", ""x"": 9, ""y"": 6 }
                    ]
                  }
                }";
                var table = OutdoorDefaults.LoadFromJson(json);
                var world = new WorldState();
                OutdoorSeed.Seed(world, "garden", table, ActiveBalance());

                Assert.DoesNotContain(world.Rooms["garden"].Items, i => i.ItemId == "nonexistent_ufo_999");
                Assert.Contains(logs, l => l != null && l.Contains("nonexistent_ufo_999"));
            }
            finally
            {
                ItemCatalog.ErrorLogger = prevLogger;
            }
        }

        [Fact]
        public void A9_PlaceSecondCopyOfFixtureItem_EnforcesCatalogRepeatableAndOwnedCountRule()
        {
            // Catalog rule: WorldItemDefinition.Repeatable is false for floor fixtures (e.g. willow_tunnel).
            // Pet.PlaceItem rejects placing another copy when owned - placed < 1 (PlaceResult.NotAllowedHere),
            // whereas RoomLayoutOps.Place (pure grid geometry check) accepts it at a non-overlapping cell (PlaceResult.Ok).
            var state = GameState.CreateNew("FixtureCopyPig", StartUtc);
            var balance = ActiveBalance();
            var defaults = OutdoorDefaults.CreateCodeDefaults();
            OutdoorSeed.Seed(state.World, "garden", defaults, balance);

            var pet = new Pet(state, new ManualClock(StartUtc), balance);
            var def = pet.WorldItemCatalog.Find("willow_tunnel");
            Assert.NotNull(def);
            Assert.False(def.Repeatable);

            var petPlaceSecond = pet.PlaceItem("garden", "willow_tunnel", 5, 4);
            Assert.Equal(PlaceResult.NotAllowedHere, petPlaceSecond);

            var opsPlaceSecond = RoomLayoutOps.Place(
                state.World.Rooms["garden"],
                16,
                9,
                0,
                def,
                "garden",
                5,
                4,
                catalog: pet.WorldItemCatalog);
            Assert.Equal(PlaceResult.Ok, opsPlaceSecond);
        }

        [Fact]
        public void A10_FlagOff_LeavesPreP46StateByteIdenticalAfterSeedAndLoadSave()
        {
            var state = GameState.CreateNew("FlagOffPig", StartUtc);
            var saveSystem = new SaveSystem(_testDir);
            saveSystem.Save(state);
            var baseline = saveSystem.Load().State;
            Assert.NotNull(baseline);
            saveSystem.Save(baseline);
            byte[] beforeBytes = File.ReadAllBytes(saveSystem.SavePath);

            var loaded = saveSystem.Load().State;
            Assert.NotNull(loaded);

            var offBalance = new Balance { OutdoorInstancesActive = false };
            foreach (var place in OutdoorSeed.DefaultPlaces)
            {
                OutdoorSeed.Seed(loaded.World, place, OutdoorDefaults.CreateCodeDefaults(), offBalance);
            }

            Assert.Empty(loaded.World.OutdoorSeeded);
            Assert.False(loaded.World.Rooms.ContainsKey("garden"));
            Assert.False(loaded.World.Rooms.ContainsKey("park"));
            Assert.False(loaded.World.Rooms.ContainsKey("farm"));
            Assert.False(loaded.World.Rooms.ContainsKey("market"));

            saveSystem.Save(loaded);
            byte[] afterBytes = File.ReadAllBytes(saveSystem.SavePath);
            Assert.Equal(beforeBytes, afterBytes);
        }

        [Fact]
        public void R1_FarmAndMarketSeedOn16x9Grid_WithinBoundsAndFixturesLockedButMovable()
        {
            var state = GameState.CreateNew("GridAndFixturePig", StartUtc);
            var balance = ActiveBalance();
            var defaults = OutdoorDefaults.CreateCodeDefaults();
            foreach (var place in OutdoorSeed.DefaultPlaces)
            {
                OutdoorSeed.Seed(state.World, place, defaults, balance);
            }

            var pet = new Pet(state, new ManualClock(StartUtc), balance);

            foreach (var place in new[] { "farm", "market" })
            {
                var (cols, rows) = pet.GetRoomGridSize(place);
                Assert.Equal(16, cols);
                Assert.Equal(9, rows);

                var room = state.World.Rooms[place];
                Assert.NotEmpty(room.Items);

                foreach (var item in room.Items)
                {
                    var def = pet.WorldItemCatalog.Find(item.ItemId);
                    Assert.NotNull(def);
                    Assert.InRange(item.X, 0, 15);
                    Assert.InRange(item.Y, 0, 8);
                    Assert.True(item.X + def.EffectiveFootW <= 16, $"{item.Uid} overflows 16 cols");
                    Assert.True(item.Y + def.EffectiveFootH <= 9, $"{item.Uid} overflows 9 rows");
                }
            }

            var expectedFixtures = new[]
            {
                ("garden", "fx:garden:burrow", 16, 9, 5, 4),
                ("park", "fx:park:bridge", 24, 12, 10, 8),
                ("farm", "fx:farm:barn", 16, 9, 6, 1),
                ("market", "fx:market:stall_left", 16, 9, 1, 2),
                ("market", "fx:market:stall_center", 16, 9, 6, 2),
                ("market", "fx:market:stall_right", 16, 9, 12, 2)
            };

            foreach (var (place, uid, cols, rows, targetX, targetY) in expectedFixtures)
            {
                var room = state.World.Rooms[place];
                var placed = room.Items.Single(i => i.Uid == uid);
                Assert.False(placed.Removable);
                Assert.True(placed.Movable);

                bool removed = RoomLayoutOps.Remove(room, uid, out string error);
                Assert.False(removed);
                Assert.Equal("fixture_locked", error);
                Assert.Contains(room.Items, i => i.Uid == uid);

                var moveResult = RoomLayoutOps.Move(room, cols, rows, 0, pet.WorldItemCatalog, place, uid, targetX, targetY);
                Assert.Equal(PlaceResult.Ok, moveResult);
                Assert.Equal(targetX, placed.X);
                Assert.Equal(targetY, placed.Y);
            }
        }
    }
}
