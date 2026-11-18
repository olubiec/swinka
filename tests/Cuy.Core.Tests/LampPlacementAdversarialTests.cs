using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;
using Xunit.Abstractions;

namespace Cuy.Core.Tests
{
    public class LampPlacementAdversarialTests
    {
        private readonly ITestOutputHelper _output;

        public LampPlacementAdversarialTests(ITestOutputHelper output)
        {
            _output = output;
        }

        private static WorldItemCatalog LoadCatalog()
        {
            string path = RepoFile.Find("assets/data/world_items.json");
            return WorldItemCatalog.Load(File.ReadAllText(path));
        }

        private static JObject LoadAtlas()
        {
            string path = RepoFile.Find("assets/world/atlas.json");
            return JObject.Parse(File.ReadAllText(path));
        }

        [Fact]
        public void C1_LampGridVerdictTable_GeneratedAndSavedForEditorParity()
        {
            var catalog = LoadCatalog();
            var lampIds = new[]
            {
                "lamp_mushroom",
                "lamp_floor",
                "lamp_salt",
                "lamp_post",
                "lamp_oil",
                "lamp_arc",
                "fairy_lights"
            };

            const int cols = 12;
            const int rows = 7;
            const int wallRows = 2;

            var table = new JObject
            {
                ["place"] = "salon",
                ["cols"] = cols,
                ["rows"] = rows,
                ["wallRows"] = wallRows,
                ["lamps"] = new JObject()
            };

            var lampsObj = (JObject)table["lamps"]!;

            foreach (var id in lampIds)
            {
                var def = catalog.Find(id);
                Assert.NotNull(def);

                var room = new RoomLayout();
                var grid = new JArray();

                for (int cy = 0; cy < rows; cy++)
                {
                    var rowArr = new JArray();
                    for (int cx = 0; cx < cols; cx++)
                    {
                        var res = RoomLayoutOps.CanPlace(room, cols, rows, wallRows, def, "salon", cx, cy, null, catalog);
                        rowArr.Add( new JObject
                        {
                            ["cx"] = cx,
                            ["cy"] = cy,
                            ["verdict"] = res.ToString(),
                            ["ok"] = res == PlaceResult.Ok
                        });
                    }
                    grid.Add(rowArr);
                }

                lampsObj[id] = new JObject
                {
                    ["id"] = id,
                    ["layer"] = def.Layer,
                    ["w"] = def.W,
                    ["h"] = def.H,
                    ["footW"] = def.EffectiveFootW,
                    ["footH"] = def.EffectiveFootH,
                    ["spriteH"] = def.EffectiveSpriteH,
                    ["cells"] = grid
                };
            }

            // Also include R25 section 6 specific test vectors
            var r25Cases = new JArray();
            void AddCase(string cid, string itemId, string place, int c, int r, int wr, int cx, int cy, int px, int py, RoomLayout rm, PlaceResult expected)
            {
                var def = catalog.Find(itemId);
                var actual = RoomLayoutOps.CanPlace(rm, c, r, wr, def, place, cx, cy, null, catalog);
                Assert.Equal(expected, actual);
                r25Cases.Add(new JObject
                {
                    ["id"] = cid,
                    ["itemId"] = itemId,
                    ["place"] = place,
                    ["cols"] = c,
                    ["rows"] = r,
                    ["wallRows"] = wr,
                    ["cx"] = cx,
                    ["cy"] = cy,
                    ["px"] = px,
                    ["py"] = py,
                    ["verdict"] = actual.ToString(),
                    ["ok"] = actual == PlaceResult.Ok
                });
            }

            AddCase("T1", "lamp_mushroom", "salon", 12, 7, 2, 0, 2, 8, 48, new RoomLayout(), PlaceResult.Ok);
            AddCase("T2", "lamp_floor", "salon", 12, 7, 2, 5, 2, 88, 48, new RoomLayout(), PlaceResult.Ok);
            AddCase("T3", "lamp_mushroom", "salon", 12, 7, 2, 0, 1, 8, 32, new RoomLayout(), PlaceResult.WrongLayerArea);
            AddCase("T4", "lamp_floor", "salon", 12, 7, 2, 0, 0, 8, 16, new RoomLayout(), PlaceResult.WrongLayerArea);
            AddCase("T5", "lamp_mushroom", "salon", 12, 7, 2, 0, 6, 8, 112, new RoomLayout(), PlaceResult.Ok);
            AddCase("T6", "lamp_arc", "salon", 12, 7, 2, 2, 0, 48, 16, new RoomLayout(), PlaceResult.Ok);
            AddCase("T7", "lamp_arc", "salon", 12, 7, 2, 2, 1, 48, 32, new RoomLayout(), PlaceResult.Ok);
            AddCase("T8", "lamp_arc", "salon", 12, 7, 2, 2, 2, 48, 48, new RoomLayout(), PlaceResult.WrongLayerArea);
            AddCase("T9", "fairy_lights", "salon", 12, 7, 2, 1, 0, 40, 16, new RoomLayout(), PlaceResult.Ok);
            AddCase("T10", "fairy_lights", "salon", 12, 7, 2, 1, 2, 40, 48, new RoomLayout(), PlaceResult.WrongLayerArea);
            AddCase("T11", "lamp_salt", "salon", 12, 7, 2, 3, 2, 56, 48, new RoomLayout(), PlaceResult.Ok);
            AddCase("T12", "lamp_salt", "salon", 12, 7, 2, 3, 1, 56, 32, new RoomLayout(), PlaceResult.WrongLayerArea);

            var roomT13 = new RoomLayout();
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(roomT13, 12, 7, 2, catalog.Find("lamp_floor"), "salon", 3, 2, () => "u_lf", catalog));
            AddCase("T13", "lamp_mushroom", "salon", 12, 7, 2, 3, 2, 56, 48, roomT13, PlaceResult.Overlap);

            var roomT14 = new RoomLayout();
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(roomT14, 12, 7, 2, catalog.Find("side_table"), "salon", 3, 2, () => "u_st", catalog));
            AddCase("T14", "lamp_mushroom", "salon", 12, 7, 2, 4, 2, 72, 48, roomT14, PlaceResult.Ok);

            var roomT15 = new RoomLayout();
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(roomT15, 12, 7, 2, catalog.Find("sofa_cosy"), "salon", 1, 2, () => "u_sf", catalog));
            var picDef = catalog.Find("picture_small") ?? catalog.Find("memory_frame") ?? new WorldItemDefinition("picture_small", "Picture", new[] { "house" }, 1, 1, 10, 1, "wall", "picture_small");
            var resT15 = RoomLayoutOps.CanPlace(roomT15, 12, 7, 2, picDef, "salon", 2, 1, null, catalog);
            Assert.Equal(PlaceResult.Ok, resT15);
            r25Cases.Add(new JObject
            {
                ["id"] = "T15",
                ["itemId"] = picDef.Id,
                ["place"] = "salon",
                ["cols"] = 12,
                ["rows"] = 7,
                ["wallRows"] = 2,
                ["cx"] = 2,
                ["cy"] = 1,
                ["px"] = 40,
                ["py"] = 32,
                ["verdict"] = resT15.ToString(),
                ["ok"] = resT15 == PlaceResult.Ok
            });

            AddCase("T16", "lamp_oil", "garden", 16, 9, 0, 0, 5, 8, 96, new RoomLayout(), PlaceResult.Ok);
            AddCase("T17", "lamp_post", "salon", 12, 7, 2, 0, 2, 8, 48, new RoomLayout(), PlaceResult.NotAllowedHere);

            table["r25Cases"] = r25Cases;

            string slnPath = RepoFile.Find("Cuy.sln");
            string repoRoot = Path.GetDirectoryName(slnPath)!;
            string outDir = Path.Combine(repoRoot, "tests", "Cuy.Core.Tests", "TestResults");
            Directory.CreateDirectory(outDir);
            string outFile = Path.Combine(outDir, "lamp-parity.json");
            File.WriteAllText(outFile, table.ToString(Formatting.Indented));

            Assert.True(File.Exists(outFile));
        }

        [Fact]
        public void C2_FloorLamp_AcceptedInBackWallRow_RejectedInWallRows()
        {
            var catalog = LoadCatalog();
            var room = new RoomLayout();
            var floorLamps = new[] { "lamp_mushroom", "lamp_floor", "lamp_salt" };

            foreach (var id in floorLamps)
            {
                var def = catalog.Find(id);
                Assert.NotNull(def);
                Assert.Equal("floor", def.Layer);
                Assert.Equal(1, def.EffectiveFootH);

                for (int cx = 0; cx < 12; cx++)
                {
                    // Wall rows cy = 0..1 -> rejected
                    Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, def, "salon", cx, 0, null, catalog));
                    Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, def, "salon", cx, 1, null, catalog));

                    // Back-wall floor row cy = 2 (and all floor rows 2..6) -> accepted
                    for (int cy = 2; cy <= 6; cy++)
                    {
                        Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, def, "salon", cx, cy, null, catalog));
                    }
                }
            }
        }

        [Fact]
        public void C3_WallLayerLamp_OnlyInWallRows_NeverOnFloorOrOutdoor()
        {
            var catalog = LoadCatalog();
            var room = new RoomLayout();
            var wallLamps = new[] { "lamp_arc", "fairy_lights" };

            foreach (var id in wallLamps)
            {
                var def = catalog.Find(id);
                Assert.NotNull(def);
                Assert.Equal("wall", def.Layer);
                Assert.Equal(1, def.EffectiveFootH);

                int footW = def.EffectiveFootW;

                for (int cx = 0; cx < 12; cx++)
                {
                    for (int cy = 0; cy < 7; cy++)
                    {
                        var res = RoomLayoutOps.CanPlace(room, 12, 7, 2, def, "salon", cx, cy, null, catalog);
                        if (cx + footW > 12)
                        {
                            Assert.Equal(PlaceResult.OutOfBounds, res);
                        }
                        else if (cy < 2)
                        {
                            Assert.Equal(PlaceResult.Ok, res);
                        }
                        else
                        {
                            Assert.Equal(PlaceResult.WrongLayerArea, res);
                        }
                    }
                }

                // In outdoor room with wallRows = 0 (even if place restriction bypassed)
                var syntheticWallOutdoor = new WorldItemDefinition("wall_test", "Wall Test", new[] { "garden" }, 2, 3, 10, 1, "wall", "lamp_arc", footW: 2, footH: 1, spriteH: 3);
                Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(new RoomLayout(), 16, 9, 0, syntheticWallOutdoor, "garden", 0, 0, null, catalog));
            }
        }

        [Fact]
        public void C4_OverlapOfTwoLampBasesRejected_BaseNextToFurnitureAccepted()
        {
            var catalog = LoadCatalog();
            var room = new RoomLayout();

            var mushroom = catalog.Find("lamp_mushroom");
            var floorLamp = catalog.Find("lamp_floor");
            var saltLamp = catalog.Find("lamp_salt");
            var arcLamp = catalog.Find("lamp_arc");
            var fairy = catalog.Find("fairy_lights");
            var chair = catalog.Find("side_table");
            var sofa = catalog.Find("sofa_cosy");

            // Place floor lamp at (3, 2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, floorLamp, "salon", 3, 2, () => "lf1", catalog));

            // Exact overlap with another lamp base -> Overlap
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 12, 7, 2, mushroom, "salon", 3, 2, null, catalog));
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 12, 7, 2, saltLamp, "salon", 3, 2, null, catalog));

            // Immediately vertical neighbor (3, 3) -> Ok because foot_h is 1 (even though sprite_h is 2!)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, mushroom, "salon", 3, 3, null, catalog));

            // Immediately horizontal neighbors (2, 2) and (4, 2) -> Ok
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, mushroom, "salon", 2, 2, null, catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, mushroom, "salon", 4, 2, null, catalog));

            // Place 1x1 furniture at (5, 2) and 3x2 sofa at (6, 2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, chair, "salon", 5, 2, () => "ch1", catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, sofa, "salon", 6, 2, () => "sf1", catalog));

            // Lamp base right next to furniture at (4, 2), (5, 3), (9, 2) -> Ok
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, mushroom, "salon", 4, 2, () => "lm1", catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, saltLamp, "salon", 5, 3, () => "ls1", catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, floorLamp, "salon", 9, 2, () => "lf2", catalog));

            // Wall lamps: place lamp_arc (foot 2x1) at (2, 0)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, arcLamp, "salon", 2, 0, () => "la1", catalog));
            // Overlapping wall cells (2, 0) or (3, 0) -> Overlap
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 12, 7, 2, fairy, "salon", 1, 0, null, catalog));
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 12, 7, 2, arcLamp, "salon", 3, 0, null, catalog));
            // Row below on wall (2, 1) -> Ok because lamp_arc foot_h = 1
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, arcLamp, "salon", 2, 1, null, catalog));
        }

        [Fact]
        public void C5_MoveAppliesSameRulesAsPlaceForAllLamps()
        {
            var catalog = LoadCatalog();
            var testConfigs = new[]
            {
                (id: "lamp_mushroom", place: "salon", cols: 12, rows: 7, wallRows: 2, startX: 5, startY: 4, blockId: "side_table", blockX: 2, blockY: 3),
                (id: "lamp_floor", place: "salon", cols: 12, rows: 7, wallRows: 2, startX: 5, startY: 4, blockId: "side_table", blockX: 2, blockY: 3),
                (id: "lamp_salt", place: "salon", cols: 12, rows: 7, wallRows: 2, startX: 5, startY: 4, blockId: "side_table", blockX: 2, blockY: 3),
                (id: "lamp_arc", place: "salon", cols: 12, rows: 7, wallRows: 2, startX: 5, startY: 0, blockId: "wall_clock", blockX: 2, blockY: 1),
                (id: "fairy_lights", place: "salon", cols: 12, rows: 7, wallRows: 2, startX: 5, startY: 0, blockId: "wall_clock", blockX: 2, blockY: 1),
                (id: "lamp_post", place: "park", cols: 24, rows: 12, wallRows: 0, startX: 5, startY: 5, blockId: "bench_park", blockX: 2, blockY: 3),
                (id: "lamp_oil", place: "garden", cols: 16, rows: 9, wallRows: 0, startX: 5, startY: 5, blockId: "bird_bath", blockX: 2, blockY: 3)
            };

            foreach (var cfg in testConfigs)
            {
                var def = catalog.Find(cfg.id);
                var blockerDef = catalog.Find(cfg.blockId);
                Assert.NotNull(def);
                Assert.NotNull(blockerDef);

                for (int ty = -1; ty <= cfg.rows; ty++)
                {
                    for (int tx = -1; tx <= cfg.cols; tx++)
                    {
                        var roomForPlace = new RoomLayout();
                        Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(roomForPlace, cfg.cols, cfg.rows, cfg.wallRows, blockerDef, cfg.place, cfg.blockX, cfg.blockY, () => "blk", catalog));
                        var placeVerdict = RoomLayoutOps.Place(roomForPlace, cfg.cols, cfg.rows, cfg.wallRows, def, cfg.place, tx, ty, () => "lmp", catalog);

                        var roomForMove = new RoomLayout();
                        Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(roomForMove, cfg.cols, cfg.rows, cfg.wallRows, blockerDef, cfg.place, cfg.blockX, cfg.blockY, () => "blk", catalog));
                        Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(roomForMove, cfg.cols, cfg.rows, cfg.wallRows, def, cfg.place, cfg.startX, cfg.startY, () => "lmp", catalog));

                        var moveVerdict = RoomLayoutOps.Move(roomForMove, cfg.cols, cfg.rows, cfg.wallRows, catalog, cfg.place, "lmp", tx, ty);

                        Assert.Equal(placeVerdict, moveVerdict);
                        var movedItem = roomForMove.Items.First(i => i.Uid == "lmp");
                        if (moveVerdict == PlaceResult.Ok)
                        {
                            Assert.Equal(tx, movedItem.X);
                            Assert.Equal(ty, movedItem.Y);
                        }
                        else
                        {
                            Assert.Equal(cfg.startX, movedItem.X);
                            Assert.Equal(cfg.startY, movedItem.Y);
                        }
                    }
                }
            }
        }

        [Fact]
        public void C6_RoomSizes_5000RandomPlacements_BoundsNeverExceeded_EveryAcceptedLayoutValid()
        {
            var catalog = LoadCatalog();
            var rng = new Random(20261118);
            var roomSizes = new[]
            {
                (cols: 10, rows: 6, wallRows: 2),
                (cols: 12, rows: 7, wallRows: 2),
                (cols: 14, rows: 8, wallRows: 2),
                (cols: 16, rows: 8, wallRows: 2),
                (cols: 20, rows: 9, wallRows: 2)
            };

            var pool = new[]
            {
                "lamp_mushroom", "lamp_floor", "lamp_salt", "lamp_arc", "fairy_lights",
                "sofa_cosy", "armchair", "bookshelf", "side_table", "window_sun",
                "wall_clock", "shelf_small", "rug_fringed"
            }.Select(id => catalog.Find(id)).Where(d => d != null).ToArray();

            int totalOps = 5000;
            int perSize = totalOps / roomSizes.Length;

            foreach (var sz in roomSizes)
            {
                var room = new RoomLayout();
                int uidCounter = 0;

                for (int i = 0; i < perSize; i++)
                {
                    if (room.Items.Count > 18 && rng.NextDouble() < 0.25)
                    {
                        room.Items.Clear();
                    }

                    var def = pool[rng.Next(pool.Length)];
                    int rx = rng.Next(-2, sz.cols + 3);
                    int ry = rng.Next(-2, sz.rows + 3);

                    bool doMove = room.Items.Count > 0 && rng.NextDouble() < 0.35;
                    if (doMove)
                    {
                        var existing = room.Items[rng.Next(room.Items.Count)];
                        var existingDef = catalog.Find(existing.ItemId);
                        var res = RoomLayoutOps.Move(room, sz.cols, sz.rows, sz.wallRows, existingDef, "salon", existing.Uid, rx, ry, catalog);
                        if (res == PlaceResult.Ok)
                        {
                            Assert.Equal(rx, existing.X);
                            Assert.Equal(ry, existing.Y);
                        }
                    }
                    else
                    {
                        string uid = "u_" + (++uidCounter);
                        RoomLayoutOps.Place(room, sz.cols, sz.rows, sz.wallRows, def, "salon", rx, ry, () => uid, catalog);
                    }

                    // Validate entire layout invariants after every operation
                    for (int a = 0; a < room.Items.Count; a++)
                    {
                        var ia = room.Items[a];
                        var da = catalog.Find(ia.ItemId)!;
                        int aw = da.EffectiveFootW;
                        int ah = da.EffectiveFootH;
                        string alayer = (da.Layer ?? "floor").ToLowerInvariant();

                        Assert.True(ia.X >= 0 && ia.X + aw <= sz.cols, $"Item {ia.ItemId} X={ia.X} w={aw} out of cols={sz.cols}");
                        Assert.True(ia.Y >= 0 && ia.Y + ah <= sz.rows, $"Item {ia.ItemId} Y={ia.Y} h={ah} out of rows={sz.rows}");

                        if (alayer == "wall")
                        {
                            Assert.True(ia.Y >= 0 && ia.Y + ah <= sz.wallRows, $"Wall item {ia.ItemId} Y={ia.Y} h={ah} outside wallRows={sz.wallRows}");
                        }
                        else
                        {
                            Assert.True(ia.Y >= sz.wallRows, $"Floor item {ia.ItemId} Y={ia.Y} inside wallRows={sz.wallRows}");
                        }

                        for (int b = a + 1; b < room.Items.Count; b++)
                        {
                            var ib = room.Items[b];
                            var db = catalog.Find(ib.ItemId)!;
                            string blayer = (db.Layer ?? "floor").ToLowerInvariant();
                            if (alayer == blayer)
                            {
                                int bw = db.EffectiveFootW;
                                int bh = db.EffectiveFootH;
                                bool overlaps = !(ia.X + aw <= ib.X || ib.X + bw <= ia.X || ia.Y + ah <= ib.Y || ib.Y + bh <= ia.Y);
                                Assert.False(overlaps, $"Overlap in {sz.cols}x{sz.rows} between {ia.ItemId}@({ia.X},{ia.Y}) and {ib.ItemId}@({ib.X},{ib.Y})");
                            }
                        }
                    }
                }
            }
        }

        [Fact]
        public void C7_OldSavesWithLampsAtLegacyPositions_LoadAndStayValid()
        {
            var catalog = LoadCatalog();
            var itemCatalog = ItemCatalog.LoadDefault();

            string legacySaveJson = @"{
                ""Name"": ""LegacyCuy"",
                ""Version"": 2,
                ""Clovers"": 500,
                ""World"": {
                    ""LegacyDecorMigrated"": true,
                    ""OwnedItems"": {
                        ""lamp_mushroom"": 2,
                        ""lamp_floor"": 2,
                        ""lamp_salt"": 1,
                        ""fairy_lights"": 1,
                        ""lamp_post"": 1,
                        ""lamp_oil"": 1
                    },
                    ""Rooms"": {
                        ""salon"": {
                            ""Name"": ""Salon"",
                            ""Wallpaper"": """",
                            ""Floor"": """",
                            ""Items"": [
                                { ""Uid"": ""leg_mush_2"", ""ItemId"": ""lamp_mushroom"", ""X"": 0, ""Y"": 2, ""Flip"": false },
                                { ""Uid"": ""leg_mush_5"", ""ItemId"": ""lamp_mushroom"", ""X"": 11, ""Y"": 5, ""Flip"": true },
                                { ""Uid"": ""leg_flr_3"", ""ItemId"": ""lamp_floor"", ""X"": 4, ""Y"": 3, ""Flip"": false },
                                { ""Uid"": ""leg_flr_5"", ""ItemId"": ""lamp_floor"", ""X"": 8, ""Y"": 5, ""Flip"": false },
                                { ""Uid"": ""leg_salt_6"", ""ItemId"": ""lamp_salt"", ""X"": 2, ""Y"": 6, ""Flip"": false },
                                { ""Uid"": ""leg_fairy_0"", ""ItemId"": ""fairy_lights"", ""X"": 1, ""Y"": 0, ""Flip"": false }
                            ]
                        },
                        ""garden"": {
                            ""Name"": ""Garden"",
                            ""Items"": [
                                { ""Uid"": ""leg_oil"", ""ItemId"": ""lamp_oil"", ""X"": 3, ""Y"": 4, ""Flip"": false }
                            ]
                        },
                        ""park"": {
                            ""Name"": ""Park"",
                            ""Items"": [
                                { ""Uid"": ""leg_post"", ""ItemId"": ""lamp_post"", ""X"": 1, ""Y"": 7, ""Flip"": false }
                            ]
                        }
                    }
                }
            }";

            var state = JsonConvert.DeserializeObject<GameState>(legacySaveJson, SaveSystem.JsonSettings);
            Assert.NotNull(state);
            state.EnsureWorld(catalog, itemCatalog);

            var salon = state.World.Rooms["salon"];
            Assert.NotNull(salon);
            Assert.Equal(6, salon.Items.Count);

            foreach (var placed in salon.Items)
            {
                var def = catalog.Find(placed.ItemId);
                Assert.NotNull(def);
                var verdict = RoomLayoutOps.CanPlace(salon, 12, 7, 2, def, "salon", placed.X, placed.Y, ignoreUid: placed.Uid, catalog: catalog);
                Assert.Equal(PlaceResult.Ok, verdict);
            }

            // Round-trip serialization preserves items and validity
            string roundTripJson = SaveSystem.Serialize(state);
            var reloaded = JsonConvert.DeserializeObject<GameState>(roundTripJson, SaveSystem.JsonSettings);
            Assert.NotNull(reloaded);
            Assert.Equal(6, reloaded.World.Rooms["salon"].Items.Count);
        }

        [Fact]
        public void C8_DataCheck_EveryLampInWorldItemsHasNewFieldsOrDefaultsAndSpriteInAtlas()
        {
            var catalog = LoadCatalog();
            var atlas = LoadAtlas();
            var atlasItems = (JObject)atlas["items"]!;
            Assert.NotNull(atlasItems);

            var requiredLamps = new[]
            {
                (id: "lamp_mushroom", w: 1, h: 2, footW: 1, footH: 1, spriteH: 2, layer: "floor"),
                (id: "lamp_floor", w: 1, h: 2, footW: 1, footH: 1, spriteH: 2, layer: "floor"),
                (id: "lamp_arc", w: 2, h: 3, footW: 2, footH: 1, spriteH: 3, layer: "wall"),
                (id: "lamp_salt", w: 1, h: 1, footW: 1, footH: 1, spriteH: 1, layer: "floor"),
                (id: "lamp_post", w: 1, h: 1, footW: 1, footH: 1, spriteH: 1, layer: "floor"),
                (id: "lamp_oil", w: 1, h: 1, footW: 1, footH: 1, spriteH: 1, layer: "floor"),
                (id: "fairy_lights", w: 3, h: 1, footW: 3, footH: 1, spriteH: 1, layer: "wall")
            };

            foreach (var expected in requiredLamps)
            {
                var def = catalog.Find(expected.id);
                Assert.NotNull(def);
                Assert.Equal(expected.w, def.W);
                Assert.Equal(expected.h, def.H);
                Assert.Equal(expected.footW, def.EffectiveFootW);
                Assert.Equal(expected.footH, def.EffectiveFootH);
                Assert.Equal(expected.spriteH, def.EffectiveSpriteH);
                Assert.Equal(expected.layer, def.Layer);

                var atlasEntry = atlasItems[expected.id] as JObject;
                Assert.NotNull(atlasEntry);
                string? relFile = (string?)atlasEntry["file"];
                Assert.False(string.IsNullOrWhiteSpace(relFile));

                string fullSpritePath = RepoFile.Find(Path.Combine("assets", "world", relFile!));
                Assert.True(File.Exists(fullSpritePath), $"Missing sprite file for {expected.id}: {fullSpritePath}");
            }

            // Check lamp_arc anchor is [16, 16] per R25 section 3
            var arcAtlas = (JObject)atlasItems["lamp_arc"]!;
            var arcAnchor = arcAtlas["anchor"] as JArray;
            Assert.NotNull(arcAnchor);
            Assert.Equal(16, (int)arcAnchor[0]);
            Assert.Equal(16, (int)arcAnchor[1]);
        }

        [Fact]
        public void C9_HangingItemsAndPicturesOverFurniture_StillAccepted()
        {
            var catalog = LoadCatalog();
            var room = new RoomLayout();

            // Place tall/wide floor furniture along the back wall (cy = 2)
            var sofa = catalog.Find("sofa_cosy")!; // 3x2 floor
            var bookshelf = catalog.Find("bookshelf")!; // 2x3 floor
            var floorLamp = catalog.Find("lamp_floor")!; // 1x2 floor (foot 1x1)

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, sofa, "salon", 1, 2, () => "sf1", catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, bookshelf, "salon", 5, 2, () => "bs1", catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, floorLamp, "salon", 8, 2, () => "lf1", catalog));

            // Place wall items directly above/overlapping the visual columns & rows
            var pictureSmall = new WorldItemDefinition("picture_small", "Small picture", new[] { "house" }, 1, 1, 40, 1, "wall", "picture_pig");
            var memoryFrame = catalog.Find("memory_frame")!;
            var framesGallery = catalog.Find("frames_gallery")!;
            var lampArc = catalog.Find("lamp_arc")!;
            var fairyLights = catalog.Find("fairy_lights")!;

            // Picture at (2, 1) over sofa at (1, 2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, pictureSmall, "salon", 2, 1, () => "pic1", catalog));
            // Memory frame at (1, 1) over sofa
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, memoryFrame, "salon", 1, 1, () => "mf1", catalog));
            // lamp_arc at (1, 0) above sofa and picture (foot_h=1 at cy=0, does not overlap cy=1 picture!)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, lampArc, "salon", 1, 0, () => "la1", catalog));
            // frames_gallery at (5, 1) over bookshelf at (5, 2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, framesGallery, "salon", 5, 1, () => "fg1", catalog));
            // fairy_lights at (8, 1) directly behind lamp_floor top sprite at (8, 2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, fairyLights, "salon", 8, 1, () => "fl1", catalog));
        }
    }
}
