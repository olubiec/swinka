using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class DesktopPropCatalogTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null && !File.Exists(Path.Combine(dir.FullName, "Cuy.sln")))
            {
                dir = dir.Parent;
            }
            Assert.NotNull(dir);
            return Path.Combine(dir.FullName, relativePath.Replace('/', Path.DirectorySeparatorChar));
        }

        [Fact]
        public void Load_FromRepoJson_ReadsAllEightPropsAndMax()
        {
            string json = File.ReadAllText(RepoFile("assets/data/desktop_props.json"));
            var catalog = DesktopPropCatalog.Load(json);

            Assert.Equal(6, catalog.MaxOnDesktop);
            Assert.Equal(8, catalog.All.Count);
            Assert.True(catalog.IsProp("toy_basket"));
            Assert.True(catalog.IsProp("golden_bowl"));
            Assert.False(catalog.IsProp("unknown_item"));

            var bowl = catalog.Find("golden_bowl");
            Assert.NotNull(bowl);
            Assert.Null(bowl.RoomItemId);
            Assert.Equal("inventory", bowl.Source);
            Assert.Equal("props/ball.png", bowl.Sprite);

            Assert.Equal("toy_basket", catalog.RoomItemFor("toy_basket"));
            Assert.Null(catalog.RoomItemFor("golden_bowl"));
            Assert.Equal("warm_house_bed", catalog.InventoryFor("cosy_nook"));
        }

        [Fact]
        public void Load_InvalidOrEmptyJson_FallsBackToDefaults()
        {
            var empty = DesktopPropCatalog.Load("");
            var bad = DesktopPropCatalog.Load("{ not valid json");

            Assert.Equal(6, empty.MaxOnDesktop);
            Assert.Equal(8, empty.All.Count);
            Assert.Equal(6, bad.MaxOnDesktop);
            Assert.Equal(8, bad.All.Count);
        }

        [Fact]
        public void FromWorldCatalog_MapsItemsWithPropOf()
        {
            var worldCatalog = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition("room_ball", "Room Ball", new[] { "salon" }, 1, 1, 20, 2, "floor", "toy_basket", propOf: "toy_basket"),
                new WorldItemDefinition("wall_art", "Wall Art", new[] { "salon" }, 1, 1, 20, 2, "wall", "art")
            });

            var catalog = DesktopPropCatalog.FromWorldCatalog(worldCatalog, maxOnDesktop: 4);

            Assert.Equal(4, catalog.MaxOnDesktop);
            Assert.Single(catalog.All);
            Assert.True(catalog.IsProp("toy_basket"));
            Assert.Equal("room_ball", catalog.RoomItemFor("toy_basket"));
        }
    }
}
