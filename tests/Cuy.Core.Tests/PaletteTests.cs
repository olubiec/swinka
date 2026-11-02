using System;
using System.IO;
using System.Linq;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PaletteTests
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

        private static Palettes Load()
        {
            return Palettes.Parse(File.ReadAllText(RepoFile("assets/sprites/palettes.json")));
        }

        [Theory]
        [InlineData("tricolor")]
        [InlineData("dutch")]
        [InlineData("agouti")]
        [InlineData("albino")]
        [InlineData("cinnamon")]
        public void EveryGamePalette_Exists_WithPairs(string id)
        {
            var p = Load();
            Assert.True(p.Has(id));
            Assert.NotEmpty(p.Get(id));
        }

        [Fact]
        public void ParseHex_ReadsRgb()
        {
            Assert.Equal(0xF7B46E, Palettes.ParseHex("#f7b46e"));
        }

        [Fact]
        public void Tricolor_MapsRustToDark_AndKeepsOrange()
        {
            var pairs = Load().Get("tricolor");
            Assert.Contains(pairs, x => x.From == 0xDC7445 && x.To == 0x4B3F45);
            Assert.DoesNotContain(pairs, x => x.From == 0xF7B46E);
        }

        [Fact]
        public void Albino_ChangesEyeColour()
        {
            var pairs = Load().Get("albino");
            Assert.Contains(pairs, x => x.From == 0x2B1712 && x.To == 0xC2283A);
        }

        [Fact]
        public void UnknownId_FallsBackToDefault()
        {
            var p = Load();
            Assert.Equal(Palettes.DefaultId, p.Normalize("nope"));
            Assert.Equal(Palettes.DefaultId, p.Normalize(null));
            Assert.Equal(p.Get(Palettes.DefaultId).Length, p.Get("nope").Length);
        }

        [Fact]
        public void NoPalette_MapsOneSourceColourTwice()
        {
            var p = Load();
            foreach (var id in p.Ids)
            {
                var from = p.Get(id).Select(x => x.From).ToArray();
                Assert.Equal(from.Length, from.Distinct().Count());
            }
        }
    }
}
