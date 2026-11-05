using System;

namespace Cuy.Core.Audio
{
    /// <summary>
    /// User settings that decide which music plays (PK-34a, MUSIC_PLAN 5.3 and 5.9).
    /// Save fields are added in PK-35; this type holds only the values.
    /// </summary>
    public sealed class MusicSettings
    {
        /// <summary>Music on or off. Off means no bed at any time.</summary>
        public bool MusicOn { get; set; } = true;

        /// <summary>Default volume 0..1 (mix.default_volume).</summary>
        public double Volume { get; set; } = 0.6;

        /// <summary>Consent to play music during quiet hours (22:00-08:00). Default off.</summary>
        public bool AtNight { get; set; } = false;
    }
}
