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
            if (known || world.Rooms.ContainsKey(roomId)) return;

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
                PlaceInFirstFreeCell(room, grid.cols, grid.rows, wallRows, def, roomId);
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
