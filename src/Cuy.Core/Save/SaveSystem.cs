using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Serialization;

namespace Cuy.Core.Save
{
    /// <summary>Where the game state was loaded from.</summary>
    public enum LoadSource
    {
        /// <summary>No save (or both files damaged): new game.</summary>
        None,
        /// <summary>save.json.</summary>
        Main,
        /// <summary>save.bak, because save.json was damaged or missing.</summary>
        Backup
    }

    public sealed class LoadResult
    {
        public GameState State { get; internal set; }
        public LoadSource Source { get; internal set; }

        /// <summary>Description of the problem with the main file (if any), for the log.</summary>
        public string MainError { get; internal set; }

        /// <summary>Description of the problem with the backup (if any), for the log.</summary>
        public string BackupError { get; internal set; }
    }

    /// <summary>
    /// Game state saved as JSON: %AppData%/Cuy/save.json with a version field and a save.bak backup.
    /// </summary>
    /// <remarks>
    /// Saving is safe against sudden power loss: save.tmp is written first, then
    /// File.Replace swaps in save.json and the previous version becomes save.bak.
    /// At any moment there is at least one valid file on disk.
    /// </remarks>
    public sealed class SaveSystem
    {
        public const string FileName = "save.json";
        public const string BackupFileName = "save.bak";
        public const string TempFileName = "save.tmp";
        public const string CorruptFileName = "save.corrupt.json";

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
                // Ignore read/write errors during the legacy migration
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
                // Dictionary keys (item ids, animation names) stay unchanged.
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

        /// <summary>Saves the state. Throws IOException/UnauthorizedAccessException on disk errors.</summary>
        public void Save(GameState state)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            state.Version = GameState.CurrentVersion;
            string json = Serialize(state);

            lock (_lock)
            {
                System.IO.Directory.CreateDirectory(Directory);
                WriteDurable(TempPath, json);

                // Before moving save.json to save.bak we check that save.json reads as a valid state;
                // if not, save.bak is left unchanged.
                bool isMainValid = File.Exists(SavePath) && TryRead(SavePath, out _, out _);

                if (isMainValid)
                {
                    try
                    {
                // Atomic: save.tmp -> save.json, old (valid) save.json -> save.bak.
                        File.Replace(TempPath, SavePath, BackupPath, true);
                    }
                    catch (Exception ex) when (ex is IOException || ex is PlatformNotSupportedException)
                    {
                        // E.g. a network drive without Replace support.
                        File.Copy(SavePath, BackupPath, true);
                        File.Copy(TempPath, SavePath, true);
                        File.Delete(TempPath);
                    }
                }
                else
                {
                    // Main file missing or damaged: keep save.bak unchanged,
                    // so a good backup is never overwritten by a damaged state.
                    if (File.Exists(SavePath))
                    {
                        TryCopy(SavePath, CorruptPath);
                        File.Delete(SavePath);
                    }
                    File.Move(TempPath, SavePath);
                }

                // First save: create the backup right away, so a damaged save.json can never wipe the game.
                if (!File.Exists(BackupPath)) File.Copy(SavePath, BackupPath);
            }
        }

        /// <summary>
        /// Loads the state: save.json first, then save.bak if it is damaged or missing.
        /// Never throws because of a bad file; returns State = null when there is no save.
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
                    TryCopy(SavePath, CorruptPath); // keep it for inspection
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
                    error = "The file is empty.";
                    return false;
                }

                state = JsonConvert.DeserializeObject<GameState>(json, JsonSettings);
                if (state == null || state.Needs == null)
                {
                    error = "The file contains no game state.";
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
        /// Migrations of older save versions (1 -> 2: Polish item ids and counters to English).
        /// A file from a newer version is loaded as well as possible (unknown fields are skipped).
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
            { "tort", "cake" },
            { "karmienia", "feedings" },
            { "zawolania", "calls" },
            { "glaskanie", "pets" },
            { "sprzatania", "cleanings" },
            { "zakupy", "purchases" },
            { "zebrane_bobki", "poops_collected" },
            { "minigry_rozegrane", "minigames_played" },
            { "popcorn_po_jedzeniu", "popcorn_after_food" }
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
                fs.Flush(true); // to disk, not just the OS buffer
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
