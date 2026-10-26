using System;
using Cuy.Core.Audio;
using Cuy.Core.Diary;
using Cuy.Core.Input;
using Cuy.Core.Weather;

namespace Cuy.Core.Tests;

public class MusicDetectorTests
{
    private static readonly DateTime T0 = new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);

    private static void Feed(MusicDetector d, Func<int, double> peakAt, int fromStep, int steps)
    {
        for (int i = fromStep; i < fromStep + steps; i++) d.Push(peakAt(i), T0.AddMilliseconds(i * 50));
    }

    [Fact]
    public void Silence_is_not_music()
    {
        var d = new MusicDetector();
        Feed(d, _ => 0.0, 0, 400);
        Assert.False(d.IsMusic);
    }

    [Fact]
    public void Constant_hum_is_not_music()
    {
        var d = new MusicDetector();
        Feed(d, _ => 0.3, 0, 400);
        Assert.False(d.IsMusic);
    }

    [Fact]
    public void Pulsing_signal_becomes_music_after_enter_time_and_stops_after_gap()
    {
        var d = new MusicDetector();
        // 120 BPM: a beat every 500 ms = every 10 steps; loud on the beat, softer in between.
        Func<int, double> beat = i => (i % 10) < 3 ? 0.8 : 0.15;
        Feed(d, beat, 0, 60);            // 3 s
        Assert.False(d.IsMusic);
        Feed(d, beat, 60, 60);           // 6 s in total
        Assert.True(d.IsMusic);
        Feed(d, _ => 0.0, 120, 40);      // 2 s of silence: still music
        Assert.True(d.IsMusic);
        Feed(d, _ => 0.0, 160, 30);      // 3.5 s of silence: stopped
        Assert.False(d.IsMusic);
    }
}

public class MouseShakeDetectorTests
{
    private static readonly DateTime T0 = new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Wild_shake_near_the_pig_is_detected_once()
    {
        var d = new MouseShakeDetector();
        int hits = 0;
        // 60 Hz, cursor swings 120 px left/right every 6 samples (10 reversals per second, ~1400 px/s)
        for (int i = 0; i < 90; i++)
        {
            int x = 500 + ((i / 6) % 2 == 0 ? 1 : -1) * ((i % 6) * 20);
            if (d.Push(x, 400, 100, T0.AddMilliseconds(i * 16.7))) hits++;
        }
        Assert.Equal(1, hits);
    }

    [Fact]
    public void Normal_mouse_work_is_not_a_shake()
    {
        var d = new MouseShakeDetector();
        bool any = false;
        // Slow straight moves with a few corrections: 300 px/s
        for (int i = 0; i < 600; i++)
        {
            int x = 200 + (i % 120) * 5;
            if (d.Push(x, 300 + (i % 7), 50, T0.AddMilliseconds(i * 16.7))) any = true;
        }
        Assert.False(any);
    }

    [Fact]
    public void Shake_far_from_the_pig_is_ignored()
    {
        var d = new MouseShakeDetector();
        bool any = false;
        for (int i = 0; i < 90; i++)
        {
            int x = 500 + ((i / 6) % 2 == 0 ? 1 : -1) * ((i % 6) * 20);
            if (d.Push(x, 400, 900, T0.AddMilliseconds(i * 16.7))) any = true;
        }
        Assert.False(any);
    }
}

public class OpenMeteoTests
{
    [Theory]
    [InlineData(0, WeatherCondition.Clear)]
    [InlineData(3, WeatherCondition.Cloudy)]
    [InlineData(45, WeatherCondition.Fog)]
    [InlineData(61, WeatherCondition.Rain)]
    [InlineData(81, WeatherCondition.Rain)]
    [InlineData(73, WeatherCondition.Snow)]
    [InlineData(86, WeatherCondition.Snow)]
    [InlineData(95, WeatherCondition.Storm)]
    [InlineData(99, WeatherCondition.Storm)]
    public void Wmo_codes_map(int code, WeatherCondition expected)
    {
        Assert.Equal(expected, OpenMeteo.FromWmo(code));
    }

    [Fact]
    public void Parses_current_block()
    {
        const string json = "{\"latitude\":52.23,\"current\":{\"time\":\"2026-10-26T12:00\",\"temperature_2m\":7.4,\"weather_code\":63,\"is_day\":1}}";
        var w = OpenMeteo.ParseCurrent(json, DateTime.UtcNow);
        Assert.NotNull(w);
        Assert.Equal(7.4, w!.TemperatureC, 3);
        Assert.Equal(WeatherCondition.Rain, w.Condition);
        Assert.True(w.IsWet);
    }

    [Fact]
    public void Parses_geocode_and_handles_not_found()
    {
        const string ok = "{\"results\":[{\"name\":\"Warsaw\",\"latitude\":52.22977,\"longitude\":21.01178,\"country\":\"Poland\",\"admin1\":\"Masovia\"}]}";
        var p = OpenMeteo.ParseGeocode(ok);
        Assert.NotNull(p);
        Assert.Equal("Warsaw, Masovia, Poland", p!.DisplayName);
        Assert.Null(OpenMeteo.ParseGeocode("{\"generationtime_ms\":0.5}"));
        Assert.Null(OpenMeteo.ParseCurrent("not json", DateTime.UtcNow));
    }

    [Fact]
    public void Urls_are_invariant_culture()
    {
        var prev = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = new System.Globalization.CultureInfo("pl-PL");
            Assert.Contains("latitude=52.2298&longitude=21.0118", OpenMeteo.ForecastUrl(52.22977, 21.01178));
            Assert.Contains("name=Bia%C5%82ystok", OpenMeteo.GeocodeUrl(" Białystok ", "pl"));
        }
        finally { System.Globalization.CultureInfo.CurrentCulture = prev; }
    }
}

public class TraceryGrammarTests
{
    [Fact]
    public void Expands_symbols_modifiers_and_facts()
    {
        var g = TraceryGrammar.FromJson("{\"origin\":[\"#greet.capitalize#! I ate #veg.a# and #fed# #snack.s#.\"],\"greet\":[\"hello\"],\"veg\":[\"apple\"],\"snack\":[\"berry\"]}");
        g.SetFact("fed", "3");
        Assert.Equal("Hello! I ate an apple and 3 berries.", g.FlattenSymbol("origin", new Random(1)));
    }

    [Fact]
    public void Actions_push_variables_for_the_whole_text()
    {
        var g = TraceryGrammar.FromJson("{\"origin\":[\"#[hero:#name#]story#\"],\"story\":[\"#hero# woke up. #hero# was hungry.\"],\"name\":[\"Kiwi\",\"Mango\",\"Pepper\"]}");
        for (int seed = 0; seed < 20; seed++)
        {
            string s = g.FlattenSymbol("origin", new Random(seed));
            string hero = s.Substring(0, s.IndexOf(' '));
            Assert.Equal(hero + " woke up. " + hero + " was hungry.", s);
        }
    }

    [Fact]
    public void Unknown_symbol_is_visible_not_a_crash()
    {
        var g = new TraceryGrammar();
        Assert.Equal("((missing))", g.Flatten("#missing#", new Random(0)));
    }

    [Fact]
    public void Same_seed_same_text()
    {
        var g = TraceryGrammar.FromJson("{\"origin\":[\"a\",\"b\",\"c\",\"d\",\"e\"]}");
        Assert.Equal(g.FlattenSymbol("origin", new Random(42)), g.FlattenSymbol("origin", new Random(42)));
    }
}
