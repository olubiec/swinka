using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Cuy.Core;
using Cuy.Core.Care;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
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
    public class NewFeaturesAdversarialTests
    {
        private static readonly DateTime FixedStartUtc = new DateTime(2026, 11, 18, 12, 0, 0, DateTimeKind.Utc);
        private readonly ITestOutputHelper _output;

        public NewFeaturesAdversarialTests(ITestOutputHelper output)
        {
            _output = output;
        }

        private static string CreateTempSaveDir()
        {
            string dir = Path.Combine(Path.GetTempPath(), "CuyAdvTests_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(dir);
            return dir;
        }

        private static void DeleteTempDir(string dir)
        {
            try
            {
                if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                {
                    Directory.Delete(dir, recursive: true);
                }
            }
            catch
            {
                // Ignore temp cleanup errors
            }
        }

        private static WorldItemCatalog LoadWorldItemsFromRepo()
        {
            string path = RepoFile.Find("assets/data/world_items.json");
            return WorldItemCatalog.Load(File.ReadAllText(path));
        }

        private static OutdoorDefaults LoadOutdoorDefaultsFromRepo()
        {
            string path = RepoFile.Find("assets/data/outdoor_defaults.json");
            return OutdoorDefaults.Load(path);
        }

        // S1: every old-save fixture in the tests folder loads without exception and new fields have safe defaults
        [Fact]
        public void S1_EveryOldSaveFixture_LoadsWithoutExceptionAndHasSafeDefaults()
        {
            var worldItems = LoadWorldItemsFromRepo();
            var itemCatalog = ItemCatalog.LoadDefault();
            var outdoorDefaults = LoadOutdoorDefaultsFromRepo();

            var oldSaveFixtures = new Dictionary<string, string>
            {
                ["v1_minimal"] = @"{
                    ""Name"": ""OldTimer"",
                    ""Version"": 1,
                    ""Clovers"": 150
                }",
                ["v1_polish_inventory_and_counters"] = @"{
                    ""Name"": ""SwinkaV1"",
                    ""Version"": 1,
                    ""Clovers"": 80,
                    ""Inventory"": { ""siano"": 3, ""papryka"": 2, ""gryzak"": 1, ""chew_toy"": 2 },
                    ""Stats"": { ""Counters"": { ""karmienia"": 5, ""eaten_papryka"": 2, ""zebrane_bobki"": 4 } }
                }",
                ["v1_legacy_decor_equipped"] = @"{
                    ""Name"": ""Pigi"",
                    ""Version"": 1,
                    ""Decor"": {
                        ""Equipped"": {
                            ""wallpaper"": ""wallpaper_mint"",
                            ""floor"": ""floor_wood_light"",
                            ""rug"": ""rug_round_pink"",
                            ""plant"": ""plant_fern"",
                            ""picture"": ""picture_pig"",
                            ""lamp"": ""lamp_mushroom""
                        },
                        ""Unlocked"": [""rug_round_pink"", ""plant_fern"", ""picture_pig"", ""lamp_mushroom""]
                    }
                }",
                ["v2_starter_pig_unnamed"] = @"{
                    ""Name"": ""Burek"",
                    ""Version"": 2,
                    ""Clovers"": 200,
                    ""Roster"": [
                        { ""Id"": ""pig_old_1"", ""Name"": ""Burek"", ""Breed"": ""smooth"", ""PaletteId"": ""tricolor"", ""Memorial"": false }
                    ],
                    ""World"": {
                        ""Rooms"": {
                            ""pig:pig_old_1"": { ""Wallpaper"": ""wallpaper_mint"", ""Floor"": """", ""Items"": [] }
                        },
                        ""PigRoomsEnsured"": [""pig_old_1""]
                    }
                }",
                ["v2_memorial_and_null_collections"] = @"{
                    ""Name"": ""Ghost"",
                    ""Version"": 2,
                    ""Clovers"": -10,
                    ""PoopCount"": 99,
                    ""Roster"": [
                        { ""Id"": ""pig_mem"", ""Name"": ""Halo"", ""Memorial"": true }
                    ],
                    ""Inventory"": null,
                    ""Diary"": null,
                    ""Care"": null,
                    ""World"": null
                }",
                ["v3_future_unknown_fields"] = @"{
                    ""Name"": ""FuturePig"",
                    ""Version"": 99,
                    ""Clovers"": 500,
                    ""UnknownTopLevelField"": { ""nested"": [1, 2, 3] }
                }"
            };

            // Also scan any *.json files under tests/Cuy.Core.Tests/Fixtures if present
            string? testsDir = Path.GetDirectoryName(RepoFile.Find("tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj"));
            string fixturesDir = Path.Combine(testsDir ?? string.Empty, "Fixtures");
            if (Directory.Exists(fixturesDir))
            {
                foreach (var file in Directory.GetFiles(fixturesDir, "*.json"))
                {
                    oldSaveFixtures["file:" + Path.GetFileName(file)] = File.ReadAllText(file, Encoding.UTF8);
                }
            }

            foreach (var kv in oldSaveFixtures)
            {
                string tempDir = CreateTempSaveDir();
                try
                {
                    File.WriteAllText(Path.Combine(tempDir, SaveSystem.FileName), kv.Value, Encoding.UTF8);
                    var clock = new ManualClock(FixedStartUtc);

                    using (var session = GameSession.Open(clock, tempDir))
                    {
                        var state = session.Pet.State;
                        Assert.NotNull(state);
                        Assert.False(string.IsNullOrWhiteSpace(state.Name), $"Fixture {kv.Key}: Name must not be empty");
                        Assert.True(state.Clovers >= 0, $"Fixture {kv.Key}: Clovers must be >= 0");
                        Assert.InRange(state.PoopCount, 0, 8);

                        // Safe defaults on new fields
                        Assert.NotNull(state.World);
                        Assert.NotNull(state.World.Rooms);
                        Assert.NotNull(state.World.OwnedItems);
                        Assert.NotNull(state.World.OutdoorSeeded);
                        Assert.NotNull(state.World.UnlockedVariants);
                        Assert.NotNull(state.World.PigHomes);
                        Assert.NotNull(state.World.Farm);
                        Assert.NotNull(state.World.Market);
                        Assert.NotNull(state.Care);
                        Assert.NotNull(state.PigLocations);
                        Assert.NotNull(state.Roster);
                        Assert.NotEmpty(state.Roster);
                        Assert.True(state.World.Rooms.ContainsKey("salon"), $"Fixture {kv.Key}: salon must exist");

                        foreach (var placeId in OutdoorSeed.DefaultPlaces)
                        {
                            Assert.Contains(placeId, state.World.OutdoorSeeded);
                            Assert.True(state.World.Rooms.ContainsKey(placeId), $"Fixture {kv.Key}: outdoor room '{placeId}' must be seeded");
                            foreach (var item in state.World.Rooms[placeId].Items)
                            {
                                Assert.NotNull(item);
                                Assert.False(string.IsNullOrEmpty(item.Uid));
                                Assert.False(string.IsNullOrEmpty(item.ItemId));
                            }
                        }

                        state.EnsureWorld(worldItems, itemCatalog);
                        OutdoorSeed.Seed(state.World, "garden", outdoorDefaults, session.Pet.Balance);
                    }

                    // Specific check for Polish V1 migration
                    if (kv.Key == "v1_polish_inventory_and_counters")
                    {
                        var loaded = new SaveSystem(tempDir).Load().State;
                        Assert.NotNull(loaded);
                        Assert.True(loaded.Inventory.ContainsKey("hay"));
                        Assert.True(loaded.Inventory.ContainsKey("bell_pepper"));
                        Assert.Equal(3, loaded.Inventory["chew_stick"]);
                        Assert.Equal(5, loaded.Stats.Counters["feedings"]);
                        Assert.Equal(2, loaded.Stats.Counters["eaten_bell_pepper"]);
                        Assert.Equal(4, loaded.Stats.Counters["poops_collected"]);
                    }
                }
                finally
                {
                    DeleteTempDir(tempDir);
                }
            }
        }

        // S2: save -> load -> save 100 times gives identical JSON
        [Fact]
        public void S2_SaveLoadSave100Times_ProducesIdenticalJson()
        {
            string tempDir = CreateTempSaveDir();
            try
            {
                var clock = new ManualClock(FixedStartUtc);
                GameState state;
                using (var session = GameSession.Open(clock, tempDir))
                {
                    state = session.Pet.State;
                    state.EnsurePigLocations(clock, new Random(42));
                    session.AutoSaver.SaveNow();
                }

                var saveSystem = new SaveSystem(tempDir);
                var firstLoad = saveSystem.Load();
                Assert.NotNull(firstLoad.State);
                string baselineJson = SaveSystem.Serialize(firstLoad.State);

                for (int i = 0; i < 100; i++)
                {
                    saveSystem.Save(firstLoad.State);
                    var reloaded = saveSystem.Load();
                    Assert.NotNull(reloaded.State);
                    Assert.Equal(LoadSource.Main, reloaded.Source);

                    string currentJson = SaveSystem.Serialize(reloaded.State);
                    Assert.Equal(baselineJson, currentJson);
                    firstLoad = reloaded;
                }
            }
            finally
            {
                DeleteTempDir(tempDir);
            }
        }

        // S3: save size under the WorldSaveSizeTests limit with 60 outdoor instances, 3 pigs, 365 weight entries, full care data
        [Fact]
        public void S3_SaveSizeUnderLimit_With60OutdoorInstances3Pigs365WeightsAndFullCareData()
        {
            const int LimitBytes = 200 * 1024; // 200 KB limit from WorldSaveSizeTests
            string tempDir = CreateTempSaveDir();
            try
            {
                var clock = new ManualClock(FixedStartUtc);
                using (var session = GameSession.Open(clock, tempDir))
                {
                    var state = session.Pet.State;

                    // 3 pigs with locations and rooms
                    state.Roster = new List<PigProfile>
                    {
                        new PigProfile { Id = "pig_1", Name = "Cuy", NamedId = "cuy", Breed = "smooth", PaletteId = "tricolor" },
                        new PigProfile { Id = "pig_2", Name = "Kuki", NamedId = "kuki", Breed = "abyssinian", PaletteId = "calico" },
                        new PigProfile { Id = "pig_3", Name = "Ned", NamedId = "ned", Breed = "peruvian", PaletteId = "cream" }
                    };
                    state.ActivePigIds = new List<string> { "pig_1", "pig_2" };
                    state.EnsurePigLocations(clock, new Random(123));

                    // 60 outdoor instances across outdoor scenes (plus indoor rooms)
                    var outdoorScenes = OutdoorSeed.DefaultPlaces;
                    foreach (var sceneId in outdoorScenes)
                    {
                        var layout = new RoomLayout { Wallpaper = "", Floor = "" };
                        for (int i = 0; i < 60; i++)
                        {
                            layout.Items.Add(new PlacedItem
                            {
                                Uid = $"fx:{sceneId}:obj_{i}",
                                ItemId = i % 2 == 0 ? "bench_wood" : "flowerbed_tulip",
                                X = i % 16,
                                Y = (i / 16) % 9,
                                Flip = i % 3 == 0,
                                Variant = i % 4,
                                Movable = true,
                                Removable = i > 3
                            });
                        }
                        state.World.Rooms[sceneId] = layout;
                        state.World.OutdoorSeeded.Add(sceneId);
                    }

                    // Full Care data + 365 weight entries
                    var care = new CareState
                    {
                        Settings = new CareSettings
                        {
                            ManualOptIn = true,
                            PigNames = new List<string> { "Cuy", "Kuki", "Ned" },
                            Pigs = new List<CarePigProfile>
                            {
                                new CarePigProfile { Name = "Cuy", BirthDate = "2025-01-01", AdoptedDate = "2025-02-01", BaselineGrams = 950 },
                                new CarePigProfile { Name = "Kuki", BirthDate = "2025-03-01", AdoptedDate = "2025-04-01", BaselineGrams = 1020 },
                                new CarePigProfile { Name = "Ned", BirthDate = "2025-05-01", AdoptedDate = "2025-06-01", BaselineGrams = 1100 }
                            }
                        }
                    };

                    string[] tasks = { "water", "hay", "veggies", "spot_clean", "full_clean", "weigh", "nails", "health_check" };
                    foreach (var t in tasks)
                    {
                        care.LastDoneUtc[t] = FixedStartUtc.AddHours(-2);
                        care.SnoozedUntilUtc[t] = FixedStartUtc.AddHours(4);
                        care.Streaks[t] = 45;
                        care.Settings.TaskOverrides[t] = new CareTaskOverride
                        {
                            Enabled = true,
                            Time = "18:00",
                            Weekday = 1,
                            EveryDays = 7
                        };
                    }

                    for (int day = 0; day < 365; day++)
                    {
                        string dateStr = FixedStartUtc.AddDays(-day).ToString("yyyy-MM-dd");
                        care.Weights.Add(new WeightEntry
                        {
                            LocalDate = dateStr,
                            Pig = state.Roster[day % 3].Name,
                            Grams = 900 + (day % 250)
                        });
                        care.History.Add(new CareHistoryEntry
                        {
                            LocalDate = dateStr,
                            TaskId = tasks[day % tasks.Length]
                        });
                    }
                    state.Care = care;

                    string json = SaveSystem.Serialize(state);
                    int byteCount = Encoding.UTF8.GetByteCount(json);
                    Assert.True(byteCount < LimitBytes, $"Serialized JSON size {byteCount} bytes exceeds 200 KB ({LimitBytes} bytes)");

                    session.SaveSystem.Save(state);
                    long diskBytes = new FileInfo(session.SaveSystem.SavePath).Length;
                    Assert.True(diskBytes < LimitBytes, $"Save file on disk {diskBytes} bytes exceeds 200 KB ({LimitBytes} bytes)");

                    var reloaded = session.SaveSystem.Load().State;
                    Assert.NotNull(reloaded);
                    Assert.Equal(3, reloaded.Roster.Count);
                    Assert.Equal(365, reloaded.Care.Weights.Count);
                    Assert.Equal(60, reloaded.World.Rooms["garden"].Items.Count);
                }
            }
            finally
            {
                DeleteTempDir(tempDir);
            }
        }

        // S4: outdoor seeding twice is idempotent; an object the player removed never returns after reload
        [Fact]
        public void S4_OutdoorSeedingTwiceIsIdempotent_AndRemovedObjectNeverReturnsAfterReload()
        {
            string tempDir = CreateTempSaveDir();
            try
            {
                var defaults = LoadOutdoorDefaultsFromRepo();
                var balance = new Balance { OutdoorInstancesActive = true, WorldDecorActive = true };
                var clock = new ManualClock(FixedStartUtc);

                string removedUid = OutdoorSeed.BuildUid("garden", "bench");
                int initialCount;
                int initialBenchOwned;

                using (var session = GameSession.Open(clock, tempDir, balance))
                {
                    var world = session.Pet.State.World;
                    Assert.Contains("garden", world.OutdoorSeeded);
                    var garden = world.Rooms["garden"];
                    initialCount = garden.Items.Count;
                    initialBenchOwned = world.OwnedItems.TryGetValue("bench_wood", out int o) ? o : 0;
                    Assert.True(initialCount > 0);
                    Assert.Contains(garden.Items, i => i.Uid == removedUid);

                    // Calling Seed a second time must be a complete no-op
                    OutdoorSeed.Seed(world, "garden", defaults, balance);
                    Assert.Equal(initialCount, garden.Items.Count);
                    Assert.Equal(initialBenchOwned, world.OwnedItems["bench_wood"]);

                    // Player removes a removable seeded object ("fx:garden:bench")
                    bool removed = session.Pet.RemoveItem("garden", removedUid);
                    Assert.True(removed, "Expected removable outdoor prop fx:garden:bench to be removable");
                    Assert.DoesNotContain(garden.Items, i => i.Uid == removedUid);
                    Assert.Equal(initialCount - 1, garden.Items.Count);

                    // Calling Seed again in-memory must not bring it back
                    OutdoorSeed.Seed(world, "garden", defaults, balance);
                    Assert.DoesNotContain(garden.Items, i => i.Uid == removedUid);

                    session.Close();
                }

                // Reload in a brand new GameSession: removed object must NOT return
                using (var session2 = GameSession.Open(clock, tempDir))
                {
                    var world2 = session2.Pet.State.World;
                    Assert.Contains("garden", world2.OutdoorSeeded);
                    var garden2 = world2.Rooms["garden"];
                    Assert.DoesNotContain(garden2.Items, i => i.Uid == removedUid);
                    Assert.Equal(initialCount - 1, garden2.Items.Count);
                }
            }
            finally
            {
                DeleteTempDir(tempDir);
            }
        }

        // S5: a non-removable fixture cannot be removed by a hand-built room_remove message (error code fixture_locked)
        [Fact]
        public void S5_NonRemovableFixture_CannotBeRemovedByHandBuiltRoomRemove_ReturnsFixtureLocked()
        {
            var defaults = LoadOutdoorDefaultsFromRepo();
            var worldItems = LoadWorldItemsFromRepo();
            var clock = new ManualClock(FixedStartUtc);
            var balance = new Balance { OutdoorInstancesActive = true, WorldDecorActive = true };
            var state = GameState.CreateNew("Tester", FixedStartUtc);
            state.EnsureWorld(worldItems, ItemCatalog.LoadDefault());

            foreach (var placeId in OutdoorSeed.DefaultPlaces)
            {
                OutdoorSeed.Seed(state.World, placeId, defaults, balance);
            }

            var pet = new Pet(state, clock, balance) { WorldItemCatalog = worldItems };

            var lockedFixtures = new (string place, string uid)[]
            {
                ("garden", "fx:garden:burrow"),
                ("park", "fx:park:bridge"),
                ("farm", "fx:farm:barn"),
                ("market", "fx:market:stall_left"),
                ("market", "fx:market:stall_center"),
                ("market", "fx:market:stall_right")
            };

            foreach (var (place, uid) in lockedFixtures)
            {
                // Hand-built room_remove message
                var msg = new JObject
                {
                    ["type"] = "room_remove",
                    ["place"] = place,
                    ["uid"] = uid
                };

                var valRes = MessageValidator.Validate("room_remove", msg);
                Assert.True(valRes.IsOk, $"room_remove for {uid} should pass schema validation");

                var room = state.World.Rooms[place];
                int countBefore = room.Items.Count;

                // Pet.RemoveItem and RoomLayoutOps.Remove must refuse removal and report fixture_locked
                bool petRemoved = pet.RemoveItem(place, uid);
                Assert.False(petRemoved, $"Pet.RemoveItem must not remove locked fixture {uid}");

                bool opsRemoved = RoomLayoutOps.Remove(room, uid, out string errorCode);
                Assert.False(opsRemoved, $"RoomLayoutOps.Remove must not remove locked fixture {uid}");
                Assert.Equal("fixture_locked", errorCode);

                // Even if an attacker tampered with PlacedItem.Removable = true in memory, OutdoorDefaults locks it by UID
                var placed = room.Items.First(i => i.Uid == uid);
                placed.Removable = true;
                bool opsRemovedAfterTamper = RoomLayoutOps.Remove(room, uid, out string errorCodeAfterTamper);
                Assert.False(opsRemovedAfterTamper, $"Locked fixture {uid} must stay locked via OutdoorDefaults even if PlacedItem.Removable is true");
                Assert.Equal("fixture_locked", errorCodeAfterTamper);
                placed.Removable = false;

                Assert.Equal(countBefore, room.Items.Count);
                Assert.Contains(room.Items, i => i.Uid == uid);
            }
        }

        // S6: validators for room_place/move/remove/flip/skin, places.pigMove/pigPin, the desktop-pet message:
        // null payload, missing fields, wrong types, NaN, negative and huge numbers, 10k-character strings,
        // unicode and control characters, unknown ids: always rejected, never an exception
        [Fact]
        public void S6_ValidatorsForRoomPlacesAndDesktopPet_AdversarialPayloadsAlwaysRejectedWithoutException()
        {
            string[] targetTypes =
            {
                "room_place",
                "room_move",
                "room_remove",
                "room_flip",
                "room_skin",
                "places.pigMove",
                "places.pigPin",
                "pigs.desktopPet"
            };

            string huge10k = new string('a', 10000);
            string[] badIds =
            {
                "",
                " ",
                "UPPERCASE_ID",
                "has space",
                "dash-not-allowed",
                "dot.not.allowed",
                "slash/id",
                "backslash\\id",
                "null\0char",
                "line\nbreak",
                "tab\tchar",
                "control\u0007bell",
                "unicode_świnka_żółć",
                "emoji_🐹",
                "semi;colon",
                "quote\"id",
                huge10k,
                new string('x', 129) // MaxLen for FieldRule.Id is 128
            };

            JToken[] badInts =
            {
                JValue.CreateNull(),
                new JValue("10"),
                new JValue("not_an_int"),
                new JValue(true),
                new JValue(false),
                new JValue(1.5),
                new JValue(double.NaN),
                new JValue(double.PositiveInfinity),
                new JValue(double.NegativeInfinity),
                new JValue(-2),
                new JValue(-999999),
                new JValue(513),
                new JValue(int.MaxValue),
                new JValue(int.MinValue),
                new JValue(long.MaxValue),
                new JValue(long.MinValue),
                new JArray(1, 2),
                new JObject { ["x"] = 1 }
            };

            JToken[] badBools =
            {
                new JValue("true"),
                new JValue("false"),
                new JValue(1),
                new JValue(0),
                new JValue(double.NaN),
                new JValue(huge10k),
                new JArray(),
                new JObject()
            };

            // 1. Null message / null type
            Assert.True(MessageValidator.Validate((JObject)null!).IsInvalid);
            foreach (var type in targetTypes)
            {
                var nullRes = MessageValidator.Validate(type, null!);
                Assert.True(nullRes.IsInvalid, $"Null payload for {type} must be Invalid");

                var emptyRes = MessageValidator.Validate(type, new JObject());
                Assert.True(emptyRes.IsInvalid, $"Empty payload for {type} must be Invalid");
            }

            // 2. Test each message type with missing fields, bad IDs, bad ints, bad bools
            foreach (var type in targetTypes)
            {
                var valid = BuildValidPayload(type);
                var okRes = MessageValidator.Validate(type, valid);
                Assert.True(okRes.IsOk, $"Baseline payload for {type} should be Ok, got: {okRes.Error}");

                // Missing required fields
                foreach (var reqField in GetRequiredFields(type))
                {
                    var clone = (JObject)valid.DeepClone();
                    clone.Remove(reqField);
                    var res = MessageValidator.Validate(type, clone);
                    Assert.True(res.IsInvalid, $"{type}: missing required field '{reqField}' must be rejected");

                    var nullFieldClone = (JObject)valid.DeepClone();
                    nullFieldClone[reqField] = JValue.CreateNull();
                    var resNull = MessageValidator.Validate(type, nullFieldClone);
                    Assert.True(resNull.IsInvalid, $"{type}: null required field '{reqField}' must be rejected");
                }

                // Bad ID values on all ID fields (required and optional)
                foreach (var idField in GetIdFields(type))
                {
                    foreach (var badId in badIds)
                    {
                        var clone = (JObject)valid.DeepClone();
                        clone[idField] = badId;
                        var res = MessageValidator.Validate(type, clone);
                        Assert.True(res.IsInvalid, $"{type}.{idField} with bad id '{ EscapeForLog(badId) }' must be Invalid");
                    }

                    // Wrong types on ID field (numbers, bool, NaN, object, array)
                    foreach (var wrongToken in new JToken[] { 123, -1, true, double.NaN, new JArray(), new JObject() })
                    {
                        var clone = (JObject)valid.DeepClone();
                        clone[idField] = wrongToken;
                        var res = MessageValidator.Validate(type, clone);
                        Assert.True(res.IsInvalid, $"{type}.{idField} with non-string token '{wrongToken}' must be Invalid");
                    }
                }

                // Bad Int values on all Int fields
                foreach (var intField in GetIntFields(type))
                {
                    foreach (var badInt in badInts)
                    {
                        var clone = (JObject)valid.DeepClone();
                        clone[intField] = badInt;
                        var res = MessageValidator.Validate(type, clone);
                        Assert.True(res.IsInvalid, $"{type}.{intField} with bad int '{badInt}' must be Invalid");
                    }
                }

                // Specifically check y upper bound (256) on room_place and room_move
                if (type == "room_place" || type == "room_move")
                {
                    var cloneY257 = (JObject)valid.DeepClone();
                    cloneY257["y"] = 257;
                    Assert.True(MessageValidator.Validate(type, cloneY257).IsInvalid);
                }

                // Bad Bool values on all Bool fields
                foreach (var boolField in GetBoolFields(type))
                {
                    foreach (var badBool in badBools)
                    {
                        var clone = (JObject)valid.DeepClone();
                        clone[boolField] = badBool;
                        var res = MessageValidator.Validate(type, clone);
                        Assert.True(res.IsInvalid, $"{type}.{boolField} with bad bool '{badBool}' must be Invalid");
                    }
                }
            }
        }

        // S7: prices and rewards sent inside a message are ignored (the game computes them)
        [Fact]
        public void S7_PricesAndRewardsInMessage_AreIgnoredAndComputedByCore()
        {
            var worldItems = LoadWorldItemsFromRepo();
            var sofaDef = worldItems.Find("sofa_cosy");
            Assert.NotNull(sofaDef);
            Assert.True(sofaDef.Price > 0);

            var clock = new ManualClock(FixedStartUtc);
            var balance = new Balance
            {
                WorldDecorActive = true,
                PlacesActive = true,
                FarmActive = true,
                MarketActive = true,
                PigRoomsActive = true
            };
            var state = GameState.CreateNew("Buyer", FixedStartUtc);
            state.Clovers = 1000;
            state.EnsureWorld(worldItems, ItemCatalog.LoadDefault());
            var pet = new Pet(state, clock, balance) { WorldItemCatalog = worldItems };

            // 1. Validator accepts extra spoofed fields without crashing, and Core BuyItem ignores any spoofed price/reward
            var spoofedBuyMsg = JObject.Parse(@"{
                ""type"": ""room_buy"",
                ""itemId"": ""sofa_cosy"",
                ""price"": 0,
                ""cost"": -5000,
                ""reward"": 99999,
                ""clovers"": 99999,
                ""free"": true
            }");
            var valRes = MessageValidator.Validate("room_buy", spoofedBuyMsg);
            Assert.True(valRes.IsOk);

            int cloversBefore = pet.State.Clovers;
            string itemIdFromMsg = spoofedBuyMsg.Value<string>("itemId")!;
            var buyRes = pet.BuyItem(itemIdFromMsg);
            Assert.Equal(BuyResult.Ok, buyRes);
            Assert.Equal(cloversBefore - sofaDef.Price, pet.State.Clovers);

            // 2. If player has fewer clovers than catalog price, buying fails even if message claims price: 0
            pet.State.Clovers = sofaDef.Price - 1;
            var buyResPoor = pet.BuyItem(itemIdFromMsg);
            Assert.Equal(BuyResult.NotEnoughClovers, buyResPoor);
            Assert.Equal(sofaDef.Price - 1, pet.State.Clovers);

            // 3. PlaceItem / MoveItem / RemoveItem never grant clovers or alter currency
            pet.State.Clovers = 50;
            var placeRes = pet.PlaceItem("salon", "sofa_cosy", 2, 2);
            Assert.Equal(PlaceResult.Ok, placeRes);
            Assert.Equal(50, pet.State.Clovers);
        }

        // S8: Balance flags default off on a bare Pet (existing tests keep their numbers) and on after GameSession.Open
        [Fact]
        public void S8_BalanceFlags_DefaultOffOnBarePet_AndOnAfterGameSessionOpen()
        {
            var clock = new ManualClock(FixedStartUtc);
            var bareState = GameState.CreateNew("Bare", FixedStartUtc);
            var barePet = new Pet(bareState, clock);

            Assert.False(barePet.Balance.HayRackActive);
            Assert.False(barePet.Balance.DiaryActive);
            Assert.False(barePet.Balance.BirthdayRewardsActive);
            Assert.False(barePet.Balance.PerPigAgeActive);
            Assert.False(barePet.Balance.PigModifiersActive);
            Assert.False(barePet.Balance.ArrivalsActive);
            Assert.False(barePet.Balance.PlacesActive);
            Assert.False(barePet.Balance.FarmActive);
            Assert.False(barePet.Balance.MarketActive);
            Assert.False(barePet.Balance.WorldDecorActive);
            Assert.False(barePet.Balance.PigRoomsActive);
            Assert.False(barePet.Balance.HomesActive);
            Assert.False(barePet.Balance.DormActive);
            Assert.False(barePet.Balance.OutdoorInstancesActive);

            string tempDir = CreateTempSaveDir();
            try
            {
                using (var session = GameSession.Open(clock, tempDir))
                {
                    var b = session.Pet.Balance;
                    Assert.True(b.HayRackActive);
                    Assert.True(b.DiaryActive);
                    Assert.True(b.BirthdayRewardsActive);
                    Assert.True(b.PerPigAgeActive);
                    Assert.True(b.PigModifiersActive);
                    Assert.True(b.ArrivalsActive);
                    Assert.True(b.PlacesActive);
                    Assert.True(b.FarmActive);
                    Assert.True(b.MarketActive);
                    Assert.True(b.WorldDecorActive);
                    Assert.True(b.PigRoomsActive);
                    Assert.True(b.HomesActive);
                    Assert.True(b.DormActive);
                    Assert.True(b.OutdoorInstancesActive);
                }
            }
            finally
            {
                DeleteTempDir(tempDir);
            }
        }

        // S9: ToastFor is total (any string in, safe text out)
        [Fact]
        public void S9_ToastFor_IsTotal_AnyStringInSafeTextOut()
        {
            string?[] inputs =
            {
                null,
                "",
                " ",
                "\t\r\n\0",
                "fixture_locked",
                "FIXTURE_LOCKED",
                "unknown_code",
                new string('x', 10000),
                "<script>alert(1)</script>",
                "unicode_świnka_🐹_\u0000\u0007\u001b"
            };

            foreach (var input in inputs)
            {
                string result = RoomsMessages.ToastFor(input!);
                Assert.False(string.IsNullOrWhiteSpace(result), "ToastFor must return non-empty text for any input");
                Assert.True(result.Length <= 60, $"ToastFor result '{result}' exceeds 60 chars");
                foreach (char c in result)
                {
                    Assert.False(char.IsControl(c), $"ToastFor result contains control char U+{(int)c:X4}");
                }
            }

            Assert.Equal("You can move this fixture, not stash it.", RoomsMessages.ToastFor("fixture_locked"));
        }

        // S10: old save with lamps at legacy positions stays valid under the new placement rules
        [Fact]
        public void S10_OldSaveWithLampsAtLegacyPositions_StaysValidUnderNewPlacementRules()
        {
            var worldItems = LoadWorldItemsFromRepo();
            var itemCatalog = ItemCatalog.LoadDefault();
            var clock = new ManualClock(FixedStartUtc);

            // Legacy save with floor lamps (1x2 with foot_h=1), wall lamps (lamp_arc 2x3 with foot_h=1, fairy_lights 3x1),
            // and 1x1 lamps (lamp_salt, lamp_oil, lamp_post) placed at legacy positions including the last row of a 12x7 salon (y=6)
            // and wall rows (y=0, y=1).
            string legacySaveJson = @"{
                ""Name"": ""LampKeeper"",
                ""Version"": 2,
                ""Clovers"": 300,
                ""World"": {
                    ""LegacyDecorMigrated"": true,
                    ""OwnedItems"": {
                        ""lamp_mushroom"": 1,
                        ""lamp_floor"": 1,
                        ""lamp_arc"": 1,
                        ""fairy_lights"": 1,
                        ""lamp_salt"": 1,
                        ""lamp_oil"": 1,
                        ""lamp_post"": 1
                    },
                    ""Rooms"": {
                        ""salon"": {
                            ""Wallpaper"": ""wallpaper_mint"",
                            ""Floor"": ""floor_wood_light"",
                            ""Items"": [
                                { ""Uid"": ""leg_mush"", ""ItemId"": ""lamp_mushroom"", ""X"": 0, ""Y"": 6, ""Flip"": false },
                                { ""Uid"": ""leg_floor"", ""ItemId"": ""lamp_floor"", ""X"": 11, ""Y"": 6, ""Flip"": true },
                                { ""Uid"": ""leg_salt"", ""ItemId"": ""lamp_salt"", ""X"": 5, ""Y"": 2, ""Flip"": false },
                                { ""Uid"": ""leg_arc"", ""ItemId"": ""lamp_arc"", ""X"": 2, ""Y"": 0, ""Flip"": false },
                                { ""Uid"": ""leg_fairy"", ""ItemId"": ""fairy_lights"", ""X"": 6, ""Y"": 1, ""Flip"": false }
                            ]
                        },
                        ""garden"": {
                            ""Wallpaper"": """",
                            ""Floor"": """",
                            ""Items"": [
                                { ""Uid"": ""leg_oil"", ""ItemId"": ""lamp_oil"", ""X"": 6, ""Y"": 8, ""Flip"": false }
                            ]
                        },
                        ""park"": {
                            ""Wallpaper"": """",
                            ""Floor"": """",
                            ""Items"": [
                                { ""Uid"": ""leg_post"", ""ItemId"": ""lamp_post"", ""X"": 5, ""Y"": 9, ""Flip"": false }
                            ]
                        }
                    }
                }
            }";

            string tempDir = CreateTempSaveDir();
            try
            {
                File.WriteAllText(Path.Combine(tempDir, SaveSystem.FileName), legacySaveJson, Encoding.UTF8);

                using (var session = GameSession.Open(clock, tempDir))
                {
                    var state = session.Pet.State;
                    var salon = state.World.Rooms["salon"];
                    Assert.Equal(5, salon.Items.Count);

                    // Verify every legacy lamp is preserved at its coordinates and remains valid under CanPlace
                    foreach (var placed in salon.Items)
                    {
                        var def = worldItems.Find(placed.ItemId);
                        Assert.NotNull(def);
                        var canPlace = RoomLayoutOps.CanPlace(
                            salon,
                            cols: 12,
                            rows: 7,
                            wallRows: 2,
                            item: def,
                            placeId: "salon",
                            x: placed.X,
                            y: placed.Y,
                            ignoreUid: placed.Uid,
                            catalog: worldItems);
                        Assert.Equal(PlaceResult.Ok, canPlace);
                    }

                    // Garden lamp_oil at bottom row y=8 on 16x9 outdoor grid (wallRows=0)
                    var garden = state.World.Rooms["garden"];
                    var oilLamp = garden.Items.FirstOrDefault(i => i.Uid == "leg_oil");
                    Assert.NotNull(oilLamp);
                    var oilDef = worldItems.Find("lamp_oil");
                    Assert.Equal(
                        PlaceResult.Ok,
                        RoomLayoutOps.CanPlace(garden, 16, 9, 0, oilDef, "garden", oilLamp.X, oilLamp.Y, oilLamp.Uid, worldItems));

                    // Park lamp_post on 24x12 outdoor grid (wallRows=0)
                    var park = state.World.Rooms["park"];
                    var postLamp = park.Items.FirstOrDefault(i => i.Uid == "leg_post");
                    Assert.NotNull(postLamp);
                    var postDef = worldItems.Find("lamp_post");
                    Assert.Equal(
                        PlaceResult.Ok,
                        RoomLayoutOps.CanPlace(park, 24, 12, 0, postDef, "park", postLamp.X, postLamp.Y, postLamp.Uid, worldItems));
                }
            }
            finally
            {
                DeleteTempDir(tempDir);
            }
        }

        private static JObject BuildValidPayload(string type)
        {
            switch (type)
            {
                case "room_place":
                    return new JObject { ["place"] = "salon", ["itemId"] = "sofa_cosy", ["x"] = 2, ["y"] = 3, ["flip"] = false };
                case "room_move":
                    return new JObject { ["place"] = "salon", ["uid"] = "fx:garden:bench", ["x"] = 4, ["y"] = 5 };
                case "room_remove":
                    return new JObject { ["place"] = "salon", ["uid"] = "fx:garden:bench" };
                case "room_flip":
                    return new JObject { ["place"] = "salon", ["uid"] = "fx:garden:bench", ["flip"] = true };
                case "room_skin":
                    return new JObject { ["room"] = "salon", ["slot"] = "wallpaper", ["itemId"] = "wallpaper_mint" };
                case "places.pigMove":
                    return new JObject { ["pigId"] = "pig_1", ["to"] = "garden" };
                case "places.pigPin":
                    return new JObject { ["pigId"] = "pig_1", ["pinned"] = true };
                case "pigs.desktopPet":
                    return new JObject { ["pigId"] = "pig_1", ["on"] = true };
                default:
                    throw new ArgumentException("Unknown type: " + type);
            }
        }

        private static string[] GetRequiredFields(string type)
        {
            switch (type)
            {
                case "room_place": return new[] { "place", "itemId", "x", "y" };
                case "room_move": return new[] { "place", "uid", "x", "y" };
                case "room_remove": return new[] { "place", "uid" };
                case "room_flip": return new[] { "place", "uid" };
                case "room_skin": return new[] { "room", "slot" };
                case "places.pigMove": return new[] { "pigId", "to" };
                case "places.pigPin": return new[] { "pigId", "pinned" };
                case "pigs.desktopPet": return new[] { "pigId", "on" };
                default: return Array.Empty<string>();
            }
        }

        private static string[] GetIdFields(string type)
        {
            switch (type)
            {
                case "room_place": return new[] { "place", "itemId" };
                case "room_move": return new[] { "place", "uid" };
                case "room_remove": return new[] { "place", "uid" };
                case "room_flip": return new[] { "place", "uid" };
                case "room_skin": return new[] { "room", "slot", "itemId" };
                case "places.pigMove": return new[] { "pigId", "to" };
                case "places.pigPin": return new[] { "pigId" };
                case "pigs.desktopPet": return new[] { "pigId" };
                default: return Array.Empty<string>();
            }
        }

        private static string[] GetIntFields(string type)
        {
            switch (type)
            {
                case "room_place":
                case "room_move":
                    return new[] { "x", "y" };
                default:
                    return Array.Empty<string>();
            }
        }

        private static string[] GetBoolFields(string type)
        {
            switch (type)
            {
                case "room_place":
                case "room_flip":
                    return new[] { "flip" };
                case "places.pigPin":
                    return new[] { "pinned" };
                case "pigs.desktopPet":
                    return new[] { "on" };
                default:
                    return Array.Empty<string>();
            }
        }

        private static string EscapeForLog(string s)
        {
            if (s == null) return "<null>";
            if (s.Length > 40) return s.Substring(0, 40) + $"...({s.Length})";
            return s.Replace("\n", "\\n").Replace("\r", "\\r").Replace("\t", "\\t").Replace("\0", "\\0");
        }
    }
}
