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

        [Fact]
        public void S9_ParkDefaultsInBoundsAndNonOverlapping()
        {
            var defaults = LoadRepoDefaults();
            var codeDefaults = OutdoorDefaults.CreateCodeDefaults();
            var catalog = LoadRepoItems();
            var world = new WorldState();

            OutdoorSeed.Seed(world, "park", defaults, ActiveBalance());

            var jsonPark = defaults.ForScene("park");
            var codePark = codeDefaults.ForScene("park");
            Assert.Equal(11, jsonPark.Count);
            Assert.Equal(jsonPark.Count, codePark.Count);
            for (int i = 0; i < jsonPark.Count; i++)
            {
                Assert.Equal(jsonPark[i].Id, codePark[i].Id);
                Assert.Equal(jsonPark[i].ItemId, codePark[i].ItemId);
                Assert.Equal(jsonPark[i].X, codePark[i].X);
                Assert.Equal(jsonPark[i].Y, codePark[i].Y);
            }

            var placed = world.Rooms["park"].Items;
            Assert.Equal(jsonPark.Count, placed.Count);

            for (int i = 0; i < placed.Count; i++)
            {
                var a = placed[i];
                var defA = catalog.Find(a.ItemId);
                Assert.NotNull(defA);
                Assert.True(a.X >= 0 && a.X + defA.W <= 16, $"{a.Uid} ({a.ItemId}): X={a.X}, W={defA.W}");
                Assert.True(a.Y >= 0 && a.Y + defA.H <= 9, $"{a.Uid} ({a.ItemId}): Y={a.Y}, H={defA.H}");

                for (int j = i + 1; j < placed.Count; j++)
                {
                    var b = placed[j];
                    var defB = catalog.Find(b.ItemId);
                    Assert.NotNull(defB);
                    bool overlaps =
                        a.X < b.X + defB.W && a.X + defA.W > b.X &&
                        a.Y < b.Y + defB.H && a.Y + defA.H > b.Y;
                    Assert.False(overlaps,
                        $"Overlap in park: {a.Uid} ({a.ItemId} @ {a.X},{a.Y} {defA.W}x{defA.H}) vs {b.Uid} ({b.ItemId} @ {b.X},{b.Y} {defB.W}x{defB.H})");
                }
            }
        }

        [Fact]
        public void S10_ParkPartialAndLegacySaveBackfillsAndRespectsRemovals()
        {
            var defaults = LoadRepoDefaults();
            var catalog = LoadRepoItems();
            var balance = ActiveBalance();

            // Partial already-seeded save missing 5 (or 6) items in park.
            var partialWorld = new WorldState();
            partialWorld.OutdoorSeeded.Add("park");
            partialWorld.Rooms["park"] = new RoomLayout
            {
                Items =
                {
                    new PlacedItem { Uid = "fx:park:gazebo", ItemId = "gazebo", X = 4, Y = 2, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:bench_left", ItemId = "bench_park", X = 7, Y = 8, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:bridge", ItemId = "bridge_wood", X = 10, Y = 5, Movable = true, Removable = false },
                    new PlacedItem { Uid = "fx:park:tree_1", ItemId = "tree_big", X = 0, Y = 1, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:lamp_left", ItemId = "lamp_post", X = 1, Y = 7, Movable = true, Removable = true }
                }
            };

            OutdoorSeed.Seed(partialWorld, "park", defaults, balance);

            var parkItems = partialWorld.Rooms["park"].Items;
            Assert.Equal(defaults.ForScene("park").Count, parkItems.Count);
            foreach (var def in defaults.ForScene("park"))
            {
                Assert.Contains(parkItems, i => i.Uid == $"fx:park:{def.Id}");
            }

            // Subsequent removals after backfill must stay removed.
            Assert.True(RoomLayoutOps.Remove(partialWorld.Rooms["park"], "fx:park:bench_right", out _));
            OutdoorSeed.Seed(partialWorld, "park", defaults, balance);
            Assert.DoesNotContain(partialWorld.Rooms["park"].Items, i => i.Uid == "fx:park:bench_right");

            // Legacy 24x12 OOB park save relocates OOB items inside 16x9 without duplicating.
            var legacyWorld = new WorldState();
            legacyWorld.OutdoorSeeded.Add("park");
            legacyWorld.Rooms["park"] = new RoomLayout
            {
                Items =
                {
                    new PlacedItem { Uid = "fx:park:gazebo", ItemId = "gazebo", X = 4, Y = 2, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:bench_left", ItemId = "bench_park", X = 7, Y = 8, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:bench_right", ItemId = "bench_park", X = 21, Y = 9, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:bridge", ItemId = "bridge_wood", X = 10, Y = 5, Movable = true, Removable = false },
                    new PlacedItem { Uid = "fx:park:tree_1", ItemId = "tree_big", X = 0, Y = 1, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:tree_2", ItemId = "tree_big", X = 13, Y = 1, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:tree_3", ItemId = "tree_big", X = 16, Y = 1, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:tree_4", ItemId = "tree_big", X = 20, Y = 1, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:lamp_left", ItemId = "lamp_post", X = 1, Y = 7, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:lamp_mid", ItemId = "lamp_post", X = 17, Y = 7, Movable = true, Removable = true },
                    new PlacedItem { Uid = "fx:park:lamp_right", ItemId = "lamp_post", X = 21, Y = 10, Movable = true, Removable = true }
                }
            };

            OutdoorSeed.Seed(legacyWorld, "park", defaults, balance);

            Assert.Equal(11, legacyWorld.Rooms["park"].Items.Count);
            foreach (var item in legacyWorld.Rooms["park"].Items)
            {
                var def = catalog.Find(item.ItemId);
                Assert.NotNull(def);
                Assert.True(item.X >= 0 && item.X + def.W <= 16, $"{item.Uid}: X={item.X}, W={def.W}");
                Assert.True(item.Y >= 0 && item.Y + def.H <= 9, $"{item.Uid}: Y={item.Y}, H={def.H}");
            }
        }
    }
}
