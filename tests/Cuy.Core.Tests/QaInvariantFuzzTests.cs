using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    /// <summary>QA-2: random action sequences against world/economy invariants. Never throws, money never negative, uids unique.</summary>
    public class QaInvariantFuzzTests
    {
        private static readonly string[] Items = { "sofa", "rug", "lamp", "pot", "", null, "nope", "SOFA", "../x" };
        private static readonly string[] Junk = { null, "", " ", "nope", "salon", "pig:a", "pig:b", "pig:zzz", "../..", new string('x', 5000), "ąęść" };

        private static (Pet pet, ManualClock clock) Create(int pigs)
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            for (int i = 0; i < pigs; i++) state.Roster.Add(new PigProfile { Id = i == 0 ? "a" : i == 1 ? "b" : "p" + i, Name = "P" + i });
            state.Clovers = 2000;
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = true;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.HomeEconomy = HomeEconomyConfig.CreateDefault();
            pet.WorldItemCatalog = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition("sofa", "Sofa", new string[0], 1, 1, price: 320, comfort: 5, layer: "floor", icon: "sofa", recolor: true),
                new WorldItemDefinition("rug", "Rug", new string[0], 1, 1, price: 0, comfort: 1, layer: "floor", icon: "rug", free: true, recolor: true),
                new WorldItemDefinition("lamp", "Lamp", new string[0], 1, 1, price: 40, comfort: 1, layer: "floor", icon: "lamp"),
                new WorldItemDefinition("pot", "Pot", new string[0], 1, 1, price: 10, comfort: 1, layer: "floor", icon: "pot", repeatable: true)
            });
            pet.EnsurePigRooms();
            return (pet, clock);
        }

        private static void Check(Pet pet, string trace)
        {
            Assert.True(pet.State.Clovers >= 0, "negative clovers after " + trace);
            var world = pet.State.World;
            if (world == null) return;
            var uids = new HashSet<string>();
            foreach (var kv in world.Rooms)
            {
                Assert.NotNull(kv.Value);
                foreach (var it in kv.Value.Items)
                {
                    Assert.True(it.X >= 0 && it.Y >= 0, "negative position in " + kv.Key + " after " + trace);
                    Assert.True(uids.Add(it.Uid), "duplicate uid " + it.Uid + " after " + trace);
                }
            }
            foreach (var kv in world.OwnedItems) Assert.True(kv.Value >= 0, "negative owned " + kv.Key + " after " + trace);
        }

        [Theory]
        [InlineData(1, 1)] [InlineData(2, 3)] [InlineData(3, 5)] [InlineData(4, 5)] [InlineData(5, 2)] [InlineData(6, 3)]
        public void RandomActions_KeepInvariants(int seed, int pigs)
        {
            var (pet, clock) = Create(pigs);
            var rng = new Random(seed);
            var trace = new List<string>();
            for (int step = 0; step < 600; step++)
            {
                string room = rng.Next(4) == 0 ? Junk[rng.Next(Junk.Length)] : pet.RoomIdOf(rng.Next(2) == 0 ? "a" : "b");
                string item = Items[rng.Next(Items.Length)];
                int x = rng.Next(-3, 14), y = rng.Next(-3, 10);
                int op = rng.Next(12);
                trace.Add(op + ":" + room + ":" + item + ":" + x + "," + y);
                string t = string.Join(" > ", trace.Skip(Math.Max(0, trace.Count - 4)));
                switch (op)
                {
                    case 0: pet.BuyItem(item); break;
                    case 1: pet.PlaceItem(room, item, x, y, rng.Next(2) == 0); break;
                    case 2: { var w = pet.State.World; var r = w != null && room != null && w.Rooms.ContainsKey(room) ? w.Rooms[room] : null; if (r != null && r.Items.Count > 0) pet.MoveItem(room, r.Items[rng.Next(r.Items.Count)].Uid, x, y); else pet.MoveItem(room, item, x, y); break; }
                    case 3: { var w = pet.State.World; var r = w != null && room != null && w.Rooms.ContainsKey(room) ? w.Rooms[room] : null; if (r != null && r.Items.Count > 0) pet.RemoveItem(room, r.Items[rng.Next(r.Items.Count)].Uid); else pet.RemoveItem(room, item); break; }
                    case 4: { var w = pet.State.World; var r = w != null && room != null && w.Rooms.ContainsKey(room) ? w.Rooms[room] : null; string uid = r != null && r.Items.Count > 0 ? r.Items[0].Uid : item; pet.TransferItem(room, uid, Junk[rng.Next(Junk.Length)] ?? "salon", x, y); break; }
                    case 5: pet.UnlockDorm(); break;
                    case 6: pet.UpgradeDorm(); break;
                    case 7: pet.MoveIn(new[] { "a", "b", Junk[rng.Next(Junk.Length)] }); break;
                    case 8: pet.MoveOut(rng.Next(2) == 0 ? "a" : Junk[rng.Next(Junk.Length)]); break;
                    case 9: pet.SetHome(rng.Next(2) == 0 ? "a" : Junk[rng.Next(Junk.Length)], rng.Next(2) == 0 ? "own" : Junk[rng.Next(Junk.Length)], room); break;
                    case 10: pet.SetMemorial(rng.Next(2) == 0 ? "a" : Junk[rng.Next(Junk.Length)], rng.Next(2) == 0); break;
                    default: clock.Advance(TimeSpan.FromMinutes(rng.Next(1, 3000))); pet.Update(); break;
                }
                Check(pet, t);
            }
        }

        [Fact]
        public void HostileInput_NeverThrows()
        {
            var (pet, _) = Create(2);
            foreach (var a in Junk)
            {
                foreach (var b in Junk)
                {
                    pet.PlaceItem(a, b, int.MinValue, int.MaxValue, true);
                    pet.MoveItem(a, b, int.MaxValue, int.MinValue);
                    pet.RemoveItem(a, b);
                    pet.RenameRoom(a, b);
                    pet.SetVariant(a, b, -1);
                    pet.UnlockVariant(b, int.MaxValue);
                    pet.TransferItem(a, b, b, 0, 0);
                    pet.SetHome(a, b, a);
                    pet.RoomIdOf(a);
                    pet.BuyItem(b);
                }
            }
            Check(pet, "hostile");
        }

        [Fact]
        public void SaveRoundTrip_AfterActivity_KeepsRooms()
        {
            var (pet, _) = Create(3);
            pet.BuyItem("sofa");
            pet.PlaceItem(pet.RoomIdOf("a"), "sofa", 1, 1, false);
            string json = Newtonsoft.Json.JsonConvert.SerializeObject(pet.State);
            var back = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(json);
            Assert.Equal(pet.State.World.Rooms.Count, back.World.Rooms.Count);
            Assert.Equal(pet.State.Clovers, back.Clovers);
        }
    }
}
