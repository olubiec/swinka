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
            Assert.False(pet.IsFavoriteVegetable("papryka"));
        }

        [Fact]
        public void FoodEaten_TracksCountersAndUpdatesFavorite()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.RecordFoodEaten("papryka");
            Assert.Equal("papryka", pet.GetFavoriteVegetable());
            Assert.True(pet.IsFavoriteVegetable("papryka"));
            Assert.False(pet.IsFavoriteVegetable("ogorek"));

            // Nakarm ogórkiem 2 razy -> ogórek staje się ulubionym
            pet.RecordFoodEaten("ogorek");
            pet.RecordFoodEaten("ogorek");

            Assert.Equal("ogorek", pet.GetFavoriteVegetable());
            Assert.True(pet.IsFavoriteVegetable("ogorek"));
            Assert.False(pet.IsFavoriteVegetable("papryka"));

            // Sprawdzenie liczników w State
            Assert.Equal(3, pet.State.Stats.Counters["karmienia"]);
            Assert.Equal(1, pet.State.Stats.Counters["eaten_papryka"]);
            Assert.Equal(2, pet.State.Stats.Counters["eaten_ogorek"]);
        }

        [Fact]
        public void CustomCandidateList_EvaluatesOnlyCandidates()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.RecordFoodEaten("siano");
            pet.RecordFoodEaten("siano");
            pet.RecordFoodEaten("marchewka");

            // Siano nie jest w domyślnych warzywach
            Assert.Equal("marchewka", pet.GetFavoriteVegetable());

            // Z niestandardową listą uwzględniającą siano
            var customList = new[] { "siano", "marchewka" };
            Assert.Equal("siano", pet.GetFavoriteVegetable(customList));
        }
    }
}
