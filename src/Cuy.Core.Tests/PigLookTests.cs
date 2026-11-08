using System;
using System.IO;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigLookTests
    {
        private static string FindRepoRoot()
        {
            string dir = AppContext.BaseDirectory;
            while (!string.IsNullOrEmpty(dir))
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln"))) return dir;
                dir = Path.GetDirectoryName(dir);
            }
            return Directory.GetCurrentDirectory();
        }

        /// <summary>
        /// K1: starter-differs-from-kuki-and-ned
        /// The starter pig gets the default skin of its breed/coat, NOT Kuki's or Ned's skin.
        /// </summary>
        [Fact]
        public void K1_StarterDiffersFromKukiAndNed()
        {
            var starter = new PigProfile("Cuy", "smooth", "tricolor");
            var kuki = new PigProfile("Kuki", "rosette_normal", "two_tone.ginger") { NamedId = "kuki" };
            var ned = new PigProfile("Ned", "teddy_chubby", "bicolor_head.chocolate") { NamedId = "ned" };

            var starterLook = PigLookResolver.Resolve(starter, "adult");
            var kukiLook = PigLookResolver.Resolve(kuki, "adult");
            var nedLook = PigLookResolver.Resolve(ned, "adult");

            Assert.NotEqual(kukiLook.SpriteKey, starterLook.SpriteKey);
            Assert.NotEqual(nedLook.SpriteKey, starterLook.SpriteKey);
            Assert.NotEqual(kukiLook.SpriteKey, nedLook.SpriteKey);
            Assert.Null(starterLook.Named);
            Assert.Equal("kuki", kukiLook.Named);
            Assert.Equal("ned", nedLook.Named);
        }

        /// <summary>
        /// K2: same-input-same-key
        /// Calling resolve multiple times on identical input yields identical look descriptor and key.
        /// </summary>
        [Fact]
        public void K2_SameInputSameKey()
        {
            var pig = new PigProfile("Kuki", "rosette_normal", "two_tone.ginger") { NamedId = "kuki" };

            var look1 = PigLookResolver.Resolve(pig, "adult");
            var look2 = PigLookResolver.Resolve(pig, "adult");

            Assert.Equal(look1.SpriteKey, look2.SpriteKey);
            Assert.Equal(look1.Breed, look2.Breed);
            Assert.Equal(look1.Coat, look2.Coat);
            Assert.Equal(look1.Stage, look2.Stage);
            Assert.Equal(look1.Named, look2.Named);
        }

        /// <summary>
        /// K3: every-roster-pig-has-sprite-file
        /// Every roster pig at every stage resolves to a valid spritesheet file under assets/.
        /// </summary>
        [Fact]
        public void K3_EveryRosterPigHasSpriteFile()
        {
            string repoRoot = FindRepoRoot();
            string assetsDir = Path.Combine(repoRoot, "assets");

            var pigs = new[]
            {
                new PigProfile("Cuy", "smooth", "tricolor"),
                new PigProfile("Kuki", "rosette_normal", "two_tone.ginger") { NamedId = "kuki" },
                new PigProfile("Ned", "teddy_chubby", "bicolor_head.chocolate") { NamedId = "ned" },
                new PigProfile("Glen", "smooth_lean", "agouti") { NamedId = "glen" },
                new PigProfile("James", "peruvian_normal", "cinnamon") { NamedId = "james" },
                new PigProfile("Racuch", "teddy_normal", "dutch") { NamedId = "racuch" },
                new PigProfile("RosettePig", "rosette_normal", "two_tone.ginger"),
                new PigProfile("ChubbyPig", "smooth_chubby", "albino")
            };

            string[] stages = { "baby", "junior", "adult", "senior", "legend" };

            foreach (var pig in pigs)
            {
                foreach (var stage in stages)
                {
                    var look = PigLookResolver.Resolve(pig, stage);
                    Assert.NotNull(look.SpriteKey);

                    string fullPath = Path.Combine(assetsDir, look.SpriteKey.Replace('/', Path.DirectorySeparatorChar));
                    Assert.True(File.Exists(fullPath), $"Sprite file missing for {pig.Name} ({stage}): {fullPath}");
                }
            }
        }

        /// <summary>
        /// K4: stage-changes-key
        /// Changing the growth stage produces different sprite sheets.
        /// </summary>
        [Fact]
        public void K4_StageChangesKey()
        {
            var pig = new PigProfile("Cuy", "smooth", "tricolor");

            var babyLook = PigLookResolver.Resolve(pig, "baby");
            var adultLook = PigLookResolver.Resolve(pig, "adult");

            Assert.NotEqual(babyLook.SpriteKey, adultLook.SpriteKey);
            Assert.Equal("baby", babyLook.Stage);
            Assert.Equal("adult", adultLook.Stage);
        }

        /// <summary>
        /// K5: unnamed-pig-no-named-skin
        /// An unnamed pig never resolves to a named skin (no pigs/* in SpriteKey).
        /// </summary>
        [Fact]
        public void K5_UnnamedPigNoNamedSkin()
        {
            var unnamed = new PigProfile("CustomPig", "smooth", "tricolor");

            var look = PigLookResolver.Resolve(unnamed, "adult");

            Assert.Null(look.Named);
            Assert.False(look.IsNamed);
            Assert.DoesNotContain("pigs/", look.SpriteKey);
        }
    }
}
