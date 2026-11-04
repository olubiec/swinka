using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public sealed class SpecialOffer
    {
        public string ItemId { get; set; }
        public string Id => ItemId;
        public int OriginalPrice { get; set; }
        public int DiscountedPrice { get; set; }
        public int Price => DiscountedPrice;
        public int DiscountPercent { get; set; }
        public string Category { get; set; }

        public SpecialOffer() { }

        public SpecialOffer(string itemId, int originalPrice, int discountedPrice, int discountPercent = 20, string category = null)
        {
            ItemId = itemId;
            OriginalPrice = originalPrice;
            DiscountedPrice = discountedPrice;
            DiscountPercent = discountPercent;
            Category = category;
        }
    }

    public static class MarketStock
    {
        private static int StableHash(string s)
        {
            if (string.IsNullOrEmpty(s)) return 0;
            unchecked
            {
                int hash = (int)2166136261;
                for (int i = 0; i < s.Length; i++)
                {
                    hash = (hash ^ s[i]) * 16777619;
                }
                return hash;
            }
        }

        public static IReadOnlyList<SpecialOffer> Specials(
            string localDate,
            MarketConfig cfg,
            int stallLevel,
            WorldItemCatalog worldItems,
            FarmConfig farmCfg,
            ItemCatalog itemCatalog)
        {
            int slots = cfg != null ? cfg.SpecialSlots : 3;
            if (stallLevel > 0 && cfg?.StallUpgrades != null && cfg.StallUpgrades.Count > 0)
            {
                for (int i = 0; i < stallLevel && i < cfg.StallUpgrades.Count; i++)
                {
                    slots += cfg.StallUpgrades[i].ExtraSpecialSlots;
                }
            }
            else if (stallLevel > 0)
            {
                slots += 2;
            }

            int discountPct = cfg != null ? cfg.SpecialDiscountPercent : 20;
            var poolCategories = cfg?.SpecialPool ?? new List<string> { "decor", "seed", "toy" };

            var candidates = new Dictionary<string, SpecialOffer>(StringComparer.Ordinal);

            bool allowDecor = poolCategories.Any(p => string.Equals(p, "decor", StringComparison.OrdinalIgnoreCase) || string.Equals(p, "placeable", StringComparison.OrdinalIgnoreCase));
            bool allowSeed = poolCategories.Any(p => string.Equals(p, "seed", StringComparison.OrdinalIgnoreCase) || string.Equals(p, "seeds", StringComparison.OrdinalIgnoreCase));
            bool allowToy = poolCategories.Any(p => string.Equals(p, "toy", StringComparison.OrdinalIgnoreCase) || string.Equals(p, "toys", StringComparison.OrdinalIgnoreCase));

            // Decor / placeable items
            if (allowDecor && worldItems?.Items != null)
            {
                foreach (var item in worldItems.Items)
                {
                    if (item != null && item.Price > 0 && !item.IsFree && !item.Free)
                    {
                        int orig = item.Price;
                        int disc = Math.Max(1, (int)Math.Round(orig * (1.0 - discountPct / 100.0)));
                        candidates[item.Id] = new SpecialOffer(item.Id, orig, disc, discountPct, "decor");
                    }
                }
            }

            // Seeds
            if (allowSeed)
            {
                if (farmCfg?.Crops != null)
                {
                    foreach (var crop in farmCfg.Crops)
                    {
                        if (crop != null && crop.SeedPrice > 0)
                        {
                            string seedId = crop.SeedItemId ?? crop.Id;
                            int orig = crop.SeedPrice;
                            int minPrice = (int)Math.Ceiling(orig * 0.5);
                            int disc = Math.Max(minPrice, (int)Math.Round(orig * (1.0 - discountPct / 100.0)));
                            candidates[seedId] = new SpecialOffer(seedId, orig, disc, discountPct, "seed");
                        }
                    }
                }

                if (itemCatalog?.AllItems != null)
                {
                    foreach (var item in itemCatalog.AllItems)
                    {
                        if (item != null &&
                            (string.Equals(item.Category, "seed", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(item.Category, "seeds", StringComparison.OrdinalIgnoreCase)) &&
                            item.Price.HasValue && item.Price.Value > 0)
                        {
                            if (!candidates.ContainsKey(item.Id))
                            {
                                int orig = item.Price.Value;
                                int minPrice = (int)Math.Ceiling(orig * 0.5);
                                int disc = Math.Max(minPrice, (int)Math.Round(orig * (1.0 - discountPct / 100.0)));
                                candidates[item.Id] = new SpecialOffer(item.Id, orig, disc, discountPct, "seed");
                            }
                        }
                    }
                }
            }

            // Toys
            if (allowToy && itemCatalog?.AllItems != null)
            {
                foreach (var item in itemCatalog.AllItems)
                {
                    if (item != null &&
                        (string.Equals(item.Category, "toy", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(item.Category, "toys", StringComparison.OrdinalIgnoreCase)) &&
                        item.Price.HasValue && item.Price.Value > 0)
                    {
                        int orig = item.Price.Value;
                        int disc = Math.Max(1, (int)Math.Round(orig * (1.0 - discountPct / 100.0)));
                        candidates[item.Id] = new SpecialOffer(item.Id, orig, disc, discountPct, "toy");
                    }
                }
            }

            var list = candidates.Values.OrderBy(c => c.ItemId, StringComparer.Ordinal).ToList();
            if (list.Count == 0)
            {
                return Array.Empty<SpecialOffer>();
            }

            int seed = StableHash("specials:" + (localDate ?? ""));
            var rnd = new Random(seed);

            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = rnd.Next(i + 1);
                var tmp = list[i];
                list[i] = list[j];
                list[j] = tmp;
            }

            return list.Take(slots).ToList();
        }

        public static IReadOnlyList<OrderState> Orders(string localDate, MarketConfig cfg, FarmConfig farmCfg, int harvestsDone)
        {
            if (cfg == null || farmCfg == null) return Array.Empty<OrderState>();
            int unlock = cfg.OrdersUnlockHarvests;
            if (harvestsDone < unlock)
            {
                return Array.Empty<OrderState>();
            }

            var unlockedAnnuals = farmCfg.Crops
                ?.Where(c => c != null && c.Kind == CropKind.Annual && c.UnlockHarvests <= harvestsDone)
                .OrderBy(c => c.Id, StringComparer.Ordinal)
                .ToList();

            if (unlockedAnnuals == null || unlockedAnnuals.Count == 0)
            {
                return Array.Empty<OrderState>();
            }

            int count = cfg.OrdersPerDay;
            if (count <= 0) count = 2;

            int seed = StableHash("orders:" + (localDate ?? ""));
            var rnd = new Random(seed);

            var orders = new List<OrderState>(count);
            for (int i = 0; i < count; i++)
            {
                var crop = unlockedAnnuals[rnd.Next(unlockedAnnuals.Count)];
                orders.Add(new OrderState
                {
                    CropId = crop.Id,
                    Count = 2,
                    Done = false
                });
            }

            return orders;
        }

        public static int OrderReward(OrderState order, FarmConfig farmCfg, MarketConfig marketCfg)
        {
            if (order == null || farmCfg == null) return 0;
            var crop = farmCfg.Crops?.FirstOrDefault(c =>
                c != null && (string.Equals(c.Id, order.CropId, StringComparison.Ordinal) ||
                             string.Equals(c.ItemId, order.CropId, StringComparison.Ordinal)));
            if (crop == null) return 0;

            double factor = marketCfg != null ? marketCfg.OrderRewardFactor : 1.15;
            double total = crop.SellPrice * order.Count * factor;
            return (int)Math.Round(total, MidpointRounding.AwayFromZero);
        }
    }
}
