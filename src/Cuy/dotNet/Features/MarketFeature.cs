using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class MarketFeature : HomeFeatureBase
    {
        public override string Id => "market";

        public override void Initialize(BrainController brain)
        {
            if (brain?.Pet?.Balance != null)
            {
                brain.Pet.Balance.MarketActive = true;
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Balance.MarketActive = true;
            var world = pet.EnsureWorld();
            var farmConfig = pet.FarmConfig;
            var marketConfig = pet.MarketConfig;
            var market = world.Market;
            string today = pet.Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            int capLeft = MarketPricing.CapLeft(market, marketConfig);
            int cap = marketConfig?.DailySalesCapClovers ?? 30;

            // 1. Sellable
            var sellableList = new List<object>();
            if (farmConfig?.Crops != null)
            {
                foreach (var crop in farmConfig.Crops)
                {
                    if (crop == null) continue;
                    string cropItemId = !string.IsNullOrEmpty(crop.ItemId) ? crop.ItemId : crop.Id;
                    var itemDef = ItemCatalogLoader.GetItem(crop.ItemId);
                    string name = itemDef?.Name ?? crop.Id;
                    int owned = pet.GetItemCount(cropItemId);

                    var quote = MarketPricing.Quote(market, marketConfig, crop, 1, today);
                    int unitNow = quote.TotalClovers;

                    double demand = 1.0;
                    if (market.Demand != null && !market.Demand.TryGetValue(crop.ItemId ?? crop.Id ?? string.Empty, out demand))
                    {
                        demand = 1.0;
                    }

                    sellableList.Add(new
                    {
                        itemId = cropItemId,
                        name = name,
                        owned = owned,
                        unitNow = unitNow,
                        demand = Math.Round(demand, 2)
                    });
                }
            }

            // 2. Buyable
            var buyableList = new List<object>();
            var seenBuyableIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (farmConfig?.Crops != null)
            {
                foreach (var crop in farmConfig.Crops)
                {
                    if (crop == null) continue;
                    string seedId = !string.IsNullOrEmpty(crop.SeedItemId) ? crop.SeedItemId : (crop.Kind == CropKind.Annual ? "seed_" + crop.Id : "sapling_" + crop.Id);
                    var sDef = ItemCatalogLoader.GetItem(seedId);
                    string seedName = sDef?.Name ?? (crop.Kind == CropKind.Annual ? $"{crop.Id} seed" : $"{crop.Id} sapling");
                    string cat = crop.Kind == CropKind.Annual ? "seed" : "sapling";

                    seenBuyableIds.Add(seedId);
                    buyableList.Add(new
                    {
                        itemId = seedId,
                        name = seedName,
                        category = cat,
                        price = crop.SeedPrice
                    });
                }
            }

            if (pet.WorldItemCatalog?.All != null)
            {
                foreach (var item in pet.WorldItemCatalog.All)
                {
                    if (item == null || item.Price <= 0 || item.IsFree || item.Free) continue;

                    seenBuyableIds.Add(item.Id);
                    buyableList.Add(new
                    {
                        itemId = item.Id,
                        name = item.Name,
                        category = "decor",
                        price = item.Price,
                        layer = item.Layer,
                        place = item.Place,
                        icon = item.Icon
                    });
                }
            }

            string todayCompact = pet.Clock.LocalNow().ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            foreach (var def in ItemCatalogLoader.GetAll())
            {
                if (def == null || string.IsNullOrEmpty(def.Id) || seenBuyableIds.Contains(def.Id)) continue;
                if (!def.Price.HasValue || def.Price.Value < 0 || def.IsUnlimited) continue;

                string cat = def.Category ?? "food";
                if (string.Equals(def.Id, "water_bottle", StringComparison.OrdinalIgnoreCase)) cat = "care";
                else if (cat == "vegetable" || cat == "treat" || cat == "chew_stick") cat = "food";
                else if (cat == "equipment") cat = "toy";
                else if (cat == "furniture") cat = "decor";
                else if (cat == "medicine" || cat == "vitamins") cat = "care";

                int owned = pet.GetItemCount(def.Id);
                int boughtToday = 0;
                pet.State.Stats.Counters.TryGetValue($"bought_{def.Id}_{todayCompact}", out boughtToday);

                seenBuyableIds.Add(def.Id);
                buyableList.Add(new
                {
                    itemId = def.Id,
                    name = def.Name,
                    category = cat,
                    price = def.Price.Value,
                    icon = def.IconName,
                    description = def.Description,
                    oneTime = def.OneTime,
                    dailyLimit = def.DailyLimit,
                    owned = owned,
                    boughtToday = boughtToday
                });
            }

            // 3. Specials & Orders
            var marketView = pet.GetMarketView();
            var specialsList = new List<object>();
            if (marketView?.Specials != null)
            {
                for (int i = 0; i < marketView.Specials.Count; i++)
                {
                    var s = marketView.Specials[i];
                    if (s == null) continue;

                    var wDef = pet.WorldItemCatalog?.Find(s.ItemId);
                    string sName = wDef?.Name;
                    if (string.IsNullOrEmpty(sName))
                    {
                        var it = ItemCatalogLoader.GetItem(s.ItemId);
                        sName = it?.Name ?? s.ItemId;
                    }

                    specialsList.Add(new
                    {
                        index = i,
                        itemId = s.ItemId,
                        name = sName,
                        price = s.DiscountedPrice,
                        was = s.OriginalPrice
                    });
                }
            }

            var ordersList = new List<object>();
            if (marketView?.Orders != null)
            {
                for (int i = 0; i < marketView.Orders.Count; i++)
                {
                    var o = marketView.Orders[i];
                    if (o == null) continue;

                    int reward = MarketStock.OrderReward(o, farmConfig, marketConfig);
                    ordersList.Add(new
                    {
                        index = i,
                        cropId = o.CropId,
                        count = o.Count,
                        reward = reward,
                        done = o.Done
                    });
                }
            }

            // 4. Stall
            int stallLevel = market.StallLevel;
            int nextCost = -1;
            if (marketConfig?.StallUpgrades != null && stallLevel < marketConfig.StallUpgrades.Count)
            {
                nextCost = marketConfig.StallUpgrades[stallLevel].Cost;
            }

            var stallObj = new
            {
                level = stallLevel,
                nextCost = nextCost
            };

            state["market"] = new
            {
                capLeft = capLeft,
                cap = cap,
                sellable = sellableList,
                buyable = buyableList,
                specials = specialsList,
                orders = ordersList,
                stall = stallObj,
                clovers = pet.Clovers
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "market_sell" && type != "market_buy" && type != "market_special" &&
                type != "market_order" && type != "market_stall" && type != "market_quote")
            {
                return false;
            }

            var pet = brain?.Pet;
            if (pet == null) return true;

            pet.Balance.MarketActive = true;

            if (type == "market_quote")
            {
                string itemId = message?.Value<string>("itemId");
                int count = message?.Value<int?>("count") ?? 1;
                if (!string.IsNullOrEmpty(itemId))
                {
                    var crop = pet.FarmConfig?.Crops?.FirstOrDefault(c =>
                        string.Equals(c.ItemId, itemId, StringComparison.Ordinal) ||
                        string.Equals(c.Id, itemId, StringComparison.Ordinal) ||
                        string.Equals(c.SeedItemId, itemId, StringComparison.Ordinal));

                    if (crop != null)
                    {
                        string today = pet.Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                        var quote = MarketPricing.Quote(pet.EnsureWorld().Market, pet.MarketConfig, crop, count, today);
                        HomeWindow.PostToPage(new
                        {
                            type = "market_quote_result",
                            itemId = itemId,
                            count = quote.Units,
                            total = quote.TotalClovers,
                            unitPrice = quote.Units > 0 ? quote.TotalClovers / quote.Units : 0
                        });
                    }
                }
                return true;
            }

            if (type == "market_sell")
            {
                string itemId = message?.Value<string>("itemId");
                int count = message?.Value<int?>("count") ?? 1;
                if (string.IsNullOrEmpty(itemId) || count <= 0) return true;

                var res = pet.Sell(itemId, count);
                if (res == SellResult.InvalidArgument)
                {
                    return true;
                }
                else if (res == SellResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Sold!" });
                }
                else if (res == SellResult.NoItems)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
                else if (res == SellResult.CapReached)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
                else if (res == SellResult.NotACrop || res == SellResult.Disabled)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "market_buy")
            {
                string itemId = message?.Value<string>("itemId");
                int count = message?.Value<int?>("count") ?? 1;
                if (string.IsNullOrEmpty(itemId) || count <= 0) return true;

                CuyItemDef shopDef = pet.WorldItemCatalog?.Find(itemId) == null ? ItemCatalogLoader.GetItem(itemId) : null;
                string shopCounterKey = null;
                if (shopDef != null)
                {
                    if (!shopDef.Price.HasValue || shopDef.Price.Value < 0 || shopDef.IsUnlimited)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Item not for sale" });
                        return true;
                    }
                    if (shopDef.OneTime && pet.GetItemCount(shopDef.Id) > 0)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Already owned" });
                        return true;
                    }
                    string todayCompact = pet.Clock.LocalNow().ToString("yyyyMMdd", CultureInfo.InvariantCulture);
                    shopCounterKey = $"bought_{shopDef.Id}_{todayCompact}";
                    if (shopDef.DailyLimit.HasValue)
                    {
                        int boughtToday = 0;
                        pet.State.Stats.Counters.TryGetValue(shopCounterKey, out boughtToday);
                        if (boughtToday + count > shopDef.DailyLimit.Value)
                        {
                            HomeWindow.PostToPage(new { type = "toast", text = "Daily limit reached" });
                            return true;
                        }
                    }
                }

                var res = pet.Buy(itemId, count);
                if (res == BuyResult.UnknownItem)
                {
                    return true;
                }
                else if (res == BuyResult.Ok)
                {
                    if (shopDef != null && !string.IsNullOrEmpty(shopCounterKey))
                    {
                        pet.Count(shopCounterKey, count);
                    }
                    HomeWindow.PostToPage(new { type = "toast", text = "Item bought!" });
                }
                else if (res == BuyResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == BuyResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "market_special")
            {
                int index = message?.Value<int?>("index") ?? -1;
                if (index < 0) return true;

                var res = pet.BuySpecial(index);
                if (res == BuyResult.UnknownItem)
                {
                    return true;
                }
                else if (res == BuyResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Special deal bought!" });
                }
                else if (res == BuyResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == BuyResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "market_order")
            {
                int index = message?.Value<int?>("index") ?? -1;
                if (index < 0) return true;

                bool ok = pet.FulfillOrder(index);
                if (ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Order fulfilled!" });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "market_stall")
            {
                bool ok = pet.BuyBigStall();
                if (ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Stall expanded!" });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] MarketFeature save: " + ex.Message); }
            HomeWindow.NotifyStateChanged();
            return true;
        }
    }
}
