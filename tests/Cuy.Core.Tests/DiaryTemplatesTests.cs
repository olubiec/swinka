using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Xunit;
using Cuy.Core.Diary;

namespace Cuy.Core.Tests
{
    public class DiaryTemplatesTests
    {
        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            return Path.Combine(dir ?? "", relativePath);
        }

        [Fact]
        public void DiaryTemplates_AreValid_AndMeetRequirements()
        {
            string json = File.ReadAllText(RepoFile("assets/data/diary.json"));
            JObject obj = JObject.Parse(json);

            JArray templatesArray = (JArray)obj["templates"]!;
            Assert.NotNull(templatesArray);
            Assert.True(templatesArray.Count >= 48, $"Expected >= 48 templates, found {templatesArray.Count}");

            var grammarDict = new Dictionary<string, string[]>();
            foreach (var prop in obj.Properties())
            {
                if (prop.Name == "templates") continue;
                if (prop.Value is JArray arr)
                {
                    grammarDict[prop.Name] = arr.Select(t => (string)t!).ToArray();
                }
                else
                {
                    grammarDict[prop.Name] = new[] { (string)prop.Value! };
                }
            }

            TraceryGrammar grammar = new TraceryGrammar(grammarDict);

            grammar.SetFact("name", "Barnaby");
            grammar.SetFact("fed", "4");
            grammar.SetFact("vegetable", "carrot");
            grammar.SetFact("pets", "scratches");
            grammar.SetFact("games", "tunnel run");
            grammar.SetFact("poops", "a tiny pile");
            grammar.SetFact("clovers", "some clovers");

            var templatesByGroup = new Dictionary<string, List<string>>();
            string[] groups = { "baby", "junior", "adult", "senior", "legend" };
            foreach (var g in groups) templatesByGroup[g] = new List<string>();

            foreach (var t in templatesArray)
            {
                string id = (string)t["id"]!;
                string text = (string)t["text"]!;
                JArray stages = (JArray)t["stages"]!;

                foreach (var stageToken in stages)
                {
                    string stage = (string)stageToken!;
                    if (templatesByGroup.ContainsKey(stage))
                    {
                        templatesByGroup[stage].Add(id);
                    }
                }

                // Render test
                Random rnd = new Random(id.GetHashCode());
                string rendered = grammar.Flatten(text, rnd);

                Assert.True(rendered.Length <= 160, $"Template {id} rendered to {rendered.Length} chars, max is 160. Text: {rendered}");
                Assert.DoesNotContain("#", rendered);
                Assert.DoesNotContain("[", rendered);
            }

            Assert.True(templatesByGroup["baby"].Count >= 8, "Expected >= 8 templates for baby");
            Assert.True(templatesByGroup["junior"].Count >= 8, "Expected >= 8 templates for junior");
            Assert.True(templatesByGroup["adult"].Count >= 8, "Expected >= 8 templates for adult");
            // The prompt says "senior/legend" as one group
            int seniorLegendCount = templatesByGroup["senior"].Union(templatesByGroup["legend"]).Count();
            Assert.True(seniorLegendCount >= 8, "Expected >= 8 templates for senior/legend");

            // Entropy test: 2000 renders per stage group, max 40% same 3-word opening
            TestEntropyForGroup(templatesArray, grammar, "baby", 2000, 0.40);
            TestEntropyForGroup(templatesArray, grammar, "junior", 2000, 0.40);
            TestEntropyForGroup(templatesArray, grammar, "adult", 2000, 0.40);
            TestEntropyForGroup(templatesArray, grammar, "senior,legend", 2000, 0.40);
        }

        private void TestEntropyForGroup(JArray templatesArray, TraceryGrammar grammar, string stagesFilterStr, int iterations, double maxPercentage)
        {
            var allowedStages = stagesFilterStr.Split(',');

            var validTemplates = templatesArray
                .Where(t => ((JArray)t["stages"]!).Select(s => (string)s!).Intersect(allowedStages).Any())
                .ToList();

            Assert.NotEmpty(validTemplates);

            var openings = new Dictionary<string, int>();
            Random rnd = new Random(stagesFilterStr.GetHashCode() ^ 12345);

            for (int i = 0; i < iterations; i++)
            {
                var template = validTemplates[rnd.Next(validTemplates.Count)];
                string text = (string)template["text"]!;
                string rendered = grammar.Flatten(text, rnd);

                string[] words = rendered.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                string opening = string.Join(" ", words.Take(3)).ToLowerInvariant();

                if (openings.ContainsKey(opening))
                    openings[opening]++;
                else
                    openings[opening] = 1;
            }

            int maxCount = openings.Values.Max();
            double percentage = (double)maxCount / iterations;

            Assert.True(percentage <= maxPercentage,
                $"Entropy test failed for {stagesFilterStr}: most common opening was {percentage:P2} of outputs, max allowed is {maxPercentage:P2}. Group has {validTemplates.Count} templates.");
        }
    }
}
