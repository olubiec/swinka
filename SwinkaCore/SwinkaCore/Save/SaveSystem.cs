using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Serialization;

namespace SwinkaCore.Save
{
    /// <summary>Skąd wczytano stan gry.</summary>
    public enum LoadSource
    {
        /// <summary>Brak zapisu (albo oba pliki uszkodzone): nowa gra.</summary>
        None,
        /// <summary>save.json.</summary>
        Main,
        /// <summary>save.bak, bo save.json był uszkodzony albo go brakowało.</summary>
        Backup
    }

    public sealed class LoadResult
    {
        public GameState State { get; internal set; }
        public LoadSource Source { get; internal set; }

        /// <summary>Opis problemu z plikiem głównym (jeśli był), do logu.</summary>
        public string MainError { get; internal set; }

        /// <summary>Opis problemu z kopią (jeśli był), do logu.</summary>
        public string BackupError { get; internal set; }
    }

    /// <summary>
    /// Zapis stanu gry w JSON: %AppData%/Swinka/save.json z polem version i kopią save.bak.
    /// </summary>
    /// <remarks>
    /// Zapis jest bezpieczny przy nagłym wyłączeniu: najpierw powstaje save.tmp, potem
    /// File.Replace podmienia save.json, a poprzednia wersja staje się save.bak.
    /// W każdej chwili na dysku jest co najmniej jeden poprawny plik.
    /// </remarks>
    public sealed class SaveSystem
    {
        public const string FileName = "save.json";
        public const string BackupFileName = "save.bak";
        public const string TempFileName = "save.tmp";
        public const string CorruptFileName = "save.uszkodzony.json";

        private static readonly UTF8Encoding Utf8NoBom = new UTF8Encoding(false);
        private readonly object _lock = new object();
        private bool _mainCorrupt;

        public SaveSystem(string directory = null)
        {
            Directory = string.IsNullOrEmpty(directory) ? DefaultDirectory : directory;
        }

        /// <summary>%AppData%\Swinka</summary>
        public static string DefaultDirectory
        {
            get
            {
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Swinka");
            }
        }

        public string Directory { get; }
        public string SavePath { get { return Path.Combine(Directory, FileName); } }
        public string BackupPath { get { return Path.Combine(Directory, BackupFileName); } }
        private string TempPath { get { return Path.Combine(Directory, TempFileName); } }
        private string CorruptPath { get { return Path.Combine(Directory, CorruptFileName); } }

        public static JsonSerializerSettings JsonSettings { get; } = new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver
            {
                // Klucze słowników (id przedmiotów, nazwy animacji) zostają bez zmian.
                NamingStrategy = new CamelCaseNamingStrategy { ProcessDictionaryKeys = false }
            },
            Converters = { new StringEnumConverter(new CamelCaseNamingStrategy()) },
            DateTimeZoneHandling = DateTimeZoneHandling.Utc,
            Formatting = Formatting.Indented,
            NullValueHandling = NullValueHandling.Include,
            ObjectCreationHandling = ObjectCreationHandling.Replace,
            MissingMemberHandling = MissingMemberHandling.Ignore,
        };

        public static string Serialize(GameState state)
        {
            return JsonConvert.SerializeObject(state, JsonSettings);
        }

        /// <summary>Zapisuje stan. Rzuca IOException/UnauthorizedAccessException przy błędzie dysku.</summary>
        public void Save(GameState state)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            state.Version = GameState.CurrentVersion;
            string json = Serialize(state);

            lock (_lock)
            {
                System.IO.Directory.CreateDirectory(Directory);
                WriteDurable(TempPath, json);

                if (File.Exists(SavePath) && !_mainCorrupt)
                {
                    try
                    {
                        // Atomowo: save.tmp -> save.json, stary save.json -> save.bak.
                        File.Replace(TempPath, SavePath, BackupPath, true);
                    }
                    catch (Exception ex) when (ex is IOException || ex is PlatformNotSupportedException)
                    {
                        // Np. dysk sieciowy bez obsługi Replace.
                        File.Copy(SavePath, BackupPath, true);
                        File.Copy(TempPath, SavePath, true);
                        File.Delete(TempPath);
                    }
                }
                else
                {
                    // Brak pliku głównego albo jest uszkodzony: nie robimy z niego kopii,
                    // żeby nie nadpisać dobrego save.bak śmieciami.
                    if (File.Exists(SavePath)) File.Delete(SavePath);
                    File.Move(TempPath, SavePath);
                    _mainCorrupt = false;
                }

                // Pierwszy zapis: od razu jest też kopia, żeby uszkodzenie save.json nigdy nie kasowało gry.
                if (!File.Exists(BackupPath)) File.Copy(SavePath, BackupPath);
            }
        }

        /// <summary>
        /// Wczytuje stan: najpierw save.json, a gdy jest uszkodzony lub go brak, save.bak.
        /// Nigdy nie rzuca wyjątku z powodu złego pliku; przy braku zapisu zwraca State = null.
        /// </summary>
        public LoadResult Load()
        {
            lock (_lock)
            {
                var result = new LoadResult();
                GameState state;
                string error;

                if (File.Exists(SavePath))
                {
                    if (TryRead(SavePath, out state, out error))
                    {
                        _mainCorrupt = false;
                        result.State = state;
                        result.Source = LoadSource.Main;
                        return result;
                    }
                    result.MainError = error;
                    _mainCorrupt = true;
                    TryCopy(SavePath, CorruptPath); // zostawiamy do obejrzenia
                }

                if (File.Exists(BackupPath))
                {
                    if (TryRead(BackupPath, out state, out error))
                    {
                        result.State = state;
                        result.Source = LoadSource.Backup;
                        return result;
                    }
                    result.BackupError = error;
                }

                result.Source = LoadSource.None;
                return result;
            }
        }

        private static bool TryRead(string path, out GameState state, out string error)
        {
            state = null;
            error = null;
            try
            {
                string json = File.ReadAllText(path, Encoding.UTF8);
                if (string.IsNullOrWhiteSpace(json))
                {
                    error = "Plik jest pusty.";
                    return false;
                }

                state = JsonConvert.DeserializeObject<GameState>(json, JsonSettings);
                if (state == null || state.Needs == null)
                {
                    error = "Plik nie zawiera stanu gry.";
                    state = null;
                    return false;
                }

                Migrate(state);
                state.Normalize();
                return true;
            }
            catch (Exception ex) when (ex is JsonException || ex is IOException || ex is UnauthorizedAccessException
                                       || ex is ArgumentException || ex is FormatException)
            {
                error = ex.GetType().Name + ": " + ex.Message;
                state = null;
                return false;
            }
        }

        /// <summary>
        /// Miejsce na migracje starszych wersji zapisu. Na razie jest tylko wersja 1.
        /// Plik z nowszej wersji jest wczytywany "jak się da" (nieznane pola są pomijane).
        /// </summary>
        private static void Migrate(GameState state)
        {
            if (state.Version <= 0) state.Version = 1;
            // if (state.Version == 1) { ...; state.Version = 2; }
        }

        private static void WriteDurable(string path, string content)
        {
            byte[] bytes = Utf8NoBom.GetBytes(content);
            using (var fs = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                fs.Write(bytes, 0, bytes.Length);
                fs.Flush(true); // na dysk, nie tylko do bufora systemu
            }
        }

        private static void TryCopy(string from, string to)
        {
            try { File.Copy(from, to, true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
}
