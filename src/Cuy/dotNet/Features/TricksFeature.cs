using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class TricksFeature : HomeFeatureBase
    {
        public override string Id { get { return "tricks"; } }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null) return;

            state["tricks"] = pet.GetTricks().Select(t => new
            {
                id = t.Id,
                title = t.Title,
                unlocked = t.Unlocked,
                unlockLevel = t.UnlockLevel,
                readyIn = t.ReadyIn
            }).ToList();
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "trick") return false;
            string id = message?.Value<string>("id");
            PerformTrick(id, brain);
            return true;
        }

        public static TrickResult PerformTrick(string id, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null || string.IsNullOrEmpty(id)) return TrickResult.Unknown;

            var result = pet.TryPerformTrick(id);
            BrainController.Log($"[Trick] {id} {result}");

            switch (result)
            {
                case TrickResult.Ok:
                    brain.RequestAnimation(id);
                    break;
                case TrickResult.Tired:
                    HomeWindow.PostToPage(new { type = "toast", text = "Too tired for tricks" });
                    break;
                case TrickResult.Locked:
                    HomeWindow.PostToPage(new { type = "toast", text = "Not unlocked yet" });
                    break;
                case TrickResult.Cooldown:
                    HomeWindow.PostToPage(new { type = "toast", text = "Give me a moment" });
                    break;
                case TrickResult.Sleeping:
                    HomeWindow.PostToPage(new { type = "toast", text = "Shh, sleeping" });
                    break;
            }

            return result;
        }
    }
}
