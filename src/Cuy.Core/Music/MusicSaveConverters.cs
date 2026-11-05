using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Music
{
    // Tolerant readers for the music save fields. A value of the wrong type is replaced by the
    // default (empty), and entries of the wrong type are dropped. They never throw, so a bad field
    // cannot make the whole save unreadable. Mirrors web/home/features/music/contract.js.

    /// <summary>records: JSON object of positive integer counts. Other entries are dropped.</summary>
    public sealed class RecordCountsConverter : JsonConverter<Dictionary<string, int>>
    {
        public override Dictionary<string, int> ReadJson(JsonReader reader, Type objectType,
            Dictionary<string, int> existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            var result = new Dictionary<string, int>();
            var obj = JToken.Load(reader) as JObject;
            if (obj == null) return result;
            foreach (var prop in obj.Properties())
            {
                int count;
                if (!string.IsNullOrEmpty(prop.Name) && TryReadCount(prop.Value, out count) && count > 0)
                {
                    result[prop.Name] = count;
                }
            }
            return result;
        }

        public override void WriteJson(JsonWriter writer, Dictionary<string, int> value, JsonSerializer serializer)
        {
            serializer.Serialize(writer, value);
        }

        private static bool TryReadCount(JToken token, out int count)
        {
            count = 0;
            if (token == null || token.Type != JTokenType.Integer) return false;
            long value;
            if (!long.TryParse(token.ToString(), out value) || value < 0 || value > int.MaxValue) return false;
            count = (int)value;
            return true;
        }
    }

    /// <summary>playerOwned: JSON array of distinct non-empty strings. Other entries are dropped.</summary>
    public sealed class RecordIdListConverter : JsonConverter<List<string>>
    {
        public override List<string> ReadJson(JsonReader reader, Type objectType,
            List<string> existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            var result = new List<string>();
            var array = JToken.Load(reader) as JArray;
            if (array == null) return result;
            foreach (var item in array)
            {
                if (item.Type != JTokenType.String) continue;
                string id = item.Value<string>();
                if (!string.IsNullOrEmpty(id) && !result.Contains(id)) result.Add(id);
            }
            return result;
        }

        public override void WriteJson(JsonWriter writer, List<string> value, JsonSerializer serializer)
        {
            serializer.Serialize(writer, value);
        }
    }

    /// <summary>playerPlaced: JSON object room id -> record id (non-empty strings). Other entries are dropped.</summary>
    public sealed class RecordPlacementConverter : JsonConverter<Dictionary<string, string>>
    {
        public override Dictionary<string, string> ReadJson(JsonReader reader, Type objectType,
            Dictionary<string, string> existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            var result = new Dictionary<string, string>();
            var obj = JToken.Load(reader) as JObject;
            if (obj == null) return result;
            foreach (var prop in obj.Properties())
            {
                if (string.IsNullOrEmpty(prop.Name) || prop.Value.Type != JTokenType.String) continue;
                string recordId = prop.Value.Value<string>();
                if (!string.IsNullOrEmpty(recordId)) result[prop.Name] = recordId;
            }
            return result;
        }

        public override void WriteJson(JsonWriter writer, Dictionary<string, string> value, JsonSerializer serializer)
        {
            serializer.Serialize(writer, value);
        }
    }
}
