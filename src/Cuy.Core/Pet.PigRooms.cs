using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;
using Cuy.Core.World;

namespace Cuy.Core
{
    /// <summary>Pet side of the pig rooms: a room for every adopted pig (behind Balance.PigRoomsActive).</summary>
    public sealed partial class Pet
    {
        /// <summary>A pig room with this many placed items counts as furnished.</summary>
        public const int PigRoomFurnishedItems = 6;

        private PigRoomConfig _pigRoomConfig;
        private HomeEconomyConfig _homeEconomy;
        private bool _pigRoomsAttached;

        /// <summary>Pig room rules (ids, names, grid, themes). Tests inject their own instance.</summary>
        public PigRoomConfig PigRooms
        {
            get => _pigRoomConfig ?? PigRoomConfig.Current;
            set => _pigRoomConfig = value;
        }

        /// <summary>Home economy rules (variant prices). Tests inject their own instance.</summary>
        public HomeEconomyConfig HomeEconomy
        {
            get => _homeEconomy ?? HomeEconomyConfig.Current;
            set => _homeEconomy = value;
        }

        /// <summary>Subscribes to adoption events. The session calls it once; calling it again does nothing.</summary>
        public void AttachPigRooms()
        {
            if (_pigRoomsAttached) return;
            _pigRoomsAttached = true;
            PigAdopted += OnPigAdoptedForRoom;
        }

        private void OnPigAdoptedForRoom(object sender, PigAdoptedEventArgs e)
        {
            if (Balance == null || !Balance.PigRoomsActive || e?.Pig == null) return;
            int index = State.Roster != null ? State.Roster.IndexOf(e.Pig) : -1;
            EnsureRoom(e.Pig, index < 0 ? 0 : index);
        }

        /// <summary>Creates the missing room of every pig on the roster. Existing rooms are left alone.</summary>
        public void EnsurePigRooms()
        {
            if (Balance == null || !Balance.PigRoomsActive || State.Roster == null) return;
            for (int i = 0; i < State.Roster.Count; i++)
            {
                var pig = State.Roster[i];
                if (pig != null) EnsureRoom(pig, i);
            }
            UpdateFurnishedCounter();
        }

        /// <summary>Room id of a pig ('pig:' + the named id or the id). Accepts either id of the pig.</summary>
        public string RoomIdOf(string pigId)
        {
            var pig = FindRosterPig(pigId);
            return PigRooms.RoomId(PigKey(pig) ?? pigId);
        }

        private static string PigKey(PigProfile pig)
        {
            if (pig == null) return null;
            return string.IsNullOrEmpty(pig.NamedId) ? pig.Id : pig.NamedId;
        }

        private PigProfile FindRosterPig(string pigId)
        {
            if (string.IsNullOrEmpty(pigId) || State.Roster == null) return null;
            foreach (var p in State.Roster)
            {
                if (p == null) continue;
                if (string.Equals(p.Id, pigId, StringComparison.OrdinalIgnoreCase) ||
                    (p.NamedId != null && string.Equals(p.NamedId, pigId, StringComparison.OrdinalIgnoreCase)))
                {
                    return p;
                }
            }
            return null;
        }

        private void EnsureRoom(PigProfile pig, int randomIndex)
        {
            string key = PigKey(pig);
            if (string.IsNullOrEmpty(key)) return;

            var world = EnsureWorld();
            string roomId = PigRooms.RoomId(key);
            bool known = world.PigRoomsEnsured.Contains(key);
            world.PigRoomsEnsured.Add(key);
            if (known || world.Rooms.ContainsKey(roomId))
            {
                if (world.Rooms.TryGetValue(roomId, out var existingRoom) && existingRoom != null)
                {
                    MigrateClusteredStarterLayout(existingRoom, roomId);
                }
                return;
            }

            var theme = PigRooms.ThemeFor(key, randomIndex);
            var room = new RoomLayout
            {
                Wallpaper = theme?.Wallpaper ?? string.Empty,
                Floor = theme?.Floor ?? string.Empty,
                Name = null
            };
            world.Rooms[roomId] = room;

            if (theme?.Starter == null) return;
            var grid = PigRoomGrid();
            int wallRows = PlaceCatalog != null ? PlaceCatalog.WallRows : 2;
            foreach (var itemId in theme.Starter)
            {
                var def = WorldItemCatalog.Find(itemId);
                if (def == null) continue;
                PlaceStarterItem(room, grid.cols, grid.rows, wallRows, def, roomId);
            }
        }

        private void PlaceStarterItem(RoomLayout room, int cols, int rows, int wallRows, WorldItemDefinition def, string roomId)
        {
            if (TryGetStarterCoords(def.Id, cols, rows, wallRows, out int px, out int py) &&
                RoomLayoutOps.Place(room, cols, rows, wallRows, def, roomId, px, py, catalog: WorldItemCatalog) == PlaceResult.Ok)
            {
                return;
            }
            PlaceInFirstFreeCell(room, cols, rows, wallRows, def, roomId);
        }

        private static bool TryGetStarterCoords(string itemId, int cols, int rows, int wallRows, out int x, out int y)
        {
            int floorY = Math.Max(2, wallRows);
            int midFloorY = Math.Min(rows - 2, floorY + 1);
            if (string.Equals(itemId, "window_sun", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "curtains_dots", StringComparison.OrdinalIgnoreCase))
            {
                x = Math.Max(0, cols / 2 - 1);
                y = 0;
                return true;
            }
            if (string.Equals(itemId, "wall_clock", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "shelf_small", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "fairy_lights", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "hanging_planter", StringComparison.OrdinalIgnoreCase))
            {
                x = Math.Max(1, cols - 3);
                y = 0;
                return true;
            }
            if (string.Equals(itemId, "cushion_big", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "cosy_nook", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "armchair", StringComparison.OrdinalIgnoreCase))
            {
                x = 1;
                y = midFloorY;
                return true;
            }
            if (string.Equals(itemId, "side_table", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "toy_basket", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(itemId, "bookshelf", StringComparison.OrdinalIgnoreCase))
            {
                x = Math.Max(3, cols - 3);
                y = floorY;
                return true;
            }
            if (string.Equals(itemId, "hay_bar_wood", StringComparison.OrdinalIgnoreCase))
            {
                x = Math.Max(3, cols - 3);
                y = midFloorY;
                return true;
            }
            x = 0;
            y = 0;
            return false;
        }

        private void MigrateClusteredStarterLayout(RoomLayout room, string roomId)
        {
            if (room?.Items == null || room.Items.Count < 3) return;

            PlacedItem cushion = null;
            PlacedItem window = null;
            PlacedItem sideTable = null;
            foreach (var item in room.Items)
            {
                if (item == null || string.IsNullOrEmpty(item.ItemId)) continue;
                if (string.Equals(item.ItemId, "cushion_big", StringComparison.OrdinalIgnoreCase) &&
                    ((item.X == 0 && item.Y == 2) || (item.X == 1 && item.Y == 2)))
                {
                    cushion = item;
                }
                else if (string.Equals(item.ItemId, "window_sun", StringComparison.OrdinalIgnoreCase) &&
                         item.X == 0 && item.Y == 0)
                {
                    window = item;
                }
                else if (string.Equals(item.ItemId, "side_table", StringComparison.OrdinalIgnoreCase) &&
                         ((item.X == 1 && item.Y == 2) || (item.X == 2 && item.Y == 2)))
                {
                    sideTable = item;
                }
            }
            if (window == null && cushion == null && sideTable == null) return;
            // Require at least two clustered starter items or window@(0,0) + cushion@(0,2)
            int legacyMatches = (window != null ? 1 : 0) +
                                (cushion != null && cushion.X == 0 ? 1 : 0) +
                                (sideTable != null ? 1 : 0);
            if (legacyMatches < 2 && !(cushion != null && cushion.Y == 2 && sideTable == null && window == null && room.Items.Count == 3))
            {
                return;
            }

            var (cols, rows) = GetRoomGridSize(roomId);
            if (cols <= 0 || rows <= 0)
            {
                (cols, rows) = PigRoomGrid();
            }
            if (cols < 4 || rows < 3) return;

            int wallRows = PlaceCatalog != null ? PlaceCatalog.WallRows : 2;
            int floorY = Math.Max(2, wallRows);
            if (floorY >= rows) return;
            int midFloorY = Math.Min(rows - 2, floorY + 1);

            if (window != null)
            {
                window.X = Math.Max(0, cols / 2 - 1);
                window.Y = 0;
            }
            if (cushion != null)
            {
                cushion.X = 1;
                cushion.Y = midFloorY;
            }
            if (sideTable != null)
            {
                sideTable.X = Math.Max(3, cols - 3);
                sideTable.Y = floorY;
            }
        }

        private void PlaceInFirstFreeCell(RoomLayout room, int cols, int rows, int wallRows, WorldItemDefinition def, string roomId)
        {
            for (int y = 0; y < rows; y++)
            {
                for (int x = 0; x < cols; x++)
                {
                    if (RoomLayoutOps.Place(room, cols, rows, wallRows, def, roomId, x, y, catalog: WorldItemCatalog) == PlaceResult.Ok)
                    {
                        return;
                    }
                }
            }
        }

        private bool IsPigRoomId(string roomId)
        {
            return PigRooms.TryParseRoomId(roomId, out _);
        }

        private (int cols, int rows) PigRoomGrid()
        {
            var levels = PigRooms.Levels;
            if (levels == null || levels.Count == 0) return (0, 0);
            return (levels[0].Cols, levels[0].Rows);
        }

        /// <summary>
        /// Hook after an item was placed in a room: counts 'pig_room_items' for pig rooms and raises
        /// 'pig_rooms_furnished' once per furnished room.
        /// </summary>
        internal void NotePigRoomPlacement(string roomId)
        {
            if (Balance == null || !Balance.PigRoomsActive || !IsPigRoomId(roomId)) return;
            Count("pig_room_items");
            UpdateFurnishedCounter();
        }

        // The counter is rebuilt from the layouts: it only ever rises to the number of furnished pig rooms.
        private void UpdateFurnishedCounter()
        {
            var world = State.World;
            if (world?.Rooms == null) return;
            int furnished = 0;
            foreach (var kv in world.Rooms)
            {
                if (kv.Value?.Items != null && kv.Value.Items.Count >= PigRoomFurnishedItems && IsPigRoomId(kv.Key)) furnished++;
            }
            int current;
            State.Stats.Counters.TryGetValue("pig_rooms_furnished", out current);
            if (furnished > current) Count("pig_rooms_furnished", furnished - current);
        }
    }
}
