using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;

namespace Cuy.Core.Diary
{
    public class DiaryResult
    {
        public string TemplateId { get; set; }
        public string Text { get; set; }
    }

    public class DiaryTemplateWhen
    {
        [JsonProperty("minFed")]
        public int MinFed { get; set; }

        [JsonProperty("sick")]
        public bool Sick { get; set; }

        [JsonProperty("mood")]
        public string Mood { get; set; } = "any";

        [JsonProperty("birthday")]
        public bool Birthday { get; set; }

        [JsonProperty("weather")]
        public string Weather { get; set; } = "any";
    }

    public class DiaryTemplate
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("stages")]
        public List<string> Stages { get; set; }

        [JsonProperty("when")]
        public DiaryTemplateWhen When { get; set; }

        [JsonProperty("text")]
        public string Text { get; set; }
    }

    public class DiaryData
    {
        [JsonProperty("templates")]
        public List<DiaryTemplate> Templates { get; set; }

        [JsonExtensionData]
        public IDictionary<string, Newtonsoft.Json.Linq.JToken> Rules { get; set; }
    }

    public class DiaryWriter
    {
        private static DiaryWriter _current;
        private static readonly object _syncLock = new object();

        public static DiaryWriter Current
        {
            get
            {
                if (_current == null)
                {
                    lock (_syncLock)
                    {
                        if (_current == null)
                        {
                            _current = LoadDefault();
                        }
                    }
                }
                return _current;
            }
            set
            {
                lock (_syncLock)
                {
                    _current = value;
                }
            }
        }

        private DiaryData _data;
        private TraceryGrammar _grammar;

        private DiaryWriter()
        {
            _data = new DiaryData { Templates = new List<DiaryTemplate>() };
            _grammar = new TraceryGrammar();
        }

        public static DiaryWriter Load(string path)
        {
            try
            {
                string json = File.ReadAllText(path);
                return LoadFromJson(json);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"Error loading DiaryWriter from {path}: {ex.Message}");
                return new DiaryWriter(); // empty but safe
            }
        }

        public static DiaryWriter LoadFromJson(string json)
        {
            var writer = new DiaryWriter();
            try
            {
                var data = JsonConvert.DeserializeObject<DiaryData>(json);
                if (data == null) return writer;

                if (data.Templates == null) data.Templates = new List<DiaryTemplate>();
                writer._data = data;

                writer._grammar = TraceryGrammar.FromJson(json);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"Error parsing DiaryWriter JSON: {ex.Message}");
            }
            return writer;
        }

        public static DiaryWriter LoadDefault()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "diary.json"),
                Path.Combine(baseDir, "diary.json"),
                Path.Combine(baseDir, "..", "assets", "data", "diary.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "diary.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "diary.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "diary.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "diary.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return Load(fullPath);
                    }
                }
                catch { } // Ignore path errors
            }

            ItemCatalog.ErrorLogger?.Invoke("Could not find default diary.json");
            return new DiaryWriter();
        }

        public DiaryResult Render(DiaryContext ctx, Random rng)
        {
            if (ctx == null) return null;
            if (_data.Templates.Count == 0) return null;

            string stageKey = LifeStages.DataKey(ctx.Stage);

            var validTemplates = new List<DiaryTemplate>();
            var fallbackTemplates = new List<DiaryTemplate>(); // templates that match but are previous

            foreach (var t in _data.Templates)
            {
                if (t.Stages == null || !t.Stages.Contains(stageKey)) continue;
                if (t.When != null)
                {
                    if (t.When.MinFed > 0 && ctx.Fed < t.When.MinFed) continue;
                    if (t.When.Sick != ctx.Sick) continue;
                    if (t.When.Birthday != ctx.Birthday) continue;
                    if (t.When.Mood != "any" && t.When.Mood != ctx.Mood) continue;
                    if (t.When.Weather != "any" && t.When.Weather != ctx.Weather) continue;
                }

                if (ctx.PreviousTemplateId != null && t.Id == ctx.PreviousTemplateId)
                {
                    fallbackTemplates.Add(t);
                }
                else
                {
                    validTemplates.Add(t);
                }
            }

            if (validTemplates.Count == 0)
            {
                if (fallbackTemplates.Count > 0)
                {
                    validTemplates = fallbackTemplates;
                }
                else
                {
                    return null;
                }
            }

            // Set facts
            _grammar.SetFact("name", string.IsNullOrEmpty(ctx.Name) ? "" : ctx.Name);
            _grammar.SetFact("fed", ctx.Fed.ToString());
            _grammar.SetFact("vegetable", string.IsNullOrEmpty(ctx.FavoriteVegetable) ? "" : ctx.FavoriteVegetable);
            _grammar.SetFact("pets", ctx.Pets.ToString());
            _grammar.SetFact("games", ctx.Games.ToString());
            _grammar.SetFact("poops", ctx.Poops.ToString());
            _grammar.SetFact("clovers", ctx.Clovers.ToString());

            // Try up to 5 times to generate a text <= 160 characters
            for (int i = 0; i < 5; i++)
            {
                var template = validTemplates[rng.Next(validTemplates.Count)];
                try
                {
                    string text = _grammar.Flatten(template.Text, rng);
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        text = text.Trim();
                        if (text.Length > 0)
                        {
                            text = char.ToUpperInvariant(text[0]) + text.Substring(1);
                            if (text.Length <= 160)
                            {
                                return new DiaryResult
                                {
                                    TemplateId = template.Id,
                                    Text = text
                                };
                            }
                        }
                    }
                }
                catch
                {
                    // Ignore expansion errors and try another one
                }
            }

            return null;
        }
    }
}
