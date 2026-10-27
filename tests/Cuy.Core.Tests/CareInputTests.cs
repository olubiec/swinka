using System;
using System.Collections.Generic;
using Cuy.Core.Care;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CareInputTests
    {
        [Theory]
        [InlineData("Pumpkin", true, "Pumpkin")]
        [InlineData("  Pumpkin ", true, "Pumpkin")]
        [InlineData("1234567890123456", true, "1234567890123456")] // 16 chars
        [InlineData("12345678901234567", false, null)] // 17 chars rejected
        [InlineData("Pum<b>", false, null)] // control characters or special characters rejected
        [InlineData("A  B", false, null)] // double space rejected
        [InlineData("", false, null)]
        [InlineData(" ", false, null)]
        [InlineData(null, false, null)]
        public void TryPigName_ShouldValidateCorrectly(string input, bool expectedResult, string expectedName)
        {
            var result = CareInput.TryPigName(input, out var name);
            Assert.Equal(expectedResult, result);
            Assert.Equal(expectedName, name);
        }

        [Fact]
        public void CleanPigNames_ShouldFilterAndDeduplicate()
        {
            var input = new List<string>
            {
                "Pumpkin",
                "Oreo",
                "pumpkin", // Duplicate, ignore case
                "ValidName",
                "A  B", // Invalid (double space)
                "Name4",
                "Name5",
                "Name6",
                "Name7",
                "Name8",
                "Name9" // 9th valid name, should be ignored
            };

            var result = CareInput.CleanPigNames(input);

            Assert.Equal(8, result.Count);
            Assert.Equal("Pumpkin", result[0]);
            Assert.Equal("Oreo", result[1]);
            Assert.Equal("ValidName", result[2]);
            Assert.Equal("Name4", result[3]);
            Assert.Equal("Name5", result[4]);
            Assert.Equal("Name6", result[5]);
            Assert.Equal("Name7", result[6]);
            Assert.Equal("Name8", result[7]);
        }

        [Fact]
        public void CleanPigNames_WithNullInput_ReturnsEmptyList()
        {
            var result = CareInput.CleanPigNames(null);
            Assert.Empty(result);
        }

        [Theory]
        [InlineData(50, true)]
        [InlineData(3000, true)]
        [InlineData(49, false)]
        [InlineData(3001, false)]
        public void TryGrams_ShouldValidateCorrectly(int input, bool expectedResult)
        {
            var result = CareInput.TryGrams(input);
            Assert.Equal(expectedResult, result);
        }

        [Theory]
        [InlineData("00:00", true, "00:00")]
        [InlineData("23:59", true, "23:59")]
        [InlineData("09:05", true, "09:05")]
        [InlineData("24:00", false, null)]
        [InlineData("7:5", false, null)]
        [InlineData("1.02:03", false, null)]
        [InlineData("", false, null)]
        [InlineData(null, false, null)]
        public void TryTime_ShouldValidateCorrectly(string input, bool expectedResult, string expectedTime)
        {
            var result = CareInput.TryTime(input, out var time);
            Assert.Equal(expectedResult, result);
            Assert.Equal(expectedTime, time);
        }

        [Theory]
        [InlineData(0, true)]
        [InlineData(6, true)]
        [InlineData(-1, false)]
        [InlineData(7, false)]
        public void TryWeekday_ShouldValidateCorrectly(int input, bool expectedResult)
        {
            var result = CareInput.TryWeekday(input);
            Assert.Equal(expectedResult, result);
        }

        [Theory]
        [InlineData(1, true)]
        [InlineData(730, true)]
        [InlineData(0, false)]
        [InlineData(731, false)]
        public void TryEveryDays_ShouldValidateCorrectly(int input, bool expectedResult)
        {
            var result = CareInput.TryEveryDays(input);
            Assert.Equal(expectedResult, result);
        }

        [Theory]
        [InlineData(1, true)]
        [InlineData(1440, true)]
        [InlineData(0, false)]
        [InlineData(1441, false)]
        public void TrySnoozeMinutes_ShouldValidateCorrectly(int input, bool expectedResult)
        {
            var result = CareInput.TrySnoozeMinutes(input);
            Assert.Equal(expectedResult, result);
        }

        [Theory]
        [InlineData("2026-10-27", "2026-10-27", true, "2026-10-27")]
        [InlineData("2020-01-01", "2026-10-27", true, "2020-01-01")]
        [InlineData("2026-10-28", "2026-10-27", false, null)] // Future date
        [InlineData("2019-12-31", "2026-10-27", false, null)] // Before 2020
        [InlineData("2026-02-30", "2026-10-27", false, null)] // Invalid calendar date
        [InlineData("", "2026-10-27", false, null)]
        [InlineData(null, "2026-10-27", false, null)]
        public void TryDate_ShouldValidateCorrectly(string input, string todayString, bool expectedResult, string expectedDate)
        {
            var today = DateTime.Parse(todayString);
            var result = CareInput.TryDate(input, today, out var date);
            Assert.Equal(expectedResult, result);
            Assert.Equal(expectedDate, date);
        }
    }
}
