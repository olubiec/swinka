using System;
using Newtonsoft.Json;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private Health.HealthState _health;

        [JsonProperty("health")]
        public Health.HealthState Health
        {
            get
            {
                if (_health == null)
                {
                    _health = new Health.HealthState();
                }
                return _health;
            }
            set
            {
                _health = value;
            }
        }
    }
}
