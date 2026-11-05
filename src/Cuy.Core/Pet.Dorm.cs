using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.World;

namespace Cuy.Core
{
    public enum MoveResult
    {
        Ok,
        Disabled,
        Locked,
        NeedTwo,
        TooMany,
        AlreadyShared,
        Unknown
    }

    public sealed partial class Pet
    {
        private bool DormEnabled => Balance != null && Balance.DormActive && Balance.PigRoomsActive;

        /// <summary>Unlocks the shared bedroom for clovers. Needs non-memorial pigs (config RequiresPigs).</summary>
        public WorldResult UnlockDorm()
        {
            if (!DormEnabled) return WorldResult.Disabled;

            var world = EnsureWorld();
            var dorm = PigRooms.Dorm;
            if (world.RoomsUnlocked.Contains(SharedRoomOps.DormId)) return WorldResult.Locked;

            int nonMemorial = State.Roster == null ? 0 : State.Roster.Count(p => p != null && !p.Memorial);
            if (nonMemorial < dorm.RequiresPigs) return WorldResult.Locked;

            if (dorm.UnlockCost > 0 && !TrySpendClovers(dorm.UnlockCost)) return WorldResult.NotEnoughClovers;

            world.RoomsUnlocked.Add(SharedRoomOps.DormId);
            world.PlaceLevels[SharedRoomOps.DormId] = 1;
            Count("dorm_unlocked");

            Raise(PlaceUnlocked, new PlaceUnlockedEventArgs(SharedRoomOps.DormId));
            return WorldResult.Ok;
        }

        /// <summary>Raises the shared bedroom one level. The cost of the next level comes from the config.</summary>
        public WorldResult UpgradeDorm()
        {
            if (!DormEnabled) return WorldResult.Disabled;

            var world = EnsureWorld();
            if (!world.RoomsUnlocked.Contains(SharedRoomOps.DormId)) return WorldResult.Locked;

            var levels = PigRooms.Dorm.Levels;
            int level = SharedRoomOps.DormLevel(world);
            if (level >= levels.Count) return WorldResult.MaxLevel;

            int cost = levels[level].Cost;
            if (cost > 0 && !TrySpendClovers(cost)) return WorldResult.NotEnoughClovers;

            world.PlaceLevels[SharedRoomOps.DormId] = level + 1;
            Raise(PlaceUpgraded, new PlaceUpgradedEventArgs(SharedRoomOps.DormId, level + 1));
            return WorldResult.Ok;
        }

        /// <summary>Moves roster pigs into the shared bedroom.</summary>
        public MoveResult MoveIn(IReadOnlyList<string> pigIds)
        {
            if (!DormEnabled) return MoveResult.Disabled;

            var world = EnsureWorld();
            if (!world.RoomsUnlocked.Contains(SharedRoomOps.DormId)) return MoveResult.Locked;
            if (pigIds == null) return MoveResult.Unknown;

            var keys = new List<string>();
            var names = new List<string>();
            foreach (var id in pigIds)
            {
                var pig = FindRosterPig(id);
                if (pig == null) return MoveResult.Unknown;
                keys.Add(PigKey(pig));
                names.Add(pig.Name);
            }

            var result = SharedRoomOps.MoveIn(world, keys, PigRooms, WorldItemCatalog, NewDormUid);
            switch (result.Status)
            {
                case MoveInStatus.AlreadyShared:
                    return MoveResult.AlreadyShared;
                case MoveInStatus.NeedTwo:
                    return MoveResult.NeedTwo;
                case MoveInStatus.TooMany:
                    return MoveResult.TooMany;
            }

            AddDiaryEntry($"{string.Join(" and ", names)} moved into the shared bedroom.");
            return MoveResult.Ok;
        }

        /// <summary>Moves a resident back to its own room. Returns false when the pig is not a resident.</summary>
        public bool MoveOut(string pigId)
        {
            if (!DormEnabled) return false;

            var pig = FindRosterPig(pigId);
            string key = pig != null ? PigKey(pig) : pigId;
            var world = EnsureWorld();
            if (!SharedRoomOps.MoveOut(world, key, PigRooms)) return false;

            AddDiaryEntry($"{(pig != null ? pig.Name : key)} moved back to its own room.");
            return true;
        }

        /// <summary>Extra bond gain of a resident that has a non-memorial roommate in the shared bedroom.</summary>
        public double DormBondBonus(string pigId)
        {
            if (!DormEnabled) return 0;

            var world = EnsureWorld();
            var pig = FindRosterPig(pigId);
            string key = pig != null ? PigKey(pig) : pigId;
            if (!world.RoomShare.TryGetValue(key, out string share) || share != SharedRoomOps.DormId) return 0;

            bool hasNonMemorialRoommate = SharedRoomOps.Residents(world)
                .Any(other => other != key && !IsMemorialPig(other));
            return hasNonMemorialRoommate ? PigRooms.Dorm.BondGainBonus : 0;
        }

        /// <summary>Largest <see cref="DormBondBonus"/> of the roster; bond points are shared, so one resident is enough.</summary>
        private double BestDormBondBonus()
        {
            if (!DormEnabled || State.Roster == null) return 0;

            double best = 0;
            foreach (var pig in State.Roster)
            {
                if (pig == null) continue;
                // Same key as the dorm UI: the named id when the pig has one, else its own id.
                string pigId = string.IsNullOrEmpty(pig.NamedId) ? pig.Id : pig.NamedId;
                best = Math.Max(best, DormBondBonus(pigId));
            }
            return best;
        }

        private bool IsMemorialPig(string pigId)
        {
            var pig = FindRosterPig(pigId);
            return pig != null && pig.Memorial;
        }

        private static string NewDormUid() => Guid.NewGuid().ToString("N");
    }
}
