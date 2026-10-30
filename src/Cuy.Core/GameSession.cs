using System;
using Cuy.Core.Save;
using Cuy.Core.Time;

namespace Cuy.Core
{
    /// <summary>
    /// Ties everything together for the app: loading (with backup), Pet, saving every 60 s and on close.
    /// </summary>
    /// <example>
    /// var session = GameSession.Open(new ScaledClock());
    /// session.Pet.NeedLow += ...;   // events first
    /// session.Start();              // adds offline time and raises pending events
    /// // in the game loop, e.g. every 1 s:  session.Tick();
    /// // on close:                  session.Close();
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

        /// <summary>True if there was no save and a new pig was created.</summary>
        public bool IsNewGame { get { return LoadResult.Source == LoadSource.None; } }

        /// <param name="clock">Game clock.</param>
        /// <param name="saveDirectory">Save folder; defaults to %AppData%/Cuy.</param>
        /// <param name="balance">Balance; defaults from PLAN.md.</param>
        /// <param name="newPetName">Name for a newly created pig.</param>
        public static GameSession Open(IClock clock, string saveDirectory = null, Balance balance = null,
            string newPetName = "Cuy")
        {
            if (clock == null) throw new ArgumentNullException(nameof(clock));
            if (balance == null) balance = new Balance { HayRackActive = true };
            var saveSystem = new SaveSystem(saveDirectory);
            var load = saveSystem.Load();
            var isNewGame = load.State == null;
            var state = load.State ?? GameState.CreateNew(newPetName, clock.UtcNow);
            if (balance == null) balance = new Balance { DiaryActive = true };
            if (balance == null) { balance = new Balance(); balance.DiaryActive = true; }
            var session = new GameSession(new Pet(state, clock, balance), saveSystem, load);
            if (isNewGame) session.Pet.ApplyNewGameEconomy();
            return session;
        }

        public void Start()
        {
            Pet.Start();
        }

        /// <summary>Call regularly from the game loop.</summary>
        public void Tick()
        {
            Pet.Update();
            AutoSaver.Tick();
        }

        /// <summary>Adds the last slice of time and saves. Call when the app closes.</summary>
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
