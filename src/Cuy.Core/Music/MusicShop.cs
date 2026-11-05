using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Music
{
    public enum MusicBuyError
    {
        None,
        UnknownItem,
        NotForSale,
        AlreadyOwned,
        NotEnoughClovers
    }

    /// <summary>Result of checking a music purchase. Checking does not change the state; Grant does, after payment.</summary>
    public sealed class MusicBuyCheck
    {
        public MusicBuyCheck(MusicBuyError error, int price)
        {
            Error = error;
            Price = price;
        }

        public MusicBuyError Error { get; }
        public int Price { get; }
        public bool Ok => Error == MusicBuyError.None;
    }

    /// <summary>Music purchases (A6): records (count goes up on each copy) and players (one of each). Pure rules.</summary>
    public static class MusicShop
    {
        /// <summary>Item kinds sent by features/music/economy.js (musicBuy message).</summary>
        public const string KindRecord = "record";
        public const string KindPlayer = "player";

        /// <summary>Reads record id -> rarity from assets/records/manifest.json. Bad input gives an empty map.</summary>
        public static IReadOnlyDictionary<string, string> ParseRecordRarities(string manifestJson)
        {
            var result = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(manifestJson)) return result;

            JObject root;
            try
            {
                root = JObject.Parse(manifestJson);
            }
            catch (JsonException)
            {
                return result;
            }

            var records = root["records"] as JArray;
            if (records == null) return result;
            foreach (var item in records)
            {
                var obj = item as JObject;
                if (obj == null) continue;
                string id = obj.Value<string>("id");
                string rarity = obj.Value<string>("rarity");
                if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(rarity)) result[id] = rarity;
            }
            return result;
        }

        /// <summary>Checks a purchase against the balance, the price table and the ownership. Does not change anything.</summary>
        public static MusicBuyCheck Check(GameState state, string kind, string itemId, int balance,
            IReadOnlyDictionary<string, string> recordRarity)
        {
            if (state == null || string.IsNullOrEmpty(itemId)) return new MusicBuyCheck(MusicBuyError.UnknownItem, 0);

            if (kind == KindRecord)
            {
                string rarity;
                if (recordRarity == null || !recordRarity.TryGetValue(itemId, out rarity))
                {
                    return new MusicBuyCheck(MusicBuyError.UnknownItem, 0);
                }
                int recordPrice;
                if (!MusicPrices.RecordPriceByRarity.TryGetValue(rarity, out recordPrice))
                {
                    return new MusicBuyCheck(MusicBuyError.NotForSale, 0);
                }
                return balance < recordPrice
                    ? new MusicBuyCheck(MusicBuyError.NotEnoughClovers, recordPrice)
                    : new MusicBuyCheck(MusicBuyError.None, recordPrice);
            }

            if (kind == KindPlayer)
            {
                int playerPrice;
                if (!MusicPrices.PlayerPriceById.TryGetValue(itemId, out playerPrice))
                {
                    return new MusicBuyCheck(MusicBuyError.UnknownItem, 0);
                }
                if (state.PlayerOwned.Contains(itemId) || state.PlayerPlaced.ContainsValue(itemId))
                {
                    return new MusicBuyCheck(MusicBuyError.AlreadyOwned, playerPrice);
                }
                return balance < playerPrice
                    ? new MusicBuyCheck(MusicBuyError.NotEnoughClovers, playerPrice)
                    : new MusicBuyCheck(MusicBuyError.None, playerPrice);
            }

            return new MusicBuyCheck(MusicBuyError.UnknownItem, 0);
        }

        /// <summary>Adds the bought item to the save. Call only after Check passed and the price was paid.</summary>
        public static void Grant(GameState state, string kind, string itemId)
        {
            if (kind == KindRecord)
            {
                int count;
                state.Records.TryGetValue(itemId, out count);
                state.Records[itemId] = count + 1;
            }
            else if (kind == KindPlayer)
            {
                state.PlayerOwned.Add(itemId);
            }
        }
    }
}
