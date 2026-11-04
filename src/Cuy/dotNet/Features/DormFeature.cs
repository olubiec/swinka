using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    /// <summary>Shared bedroom ("dorm"): state and messages for the Home page (behind Balance.DormActive).</summary>
    public class DormFeature : HomeFeatureBase
    {
        public override string Id => "dorm";

        public override void Initialize(BrainController brain)
        {
            if (brain?.Pet?.Balance != null)
            {
                brain.Pet.Balance.PigRoomsActive = true;
                brain.Pet.Balance.DormActive = true;
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Balance.PigRoomsActive = true;
            pet.Balance.DormActive = true;
            var world = pet.EnsureWorld();
            var dorm = pet.PigRooms?.Dorm;
            var levels = dorm?.Levels;

            bool unlocked = world.RoomsUnlocked.Contains(SharedRoomOps.DormId);
            int level = Math.Max(SharedRoomOps.DormLevel(world), 1);
            int maxLevel = levels != null && levels.Count > 0 ? levels.Count : 1;
            int nextLevelCost = levels != null && level < levels.Count ? levels[level].Cost : 0;
            var grid = levels != null && levels.Count > 0 ? levels[Math.Min(level, levels.Count) - 1] : null;

            var residents = SharedRoomOps.Residents(world);
            var residentSet = new HashSet<string>(residents, StringComparer.OrdinalIgnoreCase);
            var candidates = new List<object>();
            var residentIds = new List<string>();
            double bondBonus = 0;

            if (pet.State.Roster != null)
            {
                foreach (var pig in pet.State.Roster)
                {
                    if (pig == null) continue;
                    // A pig is keyed by its named id when it has one, by its own id otherwise (see Pet.PigRooms).
                    string pigId = string.IsNullOrEmpty(pig.NamedId) ? pig.Id : pig.NamedId;
                    bool resident = residentSet.Contains(pigId) || residentSet.Contains(pig.Id);
                    if (resident) residentIds.Add(pigId);

                    candidates.Add(new
                    {
                        pigId = pigId,
                        name = pig.Name,
                        portrait = pig.Breed,
                        memorial = pig.Memorial,
                        resident = resident
                    });

                    bondBonus = Math.Max(bondBonus, pet.DormBondBonus(pigId));
                }
            }

            state["dorm"] = new
            {
                unlocked = unlocked,
                unlockCost = dorm?.UnlockCost ?? 0,
                requiresPigs = dorm?.RequiresPigs ?? 0,
                level = level,
                maxLevel = maxLevel,
                nextLevelCost = nextLevelCost,
                cols = grid?.Cols ?? 0,
                rows = grid?.Rows ?? 0,
                maxResidents = dorm?.MaxResidents ?? 0,
                residents = residentIds,
                candidates = candidates,
                bondBonus = bondBonus
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "dorm_unlock" && type != "dorm_upgrade" && type != "dorm_move_in" && type != "dorm_move_out")
            {
                return false;
            }

            var pet = brain?.Pet;
            if (pet == null) return true;

            pet.Balance.PigRoomsActive = true;
            pet.Balance.DormActive = true;

            if (type == "dorm_unlock")
            {
                var res = pet.UnlockDorm();
                if (res == WorldResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == WorldResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "You need two pigs first" });
                }
            }
            else if (type == "dorm_upgrade")
            {
                var res = pet.UpgradeDorm();
                if (res == WorldResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
            }
            else if (type == "dorm_move_in")
            {
                var ids = message?["pigIds"]?.ToObject<List<string>>();
                if (ids == null || ids.Count == 0) return true;

                var res = pet.MoveIn(ids);
                if (res == MoveResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Welcome home" });
                }
                else if (res == MoveResult.NeedTwo)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "You need two pigs first" });
                }
            }
            else if (type == "dorm_move_out")
            {
                string pigId = message?.Value<string>("pigId");
                if (string.IsNullOrEmpty(pigId)) return true;

                pet.MoveOut(pigId);
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] DormFeature save: " + ex.Message); }
            return true;
        }
    }
}
