using System;
using System.IO;
using Cuy.Core;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Audio
{
    /// <summary>One entry on the director's stack (MUSIC_PLAN 5.4).</summary>
    public sealed class MusicContext
    {
        public MusicContext(string kind, int priority, string trackId, long seq)
        {
            Kind = kind;
            Priority = priority;
            TrackId = trackId;
            Seq = seq;
        }

        public string Kind { get; }
        public int Priority { get; }
        public string TrackId { get; }
        /// <summary>Order of the last setting; higher wins a tie.</summary>
        public long Seq { get; }
    }

    /// <summary>Fixed priorities (mix.priority in music.json).</summary>
    public static class MusicPriority
    {
        public const int Minigame = 50;
        public const int Record = 40;
        public const int Home = 30;
        public const int Place = 20;
        public const int Desktop = 10;
    }

    /// <summary>Arrangement of a bed for a life stage (MUSIC_PLAN 3, arrangements).</summary>
    public sealed class MusicArrangement
    {
        public MusicArrangement(int octave, double tempo, string timbre)
        {
            Octave = octave;
            Tempo = tempo;
            Timbre = timbre;
        }

        public int Octave { get; }
        public double Tempo { get; }
        public string Timbre { get; }
    }

    /// <summary>Wear parameters of a record condition (MUSIC_PLAN 4.8).</summary>
    public sealed class WearParams
    {
        public WearParams(string condition, bool crackle, double crackleDb, double wowPct, double wowHz,
            double lowpassHz, bool crush, int crushBits, double crushRateHz)
        {
            Condition = condition;
            Crackle = crackle;
            CrackleDb = crackleDb;
            WowPct = wowPct;
            WowHz = wowHz;
            LowpassHz = lowpassHz;
            Crush = crush;
            CrushBits = crushBits;
            CrushRateHz = crushRateHz;
        }

        public string Condition { get; }
        /// <summary>False for mint (no crackle at all).</summary>
        public bool Crackle { get; }
        public double CrackleDb { get; }
        public double WowPct { get; }
        public double WowHz { get; }
        /// <summary>Lowpass cutoff; <see cref="MusicPolicy.NoLowpassHz"/> means no filter.</summary>
        public double LowpassHz { get; }
        /// <summary>Only the cracked condition crushes the sound.</summary>
        public bool Crush { get; }
        public int CrushBits { get; }
        public double CrushRateHz { get; }
    }

    /// <summary>Parameters of the comfort filter (MUSIC_PLAN 5.9).</summary>
    public sealed class ComfortFilterParams
    {
        public ComfortFilterParams(double lowpassHz, double padGainDb)
        {
            LowpassHz = lowpassHz;
            PadGainDb = padGainDb;
        }

        public double LowpassHz { get; }
        public double PadGainDb { get; }
    }

    /// <summary>
    /// Pure music choice logic (MUSIC_PLAN 5.9). No UI, no playback, no save.
    /// The Domek and the desktop only call these functions.
    /// </summary>
    public static class MusicPolicy
    {
        /// <summary>Value meaning "no lowpass filter" in <see cref="WearParams.LowpassHz"/>.</summary>
        public const double NoLowpassHz = 20000;

        /// <summary>
        /// Path to assets/records/players_design.json. The host sets it at startup.
        /// Null or missing file means <see cref="DanceFor"/> returns null.
        /// </summary>
        public static string PlayersDesignPath { get; set; }

        /// <summary>
        /// Chooses the bed id for the given time. Quiet hours (22:00-08:00) return null
        /// unless the user agreed to night music. Music off always returns null.
        /// </summary>
        public static string PickBed(DateTime now, MusicSettings s)
        {
            if (s == null || !s.MusicOn) return null;

            TimeSpan t = now.TimeOfDay;
            bool quiet = t >= new TimeSpan(22, 0, 0) || t < new TimeSpan(8, 0, 0);
            if (quiet && !s.AtNight) return null;

            if (t >= new TimeSpan(6, 0, 0) && t < new TimeSpan(9, 0, 0)) return "bed_morning";
            if (t >= new TimeSpan(9, 0, 0) && t < new TimeSpan(17, 0, 0)) return "bed_day";
            if (t >= new TimeSpan(17, 0, 0) && t < new TimeSpan(22, 0, 0)) return "bed_evening";
            return "bed_night";
        }

        /// <summary>The context with the highest priority wins; a tie goes to the larger Seq.
        /// Empty or null stack returns null.</summary>
        public static MusicContext Resolve(MusicContext[] stack)
        {
            if (stack == null || stack.Length == 0) return null;

            MusicContext best = null;
            foreach (MusicContext c in stack)
            {
                if (c == null) continue;
                if (best == null || c.Priority > best.Priority ||
                    (c.Priority == best.Priority && c.Seq > best.Seq))
                {
                    best = c;
                }
            }
            return best;
        }

        /// <summary>Arrangement per life stage. Baby: octave +1, tempo x1.10, celesta timbre.</summary>
        public static MusicArrangement Arrangement(LifeStage stage)
        {
            if (stage == LifeStage.Baby) return new MusicArrangement(1, 1.10, "celesta");
            return new MusicArrangement(0, 1.0, "default");
        }

        /// <summary>Wear chain for a condition. Missing or unknown condition is treated as mint.</summary>
        public static WearParams WearChain(string condition)
        {
            switch (condition)
            {
                case "worn":
                    return new WearParams("worn", true, -30, 0.3, 0.5, 9000, false, 0, 0);
                case "scratched":
                    // Wow Hz is not given in 4.8; 0.5 Hz is assumed (log PK-34a).
                    return new WearParams("scratched", true, -24, 0.6, 0.5, 7000, false, 0, 0);
                case "warped":
                    return new WearParams("warped", true, -28, 2.5, 0.3, 5000, false, 0, 0);
                case "cracked":
                    // Wow Hz is not given in 4.8; 0.5 Hz is assumed (log PK-34a).
                    return new WearParams("cracked", true, -20, 1.0, 0.5, 4000, true, 8, 12000);
                default:
                    return new WearParams("mint", false, 0, 0, 0, NoLowpassHz, false, 0, 0);
            }
        }

        /// <summary>Track id of one side of a record: rec_&lt;id&gt;_&lt;side&gt;&lt;pass&gt;, e.g. rec_s1_poranek_a1.</summary>
        public static string RecordTrack(string recordId, char side, int pass)
        {
            if (string.IsNullOrWhiteSpace(recordId))
                throw new ArgumentException("recordId is empty", nameof(recordId));
            if (side != 'a' && side != 'b')
                throw new ArgumentException("side must be 'a' or 'b'", nameof(side));
            if (pass != 1 && pass != 2)
                throw new ArgumentException("pass must be 1 or 2", nameof(pass));
            return "rec_" + recordId + side + pass.ToString();
        }

        /// <summary>
        /// Dance style of a player. Reads dance_style from players_design.json (PlayersDesignPath).
        /// "wszystkie" (jukebox) takes the style by series. Returns null if the file or player is missing.
        /// </summary>
        public static string DanceFor(string playerId, string series)
        {
            string path = PlayersDesignPath;
            if (string.IsNullOrEmpty(path) || !File.Exists(path)) return null;
            if (string.IsNullOrEmpty(playerId)) return null;

            JObject root;
            try
            {
                root = JObject.Parse(File.ReadAllText(path));
            }
            catch (Exception)
            {
                return null;
            }

            JObject players = root["players"] as JObject;
            JObject player = players?[playerId] as JObject;
            string style = player?["dance_style"]?.Value<string>();
            if (style == null) return null;
            if (style != "wszystkie") return style;

            // Jukebox: style follows the series. Mapping chosen in PK-34a (log).
            switch (series)
            {
                case "s2": return "obrot";
                case "s3": return "kolysanie";
                case "s4": return "popcorn";
                default: return "kolysanie";
            }
        }

        /// <summary>
        /// Comfort filter for a pig's comfort 0..100 (clamped). Lowpass 3000 Hz at 0 to 12000 Hz at 100,
        /// pad gain 0 dB at 0 to +2 dB at 100.
        /// </summary>
        public static ComfortFilterParams ComfortFilter(int comfort)
        {
            int c = comfort < 0 ? 0 : (comfort > 100 ? 100 : comfort);
            double f = c / 100.0;
            return new ComfortFilterParams(3000 + (12000 - 3000) * f, 2.0 * f);
        }
    }
}
