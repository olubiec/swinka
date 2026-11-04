using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Cuy.Core.Diary;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldDiaryTests
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

        private static readonly string[] WorldTemplateIds = new[]
        {
            "t_world_harvest_first",
            "t_world_harvest_great",
            "t_world_harvest_celebrate",
            "t_world_market_sale",
            "t_world_market_order",
            "t_world_market_welcome",
            "t_world_walk_garden",
            "t_world_walk_breeze",
            "t_world_decor_placed",
            "t_world_decor_cozy",
            "t_world_place_unlocked",
            "t_world_place_explore",
            "t_world_rare_veg_eaten",
            "t_world_garden_rest"
        };

        private static readonly Regex PolishLettersRegex = new Regex("[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]", RegexOptions.Compiled);

        [Fact]
        public void WorldDiaryTemplates_Exist_AndMeetAllCriteria()
        {
            string json = File.ReadAllText(RepoFile("assets/data/diary.json"));
            JObject obj = JObject.Parse(json);

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

            var grammar = new TraceryGrammar(grammarDict);
            grammar.SetFact("name", "Barnaby");
            grammar.SetFact("fed", "4");
            grammar.SetFact("vegetable", "carrot");
            grammar.SetFact("pets", "scratches");
            grammar.SetFact("games", "tunnel run");
            grammar.SetFact("poops", "a tiny pile");
            grammar.SetFact("clovers", "some clovers");

            JArray templates = (JArray)obj["templates"]!;
            Assert.NotNull(templates);

            var templateMap = templates.ToDictionary(t => (string)t["id"]!, t => (string)t["text"]!);

            Assert.True(WorldTemplateIds.Length >= 12, "Must test at least 12 new template IDs.");

            foreach (var id in WorldTemplateIds)
            {
                Assert.True(templateMap.ContainsKey(id), $"Template ID '{id}' was not found in diary.json");
                string templateText = templateMap[id];
                Assert.False(string.IsNullOrWhiteSpace(templateText), $"Template '{id}' text must not be empty.");

                for (int seed = 0; seed < 50; seed++)
                {
                    var rnd = new Random(seed * 31 + id.GetHashCode());
                    string rendered = grammar.Flatten(templateText, rnd);

                    Assert.False(string.IsNullOrWhiteSpace(rendered), $"Template '{id}' rendered empty text with seed {seed}.");
                    Assert.DoesNotContain("#", rendered);
                    Assert.DoesNotContain("[", rendered);
                    Assert.DoesNotContain("]", rendered);
                    Assert.False(PolishLettersRegex.IsMatch(rendered), $"Template '{id}' contains Polish letters: {rendered}");
                    Assert.True(rendered.Length <= 160, $"Template '{id}' rendered too long ({rendered.Length} chars): {rendered}");
                }
            }
        }
    }
}
