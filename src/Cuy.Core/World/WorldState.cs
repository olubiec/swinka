using System;
using System.Collections.Generic;

namespace Cuy.Core.World
{
    public class WorldState
    {
        public int Version { get; set; } = 1;
        public bool LegacyDecorMigrated { get; set; } = false;

        private Dictionary<string, int> _placeLevels;
        public Dictionary<string, int> PlaceLevels
        {
            get => _placeLevels ?? (_placeLevels = new Dictionary<string, int>());
            set => _placeLevels = value ?? new Dictionary<string, int>();
        }

        private HashSet<string> _roomsUnlocked;
        public HashSet<string> RoomsUnlocked
        {
            get => _roomsUnlocked ?? (_roomsUnlocked = new HashSet<string>());
            set => _roomsUnlocked = value ?? new HashSet<string>();
        }

        private Dictionary<string, RoomLayout> _rooms;
        public Dictionary<string, RoomLayout> Rooms
        {
            get => _rooms ?? (_rooms = new Dictionary<string, RoomLayout>());
            set => _rooms = value ?? new Dictionary<string, RoomLayout>();
        }

        private Dictionary<string, int> _ownedItems;
        public Dictionary<string, int> OwnedItems
        {
            get => _ownedItems ?? (_ownedItems = new Dictionary<string, int>());
            set => _ownedItems = value ?? new Dictionary<string, int>();
        }

        private FarmState _farm;
        public FarmState Farm
        {
            get => _farm ?? (_farm = new FarmState());
            set => _farm = value ?? new FarmState();
        }

        private MarketState _market;
        public MarketState Market
        {
            get => _market ?? (_market = new MarketState());
            set => _market = value ?? new MarketState();
        }
    }

    public class RoomLayout
    {
        public string Wallpaper { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;

        private List<PlacedItem> _items;
        public List<PlacedItem> Items
        {
            get => _items ?? (_items = new List<PlacedItem>());
            set => _items = value ?? new List<PlacedItem>();
        }
    }

    public class PlacedItem
    {
        public string Uid { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;
        public int X { get; set; }
        public int Y { get; set; }
        public bool Flip { get; set; }
    }

    public class FarmState
    {
        private List<PlotState> _plots;
        public List<PlotState> Plots
        {
            get => _plots ?? (_plots = new List<PlotState>());
            set => _plots = value ?? new List<PlotState>();
        }

        private List<OrchardState> _orchard;
        public List<OrchardState> Orchard
        {
            get => _orchard ?? (_orchard = new List<OrchardState>());
            set => _orchard = value ?? new List<OrchardState>();
        }

        public int PlotsOwned { get; set; } = 0;
        public int OrchardSlots { get; set; } = 0;
        public string CanId { get; set; } = string.Empty;
        public bool Sprinkler { get; set; }
        public string LastWaterDate { get; set; } = string.Empty;
    }

    public class PlotState
    {
        public string CropId { get; set; } = string.Empty;
        public DateTime PlantedUtc { get; set; }
        public bool Watered { get; set; }
    }

    public class OrchardState
    {
        public string CropId { get; set; } = string.Empty;
        public DateTime NextUtc { get; set; }
        public int Stock { get; set; }
    }

    public class MarketState
    {
        public string DayLocalDate { get; set; } = string.Empty;

        private Dictionary<string, int> _soldToday;
        public Dictionary<string, int> SoldToday
        {
            get => _soldToday ?? (_soldToday = new Dictionary<string, int>());
            set => _soldToday = value ?? new Dictionary<string, int>();
        }

        public double SalesToday { get; set; }

        private Dictionary<string, double> _demand;
        public Dictionary<string, double> Demand
        {
            get => _demand ?? (_demand = new Dictionary<string, double>());
            set => _demand = value ?? new Dictionary<string, double>();
        }

        public int StallLevel { get; set; }

        private List<OrderState> _orders;
        public List<OrderState> Orders
        {
            get => _orders ?? (_orders = new List<OrderState>());
            set => _orders = value ?? new List<OrderState>();
        }
    }

    public class OrderState
    {
        public string CropId { get; set; } = string.Empty;
        public int Count { get; set; }
        public bool Done { get; set; }
    }
}
