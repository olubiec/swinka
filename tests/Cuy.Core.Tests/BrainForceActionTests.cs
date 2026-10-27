using System;
using System.Collections.Generic;
using Cuy.Core.AI;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BrainForceActionTests
    {
        private (Brain brain, Pet pet, ActionDefinition actionDef) SetupBrainWithAction()
        {
            var clock = new ManualClock(new DateTime(2023, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("TestPig", clock.UtcNow);
            state.Inventory = new Dictionary<string, int>(); // Ensure inventory exists
            var pet = new Pet(state, clock, new Balance());

            var brain = Brain.CreateDefault(pet, new Random(42));

            var actionDef = brain.Config.Actions.Find(a => a.Id == "ball_play");
            Assert.NotNull(actionDef);

            return (brain, pet, actionDef);
        }

        [Fact]
        public void ForceAction_OwnedAndReady_ReturnsActionDecisionAndRecordsCooldown()
        {
            var (brain, pet, actionDef) = SetupBrainWithAction();
            pet.State.Inventory["ball"] = 1; // Own the item
            pet.State.Needs.Energy = 100; // Meet energy requirement (min 30)

            var decision = brain.ForceAction("ball_play");

            Assert.NotNull(decision);
            Assert.Equal("ball_play", decision.ActionId);

            // Check cooldown was recorded
            double totalSecs = brain.TotalSimulatedSeconds;
            // Trying again immediately should return null due to cooldown
            var decision2 = brain.ForceAction("ball_play");
            Assert.Null(decision2);
        }

        [Fact]
        public void ForceAction_NotOwned_ReturnsNull()
        {
            var (brain, pet, actionDef) = SetupBrainWithAction();
            // ball is NOT in inventory
            pet.State.Needs.Energy = 100;

            var decision = brain.ForceAction("ball_play");

            Assert.Null(decision);
        }

        [Fact]
        public void ForceAction_OnCooldown_ReturnsNull()
        {
            var (brain, pet, actionDef) = SetupBrainWithAction();
            pet.State.Inventory["ball"] = 1; // Own the item
            pet.State.Needs.Energy = 100;

            // First time works
            var decision1 = brain.ForceAction("ball_play");
            Assert.NotNull(decision1);

            // Second time fails due to cooldown
            var decision2 = brain.ForceAction("ball_play");
            Assert.Null(decision2);
        }

        [Fact]
        public void ForceAction_InvalidActionId_ReturnsNull()
        {
            var (brain, pet, actionDef) = SetupBrainWithAction();
            var decision = brain.ForceAction("invalid_action_123");
            Assert.Null(decision);
        }
    }
}
