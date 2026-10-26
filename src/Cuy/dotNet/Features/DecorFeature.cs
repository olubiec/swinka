using System.Collections.Generic;
using Cuy.Core;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class DecorFeature : HomeFeatureBase
    {
        public override string Id => "decor";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var decorState = brain.Session.Pet.State.Decor;

            var equippedDict = new Dictionary<string, string>
            {
                { "wallpaper", decorState.Equipped.ContainsKey("wallpaper") ? decorState.Equipped["wallpaper"] : null },
                { "floor", decorState.Equipped.ContainsKey("floor") ? decorState.Equipped["floor"] : null },
                { "rug", decorState.Equipped.ContainsKey("rug") ? decorState.Equipped["rug"] : null },
                { "plant", decorState.Equipped.ContainsKey("plant") ? decorState.Equipped["plant"] : null },
                { "picture", decorState.Equipped.ContainsKey("picture") ? decorState.Equipped["picture"] : null },
                { "lamp", decorState.Equipped.ContainsKey("lamp") ? decorState.Equipped["lamp"] : null }
            };

            state["decor"] = new
            {
                equipped = equippedDict
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type == "decor_equip")
            {
                string slot = message["slot"]?.ToString();
                string itemId = message["itemId"]?.ToString();

                if (string.IsNullOrEmpty(slot))
                    return true;

                if (string.IsNullOrEmpty(itemId))
                {
                    brain.Session.Pet.State.UnequipDecor(slot);
                    brain.Session.AutoSaver.SaveNow();
                    HomeWindow.NotifyStateChanged();
                    return true;
                }

                if (!brain.Session.Pet.State.Inventory.ContainsKey(itemId) || brain.Session.Pet.State.Inventory[itemId] <= 0)
                {
                    return true;
                }

                var def = ItemCatalog.Default.GetItem(itemId);
                if (def == null || def.Category != "decor")
                {
                    return true;
                }

                // Check slot heuristic or exact match from UI request
                // We know IDs are like wallpaper_mint, rug_heart, etc.
                if (!itemId.StartsWith(slot + "_") && !itemId.StartsWith(slot))
                {
                    return true; // prevent equipping plant in wallpaper slot
                }

                brain.Session.Pet.State.EquipDecor(slot, itemId);
                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();

                return true;
            }

            return false;
        }
    }
}
