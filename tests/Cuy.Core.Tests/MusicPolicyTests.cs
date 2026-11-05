using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Audio;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MusicPolicyTests
    {
        private static MusicSettings On(bool atNight = false)
        {
            return new MusicSettings { MusicOn = true, AtNight = atNight };
        }

        private static DateTime At(int hour, int minute = 0)
        {
            return new DateTime(2026, 1, 15, hour, minute, 0);
        }

        [Theory]
        [InlineData(6, 0, "bed_morning")]
        [InlineData(8, 59, "bed_morning")]
        [InlineData(9, 0, "bed_day")]
        [InlineData(16, 59, "bed_day")]
        [InlineData(17, 0, "bed_evening")]
        [InlineData(21, 59, "bed_evening")]
        public void PickBed_DayHours_MatchTable(int hour, int minute, string expected)
        {
            Assert.Equal(expected, MusicPolicy.PickBed(At(hour, minute), On()));
        }

        [Fact]
        public void PickBed_Night_WithoutConsent_IsNull()
        {
            Assert.Null(MusicPolicy.PickBed(At(22, 0), On()));
            Assert.Null(MusicPolicy.PickBed(At(23, 30), On()));
            Assert.Null(MusicPolicy.PickBed(At(0, 0), On()));
            Assert.Null(MusicPolicy.PickBed(At(7, 59), On()));
        }

        [Fact]
        public void PickBed_Night_WithConsent_PlaysNightAndMorning()
        {
            Assert.Equal("bed_night", MusicPolicy.PickBed(At(22, 0), On(true)));
            Assert.Equal("bed_night", MusicPolicy.PickBed(At(23, 30), On(true)));
            Assert.Equal("bed_night", MusicPolicy.PickBed(At(5, 59), On(true)));
            Assert.Equal("bed_morning", MusicPolicy.PickBed(At(6, 0), On(true)));
            Assert.Equal("bed_morning", MusicPolicy.PickBed(At(7, 59), On(true)));
        }

        [Fact]
        public void PickBed_MusicOff_AlwaysNull()
        {
            var off = new MusicSettings { MusicOn = false, AtNight = true };
            Assert.Null(MusicPolicy.PickBed(At(10, 0), off));
            Assert.Null(MusicPolicy.PickBed(At(23, 0), off));
        }

        [Fact]
        public void Resolve_EmptyOrNull_IsNull()
        {
            Assert.Null(MusicPolicy.Resolve(new MusicContext[0]));
            Assert.Null(MusicPolicy.Resolve(null));
        }

        [Fact]
        public void Resolve_HigherPriorityWins()
        {
            var home = new MusicContext("home", MusicPriority.Home, "home_main", 1);
            var mg = new MusicContext("minigame", MusicPriority.Minigame, "mg_veggie_rain", 2);
            var desk = new MusicContext("desktop", MusicPriority.Desktop, "bed_day", 3);
            Assert.Same(mg, MusicPolicy.Resolve(new[] { desk, home, mg }));
        }

        [Fact]
        public void Resolve_TieGoesToLaterSeq()
        {
            var first = new MusicContext("place", MusicPriority.Place, "place_garden_day", 5);
            var later = new MusicContext("place", MusicPriority.Place, "place_park", 9);
            Assert.Same(later, MusicPolicy.Resolve(new[] { later, first }));
            Assert.Same(later, MusicPolicy.Resolve(new[] { first, later }));
        }

        [Fact]
        public void Priorities_AreFixed()
        {
            Assert.Equal(50, MusicPriority.Minigame);
            Assert.Equal(40, MusicPriority.Record);
            Assert.Equal(30, MusicPriority.Home);
            Assert.Equal(20, MusicPriority.Place);
            Assert.Equal(10, MusicPriority.Desktop);
        }

        [Fact]
        public void Arrangement_Baby_IsOctaveUpTempoAndCelesta()
        {
            var a = MusicPolicy.Arrangement(LifeStage.Baby);
            Assert.Equal(1, a.Octave);
            Assert.Equal(1.10, a.Tempo, 6);
            Assert.Equal("celesta", a.Timbre);
        }

        [Theory]
        [InlineData(LifeStage.Junior)]
        [InlineData(LifeStage.Adult)]
        [InlineData(LifeStage.Senior)]
        [InlineData(LifeStage.Legend)]
        public void Arrangement_OtherStages_AreNeutral(LifeStage stage)
        {
            var a = MusicPolicy.Arrangement(stage);
            Assert.Equal(0, a.Octave);
            Assert.Equal(1.0, a.Tempo, 6);
            Assert.Equal("default", a.Timbre);
        }

        [Fact]
        public void WearChain_Mint_HasNoWear()
        {
            var w = MusicPolicy.WearChain("mint");
            Assert.False(w.Crackle);
            Assert.Equal(0, w.WowPct, 6);
            Assert.Equal(MusicPolicy.NoLowpassHz, w.LowpassHz, 6);
            Assert.False(w.Crush);
        }

        [Fact]
        public void WearChain_MissingCondition_IsMint()
        {
            Assert.False(MusicPolicy.WearChain(null).Crackle);
            Assert.False(MusicPolicy.WearChain("").Crackle);
        }

        [Fact]
        public void WearChain_Worn_MatchesTable()
        {
            var w = MusicPolicy.WearChain("worn");
            Assert.True(w.Crackle);
            Assert.Equal(-30, w.CrackleDb, 6);
            Assert.Equal(0.3, w.WowPct, 6);
            Assert.Equal(0.5, w.WowHz, 6);
            Assert.Equal(9000, w.LowpassHz, 6);
            Assert.False(w.Crush);
        }

        [Fact]
        public void WearChain_Scratched_MatchesTable()
        {
            var w = MusicPolicy.WearChain("scratched");
            Assert.Equal(-24, w.CrackleDb, 6);
            Assert.Equal(0.6, w.WowPct, 6);
            Assert.Equal(7000, w.LowpassHz, 6);
            Assert.False(w.Crush);
        }

        [Fact]
        public void WearChain_Warped_MatchesTable()
        {
            var w = MusicPolicy.WearChain("warped");
            Assert.Equal(-28, w.CrackleDb, 6);
            Assert.Equal(2.5, w.WowPct, 6);
            Assert.Equal(0.3, w.WowHz, 6);
            Assert.Equal(5000, w.LowpassHz, 6);
            Assert.False(w.Crush);
        }

        [Fact]
        public void WearChain_Cracked_HasCrush()
        {
            var w = MusicPolicy.WearChain("cracked");
            Assert.Equal(-20, w.CrackleDb, 6);
            Assert.Equal(1.0, w.WowPct, 6);
            Assert.Equal(4000, w.LowpassHz, 6);
            Assert.True(w.Crush);
            Assert.Equal(8, w.CrushBits);
            Assert.Equal(12000, w.CrushRateHz, 6);
        }

        [Fact]
        public void RecordTrack_BuildsId()
        {
            Assert.Equal("rec_s1_poranek_a1", MusicPolicy.RecordTrack("s1_poranek", 'a', 1));
            Assert.Equal("rec_s4_kaseta_b2", MusicPolicy.RecordTrack("s4_kaseta", 'b', 2));
        }

        [Fact]
        public void RecordTrack_InvalidArguments_Throw()
        {
            Assert.Throws<ArgumentException>(() => MusicPolicy.RecordTrack("", 'a', 1));
            Assert.Throws<ArgumentException>(() => MusicPolicy.RecordTrack(null, 'a', 1));
            Assert.Throws<ArgumentException>(() => MusicPolicy.RecordTrack("s1_poranek", 'c', 1));
            Assert.Throws<ArgumentException>(() => MusicPolicy.RecordTrack("s1_poranek", 'a', 3));
            Assert.Throws<ArgumentException>(() => MusicPolicy.RecordTrack("s1_poranek", 'a', 0));
        }

        [Fact]
        public void DanceFor_MissingFile_IsNull()
        {
            MusicPolicy.PlayersDesignPath = Path.Combine(Path.GetTempPath(), "no_such_players_design.json");
            try
            {
                Assert.Null(MusicPolicy.DanceFor("player_turntable", "s1"));
            }
            finally
            {
                MusicPolicy.PlayersDesignPath = null;
            }
        }

        [Fact]
        public void DanceFor_ReadsStyleFromFile()
        {
            string path = Path.Combine(Path.GetTempPath(), "cuy_players_design_test.json");
            File.WriteAllText(path,
                "{\"players\":{\"player_turntable\":{\"dance_style\":\"kolysanie\"}," +
                "\"player_gramophone\":{\"dance_style\":\"obrot\"}," +
                "\"player_jukebox\":{\"dance_style\":\"wszystkie\"}}}");
            MusicPolicy.PlayersDesignPath = path;
            try
            {
                Assert.Equal("kolysanie", MusicPolicy.DanceFor("player_turntable", "s1"));
                Assert.Equal("obrot", MusicPolicy.DanceFor("player_gramophone", "s1"));
                Assert.Equal("popcorn", MusicPolicy.DanceFor("player_jukebox", "s4"));
                Assert.Null(MusicPolicy.DanceFor("player_unknown", "s1"));
            }
            finally
            {
                MusicPolicy.PlayersDesignPath = null;
                File.Delete(path);
            }
        }

        [Theory]
        [InlineData(0, 3000.0, 0.0)]
        [InlineData(50, 7500.0, 1.0)]
        [InlineData(100, 12000.0, 2.0)]
        [InlineData(-20, 3000.0, 0.0)]
        [InlineData(150, 12000.0, 2.0)]
        public void ComfortFilter_ScalesAndClamps(int comfort, double lowpass, double padDb)
        {
            var f = MusicPolicy.ComfortFilter(comfort);
            Assert.Equal(lowpass, f.LowpassHz, 6);
            Assert.Equal(padDb, f.PadGainDb, 6);
        }
    }
}
