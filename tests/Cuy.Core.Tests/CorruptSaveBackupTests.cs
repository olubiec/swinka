using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CorruptSaveBackupTests : IDisposable
    {
        private readonly string _testDir;

        public CorruptSaveBackupTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyCorruptBackupTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, true);
                }
            }
            catch
            {
            }
        }

        [Fact]
        public void SaveSystem_Load_WhenMainCorrupt_LoadsFromBackupAndCopiesToCorruptFile()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            // Zapisujemy poprawny stan do backupu
            var backupState = GameState.CreateNew("DobraKopia", nowUtc);
            backupState.Clovers = 88;
            saveSystem.Save(backupState);

            // Celowo uszkadzamy plik główny save.json (błędna składnia JSON)
            string corruptedContent = "{\"version\": 1, \"name\": \"Urwany plik...";
            File.WriteAllText(saveSystem.SavePath, corruptedContent);

            var result = saveSystem.Load();

            // Powinno odczytać z kopii zapasowej
            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("DobraKopia", result.State.Name);
            Assert.Equal(88, result.State.Clovers);
            Assert.NotNull(result.MainError);
            Assert.Null(result.BackupError);

            // Powinien powstać plik save.uszkodzony.json z treścią uszkodzonego pliku
            string corruptFilePath = Path.Combine(_testDir, SaveSystem.CorruptFileName);
            Assert.True(File.Exists(corruptFilePath), "Plik save.uszkodzony.json powinien zostać zachowany do analizy.");
            Assert.Equal(corruptedContent, File.ReadAllText(corruptFilePath));
        }

        [Fact]
        public void SaveSystem_Load_WhenMainEmpty_LoadsFromBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var validState = GameState.CreateNew("WażnaŚwinka", nowUtc);
            validState.Clovers = 50;
            saveSystem.Save(validState);

            // Plik główny staje się pusty (np. nagły reset w trakcie zapisu bez flusha)
            File.WriteAllText(saveSystem.SavePath, "   \n\r");

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("WażnaŚwinka", result.State.Name);
            Assert.Contains("Plik jest pusty", result.MainError);
        }

        [Fact]
        public void SaveSystem_Load_WhenMainHasInvalidSchemaWithoutNeeds_LoadsFromBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var validState = GameState.CreateNew("Poprawna", nowUtc);
            saveSystem.Save(validState);

            // Plik ma poprawny JSON, ale brak wymaganych danych (needs: null)
            File.WriteAllText(saveSystem.SavePath, "{\"version\": 1, \"name\": \"BrakPotrzeb\", \"needs\": null}");

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("Poprawna", result.State.Name);
            Assert.Contains("nie zawiera stanu gry", result.MainError);
        }

        [Fact]
        public void SaveSystem_SaveAfterRecoveringFromBackup_RepairsMainAndPreservesGoodBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            // 1. Zapisujemy pierwotny stan (trafia do save.json i save.bak)
            var state1 = GameState.CreateNew("KopiaZapasowa", nowUtc);
            saveSystem.Save(state1);

            // 2. Uszkadzamy plik główny
            File.WriteAllText(saveSystem.SavePath, "USZKODZONE_DANE_!@#$");

            // 3. Wczytujemy – system wykrywa uszkodzenie i ustawia _mainCorrupt = true
            var loadResult = saveSystem.Load();
            Assert.Equal(LoadSource.Backup, loadResult.Source);
            Assert.Equal("KopiaZapasowa", loadResult.State.Name);

            // 4. Zapisujemy nowy stan gry (po naprawieniu / kontynuacji)
            var state2 = loadResult.State;
            state2.Name = "OdzyskanaSwinka";
            state2.Clovers = 120;
            saveSystem.Save(state2);

            // 5. Kolejny Load powinien bez problemu odczytać z Main
            var secondLoad = saveSystem.Load();
            Assert.Equal(LoadSource.Main, secondLoad.Source);
            Assert.Equal("OdzyskanaSwinka", secondLoad.State.Name);
            Assert.Equal(120, secondLoad.State.Clovers);
            Assert.Null(secondLoad.MainError);
        }

        [Fact]
        public void SaveSystem_Load_WhenBothMainAndBackupCorrupt_ReturnsNoneAndLogsBothErrors()
        {
            var saveSystem = new SaveSystem(_testDir);

            // Oba pliki uszkodzone
            File.WriteAllText(saveSystem.SavePath, "ZŁY_MAIN");
            File.WriteAllText(saveSystem.BackupPath, "ZŁY_BACKUP");

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.None, result.Source);
            Assert.Null(result.State);
            Assert.NotNull(result.MainError);
            Assert.NotNull(result.BackupError);
        }

        [Fact]
        public void SaveSystem_Load_WhenMainMissingButBackupExists_LoadsFromBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var validState = GameState.CreateNew("TylkoBackup", nowUtc);
            saveSystem.Save(validState);

            // Usuwamy save.json, zostaje tylko save.bak
            File.Delete(saveSystem.SavePath);

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("TylkoBackup", result.State.Name);
            Assert.Null(result.MainError);
        }

        [Fact]
        public void SaveSystem_Save_WhenMainCorruptAndNewInstance_PreservesGoodBackup()
        {
            var saveSystem1 = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            // 1. Zapisujemy poprawny stan początkowy (znajdzie się w save.json i save.bak)
            var initialGoodState = GameState.CreateNew("DobraKopiaZapasowa", nowUtc);
            initialGoodState.Clovers = 77;
            saveSystem1.Save(initialGoodState);

            // 2. Uszkadzamy plik główny save.json
            string corruptedData = "{ niepoprawny: json, urwany plik... ";
            File.WriteAllText(saveSystem1.SavePath, corruptedData);

            // 3. Tworzymy nową instancję SaveSystem (nie wywołujemy Load(), więc _mainCorrupt jest domyślnie false)
            var newSaveSystem = new SaveSystem(_testDir);

            // 4. Zapisujemy nowy stan przez nową instancję
            var newState = GameState.CreateNew("NowyStan", nowUtc);
            newState.Clovers = 150;
            newSaveSystem.Save(newState);

            // 5. save.bak dalej zawiera dobry stan (nie został nadpisany uszkodzonym plikiem)
            Assert.True(File.Exists(newSaveSystem.BackupPath), "Plik save.bak powinien istnieć.");
            string backupJson = File.ReadAllText(newSaveSystem.BackupPath);
            var backupState = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(backupJson, SaveSystem.JsonSettings);
            Assert.NotNull(backupState);
            Assert.Equal("DobraKopiaZapasowa", backupState.Name);
            Assert.Equal(77, backupState.Clovers);

            // 6. Plik główny save.json został podmieniony na nowy poprawny stan
            var loadResult = newSaveSystem.Load();
            Assert.Equal(LoadSource.Main, loadResult.Source);
            Assert.Equal("NowyStan", loadResult.State.Name);
            Assert.Equal(150, loadResult.State.Clovers);
        }
    }
}
