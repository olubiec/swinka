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
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);

            Assert.Null(pet.GetFavoriteVegetable());
            Assert.False(pet.IsFavoriteVegetable("bell_pepper"));
        }

        [Fact]
        public void FoodEaten_TracksCountersAndUpdatesFavorite()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.RecordFoodEaten("bell_pepper");
            Assert.Equal("bell_pepper", pet.GetFavoriteVegetable());
            Assert.True(pet.IsFavoriteVegetable("bell_pepper"));
            Assert.False(pet.IsFavoriteVegetable("cucumber"));

            // Nakarm ogórkiem 2 razy -> ogórek staje się ulubionym
            pet.RecordFoodEaten("cucumber");
            pet.RecordFoodEaten("cucumber");

            Assert.Equal("cucumber", pet.GetFavoriteVegetable());
            Assert.True(pet.IsFavoriteVegetable("cucumber"));
            Assert.False(pet.IsFavoriteVegetable("bell_pepper"));

            // Sprawdzenie liczników w State
            Assert.Equal(3, pet.State.Stats.Counters["karmienia"]);
            Assert.Equal(1, pet.State.Stats.Counters["eaten_bell_pepper"]);
            Assert.Equal(2, pet.State.Stats.Counters["eaten_cucumber"]);
        }

        [Fact]
        public void CustomCandidateList_EvaluatesOnlyCandidates()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.RecordFoodEaten("hay");
            pet.RecordFoodEaten("hay");
            pet.RecordFoodEaten("carrot");

            // Siano nie jest w domyślnych warzywach
            Assert.Equal("carrot", pet.GetFavoriteVegetable());

            // Z niestandardową listą uwzględniającą siano
            var customList = new[] { "hay", "carrot" };
            Assert.Equal("hay", pet.GetFavoriteVegetable(customList));
        }
    }
}
