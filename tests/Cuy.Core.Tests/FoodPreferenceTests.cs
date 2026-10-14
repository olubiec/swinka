using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FoodPreferenceTests
    {
        [Fact]
        public void NoFoodEaten_FavoriteVegetableIsNull()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            Assert.Null(pet.GetFavoriteVegetable());
            Assert.False(pet.IsFavoriteVegetable("bell_pepper"));
        }

        [Fact]
        public void FoodEaten_TracksCountersAndUpdatesFavorite()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.RecordFoodEaten("bell_pepper");
            Assert.Equal("bell_pepper", pet.GetFavoriteVegetable());
            Assert.True(pet.IsFavoriteVegetable("bell_pepper"));
            Assert.False(pet.IsFavoriteVegetable("cucumber"));

            // Feed cucumber twice -> cucumber becomes the favourite
            pet.RecordFoodEaten("cucumber");
            pet.RecordFoodEaten("cucumber");

            Assert.Equal("cucumber", pet.GetFavoriteVegetable());
            Assert.True(pet.IsFavoriteVegetable("cucumber"));
            Assert.False(pet.IsFavoriteVegetable("bell_pepper"));

            // Check the counters in State
            Assert.Equal(3, pet.State.Stats.Counters["feedings"]);
            Assert.Equal(1, pet.State.Stats.Counters["eaten_bell_pepper"]);
            Assert.Equal(2, pet.State.Stats.Counters["eaten_cucumber"]);
        }

        [Fact]
        public void CustomCandidateList_EvaluatesOnlyCandidates()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.RecordFoodEaten("hay");
            pet.RecordFoodEaten("hay");
            pet.RecordFoodEaten("carrot");

            // Hay is not in the default vegetables
            Assert.Equal("carrot", pet.GetFavoriteVegetable());

            // With a custom list that includes hay
            var customList = new[] { "hay", "carrot" };
            Assert.Equal("hay", pet.GetFavoriteVegetable(customList));
        }
    }
}
