using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core
{
    public partial class Pet
    {
        public IReadOnlyList<string> RankFeedItems(IEnumerable<string> itemIds, ItemCatalog catalog = null)
        {
            catalog = catalog ?? ItemCatalog.Default;

            var availableItems = new List<ItemDefinition>();
            foreach (var id in itemIds)
            {
                if (catalog.Contains(id))
                {
                    var item = catalog.GetItem(id);
                    if (item.IsAvailableFor(this.Stage))
                    {
                        availableItems.Add(item);
                    }
                }
            }

            var lowNeeds = new List<Need>();
            foreach (var need in NeedNames.All)
            {
                if (State.Needs[need] < 30)
                {
                    lowNeeds.Add(need);
                }
            }

            var rankedItems = availableItems
                .Select(item =>
                {
                    double score = 0;
                    foreach (var need in lowNeeds)
                    {
                        score += item.GetEffect(NeedNames.DataKey(need));
                    }
                    return new { Item = item, Score = score };
                })
                .OrderByDescending(x => x.Score)
                .Select(x => x.Item.Id)
                .ToList();

            return rankedItems;
        }
    }
}
