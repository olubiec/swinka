using System;
using System.IO;
using Xunit;
using Cuy.Core.Pigs;

namespace Cuy.Core.Tests
{
    public class LegendRollTests
    {
        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        private static NamedPigCatalog LoadCatalog()
        {
            string json = File.ReadAllText(RepoFile("assets/data/pigs_named.json"));
            return NamedPigCatalog.Load(json);
        }

        [Fact]
        public void KukiAndNed_WithinExpectedRanges_Across1000Seeds()
        {
            var catalog = LoadCatalog();
            var kukiDef = catalog.Find("kuki");
            var nedDef = catalog.Find("ned");

            Assert.NotNull(kukiDef);
            Assert.NotNull(nedDef);

            for (int seed = 0; seed < 1000; seed++)
            {
                var rngKuki = new Random(seed);
                double? kuki = LegendRoll.RollFor(kukiDef, rngKuki);
                Assert.NotNull(kuki);
                Assert.InRange(kuki.Value, 6.0, 7.5);

                var rngNed = new Random(seed);
                double? ned = LegendRoll.RollFor(nedDef, rngNed);
                Assert.NotNull(ned);
                Assert.InRange(ned.Value, 7.0, 9.5);
            }
        }

        [Fact]
        public void KukiBelowNed_InAtLeast95Percent_For1000SeededPairs()
        {
            var catalog = LoadCatalog();
            var kukiDef = catalog.Find("kuki");
            var nedDef = catalog.Find("ned");

            Assert.NotNull(kukiDef);
            Assert.NotNull(nedDef);

            int kukiBelowNedCount = 0;
            for (int seed = 0; seed < 1000; seed++)
            {
                var rng = new Random(seed);
                double kuki = LegendRoll.RollFor(kukiDef, rng).Value;
                double ned = LegendRoll.RollFor(nedDef, rng).Value;

                if (kuki < ned)
                {
                    kukiBelowNedCount++;
                }
            }

            Assert.True(kukiBelowNedCount >= 950, $"Kuki was below Ned in {kukiBelowNedCount}/1000 pairs, expected at least 950 (95%).");
        }

        [Fact]
        public void JamesGlenRacuch_ValuesAreWithinDefaultRange()
        {
            var catalog = LoadCatalog();
            string[] defaultPigIds = new[] { "james", "glen", "racuch" };

            foreach (var pigId in defaultPigIds)
            {
                var def = catalog.Find(pigId);
                Assert.NotNull(def);

                for (int seed = 0; seed < 1000; seed++)
                {
                    var rng = new Random(seed);
                    double? val = LegendRoll.RollFor(def, rng);
                    Assert.NotNull(val);
                    Assert.InRange(val.Value, 6.5, 9.5);
                }
            }
        }

        [Fact]
        public void SameSeed_GivesSameValue()
        {
            var catalog = LoadCatalog();
            var kukiDef = catalog.Find("kuki");
            Assert.NotNull(kukiDef);

            const int seed = 424242;
            double? val1 = LegendRoll.RollFor(kukiDef, new Random(seed));
            double? val2 = LegendRoll.RollFor(kukiDef, new Random(seed));

            Assert.NotNull(val1);
            Assert.Equal(val1, val2);

            double roll1 = LegendRoll.Roll(6.0, 7.5, new Random(seed));
            double roll2 = LegendRoll.Roll(6.0, 7.5, new Random(seed));
            Assert.Equal(roll1, roll2);
        }

        [Fact]
        public void Assign_DoesNotOverwriteExistingValue()
        {
            var catalog = LoadCatalog();
            var kukiDef = catalog.Find("kuki");
            Assert.NotNull(kukiDef);

            var pig = new PigProfile { LegendAtYears = 7.25 };
            bool assigned = LegendRoll.Assign(pig, kukiDef, new Random(123));

            Assert.False(assigned);
            Assert.Equal(7.25, pig.LegendAtYears);
        }

        [Fact]
        public void Assign_NonNamedPig_LeftNull()
        {
            var pig = new PigProfile { LegendAtYears = null };
            bool assigned = LegendRoll.Assign(pig, null, new Random(123));

            Assert.False(assigned);
            Assert.Null(pig.LegendAtYears);

            double? rolled = LegendRoll.RollFor(null, new Random(123));
            Assert.Null(rolled);
        }

        [Fact]
        public void SwappedOrEqualBounds_BehaveAsDescribed()
        {
            var rng = new Random(42);

            // Equal bounds return the bound
            Assert.Equal(8.0, LegendRoll.Roll(8.0, 8.0, rng));
            Assert.Equal(7.25, LegendRoll.Roll(7.25, 7.25, rng));

            // Swapped bounds produce identical result to normal bounds for the same seed
            for (int seed = 0; seed < 100; seed++)
            {
                double normal = LegendRoll.Roll(7.0, 9.5, new Random(seed));
                double swapped = LegendRoll.Roll(9.5, 7.0, new Random(seed));
                Assert.Equal(normal, swapped);
                Assert.InRange(swapped, 7.0, 9.5);
            }
        }

        [Fact]
        public void Assign_WhenNull_SetsValueAndReturnsTrue()
        {
            var catalog = LoadCatalog();
            var nedDef = catalog.Find("ned");
            Assert.NotNull(nedDef);

            var pig = new PigProfile { LegendAtYears = null };
            bool assigned = LegendRoll.Assign(pig, nedDef, new Random(123));

            Assert.True(assigned);
            Assert.NotNull(pig.LegendAtYears);
            Assert.InRange(pig.LegendAtYears.Value, 7.0, 9.5);

            // Second assignment does nothing
            bool secondAssign = LegendRoll.Assign(pig, nedDef, new Random(456));
            Assert.False(secondAssign);
        }

        [Fact]
        public void Roll_RoundedToTwoDecimals()
        {
            for (int seed = 0; seed < 500; seed++)
            {
                double val = LegendRoll.Roll(6.0, 7.5, new Random(seed));
                Assert.Equal(val, Math.Round(val, 2));
            }
        }
    }
}
