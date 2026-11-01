using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigCollectionTests
    {
        [Fact]
        public void PigProfile_DefaultInitialization_SetsValidValues()
        {
            var profile = new PigProfile();
            Assert.False(string.IsNullOrWhiteSpace(profile.Id));
            Assert.Equal("Cuy", profile.Name);
            Assert.Equal("smooth", profile.Breed);
            Assert.Equal("tricolor", profile.PaletteId);
            Assert.NotNull(profile.Traits);
            Assert.NotNull(profile.DiscoveredTraits);
        }

        [Fact]
        public void PigProfile_DiscoverTrait_WorksCorrectly()
        {
            var profile = new PigProfile("Pigi");
            profile.Traits.Add("glutton");
            profile.Traits.Add("cuddly");

            Assert.False(profile.IsTraitDiscovered("glutton"));
            Assert.True(profile.DiscoverTrait("glutton"));
            Assert.True(profile.IsTraitDiscovered("glutton"));
            // Second discovery returns false (already discovered)
            Assert.False(profile.DiscoverTrait("glutton"));
        }

        [Fact]
        public void PigProfile_SerializationRoundTrip_PreservesAllData()
        {
            var profile = new PigProfile("Bobo", "rosette", "dutch");
            profile.Traits.Add("popcorning");
            profile.DiscoverTrait("popcorning");

            var json = JsonConvert.SerializeObject(profile);
            var deserialized = JsonConvert.DeserializeObject<PigProfile>(json);

            Assert.NotNull(deserialized);
            Assert.Equal(profile.Id, deserialized.Id);
            Assert.Equal("Bobo", deserialized.Name);
            Assert.Equal("rosette", deserialized.Breed);
            Assert.Equal("dutch", deserialized.PaletteId);
            Assert.Contains("popcorning", deserialized.Traits);
            Assert.True(deserialized.IsTraitDiscovered("popcorning"));
        }

        [Fact]
        public void PigProfile_CreateRandom_GeneratesUniquePersonalities()
        {
            var rng = new Random(42);
            var pig1 = PigProfile.CreateRandom("Luna", rng);
            var pig2 = PigProfile.CreateRandom("Milo", rng);

            Assert.Equal("Luna", pig1.Name);
            Assert.Equal("Milo", pig2.Name);
            Assert.Equal(2, pig1.Traits.Count);
            Assert.Equal(2, pig2.Traits.Count);
            Assert.NotEqual(pig1.Id, pig2.Id);
        }
    }
}

