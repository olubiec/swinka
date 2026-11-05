using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    // Exposes the music save fields (A1 model in GameState.Music.cs) to the Home page as state["music"].
    // The purchase message is not handled here yet (see docs/PLAN_FALE_WDROZENIE.md, A6).
    public class MusicFeature : HomeFeatureBase
    {
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
    }
}
