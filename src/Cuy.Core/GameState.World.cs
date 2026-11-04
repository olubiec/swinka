using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.World;

namespace Cuy.Core
{
    public partial class GameState
    {
        private WorldState _world;

        public WorldState World
        {
            get => _world ?? (_world = new WorldState());
            set => _world = value ?? new WorldState();
        }

        public void EnsureWorld(WorldItemCatalog items, ItemCatalog catalog)
        {
            var world = World;
            if (!world.LegacyDecorMigrated)
            {
                LegacyDecorMigration.Migrate(this, items, catalog);
            }

            if (world.Rooms == null)
            {
                world.Rooms = new Dictionary<string, RoomLayout>();
            }

            if (!world.Rooms.ContainsKey("salon") || world.Rooms["salon"] == null)
            {
                world.Rooms["salon"] = new RoomLayout();
            }

            if (world.OwnedItems == null)
            {
                world.OwnedItems = new Dictionary<string, int>();
            }

            if (Roster != null && Roster.Any(p => p != null && p.Memorial))
            {
                if (!world.OwnedItems.ContainsKey("memory_corner"))
                {
                    world.OwnedItems["memory_corner"] = 1;
                }
            }
        }
    }
}
