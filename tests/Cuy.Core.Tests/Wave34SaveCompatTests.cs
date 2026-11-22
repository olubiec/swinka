using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class Wave34SaveCompatTests : IDisposable
    {
        private readonly string _testDir;

        public Wave34SaveCompatTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyWave34SaveCompat_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                    Directory.Delete(_testDir, true);
            }
            catch
            {
                // Ignore cleanup errors
            }
        }

        [Fact]
        [Trait("Case", "SAVE-old-minimal-loads")]
        public void Save_OldMinimal_Loads()
        {
            string minimalV1Json = @"{
  ""version"": 1,
  ""name"": ""Puszek"",
  ""birthDateUtc"": ""2026-01-01T10:00:00Z"",
  ""lastActiveUtc"": ""2026-01-01T12:00:00Z"",
  ""needs"": {
    ""fullness"": 80.0,
    ""vitamin_c"": 75.0,
    ""energy"": 70.0,
    ""mood"": 85.0,
    ""cleanliness"": 90.0,
    ""teeth"": 65.0
  }
}";
            var saveSystem = new SaveSystem(_testDir);
            File.WriteAllText(saveSystem.SavePath, minimalV1Json);

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Main, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal(GameState.CurrentVersion, result.State.Version);
            Assert.Equal("Puszek", result.State.Name);
            Assert.NotNull(result.State.Needs);
        }

        [Fact]
        [Trait("Case", "SAVE-old-with-pigs-loads")]
        public void Save_OldWithPigs_Loads()
        {
            string v2WithPigsJson = @"{
  ""version"": 2,
  ""name"": ""Cuy"",
  ""birthDateUtc"": ""2026-02-01T08:00:00Z"",
  ""lastActiveUtc"": ""2026-02-10T18:00:00Z"",
  ""clovers"": 120,
  ""needs"": {
    ""fullness"": 90.0,
    ""vitamin_c"": 85.0,
    ""energy"": 80.0,
    ""mood"": 95.0,
    ""cleanliness"": 88.0,
    ""teeth"": 72.0
  },
  ""activePigIds"": [""pig_2""],
  ""roster"": [
    { ""id"": ""starter"", ""name"": ""Cuy"", ""coat"": ""smooth"", ""color"": ""tricolor"" },
    { ""id"": ""pig_2"", ""name"": ""Biscuit"", ""coat"": ""rosette"", ""color"": ""ginger"" }
  ],
  ""inventory"": {
    ""hay"": 10,
    ""carrot"": 3
  },
  ""world"": {
    ""version"": 1,
    ""roomsUnlocked"": [""salon"", ""garden""],
    ""rooms"": {
      ""salon"": { ""wallpaper"": ""warm"", ""floor"": ""wood"", ""items"": [] }
    }
  }
}";
            var saveSystem = new SaveSystem(_testDir);
            File.WriteAllText(saveSystem.SavePath, v2WithPigsJson);

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Main, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal(GameState.CurrentVersion, result.State.Version);
            Assert.Contains("pig_2", result.State.ActivePigIds);
            Assert.Equal(2, result.State.Roster.Count);
            Assert.Equal("Biscuit", result.State.Roster[1].Name);
            Assert.Equal(10, result.State.Inventory["hay"]);
            Assert.Contains("garden", result.State.World.RoomsUnlocked);
        }

        [Fact]
        [Trait("Case", "SAVE-new-sections-default-safe")]
        public void Save_NewSections_DefaultSafe()
        {
            string preWave3Json = @"{
  ""version"": 2,
  ""name"": ""Legacy"",
  ""birthDateUtc"": ""2026-01-15T10:00:00Z"",
  ""lastActiveUtc"": ""2026-01-15T11:00:00Z"",
  ""needs"": {
    ""fullness"": 70.0,
    ""vitamin_c"": 70.0,
    ""energy"": 70.0,
    ""mood"": 70.0,
    ""cleanliness"": 70.0,
    ""teeth"": 70.0
  }
}";
            var saveSystem = new SaveSystem(_testDir);
            File.WriteAllText(saveSystem.SavePath, preWave3Json);

            var result = saveSystem.Load();
            Assert.NotNull(result.State);
            var state = result.State;

            // Companion defaults
            Assert.False(state.CompanionEnabled);
            Assert.Equal("garden_friend", state.CompanionId);

            // Weather defaults: consent MUST be OFF
            Assert.NotNull(state.Weather);
            Assert.False(state.Weather.Consent);
            Assert.Null(state.Weather.ConsentChangedUtc);
            Assert.Equal(string.Empty, state.Weather.LocationName);
            Assert.Null(state.Weather.Latitude);
            Assert.Null(state.Weather.Longitude);

            // World / Run / Props safe defaults
            Assert.NotNull(state.World);
            Assert.NotNull(state.World.Rooms);
            Assert.NotNull(state.World.OwnedItems);
            Assert.NotNull(state.World.OutdoorSeeded);
            Assert.Empty(state.World.OutdoorSeeded);

            var runAnalysis = RunCheck.Analyze(null, 16, 9, WorldItemCatalog.Current);
            Assert.False(runAnalysis.Valid);

            int freeCount = DesktopPropOps.FreeCount(new List<DesktopProp>(), state.World, state, "toy_basket", DesktopPropCatalog.Current);
            Assert.True(freeCount >= 0);
        }

        [Fact]
        [Trait("Case", "SAVE-roundtrip-stable")]
        public void Save_Roundtrip_Stable()
        {
            var state = new GameState
            {
                Name = "Pip",
                Clovers = 250,
                CompanionEnabled = true,
                CompanionId = "garden_friend",
                Weather = new WeatherSettings
                {
                    Consent = false,
                    ConsentChangedUtc = new DateTime(2026, 11, 20, 12, 0, 0, DateTimeKind.Utc),
                    LocationName = "Warsaw",
                    Latitude = 52.2,
                    Longitude = 21.0
                }
            };
            state.World.RoomsUnlocked.Add("garden");
            state.World.OutdoorSeeded.Add("garden");
            state.World.OwnedItems["toy_basket"] = 2;

            var saveSystem = new SaveSystem(_testDir);
            saveSystem.Save(state);

            var load1 = saveSystem.Load();
            Assert.Equal(LoadSource.Main, load1.Source);
            Assert.NotNull(load1.State);

            string json1 = SaveSystem.Serialize(load1.State);
            saveSystem.Save(load1.State);

            var load2 = saveSystem.Load();
            Assert.Equal(LoadSource.Main, load2.Source);
            Assert.NotNull(load2.State);
            string json2 = SaveSystem.Serialize(load2.State);

            Assert.Equal(json1, json2);
            Assert.Equal("Pip", load2.State.Name);
            Assert.True(load2.State.CompanionEnabled);
            Assert.Equal("garden_friend", load2.State.CompanionId);
            Assert.False(load2.State.Weather.Consent);
            Assert.Equal("Warsaw", load2.State.Weather.LocationName);
            Assert.Equal(52.2, load2.State.Weather.Latitude);
            Assert.Equal(21.0, load2.State.Weather.Longitude);
            Assert.Contains("garden", load2.State.World.OutdoorSeeded);
            Assert.Equal(2, load2.State.World.OwnedItems["toy_basket"]);
        }

        [Fact]
        [Trait("Case", "SAVE-unknown-fields-ignored")]
        public void Save_UnknownFields_Ignored()
        {
            string futureJson = @"{
  ""version"": 99,
  ""name"": ""FuturePig"",
  ""birthDateUtc"": ""2026-03-01T00:00:00Z"",
  ""lastActiveUtc"": ""2026-03-02T00:00:00Z"",
  ""futureTopLevelFlag"": true,
  ""futureNested"": { ""items"": [1, 2, 3], ""label"": ""abc"" },
  ""needs"": {
    ""fullness"": 95.0,
    ""vitamin_c"": 95.0,
    ""energy"": 95.0,
    ""mood"": 95.0,
    ""cleanliness"": 95.0,
    ""teeth"": 95.0,
    ""futureNeed"": 42.0
  },
  ""weather"": {
    ""consent"": false,
    ""locationName"": ""Krakow"",
    ""futureWeatherField"": ""ignored""
  },
  ""world"": {
    ""version"": 5,
    ""futureWorldArray"": [""x"", ""y""]
  }
}";
            var saveSystem = new SaveSystem(_testDir);
            File.WriteAllText(saveSystem.SavePath, futureJson);

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Main, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("FuturePig", result.State.Name);
            Assert.False(result.State.Weather.Consent);
            Assert.Equal("Krakow", result.State.Weather.LocationName);
        }
    }
}
