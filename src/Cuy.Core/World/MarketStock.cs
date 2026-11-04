using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public sealed class SpecialOffer
    {
        public string ItemId { get; }
        public string Name { get; }
        public string Category { get; }
        public int Price { get; }
        public int OriginalPrice { get; }

        public int Was => OriginalPrice;
        public string Id => ItemId;

        public SpecialOffer(string itemId, string name, string category, int price, int originalPrice)
        {
            ItemId = itemId ?? string.Empty;
            Name = name ?? string.Empty;
            Category = category ?? string.Empty;
            Price = price;
            OriginalPrice = originalPrice;
        }
    }

    public static class MarketStock
    {
        public static IReadOnlyList<SpecialOffer> Specials(
            string localDate,
            MarketConfig cfg,
            int stallLevel,
            WorldItemCatalog worldItems,
            FarmConfig farmCfg,
            ItemCatalog itemCatalog)
        {
            if (cfg == null) cfg = MarketConfig.Current;
            if (worldItems == null) worldItems = WorldItemCatalog.Current;
            if (farmCfg == null) farmCfg = FarmConfig.Current;
            if (itemCatalog == null) itemCatalog = ItemCatalog.Default;

            int slots = Math.Max(0, cfg.SpecialSlots);
            if (stallLevel >= 1)
            {
                slots += cfg.ExtraSpecialSlots;
            }
            if (slots == 0)
            {
                return new SpecialOffer[0];
            }

            var poolSet = new HashSet<string>(
                cfg.SpecialPool ?? new List<string> { "decor", "seed", "toy" },
                StringComparer.OrdinalIgnoreCase);

            var candidates = new List<SpecialOffer>();
            var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            double discountMult = 1.0 - Math.Max(0, Math.Min(90, cfg.SpecialDiscountPercent)) / 100.0;

            // 1. Placeable / decor items from WorldItemCatalog
            if (poolSet.Contains("decor") && worldItems?.Items != null)
            {
                foreach (var w in worldItems.Items)
                {
                    if (w == null || string.IsNullOrEmpty(w.Id)) continue;
                    if (w.Free || w.Price <= 0) continue;
                    if (!string.IsNullOrEmpty(w.SignatureOf) || !string.IsNullOrEmpty(w.PropOf)) continue;
                    if (!seenIds.Add(w.Id)) continue;

                    int discounted = (int)Math.Round(w.Price * discountMult, MidpointRounding.AwayFromZero);
                    discounted = Math.Max(1, discounted);
                    candidates.Add(new SpecialOffer(w.Id, w.Name, "decor", discounted, w.Price));
                }
            }

            // 2. Seeds from FarmConfig (or ItemCatalog)
            if (poolSet.Contains("seed") && farmCfg?.Crops != null)
            {
                foreach (var c in farmCfg.Crops)
                {
                    if (c == null || string.IsNullOrEmpty(c.SeedItemId) || c.SeedPrice <= 0) continue;
                    if (!seenIds.Add(c.SeedItemId)) continue;

                    string name = itemCatalog?.GetItem(c.SeedItemId)?.Name ?? (c.Id + " seeds");
                    int discounted = (int)Math.Round(c.SeedPrice * discountMult, MidpointRounding.AwayFromZero);
                    int minSeedPrice = (int)Math.Ceiling(c.SeedPrice * 0.5);
                    discounted = Math.Max(minSeedPrice, Math.Max(1, discounted));

                    candidates.Add(new SpecialOffer(c.SeedItemId, name, "seed", discounted, c.SeedPrice));
                }
            }

            // 3. Items from ItemCatalog (toys, seeds, decor)
            if (itemCatalog?.AllItems != null)
            {
                foreach (var item in itemCatalog.AllItems)
                {
                    if (item == null || string.IsNullOrEmpty(item.Id)) continue;
                    if (!item.Price.HasValue || item.Price.Value <= 0 || item.IsUnlimited) continue;
                    if (string.IsNullOrEmpty(item.Category) || !poolSet.Contains(item.Category)) continue;
                    if (!seenIds.Add(item.Id)) continue;

                    int origPrice = item.Price.Value;
                    int discounted = (int)Math.Round(origPrice * discountMult, MidpointRounding.AwayFromZero);
                    int floorPrice = 1;

                    if (string.Equals(item.Category, "seed", StringComparison.OrdinalIgnoreCase))
                    {
                        floorPrice = Math.Max(1, (int)Math.Ceiling(origPrice * 0.5));
                    }
                    else if (farmCfg?.Crops != null)
                    {
                        var matchingCrop = farmCfg.Crops.FirstOrDefault(
                            c => string.Equals(c.ItemId, item.Id, StringComparison.OrdinalIgnoreCase));
                        if (matchingCrop != null)
                        {
                            floorPrice = Math.Max(1, matchingCrop.SellPrice);
                        }
                    }

                    discounted = Math.Max(floorPrice, discounted);
                    candidates.Add(new SpecialOffer(item.Id, item.Name, item.Category, discounted, origPrice));
                }
            }

            if (candidates.Count == 0)
            {
                return new SpecialOffer[0];
            }

            int take = Math.Min(slots, candidates.Count);
            var rng = new Random(SeedFromDate(localDate, "specials"));
            var pool = new List<SpecialOffer>(candidates);
            var selected = new List<SpecialOffer>(take);

            for (int i = 0; i < take; i++)
            {
                int idx = rng.Next(pool.Count);
                selected.Add(pool[idx]);
                pool.RemoveAt(idx);
            }

            return selected;
        }

        public static IReadOnlyList<OrderState> Orders(
            string localDate,
            MarketConfig cfg,
            FarmConfig farmCfg,
            int harvestsDone)
        {
            if (cfg == null) cfg = MarketConfig.Current;
            if (farmCfg == null) farmCfg = FarmConfig.Current;

            if (cfg.OrdersPerDay <= 0 || harvestsDone < cfg.OrdersUnlockHarvests)
            {
                return new OrderState[0];
            }

            var unlockedAnnual = (farmCfg?.Crops ?? new List<CropDefinition>())
                .Where(c => c != null && c.Kind == CropKind.Annual && c.UnlockHarvests <= harvestsDone)
                .ToList();

            if (unlockedAnnual.Count == 0)
            {
                return new OrderState[0];
            }

            var rng = new Random(SeedFromDate(localDate, "orders"));
            var result = new List<OrderState>(cfg.OrdersPerDay);

            for (int i = 0; i < cfg.OrdersPerDay; i++)
            {
                var chosen = unlockedAnnual[rng.Next(unlockedAnnual.Count)];
                result.Add(new OrderState
                {
                    CropId = chosen.Id,
                    Count = 2,
                    Done = false
                });
            }

            return result;
        }

        public static int OrderReward(OrderState order, FarmConfig farmCfg, MarketConfig cfg)
        {
            if (order == null || order.Count <= 0) return 0;
            if (farmCfg == null) farmCfg = FarmConfig.Current;
            if (cfg == null) cfg = MarketConfig.Current;

            var crop = farmCfg?.Find(order.CropId);
            if (crop == null) return 0;

            double raw = crop.SellPrice * order.Count * cfg.OrderRewardFactor;
            return (int)Math.Round(raw, MidpointRounding.AwayFromZero);
        }

        private static int SeedFromDate(string localDate, string salt)
        {
            string key = (localDate ?? string.Empty) + "#" + (salt ?? string.Empty);
            unchecked
            {
                uint hash = 2166136261u;
                for (int i = 0; i < key.Length; i++)
                {
                    hash ^= key[i];
                    hash *= 16777619u;
                }
                hash ^= hash >> 16;
                hash *= 0x85ebca6bu;
                hash ^= hash >> 13;
                hash *= 0xc2b2ae35u;
                hash ^= hash >> 16;
                return (int)(hash & 0x7FFFFFFFu);
            }
        }
    }
}
