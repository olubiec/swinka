using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    internal static class RepoFile
    {
        public static string Find(string relativePath)
        {
            string? dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }
    }

    public class WorldItemCatalogTests
    {
        private static WorldItemCatalog LoadRealCatalog()
        {
            string filePath = RepoFile.Find("assets/data/world_items.json");
            return WorldItemCatalog.Load(File.ReadAllText(filePath));
        }

        [Fact]
        public void RealCatalog_LoadsAllItems_CountAtLeast50()
        {
            var catalog = LoadRealCatalog();
            Assert.NotNull(catalog);
            // 45 base + 5 signature + 1 gate + 4 props = 55 items; +26 from the art handover (approved by owner, 5.11.2026) = 81
            Assert.True(catalog.Items.Count >= 50);
            Assert.Equal(81, catalog.Items.Count);
        }

        [Fact]
        public void RealCatalog_IdsAreUnique()
        {
            var catalog = LoadRealCatalog();
            var ids = catalog.Items.Select(i => i.Id).ToList();
            Assert.Equal(ids.Distinct(StringComparer.OrdinalIgnoreCase).Count(), ids.Count);
        }

        [Fact]
        public void RealCatalog_SignatureItems_AreFreeAndHaveSignatureOf()
        {
            var catalog = LoadRealCatalog();
            var sigItems = catalog.Items.Where(i => !string.IsNullOrEmpty(i.SignatureOf)).ToList();
            Assert.Equal(5, sigItems.Count);

            var expectedSigs = new[] { "kuki", "ned", "james", "glen", "racuch" };
            var actualSigs = sigItems.Select(i => i.SignatureOf).OrderBy(s => s).ToArray();
            Assert.Equal(expectedSigs.OrderBy(s => s).ToArray(), actualSigs);

            foreach (var sig in sigItems)
            {
                Assert.True(sig.Free);
                Assert.Equal(0, sig.Price);
            }
        }

        [Fact]
        public void RealCatalog_FenceWoodAndPathStone_AreRepeatable()
        {
            var catalog = LoadRealCatalog();

            var fenceWood = catalog.Find("fence_wood");
            Assert.NotNull(fenceWood);
            Assert.True(fenceWood.Repeatable);

            var pathStone = catalog.Find("path_stone");
            Assert.NotNull(pathStone);
            Assert.True(pathStone.Repeatable);

            // Regular furniture is not repeatable by default
            var sofa = catalog.Find("sofa_cosy");
            Assert.NotNull(sofa);
            Assert.False(sofa.Repeatable);
        }

        [Fact]
        public void RealCatalog_MemoryCorner_IsFreeAndRequiresMemorialPig()
        {
            var catalog = LoadRealCatalog();

            var mem = catalog.Find("memory_corner");
            Assert.NotNull(mem);
            Assert.True(mem.Free);
            Assert.Equal(0, mem.Price);
            Assert.Equal("memorial_pig", mem.Requires);
        }

        [Fact]
        public void RealCatalog_ItemsFitGridDimensions_HouseAndGarden()
        {
            var catalog = LoadRealCatalog();

            // Room (house) items: W <= 4 and H <= 4
            var houseItems = catalog.ForPlace("house");
            Assert.NotEmpty(houseItems);
            foreach (var item in houseItems)
            {
                Assert.True(item.W <= 4, $"House item {item.Id} width {item.W} exceeds 4");
                Assert.True(item.H <= 4, $"House item {item.Id} height {item.H} exceeds 4");
            }

            // Garden items: W <= 5 and H <= 4
            var gardenItems = catalog.ForPlace("garden");
            Assert.NotEmpty(gardenItems);
            foreach (var item in gardenItems)
            {
                Assert.True(item.W <= 5, $"Garden item {item.Id} width {item.W} exceeds 5");
                Assert.True(item.H <= 4, $"Garden item {item.Id} height {item.H} exceeds 4");
            }

            // Verify with places.json parsed directly
            string placesPath = RepoFile.Find("assets/data/places.json");
            var placesRoot = JObject.Parse(File.ReadAllText(placesPath));
            Assert.NotNull(placesRoot["places"]);
        }

        [Fact]
        public void RealCatalog_ComfortPerPlace_AtLeast20()
        {
            var catalog = LoadRealCatalog();
            var places = new[] { "house", "garden", "park" };

            foreach (var place in places)
            {
                var items = catalog.ForPlace(place);
                int totalComfort = items.Sum(i => i.Comfort);
                Assert.True(totalComfort >= 20, $"Place '{place}' total comfort is {totalComfort}, expected at least 20");
            }
        }

        [Fact]
        public void RealCatalog_Layers_ContainsGroundFloorWall()
        {
            var catalog = LoadRealCatalog();
            Assert.Contains("ground", catalog.Layers);
            Assert.Contains("floor", catalog.Layers);
            Assert.Contains("wall", catalog.Layers);
        }

        [Fact]
        public void Find_IsCaseInsensitive()
        {
            var catalog = LoadRealCatalog();
            var item1 = catalog.Find("sofa_cosy");
            var item2 = catalog.Find("SOFA_COSY");
            var item3 = catalog.Find("Sofa_Cosy");

            Assert.NotNull(item1);
            Assert.Same(item1, item2);
            Assert.Same(item1, item3);
        }

        [Fact]
        public void Find_NonExistentOrNull_ReturnsNull()
        {
            var catalog = LoadRealCatalog();
            Assert.Null(catalog.Find(null));
            Assert.Null(catalog.Find(""));
            Assert.Null(catalog.Find("non_existent_item_id_xyz"));
        }

        [Fact]
        public void Rule_DuplicateIds_KeepsFirst()
        {
            string json = @"{
                ""layers"": [""floor""],
                ""items"": [
                    { ""id"": ""dup"", ""name"": ""First"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" },
                    { ""id"": ""dup"", ""name"": ""Second"", ""place"": [""house""], ""w"": 2, ""h"": 2, ""price"": 20, ""comfort"": 2, ""layer"": ""floor"" }
                ]
            }";

            var catalog = WorldItemCatalog.Load(json);
            Assert.Single(catalog.Items);
            var item = catalog.Find("dup");
            Assert.NotNull(item);
            Assert.Equal("First", item.Name);
            Assert.Equal(1, item.W);
        }

        [Fact]
        public void Rule_UnknownLayer_DropsItem()
        {
            string json = @"{
                ""layers"": [""floor""],
                ""items"": [
                    { ""id"": ""bad_layer"", ""name"": ""Bad Layer"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""ceiling"" },
                    { ""id"": ""good_item"", ""name"": ""Good Item"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" }
                ]
            }";

            var catalog = WorldItemCatalog.Load(json);
            Assert.Single(catalog.Items);
            Assert.Null(catalog.Find("bad_layer"));
            Assert.NotNull(catalog.Find("good_item"));
        }

        [Fact]
        public void Rule_UnknownPlace_DropsItem()
        {
            string json = @"{
                ""layers"": [""floor""],
                ""items"": [
                    { ""id"": ""bad_place"", ""name"": ""Bad Place"", ""place"": [""moon""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" },
                    { ""id"": ""mixed_place"", ""name"": ""Mixed Place"", ""place"": [""house"", ""unknown_place""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" },
                    { ""id"": ""empty_place"", ""name"": ""Empty Place"", ""place"": [], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" },
                    { ""id"": ""good_item"", ""name"": ""Good Item"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" }
                ]
            }";

            var catalog = WorldItemCatalog.Load(json);
            Assert.Single(catalog.Items);
            Assert.Null(catalog.Find("bad_place"));
            Assert.Null(catalog.Find("mixed_place"));
            Assert.Null(catalog.Find("empty_place"));
            Assert.NotNull(catalog.Find("good_item"));
        }

        [Theory]
        [InlineData(0, 1)]
        [InlineData(7, 1)]
        [InlineData(1, 0)]
        [InlineData(1, 7)]
        public void Rule_InvalidDimensions_DropsItem(int w, int h)
        {
            string json = $@"{{
                ""layers"": [""floor""],
                ""items"": [
                    {{ ""id"": ""bad_dim"", ""name"": ""Bad Dim"", ""place"": [""house""], ""w"": {w}, ""h"": {h}, ""price"": 10, ""comfort"": 1, ""layer"": ""floor"" }}
                ]
            }}";

            var catalog = WorldItemCatalog.Load(json);
            Assert.Empty(catalog.Items);
        }

        [Fact]
        public void Rule_Clamping_NegativePrice_And_Comfort()
        {
            string json = @"{
                ""layers"": [""floor""],
                ""items"": [
                    { ""id"": ""item_low"", ""name"": ""Low"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": -50, ""comfort"": -5, ""layer"": ""floor"" },
                    { ""id"": ""item_high"", ""name"": ""High"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 100, ""comfort"": 25, ""layer"": ""floor"" }
                ]
            }";

            var catalog = WorldItemCatalog.Load(json);
            var itemLow = catalog.Find("item_low");
            Assert.NotNull(itemLow);
            Assert.Equal(0, itemLow.Price);
            Assert.Equal(0, itemLow.Comfort);

            var itemHigh = catalog.Find("item_high");
            Assert.NotNull(itemHigh);
            Assert.Equal(100, itemHigh.Price);
            Assert.Equal(10, itemHigh.Comfort);
        }

        [Fact]
        public void Rule_Repeatable_ExplicitOverride()
        {
            string json = @"{
                ""layers"": [""ground"", ""floor""],
                ""items"": [
                    { ""id"": ""fence_non_repeat"", ""place"": [""garden""], ""w"": 1, ""h"": 1, ""price"": 10, ""comfort"": 0, ""layer"": ""floor"", ""repeatable"": false },
                    { ""id"": ""table_repeat"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 50, ""comfort"": 1, ""layer"": ""floor"", ""repeatable"": true }
                ]
            }";

            var catalog = WorldItemCatalog.Load(json);
            var fence = catalog.Find("fence_non_repeat");
            Assert.NotNull(fence);
            Assert.False(fence.Repeatable);

            var table = catalog.Find("table_repeat");
            Assert.NotNull(table);
            Assert.True(table.Repeatable);
        }

        [Fact]
        public void Load_BadJson_ReturnsEmptyCatalog()
        {
            var catalog1 = WorldItemCatalog.Load(null);
            Assert.Empty(catalog1.Items);

            var catalog2 = WorldItemCatalog.Load("{ invalid json syntax ... ");
            Assert.Empty(catalog2.Items);
        }

        [Fact]
        public void LoadDefault_LoadsSuccessfully()
        {
            var catalog = WorldItemCatalog.LoadDefault();
            Assert.NotNull(catalog);
            Assert.True(catalog.Items.Count >= 50);
        }

        [Fact]
        public void Current_ReturnsSingletonInstance()
        {
            var current1 = WorldItemCatalog.Current;
            var current2 = WorldItemCatalog.Current;
            Assert.NotNull(current1);
            Assert.Same(current1, current2);
        }
    }
}
