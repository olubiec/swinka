using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public interface IHomeFeature
    {
        string Id { get; }
        void Initialize(BrainController brain);
        bool HandleMessage(string type, JObject message, BrainController brain);
        void AddState(IDictionary<string, object> state, BrainController brain);
        void Tick(TimeSpan gameElapsed, BrainController brain);
    }

    public abstract class HomeFeatureBase : IHomeFeature
    {
        public abstract string Id { get; }

        public virtual void Initialize(BrainController brain)
        {
        }

        public virtual bool HandleMessage(string type, JObject message, BrainController brain)
        {
            return false;
        }

        public virtual void AddState(IDictionary<string, object> state, BrainController brain)
        {
        }

        public virtual void Tick(TimeSpan gameElapsed, BrainController brain)
        {
        }
    }
}
