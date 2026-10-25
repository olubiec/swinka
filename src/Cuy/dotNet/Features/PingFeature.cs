using System;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class PingFeature : HomeFeatureBase
    {
        public override string Id => "hello";

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type == "hello_ping")
            {
                BrainController.Log("[Feature hello] ping");
                HomeWindow.PostToPage(new { type = "hello_pong" });
                return true;
            }
            return false;
        }
    }
}
