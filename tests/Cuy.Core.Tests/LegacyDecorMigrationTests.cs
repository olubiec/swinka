using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class LegacyDecorMigrationTests
    {
        private static WorldItemCatalog CreateCatalog()
        {
            return new WorldItemCatalog(new List<WorldItemDefinition>(), new List<string> { "wall", "floor", "ground" });
        }

        [Fact]
        public void EmptyDecorMigratesToEmptySalonAndSetsFlag()
        {
            var state = new GameState();
            state.Decor = new DecorState();
            var items = CreateCatalog();
            var catalog = ItemCatalog.LoadDefault();

            Assert.False(state.World.LegacyDecorMigrated);

            bool changed = LegacyDecorMigration.Migrate(state, items, catalog);
            Assert.True(changed);
            Assert.True(state.World.LegacyDecorMigrated);

            Assert.True(state.World.Rooms.ContainsKey("salon"));
            var salon = state.World.Rooms["salon"];
            Assert.Empty(salon.Items);
            Assert.Equal(string.Empty, salon.Wallpaper);
            Assert.Equal(string.Empty, salon.Floor);

            // Second call returns false (idempotent)
            bool secondCall = LegacyDecorMigration.Migrate(state, items, catalog);
            Assert.False(secondCall);
        }

        [Fact]
        public void AllSixSlotsYieldWallpaperFloorAndFourPlacedItemsWithoutOverlaps()
        {
            var state = new GameState();
            state.Decor = new DecorState();
            state.Decor.Equipped["wallpaper"] = "wallpaper_mint";
            state.Decor.Equipped["floor"] = "floor_wood_light";
            state.Decor.Equipped["rug"] = "rug_round_pink";
            state.Decor.Equipped["plant"] = "plant_fern";
            state.Decor.Equipped["picture"] = "picture_pig";
            state.Decor.Equipped["lamp"] = "lamp_mushroom";

            var items = CreateCatalog();
            var catalog = ItemCatalog.LoadDefault();

            bool changed = LegacyDecorMigration.Migrate(state, items, catalog);
            Assert.True(changed);

            var salon = state.World.Rooms["salon"];
            Assert.Equal("wallpaper_mint", salon.Wallpaper);
            Assert.Equal("floor_wood_light", salon.Floor);

            // Four placed items: rug, plant, picture, lamp
            Assert.Equal(4, salon.Items.Count);

            // Check grid bounds (12x7) and no overlaps
            // Wall rows = 2
            var placedItems = salon.Items;
            for (int i = 0; i < placedItems.Count; i++)
            {
                var pi = placedItems[i];
                var def = items.Find(pi.ItemId);
                Assert.NotNull(def);

                // Inside 12x7
                Assert.True(pi.X >= 0, $"{pi.ItemId} X should be >= 0");
                Assert.True(pi.Y >= 0, $"{pi.ItemId} Y should be >= 0");
                Assert.True(pi.X + def.W <= 12, $"{pi.ItemId} X+W ({pi.X + def.W}) should be <= 12");
                Assert.True(pi.Y + def.H <= 7, $"{pi.ItemId} Y+H ({pi.Y + def.H}) should be <= 7");

                // Wall items inside wall rows, floor/ground items below wall rows
                if (def.Layer == "wall")
                {
                    Assert.True(pi.Y + def.H <= 2, $"{pi.ItemId} wall item must be inside wall rows (0..1)");
                }
                else
                {
                    Assert.True(pi.Y >= 2, $"{pi.ItemId} floor/ground item must be below wall rows (>= 2)");
                }

                // Check overlap with other items of the same layer
                for (int j = i + 1; j < placedItems.Count; j++)
                {
                    var pj = placedItems[j];
                    var defJ = items.Find(pj.ItemId);
                    Assert.NotNull(defJ);

                    if (string.Equals(def.Layer, defJ.Layer, StringComparison.OrdinalIgnoreCase))
                    {
                        bool overlap = !(pi.X + def.W <= pj.X || pj.X + defJ.W <= pi.X ||
                                         pi.Y + def.H <= pj.Y || pj.Y + defJ.H <= pi.Y);
                        Assert.False(overlap, $"{pi.ItemId} overlaps with {pj.ItemId} on layer {def.Layer}");
                    }
                }
            }

            // Items are in OwnedItems
            Assert.True(state.World.OwnedItems.ContainsKey("wallpaper_mint"));
            Assert.True(state.World.OwnedItems.ContainsKey("floor_wood_light"));
            Assert.True(state.World.OwnedItems.ContainsKey("rug_round_pink"));
            Assert.True(state.World.OwnedItems.ContainsKey("plant_fern"));
            Assert.True(state.World.OwnedItems.ContainsKey("picture_pig"));
            Assert.True(state.World.OwnedItems.ContainsKey("lamp_mushroom"));

            // Old Decor.Equipped is unchanged
            Assert.Equal("wallpaper_mint", state.Decor.Equipped["wallpaper"]);
            Assert.Equal("floor_wood_light", state.Decor.Equipped["floor"]);
            Assert.Equal("rug_round_pink", state.Decor.Equipped["rug"]);
            Assert.Equal("plant_fern", state.Decor.Equipped["plant"]);
            Assert.Equal("picture_pig", state.Decor.Equipped["picture"]);
            Assert.Equal("lamp_mushroom", state.Decor.Equipped["lamp"]);
        }

        [Fact]
        public void CallingTwiceDoesNotDuplicate()
        {
            var state = new GameState();
            state.Decor = new DecorState();
            state.Decor.Equipped["plant"] = "plant_fern";

            var items = CreateCatalog();
            var catalog = ItemCatalog.LoadDefault();

            Assert.True(LegacyDecorMigration.Migrate(state, items, catalog));
            int countFirst = state.World.Rooms["salon"].Items.Count;
            Assert.Equal(1, countFirst);

            // Second call
            Assert.False(LegacyDecorMigration.Migrate(state, items, catalog));
            int countSecond = state.World.Rooms["salon"].Items.Count;
            Assert.Equal(1, countSecond);
        }

        [Fact]
        public void UnknownItemIdsAreSkipped()
        {
            var state = new GameState();
            state.Decor = new DecorState();
            state.Decor.Equipped["plant"] = "ghost_plant_unknown";
            state.Decor.Equipped["lamp"] = "lamp_mushroom"; // valid

            var items = CreateCatalog();
            var catalog = ItemCatalog.LoadDefault();

            Assert.True(LegacyDecorMigration.Migrate(state, items, catalog));
            var salon = state.World.Rooms["salon"];

            // Only lamp was migrated, ghost_plant_unknown was skipped
            Assert.Single(salon.Items);
            Assert.Equal("lamp_mushroom", salon.Items[0].ItemId);
            Assert.False(state.World.OwnedItems.ContainsKey("ghost_plant_unknown"));
            Assert.True(state.World.OwnedItems.ContainsKey("lamp_mushroom"));
        }
    }
}
