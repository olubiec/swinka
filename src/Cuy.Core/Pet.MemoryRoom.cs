using System;
using Cuy.Core.World;

namespace Cuy.Core
{
    /// <summary>A pig in memorial mode keeps its room, shown as a memory room. Rooms and items are never deleted.</summary>
    public sealed partial class Pet
    {
        /// <summary>Name shown for the room of a pig: the player's name wins, else the (memory) room template.</summary>
        public string RoomDisplayName(string pigId)
        {
            var pig = FindRosterPig(pigId);
            if (pig == null) return string.Empty;

            var world = EnsureWorld();
            if (world.Rooms.TryGetValue(PigRooms.RoomId(PigKey(pig)), out var room) && room != null && !string.IsNullOrEmpty(room.Name))
            {
                return room.Name;
            }
            return PigRooms.NameFor(pig.Name, pig.Memorial);
        }

        /// <summary>True when the room belongs to a pig in memorial mode.</summary>
        public bool IsMemoryRoom(string roomId)
        {
            if (!PigRooms.TryParseRoomId(roomId, out var pigId)) return false;
            var pig = FindRosterPig(pigId);
            return pig != null && pig.Memorial;
        }

        /// <summary>
        /// Call after SetMemorial. Makes sure the room exists; the name follows the flag by itself.
        /// Not subscribed from AttachPigRooms because Pet.Adoption.cs raises no event for it.
        /// </summary>
        public void OnMemorialChanged(string pigId, bool memorial)
        {
            if (Balance == null || !Balance.PigRoomsActive) return;
            var pig = FindRosterPig(pigId);
            if (pig == null) return;
            int index = State.Roster.IndexOf(pig);
            EnsureRoom(pig, index < 0 ? 0 : index);
        }
    }
}
