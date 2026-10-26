using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json.Linq;
using Cuy.Core;
using Cuy.Core.Time;

namespace Cuy.Features
{
    public class ShopFeature : HomeFeatureBase
    {
        public override string Id => "shop";

        private void CleanOldPurchaseCounters(BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;
            var keysToRemove = new List<string>();
            string todayStr = pet.Clock.LocalNow().ToString("yyyyMMdd", CultureInfo.InvariantCulture);

            // Expected format: bought_<id>_<yyyyMMdd>
            foreach (var kvp in pet.State.Stats.Counters)
            {
                if (kvp.Key.StartsWith("bought_"))
                {
                    var parts = kvp.Key.Split('_');
                    if (parts.Length >= 3)
                    {
                        string dateStr = parts.Last();
                        if (DateTime.TryParseExact(dateStr, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime parsedDate))
                        {
                            if ((pet.Clock.LocalNow().Date - parsedDate.Date).TotalDays > 7)
                            {
                                keysToRemove.Add(kvp.Key);
                            }
                        }
                    }
                }
            }

            foreach (var k in keysToRemove)
            {
                pet.State.Stats.Counters.Remove(k);
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            CleanOldPurchaseCounters(brain);

            string todayStr = pet.Clock.LocalNow().ToString("yyyyMMdd", CultureInfo.InvariantCulture);

            var itemsObj = new List<object>();
            foreach (var def in ItemCatalogLoader.GetAll())
            {
                int owned = pet.GetItemCount(def.Id);
                int boughtToday = 0;
                pet.State.Stats.Counters.TryGetValue($"bought_{def.Id}_{todayStr}", out boughtToday);

                string cat = def.Category;
                if (cat == "vegetable" || cat == "treat" || cat == "chew_stick") cat = "food";
                else if (cat == "equipment") cat = "toy";
                else if (cat == "furniture") cat = "decor";
                else if (cat == "medicine" || cat == "vitamins") cat = "care";

                itemsObj.Add(new
                {
                    id = def.Id,
                    name = def.Name,
                    category = cat,
                    price = def.Price,
                    icon = def.IconName,
                    description = def.Description,
                    oneTime = def.OneTime,
                    dailyLimit = def.DailyLimit,
                    owned = owned,
                    boughtToday = boughtToday
                });
            }

            var shopObj = new
            {
                items = itemsObj,
                categories = new[] { "food", "toy", "decor", "care" }
            };

            state["shop"] = shopObj;
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "buy") return false;

            var pet = brain?.Pet;
            string itemId = message.Value<string>("itemId");

            if (pet == null || string.IsNullOrEmpty(itemId)) return true; // handled, but failed

            CuyItemDef def = ItemCatalogLoader.GetItem(itemId);
            if (def == null)
            {
                HomeWindow.PostToPage(new { type = "toast", text = "Unknown item" });
                return true;
            }

            if (!def.Price.HasValue || def.Price.Value <= 0 || def.IsUnlimited)
            {
                HomeWindow.PostToPage(new { type = "toast", text = "Item not for sale" });
                return true;
            }

            if (def.OneTime && pet.GetItemCount(def.Id) > 0)
            {
                HomeWindow.PostToPage(new { type = "toast", text = "Already owned" });
                return true;
            }

            string todayStr = pet.Clock.LocalNow().ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            string counterKey = $"bought_{def.Id}_{todayStr}";

            int boughtToday = 0;
            pet.State.Stats.Counters.TryGetValue(counterKey, out boughtToday);

            if (def.DailyLimit.HasValue && boughtToday >= def.DailyLimit.Value)
            {
                HomeWindow.PostToPage(new { type = "toast", text = "Daily limit reached" });
                return true;
            }

            int price = def.Price.Value;
            if (pet.TryPay(price, "shop"))
            {
                pet.AddItem(def.Id, 1);
                pet.Count("purchases");
                pet.Count(counterKey); // increment daily purchase counter

                brain.Session.AutoSaver.SaveNow();

                HomeWindow.PostToPage(new { type = "toast", text = $"Bought {def.Name}!" });
                BrainController.Log($"[ShopFeature] Bought {def.Id} for {price} clovers.");
            }
            else
            {
                HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                BrainController.Log($"[ShopFeature] Not enough clovers for {def.Id}.");
            }

            return true;
        }
    }
}