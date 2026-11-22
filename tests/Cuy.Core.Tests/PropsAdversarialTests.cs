using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using Cuy.Core.Input.Validation;
using Cuy.Core.World;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PropsAdversarialTests
    {
        private static DesktopPropCatalog LoadCatalog()
        {
            string path = RepoFile.Find("assets/data/desktop_props.json");
            return DesktopPropCatalog.Load(File.ReadAllText(path));
        }

        [Fact]
        public void PROP_UnownedRejected_ReturnsNotOwnedAndUnknownItem()
        {
            var cat = LoadCatalog();
            var world = new WorldState();
            var gs = new GameState();
            var desktop = new List<DesktopProp>();

            var res = DesktopPropOps.PutOnDesktop(desktop, world, gs, "toy_basket", 0.5, 0.5, cat, out var added);
            Assert.Equal(DesktopPropResult.NotOwned, res);
            Assert.Null(added);
            Assert.Empty(desktop);

            var resUnknown = DesktopPropOps.PutOnDesktop(desktop, world, gs, "not_a_real_prop_xyz", 0.5, 0.5, cat, out var addedUnknown);
            Assert.Equal(DesktopPropResult.UnknownItem, resUnknown);
            Assert.Null(addedUnknown);
        }

        [Fact]
        public void PROP_Limit_SixAllowedSeventhReturnsFull()
        {
            var cat = LoadCatalog();
            var world = new WorldState();
            world.OwnedItems["toy_basket"] = 10;
            var gs = new GameState();
            var desktop = new List<DesktopProp>();

            for (int i = 0; i < 6; i++)
            {
                var res = DesktopPropOps.PutOnDesktop(desktop, world, gs, "toy_basket", 0.1 * (i + 1), 0.5, cat, out var added);
                Assert.Equal(DesktopPropResult.Ok, res);
                Assert.NotNull(added);
            }

            Assert.Equal(6, desktop.Count);

            var seventh = DesktopPropOps.PutOnDesktop(desktop, world, gs, "toy_basket", 0.9, 0.5, cat, out var seventhAdded);
            Assert.Equal(DesktopPropResult.Full, seventh);
            Assert.Null(seventhAdded);
            Assert.Equal(6, desktop.Count);
        }

        [Fact]
        public void PROP_Duplicate_SingleOwnedCopyCannotBePlacedTwice()
        {
            var cat = LoadCatalog();
            var world = new WorldState();
            world.OwnedItems["cushion_big"] = 1;
            var gs = new GameState();
            var desktop = new List<DesktopProp>();

            var first = DesktopPropOps.PutOnDesktop(desktop, world, gs, "cushion_big", 0.2, 0.3, cat, out _);
            Assert.Equal(DesktopPropResult.Ok, first);

            var second = DesktopPropOps.PutOnDesktop(desktop, world, gs, "cushion_big", 0.4, 0.6, cat, out var secondAdded);
            Assert.Equal(DesktopPropResult.NotOwned, second);
            Assert.Null(secondAdded);
            Assert.Single(desktop);
        }

        [Fact]
        public void PROP_RemoveMissing_ReturnsNotFound()
        {
            var desktop = new List<DesktopProp>();
            Assert.Equal(DesktopPropResult.NotFound, DesktopPropOps.RemoveFromDesktop(desktop, "missing_uid"));
            Assert.Equal(DesktopPropResult.NotFound, DesktopPropOps.MoveOnDesktop(desktop, "missing_uid", 0.5, 0.5));
        }

        [Fact]
        public void PROP_OffscreenCoords_MessagesRejectAndClampNormalizes()
        {
            Assert.NotNull(PropsMessages.Validate("props.place", new JObject { ["itemId"] = "toy_basket", ["x"] = -0.1, ["y"] = 0.5 }));
            Assert.NotNull(PropsMessages.Validate("props.place", new JObject { ["itemId"] = "toy_basket", ["x"] = 0.5, ["y"] = 1.5 }));
            Assert.NotNull(PropsMessages.Validate("props.move", new JObject { ["uid"] = "dp_1", ["x"] = double.NaN, ["y"] = 0.5 }));
            Assert.NotNull(PropsMessages.Validate("props.move", new JObject { ["uid"] = "dp_1", ["x"] = 0.5, ["y"] = double.PositiveInfinity }));

            var p1 = new DesktopProp { Uid = "1", ItemId = "toy_basket", X = -0.1, Y = 1.5 };
            p1.Clamp();
            Assert.Equal(0.0, p1.X);
            Assert.Equal(1.0, p1.Y);

            var p2 = new DesktopProp { Uid = "2", ItemId = "toy_basket", X = double.NaN, Y = double.NegativeInfinity };
            p2.Clamp();
            Assert.Equal(0.5, p2.X);
            Assert.Equal(0.5, p2.Y);
        }

        [Fact]
        public void PROP_OldSaveDefaults_NoPropsSectionHandledSafely()
        {
            var cat = LoadCatalog();
            const string oldJson = "{\"Version\":1,\"PlaceLevels\":{\"salon\":1}}";
            var world = JsonConvert.DeserializeObject<WorldState>(oldJson);
            var gs = new GameState();
            var desktop = new List<DesktopProp>();

            Assert.NotNull(world);
            Assert.Equal(0, DesktopPropOps.OwnedCount(world, gs, "toy_basket", cat));
            Assert.Equal(0, DesktopPropOps.PlacedInRoomsCount(world, "toy_basket"));
            Assert.Equal(0, DesktopPropOps.FreeCount(desktop, world, gs, "toy_basket", cat));
        }

        [Fact]
        public void PROP_MessageFuzz300_NeverThrows()
        {
            var rng = new Random(42125);
            string[] types = { "props.place", "props.move", "props.remove", "props.toRoom", "props.fromRoom", "unknown.type", "" };

            Assert.NotNull(PropsMessages.Validate("props.place", null));
            Assert.NotNull(PropsMessages.Validate(null, new JObject()));

            for (int i = 0; i < 300; i++)
            {
                string type = types[rng.Next(types.Length)];
                var msg = new JObject();
                int mode = rng.Next(5);

                if (mode == 0)
                {
                    msg["itemId"] = "toy_basket";
                    msg["uid"] = "dp_1";
                    msg["room"] = "salon";
                    msg["x"] = rng.NextDouble() * 3.0 - 1.0;
                    msg["y"] = rng.NextDouble() * 3.0 - 1.0;
                }
                else if (mode == 1)
                {
                    msg["itemId"] = new string('z', rng.Next(65, 100));
                    msg["uid"] = "   ";
                    msg["room"] = 42;
                    msg["x"] = "bad";
                    msg["y"] = double.NaN;
                }
                else if (mode == 2)
                {
                    msg["uid"] = "dp_1";
                    msg["room"] = "salon";
                    msg["x"] = rng.Next(-10, 250);
                    msg["y"] = rng.Next(-10, 250);
                }
                else if (mode == 3)
                {
                    msg["itemId"] = JValue.CreateNull();
                }

                // Must never throw
                string result = PropsMessages.Validate(type, msg);
                if (type == "unknown.type" || type == "")
                {
                    Assert.NotNull(result);
                }
            }
        }

        [Fact]
        public void PROP_ManualSheet_ExistsWithEightSteps()
        {
            string path = RepoFile.Find("docs/qa/DESKTOP_PROPS_MANUAL.md");
            Assert.True(File.Exists(path));
            string content = File.ReadAllText(path);

            for (int step = 1; step <= 8; step++)
            {
                Assert.Matches(new Regex($@"(?m)^{step}\.\s+"), content);
            }
        }
    }
}
