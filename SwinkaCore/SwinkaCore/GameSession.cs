using System;
using SwinkaCore.Save;
using SwinkaCore.Time;

namespace SwinkaCore
{
    /// <summary>
    /// Spina wszystko dla aplikacji: wczytanie (z kopią zapasową), Pet, zapis co 60 s i przy zamknięciu.
    /// </summary>
    /// <example>
    /// var session = GameSession.Open(new ScaledClock());
    /// session.Pet.NeedLow += ...;   // najpierw zdarzenia
    /// session.Start();              // nalicza czas offline i zgłasza zaległe zdarzenia
    /// // w pętli gry, np. co 1 s:  session.Tick();
    /// // przy zamknięciu:          session.Close();
    /// </example>
    public sealed class GameSession : IDisposable
    {
        private bool _closed;

        private GameSession(Pet pet, SaveSystem saveSystem, LoadResult loadResult)
        {
            Pet = pet;
            SaveSystem = saveSystem;
            LoadResult = loadResult;
            AutoSaver = new AutoSaver(saveSystem, () => Pet.State);
        }

        public Pet Pet { get; }
        public SaveSystem SaveSystem { get; }
        public AutoSaver AutoSaver { get; }
        public LoadResult LoadResult { get; }

        /// <summary>True, jeśli nie było zapisu i powstała nowa świnka.</summary>
        public bool IsNewGame { get { return LoadResult.Source == LoadSource.None; } }

        /// <param name="clock">Zegar gry.</param>
        /// <param name="saveDirectory">Folder zapisu; domyślnie %AppData%/Swinka.</param>
        /// <param name="balance">Balans; domyślnie z PLAN.md.</param>
        /// <param name="newPetName">Imię, jeśli powstaje nowa świnka.</param>
        public static GameSession Open(IClock clock, string saveDirectory = null, Balance balance = null,
            string newPetName = "Świnka")
        {
            if (clock == null) throw new ArgumentNullException(nameof(clock));
            var saveSystem = new SaveSystem(saveDirectory);
            var load = saveSystem.Load();
            var state = load.State ?? GameState.CreateNew(newPetName, clock.UtcNow);
            return new GameSession(new Pet(state, clock, balance), saveSystem, load);
        }

        public void Start()
        {
            Pet.Start();
        }

        /// <summary>Wywołuj regularnie z pętli gry.</summary>
        public void Tick()
        {
            Pet.Update();
            AutoSaver.Tick();
        }

        /// <summary>Nalicza ostatni kawałek czasu i zapisuje. Wywołaj przy zamykaniu aplikacji.</summary>
        public bool Close()
        {
            if (_closed) return true;
            _closed = true;
            Pet.Update();
            return AutoSaver.SaveNow();
        }

        public void Dispose()
        {
            Close();
        }
    }
}
