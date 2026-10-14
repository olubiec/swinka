using System;
using System.Diagnostics;
using System.IO;

namespace Cuy.Core.Save
{
    /// <summary>
    /// Saves every 60 s. Has no thread of its own: call <see cref="Tick"/> from the game loop,
    /// so the state is never serialized in the middle of a change.
    /// </summary>
    /// <remarks>
    /// The interval is measured in REAL time (Stopwatch), not game time: at a 1440x multiplier
    /// saving every 60 game seconds would mean 24 saves per second.
    /// </remarks>
    public sealed class AutoSaver
    {
        public static readonly TimeSpan DefaultInterval = TimeSpan.FromSeconds(60);

        private readonly SaveSystem _saveSystem;
        private readonly Func<GameState> _stateProvider;
        private readonly Stopwatch _sinceLastSave = Stopwatch.StartNew();

        public AutoSaver(SaveSystem saveSystem, Func<GameState> stateProvider, TimeSpan? interval = null)
        {
            if (saveSystem == null) throw new ArgumentNullException(nameof(saveSystem));
            if (stateProvider == null) throw new ArgumentNullException(nameof(stateProvider));
            _saveSystem = saveSystem;
            _stateProvider = stateProvider;
            Interval = interval ?? DefaultInterval;
        }

        public TimeSpan Interval { get; set; }

        /// <summary>Save error (e.g. disk full). The game keeps running; the next attempt is on the next tick after the interval.</summary>
        public event EventHandler<Exception> SaveFailed;

        /// <summary>Saves if the interval has passed since the last save. Returns true when saved.</summary>
        public bool Tick()
        {
            if (_sinceLastSave.Elapsed < Interval) return false;
            return SaveNow();
        }

        /// <summary>Saves immediately (e.g. when the app closes).</summary>
        public bool SaveNow()
        {
            _sinceLastSave.Restart();
            try
            {
                _saveSystem.Save(_stateProvider());
                return true;
            }
            catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException)
            {
                var handler = SaveFailed;
                if (handler != null) handler(this, ex);
                return false;
            }
        }
    }
}
