using System;
using System.IO;
using SwinkaCore;
using SwinkaCore.Save;
using SwinkaCore.Time;
using Xunit;

namespace SwinkaCore.Tests
{
    public class PoopAndCleanlinessTests
    {
        [Fact]
        public void Cleanliness_DependsDirectlyOnPoopCount()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.Start();

            // 0 bobków => 100%
            Assert.Equal(0, pet.State.PoopCount);
            Assert.Equal(100.0, pet.Needs.Cleanliness);

            // Dodanie 1 bobka => 87.5%
            Assert.True(pet.TryAddPoop(new PoopItem { X = 100, Y = 200, OnTaskbar = true }));
            Assert.Equal(1, pet.State.PoopCount);
            Assert.Equal(87.5, pet.Needs.Cleanliness);

            // Dodanie kolejnych do 8 bobków => 0%
            for (int i = 2; i <= 8; i++)
            {
                Assert.True(pet.TryAddPoop(new PoopItem { X = 100 + i, Y = 200, OnTaskbar = true }));
            }
            Assert.Equal(8, pet.State.PoopCount);
            Assert.Equal(0.0, pet.Needs.Cleanliness);

            // 9. bobek nie może zostać dodany (maksymalnie 8 bobków naraz)
            Assert.False(pet.TryAddPoop(new PoopItem { X = 999, Y = 999 }));
            Assert.Equal(8, pet.State.PoopCount);
            Assert.Equal(0.0, pet.Needs.Cleanliness);
        }

        [Fact]
        public void CleanPoop_RemovesPoop_AddsOneClover_AndImprovesCleanliness()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            state.Clovers = 10;
            var pet = new Pet(state, clock);
            pet.Start();

            var poop = new PoopItem { Id = "test-poop-1", X = 50, Y = 100, OnTaskbar = true };
            pet.TryAddPoop(poop);

            Assert.Equal(1, pet.State.PoopCount);
            Assert.Single(pet.State.Poops);
            Assert.Equal(87.5, pet.Needs.Cleanliness);
            Assert.Equal(10, pet.State.Clovers);

            // Kliknięcie bobka
            bool cleaned = pet.CleanPoop("test-poop-1");
            Assert.True(cleaned);
            Assert.Equal(0, pet.State.PoopCount);
            Assert.Empty(pet.State.Poops);
            Assert.Equal(100.0, pet.Needs.Cleanliness);
            Assert.Equal(11, pet.State.Clovers); // +1 koniczynka
            Assert.Equal(1, pet.State.Stats.Counters["zebrane_bobki"]);
        }

        [Fact]
        public void ClosedWindow_RemovesVisualPoop_ButPoopCounterStaysInGameState()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Świnka", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.Start();

            var poopOnTaskbar = new PoopItem { Id = "taskbar-1", X = 200, Y = 1040, OnTaskbar = true };
            var poopOnWindow = new PoopItem { Id = "window-1", X = 300, Y = 400, OnTaskbar = false, WindowTitle = "Notepad" };

            pet.TryAddPoop(poopOnTaskbar);
            pet.TryAddPoop(poopOnWindow);

            Assert.Equal(2, pet.State.PoopCount);
            Assert.Equal(2, pet.State.Poops.Count);
            Assert.Equal(75.0, pet.Needs.Cleanliness);

            // Okno z bobkiem zostaje zamknięte: bobek znika z listy widocznych bobków,
            // ale licznik PoopCount zostaje w stanie gry nienaruszony!
            pet.State.Poops.RemoveAll(p => p.Id == "window-1");
            pet.RecalculateCleanliness();

            Assert.Single(pet.State.Poops);
            Assert.Equal("taskbar-1", pet.State.Poops[0].Id);
            Assert.Equal(2, pet.State.PoopCount); // Licznik zostaje w stanie gry
            Assert.Equal(75.0, pet.Needs.Cleanliness); // Czystość klatki dalej zależy od liczby bobków
        }

        [Fact]
        public void SaveSystem_PersistsPoopCountAndPoopList()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "SwinkaTest_Poops_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var savePath = Path.Combine(tempDir, "save.json");
                var clock = new ManualClock(new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc));
                var state = GameState.CreateNew("Kropek", clock.UtcNow);
                var pet = new Pet(state, clock);
                pet.Start();

                pet.TryAddPoop(new PoopItem { Id = "p1", X = 120, Y = 1040, OnTaskbar = true });
                pet.TryAddPoop(new PoopItem { Id = "p2", X = 450, Y = 500, OnTaskbar = false, WindowTitle = "Kalkulator" });

                Assert.Equal(2, pet.State.PoopCount);
                Assert.Equal(75.0, pet.Needs.Cleanliness);

                var saveSystem = new SaveSystem(tempDir);
                saveSystem.Save(pet.State);

                // Odczyt ze świeżo zapisanego pliku
                var loadResult = saveSystem.Load();
                Assert.NotNull(loadResult.State);
                var loadedState = loadResult.State;
                Assert.Equal(2, loadedState.PoopCount);
                Assert.Equal(2, loadedState.Poops.Count);
                Assert.Equal("p1", loadedState.Poops[0].Id);
                Assert.Equal("p2", loadedState.Poops[1].Id);
                Assert.Equal("Kalkulator", loadedState.Poops[1].WindowTitle);

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
