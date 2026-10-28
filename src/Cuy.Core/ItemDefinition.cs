using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    /// <summary>
    /// A single item definition loaded from assets/data/items.json.
    /// </summary>
    public sealed class ItemDefinition
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public int? Price { get; set; }
        public bool IsUnlimited { get; set; }
        public bool IsDurable { get; set; }
        public string IconName { get; set; }
        public string Animation { get; set; }
        public Dictionary<string, double> Effects { get; set; } = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        public string Description { get; set; }
        public int? DailyLimit { get; set; }
        public int? Uses { get; set; }
        public bool OneTime { get; set; }
        public List<string> Stages { get; set; } = new List<string>();

        public bool CanBuy => Price.HasValue && Price.Value >= 0;

        public bool IsAvailableFor(LifeStage stage)
        {
            if (Stages == null || Stages.Count == 0) return true;
            string key = LifeStages.DataKey(stage);
            foreach (var s in Stages)
            {
                if (string.Equals(s, key, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        public double GetEffect(string needName)
        {
            if (string.IsNullOrEmpty(needName) || Effects == null) return 0.0;
            double val;
            return Effects.TryGetValue(needName, out val) ? val : 0.0;
        }
    }
}
