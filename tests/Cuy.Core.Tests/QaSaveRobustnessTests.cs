using System;
using System.IO;
using System.Text;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    /// <summary>QA-3: damaged and odd save files must never throw and must fall back or report no save.</summary>
    public class QaSaveRobustnessTests : IDisposable
    {
        private readonly string _dir = Path.Combine(Path.GetTempPath(), "cuy_qa_save_" + Guid.NewGuid().ToString("N"));
        public QaSaveRobustnessTests() { Directory.CreateDirectory(_dir); }
        public void Dispose() { try { Directory.Delete(_dir, true); } catch { } }

        private static GameState Fresh() { return GameState.CreateNew("QA", new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc)); }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("{")]
        [InlineData("null")]
        [InlineData("[]")]
        [InlineData("{\"Needs\":null}")]
        [InlineData("{\"Clovers\":\"many\"}")]
        [InlineData("\u0000\u0000\u0000")]
        [InlineData("{\"World\":{\"Rooms\":{\"salon\":null}}}")]
        public void DamagedMain_NoBackup_NeverThrows(string content)
        {
            File.WriteAllText(Path.Combine(_dir, "save.json"), content, Encoding.UTF8);
            var r = new SaveSystem(_dir).Load();
            Assert.NotNull(r);
            if (r.State != null) Assert.NotNull(r.State.Needs);
        }

        [Fact]
        public void NullRosterEntries_LoadNeverThrows()
        {
            File.WriteAllText(Path.Combine(_dir, "save.json"), "{\"Roster\":[null,null]}", Encoding.UTF8);
            Assert.NotNull(new SaveSystem(_dir).Load());
        }

        [Fact]
        public void TruncatedMain_FallsBackToBackup()
        {
            var sys = new SaveSystem(_dir);
            var st = Fresh(); st.Clovers = 123;
            sys.Save(st);
            sys.Save(st); // second save rotates the backup
            string json = File.ReadAllText(sys.SavePath);
            File.WriteAllText(sys.SavePath, json.Substring(0, json.Length / 2));
            var r = sys.Load();
            Assert.NotNull(r.State);
            Assert.Equal(LoadSource.Backup, r.Source);
            Assert.Equal(123, r.State.Clovers);
        }

        [Fact]
        public void FutureSchemaVersion_DoesNotThrow()
        {
            var sys = new SaveSystem(_dir);
            sys.Save(Fresh());
            string json = File.ReadAllText(sys.SavePath).Replace("\"Version\":", "\"Version\":9999,\"X\":");
            File.WriteAllText(sys.SavePath, json);
            var r = sys.Load();
            Assert.NotNull(r);
        }

        [Fact]
        public void HugeRoster_RoundTrips()
        {
            var sys = new SaveSystem(_dir);
            var st = Fresh();
            for (int i = 0; i < 300; i++) st.Roster.Add(new Cuy.Core.Pigs.PigProfile { Id = "p" + i, Name = "Pig " + i });
            sys.Save(st);
            var r = sys.Load();
            Assert.Equal(LoadSource.Main, r.Source);
            Assert.Equal(st.Roster.Count, r.State.Roster.Count);
        }

        [Fact]
        public void ConcurrentSaves_LeaveReadableFile()
        {
            var sys = new SaveSystem(_dir);
            var st = Fresh();
            var tasks = new System.Threading.Tasks.Task[8];
            for (int t = 0; t < tasks.Length; t++)
                tasks[t] = System.Threading.Tasks.Task.Run(() => { for (int i = 0; i < 30; i++) sys.Save(st); });
            System.Threading.Tasks.Task.WaitAll(tasks);
            Assert.NotNull(new SaveSystem(_dir).Load().State);
        }

        [Fact]
        public void SaveTwice_SameState_StableJson()
        {
            var st = Fresh();
            Assert.Equal(SaveSystem.Serialize(st), SaveSystem.Serialize(st));
        }

        [Fact]
        public void LoadSaveLoad_RoundTripIsStable()
        {
            var sys = new SaveSystem(_dir);
            var st = Fresh(); st.Clovers = 77;
            sys.Save(st);
            var a = sys.Load().State;
            string ja = SaveSystem.Serialize(a);
            sys.Save(a);
            string jb = SaveSystem.Serialize(sys.Load().State);
            Assert.Equal(ja, jb);
        }
    }
}
