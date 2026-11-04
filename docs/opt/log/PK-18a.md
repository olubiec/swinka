# PK-18a Log
- W18-01: Added UnlockPlace, UnlockRoom, UpgradePlace in Pet.World.cs with events and EnsureWorld/catalogs.
- Farm starter seeds are granted from PlaceDefinition.WelcomeItems fallback to FarmConfig.StarterSeeds.
- W18-06: Added 14 new world diary templates and grammar symbols to assets/data/diary.json without touching existing entries.
- W18-02: Added BuyItem, PlaceItem, MoveItem, FlipItem, RemoveItem, ComfortScore in Pet.Rooms.cs.
- Integrated comfort-scaled mood decay into Pet.ApplyTime in Pet.cs using Balance.DecayPerHour[Need.Mood].
- Differences from planned names: None; all methods, properties and events match planned names.
- Left undone: Nothing; all items (W18-01, W18-06, W18-02) implemented and verified.
