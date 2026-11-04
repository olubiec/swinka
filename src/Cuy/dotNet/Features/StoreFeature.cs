using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    /// <summary>
    /// Home store page. Publishes the `store` state only while the page asked for it
    /// (store_open opens a 5 minute window) and handles store_buy by calling Pet.Purchase.
    /// Contract: docs/contracts/store.md.
    /// </summary>
    public sealed class StoreFeature : HomeFeatureBase
    {
        public const string StateKey = "store";
        public const string OpenMessage = "store_open";
        public const string BuyMessage = "store_buy";
        public static readonly TimeSpan OpenWindow = TimeSpan.FromMinutes(5);

        private DateTime _openUntilUtc = DateTime.MinValue;

        /// <summary>Clock used for the open window; replaceable in tests.</summary>
        internal Func<DateTime> Clock = () => DateTime.UtcNow;

        public override string Id => "store";

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            switch (type)
            {
                case OpenMessage:
                    _openUntilUtc = Clock() + OpenWindow;
                    HomeWindow.NotifyStateChanged();
                    return true;

                case BuyMessage:
                    Buy(message, brain);
                    return true;

                default:
                    return false;
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            if (Clock() >= _openUntilUtc) return;

            var pet = brain?.Pet;
            if (pet == null) return;

            var rows = HomeStore.Rows(
                pet.State,
                pet.PlaceCatalog,
                pet.WorldItemCatalog,
                pet.FarmConfig,
                pet.MarketConfig,
                pet.PigRooms,
                pet.HomeEconomy,
                ItemCatalog.Default);

            var storeRows = rows.Select(r => new
            {
                kind = r.Kind,
                id = r.Id,
                name = r.Name,
                category = r.Category,
                place = r.Place,
                price = r.Price,
                owned = r.Owned,
                placed = r.Placed,
                locked = r.Locked,
                lockedReason = r.LockedReason,
                icon = r.Kind
            }).ToList();

            var categories = rows
                .GroupBy(r => r.Category ?? string.Empty)
                .Select(g => new
                {
                    id = g.Key,
                    name = Title(g.Key),
                    count = g.Count()
                }).ToList();

            state[StateKey] = new
            {
                clovers = pet.State.Clovers,
                rows = storeRows,
                categories
            };
        }

        private void Buy(JObject message, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            string kind = (string)message["kind"];
            string id = (string)message["id"];
            int count = (int?)message["count"] ?? 1;

            int cloversSpent;
            StoreResult result = pet.Purchase(kind, id ?? string.Empty, count, out cloversSpent);

            HomeWindow.PostToPage(new { type = "toast", text = ToastText(result) });
            HomeWindow.NotifyStateChanged();
        }

        private static string ToastText(StoreResult result)
        {
            switch (result)
            {
                case StoreResult.Ok:
                    return "Bought!";
                case StoreResult.NotEnoughClovers:
                    return "Not enough clovers";
                default:
                    return "Not available yet";
            }
        }

        private static string Title(string text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            return char.ToUpperInvariant(text[0]) + text.Substring(1);
        }
    }
}
