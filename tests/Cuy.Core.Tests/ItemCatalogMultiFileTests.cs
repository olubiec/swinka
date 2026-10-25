using System.Collections.Generic;
using Cuy.Core;
using Xunit;

namespace Cuy.Core.Tests
{
    public class ItemCatalogMultiFileTests
    {
        [Fact]
        public void LoadJsonFiles_MergesTwoFiles()
        {
            var json1 = @"{ ""items"": [ { ""id"": ""item1"", ""name"": ""Item One"" } ] }";
            var json2 = @"{ ""items"": [ { ""id"": ""item2"", ""name"": ""Item Two"" } ] }";

            var catalog = ItemCatalog.LoadJsonFiles(new[] { json1, json2 });

            Assert.Equal(2, catalog.AllItems.Count);
            Assert.NotNull(catalog.GetItem("item1"));
            Assert.NotNull(catalog.GetItem("item2"));
        }

        [Fact]
        public void LoadJsonFiles_DuplicateIdKeepsFirst()
        {
            var json1 = @"{ ""items"": [ { ""id"": ""dup"", ""name"": ""First"" } ] }";
            var json2 = @"{ ""items"": [ { ""id"": ""dup"", ""name"": ""Second"" } ] }";

            var catalog = ItemCatalog.LoadJsonFiles(new[] { json1, json2 });

            Assert.Single(catalog.AllItems);
            var item = catalog.GetItem("dup");
            Assert.NotNull(item);
            Assert.Equal("First", item.Name);
        }
    }
}
