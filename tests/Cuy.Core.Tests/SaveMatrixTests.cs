using System;
using System.IO;
using System.Text;
using Cuy.Core.Save;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    /// <summary>
    /// E3 save matrix: load a save in five variants (empty, old format, full, broken JSON, no records field).
    /// Each variant must not throw, must either load a migrated state or report "no save",
    /// must let a new game start and save, and must not overwrite the player's data blindly.
    /// </summary>
    public class SaveMatrixTests : IDisposable
    {
        private readonly string _dir = Path.Combine(Path.GetTempPath(), "cuy_save_matrix_" + Guid.NewGuid().ToString("N"));
        public SaveMatrixTests() { Directory.CreateDirectory(_dir); }
        public void Dispose() { try { Directory.Delete(_dir, true); } catch { } }

        private static readonly DateTime Now = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

        private static GameState Fresh(string name = "Matrix") { return GameState.CreateNew(name, Now); }

        private static GameState Full()
        {
            var s = Fresh("Pelny");
            s.HighScores["cuy_run"] = 42;
            return s;
        }

        /// <summary>Format before the minigame fields existed: Version 1, no highScores, no daily minigame fields.</summary>
        private static string OldFormatJson()
        {
            var obj = JObject.Parse(SaveSystem.Serialize(Fresh("Stary")));
            obj["version"] = 1;
            obj.Remove("highScores");
            obj.Remove("minigamesDailyDate");
            obj.Remove("minigamesDailyCount");
            Assert.Null(obj["highScores"]); // guard: the key really was removed
            return obj.ToString();
        }

        private static string FullWithoutRecordsJson()
        {
            var obj = JObject.Parse(SaveSystem.Serialize(Full()));
            obj.Remove("highScores");
            Assert.Null(obj["highScores"]); // guard: the key really was removed
            return obj.ToString();
        }

        private static string BrokenJson()
        {
            string good = SaveSystem.Serialize(Full());
            return good.Substring(0, good.Length / 2); // truncated, not valid JSON
        }

        private string MainPath => Path.Combine(_dir, SaveSystem.FileName);
        private string BackupPath => Path.Combine(_dir, SaveSystem.BackupFileName);
        private string CorruptPath => Path.Combine(_dir, SaveSystem.CorruptFileName);

        /// <summary>Writes the variant's save.json. Returns false when the variant is "no file at all".</summary>
        private bool Arrange(string variant)
        {
            switch (variant)
            {
                case "empty": return false;
                case "old": File.WriteAllText(MainPath, OldFormatJson(), Encoding.UTF8); return true;
                case "full": File.WriteAllText(MainPath, SaveSystem.Serialize(Full()), Encoding.UTF8); return true;
                case "broken": File.WriteAllText(MainPath, BrokenJson(), Encoding.UTF8); return true;
                case "no_records": File.WriteAllText(MainPath, FullWithoutRecordsJson(), Encoding.UTF8); return true;
                default: throw new ArgumentException(variant);
            }
        }

        [Theory]
        [InlineData("empty")]
        [InlineData("old")]
        [InlineData("full")]
        [InlineData("broken")]
        [InlineData("no_records")]
        public void SaveVariant_LoadsSafely_AndNewGameCanStart(string variant)
        {
            bool hadFile = Arrange(variant);
            string before = hadFile ? File.ReadAllText(MainPath, Encoding.UTF8) : null;
            var system = new SaveSystem(_dir);

            // 1. Loading never throws.
            LoadResult result = null;
            var ex = Record.Exception(() => result = system.Load());
            Assert.Null(ex);
            Assert.NotNull(result);

            // 2. Loading alone never rewrites the player's file.
            if (hadFile) Assert.Equal(before, File.ReadAllText(MainPath, Encoding.UTF8));

            switch (variant)
            {
                case "empty":
                    Assert.Null(result.State);
                    Assert.Equal(LoadSource.None, result.Source);
                    break;

                case "broken":
                    // No backup yet: reported as damaged, nothing loaded, original kept for inspection.
                    Assert.Null(result.State);
                    Assert.False(string.IsNullOrEmpty(result.MainError));
                    Assert.True(File.Exists(CorruptPath));
                    Assert.Equal(before, File.ReadAllText(CorruptPath, Encoding.UTF8));
                    break;

                case "old":
                    Assert.NotNull(result.State);
                    Assert.Equal(LoadSource.Main, result.Source);
                    Assert.Equal(GameState.CurrentVersion, result.State.Version);
                    Assert.Equal("Stary", result.State.Name);
                    Assert.NotNull(result.State.HighScores);
                    Assert.Empty(result.State.HighScores);
                    break;

                case "full":
                    Assert.NotNull(result.State);
                    Assert.Equal(LoadSource.Main, result.Source);
                    Assert.Equal("Pelny", result.State.Name);
                    Assert.Equal(42, result.State.HighScores["cuy_run"]);
                    break;

                case "no_records":
                    Assert.NotNull(result.State);
                    Assert.Equal(LoadSource.Main, result.Source);
                    Assert.Equal("Pelny", result.State.Name);
                    Assert.NotNull(result.State.HighScores);
                    Assert.Empty(result.State.HighScores);
                    break;
            }

            // 3. The game starts: a state (loaded or new) can be saved and read back.
            GameState current = result.State ?? Fresh("Nowy");
            var saveEx = Record.Exception(() => system.Save(current));
            Assert.Null(saveEx);

            LoadResult again = system.Load();
            Assert.NotNull(again.State);
            Assert.Equal(current.Name, again.State.Name);
            Assert.NotNull(again.State.HighScores);
        }

        [Fact]
        public void BrokenMain_WithGoodBackup_LoadsBackup_AndSaveKeepsBackup()
        {
            // A good backup exists; the main file is damaged.
            File.WriteAllText(BackupPath, SaveSystem.Serialize(Fresh("Kopia")), Encoding.UTF8);
            string backupBefore = File.ReadAllText(BackupPath, Encoding.UTF8);
            Arrange("broken");
            var system = new SaveSystem(_dir);

            LoadResult result = system.Load();
            Assert.NotNull(result.State);
            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.Equal("Kopia", result.State.Name);
            Assert.True(File.Exists(CorruptPath));

            system.Save(result.State);

            // The good backup is never replaced by a damaged state.
            Assert.Equal(backupBefore, File.ReadAllText(BackupPath, Encoding.UTF8));
        }
    }
}
