using System;
using System.Collections.Generic;

namespace Cuy.Core.Pigs
{
    public sealed class OfferStatus
    {
        public string Id { get; }
        public string Name { get; }
        public bool Unlocked { get; }
        public double DaysLeft { get; }
        public int Cost { get; }
        public string Group { get; }
        public bool Adopted { get; }

        public OfferStatus(
            string id,
            string name,
            bool unlocked,
            double daysLeft,
            int cost,
            string group,
            bool adopted)
        {
            Id = id ?? string.Empty;
            Name = name ?? string.Empty;
            Unlocked = unlocked;
            DaysLeft = daysLeft;
            Cost = cost;
            Group = group;
            Adopted = adopted;
        }
    }

    public static class OfferChecker
    {
        public static IReadOnlyList<NamedPigDefinition> Due(
            IReadOnlyList<NamedPigDefinition> pigs,
            DateTime offersStartUtc,
            DateTime nowUtc,
            ISet<string> alreadySeen)
        {
            if (pigs == null || pigs.Count == 0)
            {
                return Array.Empty<NamedPigDefinition>();
            }

            var result = new List<NamedPigDefinition>();
            for (int i = 0; i < pigs.Count; i++)
            {
                var pig = pigs[i];
                if (pig == null)
                {
                    continue;
                }

                if (alreadySeen != null && pig.Id != null && alreadySeen.Contains(pig.Id))
                {
                    continue;
                }

                bool unlocked = pig.OfferAfterDays == 0 || nowUtc >= offersStartUtc.AddDays(pig.OfferAfterDays);
                if (unlocked)
                {
                    result.Add(pig);
                }
            }

            return result;
        }

        public static IReadOnlyList<OfferStatus> StatusFor(
            IReadOnlyList<NamedPigDefinition> pigs,
            DateTime offersStartUtc,
            DateTime nowUtc,
            ISet<string> adoptedNamedIds)
        {
            if (pigs == null || pigs.Count == 0)
            {
                return Array.Empty<OfferStatus>();
            }

            var result = new List<OfferStatus>(pigs.Count);
            for (int i = 0; i < pigs.Count; i++)
            {
                var pig = pigs[i];
                if (pig == null)
                {
                    continue;
                }

                bool unlocked = pig.OfferAfterDays == 0 || nowUtc >= offersStartUtc.AddDays(pig.OfferAfterDays);
                double daysLeft = unlocked
                    ? 0.0
                    : Math.Max(0.0, (offersStartUtc.AddDays(pig.OfferAfterDays) - nowUtc).TotalDays);
                bool adopted = adoptedNamedIds != null && pig.Id != null && adoptedNamedIds.Contains(pig.Id);

                result.Add(new OfferStatus(
                    pig.Id,
                    pig.Name,
                    unlocked,
                    daysLeft,
                    pig.OfferCost,
                    pig.OfferGroup,
                    adopted));
            }

            return result;
        }
    }
}
