using System;
using System.Collections.Generic;
using System.Globalization;
using Cuy.Core;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class ToysFeature : HomeFeatureBase
    {
        public override string Id { get { return "toys"; } }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null) return;
            var toysState = new Dictionary<string, object>();

            AddToyState(toysState, pet, "ball", "ball_play");
            AddToyState(toysState, pet, "tunnel", "tunnel");
            AddToyState(toysState, pet, "hay_ball", "hay_ball_play");
            AddToyState(toysState, pet, "house", "sleep_house"); // House uses rest, no cooldown typically, but need to check

            state[Id] = toysState;
        }

        private void AddToyState(IDictionary<string, object> toysState, Pet pet, string itemId, string actionId)
        {
            bool owned = pet.State.Inventory != null && pet.State.Inventory.ContainsKey(itemId) && pet.State.Inventory[itemId] > 0;

            double readyIn = 0;
            if (owned)
            {
                var action = BrainController.Instance?.Brain?.Config?.Actions?.Find(a => a.Id == actionId);
                if (action != null && action.CooldownSeconds.HasValue && action.CooldownSeconds.Value > 0)
                {
                    double cooldown = action.CooldownSeconds.Value;

                    int lastUnix;
                    if (pet.State.Stats.Counters.TryGetValue("toy_last_" + itemId, out lastUnix))
                    {
                        double elapsed = (pet.Clock.UtcNow - DateTimeOffset.FromUnixTimeSeconds(lastUnix).UtcDateTime).TotalSeconds;
                        if (elapsed < cooldown)
                        {
                            readyIn = Math.Ceiling(cooldown - elapsed);
                        }
                    }
                }
            }

            var itemState = new Dictionary<string, object>();
            itemState["owned"] = owned;
            itemState["readyIn"] = readyIn;

            toysState[itemId] = itemState;
        }

        public override bool HandleMessage(string type, JObject payload, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null) return false;
            if (type == "play_toy")
            {
                string itemId = payload["item"]?.ToString();
                if (string.IsNullOrEmpty(itemId)) return true;

                string actionId = null;
                if (itemId == "ball") actionId = "ball_play";
                else if (itemId == "tunnel") actionId = "tunnel";
                else if (itemId == "hay_ball") actionId = "hay_ball_play";
                else if (itemId == "house") actionId = "rest";

                if (actionId == null) return true;

                var action = BrainController.Instance?.Brain?.Config?.Actions?.Find(a => a.Id == actionId);
                if (action == null) return true;

                // Check cooldown
                if (action.CooldownSeconds.HasValue && action.CooldownSeconds.Value > 0)
                {
                    double cooldown = action.CooldownSeconds.Value;
                    int lastUnix;
                    if (pet.State.Stats.Counters.TryGetValue("toy_last_" + itemId, out lastUnix))
                    {
                        double elapsed = (pet.Clock.UtcNow - DateTimeOffset.FromUnixTimeSeconds(lastUnix).UtcDateTime).TotalSeconds;
                        if (elapsed < cooldown)
                        {
                            int minutes = (int)Math.Ceiling((cooldown - elapsed) / 60.0);

                            string name = itemId;
                            var itemDef = ItemCatalogLoader.GetItem(itemId);
                            if (itemDef != null && !string.IsNullOrEmpty(itemDef.Name)) name = itemDef.Name;

                            HomeWindow.PostToPage(new { type = "toast", text = $"{name} needs a break ({minutes} min)" });
                            return true; // on cooldown
                        }
                    }
                }

                // Apply effects directly
                if (action.Effects != null)
                {
                    foreach (var effect in action.Effects)
                    {
                        string needStr = effect.Key;
                        double val = effect.Value;
                        Need n;
                        if (Enum.TryParse<Need>(needStr, true, out n))
                        {
                            pet.ChangeNeed(n, val);
                        }
                        else if (string.Equals(needStr, "fullness", StringComparison.OrdinalIgnoreCase))
                        {
                            pet.ChangeNeed(Need.Satiety, val);
                        }
                    }
                }

                // Update cooldown and counter
                pet.State.Stats.Counters["toy_last_" + itemId] = (int)new DateTimeOffset(pet.Clock.UtcNow).ToUnixTimeSeconds();
                pet.Count("played_" + itemId);

                // Mark animation as seen
                if (!string.IsNullOrEmpty(action.Animation))
                {
                    pet.MarkSeen(action.Animation);
                }
                if (itemId == "house") pet.MarkSeen("house_enter");
                else if (itemId == "tunnel") pet.MarkSeen("tunnel_in");
                else if (itemId == "ball" || itemId == "hay_ball") pet.MarkSeen("ball_push");

                BrainController.Instance?.Session?.AutoSaver?.SaveNow();
                HomeWindow.NotifyStateChanged();
                return true;
            }
            return false;
        }
    }
}
