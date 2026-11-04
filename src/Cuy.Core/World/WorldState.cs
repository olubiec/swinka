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

        /// <summary>Pig id -> the pig's own room layout while the pig lives in the shared bedroom.</summary>
        private Dictionary<string, RoomLayout> _parked;
        public Dictionary<string, RoomLayout> Parked
        {
            get => _parked ?? (_parked = new Dictionary<string, RoomLayout>());
            set => _parked = value ?? new Dictionary<string, RoomLayout>();
        }

        /// <summary>Pig id -> shared room id. Absent = the pig has its own room.</summary>
        private Dictionary<string, string> _roomShare;
        public Dictionary<string, string> RoomShare
        {
            get => _roomShare ?? (_roomShare = new Dictionary<string, string>());
            set => _roomShare = value ?? new Dictionary<string, string>();
        }

        /// <summary>Pig ids whose room was created.</summary>
        private HashSet<string> _pigRoomsEnsured;
        public HashSet<string> PigRoomsEnsured
        {
            get => _pigRoomsEnsured ?? (_pigRoomsEnsured = new HashSet<string>());
            set => _pigRoomsEnsured = value ?? new HashSet<string>();
        }

        /// <summary>Variants bought with clovers, keys '&lt;itemId&gt;:&lt;variant&gt;'.</summary>
        private HashSet<string> _unlockedVariants;
        public HashSet<string> UnlockedVariants
        {
            get => _unlockedVariants ?? (_unlockedVariants = new HashSet<string>());
            set => _unlockedVariants = value ?? new HashSet<string>();
        }

        /// <summary>Pig id -> home mode. Absent entry = HomeEconomyConfig.RoamDefaultMode (see <see cref="HomeOf"/>).</summary>
        private Dictionary<string, PigHomeState> _pigHomes;
        public Dictionary<string, PigHomeState> PigHomes
        {
            get => _pigHomes ?? (_pigHomes = new Dictionary<string, PigHomeState>());
            set => _pigHomes = value ?? new Dictionary<string, PigHomeState>();
        }

        /// <summary>The pig's home mode; an absent entry reads as <paramref name="defaultMode"/>. The result is normalized.</summary>
        public PigHomeState HomeOf(string pigId, string defaultMode)
        {
            if (pigId != null && PigHomes.TryGetValue(pigId, out var home) && home != null) return home.Normalize();
            return new PigHomeState { Mode = defaultMode }.Normalize();
        }
    }

    /// <summary>Whether a pig roams the house (<see cref="ModeFree"/>) or stays in one room (<see cref="ModeRoom"/>).</summary>
    public class PigHomeState
    {
        public const string ModeFree = "free";
        public const string ModeRoom = "room";

        public string Mode { get; set; } = ModeFree;

        /// <summary>Room id when Mode is room, otherwise null.</summary>
        public string Room { get; set; }

        /// <summary>Returns a copy with an unknown mode read as free (and no room). The stored object is not changed.</summary>
        public PigHomeState Normalize()
        {
            if (Mode == ModeRoom) return new PigHomeState { Mode = ModeRoom, Room = Room };
            return new PigHomeState { Mode = ModeFree, Room = null };
        }
    }

    public class RoomLayout
    {
        public string Wallpaper { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;

        /// <summary>Room name chosen by the game; null = use the catalog name.</summary>
        public string Name { get; set; }

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

        /// <summary>Colour variant 0..3; 0 = the default look.</summary>
        public int Variant { get; set; } = 0;
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
