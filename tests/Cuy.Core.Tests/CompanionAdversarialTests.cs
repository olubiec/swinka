using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CompanionAdversarialTests
    {
        [Fact]
        [Trait("CaseId", "COM-old-save-default-off")]
        public void OldSaveWithoutCompanionFieldsDefaultsToOffAndGardenFriend()
        {
            const string oldSaveJson = @"{
                ""Version"": 3,
                ""Name"": ""Kuki"",
                ""Clovers"": 42,
                ""Needs"": {
                    ""Satiety"": 80,
                    ""VitaminC"": 75,
                    ""Energy"": 90,
                    ""Mood"": 85,
                    ""Cleanliness"": 88,
                    ""Teeth"": 70
                }
            }";

            var state = JsonConvert.DeserializeObject<GameState>(oldSaveJson);
            Assert.NotNull(state);
            Assert.False(state.CompanionEnabled);
            Assert.Equal("garden_friend", state.CompanionId);

            state.Normalize();
            Assert.False(state.CompanionEnabled);
            Assert.Equal("garden_friend", state.CompanionId);
        }

        [Fact]
        [Trait("CaseId", "COM-message-fuzz-300")]
        public void MessageFuzz300NeverThrowsAndRejectsInvalidPayloads()
        {
            var rng = new Random(42);
            string[] badIds =
            {
                "",
                "   ",
                "GARDEN_FRIEND",
                "garden-friend",
                "garden friend",
                "../secret",
                "<script>alert(1)</script>",
                "dragon",
                new string('a', 129),
                new string('z', 256)
            };

            for (int i = 0; i < 300; i++)
            {
                var msg = new JObject { ["type"] = "companion.set" };
                bool expectValidatorInvalid = false;

                int mode = rng.Next(6);
                switch (mode)
                {
                    case 0:
                        // Missing 'enabled'
                        expectValidatorInvalid = true;
                        break;
                    case 1:
                        // Wrong type for 'enabled'
                        int badType = rng.Next(5);
                        if (badType == 0) msg["enabled"] = "true";
                        else if (badType == 1) msg["enabled"] = 1;
                        else if (badType == 2) msg["enabled"] = JValue.CreateNull();
                        else if (badType == 3) msg["enabled"] = new JObject();
                        else msg["enabled"] = new JArray();
                        expectValidatorInvalid = true;
                        break;
                    case 2:
                        // Valid 'enabled', bad 'id' string (format/length/unknown)
                        msg["enabled"] = rng.Next(2) == 0;
                        string chosenId = badIds[rng.Next(badIds.Length)];
                        msg["id"] = chosenId;
                        expectValidatorInvalid = chosenId != "dragon";
                        break;
                    case 3:
                        // Valid 'enabled', wrong type for 'id'
                        msg["enabled"] = rng.Next(2) == 0;
                        int idBadType = rng.Next(4);
                        if (idBadType == 0) msg["id"] = 123;
                        else if (idBadType == 1) msg["id"] = true;
                        else if (idBadType == 2) msg["id"] = new JArray("garden_friend");
                        else msg["id"] = new JObject { ["id"] = "garden_friend" };
                        expectValidatorInvalid = true;
                        break;
                    case 4:
                        // Random garbage id characters
                        msg["enabled"] = true;
                        char badChar = (char)rng.Next(33, 47);
                        msg["id"] = "bad_" + badChar + "_id_" + i;
                        expectValidatorInvalid = true;
                        break;
                    default:
                        // Null id with missing enabled
                        msg["id"] = JValue.CreateNull();
                        expectValidatorInvalid = true;
                        break;
                }

                var validatorResult = MessageValidator.Validate(msg);
                if (expectValidatorInvalid)
                {
                    Assert.False(validatorResult.IsOk, $"Iteration {i}: MessageValidator unexpectedly accepted {msg}");
                }

                string payloadErr = CompanionMessages.ValidateSetPayload(msg);
                Assert.False(string.IsNullOrEmpty(payloadErr), $"Iteration {i}: ValidateSetPayload unexpectedly accepted {msg}");
            }
        }

        [Fact]
        [Trait("CaseId", "COM-unknown-companion")]
        public void UnknownCompanionIsRejectedAndKnownCompanionFromCatalogIsAccepted()
        {
            Assert.False(CompanionMessages.IsKnownCompanion("dragon"));
            Assert.False(CompanionMessages.IsKnownCompanion(""));
            Assert.False(CompanionMessages.IsKnownCompanion(null));
            Assert.False(CompanionMessages.IsKnownCompanion("GARDEN_FRIEND"));
            Assert.True(CompanionMessages.IsKnownCompanion("garden_friend"));

            var badMsg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = "dragon"
            };
            Assert.Equal("unknown_companion", CompanionMessages.ValidateSetPayload(badMsg));

            string catalogPath = RepoFile.Find("assets/data/companions.json");
            var catalog = JObject.Parse(File.ReadAllText(catalogPath));
            var knownIds = new List<string>();
            foreach (var entry in (JArray)catalog["companions"])
            {
                knownIds.Add(entry["id"].Value<string>());
            }

            Assert.Contains("garden_friend", knownIds);
            Assert.False(CompanionMessages.IsKnownCompanion("dragon", knownIds));
            Assert.True(CompanionMessages.IsKnownCompanion("garden_friend", knownIds));

            var goodMsg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = "garden_friend"
            };
            Assert.True(MessageValidator.Validate(goodMsg).IsOk);
            Assert.Null(CompanionMessages.ValidateSetPayload(goodMsg, knownIds));
        }
    }
}
