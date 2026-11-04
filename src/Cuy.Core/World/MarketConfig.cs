using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class StallUpgradeDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("extra_special_slots")]
        public int ExtraSpecialSlots { get; set; }

        [JsonProperty("cost")]
        public int Cost { get; set; }

        public StallUpgradeDefinition() { }

        public StallUpgradeDefinition(string id, int extraSpecialSlots, int cost)
        {
            Id = id ?? string.Empty;
            ExtraSpecialSlots = extraSpecialSlots;
            Cost = cost;
        }
    }

    public sealed class MarketConfig
    {
        private static readonly object _syncLock = new object();
        private static MarketConfig _current;

        public static MarketConfig Current
        {
            get
            {
                if (_current != null) return _current;
                lock (_syncLock)
                {
                    if (_current == null)
                    {
                        _current = LoadDefault();
                    }
                }
                return _current;
            }
            set
            {
                lock (_syncLock)
                {
                    _current = value;
                }
            }
        }

        // Code defaults equal to market.json values; used only when the file is missing or corrupted.
        [JsonProperty("unlocked_at_start")]
        public bool UnlockedAtStart { get; set; } = true;

        [JsonProperty("daily_sales_cap_clovers")]
        public int DailySalesCapClovers { get; set; } = 30;

        [JsonProperty("price_wiggle_percent")]
        public int PriceWigglePercent { get; set; } = 15;

        [JsonProperty("restock_hour_local")]
        public int RestockHourLocal { get; set; } = 6;

        [JsonProperty("special_slots")]
        public int SpecialSlots { get; set; } = 3;

        [JsonProperty("special_discount_percent")]
        public int SpecialDiscountPercent { get; set; } = 20;

        [JsonProperty("special_pool")]
        public List<string> SpecialPool { get; set; } = new List<string> { "decor", "seed", "toy" };

        [JsonProperty("stall_upgrades")]
        public List<StallUpgradeDefinition> StallUpgrades { get; set; } = new List<StallUpgradeDefinition>
        {
            new StallUpgradeDefinition("big_stall", 2, 500)
        };

        [JsonProperty("orders_per_day")]
        public int OrdersPerDay { get; set; } = 2;

        [JsonProperty("order_reward_factor")]
        public double OrderRewardFactor { get; set; } = 1.15;

        [JsonProperty("orders_count_toward_cap")]
        public bool OrdersCountTowardCap { get; set; } = true;

        [JsonProperty("orders_unlock_harvests")]
        public int OrdersUnlockHarvests { get; set; } = 30;

        [JsonProperty("demand_drop_per_unit")]
        public double DemandDropPerUnit { get; set; } = 0.10;

        [JsonProperty("demand_recover_per_day")]
        public double DemandRecoverPerDay { get; set; } = 0.10;

        [JsonProperty("demand_floor")]
        public double DemandFloor { get; set; } = 0.05;

        public MarketConfig() { }

        public static MarketConfig CreateDefault()
        {
            return new MarketConfig
            {
                UnlockedAtStart = true,
                DailySalesCapClovers = 30,
                PriceWigglePercent = 15,
                RestockHourLocal = 6,
                SpecialSlots = 3,
                SpecialDiscountPercent = 20,
                SpecialPool = new List<string> { "decor", "seed", "toy" },
                StallUpgrades = new List<StallUpgradeDefinition>
                {
                    new StallUpgradeDefinition("big_stall", 2, 500)
                },
                OrdersPerDay = 2,
                OrderRewardFactor = 1.15,
                OrdersCountTowardCap = true,
                OrdersUnlockHarvests = 30,
                DemandDropPerUnit = 0.10,
                DemandRecoverPerDay = 0.10,
                DemandFloor = 0.05
            };
        }

        public static MarketConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("MarketConfig: JSON is empty or null, using defaults.");
                return CreateDefault();
            }

            try
            {
                var root = JObject.Parse(json);
                var config = CreateDefault();

                if (root["unlocked_at_start"] != null)
                {
                    config.UnlockedAtStart = root.Value<bool>("unlocked_at_start");
                }

                // Daily sales cap (clamp 5 - 200)
                if (root["daily_sales_cap_clovers"] != null)
                {
                    int rawCap = root.Value<int>("daily_sales_cap_clovers");
                    if (rawCap < 5)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped daily_sales_cap_clovers ({rawCap}) to minimum 5.");
                        config.DailySalesCapClovers = 5;
                    }
                    else if (rawCap > 200)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped daily_sales_cap_clovers ({rawCap}) to maximum 200.");
                        config.DailySalesCapClovers = 200;
                    }
                    else
                    {
                        config.DailySalesCapClovers = rawCap;
                    }
                }

                // Price wiggle percent (clamp 0 - 20)
                if (root["price_wiggle_percent"] != null)
                {
                    int rawWiggle = root.Value<int>("price_wiggle_percent");
                    if (rawWiggle < 0)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped price_wiggle_percent ({rawWiggle}) to minimum 0.");
                        config.PriceWigglePercent = 0;
                    }
                    else if (rawWiggle > 20)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped price_wiggle_percent ({rawWiggle}) to maximum 20.");
                        config.PriceWigglePercent = 20;
                    }
                    else
                    {
                        config.PriceWigglePercent = rawWiggle;
                    }
                }

                // Restock hour local (clamp 0 - 23)
                if (root["restock_hour_local"] != null)
                {
                    int rawRestock = root.Value<int>("restock_hour_local");
                    if (rawRestock < 0)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped restock_hour_local ({rawRestock}) to minimum 0.");
                        config.RestockHourLocal = 0;
                    }
                    else if (rawRestock > 23)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped restock_hour_local ({rawRestock}) to maximum 23.");
                        config.RestockHourLocal = 23;
                    }
                    else
                    {
                        config.RestockHourLocal = rawRestock;
                    }
                }

                // Special offers
                if (root["special_offers"] is JObject specialOffers)
                {
                    if (specialOffers["slots"] != null)
                        config.SpecialSlots = specialOffers.Value<int>("slots");
                    if (specialOffers["discount_percent"] != null)
                        config.SpecialDiscountPercent = specialOffers.Value<int>("discount_percent");
                    if (specialOffers["pool"] is JArray poolArray)
                        config.SpecialPool = poolArray.Select(p => p.ToString()).ToList();
                }
                else
                {
                    if (root["special_slots"] != null)
                        config.SpecialSlots = root.Value<int>("special_slots");
                    if (root["special_discount_percent"] != null)
                        config.SpecialDiscountPercent = root.Value<int>("special_discount_percent");
                    if (root["special_pool"] is JArray poolArray)
                        config.SpecialPool = poolArray.Select(p => p.ToString()).ToList();
                }

                // Stall upgrades
                if (root["stall_upgrades"] is JArray stallArray)
                {
                    var list = new List<StallUpgradeDefinition>();
                    foreach (var item in stallArray)
                    {
                        if (item is JObject stallObj)
                        {
                            var id = stallObj.Value<string>("id") ?? string.Empty;
                            var extraSlots = stallObj.Value<int?>("extra_special_slots") ?? 0;
                            var cost = stallObj.Value<int?>("cost") ?? 0;
                            list.Add(new StallUpgradeDefinition(id, extraSlots, cost));
                        }
                    }
                    config.StallUpgrades = list;
                }

                // Orders
                if (root["orders"] is JObject orders)
                {
                    if (orders["per_day"] != null)
                        config.OrdersPerDay = orders.Value<int>("per_day");
                    if (orders["reward_factor"] != null)
                        config.OrderRewardFactor = orders.Value<double>("reward_factor");
                    if (orders["counts_toward_sales_cap"] != null)
                        config.OrdersCountTowardCap = orders.Value<bool>("counts_toward_sales_cap");
                    if (orders["unlock_harvests"] != null)
                        config.OrdersUnlockHarvests = orders.Value<int>("unlock_harvests");
                }
                else
                {
                    if (root["orders_per_day"] != null)
                        config.OrdersPerDay = root.Value<int>("orders_per_day");
                    if (root["order_reward_factor"] != null)
                        config.OrderRewardFactor = root.Value<double>("order_reward_factor");
                    if (root["orders_count_toward_cap"] != null)
                        config.OrdersCountTowardCap = root.Value<bool>("orders_count_toward_cap");
                    if (root["orders_unlock_harvests"] != null)
                        config.OrdersUnlockHarvests = root.Value<int>("orders_unlock_harvests");
                }

                // Demand
                double rawDrop = config.DemandDropPerUnit;
                double rawRecover = config.DemandRecoverPerDay;
                double rawFloor = config.DemandFloor;
                bool hasDrop = false;
                bool hasRecover = false;
                bool hasFloor = false;

                if (root["demand"] is JObject demand)
                {
                    if (demand["drop_per_unit"] != null)
                    {
                        rawDrop = demand.Value<double>("drop_per_unit");
                        hasDrop = true;
                    }
                    if (demand["recover_per_day"] != null)
                    {
                        rawRecover = demand.Value<double>("recover_per_day");
                        hasRecover = true;
                    }
                    if (demand["floor"] != null)
                    {
                        rawFloor = demand.Value<double>("floor");
                        hasFloor = true;
                    }
                }
                else
                {
                    if (root["demand_drop_per_unit"] != null || root["drop_per_unit"] != null)
                    {
                        rawDrop = (root["demand_drop_per_unit"] ?? root["drop_per_unit"]).Value<double>();
                        hasDrop = true;
                    }
                    if (root["demand_recover_per_day"] != null || root["recover_per_day"] != null)
                    {
                        rawRecover = (root["demand_recover_per_day"] ?? root["recover_per_day"]).Value<double>();
                        hasRecover = true;
                    }
                    if (root["demand_floor"] != null || root["floor"] != null)
                    {
                        rawFloor = (root["demand_floor"] ?? root["floor"]).Value<double>();
                        hasFloor = true;
                    }
                }

                // Clamp demand.floor to 0.01 - 0.5
                if (hasFloor)
                {
                    if (rawFloor < 0.01)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped demand.floor ({rawFloor}) to minimum 0.01.");
                        config.DemandFloor = 0.01;
                    }
                    else if (rawFloor > 0.5)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped demand.floor ({rawFloor}) to maximum 0.5.");
                        config.DemandFloor = 0.5;
                    }
                    else
                    {
                        config.DemandFloor = rawFloor;
                    }
                }

                // Clamp drop_per_unit to 0.01 - 0.5
                if (hasDrop)
                {
                    if (rawDrop < 0.01)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped drop_per_unit ({rawDrop}) to minimum 0.01.");
                        config.DemandDropPerUnit = 0.01;
                    }
                    else if (rawDrop > 0.5)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped drop_per_unit ({rawDrop}) to maximum 0.5.");
                        config.DemandDropPerUnit = 0.5;
                    }
                    else
                    {
                        config.DemandDropPerUnit = rawDrop;
                    }
                }

                // Clamp recover_per_day to 0.01 - 0.5
                if (hasRecover)
                {
                    if (rawRecover < 0.01)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped recover_per_day ({rawRecover}) to minimum 0.01.");
                        config.DemandRecoverPerDay = 0.01;
                    }
                    else if (rawRecover > 0.5)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Clamped recover_per_day ({rawRecover}) to maximum 0.5.");
                        config.DemandRecoverPerDay = 0.5;
                    }
                    else
                    {
                        config.DemandRecoverPerDay = rawRecover;
                    }
                }

                return config;
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: Error parsing JSON: {ex.Message}");
                return CreateDefault();
            }
        }

        public static MarketConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("market.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static MarketConfig LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "market.json"),
                Path.Combine(baseDir, "market.json"),
                Path.Combine(baseDir, "..", "assets", "data", "market.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "market.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "market.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "market.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "market.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath);
                    }
                }
                catch { }
            }

            // 2. Check embedded resources
            var asm = typeof(MarketConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("market.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return Load(reader.ReadToEnd());
                            }
                        }
                    }
                }
            }

            // 3. Fallback to code defaults
            ItemCatalog.ErrorLogger?.Invoke("MarketConfig: market.json not found, using hardcoded defaults.");
            return CreateDefault();
        }
    }
}
