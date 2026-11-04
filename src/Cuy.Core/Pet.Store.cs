using System;
using System.Globalization;
using Cuy.Core.World;

namespace Cuy.Core
{
    /// <summary>Outcome of one <see cref="Pet.Purchase"/> call. There is no selling.</summary>
    public enum StoreResult
    {
        Ok,
        NotEnoughClovers,
        Locked,
        MaxLevel,
        Unknown,
        Disabled
    }

    public sealed partial class Pet
    {
        /// <summary>
        /// One purchase entry for the home store. Routes to the existing buy and unlock methods.
        /// Kinds are the <see cref="HomeStore"/> kinds; the id is the row id (for variants "itemId:variant").
        /// </summary>
        public StoreResult Purchase(string kind, string id, int count)
        {
            return Purchase(kind, id, count, out _);
        }

        /// <summary>Same as <see cref="Purchase(string, string, int)"/> and reports the clovers the purchase spent.</summary>
        public StoreResult Purchase(string kind, string id, int count, out int cloversSpent)
        {
            cloversSpent = 0;
            if (string.IsNullOrEmpty(kind) || string.IsNullOrEmpty(id) || count <= 0) return StoreResult.Unknown;
            if (count != 1 && kind != HomeStore.KindDecor) return StoreResult.Unknown;

            var row = HomeStore.Row(kind, id, State, PlaceCatalog, WorldItemCatalog, FarmConfig, MarketConfig,
                PigRooms, HomeEconomy, ItemCatalog.Default);
            if (row == null) return StoreResult.Unknown;
            if (row.Locked)
            {
                return string.Equals(row.LockedReason, "max_level", StringComparison.Ordinal)
                    ? StoreResult.MaxLevel
                    : StoreResult.Locked;
            }
            if (State.Clovers < row.Price) return StoreResult.NotEnoughClovers;

            int before = State.Clovers;
            var result = PurchaseCore(kind, id, count);
            cloversSpent = Math.Max(0, before - State.Clovers);
            return result;
        }

        private StoreResult PurchaseCore(string kind, string id, int count)
        {
            switch (kind)
            {
                case HomeStore.KindItem:
                    return MapBuy(BuyItem(id));
                case HomeStore.KindDecor:
                    return MapBuy(Buy(id, count));
                case HomeStore.KindPlace:
                    return MapWorld(UnlockPlace(id));
                case HomeStore.KindPlaceLevel:
                case HomeStore.KindRoomLevel:
                    return MapWorld(UpgradePlace(id));
                case HomeStore.KindRoom:
                    return MapWorld(UnlockRoom(id));
                case HomeStore.KindDorm:
                    return MapWorld(UnlockDorm());
                case HomeStore.KindDormLevel:
                    return MapWorld(UpgradeDorm());
                case HomeStore.KindVariant:
                    return PurchaseVariant(id);
                case HomeStore.KindPlotPack:
                    return MapInt(BuyPlotPack());
                case HomeStore.KindOrchardSlot:
                    return MapInt(BuyOrchardSlot());
                case HomeStore.KindCan:
                    return MapInt(string.Equals(id, "sprinkler", StringComparison.OrdinalIgnoreCase) ? BuySprinkler() : BuyCan(id));
                case HomeStore.KindStall:
                    return BuyBigStall() ? StoreResult.Ok : StoreResult.Locked;
                default:
                    // Pig room levels have no purchase method in the repo yet, so they are listed but refused.
                    return StoreResult.Unknown;
            }
        }

        private StoreResult PurchaseVariant(string id)
        {
            int sep = id.LastIndexOf(':');
            if (sep <= 0 || sep == id.Length - 1) return StoreResult.Unknown;
            if (!int.TryParse(id.Substring(sep + 1), NumberStyles.None, CultureInfo.InvariantCulture, out int variant))
            {
                return StoreResult.Unknown;
            }
            return MapWorld(UnlockVariant(id.Substring(0, sep), variant));
        }

        private static StoreResult MapBuy(BuyResult result)
        {
            switch (result)
            {
                case BuyResult.Ok: return StoreResult.Ok;
                case BuyResult.NotEnoughClovers: return StoreResult.NotEnoughClovers;
                case BuyResult.Locked: return StoreResult.Locked;
                case BuyResult.Disabled: return StoreResult.Disabled;
                default: return StoreResult.Unknown;
            }
        }

        private static StoreResult MapWorld(WorldResult result)
        {
            switch (result)
            {
                case WorldResult.Ok: return StoreResult.Ok;
                case WorldResult.NotEnoughClovers: return StoreResult.NotEnoughClovers;
                case WorldResult.Locked: return StoreResult.Locked;
                case WorldResult.MaxLevel: return StoreResult.MaxLevel;
                case WorldResult.Disabled: return StoreResult.Disabled;
                default: return StoreResult.Unknown;
            }
        }

        /// <summary>The farm methods return the clovers spent on success and -1 when refused.</summary>
        private static StoreResult MapInt(int spentOrRefused)
        {
            return spentOrRefused < 0 ? StoreResult.Locked : StoreResult.Ok;
        }
    }
}
