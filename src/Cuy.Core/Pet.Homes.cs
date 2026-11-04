using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;

namespace Cuy.Core
{
    /// <summary>
    /// Pet side of roaming and home mode (behind Balance.HomesActive). A pig roams the house or is tied to one room.
    /// Memorial pigs always stay in their memory room and never wander.
    /// </summary>
    public sealed partial class Pet
    {
        /// <summary>
        /// Sets a pig's home mode (<see cref="PigHomeState.ModeFree"/> or <see cref="PigHomeState.ModeRoom"/>).
        /// Returns false when homes are off, the pig is not on the roster, the mode is unknown or the room is not usable by the pig.
        /// </summary>
        public bool SetHome(string pigId, string mode, string roomId)
        {
            if (Balance == null || !Balance.HomesActive) return false;
            var pig = FindRosterPig(pigId);
            if (pig == null) return false;
            var world = EnsureWorld();

            if (mode == PigHomeState.ModeFree)
            {
                world.PigHomes[pig.Id] = new PigHomeState { Mode = PigHomeState.ModeFree };
                return true;
            }

            if (mode != PigHomeState.ModeRoom) return false;
            if (!CanUseRoom(pig, roomId, world)) return false;

            world.PigHomes[pig.Id] = new PigHomeState { Mode = PigHomeState.ModeRoom, Room = roomId };
            return true;
        }

        /// <summary>Where a pig is now and what it does. Null when the pig is not on the roster.</summary>
        public WanderResult LocationOf(string pigId)
        {
            var pig = FindRosterPig(pigId);
            if (pig == null) return null;

            var world = EnsureWorld();
            string ownRoom = OwnRoomOf(pig, world);
            DateTime now = Clock.LocalNow();

            // Memorial pigs stay in their memory room; with homes off every pig is in its own room (an empty list means no wandering).
            if (pig.Memorial || Balance == null || !Balance.HomesActive)
            {
                return PigWander.Where(pig.Id, new PigHomeState(), ownRoom, new List<string>(), now, HomeEconomy);
            }

            var home = world.HomeOf(pig.Id, HomeEconomy.RoamDefaultMode);
            if (home.Mode == PigHomeState.ModeRoom && !CanUseRoom(pig, home.Room, world))
            {
                home = new PigHomeState();
            }

            return PigWander.Where(pig.Id, home, ownRoom, VisitableRooms(pig, ownRoom, world), now, HomeEconomy);
        }

        /// <summary>Location of every pig on the roster: (pig id, room id, activity).</summary>
        public IReadOnlyList<(string pigId, string room, string activity)> Locations()
        {
            var result = new List<(string pigId, string room, string activity)>();
            if (State.Roster == null) return result;

            foreach (var pig in State.Roster)
            {
                if (pig == null) continue;
                var where = LocationOf(pig.Id);
                if (where != null) result.Add((pig.Id, where.RoomId, where.Activity));
            }
            return result;
        }

        private string OwnRoomOf(PigProfile pig, WorldState world)
        {
            if (pig.Memorial) return RoomIdOf(pig.Id);
            return IsResident(pig, world) ? SharedRoomOps.DormId : RoomIdOf(pig.Id);
        }

        private bool IsResident(PigProfile pig, WorldState world)
        {
            var residents = SharedRoomOps.Residents(world);
            return residents.Contains(PigKey(pig)) || residents.Contains(pig.Id);
        }

        /// <summary>A room a pig may be tied to: its own room, the dorm when it is a resident, or an unlocked common room.</summary>
        private bool CanUseRoom(PigProfile pig, string roomId, WorldState world)
        {
            if (string.IsNullOrEmpty(roomId)) return false;
            if (roomId == OwnRoomOf(pig, world)) return true;
            if (roomId == SharedRoomOps.DormId)
            {
                return IsResident(pig, world) && world.RoomsUnlocked.Contains(SharedRoomOps.DormId);
            }
            return IsCommonRoomUsable(roomId, world);
        }

        /// <summary>Rooms a roaming pig may visit: its own room plus every unlocked common room. The dorm is only an own room.</summary>
        private List<string> VisitableRooms(PigProfile pig, string ownRoom, WorldState world)
        {
            var rooms = new List<string> { ownRoom };
            foreach (var room in PigRooms.CommonPlaces)
            {
                if (!rooms.Contains(room) && IsCommonRoomUsable(room, world)) rooms.Add(room);
            }
            return rooms;
        }

        private bool IsCommonRoomUsable(string roomId, WorldState world)
        {
            if (roomId == SharedRoomOps.DormId || roomId == SharedRoomOps.DormPlaceId) return false;
            return PigRooms.CommonPlaces.Contains(roomId) && world.RoomsUnlocked.Contains(roomId);
        }
    }
}
