using System;
using System.Collections.Generic;
using System.Globalization;

namespace Cuy.Core.World
{
    /// <summary>Where a pig is now and what it does.</summary>
    public sealed class WanderResult
    {
        public string RoomId { get; set; }
        public string Activity { get; set; }

        /// <summary>Index of the slot inside the local day (minutes since midnight / slot length).</summary>
        public int SlotIndex { get; set; }
    }

    /// <summary>
    /// Pure, deterministic schedule (docs/PIG_ROOMS.md section 7). Nothing is saved: the result depends only on
    /// the pig id, the local time, the visitable rooms and <see cref="HomeEconomyConfig"/> (roam settings).
    /// </summary>
    public static class PigWander
    {
        public const string ActivitySleep = "sleep";
        public const string ActivityEat = "eat";
        public const string ActivityPlay = "play";
        public const string ActivityRest = "rest";
        public const string ActivityExplore = "explore";

        /// <summary>Room ids the schedule weighs by activity (the living room and the playroom).</summary>
        public const string LivingRoomId = "salon";
        public const string PlayroomId = "playroom";

        /// <summary>Hours after the night ends that count as morning, and hours before the night starts that count as evening.</summary>
        private const int MorningHours = 4;
        private const int EveningHours = 4;

        private const int LivingRoomWeight = 3;
        private const int PlayroomWeight = 3;
        private const int OtherRoomWeight = 1;

        /// <summary>True between the night start hour (inclusive) and the night end hour (exclusive), wrapping midnight.</summary>
        public static bool IsNight(DateTime localNow, HomeEconomyConfig cfg)
        {
            int from = cfg.RoamNightFromHour;
            int to = cfg.RoamNightToHour;
            int hour = localNow.Hour;
            if (from == to) return false;
            if (from > to) return hour >= from || hour < to;
            return hour >= from && hour < to;
        }

        /// <summary>
        /// Room and activity of a pig at <paramref name="localNow"/>. A pig tied to a room (Mode room) always returns that room.
        /// Roaming pigs sleep in their own room at night, and otherwise pick a visitable room per slot.
        /// </summary>
        public static WanderResult Where(string pigId, PigHomeState home, string ownRoomId, IReadOnlyList<string> visitableRooms, DateTime localNow, HomeEconomyConfig cfg)
        {
            int slot = SlotOf(localNow, cfg);

            if (home != null && home.Mode == PigHomeState.ModeRoom && !string.IsNullOrEmpty(home.Room))
            {
                return new WanderResult { RoomId = home.Room, Activity = TiedActivity(localNow, cfg), SlotIndex = slot };
            }

            if (IsNight(localNow, cfg))
            {
                return new WanderResult { RoomId = ownRoomId, Activity = ActivitySleep, SlotIndex = slot };
            }

            if (visitableRooms == null || visitableRooms.Count == 0)
            {
                return new WanderResult { RoomId = ownRoomId, Activity = ActivityRest, SlotIndex = slot };
            }

            string date = localNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            uint roomRoll = Hash(pigId, date, slot, "room");
            uint activityRoll = Hash(pigId, date, slot, "activity");

            string room = IsMorningOrEvening(localNow, cfg)
                ? PickWeighted(visitableRooms, roomRoll)
                : visitableRooms[(int)(roomRoll % (uint)visitableRooms.Count)];

            return new WanderResult { RoomId = room, Activity = ActivityFor(room, ownRoomId, activityRoll), SlotIndex = slot };
        }

        private static int SlotOf(DateTime localNow, HomeEconomyConfig cfg)
        {
            int slotMinutes = Math.Max(1, cfg.RoamSlotMinutes);
            return (int)localNow.TimeOfDay.TotalMinutes / slotMinutes;
        }

        private static bool IsMorningOrEvening(DateTime localNow, HomeEconomyConfig cfg)
        {
            int hour = localNow.Hour;
            int morningStart = Mod24(cfg.RoamNightToHour);
            int eveningStart = Mod24(cfg.RoamNightFromHour - EveningHours);
            return Mod24(hour - morningStart) < MorningHours || Mod24(hour - eveningStart) < EveningHours;
        }

        /// <summary>Tied pigs take their activity from the time of day only.</summary>
        private static string TiedActivity(DateTime localNow, HomeEconomyConfig cfg)
        {
            if (IsNight(localNow, cfg)) return ActivitySleep;
            if (IsMorningOrEvening(localNow, cfg)) return ActivityEat;
            return ActivityPlay;
        }

        private static string ActivityFor(string room, string ownRoomId, uint activityRoll)
        {
            if (room == ownRoomId) return ActivityRest;
            if (room == LivingRoomId) return ActivityEat;
            if (room == PlayroomId) return ActivityPlay;
            return activityRoll % 2 == 0 ? ActivityExplore : ActivityRest;
        }

        private static string PickWeighted(IReadOnlyList<string> rooms, uint roll)
        {
            int total = 0;
            foreach (var room in rooms) total += WeightOf(room);

            int pick = (int)(roll % (uint)total);
            foreach (var room in rooms)
            {
                pick -= WeightOf(room);
                if (pick < 0) return room;
            }
            return rooms[rooms.Count - 1];
        }

        private static int WeightOf(string room)
        {
            if (room == LivingRoomId) return LivingRoomWeight;
            if (room == PlayroomId) return PlayroomWeight;
            return OtherRoomWeight;
        }

        private static int Mod24(int value)
        {
            return ((value % 24) + 24) % 24;
        }

        /// <summary>FNV-1a over (pig id, date, slot, salt) with a final mix. Unlike string.GetHashCode it is stable between runs.</summary>
        private static uint Hash(string pigId, string date, int slot, string salt)
        {
            string text = (pigId ?? string.Empty) + "|" + date + "|" + slot.ToString(CultureInfo.InvariantCulture) + "|" + salt;
            uint h = 2166136261;
            foreach (char c in text)
            {
                h ^= c;
                h *= 16777619;
            }
            h ^= h >> 16;
            h *= 0x85ebca6b;
            h ^= h >> 13;
            return h;
        }
    }
}
