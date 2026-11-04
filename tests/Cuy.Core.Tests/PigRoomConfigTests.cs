using System;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigRoomConfigTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null)
            {
                throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            }
            return Path.Combine(dir, relativePath);
        }

        private static PigRoomConfig RealConfig()
        {
            return PigRoomConfig.Load(File.ReadAllText(RepoFile("assets/data/pig_rooms.json")));
        }

        [Fact]
        public void RealFile_LevelsAndDormMatchTheFile()
        {
            var cfg = RealConfig();

            Assert.Equal(3, cfg.Levels.Count);
            Assert.Equal(new[] { 10, 12, 14 }, cfg.Levels.Select(l => l.Cols).ToArray());
            Assert.Equal(new[] { 6, 7, 8 }, cfg.Levels.Select(l => l.Rows).ToArray());
            Assert.Equal(new[] { 0, 400, 900 }, cfg.Levels.Select(l => l.Cost).ToArray());

            Assert.Equal(3, cfg.Dorm.Levels.Count);
            Assert.Equal(new[] { 16, 20, 24 }, cfg.Dorm.Levels.Select(l => l.Cols).ToArray());
            Assert.Equal(new[] { 8, 9, 10 }, cfg.Dorm.Levels.Select(l => l.Rows).ToArray());
            Assert.Equal(new[] { 0, 1100, 1800 }, cfg.Dorm.Levels.Select(l => l.Cost).ToArray());
            Assert.Equal(1500, cfg.Dorm.UnlockCost);
            Assert.Equal("dorm", cfg.Dorm.Id);
            Assert.Equal(2, cfg.Dorm.RequiresPigs);
            Assert.Equal(6, cfg.Dorm.MaxResidents);
            Assert.Equal(0.05, cfg.Dorm.BondGainBonus, 6);

            Assert.Equal(1.0, cfg.ComfortOwn, 6);
            Assert.Equal(0.5, cfg.ComfortCommon, 6);
            Assert.Equal(0.0, cfg.ComfortOthers, 6);
            Assert.Contains("dorm", cfg.CommonPlaces);
            Assert.Equal(4, cfg.VariantCount);
        }

        [Fact]
        public void LoadDefault_FindsTheRealFile()
        {
            var cfg = PigRoomConfig.LoadDefault();

            Assert.Equal(3, cfg.Levels.Count);
            Assert.Equal(1500, cfg.Dorm.UnlockCost);
            Assert.Equal(5, cfg.Themes.Count);
        }

        [Fact]
        public void RoomId_RoundTripsThroughTryParse()
        {
            var cfg = RealConfig();

            Assert.Equal("pig:kuki", cfg.RoomId("kuki"));

            Assert.True(cfg.TryParseRoomId(cfg.RoomId("kuki"), out var pigId));
            Assert.Equal("kuki", pigId);

            Assert.False(cfg.TryParseRoomId("dorm", out _));
            Assert.False(cfg.TryParseRoomId("pig:", out _));
            Assert.False(cfg.TryParseRoomId(null, out _));
        }

        [Fact]
        public void RealFile_HasFiveNamedThemesWithTheirSignatures()
        {
            var cfg = RealConfig();

            Assert.Equal(new[] { "kuki", "ned", "james", "glen", "racuch" }.OrderBy(x => x).ToArray(),
                cfg.Themes.Keys.OrderBy(x => x).ToArray());
            Assert.Equal("sig_kuki_blanket", cfg.ThemeFor("kuki", 0).Signature);
            Assert.Equal("sig_ned_snack_nook", cfg.ThemeFor("ned", 0).Signature);
            Assert.Equal("sig_james_hideout", cfg.ThemeFor("james", 0).Signature);
            Assert.Equal("sig_glen_knit_bed", cfg.ThemeFor("glen", 0).Signature);
            Assert.Equal("sig_racuch_hop_pad", cfg.ThemeFor("racuch", 0).Signature);
            Assert.Equal("wall_pig_kuki", cfg.ThemeFor("kuki", 0).WallTile);
        }

        [Fact]
        public void UnknownPig_GetsDefaultThemeByIndex()
        {
            var cfg = RealConfig();

            Assert.Equal(3, cfg.DefaultThemes.Count);
            Assert.Same(cfg.DefaultThemes[0], cfg.ThemeFor("zed", 0));
            Assert.Same(cfg.DefaultThemes[1], cfg.ThemeFor("zed", 1));
            Assert.Same(cfg.DefaultThemes[1], cfg.ThemeFor("zed", 4));
            Assert.Same(cfg.DefaultThemes[2], cfg.ThemeFor(null, 2));
        }

        [Fact]
        public void RealFile_ThemeSkinsExistInDecorAndStarterAndSignatureInWorldItems()
        {
            var cfg = RealConfig();
            var decorIds = JObject.Parse(File.ReadAllText(RepoFile("assets/data/items_decor.json")))["items"]
                .Select(t => (string)t["id"]).ToHashSet();
            var worldIds = JObject.Parse(File.ReadAllText(RepoFile("assets/data/world_items.json")))["items"]
                .Select(t => (string)t["id"]).ToHashSet();

            var themes = cfg.DefaultThemes.Concat(cfg.Themes.Values).ToList();
            Assert.NotEmpty(themes);
            foreach (var theme in themes)
            {
                Assert.Contains(theme.Wallpaper, decorIds);
                Assert.Contains(theme.Floor, decorIds);
                Assert.Equal(3, theme.Starter.Count);
                foreach (var starter in theme.Starter)
                {
                    Assert.Contains(starter, worldIds);
                }
                if (!string.IsNullOrEmpty(theme.Signature))
                {
                    Assert.Contains(theme.Signature, worldIds);
                }
            }
        }

        [Fact]
        public void NameFor_UsesTemplatesAndCutsLongNames()
        {
            var cfg = RealConfig();

            Assert.Equal("Kuki's room", cfg.NameFor("Kuki", false));
            Assert.Equal("Kuki's memory room", cfg.NameFor("Kuki", true));
            Assert.Equal(24, cfg.MaxNameLen);
            Assert.Equal(new string('a', 24) + "'s room", cfg.NameFor(new string('a', 30), false));
        }

        [Fact]
        public void BrokenJson_GivesCodeDefaultsEqualToTheFile()
        {
            var cfg = PigRoomConfig.Load("{ this is not json");

            Assert.Equal(3, cfg.Levels.Count);
            Assert.Equal(new[] { 0, 400, 900 }, cfg.Levels.Select(l => l.Cost).ToArray());
            Assert.Equal(1500, cfg.Dorm.UnlockCost);
            Assert.Equal(new[] { 16, 20, 24 }, cfg.Dorm.Levels.Select(l => l.Cols).ToArray());
            Assert.Equal(5, cfg.Themes.Count);
            Assert.Equal(3, cfg.DefaultThemes.Count);
            Assert.Equal(4, cfg.VariantCount);
        }

        [Fact]
        public void FirstLevelCost_IsForcedToZero()
        {
            var cfg = PigRoomConfig.Load(@"{ ""template"": { ""levels"": [
                { ""cols"": 10, ""rows"": 6, ""cost"": 50 },
                { ""cols"": 12, ""rows"": 7, ""cost"": 400 } ] } }");

            Assert.Equal(2, cfg.Levels.Count);
            Assert.Equal(0, cfg.Levels[0].Cost);
            Assert.Equal(400, cfg.Levels[1].Cost);
        }

        [Fact]
        public void ShrinkingLevel_IsDropped()
        {
            var cfg = PigRoomConfig.Load(@"{ ""template"": { ""levels"": [
                { ""cols"": 10, ""rows"": 6, ""cost"": 0 },
                { ""cols"": 12, ""rows"": 7, ""cost"": 400 },
                { ""cols"": 11, ""rows"": 7, ""cost"": 500 },
                { ""cols"": 14, ""rows"": 8, ""cost"": 900 } ] } }");

            Assert.Equal(new[] { 10, 12, 14 }, cfg.Levels.Select(l => l.Cols).ToArray());
        }

        [Fact]
        public void ComfortWeights_AreClampedAndOrdered()
        {
            var clamped = PigRoomConfig.Load(@"{ ""comfort"": { ""own"": 2.0, ""common"": -1, ""others"": 0.5 } }");
            Assert.Equal(1.0, clamped.ComfortOwn, 6);
            Assert.Equal(0.0, clamped.ComfortCommon, 6);
            Assert.Equal(0.0, clamped.ComfortOthers, 6);

            var ordered = PigRoomConfig.Load(@"{ ""comfort"": { ""own"": 0.3, ""common"": 0.9, ""others"": 0.5 } }");
            Assert.Equal(0.3, ordered.ComfortOwn, 6);
            Assert.Equal(0.3, ordered.ComfortCommon, 6);
            Assert.Equal(0.3, ordered.ComfortOthers, 6);
        }

        [Fact]
        public void VariantCount_IsClampedToOneToEight()
        {
            Assert.Equal(1, PigRoomConfig.Load(@"{ ""variants"": { ""count"": 0 } }").VariantCount);
            Assert.Equal(8, PigRoomConfig.Load(@"{ ""variants"": { ""count"": 99 } }").VariantCount);
        }

        [Fact]
        public void DormResidents_AreClampedToTwoToSix()
        {
            Assert.Equal(2, PigRoomConfig.Load(@"{ ""dorm"": { ""max_residents"": 1 } }").Dorm.MaxResidents);
            Assert.Equal(6, PigRoomConfig.Load(@"{ ""dorm"": { ""max_residents"": 10 } }").Dorm.MaxResidents);
        }

        [Fact]
        public void ThemeStarter_IsPaddedAndCutToThree()
        {
            var cfg = PigRoomConfig.Load(@"{ ""themes"": {
                ""short"": { ""wallpaper"": ""wallpaper_mint"", ""floor"": ""floor_wood_light"", ""starter"": [ ""side_table"" ] },
                ""long"": { ""wallpaper"": ""wallpaper_mint"", ""floor"": ""floor_wood_light"", ""starter"": [ ""a"", ""b"", ""c"", ""d"" ] } } }");

            var padded = cfg.Themes["short"];
            Assert.Equal(3, padded.Starter.Count);
            Assert.Equal("side_table", padded.Starter[0]);
            Assert.Equal(new[] { "side_table", "cushion_big", "window_sun" }, padded.Starter.ToArray());

            var cut = cfg.Themes["long"];
            Assert.Equal(new[] { "a", "b", "c" }, cut.Starter.ToArray());
        }
    }
}
