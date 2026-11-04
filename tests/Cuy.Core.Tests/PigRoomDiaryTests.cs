using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using Xunit;
using Cuy.Core.Diary;

namespace Cuy.Core.Tests
{
    public class PigRoomDiaryTests
    {
        private static readonly string[] RoomIds =
        {
            "t_room_decor_new", "t_room_own_room", "t_room_decor_second", "t_room_recolor",
            "t_room_renamed", "t_room_cosy_evening", "t_room_evening_glow", "t_room_dorm_moved",
            "t_room_dorm_nap", "t_room_dorm_chat", "t_room_memory_visit", "t_room_memory_candle",
        };

        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            return Path.Combine(dir ?? "", relativePath);
        }

        private static JObject LoadDiary()
        {
            return JObject.Parse(File.ReadAllText(RepoFile("assets/data/diary.json")));
        }

        private static TraceryGrammar BuildGrammar(JObject obj)
        {
            var rules = new Dictionary<string, string[]>();
            foreach (var prop in obj.Properties())
            {
                if (prop.Name == "templates") continue;
                rules[prop.Name] = prop.Value is JArray arr
                    ? arr.Select(t => (string)t).ToArray()
                    : new[] { (string)prop.Value };
            }
            var grammar = new TraceryGrammar(rules);
            grammar.SetFact("name", "Barnaby");
            grammar.SetFact("fed", "4");
            grammar.SetFact("vegetable", "carrot");
            grammar.SetFact("pets", "scratches");
            grammar.SetFact("games", "tunnel run");
            grammar.SetFact("poops", "a tiny pile");
            grammar.SetFact("clovers", "some clovers");
            return grammar;
        }

        [Fact]
        public void RoomTemplates_ExistAndAreAtLeastTen()
        {
            var obj = LoadDiary();
            var ids = ((JArray)obj["templates"]).Select(t => (string)t["id"]).ToList();
            Assert.True(RoomIds.Length >= 10);
            foreach (var id in RoomIds) Assert.Contains(id, ids);
            Assert.Equal(ids.Count, ids.Distinct().Count());
        }

        [Fact]
        public void RoomTemplates_RenderCleanTextFor50Seeds()
        {
            var obj = LoadDiary();
            var grammar = BuildGrammar(obj);
            var templates = ((JArray)obj["templates"]).Where(t => RoomIds.Contains((string)t["id"])).ToList();
            Assert.Equal(RoomIds.Length, templates.Count);

            var polish = new Regex("[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]");
            var forbidden = new Regex(@"\b(dead|died|death|die|dies)\b", RegexOptions.IgnoreCase);

            foreach (var t in templates)
            {
                string id = (string)t["id"];
                Assert.NotEmpty((JArray)t["stages"]);
                for (int seed = 0; seed < 50; seed++)
                {
                    string text = grammar.Flatten((string)t["text"], new Random(seed));
                    Assert.False(string.IsNullOrWhiteSpace(text), id);
                    Assert.True(text.Length <= 160, id + " too long: " + text);
                    Assert.DoesNotContain("#", text);
                    Assert.DoesNotContain("[", text);
                    Assert.False(polish.IsMatch(text), id + " has Polish letters");
                    Assert.False(forbidden.IsMatch(text), id + " mentions death: " + text);
                    Assert.False(char.IsLower(text[0]), id + " starts lower-case: " + text);
                }
            }
        }
    }
}
