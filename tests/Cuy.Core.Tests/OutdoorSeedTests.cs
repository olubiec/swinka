using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class OutdoorSeedTests
    {
        private static OutdoorDefaults LoadRepoDefaults()
        {
            return OutdoorDefaults.Load(RepoFile.Find("assets/data/outdoor_defaults.json"));
        }

        private static WorldItemCatalog LoadRepoItems()
        {
            return WorldItemCatalog.Load(File.ReadAllText(RepoFile.Find("assets/data/world_items.json")));
        }

        private static Balance ActiveBalance()
        {
            return new Balance { OutdoorInstancesActive = true };
        }

        [Fact]
        public void S1_SeedCreatesDefaults()
        {
            var defaults = LoadRepoDefaults();
            var world = new WorldState();

            OutdoorSeed.Seed(world, "garden", defaults, ActiveBalance());

            Assert.True(world.Rooms.ContainsKey("garden"));
            var gardenItems = world.Rooms["garden"].Items;
            var expected = defaults.ForScene("garden");
            Assert.Equal(expected.Count, gardenItems.Count);

            foreach (var def in expected)
            {
                string uid = $"fx:garden:{def.Id}";
                var placed = gardenItems.FirstOrDefault(i => i.Uid == uid);
                Assert.NotNull(placed);
                Assert.Equal(def.ItemId, placed.ItemId);
                Assert.Equal(def.X, placed.X);
                Assert.Equal(def.Y, placed.Y);
                Assert.Equal(def.Flip, placed.Flip);
                Assert.Equal(def.Movable, placed.Movable);
                Assert.Equal(def.Removable, placed.Removable);
            }
            Assert.Contains("garden", world.OutdoorSeeded);
        }

        [Fact]
        public void S2_SeedOnce()
        {
            var defaults = LoadRepoDefaults();
            var world = new WorldState();
            var balance = ActiveBalance();

            OutdoorSeed.Seed(world, "garden", defaults, balance);
            int countAfterFirst = world.Rooms["garden"].Items.Count;

            OutdoorSeed.Seed(world, "garden", defaults, balance);
            Assert.Equal(countAfterFirst, world.Rooms["garden"].Items.Count);
        }

        [Fact]
        public void S3_OldSaveLoadsAndSeeds()
        {
            var defaults = LoadRepoDefaults();
            var clock = new ManualClock(new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc));
            var oldState = GameState.CreateNew("Cuy", clock.UtcNow);
            string json = JsonConvert.SerializeObject(oldState);
            var jobj = JObject.Parse(json);
            var worldObj = (JObject)jobj["World"];
            worldObj.Remove("OutdoorSeeded");

            var loaded = JsonConvert.DeserializeObject<GameState>(jobj.ToString());
            Assert.NotNull(loaded.World.OutdoorSeeded);
            Assert.Empty(loaded.World.OutdoorSeeded);

            OutdoorSeed.Seed(loaded.World, "garden", defaults, ActiveBalance());
            Assert.Equal(defaults.ForScene("garden").Count, loaded.World.Rooms["garden"].Items.Count);
            Assert.Contains("garden", loaded.World.OutdoorSeeded);
        }

        [Fact]
        public void S4_RemovedStaysRemoved()
        {
            var defaults = LoadRepoDefaults();
            var world = new WorldState();
            var balance = ActiveBalance();

            OutdoorSeed.Seed(world, "garden", defaults, balance);
            var garden = world.Rooms["garden"];
            Assert.True(RoomLayoutOps.Remove(garden, "fx:garden:bench", out string err));
            Assert.Null(err);
            Assert.DoesNotContain(garden.Items, i => i.Uid == "fx:garden:bench");

            OutdoorSeed.Seed(world, "garden", defaults, balance);
            Assert.DoesNotContain(garden.Items, i => i.Uid == "fx:garden:bench");
        }

        [Fact]
        public void S5_MovePersistsAcrossSaveAndLoad()
        {
            var defaults = LoadRepoDefaults();
            var catalog = LoadRepoItems();
            var clock = new ManualClock(new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc));
            string tempDir = Path.Combine(Path.GetTempPath(), "cuy_p46a_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);

            try
            {
                var state = GameState.CreateNew("Cuy", clock.UtcNow);
                OutdoorSeed.Seed(state.World, "garden", defaults, ActiveBalance());

                var moveResult = RoomLayoutOps.Move(
                    state.World.Rooms["garden"], 16, 9, 0, catalog, "garden", "fx:garden:bench", 5, 5);
                Assert.Equal(PlaceResult.Ok, moveResult);

                var save = new SaveSystem(tempDir);
                save.Save(state);

                var loaded = save.Load();
                Assert.NotNull(loaded.State);
                var bench = loaded.State.World.Rooms["garden"].Items.FirstOrDefault(i => i.Uid == "fx:garden:bench");
                Assert.NotNull(bench);
                Assert.Equal(5, bench.X);
                Assert.Equal(5, bench.Y);
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public void S6_FixtureLockedCannotBeRemoved()
        {
            var defaults = LoadRepoDefaults();
            var world = new WorldState();
            OutdoorSeed.Seed(world, "garden", defaults, ActiveBalance());

            var garden = world.Rooms["garden"];
            bool removed = RoomLayoutOps.Remove(garden, "fx:garden:burrow", out string error);

            Assert.False(removed);
            Assert.Equal("fixture_locked", error);
            Assert.Contains(garden.Items, i => i.Uid == "fx:garden:burrow");
        }

        [Fact]
        public void S7_FlagOffNoSeed()
        {
            var defaults = LoadRepoDefaults();
            var world = new WorldState();
            var balance = new Balance { OutdoorInstancesActive = false };

            OutdoorSeed.Seed(world, "garden", defaults, balance);

            Assert.False(world.Rooms.ContainsKey("garden"));
            Assert.Empty(world.OutdoorSeeded);
        }

        [Fact]
        public void S8_DataValid()
        {
            var defaults = LoadRepoDefaults();
            var catalog = LoadRepoItems();
            var placesJson = JObject.Parse(File.ReadAllText(RepoFile.Find("assets/data/places.json")));
            var placesArr = (JArray)placesJson["places"];

            foreach (var sceneId in OutdoorSeed.DefaultPlaces)
            {
                var items = defaults.ForScene(sceneId);
                Assert.NotEmpty(items);

                var placeDef = placesArr.FirstOrDefault(p => string.Equals((string)p["id"], sceneId, StringComparison.OrdinalIgnoreCase)) as JObject;
                Assert.NotNull(placeDef);
                var level0 = (JObject)((JArray)placeDef["levels"])[0];
                int cols = (int)level0["cols"];
                int rows = (int)level0["rows"];

                var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var entry in items)
                {
                    Assert.True(seenIds.Add(entry.Id), $"Duplicate id '{entry.Id}' in '{sceneId}'");
                    var itemDef = catalog.Find(entry.ItemId);
                    Assert.NotNull(itemDef);
                    Assert.True(entry.X >= 0 && entry.X <= cols - itemDef.W,
                        $"{sceneId}/{entry.Id} ({entry.ItemId}): X={entry.X}, W={itemDef.W}, cols={cols}");
                    Assert.True(entry.Y >= 0 && entry.Y <= rows - itemDef.H,
                        $"{sceneId}/{entry.Id} ({entry.ItemId}): Y={entry.Y}, H={itemDef.H}, rows={rows}");
                }
            }
        }
    }
}
