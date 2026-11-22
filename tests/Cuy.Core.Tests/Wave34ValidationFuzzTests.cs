using System;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class Wave34ValidationFuzzTests
    {
        private static JToken RandomToken(Random rng, int depth = 0)
        {
            int kind = rng.Next(depth >= 2 ? 10 : 12);
            switch (kind)
            {
                case 0: return JValue.CreateNull();
                case 1: return new JValue(rng.Next(2) == 0);
                case 2: return new JValue(rng.Next(-10000, 10000));
                case 3: return new JValue((long)rng.Next(int.MinValue, int.MaxValue) * 1000L);
                case 4: return new JValue(rng.NextDouble() * 400.0 - 200.0);
                case 5: return new JValue(double.NaN);
                case 6: return new JValue(double.PositiveInfinity);
                case 7: return new JValue(RandomString(rng, rng.Next(0, 180)));
                case 8: return new JValue(string.Empty);
                case 9: return new JValue("   \t\r\n  ");
                case 10: return new JArray(RandomToken(rng, depth + 1), RandomToken(rng, depth + 1));
                default:
                    var obj = new JObject();
                    int count = rng.Next(0, 4);
                    for (int i = 0; i < count; i++)
                        obj[RandomString(rng, rng.Next(1, 12))] = RandomToken(rng, depth + 1);
                    return obj;
            }
        }

        private static string RandomString(Random rng, int len)
        {
            const string alphabet = "abcdefghijklmnopqrstuvwxyz0123456789_-.:/ \t\n\0!@#$%^&*()[]{}<>ąćęłńóśźż🐷";
            var chars = new char[len];
            for (int i = 0; i < len; i++)
                chars[i] = alphabet[rng.Next(alphabet.Length)];
            return new string(chars);
        }

        private static JObject RandomPayload(Random rng, string[] keys)
        {
            if (rng.Next(25) == 0) return null;
            var obj = new JObject();
            foreach (var key in keys)
            {
                if (rng.Next(5) != 0)
                    obj[key] = RandomToken(rng);
            }
            if (rng.Next(4) == 0)
                obj["extra_" + rng.Next(100)] = RandomToken(rng);
            return obj;
        }

        [Fact]
        [Trait("Case", "VAL-run-fuzz-500")]
        public void Val_Run_Fuzz500()
        {
            var rng = new Random(4201);
            string[] types = { "run.out", "run.in" };
            string[] keys = { "pigId" };

            for (int i = 0; i < 500; i++)
            {
                string type = types[i % types.Length];
                var payload = RandomPayload(rng, keys);

                var res = MessageValidator.Validate(type, payload);
                Assert.False(res.IsUnknown);
                if (res.IsInvalid)
                    Assert.False(string.IsNullOrEmpty(res.Error));

                string detailErr = RunMessages.ValidatePigPayload(payload);
                if (payload == null)
                    Assert.NotNull(detailErr);
            }
        }

        [Fact]
        [Trait("Case", "VAL-props-fuzz-500")]
        public void Val_Props_Fuzz500()
        {
            var rng = new Random(4202);
            string[] types = { "props.place", "props.move", "props.remove", "props.toRoom", "props.fromRoom" };
            string[] keys = { "itemId", "uid", "room", "x", "y" };

            for (int i = 0; i < 500; i++)
            {
                string type = types[i % types.Length];
                var payload = RandomPayload(rng, keys);

                var res = MessageValidator.Validate(type, payload);
                Assert.False(res.IsUnknown);
                if (res.IsInvalid)
                    Assert.False(string.IsNullOrEmpty(res.Error));

                string detailErr = PropsMessages.Validate(type, payload);
                if (payload == null)
                    Assert.NotNull(detailErr);
            }
        }

        [Fact]
        [Trait("Case", "VAL-companion-fuzz-500")]
        public void Val_Companion_Fuzz500()
        {
            var rng = new Random(4203);
            string[] keys = { "enabled", "id" };

            for (int i = 0; i < 500; i++)
            {
                var payload = RandomPayload(rng, keys);

                var res = MessageValidator.Validate("companion.set", payload);
                Assert.False(res.IsUnknown);
                if (res.IsInvalid)
                    Assert.False(string.IsNullOrEmpty(res.Error));

                string detailErr = CompanionMessages.ValidateSetPayload(payload);
                if (payload == null)
                    Assert.NotNull(detailErr);
            }
        }

        [Fact]
        [Trait("Case", "VAL-hayhop-fuzz-500")]
        public void Val_HayHop_Fuzz500()
        {
            var rng = new Random(4204);
            string[] keys = { "score", "durationMs", "seed" };

            for (int i = 0; i < 500; i++)
            {
                var payload = RandomPayload(rng, keys);

                var res = MessageValidator.Validate("minigame.hay_hop.result", payload);
                Assert.False(res.IsUnknown);
                if (res.IsInvalid)
                    Assert.False(string.IsNullOrEmpty(res.Error));

                string detailErr = HayHopMessages.ValidateResultPayload(payload);
                if (payload == null)
                    Assert.NotNull(detailErr);
            }
        }

        [Fact]
        [Trait("Case", "VAL-weather-fuzz-500")]
        public void Val_Weather_Fuzz500()
        {
            var rng = new Random(4205);
            string[] types = { "weather.setConsent", "weather.setLocation", "weather.deleteLocation", "weather.refresh" };
            string[] keys = { "consent", "city", "lat", "lon" };

            for (int i = 0; i < 500; i++)
            {
                string type = types[i % types.Length];
                var payload = RandomPayload(rng, keys);

                var res = MessageValidator.Validate(type, payload);
                Assert.False(res.IsUnknown);
                if (res.IsInvalid)
                    Assert.False(string.IsNullOrEmpty(res.Error));

                if (type == "weather.setLocation")
                {
                    string locErr = WeatherMessages.ValidateLocationPayload(payload, out _, out _, out _);
                    if (payload == null)
                        Assert.NotNull(locErr);
                }
            }
        }

        [Fact]
        [Trait("Case", "VAL-oversized-strings")]
        public void Val_OversizedStrings_Rejected()
        {
            string huge = new string('a', 50000);

            Assert.True(MessageValidator.Validate("run.out", new JObject { ["pigId"] = huge }).IsInvalid);
            Assert.NotNull(RunMessages.ValidatePigPayload(new JObject { ["pigId"] = huge }));

            Assert.True(MessageValidator.Validate("props.place", new JObject { ["itemId"] = huge, ["x"] = 0.5, ["y"] = 0.5 }).IsInvalid);
            Assert.NotNull(PropsMessages.Validate("props.place", new JObject { ["itemId"] = huge, ["x"] = 0.5, ["y"] = 0.5 }));
            Assert.NotNull(PropsMessages.Validate("props.move", new JObject { ["uid"] = huge, ["x"] = 0.5, ["y"] = 0.5 }));
            Assert.True(MessageValidator.Validate("props.toRoom", new JObject { ["uid"] = "u1", ["room"] = huge, ["x"] = 1, ["y"] = 1 }).IsInvalid);

            Assert.True(MessageValidator.Validate("companion.set", new JObject { ["enabled"] = true, ["id"] = huge }).IsInvalid);
            Assert.NotNull(CompanionMessages.ValidateSetPayload(new JObject { ["enabled"] = true, ["id"] = huge }));

            Assert.True(MessageValidator.Validate("minigame.hay_hop.result", new JObject { ["score"] = 10, ["durationMs"] = 1000, ["seed"] = huge }).IsInvalid);
            Assert.NotNull(HayHopMessages.ValidateResultPayload(new JObject { ["score"] = 10, ["durationMs"] = 1000, ["seed"] = huge }));

            Assert.True(MessageValidator.Validate("weather.setLocation", new JObject { ["city"] = huge }).IsInvalid);
            Assert.NotNull(WeatherMessages.ValidateLocationPayload(new JObject { ["city"] = huge }, out _, out _, out _));
            Assert.True(MessageValidator.Validate("weather.setLocation", new JObject { ["lat"] = huge, ["lon"] = "21.0" }).IsInvalid);
        }

        [Fact]
        [Trait("Case", "VAL-unicode-and-control-chars")]
        public void Val_UnicodeAndControlChars_NoExceptions()
        {
            string[] nastyStrings =
            {
                "\0",
                "abc\0def",
                "\u0001\u0007\u001B\u001F",
                "line1\r\nline2",
                "🐷🐹🌿",
                "東京\u202Ertl",
                "\uD83D\uDC39",
                "'; DROP TABLE pigs; --",
                "<script>alert(1)</script>"
            };

            foreach (var s in nastyStrings)
            {
                // Must never throw on any validator
                var r1 = MessageValidator.Validate("run.out", new JObject { ["pigId"] = s });
                Assert.False(r1.IsUnknown);
                RunMessages.ValidatePigPayload(new JObject { ["pigId"] = s });

                var r2 = MessageValidator.Validate("props.place", new JObject { ["itemId"] = s, ["x"] = 0.5, ["y"] = 0.5 });
                Assert.False(r2.IsUnknown);
                PropsMessages.Validate("props.place", new JObject { ["itemId"] = s, ["x"] = 0.5, ["y"] = 0.5 });

                // Companion id must strictly reject unicode/control chars (^[a-z0-9_:]+$)
                var r3 = MessageValidator.Validate("companion.set", new JObject { ["enabled"] = true, ["id"] = s });
                Assert.True(r3.IsInvalid);
                Assert.NotNull(CompanionMessages.ValidateSetPayload(new JObject { ["enabled"] = true, ["id"] = s }));

                var r4 = MessageValidator.Validate("minigame.hay_hop.result", new JObject { ["score"] = 10, ["durationMs"] = 1000, ["seed"] = s });
                Assert.False(r4.IsUnknown);
                HayHopMessages.ValidateResultPayload(new JObject { ["score"] = 10, ["durationMs"] = 1000, ["seed"] = s });

                // Weather coords with control/unicode chars must be rejected
                var r5 = MessageValidator.Validate("weather.setLocation", new JObject { ["lat"] = s, ["lon"] = s });
                Assert.False(r5.IsUnknown);
                Assert.NotNull(WeatherMessages.ValidateLocationPayload(new JObject { ["lat"] = s, ["lon"] = s }, out _, out _, out _));

                var r6 = MessageValidator.Validate("weather.setLocation", new JObject { ["city"] = s });
                Assert.False(r6.IsUnknown);
                WeatherMessages.ValidateLocationPayload(new JObject { ["city"] = s }, out _, out _, out _);
            }
        }
    }
}
