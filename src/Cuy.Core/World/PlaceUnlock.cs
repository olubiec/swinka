using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public enum UnlockResult
    {
        Ok,
        Unknown,
        AlreadyUnlocked,
        MissingRequirement
    }

    public static class PlaceUnlock
    {
        public static bool IsUnlocked(WorldState world, PlaceCatalog places, string placeOrRoomId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(placeOrRoomId))
            {
                return false;
            }

            if (world.PlaceLevels.TryGetValue(placeOrRoomId, out int lvl) && lvl > 0)
            {
                return true;
            }

            if (world.RoomsUnlocked.Contains(placeOrRoomId))
            {
                return true;
            }

            var placeDef = places.Find(placeOrRoomId);
            if (placeDef != null)
            {
                return placeDef.UnlockedAtStart;
            }

            var roomDef = places.FindRoom(placeOrRoomId);
            if (roomDef != null)
            {
                return roomDef.UnlockedAtStart;
            }

            return false;
        }

        public static int GetLevel(WorldState world, PlaceCatalog places, string placeOrRoomId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(placeOrRoomId))
            {
                return 0;
            }

            if (world.PlaceLevels.TryGetValue(placeOrRoomId, out int lvl) && lvl > 0)
            {
                return lvl;
            }

            var placeDef = places.Find(placeOrRoomId);
            if (placeDef != null)
            {
                return placeDef.UnlockedAtStart ? 1 : 0;
            }

            var roomDef = places.FindRoom(placeOrRoomId);
            if (roomDef != null)
            {
                return (roomDef.UnlockedAtStart || world.RoomsUnlocked.Contains(placeOrRoomId)) ? 1 : 0;
            }

            return 0;
        }

        public static UnlockResult CanUnlock(WorldState world, PlaceCatalog places, string placeId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(placeId))
            {
                return UnlockResult.Unknown;
            }

            var placeDef = places.Find(placeId);
            if (placeDef == null)
            {
                return UnlockResult.Unknown;
            }

            if (IsUnlocked(world, places, placeId))
            {
                return UnlockResult.AlreadyUnlocked;
            }

            if (placeDef.Requires != null)
            {
                foreach (var req in placeDef.Requires)
                {
                    if (!IsUnlocked(world, places, req))
                    {
                        return UnlockResult.MissingRequirement;
                    }
                }
            }

            return UnlockResult.Ok;
        }

        public static int UnlockCost(WorldState world, PlaceCatalog places, string placeId)
        {
            if (places == null || string.IsNullOrEmpty(placeId))
            {
                return 0;
            }

            var placeDef = places.Find(placeId);
            if (placeDef != null)
            {
                return placeDef.Cost;
            }

            var roomDef = places.FindRoom(placeId);
            if (roomDef != null)
            {
                return roomDef.Cost;
            }

            return 0;
        }

        public static bool Unlock(WorldState world, PlaceCatalog places, string placeId)
        {
            if (world == null || places == null)
            {
                return false;
            }

            if (CanUnlock(world, places, placeId) != UnlockResult.Ok)
            {
                return false;
            }

            world.PlaceLevels[placeId] = 1;
            return true;
        }

        public static UnlockResult CanUnlockRoom(WorldState world, PlaceCatalog places, string roomId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(roomId))
            {
                return UnlockResult.Unknown;
            }

            var roomDef = places.FindRoom(roomId);
            if (roomDef == null)
            {
                return UnlockResult.Unknown;
            }

            if (IsUnlocked(world, places, roomId))
            {
                return UnlockResult.AlreadyUnlocked;
            }

            var parent = places.Places?.FirstOrDefault(p => p.Rooms != null && p.Rooms.Any(r => string.Equals(r.Id, roomId, StringComparison.OrdinalIgnoreCase)));
            if (parent != null && !IsUnlocked(world, places, parent.Id))
            {
                return UnlockResult.MissingRequirement;
            }

            return UnlockResult.Ok;
        }

        public static bool UnlockRoom(WorldState world, PlaceCatalog places, string roomId)
        {
            if (world == null || places == null)
            {
                return false;
            }

            if (CanUnlockRoom(world, places, roomId) != UnlockResult.Ok)
            {
                return false;
            }

            world.RoomsUnlocked.Add(roomId);
            world.PlaceLevels[roomId] = 1;
            return true;
        }

        public static int NextLevelCost(WorldState world, PlaceCatalog places, string placeOrRoomId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(placeOrRoomId))
            {
                return -1;
            }

            int currentLevel = GetLevel(world, places, placeOrRoomId);
            if (currentLevel <= 0)
            {
                return -1;
            }

            IReadOnlyList<GridLevel> levels = null;
            var placeDef = places.Find(placeOrRoomId);
            if (placeDef != null)
            {
                levels = placeDef.Levels;
            }

            if (levels == null || levels.Count == 0)
            {
                var roomDef = places.FindRoom(placeOrRoomId);
                if (roomDef != null)
                {
                    levels = roomDef.Levels;
                }
            }

            if (levels == null || levels.Count == 0)
            {
                return -1;
            }

            if (currentLevel >= levels.Count)
            {
                return -1;
            }

            return levels[currentLevel].Cost;
        }

        public static bool Upgrade(WorldState world, PlaceCatalog places, string placeOrRoomId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(placeOrRoomId))
            {
                return false;
            }

            int nextCost = NextLevelCost(world, places, placeOrRoomId);
            if (nextCost < 0)
            {
                return false;
            }

            int currentLevel = GetLevel(world, places, placeOrRoomId);
            world.PlaceLevels[placeOrRoomId] = currentLevel + 1;
            return true;
        }

        public static (int cols, int rows) GridSize(WorldState world, PlaceCatalog places, string placeOrRoomId)
        {
            if (world == null || places == null || string.IsNullOrEmpty(placeOrRoomId))
            {
                return (0, 0);
            }

            int currentLevel = GetLevel(world, places, placeOrRoomId);
            if (currentLevel <= 0)
            {
                return (0, 0);
            }

            IReadOnlyList<GridLevel> levels = null;
            var placeDef = places.Find(placeOrRoomId);
            if (placeDef != null)
            {
                levels = placeDef.Levels;
            }

            if (levels == null || levels.Count == 0)
            {
                var roomDef = places.FindRoom(placeOrRoomId);
                if (roomDef != null)
                {
                    levels = roomDef.Levels;
                }
            }

            if (levels == null || levels.Count == 0)
            {
                return (0, 0);
            }

            int index = Math.Min(currentLevel - 1, levels.Count - 1);
            return (levels[index].Cols, levels[index].Rows);
        }
    }
}
