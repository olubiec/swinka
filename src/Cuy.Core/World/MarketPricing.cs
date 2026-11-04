using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public sealed class StallUpgradeDef
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("extra_special_slots")]
        public int ExtraSpecialSlots { get; set; }

        [JsonProperty("cost")]
        public int Cost { get; set; }
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

        public bool UnlockedAtStart { get; set; } = true;
        public int DailySalesCapClovers { get; set; } = 30;
        public double DemandDropPerUnit { get; set; } = 0.10;
        public double DemandRecoverPerDay { get; set; } = 0.10;
        public double DemandFloor { get; set; } = 0.05;
        public int PriceWigglePercent { get; set; } = 15;
        public int RestockHourLocal { get; set; } = 6;
        public int SpecialSlots { get; set; } = 3;
        public int SpecialDiscountPercent { get; set; } = 20;
        public List<string> SpecialPool { get; set; } = new List<string> { "decor", "seed", "toy" };
        public List<StallUpgradeDef> StallUpgrades { get; set; } = new List<StallUpgradeDef>
        {
            new StallUpgradeDef { Id = "big_stall", ExtraSpecialSlots = 2, Cost = 500 }
        };
        public int OrdersPerDay { get; set; } = 2;
        public double OrderRewardFactor { get; set; } = 1.15;
        public bool OrdersCountTowardCap { get; set; } = true;
        public int OrdersUnlockHarvests { get; set; } = 30;
        public double SellPriceMaxShareOfBuy { get; set; } = 0.739;

        public int ExtraSpecialSlots
        {
            get
            {
                if (StallUpgrades == null || StallUpgrades.Count == 0) return 2;
                return StallUpgrades[0].ExtraSpecialSlots;
            }
        }

        public int BigStallCost
        {
            get
            {
                if (StallUpgrades == null || StallUpgrades.Count == 0) return 500;
                return StallUpgrades[0].Cost;
            }
        }

        // Used only when the file is missing or broken.
        public static MarketConfig CreateDefaults()
        {
            return new MarketConfig
            {
                UnlockedAtStart = true,
                DailySalesCapClovers = 30,
                DemandDropPerUnit = 0.10,
                DemandRecoverPerDay = 0.10,
                DemandFloor = 0.05,
                PriceWigglePercent = 15,
                RestockHourLocal = 6,
                SpecialSlots = 3,
                SpecialDiscountPercent = 20,
                SpecialPool = new List<string> { "decor", "seed", "toy" },
                StallUpgrades = new List<StallUpgradeDef>
                {
                    new StallUpgradeDef { Id = "big_stall", ExtraSpecialSlots = 2, Cost = 500 }
                },
                OrdersPerDay = 2,
                OrderRewardFactor = 1.15,
                OrdersCountTowardCap = true,
                OrdersUnlockHarvests = 30,
                SellPriceMaxShareOfBuy = 0.739
            };
        }

        public static MarketConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("MarketConfig: empty json, using defaults.");
                return CreateDefaults();
            }

            try
            {
                var root = JObject.Parse(json);
                var cfg = CreateDefaults();

                if (root["unlocked_at_start"] != null)
                {
                    cfg.UnlockedAtStart = (bool)root["unlocked_at_start"];
                }

                if (root["daily_sales_cap_clovers"] != null)
                {
                    int cap = (int)root["daily_sales_cap_clovers"];
                    if (cap < 5 || cap > 200)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: daily_sales_cap_clovers {cap} clamped to 5..200.");
                        cap = Math.Max(5, Math.Min(200, cap));
                    }
                    cfg.DailySalesCapClovers = cap;
                }

                if (root["price_wiggle_percent"] != null)
                {
                    int wiggle = (int)root["price_wiggle_percent"];
                    if (wiggle < 0 || wiggle > 20)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: price_wiggle_percent {wiggle} clamped to 0..20.");
                        wiggle = Math.Max(0, Math.Min(20, wiggle));
                    }
                    cfg.PriceWigglePercent = wiggle;
                }

                if (root["restock_hour_local"] != null)
                {
                    int hour = (int)root["restock_hour_local"];
                    if (hour < 0 || hour > 23)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: restock_hour_local {hour} clamped to 0..23.");
                        hour = Math.Max(0, Math.Min(23, hour));
                    }
                    cfg.RestockHourLocal = hour;
                }

                if (root["demand"] is JObject demandObj)
                {
                    if (demandObj["drop_per_unit"] != null)
                    {
                        double drop = (double)demandObj["drop_per_unit"];
                        if (double.IsNaN(drop) || double.IsInfinity(drop) || drop < 0.01 || drop > 0.5)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: demand.drop_per_unit {drop} clamped to 0.01..0.5.");
                            drop = double.IsNaN(drop) ? 0.10 : Math.Max(0.01, Math.Min(0.5, drop));
                        }
                        cfg.DemandDropPerUnit = drop;
                    }

                    if (demandObj["recover_per_day"] != null)
                    {
                        double recover = (double)demandObj["recover_per_day"];
                        if (double.IsNaN(recover) || double.IsInfinity(recover) || recover < 0.01 || recover > 0.5)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: demand.recover_per_day {recover} clamped to 0.01..0.5.");
                            recover = double.IsNaN(recover) ? 0.10 : Math.Max(0.01, Math.Min(0.5, recover));
                        }
                        cfg.DemandRecoverPerDay = recover;
                    }

                    if (demandObj["floor"] != null)
                    {
                        double floor = (double)demandObj["floor"];
                        if (double.IsNaN(floor) || double.IsInfinity(floor) || floor < 0.01 || floor > 0.5)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"MarketConfig: demand.floor {floor} clamped to 0.01..0.5.");
                            floor = double.IsNaN(floor) ? 0.05 : Math.Max(0.01, Math.Min(0.5, floor));
                        }
                        cfg.DemandFloor = floor;
                    }
                }

                if (root["special_offers"] is JObject specialObj)
                {
                    if (specialObj["slots"] != null)
                    {
                        cfg.SpecialSlots = Math.Max(0, (int)specialObj["slots"]);
                    }
                    if (specialObj["discount_percent"] != null)
                    {
                        cfg.SpecialDiscountPercent = Math.Max(0, Math.Min(90, (int)specialObj["discount_percent"]));
                    }
                    if (specialObj["pool"] is JArray poolArr)
                    {
                        var pool = new List<string>();
                        foreach (var p in poolArr)
                        {
                            string s = p?.ToString();
                            if (!string.IsNullOrWhiteSpace(s))
                                pool.Add(s);
                        }
                        if (pool.Count > 0)
                            cfg.SpecialPool = pool;
                    }
                }

                if (root["stall_upgrades"] is JArray stallsArr)
                {
                    var upgrades = new List<StallUpgradeDef>();
                    foreach (var st in stallsArr)
                    {
                        string id = st["id"]?.ToString() ?? string.Empty;
                        if (string.IsNullOrWhiteSpace(id)) continue;
                        upgrades.Add(new StallUpgradeDef
                        {
                            Id = id,
                            ExtraSpecialSlots = st["extra_special_slots"] != null ? Math.Max(0, (int)st["extra_special_slots"]) : 0,
                            Cost = st["cost"] != null ? Math.Max(0, (int)st["cost"]) : 0
                        });
                    }
                    if (upgrades.Count > 0)
                        cfg.StallUpgrades = upgrades;
                }

                if (root["orders"] is JObject ordersObj)
                {
                    if (ordersObj["per_day"] != null)
                        cfg.OrdersPerDay = Math.Max(0, (int)ordersObj["per_day"]);
                    if (ordersObj["reward_factor"] != null)
                        cfg.OrderRewardFactor = Math.Max(1.0, (double)ordersObj["reward_factor"]);
                    if (ordersObj["counts_toward_sales_cap"] != null)
                        cfg.OrdersCountTowardCap = (bool)ordersObj["counts_toward_sales_cap"];
                    if (ordersObj["unlock_harvests"] != null)
                        cfg.OrdersUnlockHarvests = Math.Max(0, (int)ordersObj["unlock_harvests"]);
                }

                if (root["invariants"] is JObject invObj && invObj["sell_price_max_share_of_buy"] != null)
                {
                    cfg.SellPriceMaxShareOfBuy = (double)invObj["sell_price_max_share_of_buy"];
                }

                return cfg;
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("MarketConfig: failed to parse json: " + ex.Message);
                return CreateDefaults();
            }
        }

        public static MarketConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("market.json not found", filePath);
            return Load(File.ReadAllText(filePath));
        }

        public static MarketConfig LoadDefault()
        {
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

            ItemCatalog.ErrorLogger?.Invoke("MarketConfig: market.json not found, using hardcoded defaults.");
            return CreateDefaults();
        }
    }

    public sealed class SaleQuote
    {
        public static readonly SaleQuote Empty = new SaleQuote(0, 0, 1.0, 0.0);

        public int Units { get; }
        public int TotalClovers { get; }
        public double NewDemand { get; }
        public double ExactTotal { get; }

        public int Count => Units;
        public int Clovers => TotalClovers;
        public int Total => TotalClovers;

        public SaleQuote(int units, int totalClovers, double newDemand, double exactTotal = 0.0)
        {
            Units = units;
            TotalClovers = totalClovers;
            NewDemand = newDemand;
            ExactTotal = exactTotal > 0.0 ? exactTotal : totalClovers;
        }
    }

    public static class MarketPricing
    {
        private const double Epsilon = 1e-9;

        public static void NewDay(MarketState state, string localDate, MarketConfig cfg)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            if (cfg == null) cfg = MarketConfig.Current;

            string normalizedDate = localDate ?? string.Empty;
            if (string.Equals(state.DayLocalDate, normalizedDate, StringComparison.Ordinal))
                return;

            bool hadPreviousDay = !string.IsNullOrEmpty(state.DayLocalDate);
            state.DayLocalDate = normalizedDate;
            state.SoldToday.Clear();
            state.SalesToday = 0.0;

            if (hadPreviousDay || state.Demand.Count > 0)
            {
                var keys = state.Demand.Keys.ToList();
                foreach (var key in keys)
                {
                    double next = Math.Min(1.0, state.Demand[key] + cfg.DemandRecoverPerDay);
                    state.Demand[key] = Math.Round(next, 6);
                }
            }
        }

        public static double Wiggle(string localDate, string itemId, MarketConfig cfg)
        {
            if (cfg == null) cfg = MarketConfig.Current;
            if (cfg.PriceWigglePercent <= 0) return 0.0;

            double maxWiggle = cfg.PriceWigglePercent / 100.0;
            string key = (localDate ?? string.Empty) + "|" + (itemId ?? string.Empty);

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

            double unit = (hash & 0xFFFFFFu) / (double)0xFFFFFFu; // 0.0 .. 1.0
            return (unit * 2.0 - 1.0) * maxWiggle;
        }

        public static double GetDemand(MarketState state, string cropOrItemId)
        {
            if (state == null || string.IsNullOrEmpty(cropOrItemId)) return 1.0;
            if (state.Demand.TryGetValue(cropOrItemId, out double d))
                return d;
            return 1.0;
        }

        public static double CurrentDemand(MarketState state, CropDefinition crop)
        {
            if (state == null || crop == null) return 1.0;
            if (!string.IsNullOrEmpty(crop.Id) && state.Demand.TryGetValue(crop.Id, out double dId))
                return dId;
            if (!string.IsNullOrEmpty(crop.ItemId) && state.Demand.TryGetValue(crop.ItemId, out double dItem))
                return dItem;
            return 1.0;
        }

        public static double UnitPriceNow(MarketState state, MarketConfig cfg, CropDefinition crop, string localDate)
        {
            if (crop == null) return 0.0;
            if (cfg == null) cfg = MarketConfig.Current;
            string itemKey = !string.IsNullOrEmpty(crop.Id) ? crop.Id : crop.ItemId;
            double wiggle = Wiggle(localDate, itemKey, cfg);
            double demand = CurrentDemand(state, crop);
            return crop.SellPrice * (1.0 + wiggle) * demand;
        }

        public static int CapLeft(MarketState state, MarketConfig cfg)
        {
            if (cfg == null) cfg = MarketConfig.Current;
            if (state == null) return cfg.DailySalesCapClovers;
            int spent = (int)Math.Floor(state.SalesToday + Epsilon);
            return Math.Max(0, cfg.DailySalesCapClovers - spent);
        }

        public static SaleQuote Quote(MarketState state, MarketConfig cfg, CropDefinition crop, int count, string localDate)
        {
            if (cfg == null) cfg = MarketConfig.Current;
            if (state == null) throw new ArgumentNullException(nameof(state));
            if (crop == null || count <= 0)
            {
                double currentDem = CurrentDemand(state, crop);
                return new SaleQuote(0, 0, currentDem, 0.0);
            }

            int capLeft = CapLeft(state, cfg);
            double demand = CurrentDemand(state, crop);
            if (capLeft <= 0)
            {
                return new SaleQuote(0, 0, demand, 0.0);
            }

            string itemKey = !string.IsNullOrEmpty(crop.Id) ? crop.Id : crop.ItemId;
            double wiggle = Wiggle(localDate, itemKey, cfg);
            double baseWithWiggle = crop.SellPrice * (1.0 + wiggle);

            int unitsSold = 0;
            double exactSum = 0.0;
            double curDemand = demand;

            for (int i = 0; i < count; i++)
            {
                double unitVal = baseWithWiggle * curDemand;
                double nextSum = exactSum + unitVal;
                int nextFloored = (int)Math.Floor(nextSum + Epsilon);

                if (nextFloored > capLeft)
                {
                    break;
                }

                exactSum = nextSum;
                unitsSold++;
                curDemand = Math.Max(cfg.DemandFloor, Math.Round(curDemand - cfg.DemandDropPerUnit, 6));
            }

            if (unitsSold == 0)
            {
                return new SaleQuote(0, 0, demand, 0.0);
            }

            int totalClovers = (int)Math.Floor(exactSum + Epsilon);
            return new SaleQuote(unitsSold, totalClovers, curDemand, exactSum);
        }

        public static SaleQuote Sell(MarketState state, MarketConfig cfg, CropDefinition crop, int count, string localDate)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            if (cfg == null) cfg = MarketConfig.Current;

            if (!string.IsNullOrEmpty(localDate))
            {
                NewDay(state, localDate, cfg);
            }

            var quote = Quote(state, cfg, crop, count, localDate);
            if (quote.Units <= 0 || crop == null)
            {
                return quote;
            }

            string key = !string.IsNullOrEmpty(crop.Id) ? crop.Id : crop.ItemId;
            state.Demand[key] = quote.NewDemand;
            if (!string.IsNullOrEmpty(crop.ItemId) && !string.Equals(crop.ItemId, key, StringComparison.OrdinalIgnoreCase))
            {
                state.Demand[crop.ItemId] = quote.NewDemand;
            }

            state.SoldToday.TryGetValue(key, out int prevSold);
            state.SoldToday[key] = prevSold + quote.Units;
            state.SalesToday += quote.TotalClovers;

            return quote;
        }

        public static int BuyPrice(ItemDefinition item)
        {
            if (item == null || !item.Price.HasValue) return 0;
            return Math.Max(0, item.Price.Value);
        }

        public static int BuyPrice(WorldItemDefinition item)
        {
            if (item == null || item.Free) return 0;
            return Math.Max(0, item.Price);
        }
    }
}
