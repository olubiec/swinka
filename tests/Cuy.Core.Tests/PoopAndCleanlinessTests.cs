using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PoopAndCleanlinessTests
    {
        [Fact]
        public void Cleanliness_DependsDirectlyOnPoopCount()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.Start();

            // 0 poops => 100%
            Assert.Equal(0, pet.State.PoopCount);
            Assert.Equal(100.0, pet.Needs.Cleanliness);

            // Adding 1 poop => 87.5%
            Assert.True(pet.TryAddPoop(new PoopItem { X = 100, Y = 200, OnTaskbar = true }));
            Assert.Equal(1, pet.State.PoopCount);
            Assert.Equal(87.5, pet.Needs.Cleanliness);

            // Adding more up to 8 poops => 0%
            for (int i = 2; i <= 8; i++)
            {
                Assert.True(pet.TryAddPoop(new PoopItem { X = 100 + i, Y = 200, OnTaskbar = true }));
            }
            Assert.Equal(8, pet.State.PoopCount);
            Assert.Equal(0.0, pet.Needs.Cleanliness);

            // A 9th poop cannot be added (at most 8 poops at once)
            Assert.False(pet.TryAddPoop(new PoopItem { X = 999, Y = 999 }));
            Assert.Equal(8, pet.State.PoopCount);
            Assert.Equal(0.0, pet.Needs.Cleanliness);
        }

        [Fact]
        public void CleanPoop_RemovesPoop_AddsOneClover_AndImprovesCleanliness()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            state.Clovers = 10;
            var pet = new Pet(state, clock);
            pet.Start();

            var poop = new PoopItem { Id = "test-poop-1", X = 50, Y = 100, OnTaskbar = true };
            pet.TryAddPoop(poop);

            Assert.Equal(1, pet.State.PoopCount);
            Assert.Single(pet.State.Poops);
            Assert.Equal(87.5, pet.Needs.Cleanliness);
            Assert.Equal(10, pet.State.Clovers);

            // Clicking a poop
            bool cleaned = pet.CleanPoop("test-poop-1");
            Assert.True(cleaned);
            Assert.Equal(0, pet.State.PoopCount);
            Assert.Empty(pet.State.Poops);
            Assert.Equal(100.0, pet.Needs.Cleanliness);
            Assert.Equal(11, pet.State.Clovers); // +1 clover
            Assert.Equal(1, pet.State.Stats.Counters["poops_collected"]);
        }

        [Fact]
        public void ClosedWindow_RemovesVisualPoop_ButPoopCounterStaysInGameState()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.Start();

            var poopOnTaskbar = new PoopItem { Id = "taskbar-1", X = 200, Y = 1040, OnTaskbar = true };
            var poopOnWindow = new PoopItem { Id = "window-1", X = 300, Y = 400, OnTaskbar = false, WindowTitle = "Notepad" };

            pet.TryAddPoop(poopOnTaskbar);
            pet.TryAddPoop(poopOnWindow);

            Assert.Equal(2, pet.State.PoopCount);
            Assert.Equal(2, pet.State.Poops.Count);
            Assert.Equal(75.0, pet.Needs.Cleanliness);

            // The window with a poop closes: the poop leaves the list of visible poops,
            // but PoopCount stays untouched in the game state!
            pet.State.Poops.RemoveAll(p => p.Id == "window-1");
            pet.RecalculateCleanliness();

            Assert.Single(pet.State.Poops);
            Assert.Equal("taskbar-1", pet.State.Poops[0].Id);
            Assert.Equal(2, pet.State.PoopCount); // The counter stays in the game state
            Assert.Equal(75.0, pet.Needs.Cleanliness); // Cage cleanliness still depends on the poop count
        }

        [Fact]
        public void SaveSystem_PersistsPoopCountAndPoopList()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "CuyTest_Poops_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var savePath = Path.Combine(tempDir, "save.json");
                var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
                var state = GameState.CreateNew("Dot", clock.UtcNow);
                var pet = new Pet(state, clock);
                pet.Start();

                pet.TryAddPoop(new PoopItem { Id = "p1", X = 120, Y = 1040, OnTaskbar = true });
                pet.TryAddPoop(new PoopItem { Id = "p2", X = 450, Y = 500, OnTaskbar = false, WindowTitle = "Calculator" });

                Assert.Equal(2, pet.State.PoopCount);
                Assert.Equal(75.0, pet.Needs.Cleanliness);

                var saveSystem = new SaveSystem(tempDir);
                saveSystem.Save(pet.State);

                // Read from the freshly saved file
                var loadResult = saveSystem.Load();
                Assert.NotNull(loadResult.State);
                var loadedState = loadResult.State;
                Assert.Equal(2, loadedState.PoopCount);
                Assert.Equal(2, loadedState.Poops.Count);
                Assert.Equal("p1", loadedState.Poops[0].Id);
                Assert.Equal("p2", loadedState.Poops[1].Id);
                Assert.Equal("Calculator", loadedState.Poops[1].WindowTitle);

                var loadedPet = new Pet(loadedState, clock);
                loadedPet.Start();
                Assert.Equal(75.0, loadedPet.Needs.Cleanliness);
            }
            finally
            {
                if (Directory.Exists(tempDir))
                {
                    try { Directory.Delete(tempDir, true); } catch { }
                }
            }
        }
    }
}
