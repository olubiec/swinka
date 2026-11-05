using System;
using System.IO;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigRoomsMigrationTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null) throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            return Path.Combine(dir, relativePath);
        }

        private static PigRoomConfig Config() => PigRoomConfig.Load(File.ReadAllText(RepoFile("assets/data/pig_rooms.json")));

        private static WorldItemCatalog Items() => WorldItemCatalog.Load(File.ReadAllText(RepoFile("assets/data/world_items.json")));

        private static int Uid;

        private static string NextUid() => "u" + (++Uid);

        private static GameState ThreePigState()
        {
            var state = new GameState();
            state.Roster.Add(new PigProfile("Kuki") { Id = "p1", NamedId = "kuki" });
            state.Roster.Add(new PigProfile("Rex") { Id = "p2" });
            state.Roster.Add(new PigProfile("Old") { Id = "p3", Memorial = true });
            return state;
        }

        [Fact]
        public void ThreeRosterPigsGetThreeRooms_AndSecondCallCreatesNone()
        {
            var state = ThreePigState();
            var cfg = Config();
            var items = Items();

            Assert.Equal(3, state.EnsurePigRooms(cfg, items, NextUid));
            // Canonical room key is NamedId ?? Id (DECISIONS D1, approved by owner): Kuki -> "kuki".
            foreach (var key in new[] { "kuki", "p2", "p3" })
            {
                Assert.True(state.World.Rooms.ContainsKey(cfg.RoomId(key)));
                Assert.Contains(key, state.World.PigRoomsEnsured);
            }
            Assert.Equal(cfg.NameFor("Old", true), state.World.Rooms[cfg.RoomId("p3")].Name);
            Assert.Equal(cfg.NameFor("Kuki", false), state.World.Rooms[cfg.RoomId("kuki")].Name);
            Assert.NotEmpty(state.World.Rooms[cfg.RoomId("kuki")].Items);

            Assert.Equal(0, state.EnsurePigRooms(cfg, items, NextUid));
        }

        [Fact]
        public void ExistingRoomsDecorAndSalonStayUntouched()
        {
            var state = ThreePigState();
            var cfg = Config();
            var items = Items();
            state.Decor = new DecorState();
            state.Decor.Equipped["wallpaper"] = "wallpaper_mint";
            var salon = new RoomLayout { Wallpaper = "wallpaper_sky", Floor = "floor_wood_light" };
            salon.Items.Add(new PlacedItem { Uid = "s1", ItemId = "cushion_big", X = 3, Y = 4 });
            state.World.Rooms["salon"] = salon;
            var own = new RoomLayout { Wallpaper = "wallpaper_peach", Name = "Custom" };
            state.World.Rooms[cfg.RoomId("p2")] = own;

            Assert.Equal(2, state.EnsurePigRooms(cfg, items, NextUid));

            Assert.Same(salon, state.World.Rooms["salon"]);
            Assert.Single(salon.Items);
            Assert.Equal("wallpaper_sky", salon.Wallpaper);
            Assert.Same(own, state.World.Rooms[cfg.RoomId("p2")]);
            Assert.Equal("Custom", own.Name);
            Assert.Empty(own.Items);
            Assert.Equal("wallpaper_mint", state.Decor.Equipped["wallpaper"]);
        }

        [Fact]
        public void OldSaveJson_LoadsAndGetsRooms()
        {
            var tempDir = Path.Combine(Path.GetTempPath(), "Cuy_PigRooms_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                File.WriteAllText(Path.Combine(tempDir, "save.json"), @"{
                    ""Version"": 2,
                    ""Name"": ""Kropka"",
                    ""Clovers"": 321,
                    ""Needs"": { ""fullness"": 80, ""vitamin_c"": 70, ""energy"": 90, ""mood"": 85, ""cleanliness"": 95, ""teeth"": 50 }
                }");
                var state = new SaveSystem(tempDir).Load().State;
                var cfg = Config();
                var items = Items();

                int created = state.EnsurePigRooms(cfg, items, NextUid);

                Assert.True(created >= 1);
                Assert.Equal(state.Roster.Count, created);
                Assert.Equal(321, state.Clovers);
                Assert.Equal(0, state.EnsurePigRooms(cfg, items, NextUid));
                string json = JsonConvert.SerializeObject(state);
                var back = JsonConvert.DeserializeObject<GameState>(json);
                Assert.Equal(0, back.EnsurePigRooms(cfg, items, NextUid));
                Assert.True(back.World.Rooms.ContainsKey(cfg.RoomId(state.Roster[0].Id)));
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public void PreWorldSave_WorksAfterEnsureWorldThenEnsurePigRooms()
        {
            var state = ThreePigState();
            state.Decor = new DecorState();
            state.Decor.Equipped["wallpaper"] = "wallpaper_mint";
            var cfg = Config();
            var items = Items();

            state.EnsureWorld(items, ItemCatalog.LoadDefault());
            int created = state.EnsurePigRooms(cfg, items, NextUid);

            Assert.Equal(3, created);
            Assert.True(state.World.Rooms.ContainsKey("salon"));
            Assert.Equal("wallpaper_mint", state.World.Rooms["salon"].Wallpaper);
            Assert.Equal(1 + 3, state.World.Rooms.Count);
            Assert.Equal(GameState.CurrentVersion, state.Version);
        }
    }
}
