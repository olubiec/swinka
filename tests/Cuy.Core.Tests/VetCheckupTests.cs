using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Health;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class VetCheckupTests
    {
        [Fact]
        public void HealthyPig_ReturnsFoundZero()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock);

            var result = pet.CheckupWithResult();

            Assert.Equal(0, result.Found);
            Assert.Equal(0, result.NewlyKnown);
            Assert.Equal(clock.UtcNow, pet.State.Health.LastCheckupUtc);
        }

        [Fact]
        public void TwoConditions_OneAlreadyKnown_ReturnsFoundTwoNewlyKnownOne()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock);

            pet.State.Health.Active.Add(new ActiveCondition
            {
                Id = "scurvy",
                Known = true,
                Severity = 0.5,
                SinceUtc = clock.UtcNow
            });
            pet.State.Health.Active.Add(new ActiveCondition
            {
                Id = "dental",
                Known = false,
                Severity = 0.3,
                SinceUtc = clock.UtcNow
            });

            var result = pet.CheckupWithResult();

            Assert.Equal(2, result.Found);
            Assert.Equal(1, result.NewlyKnown);
            Assert.All(pet.State.Health.Active, a => Assert.True(a.Known));
            Assert.Equal(clock.UtcNow, pet.State.Health.LastCheckupUtc);
        }

        [Fact]
        public void LastCheckupUtc_SetFromManualClock()
        {
            var checkupTime = new DateTime(2026, 7, 15, 14, 30, 0, DateTimeKind.Utc);
            var clock = new ManualClock(checkupTime);
            var state = new GameState();
            var pet = new Pet(state, clock);

            pet.CheckupWithResult();

            Assert.Equal(checkupTime, pet.State.Health.LastCheckupUtc);
        }

        [Fact]
        public void CheckupPayment_TakesPriceOnce_UsingTryPay()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock);
            pet.State.Clovers = 100;

            int price = pet.HealthSystem.CheckupPrice;
            Assert.True(price > 0);

            bool paid = pet.TryPay(price, "vet");
            Assert.True(paid);
            Assert.Equal(100 - price, pet.State.Clovers);

            var result = pet.CheckupWithResult();
            Assert.Equal(0, result.Found);

            pet.State.Clovers = 10;
            bool paidFails = pet.TryPay(price, "vet");
            Assert.False(paidFails);
            Assert.Equal(10, pet.State.Clovers);
        }

        [Fact]
        public void Checkup_OldSignature_ReturnsListOfActiveConditions()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock);
            pet.State.Health.Active.Add(new ActiveCondition { Id = "scurvy", Known = false });

            var list = pet.Checkup();

            Assert.Single(list);
            Assert.True(list[0].Known);
            Assert.Equal(clock.UtcNow, pet.State.Health.LastCheckupUtc);
        }
    }
}
