using System;
using Cuy.Core.Input;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldMessageTests
    {
        [Theory]
        [InlineData("place_unlock", @"{ ""id"": ""garden"" }")]
        [InlineData("room_unlock", @"{ ""id"": ""bedroom"" }")]
        [InlineData("place_upgrade", @"{ ""id"": ""salon"" }")]
        [InlineData("room_buy", @"{ ""itemId"": ""wooden_shelf"" }")]
        [InlineData("room_place", @"{ ""place"": ""salon"", ""itemId"": ""wooden_shelf"", ""x"": 2, ""y"": 3, ""flip"": true }")]
        [InlineData("room_move", @"{ ""place"": ""salon"", ""uid"": ""item_123"", ""x"": 5, ""y"": 4 }")]
        [InlineData("room_flip", @"{ ""place"": ""salon"", ""uid"": ""item_123"", ""flip"": false }")]
        [InlineData("room_remove", @"{ ""place"": ""salon"", ""uid"": ""item_123"" }")]
        [InlineData("room_skin", @"{ ""room"": ""salon"", ""slot"": ""wallpaper"", ""itemId"": ""wallpaper_mint"" }")]
        [InlineData("farm_plant", @"{ ""plot"": 0, ""cropId"": ""parsley"" }")]
        [InlineData("farm_water", @"{ ""plot"": 1 }")]
        [InlineData("farm_harvest", @"{ ""plot"": 2 }")]
        [InlineData("farm_harvest_all", @"{}")]
        [InlineData("orchard_plant", @"{ ""slot"": 0, ""cropId"": ""apple"" }")]
        [InlineData("orchard_harvest", @"{ ""slot"": 1 }")]
        [InlineData("farm_buy", @"{ ""what"": ""pack"", ""id"": ""can_2"" }")]
        [InlineData("market_sell", @"{ ""itemId"": ""parsley"", ""count"": 5 }")]
        [InlineData("market_buy", @"{ ""itemId"": ""seed_parsley"", ""count"": 3 }")]
        [InlineData("market_special", @"{ ""index"": 0 }")]
        [InlineData("market_order", @"{ ""index"": 1 }")]
        [InlineData("market_stall", @"{}")]
        [InlineData("market_quote", @"{ ""itemId"": ""parsley"", ""count"": 10 }")]
        public void ValidPayload_ReturnsOk(string type, string json)
        {
            var msg = JObject.Parse(json);
            var res = MessageValidator.Validate(type, msg);

            Assert.True(res.IsOk, $"Expected {type} to validate as Ok, got: {res.Error}");
            Assert.Null(res.Error);
        }

        [Theory]
        [InlineData("place_unlock", "id")]
        [InlineData("room_unlock", "id")]
        [InlineData("place_upgrade", "id")]
        [InlineData("room_buy", "itemId")]
        [InlineData("room_place", "place")]
        [InlineData("room_place", "itemId")]
        [InlineData("room_place", "x")]
        [InlineData("room_place", "y")]
        [InlineData("room_move", "place")]
        [InlineData("room_move", "uid")]
        [InlineData("room_move", "x")]
        [InlineData("room_move", "y")]
        [InlineData("room_flip", "place")]
        [InlineData("room_flip", "uid")]
        [InlineData("room_remove", "place")]
        [InlineData("room_remove", "uid")]
        [InlineData("room_skin", "room")]
        [InlineData("room_skin", "slot")]
        [InlineData("farm_plant", "plot")]
        [InlineData("farm_plant", "cropId")]
        [InlineData("farm_water", "plot")]
        [InlineData("farm_harvest", "plot")]
        [InlineData("orchard_plant", "slot")]
        [InlineData("orchard_plant", "cropId")]
        [InlineData("orchard_harvest", "slot")]
        [InlineData("farm_buy", "what")]
        [InlineData("market_sell", "itemId")]
        [InlineData("market_sell", "count")]
        [InlineData("market_buy", "itemId")]
        [InlineData("market_buy", "count")]
        [InlineData("market_special", "index")]
        [InlineData("market_order", "index")]
        [InlineData("market_quote", "itemId")]
        public void MissingRequiredField_ReturnsInvalid(string type, string missingField)
        {
            var baseline = GetBaselineMessage(type);
            baseline.Remove(missingField);

            var res = MessageValidator.Validate(type, baseline);
            Assert.True(res.IsInvalid, $"Expected missing '{missingField}' in {type} to return Invalid.");
            Assert.Contains(missingField, res.Error, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("farm_plant", "plot", "not_an_int")]
        [InlineData("room_place", "x", "not_an_int")]
        [InlineData("room_place", "flip", "not_a_bool")]
        [InlineData("market_sell", "count", "five")]
        [InlineData("market_special", "index", true)]
        public void WrongType_ReturnsInvalid(string type, string field, object wrongVal)
        {
            var msg = GetBaselineMessage(type);
            msg[field] = JToken.FromObject(wrongVal);

            var res = MessageValidator.Validate(type, msg);
            Assert.True(res.IsInvalid);
            Assert.Contains(field, res.Error, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("market_sell", "count", -1)]
        [InlineData("market_sell", "count", 0)]
        [InlineData("market_buy", "count", -5)]
        [InlineData("room_place", "x", -2)]
        [InlineData("room_place", "x", 201)]
        [InlineData("farm_plant", "plot", -1)]
        [InlineData("orchard_plant", "slot", -1)]
        public void OutOfRangeInt_ReturnsInvalid(string type, string field, int badValue)
        {
            var msg = GetBaselineMessage(type);
            msg[field] = badValue;

            var res = MessageValidator.Validate(type, msg);
            Assert.True(res.IsInvalid);
            Assert.Contains(field, res.Error, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("place_unlock", "id")]
        [InlineData("room_buy", "itemId")]
        [InlineData("room_place", "itemId")]
        [InlineData("farm_plant", "cropId")]
        [InlineData("market_sell", "itemId")]
        public void OverLongId_ReturnsInvalid(string type, string field)
        {
            var msg = GetBaselineMessage(type);
            msg[field] = new string('a', 150); // > 128 characters maxLen for Id

            var res = MessageValidator.Validate(type, msg);
            Assert.True(res.IsInvalid);
            Assert.Contains(field, res.Error, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("place_unlock", "id", "")]
        [InlineData("place_unlock", "id", "INVALID CAPS")]
        [InlineData("place_unlock", "id", "has space")]
        [InlineData("room_buy", "itemId", "bad!char")]
        public void BadIdFormat_ReturnsInvalid(string type, string field, string badId)
        {
            var msg = GetBaselineMessage(type);
            msg[field] = badId;

            var res = MessageValidator.Validate(type, msg);
            Assert.True(res.IsInvalid);
            Assert.Contains(field, res.Error, StringComparison.OrdinalIgnoreCase);
        }

        private static JObject GetBaselineMessage(string type)
        {
            switch (type)
            {
                case "place_unlock":
                case "room_unlock":
                case "place_upgrade":
                    return new JObject { ["id"] = "salon" };
                case "room_buy":
                    return new JObject { ["itemId"] = "wooden_shelf" };
                case "room_place":
                    return new JObject { ["place"] = "salon", ["itemId"] = "wooden_shelf", ["x"] = 0, ["y"] = 0, ["flip"] = false };
                case "room_move":
                    return new JObject { ["place"] = "salon", ["uid"] = "uid123", ["x"] = 1, ["y"] = 1 };
                case "room_flip":
                    return new JObject { ["place"] = "salon", ["uid"] = "uid123", ["flip"] = true };
                case "room_remove":
                    return new JObject { ["place"] = "salon", ["uid"] = "uid123" };
                case "room_skin":
                    return new JObject { ["room"] = "salon", ["slot"] = "wallpaper", ["itemId"] = "wallpaper_mint" };
                case "farm_plant":
                    return new JObject { ["plot"] = 0, ["cropId"] = "parsley" };
                case "farm_water":
                case "farm_harvest":
                    return new JObject { ["plot"] = 0 };
                case "farm_harvest_all":
                    return new JObject();
                case "orchard_plant":
                    return new JObject { ["slot"] = 0, ["cropId"] = "apple" };
                case "orchard_harvest":
                    return new JObject { ["slot"] = 0 };
                case "farm_buy":
                    return new JObject { ["what"] = "pack", ["id"] = "can_2" };
                case "market_sell":
                case "market_buy":
                    return new JObject { ["itemId"] = "parsley", ["count"] = 5 };
                case "market_special":
                case "market_order":
                    return new JObject { ["index"] = 0 };
                case "market_stall":
                    return new JObject();
                case "market_quote":
                    return new JObject { ["itemId"] = "parsley", ["count"] = 2 };
                default:
                    throw new ArgumentException($"Unknown type {type}");
            }
        }
    }
}
