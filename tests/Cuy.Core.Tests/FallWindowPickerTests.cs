using System;
using System.Collections.Generic;
using System.Drawing;
using Cuy.Core.Physics;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FallWindowPickerTests
    {
        // Pet 100x50 at X=500, Y=100 (feet at 150). Window 400..700 horizontally, top at 200.
        private const double PetX = 500, PetY = 100;
        private const int PetW = 100, PetH = 50, ScreenTop = 0;
        private static readonly Rectangle Under = Rectangle.FromLTRB(400, 200, 700, 500);

        private static int Pick(IList<Rectangle> windows, int stepY, Func<int, bool> covered = null)
        {
            return FallWindowPicker.Pick(windows, PetX, PetY, PetW, PetH, stepY, ScreenTop, covered ?? (i => false));
        }

        [Fact]
        public void WindowReachedThisStep_IsChosen()
        {
            Assert.Equal(0, Pick(new[] { Under }, 60));
        }

        [Fact]
        public void WindowNotReachedThisStep_GivesMinusOne()
        {
            Assert.Equal(-1, Pick(new[] { Under }, 40));
        }

        [Fact]
        public void WindowAboveFeet_IsIgnored()
        {
            var above = Rectangle.FromLTRB(400, 50, 700, 120);
            Assert.Equal(-1, Pick(new[] { above }, 60));
        }

        [Fact]
        public void PetOutsideHorizontalRange_IsIgnored()
        {
            var far = Rectangle.FromLTRB(0, 200, 300, 500);
            Assert.Equal(-1, Pick(new[] { far }, 60));
        }

        [Fact]
        public void PetAtTopOfScreenZone_IsIgnored()
        {
            // petY must be greater than 20 + screenTop; here the pet is at y=10 with the window just below.
            var rect = Rectangle.FromLTRB(400, 40, 700, 300);
            Assert.Equal(-1, FallWindowPicker.Pick(new[] { rect }, PetX, 10, PetW, 10, 60, ScreenTop, i => false));
        }

        [Fact]
        public void CoveredWindow_IsSkipped_AndCoverCheckOnlyRunsForLandingCandidates()
        {
            var offRange = Rectangle.FromLTRB(0, 200, 300, 500);
            var asked = new List<int>();
            int result = Pick(new[] { Under, offRange, Under }, 60, i => { asked.Add(i); return i == 0; });
            Assert.Equal(2, result);
            Assert.Equal(new[] { 0, 2 }, asked);
        }

        [Fact]
        public void TwoLandingWindows_TopmostInZOrderWins()
        {
            var lower = Rectangle.FromLTRB(400, 220, 700, 500);
            Assert.Equal(0, Pick(new[] { Under, lower }, 60));
        }
    }
}
