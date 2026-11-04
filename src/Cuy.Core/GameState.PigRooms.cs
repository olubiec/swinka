using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.World;

namespace Cuy.Core
{
    public partial class GameState
    {
        private const int PigRoomWallRows = 2;

        /// <summary>
        /// Creates the missing own room of every roster pig (memorial pigs included) and returns how many
        /// rooms it created. Idempotent: a pig whose room exists or was already created is skipped, and
        /// existing rooms, salon layouts and Decor are never touched. Pigs living in a shared room are skipped.
        /// </summary>
        public int EnsurePigRooms(PigRoomConfig config, WorldItemCatalog items, Func<string> uidGen = null, Random rng = null)
        {
            if (config == null || Roster == null) return 0;

            var world = World;
            int created = 0;
            foreach (var pig in Roster.ToList())
            {
                if (pig == null || string.IsNullOrEmpty(pig.Id)) continue;

                string roomId = config.RoomId(string.IsNullOrEmpty(pig.NamedId) ? pig.Id : pig.NamedId);
                if (world.PigRoomsEnsured.Contains(pig.Id)) continue;
                if (world.Rooms.TryGetValue(roomId, out var existing) && existing != null)
                {
                    world.PigRoomsEnsured.Add(pig.Id);
                    continue;
                }
                if (world.RoomShare.ContainsKey(pig.Id)) continue;

                int index = rng != null ? rng.Next(0, 1 << 20) : StableIndex(pig.Id);
                var theme = config.ThemeFor(pig.NamedId ?? pig.Id, index);
                var room = new RoomLayout
                {
                    Wallpaper = theme.Wallpaper ?? string.Empty,
                    Floor = theme.Floor ?? string.Empty,
                    Name = config.NameFor(pig.Name, pig.Memorial),
                };
                PlaceStarter(room, config, items, theme, uidGen);
                foreach (var group in room.Items.GroupBy(i => i.ItemId))
                {
                    world.OwnedItems.TryGetValue(group.Key, out int owned);
                    if (owned < group.Count()) world.OwnedItems[group.Key] = group.Count();
                }

                world.Rooms[roomId] = room;
                world.PigRoomsEnsured.Add(pig.Id);
                created++;
            }
            return created;
        }

        private static void PlaceStarter(RoomLayout room, PigRoomConfig config, WorldItemCatalog items, PigRoomTheme theme, Func<string> uidGen)
        {
            if (items == null || theme.Starter == null || config.Levels.Count == 0) return;
            var level = config.Levels[0];
            foreach (string id in theme.Starter)
            {
                if (!items.TryGet(id, out var def) || def == null) continue;
                bool placed = false;
                for (int y = 0; y < level.Rows && !placed; y++)
                {
                    for (int x = 0; x < level.Cols && !placed; x++)
                    {
                        placed = RoomLayoutOps.Place(room, level.Cols, level.Rows, PigRoomWallRows, def, null, x, y, uidGen, items) == PlaceResult.Ok;
                    }
                }
            }
        }

        private static int StableIndex(string id)
        {
            int h = 17;
            foreach (char c in id) h = h * 31 + c;
            return h & 0x7fffffff;
        }
    }
}
