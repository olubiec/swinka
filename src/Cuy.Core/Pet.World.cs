using System;
using System.Collections.Generic;
using Cuy.Core.World;

namespace Cuy.Core
{
    public enum WorldResult
    {
        Ok,
        NotEnoughClovers,
        Locked,
        MaxLevel,
        Unknown,
        Disabled
    }

    public sealed partial class Pet
    {
        public event EventHandler<PlaceUnlockedEventArgs> PlaceUnlocked;
        public event EventHandler<PlaceUpgradedEventArgs> PlaceUpgraded;

        private PlaceCatalog _placeCatalog;
        public PlaceCatalog PlaceCatalog
        {
            get => _placeCatalog ?? PlaceCatalog.Current;
            set => _placeCatalog = value;
        }

        private WorldItemCatalog _worldItemCatalog;
        public WorldItemCatalog WorldItemCatalog
        {
            get => _worldItemCatalog ?? WorldItemCatalog.Current;
            set => _worldItemCatalog = value;
        }

        private FarmConfig _farmConfig;
        public FarmConfig FarmConfig
        {
            get => _farmConfig ?? FarmConfig.Current;
            set => _farmConfig = value;
        }

        private MarketConfig _marketConfig;
        public MarketConfig MarketConfig
        {
            get => _marketConfig ?? MarketConfig.Current;
            set => _marketConfig = value;
        }

        public WorldState EnsureWorld() => State.World ?? (State.World = new WorldState());

        public WorldResult UnlockPlace(string id)
        {
            if (!Balance.PlacesActive) return WorldResult.Disabled;
            if (string.IsNullOrEmpty(id)) return WorldResult.Unknown;

            var world = EnsureWorld();
            var can = PlaceUnlock.CanUnlock(world, PlaceCatalog, id);
            if (can == UnlockResult.Unknown) return WorldResult.Unknown;
            if (can == UnlockResult.MissingRequirement || can == UnlockResult.AlreadyUnlocked) return WorldResult.Locked;

            int cost = PlaceUnlock.UnlockCost(world, PlaceCatalog, id);
            if (cost > 0 && !TrySpendClovers(cost)) return WorldResult.NotEnoughClovers;

            PlaceUnlock.Unlock(world, PlaceCatalog, id);
            Count("places_unlocked");

            var placeDef = PlaceCatalog.Find(id);
            if (string.Equals(id, "farm", StringComparison.OrdinalIgnoreCase))
            {
                world.Farm.PlotsOwned = FarmConfig.StartPlots;
                if (world.Farm.Plots == null)
                {
                    world.Farm.Plots = new List<PlotState>();
                }
                while (world.Farm.Plots.Count < world.Farm.PlotsOwned)
                {
                    world.Farm.Plots.Add(new PlotState());
                }

                var seeds = (placeDef?.WelcomeItems != null && placeDef.WelcomeItems.Count > 0)
                    ? placeDef.WelcomeItems
                    : FarmConfig.StarterSeeds;
                if (seeds != null)
                {
                    foreach (var kvp in seeds)
                    {
                        AddItem(kvp.Key, kvp.Value);
                    }
                }
            }
            else if (placeDef?.WelcomeItems != null)
            {
                foreach (var kvp in placeDef.WelcomeItems)
                {
                    AddItem(kvp.Key, kvp.Value);
                }
            }

            Raise(PlaceUnlocked, new PlaceUnlockedEventArgs(id));
            return WorldResult.Ok;
        }

        public WorldResult UnlockRoom(string id)
        {
            if (!Balance.PlacesActive) return WorldResult.Disabled;
            if (string.IsNullOrEmpty(id)) return WorldResult.Unknown;

            var world = EnsureWorld();
            var can = PlaceUnlock.CanUnlockRoom(world, PlaceCatalog, id);
            if (can == UnlockResult.Unknown) return WorldResult.Unknown;
            if (can == UnlockResult.MissingRequirement || can == UnlockResult.AlreadyUnlocked) return WorldResult.Locked;

            int cost = PlaceUnlock.UnlockCost(world, PlaceCatalog, id);
            if (cost > 0 && !TrySpendClovers(cost)) return WorldResult.NotEnoughClovers;

            PlaceUnlock.UnlockRoom(world, PlaceCatalog, id);
            Count("places_unlocked");

            Raise(PlaceUnlocked, new PlaceUnlockedEventArgs(id));
            return WorldResult.Ok;
        }

        public WorldResult UpgradePlace(string id)
        {
            if (!Balance.PlacesActive) return WorldResult.Disabled;
            if (string.IsNullOrEmpty(id)) return WorldResult.Unknown;

            var world = EnsureWorld();
            var placeDef = PlaceCatalog.Find(id);
            var roomDef = PlaceCatalog.FindRoom(id);
            if (placeDef == null && roomDef == null) return WorldResult.Unknown;

            if (!PlaceUnlock.IsUnlocked(world, PlaceCatalog, id)) return WorldResult.Locked;

            int cost = PlaceUnlock.NextLevelCost(world, PlaceCatalog, id);
            if (cost < 0) return WorldResult.MaxLevel;

            if (cost > 0 && !TrySpendClovers(cost)) return WorldResult.NotEnoughClovers;

            PlaceUnlock.Upgrade(world, PlaceCatalog, id);
            int newLevel = PlaceUnlock.GetLevel(world, PlaceCatalog, id);
            Raise(PlaceUpgraded, new PlaceUpgradedEventArgs(id, newLevel));
            return WorldResult.Ok;
        }
    }
}
