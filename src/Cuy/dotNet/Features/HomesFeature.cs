using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Input.Validation;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    /// <summary>Home page: where the pigs are now and their home mode (roam or one room). Behind Balance.HomesActive.</summary>
    public class HomesFeature : HomeFeatureBase
    {
        /// <summary>The schedule changes by slot, so the open Home page refreshes at most this often.</summary>
        private static readonly TimeSpan PublishInterval = TimeSpan.FromSeconds(20);

        private DateTime _lastPublishUtc = DateTime.MinValue;

        public override string Id => "homes";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            var world = pet.EnsureWorld();
            string defaultMode = pet.HomeEconomy.RoamDefaultMode;

            var pigs = new List<object>();
            foreach (var pig in pet.State.Roster.Where(p => p != null))
            {
                var home = world.HomeOf(pig.Id, defaultMode);
                var where = pet.LocationOf(pig.Id);
                pigs.Add(new
                {
                    pigId = pig.Id,
                    name = pig.Name,
                    mode = home.Mode,
                    room = home.Mode == PigHomeState.ModeRoom ? home.Room : null,
                    location = where?.RoomId,
                    activity = where?.Activity,
                    memorial = pig.Memorial,
                    portrait = string.IsNullOrEmpty(pig.NamedId) ? null : "sprites/portraits/" + pig.NamedId + ".png"
                });
            }

            var rooms = new List<object>();
            foreach (var roomId in TieableRoomIds(pet, world))
            {
                rooms.Add(new { id = roomId, name = RoomName(pet, roomId) });
            }

            state["homes"] = new { pigs, rooms };
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            if (!HomeWindow.IsOpen) return;

            var pet = brain?.Pet;
            DateTime now = pet?.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;
            if (now - _lastPublishUtc < PublishInterval) return;

            _lastPublishUtc = now;
            HomeWindow.NotifyStateChanged();
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "pig_home") return false;

            var pet = brain?.Pet;
            if (pet == null) return true;
            if (HomesMessages.ValidatePigHome(message) != null) return true;

            string pigId = message["pigId"]?.ToString();
            string mode = message["mode"]?.ToString();
            string room = message["room"]?.ToString();

            if (pet.State.Roster == null || !pet.State.Roster.Any(p => p != null && p.Id == pigId)) return true;

            if (!pet.SetHome(pigId, mode, room))
            {
                HomeWindow.PostToPage(new { type = "toast", text = "That room is not available" });
                return true;
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] HomesFeature save: " + ex.Message); }
            HomeWindow.NotifyStateChanged();
            return true;
        }

        /// <summary>Common rooms that are unlocked, plus the dorm when it is unlocked: the rooms a pig can be tied to.</summary>
        private static List<string> TieableRoomIds(Pet pet, WorldState world)
        {
            var ids = new List<string>();
            foreach (var roomId in pet.PigRooms.CommonPlaces)
            {
                if (roomId == SharedRoomOps.DormId || roomId == SharedRoomOps.DormPlaceId) continue;
                if (world.RoomsUnlocked.Contains(roomId)) ids.Add(roomId);
            }
            if (world.RoomsUnlocked.Contains(SharedRoomOps.DormId)) ids.Add(SharedRoomOps.DormId);
            return ids;
        }

        private static string RoomName(Pet pet, string roomId)
        {
            var place = pet.PlaceCatalog?.Places?.FirstOrDefault(p => p.Id == roomId);
            return string.IsNullOrEmpty(place?.Name) ? roomId : place.Name;
        }
    }
}
