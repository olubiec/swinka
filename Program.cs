using System;
using Cuy.Core.Time;

class Program
{
    static void Main()
    {
        var clock = new ManualClock(new DateTime(2023, 1, 1, 12, 0, 0, DateTimeKind.Utc));
        Console.WriteLine(clock.LocalNow().ToString("yyyy-MM-dd"));

        clock.Advance(TimeSpan.FromHours(12));
        Console.WriteLine(clock.LocalNow().ToString("yyyy-MM-dd"));

    }
}
