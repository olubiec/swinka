using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Cuy.Core.Time;
using Cuy.Core.World;

namespace Cuy.Core
{
    public enum SellResult
    {
        Ok,
        NoItems,
        NotACrop,
        CapReached,
        Disabled,
        InvalidArgument
    }

    public sealed class CropQuoteView
    {
        public string ItemId { get; set; }
        public string CropId { get; set; }
        public int Count { get; set; }
        public int OwnedCount => Count;
        public int UnitPrice { get; set; }
        public int TotalPrice { get; set; }
        public double Demand { get; set; }
    }

    public sealed class MarketView
    {
        public int CapLeft { get; set; }
        public int StallLevel { get; set; }
        public int BigStallLevel => StallLevel;
        public IReadOnlyList<CropQuoteView> Quotes { get; set; }
        public IReadOnlyList<SpecialOffer> Specials { get; set; }
        public IReadOnlyList<OrderState> Orders { get; set; }
        public IReadOnlyDictionary<string, double> Demand { get; set; }
    }

    public sealed partial class Pet
    {
        public SellResult Sell(string itemId, int count)
        {
            if (!Balance.MarketActive) return SellResult.Disabled;
            if (string.IsNullOrEmpty(itemId) || count <= 0) return SellResult.InvalidArgument;

            CheckEconomyDay();
            EnsureWorld();

            int owned = GetItemCount(itemId);
            if (owned <= 0)
            {
                var altCrop = FarmConfig?.Crops?.FirstOrDefault(c => string.Equals(c.Id, itemId, StringComparison.Ordinal));
                if (altCrop != null && !string.IsNullOrEmpty(altCrop.ItemId))
                {
                    owned = GetItemCount(altCrop.ItemId);
                    if (owned > 0) itemId = altCrop.ItemId;
                }
            }
            if (owned <= 0) return SellResult.NoItems;

            int toSell = Math.Min(count, owned);

            var crop = FarmConfig?.Crops?.FirstOrDefault(c =>
                string.Equals(c.ItemId, itemId, StringComparison.Ordinal) ||
                string.Equals(c.Id, itemId, StringComparison.Ordinal));
            if (crop == null) return SellResult.NotACrop;

            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var quote = MarketPricing.Sell(State.World.Market, MarketConfig, crop, toSell, today);

            if (quote.Units <= 0) return SellResult.CapReached;

            TryRemoveItem(itemId, quote.Units);
            AddClovers(quote.TotalClovers);
            Count("units_sold", quote.Units);
            return SellResult.Ok;
        }

        public BuyResult Buy(string itemId, int count)
        {
            if (!Balance.MarketActive) return BuyResult.Disabled;
            if (string.IsNullOrEmpty(itemId) || count <= 0) return BuyResult.UnknownItem;

            CheckEconomyDay();
            EnsureWorld();

            // 1. Placeable item from WorldItemCatalog (delegates to BuyItem)
            var placeable = WorldItemCatalog?.Find(itemId);
            if (placeable != null)
            {
                for (int i = 0; i < count; i++)
                {
                    var res = BuyItem(itemId);
                    if (res != BuyResult.Ok) return res;
                }
                return BuyResult.Ok;
            }

            // 2. Farm crop seed or sapling
            var crop = FarmConfig?.Crops?.FirstOrDefault(c =>
                string.Equals(c.SeedItemId, itemId, StringComparison.Ordinal));
            if (crop != null)
            {
                int unitPrice = crop.SeedPrice;
                int totalCost = unitPrice * count;
                if (!TrySpendClovers(totalCost)) return BuyResult.NotEnoughClovers;

                string seedId = crop.SeedItemId;
                AddItem(seedId, count);
                Count("bought_seeds", count);
                Count("spent_market", totalCost);
                return BuyResult.Ok;
            }

            // 3. Food / general item from ItemCatalog
            var itemDef = ItemCatalog.Default?.GetItem(itemId);
            if (itemDef != null)
            {
                int totalCost = (itemDef.Price ?? 0) * count;
                if (!TrySpendClovers(totalCost)) return BuyResult.NotEnoughClovers;
                AddItem(itemId, count);
                Count("spent_market", totalCost);
                return BuyResult.Ok;
            }

            return BuyResult.UnknownItem;
        }

        public BuyResult BuySpecial(int index)
        {
            if (!Balance.MarketActive) return BuyResult.Disabled;
            if (index < 0) return BuyResult.UnknownItem;

            CheckEconomyDay();
            EnsureWorld();

            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var specials = MarketStock.Specials(
                today,
                MarketConfig,
                State.World.Market.StallLevel,
                WorldItemCatalog,
                FarmConfig,
                ItemCatalog.Default);

            if (specials == null || index >= specials.Count) return BuyResult.UnknownItem;

            var offer = specials[index];
            int price = offer.DiscountedPrice;
            if (!TrySpendClovers(price)) return BuyResult.NotEnoughClovers;

            var placeable = WorldItemCatalog?.Find(offer.ItemId);
            if (placeable != null)
            {
                var w = EnsureWorld();
                w.OwnedItems[offer.ItemId] = (w.OwnedItems.TryGetValue(offer.ItemId, out int cur) ? cur : 0) + 1;
            }
            else
            {
                AddItem(offer.ItemId, 1);
            }

            Count("spent_market", price);
            Count("bought_specials", 1);
            return BuyResult.Ok;
        }

        public bool FulfillOrder(int index)
        {
            if (!Balance.MarketActive) return false;
            if (index < 0) return false;

            CheckEconomyDay();
            EnsureWorld();

            var orders = GetOrCreateOrders();
            if (orders == null || index >= orders.Count) return false;

            var order = orders[index];
            if (order.Done) return false;

            var crop = FarmConfig?.Crops?.FirstOrDefault(c =>
                string.Equals(c.Id, order.CropId, StringComparison.Ordinal) ||
                string.Equals(c.ItemId, order.CropId, StringComparison.Ordinal));

            string cropItemId = crop != null && !string.IsNullOrEmpty(crop.ItemId) ? crop.ItemId : order.CropId;
            int have = GetItemCount(cropItemId);
            string useItemId = cropItemId;
            if (have < order.Count && cropItemId != order.CropId)
            {
                int haveAlt = GetItemCount(order.CropId);
                if (haveAlt >= order.Count)
                {
                    have = haveAlt;
                    useItemId = order.CropId;
                }
            }

            if (have < order.Count) return false;

            int reward = MarketStock.OrderReward(order, FarmConfig, MarketConfig);

            int payout = reward;
            if (MarketConfig != null && MarketConfig.OrdersCountTowardCap)
            {
                int capLeft = MarketPricing.CapLeft(State.World.Market, MarketConfig);
                payout = Math.Min(reward, capLeft);
                State.World.Market.SalesToday += payout;
            }

            if (!TryRemoveItem(useItemId, order.Count)) return false;

            if (payout > 0)
            {
                AddClovers(payout);
            }

            order.Done = true;
            Count("orders_fulfilled", 1);
            Count("units_sold", order.Count);
            return true;
        }

        public MarketView GetMarketView()
        {
            if (!Balance.MarketActive) return null;

            CheckEconomyDay();
            EnsureWorld();

            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            int capLeft = MarketPricing.CapLeft(State.World.Market, MarketConfig);
            int stallLevel = State.World.Market.StallLevel;

            var specials = MarketStock.Specials(
                today,
                MarketConfig,
                stallLevel,
                WorldItemCatalog,
                FarmConfig,
                ItemCatalog.Default);

            var orders = GetOrCreateOrders();

            var quotes = new List<CropQuoteView>();
            if (State.Inventory != null && FarmConfig?.Crops != null)
            {
                foreach (var kv in State.Inventory)
                {
                    if (kv.Value <= 0) continue;
                    var crop = FarmConfig.Crops.FirstOrDefault(c =>
                        string.Equals(c.ItemId, kv.Key, StringComparison.Ordinal) ||
                        string.Equals(c.Id, kv.Key, StringComparison.Ordinal));
                    if (crop != null)
                    {
                        var unitQuote = MarketPricing.Quote(State.World.Market, MarketConfig, crop, 1, today);
                        var totalQuote = MarketPricing.Quote(State.World.Market, MarketConfig, crop, kv.Value, today);
                        double demand = 1.0;
                        if (State.World.Market.Demand != null)
                        {
                            string idKey = crop.ItemId ?? crop.Id ?? "";
                            if (!State.World.Market.Demand.TryGetValue(idKey, out demand))
                                demand = 1.0;
                        }
                        quotes.Add(new CropQuoteView
                        {
                            ItemId = kv.Key,
                            CropId = crop.Id,
                            Count = kv.Value,
                            UnitPrice = unitQuote.TotalClovers,
                            TotalPrice = totalQuote.TotalClovers,
                            Demand = demand
                        });
                    }
                }
            }

            return new MarketView
            {
                CapLeft = capLeft,
                StallLevel = stallLevel,
                Quotes = quotes,
                Specials = specials,
                Orders = orders,
                Demand = State.World.Market.Demand
            };
        }

        public bool BuyBigStall()
        {
            if (!Balance.MarketActive) return false;

            EnsureWorld();

            int curLevel = State.World.Market.StallLevel;
            var upgrades = MarketConfig?.StallUpgrades;
            if (upgrades == null || curLevel >= upgrades.Count) return false;

            var upgrade = upgrades[curLevel];
            if (!TrySpendClovers(upgrade.Cost)) return false;

            State.World.Market.StallLevel++;
            Count("spent_market", upgrade.Cost);
            Count("stall_upgrades", 1);
            return true;
        }

        private List<OrderState> GetOrCreateOrders()
        {
            EnsureWorld();
            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (State.World.Market.Orders.Count == 0)
            {
                int harvests = 0;
                if (State.Stats?.Counters != null)
                {
                    State.Stats.Counters.TryGetValue("harvests", out harvests);
                }
                var generated = MarketStock.Orders(today, MarketConfig, FarmConfig, harvests);
                if (generated != null && generated.Count > 0)
                {
                    foreach (var o in generated)
                    {
                        State.World.Market.Orders.Add(new OrderState
                        {
                            CropId = o.CropId,
                            Count = o.Count,
                            Done = o.Done
                        });
                    }
                }
            }
            return State.World.Market.Orders;
        }
    }
}
