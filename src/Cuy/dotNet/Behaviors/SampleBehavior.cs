using System;

namespace Cuy.Behaviors
{
    public class SampleBehavior : IDesktopBehavior
    {
        public string Id => "sample";

        public void Start(BehaviorContext ctx)
        {
            BrainController.Log("[Behavior] sample started");
        }

        public void Tick(TimeSpan dt)
        {
            // Do nothing
        }

        public void Stop()
        {
            // Do nothing
        }
    }
}
