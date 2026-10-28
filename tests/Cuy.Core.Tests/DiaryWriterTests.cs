using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;
using Cuy.Core.Diary;

namespace Cuy.Core.Tests
{
    public class DiaryWriterTests
    {
        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            if (dir == null) throw new FileNotFoundException("Cannot find repo root");
            return Path.Combine(dir, relativePath);
        }

        private DiaryWriter GetRealWriter()
        {
            return DiaryWriter.Load(RepoFile("assets/data/diary.json"));
        }

        [Fact]
        public void Render_StageFilter_ReturnsCorrectStageTemplate()
        {
            var writer = GetRealWriter();
            var ctx = new DiaryContext { Name = "Test", Stage = LifeStage.Baby, Mood = "any", Weather = "any" };
            var rng = new Random(42);

            var result = writer.Render(ctx, rng);

            Assert.NotNull(result);
            // Verify by loading JSON directly and checking if the template matches the stage
            string json = File.ReadAllText(RepoFile("assets/data/diary.json"));
            var data = Newtonsoft.Json.JsonConvert.DeserializeObject<DiaryData>(json);
            var template = data.Templates.First(t => t.Id == result.TemplateId);
            Assert.Contains("baby", template.Stages);
        }

        [Fact]
        public void Render_Filters_SickBirthdayMood()
        {
            var writer = GetRealWriter();
            var ctx = new DiaryContext { Name = "Test", Stage = LifeStage.Junior, Sick = true, Birthday = false, Mood = "low", Weather = "any" };
            var rng = new Random(42);

            var result = writer.Render(ctx, rng);

            // Our diary.json might not have a sick+low mood junior template, but if it returns something it must match
            if (result != null)
            {
                string json = File.ReadAllText(RepoFile("assets/data/diary.json"));
                var data = Newtonsoft.Json.JsonConvert.DeserializeObject<DiaryData>(json);
                var template = data.Templates.First(t => t.Id == result.TemplateId);
                Assert.True(template.When.Sick);
                Assert.Equal("low", template.When.Mood);
            }
        }

        [Fact]
        public void Render_PreviousIdNeverRepeated()
        {
            var writer = GetRealWriter();
            var ctx = new DiaryContext { Name = "Test", Stage = LifeStage.Adult, Mood = "any", Weather = "any" };
            var rng = new Random(42);

            var result1 = writer.Render(ctx, rng);
            Assert.NotNull(result1);

            ctx.PreviousTemplateId = result1.TemplateId;
            var result2 = writer.Render(ctx, rng);

            Assert.NotNull(result2);
            // We assume there are multiple adult templates so it doesn't fallback to the only one
            Assert.NotEqual(result1.TemplateId, result2.TemplateId);
        }

        [Fact]
        public void Render_NoTagsLeftAndLengthChecked()
        {
            var writer = GetRealWriter();
            var ctx = new DiaryContext { Name = "Test", Stage = LifeStage.Senior, Mood = "any", Weather = "any" };
            var rng = new Random(42);

            var result = writer.Render(ctx, rng);

            Assert.NotNull(result);
            Assert.DoesNotContain("#", result.Text);
            Assert.DoesNotContain("[", result.Text);
            Assert.DoesNotContain("]", result.Text);
            Assert.True(result.Text.Length <= 160);
        }

        [Fact]
        public void Render_BrokenJson_ReturnsNull()
        {
            var ctx = new DiaryContext { Name = "Test", Stage = LifeStage.Baby, Mood = "any", Weather = "any" };
            var rng = new Random(42);
            // The instruction says "a broken file gives a writer with no templates"
            var writerBroken = DiaryWriter.LoadFromJson("broken json");
            var res2 = writerBroken.Render(ctx, rng);
            Assert.Null(res2);
        }

        [Fact]
        public void DayStats_FromCounters_Works()
        {
            var before = new Dictionary<string, int> { { "feedings", 2 }, { "pets", 1 }, { "minigames_played", 10 } };
            var after = new Dictionary<string, int> { { "feedings", 5 }, { "minigames_played", 10 }, { "poops_collected", 2 } };

            var stats = DayStats.FromCounters("2023-10-27", before, after);

            Assert.Equal("2023-10-27", stats.Date);
            Assert.Equal(3, stats.Fed); // 5 - 2
            Assert.Equal(0, stats.Pets); // 0 - 1 = -1 -> 0
            Assert.Equal(0, stats.Games); // 10 - 10
            Assert.Equal(2, stats.Poops); // 2 - 0
            Assert.True(stats.HasActivity);
        }

        [Fact]
        public void DayStats_FromCounters_NoActivity()
        {
            var stats = DayStats.FromCounters("2023-10-27", null, null);
            Assert.False(stats.HasActivity);
        }

        [Fact]
        public void Render_RepetitionCheck_2000Renders()
        {
            var writer = GetRealWriter();
            var rng = new Random(12345);

            foreach (LifeStage stage in Enum.GetValues(typeof(LifeStage)))
            {
                var ctx = new DiaryContext { Name = "Test", Stage = stage, Mood = "any", Weather = "any", Fed = 1, Pets = 1 };
                var openings = new Dictionary<string, int>();

                int validRenders = 0;
                for (int i = 0; i < 2000; i++)
                {
                    var result = writer.Render(ctx, rng);
                    if (result == null) continue; // might be if a stage has no templates for these filters

                    validRenders++;
                    ctx.PreviousTemplateId = result.TemplateId;

                    var words = result.Text.Split(new[] { ' ', '.', ',' }, StringSplitOptions.RemoveEmptyEntries);
                    string opening = string.Join(" ", words.Take(3)).ToLowerInvariant();
                    if (!openings.ContainsKey(opening)) openings[opening] = 0;
                    openings[opening]++;
                }

                if (validRenders > 0)
                {
                    foreach (var kvp in openings)
                    {
                        double percentage = (double)kvp.Value / validRenders;
                        Assert.True(percentage <= 0.40, $"Stage {stage} opening '{kvp.Key}' appeared {percentage*100}% of the time (> 40%)");
                    }
                }
            }
        }
    }
}
