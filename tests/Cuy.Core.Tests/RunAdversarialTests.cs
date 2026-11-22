using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Cuy.Core.Weather;
using Cuy.Core.World;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RunAdversarialTests
    {
        private static RoomLayout BuildBoxRun(int x0, int y0, int x1, int y1, bool withGate = true, (int x, int y)? omit = null)
        {
            var layout = new RoomLayout();
            bool gatePlaced = false;
            for (int x = x0; x <= x1; x++)
            {
                for (int y = y0; y <= y1; y++)
                {
                    bool onBorder = x == x0 || x == x1 || y == y0 || y == y1;
                    if (!onBorder) continue;
                    if (omit.HasValue && omit.Value.x == x && omit.Value.y == y) continue;

                    // Place gate on top middle border if requested
                    bool isCorner = (x == x0 || x == x1) && (y == y0 || y == y1);
                    string itemId = "fence_wood";
                    if (withGate && !gatePlaced && !isCorner && y == y0)
                    {
                        itemId = "gate_garden";
                        gatePlaced = true;
                    }

                    layout.Items.Add(new PlacedItem
                    {
                        ItemId = itemId,
                        X = x,
                        Y = y
                    });
                }
            }
            return layout;
        }

        [Fact]
        public void RUN_FenceGapOneCell_ReturnsOpenEdge()
        {
            // 6x6 outer box -> 4x4 interior (16 cells >= 12), but omit one fence cell
            var layout = BuildBoxRun(2, 1, 7, 6, withGate: true, omit: (4, 6));
            var cfg = RunConfig.CreateDefault();
            var info = RunCheck.Analyze(layout, 16, 9, null, cfg);

            Assert.False(info.Valid);
            Assert.Equal("open_edge", info.Reason);
        }

        [Fact]
        public void RUN_Capacity1To4_BoundaryAndInvalidCases()
        {
            var cfg = RunConfig.CreateDefault();

            // 12 cells: 4x3 interior -> outer 6x5 (x: 2..7, y: 1..5) -> capacity 2
            var run12 = BuildBoxRun(2, 1, 7, 5, withGate: true);
            var info12 = RunCheck.Analyze(run12, 16, 9, null, cfg);
            Assert.True(info12.Valid);
            Assert.Equal(12, info12.Cells);
            Assert.Equal(2, info12.Capacity);

            // 18 cells: 6x3 interior -> outer 8x5 (x: 2..9, y: 1..5) -> capacity 3
            var run18 = BuildBoxRun(2, 1, 9, 5, withGate: true);
            var info18 = RunCheck.Analyze(run18, 16, 9, null, cfg);
            Assert.True(info18.Valid);
            Assert.Equal(18, info18.Cells);
            Assert.Equal(3, info18.Capacity);

            // 24 cells: 6x4 interior -> outer 8x6 (x: 2..9, y: 1..6) -> capacity 4
            var run24 = BuildBoxRun(2, 1, 9, 6, withGate: true);
            var info24 = RunCheck.Analyze(run24, 16, 9, null, cfg);
            Assert.True(info24.Valid);
            Assert.Equal(24, info24.Cells);
            Assert.Equal(4, info24.Capacity);

            // 9 cells: 3x3 interior -> outer 5x5 (x: 2..6, y: 1..5) -> too_small
            var run9 = BuildBoxRun(2, 1, 6, 5, withGate: true);
            var info9 = RunCheck.Analyze(run9, 16, 9, null, cfg);
            Assert.False(info9.Valid);
            Assert.Equal("too_small", info9.Reason);
            Assert.Equal(9, info9.Cells);

            // Open on edge: interior touches y=0 (x: 2..7, y: 0..4 with top omitted) -> open_edge
            var openEdge = new RoomLayout();
            for (int x = 2; x <= 7; x++)
            {
                for (int y = 0; y <= 4; y++)
                {
                    if (x == 2 || x == 7 || y == 4)
                    {
                        openEdge.Items.Add(new PlacedItem { ItemId = (x == 4 && y == 4) ? "gate_garden" : "fence_wood", X = x, Y = y });
                    }
                }
            }
            var infoEdge = RunCheck.Analyze(openEdge, 16, 9, null, cfg);
            Assert.False(infoEdge.Valid);
            Assert.Equal("open_edge", infoEdge.Reason);
        }

        [Fact]
        public void RUN_OldSaveDefaults_DeserializesAndReturnsNoFence()
        {
            const string oldSaveJson = "{\"Version\":1,\"PlaceLevels\":{\"salon\":1}}";
            var state = JsonConvert.DeserializeObject<WorldState>(oldSaveJson);
            Assert.NotNull(state);
            Assert.NotNull(state.Rooms);
            Assert.Empty(state.Rooms);

            state.Rooms.TryGetValue("garden", out var gardenLayout);
            var info = RunCheck.Analyze(gardenLayout, 16, 9, null, RunConfig.CreateDefault());
            Assert.False(info.Valid);
            Assert.Equal("no_fence", info.Reason);
            Assert.Equal(0, info.Cells);
            Assert.Equal(0, info.Capacity);
        }

        [Fact]
        public void RUN_MessageFuzz300_NeverThrowsAndRejectsInvalid()
        {
            var rng = new Random(42124);
            Assert.NotNull(RunMessages.ValidatePigPayload(null));

            for (int i = 0; i < 300; i++)
            {
                int kind = rng.Next(6);
                var msg = new JObject();
                bool expectValid = false;

                switch (kind)
                {
                    case 0: // valid 1..64
                        int len = rng.Next(1, 65);
                        msg["pigId"] = new string('a', len);
                        expectValid = true;
                        break;
                    case 1: // too long 65..128
                        msg["pigId"] = new string('x', rng.Next(65, 129));
                        break;
                    case 2: // empty or whitespace
                        msg["pigId"] = rng.Next(2) == 0 ? "" : "   \t ";
                        break;
                    case 3: // wrong type
                        msg["pigId"] = rng.Next(3) switch
                        {
                            0 => (JToken)12345,
                            1 => true,
                            _ => new JArray("starter")
                        };
                        break;
                    case 4: // null or missing
                        if (rng.Next(2) == 0) msg["pigId"] = JValue.CreateNull();
                        break;
                    default: // random ascii
                        char[] chars = new char[rng.Next(1, 80)];
                        for (int c = 0; c < chars.Length; c++)
                            chars[c] = (char)rng.Next(33, 126);
                        string s = new string(chars);
                        msg["pigId"] = s;
                        expectValid = !string.IsNullOrWhiteSpace(s) && s.Length <= 64;
                        break;
                }

                string err = RunMessages.ValidatePigPayload(msg);
                if (expectValid)
                    Assert.Null(err);
                else
                    Assert.False(string.IsNullOrEmpty(err));
            }
        }

        [Fact]
        public void RUN_AssignUnknownPig_ValidatesWithoutException()
        {
            var rules = new List<MessageRule>(new RunMessages().Rules);
            Assert.Contains(rules, r => r.Type == "run.out");
            Assert.Contains(rules, r => r.Type == "run.in");

            Assert.Null(RunMessages.ValidatePigPayload(new JObject { ["pigId"] = "unknown_pig_999" }));
            Assert.NotNull(RunMessages.ValidatePigPayload(new JObject { ["pigId"] = "" }));
            Assert.NotNull(RunMessages.ValidatePigPayload(new JObject()));
        }

        [Fact]
        public void RUN_AssignOverCapacity_CapacityComputedAccurately()
        {
            var layout = BuildBoxRun(2, 1, 7, 5, withGate: true); // 12 cells -> capacity 2
            int cap = RunCheck.Capacity(layout, 16, 9, null, RunConfig.CreateDefault());
            Assert.Equal(2, cap);
        }

        [Fact(Skip = "SKIP RUN-assign-over-capacity: Pet.Run assignment API deferred in F3-2")]
        public void RUN_AssignOverCapacity_PetRunDeferred()
        {
        }

        [Fact]
        public void RUN_RulesFromData_CustomConfigChangesCheckAndVerdict()
        {
            string realJson = File.ReadAllText(RepoFile.Find("assets/data/pig_run.json"));
            var realCfg = RunConfig.Load(realJson);
            Assert.Equal(12, realCfg.MinCells);

            const string customJson = @"{
              ""min_cells"": 4,
              ""cells_per_pig"": 2,
              ""day_from_hour"": 10,
              ""day_to_hour"": 15,
              ""min_temp_c"": 15,
              ""max_temp_c"": 20,
              ""allowed_conditions"": [""Clear""]
            }";
            var customCfg = RunConfig.Load(customJson);

            // 9-cell box is invalid under default (min 12) but valid under custom (min 4, cap 4)
            var run9 = BuildBoxRun(2, 1, 6, 5, withGate: true);
            Assert.False(RunCheck.Analyze(run9, 16, 9, null, realCfg).Valid);

            var customInfo = RunCheck.Analyze(run9, 16, 9, null, customCfg);
            Assert.True(customInfo.Valid);
            Assert.Equal(4, customInfo.Capacity);

            // Time & weather rules reflect custom config
            var morning9 = new DateTime(2026, 11, 21, 9, 30, 0, DateTimeKind.Local);
            Assert.Equal(RunVerdict.Ok, RunRules.CanBeOut(morning9, null, realCfg));
            Assert.Equal(RunVerdict.TooEarly, RunRules.CanBeOut(morning9, null, customCfg));

            var noon = new DateTime(2026, 11, 21, 12, 0, 0, DateTimeKind.Local);
            var chillyWeather = new WeatherInfo { IsDay = true, Condition = WeatherCondition.Clear, TemperatureC = 12 };
            Assert.Equal(RunVerdict.Ok, RunRules.CanBeOut(noon, chillyWeather, realCfg));
            Assert.Equal(RunVerdict.TooCold, RunRules.CanBeOut(noon, chillyWeather, customCfg));
        }
    }
}
