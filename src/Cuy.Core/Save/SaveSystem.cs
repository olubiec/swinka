using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Serialization;

namespace Cuy.Core.Save
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
    /// Zapis stanu gry w JSON: %AppData%/Cuy/save.json z polem version i kopią save.bak.
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

        public SaveSystem(string directory = null)
        {
            Directory = string.IsNullOrEmpty(directory) ? DefaultDirectory : directory;
        }

        /// <summary>%AppData%\Cuy</summary>
        public static string DefaultDirectory
        {
            get
            {
                string cuyDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Cuy");
                string legacyDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Swinka");
                MigrateLegacyDirectory(legacyDir, cuyDir);
                return cuyDir;
            }
        }

        public static void MigrateLegacyDirectory(string legacyDir, string targetDir)
        {
            try
            {
                if (System.IO.Directory.Exists(legacyDir))
                {
                    string legacySave = Path.Combine(legacyDir, FileName);
                    string targetSave = Path.Combine(targetDir, FileName);
                    string legacyBak = Path.Combine(legacyDir, BackupFileName);
                    string targetBak = Path.Combine(targetDir, BackupFileName);

                    if (File.Exists(legacySave) || File.Exists(legacyBak))
                    {
                        if (!System.IO.Directory.Exists(targetDir))
                        {
                            System.IO.Directory.CreateDirectory(targetDir);
                        }

                        if (File.Exists(legacySave) && !File.Exists(targetSave))
                        {
                            File.Move(legacySave, targetSave);
                        }
                        if (File.Exists(legacyBak) && !File.Exists(targetBak))
                        {
                            File.Move(legacyBak, targetBak);
                        }

                        if (System.IO.Directory.GetFileSystemEntries(legacyDir).Length == 0)
                        {
                            System.IO.Directory.Delete(legacyDir);
                        }
                    }
                }
            }
            catch
            {
                // Ignoruj ewentualne błędy odczytu/zapisu podczas migracji legacy
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

                // Przed przeniesieniem save.json do save.bak sprawdzamy, czy save.json da się odczytać jako poprawny stan;
                // jeśli nie, zostawiamy save.bak bez zmian.
                bool isMainValid = File.Exists(SavePath) && TryRead(SavePath, out _, out _);

                if (isMainValid)
                {
                    try
                    {
                        // Atomowo: save.tmp -> save.json, stary (poprawny) save.json -> save.bak.
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
                    // Brak pliku głównego albo jest uszkodzony: zostawiamy save.bak bez zmian,
                    // żeby nigdy nie nadpisać dobrej kopii uszkodzonym stanem.
                    if (File.Exists(SavePath))
                    {
                        TryCopy(SavePath, CorruptPath);
                        File.Delete(SavePath);
                    }
                    File.Move(TempPath, SavePath);
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
                        result.State = state;
                        result.Source = LoadSource.Main;
                        return result;
                    }
                    result.MainError = error;
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
        /// Migracje starszych wersji zapisu (1 -> 2: polskie id przedmiotów na angielskie).
        /// Plik z nowszej wersji jest wczytywany "jak się da" (nieznane pola są pomijane).
        /// </summary>
        private static void Migrate(GameState state)
        {
            if (state.Version <= 0) state.Version = 1;
            if (state.Version < 2)
            {
                RenameKeys(state.Inventory, "");
                if (state.Stats != null)
                {
                    RenameKeys(state.Stats.Counters, "");
                    RenameKeys(state.Stats.Counters, "eaten_");
                }
                state.Version = 2;
            }
        }

        /// <summary>Version 1 used Polish item ids; this is the only place they may appear in code.</summary>
        private static readonly System.Collections.Generic.Dictionary<string, string> V1ItemIds =
            new System.Collections.Generic.Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "siano", "hay" },
            { "granulat", "pellets" },
            { "papryka", "bell_pepper" },
            { "natka", "parsley" },
            { "jarmuz", "kale" },
            { "ogorek", "cucumber" },
            { "marchewka", "carrot" },
            { "gryzak", "chew_stick" },
            { "chew_toy", "chew_stick" },
            { "pilka", "ball" },
            { "tunel", "tunnel" },
            { "domek", "house" },
            { "poidlo", "water_bottle" },
            { "tort", "cake" }
        };

        /// <summary>Renames dictionary keys "[prefix]old" to "[prefix]new"; counts are summed on collision.</summary>
        private static void RenameKeys(System.Collections.Generic.Dictionary<string, int> dict, string prefix)
        {
            if (dict == null) return;
            foreach (var key in new System.Collections.Generic.List<string>(dict.Keys))
            {
                if (!key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;
                string newId;
                if (!V1ItemIds.TryGetValue(key.Substring(prefix.Length), out newId)) continue;
                string newKey = prefix + newId;
                int count = dict[key];
                dict.Remove(key);
                int existing;
                dict[newKey] = dict.TryGetValue(newKey, out existing) ? existing + count : count;
            }
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
