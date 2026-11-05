using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core;
using Cuy.Core.Music;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    // Exposes the music save fields (A1 model in GameState.Music.cs) to the Home page as state["music"],
    // and handles purchases (musicBuy, A6): the C# side checks the price, the balance and the ownership.
    public class MusicFeature : HomeFeatureBase
    {
        private static IReadOnlyDictionary<string, string> _recordRarity;

        public override string Id => "music";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var s = brain?.Pet?.State;
            if (s == null) return;
            state[Id] = new
            {
                records = s.Records,
                playerOwned = s.PlayerOwned,
                playerPlaced = s.PlayerPlaced,
                musicVersion = s.MusicVersion
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "musicBuy") return false;

            var pet = brain?.Pet;
            if (pet == null) return true;

            string kind = message.Value<string>("kind");
            string itemId = message.Value<string>("itemId");

            MusicBuyCheck check = MusicShop.Check(pet.State, kind, itemId, pet.State.Clovers, RecordRarity());
            if (!check.Ok)
            {
                HomeWindow.PostToPage(new { type = "toast", text = ErrorText(check.Error) });
                BrainController.Log($"[MusicFeature] Buy {kind} {itemId} refused: {check.Error}.");
                return true;
            }

            if (!pet.TryPay(check.Price, "music"))
            {
                HomeWindow.PostToPage(new { type = "toast", text = ErrorText(MusicBuyError.NotEnoughClovers) });
                return true;
            }

            MusicShop.Grant(pet.State, kind, itemId);
            brain.Session.AutoSaver.SaveNow();
            HomeWindow.PostToPage(new { type = "toast", text = "Bought!" });
            BrainController.Log($"[MusicFeature] Bought {kind} {itemId} for {check.Price} clovers.");
            return true;
        }

        // Record rarities come from the manifest (the same file the browser reads). Loaded once; empty if missing.
        private static IReadOnlyDictionary<string, string> RecordRarity()
        {
            if (_recordRarity == null)
            {
                string path = ItemCatalogLoader.FindFile(Path.Combine("assets", "records", "manifest.json"));
                string json = null;
                if (path != null)
                {
                    try { json = File.ReadAllText(path); }
                    catch (Exception ex) { BrainController.Log("[MusicFeature] manifest not read: " + ex.Message); }
                }
                else
                {
                    BrainController.Log("[MusicFeature] assets/records/manifest.json not found.");
                }
                _recordRarity = MusicShop.ParseRecordRarities(json);
            }
            return _recordRarity;
        }

        private static string ErrorText(MusicBuyError error)
        {
            switch (error)
            {
                case MusicBuyError.NotEnoughClovers: return "Not enough clovers";
                case MusicBuyError.AlreadyOwned: return "Already owned";
                case MusicBuyError.NotForSale: return "Item not for sale";
                default: return "Unknown item";
            }
        }
    }
}
