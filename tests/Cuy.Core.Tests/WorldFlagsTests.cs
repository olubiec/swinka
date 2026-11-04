using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldFlagsTests
    {
        [Fact]
        public void NewBalance_WorldFlagsAreOffByDefault()
        {
            var balance = new Balance();

            Assert.False(balance.PlacesActive);
            Assert.False(balance.FarmActive);
            Assert.False(balance.MarketActive);
            Assert.False(balance.WorldDecorActive);
        }

        [Fact]
        public void NewBalance_EarlierFlagsRemainUntouched()
        {
            var balance = new Balance();

            Assert.False(balance.PerPigAgeActive);
            Assert.False(balance.PigModifiersActive);
            Assert.False(balance.ArrivalsActive);
        }

        [Fact]
        public void WorldFlags_CanBeSetIndependently()
        {
            var balance = new Balance();

            balance.PlacesActive = true;
            Assert.True(balance.PlacesActive);
            Assert.False(balance.FarmActive);
            Assert.False(balance.MarketActive);
            Assert.False(balance.WorldDecorActive);
            Assert.False(balance.PerPigAgeActive);
            Assert.False(balance.PigModifiersActive);
            Assert.False(balance.ArrivalsActive);

            balance.FarmActive = true;
            Assert.True(balance.PlacesActive);
            Assert.True(balance.FarmActive);
            Assert.False(balance.MarketActive);
            Assert.False(balance.WorldDecorActive);

            balance.MarketActive = true;
            Assert.True(balance.PlacesActive);
            Assert.True(balance.FarmActive);
            Assert.True(balance.MarketActive);
            Assert.False(balance.WorldDecorActive);

            balance.WorldDecorActive = true;
            Assert.True(balance.PlacesActive);
            Assert.True(balance.FarmActive);
            Assert.True(balance.MarketActive);
            Assert.True(balance.WorldDecorActive);

            balance.PlacesActive = false;
            Assert.False(balance.PlacesActive);
            Assert.True(balance.FarmActive);
            Assert.True(balance.MarketActive);
            Assert.True(balance.WorldDecorActive);
        }
    }
}
