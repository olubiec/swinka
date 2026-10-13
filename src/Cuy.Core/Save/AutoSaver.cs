using System;
using System.Diagnostics;
using System.IO;

namespace Cuy.Core.Save
{
    /// <summary>
    /// Zapis co 60 s. Nie ma własnego wątku: wywołuj <see cref="Tick"/> z pętli gry,
    /// dzięki temu stan nie jest serializowany w trakcie zmiany.
    /// </summary>
    /// <remarks>
    /// Odstęp liczony jest w czasie REALNYM (Stopwatch), nie w czasie gry: przy mnożniku 1440x
    /// zapis co 60 s gry oznaczałby zapis 24 razy na sekundę.
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

        /// <summary>Błąd zapisu (np. pełny dysk). Gra działa dalej, kolejna próba przy następnym ticku po odstępie.</summary>
        public event EventHandler<Exception> SaveFailed;

        /// <summary>Zapisuje, jeśli od ostatniego zapisu minął odstęp. Zwraca true, gdy zapisano.</summary>
        public bool Tick()
        {
            if (_sinceLastSave.Elapsed < Interval) return false;
            return SaveNow();
        }

        /// <summary>Zapis natychmiast (np. przy zamknięciu aplikacji).</summary>
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
