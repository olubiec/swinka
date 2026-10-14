using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SaveMigrationTests : IDisposable
    {
        private readonly string _testDir;

        public SaveMigrationTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyMigrationTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try { if (Directory.Exists(_testDir)) Directory.Delete(_testDir, true); }
            catch { }
        }

        [Fact]
        public void Version1Save_RenamesPolishItemIds()
        {
            string json = @"{
  'version': 1,
  'name': 'Puszek',
  'birthDateUtc': '2026-10-01T10:00:00Z',
  'lastActiveUtc': '2026-10-01T10:00:00Z',
  'needs': { },
  'inventory': { 'papryka': 3, 'siano': 2 },
  'stats': { 'counters': { 'papryka': 4, 'domek': 1 } }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), json);

            var result = new SaveSystem(_testDir).Load();

            Assert.Equal(LoadSource.Main, result.Source);
            var state = result.State;
            Assert.Equal(2, state.Version);
            Assert.Equal(3, state.Inventory["bell_pepper"]);
            Assert.Equal(2, state.Inventory["hay"]);
            Assert.Equal(4, state.Stats.Counters["bell_pepper"]);
            Assert.Equal(1, state.Stats.Counters["house"]);
        }

        [Fact]
        public void Version1Save_SumsCountsOnCollision()
        {
            string json = @"{
  'version': 1,
  'name': 'Puszek',
  'birthDateUtc': '2026-10-01T10:00:00Z',
  'lastActiveUtc': '2026-10-01T10:00:00Z',
  'needs': { },
  'inventory': { 'papryka': 3, 'bell_pepper': 1 }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), json);

            var state = new SaveSystem(_testDir).Load().State;

            Assert.Equal(4, state.Inventory["bell_pepper"]);
        }
    }
}
