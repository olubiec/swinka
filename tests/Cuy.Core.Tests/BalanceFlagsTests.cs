using Cuy.Core;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BalanceFlagsTests
    {
        [Fact]
        public void Defaults_NamedPigFlagsAreOff_AndExistingConstantsPreserved()
        {
            var balance = new Balance();

            Assert.False(balance.PerPigAgeActive);
            Assert.False(balance.PigModifiersActive);
            Assert.False(balance.ArrivalsActive);

            Assert.True(balance.GrowthActive);
            Assert.Equal(21.0, balance.PigDaysPerRealDay);
        }

        [Fact]
        public void Flags_CanBeSetIndependently()
        {
            var balance = new Balance();

            balance.PerPigAgeActive = true;
            Assert.True(balance.PerPigAgeActive);
            Assert.False(balance.PigModifiersActive);
            Assert.False(balance.ArrivalsActive);

            balance.PigModifiersActive = true;
            Assert.True(balance.PerPigAgeActive);
            Assert.True(balance.PigModifiersActive);
            Assert.False(balance.ArrivalsActive);

            balance.ArrivalsActive = true;
            Assert.True(balance.PerPigAgeActive);
            Assert.True(balance.PigModifiersActive);
            Assert.True(balance.ArrivalsActive);

            balance.PerPigAgeActive = false;
            Assert.False(balance.PerPigAgeActive);
            Assert.True(balance.PigModifiersActive);
            Assert.True(balance.ArrivalsActive);
        }
    }
}
