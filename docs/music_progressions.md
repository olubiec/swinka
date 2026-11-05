# Ready-made chord progressions for the music plan

Status: research note for the composer (MT-xx tasks in `docs/MUSIC_TASKS.md`, wave PM-R0 in `docs/MUSIC_WAVES.md`). Harmony for every spec id in `tools/music/specs/` is listed below. Specs keep their own chord symbols; this file says which proven family each id follows, so the composer can reuse the shape. Key-agnostic: Roman numerals, transpose to the spec `key`. Voices are our own (EP, PAD, BELL, BNJ, HARP, P12, P25, P50, TRI, BOX, CEL, GLK, PIZ, XYL, ACC, BUZZ).

Mood targets: jazz (ii–V, turnarounds), ambient (modal, open, sustained), pixel-pleasant (bright, loop-friendly). Groove and reverb are set per row.

## Progression families

| Family | Roman numerals | Mood / use | Source |
|---|---|---|---|
| J1 Rhythm-changes head | I–vi–ii–V (V7 allowed); long form I–vi–ii–IV–V | jazz, warm, swing | [Super Simple Piano: I–vi–ii–V](https://www.supersimplepiano.com/learn/chord-progressions/i-vi-ii-v); [Wikipedia: Turnaround (music)](https://en.wikipedia.org/wiki/Turnaround_(music)) |
| J2 Bossa ii–V variant | Imaj7–II7–ii7–V7 (II7 = V of ii) | jazz, bossa groove | [Piano with Jonny: Jobim progression](https://pianowithjonny.com/piano-lessons/the-jobim-chord-progression/); [eMastered: bossa progressions](https://emastered.com/blog/bossa-nova-chord-progressions) |
| J3 Tritone-sub ii–V–I | ii–bII7–I (sub for V7) | jazz colour, chromatic bass | [Guitar World: tritone subs](https://www.guitarworld.com/lessons/how-to-use-tritone-substitutions-in-chord-progressions) |
| A1 Dorian vamp | i–IV (i–bVII–IV; i–IV6/9 in dorian) | ambient, soft-dark, modal | [Guitar Chalk: dorian progressions](https://www.guitarchalk.com/examples-dorian-progressions/) (search snippet only) |
| A2 Lydian vamp | I–II or I–II–I with #4 colour (Imaj7#11–II) | ambient, wonder, open | [Secrets of Songwriting: Lydian progressions](https://www.secretsofsongwriting.com/2014/10/29/5-lydian-mode-chord-progressions-and-how-they-work/); [Wikipedia: Lydian chord](https://en.wikipedia.org/wiki/Lydian_chord) |
| A3 Plagal tag | I (static) with IV–I tag | ambient, jingle, resolved | inference from ambient sources (avoid V–I); no direct source found |
| A4 Mixolydian vamp | I–bVII–IV (I7–bVII–IV) | ambient / fusion, pixel groove | [Benny Sutton: 1-b7-4-1 vamp](https://bennysutton.com/chords/the-1-flat7-4-1-chord-progression) |
| P1 Axis / doo-wop | I–V–vi–IV; rotations vi–IV–I–V, I–vi–IV–V, I–IV–vi–V | pixel-pleasant, happy, loop | [Wikipedia: I–V–vi–IV](https://en.wikipedia.org/wiki/I%E2%80%93V%E2%80%93vi%E2%80%93IV_progression) |
| P2 Canon-type loop | I–V–vi–iii–IV–I–IV–V (minor: i–v–VI–III–iv–i–iv–V) | lullaby, nostalgic, gentle | [Super Simple Piano: Pachelbel](https://www.supersimplepiano.com/learn/chord-progressions/pachelbel-canon) |
| P3 12-bar groove | I–IV–V (I7–IV7–V7); turnaround I–VI–ii–V or V–IV–I–V | groove, blues-pixel, bouncy | [Wikipedia: V–IV–I turnaround](https://en.wikipedia.org/wiki/V%E2%80%93IV%E2%80%93I_turnaround); [Amped Studio: I–IV–V blues](https://ampedstudio.com/what-is-a-1-iv-v-blues-chord-progression/) |
| M1 Minor vamp | i–VI–III–VII; also i–VI–V7 and i–iv–V7–i | minor pixel, game tension | owner-suggested shape; minor Canon form (VI–III) from the P2 source; no dedicated source found |

Extra options (not assigned): J1 with tritone sub (V7 to bII7) for bar 7-8 colour; P1 with iii-for-I swap for lift.

Known gaps: A3 (plagal tag) and M1 have weaker sourcing than the rest; ambient plagal use is an inference. A1 source is a search snippet.

## Mapping: spec id -> family -> bars -> chord rhythm -> voicing -> reverb

Voicing: comp layer is EP shell (3rd/7th) where the spec already has EP, else PAD sustain; melody stays on the spec's own lead voice. Reverb: REV-S for rooms, jingles and minigames (dry for play); REV-M for records, places and the theme; REV-L for beds (ambient tails).

Note: the 4 variants of each record (a1, a2, b1, b2) share one progression; only tempo and bars differ in spec.

| Spec id | Family / note | Bars | Chord rhythm | Voicing | Reverb |
|---|---|---|---|---|---|
| `bed_day` | J1 I–vi–ii–IV–V head | 48 | 1 chord/bar, ii–V pair = 2 beats each | PAD sustain | REV-L |
| `bed_evening` | J1 | 56 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-L |
| `bed_morning` | P1 I–vi–IV–V doo-wop shape | 48 | 1 chord/bar, 4-bar loop | PAD sustain | REV-L |
| `bed_night` | A1  | 36 | 1 chord per 2 bars, pad sustained | PAD sustain | REV-L |
| `jingle_birthday` | A3 static I, IV–I tag | 2 | 1 chord/bar, IV–I tag last bar | PAD sustain | REV-S |
| `jingle_stage` | A3 static I, IV–I tag | 2 | 1 chord/bar, IV–I tag last bar | add PAD (none in spec) | REV-S |
| `mg_hay_maze` | M1 i–VI–V7 variant | 16 | 1 chord/bar, 4-bar loop | PAD sustain | REV-S |
| `mg_menu` | P1 I–vi–IV–V7 | 16 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `mg_nyan_cuy` | M1 i–VI–VII–iv | 16 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-S |
| `mg_veggie_memory` | J1 | 16 | 1 chord/bar, ii–V pair = 2 beats each | PAD sustain | REV-S |
| `mg_veggie_rain` | P1 exact Axis | 16 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-S |
| `place_farm` | P3 I–IV–I–V7 | 32 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `place_garden_day` | P1 I–vi–IV–V7 | 32 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `place_garden_evening` | A4 I7–bVII–IV | 32 | 1 chord/bar, I and bVII alternate | PAD sustain | REV-M |
| `place_market` | J1 I–V7/vi–ii–V (tritone sub option) | 32 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `place_park` | P3 3/4 waltz, I–V7–IV | 32 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `place_room_bedroom` | A1  | 24 | 1 chord per 2 bars, pad sustained | PAD sustain | REV-S |
| `place_room_default` | P1  | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-S |
| `place_room_dorm` | P1  | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-S |
| `place_room_glen` | J1 | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-S |
| `place_room_james` | A1  | 24 | 1 chord per 2 bars, pad sustained | PAD sustain | REV-S |
| `place_room_kuki` | P1 I–IV–vi–V | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-S |
| `place_room_ned` | J1 | 32 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-S |
| `place_room_playroom` | P3 I–V7–I–IV | 32 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-S |
| `place_room_racuch` | P3 I–IV–V7 | 32 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-S |
| `place_room_salon` | J1 | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-S |
| `rec_s1_cichy_a1` | J1 exact rhythm-changes head | 24 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_cichy_a2` | J1 exact rhythm-changes head | 24 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_cichy_b1` | J1 exact rhythm-changes head | 24 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_cichy_b2` | J1 exact rhythm-changes head | 24 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_deszcz_a1` | J1 with bVI colour | 28 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_deszcz_a2` | J1 with bVI colour | 28 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_deszcz_b1` | J1 with bVI colour | 28 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_deszcz_b2` | J1 with bVI colour | 28 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_kubek_a1` | J1 V7b9 colour | 40 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_kubek_a2` | J1 V7b9 colour | 40 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_kubek_b1` | J1 V7b9 colour | 40 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_kubek_b2` | J1 V7b9 colour | 40 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s1_marchewka_a1` | P1 I–iii–IV–V (Axis neighbour) | 36 | 1 chord/bar, 4-bar loop | EP shell 3-7 | REV-M |
| `rec_s1_marchewka_a2` | P1 I–iii–IV–V (Axis neighbour) | 36 | 1 chord/bar, 4-bar loop | EP shell 3-7 | REV-M |
| `rec_s1_marchewka_b1` | P1 I–iii–IV–V (Axis neighbour) | 36 | 1 chord/bar, 4-bar loop | EP shell 3-7 | REV-M |
| `rec_s1_marchewka_b2` | P1 I–iii–IV–V (Axis neighbour) | 36 | 1 chord/bar, 4-bar loop | EP shell 3-7 | REV-M |
| `rec_s1_nocna_a1` | A1 dorian i–IV vamp | 56 | 1 chord per 2 bars, pad sustained | EP shell 3-7 | REV-M |
| `rec_s1_nocna_a2` | A1 dorian i–IV vamp | 56 | 1 chord per 2 bars, pad sustained | EP shell 3-7 | REV-M |
| `rec_s1_nocna_b1` | A1 dorian i–IV vamp | 56 | 1 chord per 2 bars, pad sustained | EP shell 3-7 | REV-M |
| `rec_s1_nocna_b2` | A1 dorian i–IV vamp | 56 | 1 chord per 2 bars, pad sustained | EP shell 3-7 | REV-M |
| `rec_s1_poranek_a1` | J1 I–vi–ii–V then IV–iii–ii–V | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_poranek_a2` | J1 I–vi–ii–V then IV–iii–ii–V | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_poranek_b1` | J1 I–vi–ii–V then IV–iii–ii–V | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s1_poranek_b2` | J1 I–vi–ii–V then IV–iii–ii–V | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |
| `rec_s2_dynia_a1` | P3 12-bar blues, I–IV–V | 48 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_dynia_a2` | P3 12-bar blues, I–IV–V | 48 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_dynia_b1` | P3 12-bar blues, I–IV–V | 48 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_dynia_b2` | P3 12-bar blues, I–IV–V | 48 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_jablka_a1` | M1 minor i–iv–V7–i, 3/4 | 48 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_jablka_a2` | M1 minor i–iv–V7–i, 3/4 | 48 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_jablka_b1` | M1 minor i–iv–V7–i, 3/4 | 48 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_jablka_b2` | M1 minor i–iv–V7–i, 3/4 | 48 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_pietruszka_a1` | M1 minor i–V7 vamp | 40 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_pietruszka_a2` | M1 minor i–V7 vamp | 40 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_pietruszka_b1` | M1 minor i–V7 vamp | 40 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_pietruszka_b2` | M1 minor i–V7 vamp | 40 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s2_pszczoly_a1` | P3 I–IV–I–V7 | 52 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_pszczoly_a2` | P3 I–IV–I–V7 | 52 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_pszczoly_b1` | P3 I–IV–I–V7 | 52 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_pszczoly_b2` | P3 I–IV–I–V7 | 52 | 1 chord/bar, last 2 bars turnaround | add PAD (none in spec) | REV-M |
| `rec_s2_rosa_a1` | P1 I–IV–vi–V | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_rosa_a2` | P1 I–IV–vi–V | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_rosa_b1` | P1 I–IV–vi–V | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_rosa_b2` | P1 I–IV–vi–V | 32 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_wiatr_a1` | P1 I–vi–IV–V | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_wiatr_a2` | P1 I–vi–IV–V | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_wiatr_b1` | P1 I–vi–IV–V | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s2_wiatr_b2` | P1 I–vi–IV–V | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_kolysanka_a1` | P2 Canon-like I–V–vi–IV loop | 40 | 1 chord/bar, 8-bar cycle | add PAD (none in spec) | REV-M |
| `rec_s3_kolysanka_a2` | P2 Canon-like I–V–vi–IV loop | 40 | 1 chord/bar, 8-bar cycle | add PAD (none in spec) | REV-M |
| `rec_s3_kolysanka_b1` | P2 Canon-like I–V–vi–IV loop | 40 | 1 chord/bar, 8-bar cycle | add PAD (none in spec) | REV-M |
| `rec_s3_kolysanka_b2` | P2 Canon-like I–V–vi–IV loop | 40 | 1 chord/bar, 8-bar cycle | add PAD (none in spec) | REV-M |
| `rec_s3_ksiezyc_a1` | A2 Lydian Fmaj7#11–Gmaj7 | 20 | 1 chord/bar, sustain full bar | PAD sustain | REV-M |
| `rec_s3_ksiezyc_a2` | A2 Lydian Fmaj7#11–Gmaj7 | 20 | 1 chord/bar, sustain full bar | PAD sustain | REV-M |
| `rec_s3_ksiezyc_b1` | A2 Lydian Fmaj7#11–Gmaj7 | 20 | 1 chord/bar, sustain full bar | PAD sustain | REV-M |
| `rec_s3_ksiezyc_b2` | A2 Lydian Fmaj7#11–Gmaj7 | 20 | 1 chord/bar, sustain full bar | PAD sustain | REV-M |
| `rec_s3_sen_a1` | J1 I–vi–ii–IV | 24 | 1 chord/bar, ii–V pair = 2 beats each | PAD sustain | REV-M |
| `rec_s3_sen_a2` | J1 I–vi–ii–IV | 24 | 1 chord/bar, ii–V pair = 2 beats each | PAD sustain | REV-M |
| `rec_s3_sen_b1` | J1 I–vi–ii–IV | 24 | 1 chord/bar, ii–V pair = 2 beats each | PAD sustain | REV-M |
| `rec_s3_sen_b2` | J1 I–vi–ii–IV | 24 | 1 chord/bar, ii–V pair = 2 beats each | PAD sustain | REV-M |
| `rec_s3_sowa_a1` | M1 minor i–VI–iv–V7 | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_sowa_a2` | M1 minor i–VI–iv–V7 | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_sowa_b1` | M1 minor i–VI–iv–V7 | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_sowa_b2` | M1 minor i–VI–iv–V7 | 24 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_swietliki_a1` | P1 I–vi–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_swietliki_a2` | P1 I–vi–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_swietliki_b1` | P1 I–vi–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_swietliki_b2` | P1 I–vi–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s3_tupot_a1` | A1 dorian i–IV vamp | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s3_tupot_a2` | A1 dorian i–IV vamp | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s3_tupot_b1` | A1 dorian i–IV vamp | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s3_tupot_b2` | A1 dorian i–IV vamp | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s4_arcade_a1` | P1 exact Axis I–V–vi–IV | 56 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_arcade_a2` | P1 exact Axis I–V–vi–IV | 56 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_arcade_b1` | P1 exact Axis I–V–vi–IV | 56 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_arcade_b2` | P1 exact Axis I–V–vi–IV | 56 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_disco_a1` | J1 minor vi–ii–V–I | 52 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s4_disco_a2` | J1 minor vi–ii–V–I | 52 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s4_disco_b1` | J1 minor vi–ii–V–I | 52 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s4_disco_b2` | J1 minor vi–ii–V–I | 52 | 1 chord/bar, ii–V pair = 2 beats each | add PAD (none in spec) | REV-M |
| `rec_s4_kaseta_a1` | A1 minor i–IV with bVI7 | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s4_kaseta_a2` | A1 minor i–IV with bVI7 | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s4_kaseta_b1` | A1 minor i–IV with bVI7 | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s4_kaseta_b2` | A1 minor i–IV with bVI7 | 44 | 1 chord per 2 bars, pad sustained | add PAD (none in spec) | REV-M |
| `rec_s4_radio_a1` | P1 I–iii–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_radio_a2` | P1 I–iii–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_radio_b1` | P1 I–iii–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_radio_b2` | P1 I–iii–IV–V | 40 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_synth_a1` | M1 exact i–VI–III–VII | 48 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_synth_a2` | M1 exact i–VI–III–VII | 48 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_synth_b1` | M1 exact i–VI–III–VII | 48 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_synth_b2` | M1 exact i–VI–III–VII | 48 | 1 chord/bar, 4-bar loop | PAD sustain | REV-M |
| `rec_s4_taniec_a1` | M1 exact i–VI–III–VII | 60 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_taniec_a2` | M1 exact i–VI–III–VII | 60 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_taniec_b1` | M1 exact i–VI–III–VII | 60 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `rec_s4_taniec_b2` | M1 exact i–VI–III–VII | 60 | 1 chord/bar, 4-bar loop | add PAD (none in spec) | REV-M |
| `theme_cuy` | J1 head I–vi–ii–V, then IV–iii–vi–V7 | 32 | 1 chord/bar, ii–V pair = 2 beats each | EP shell 3-7 | REV-M |

## Notes for the composer

- Every id above appears once in the mapping (123 ids; `noise_*` and `_example_*` excluded, they are not melodies).
- Specs already hold their own chords. Where a spec differs from its family (for example `rec_s1_marchewka`, I–iii–IV–V), the family is the nearest proven shape, not a forced rewrite.
- Keep harmonic rhythm as stated; swing is per spec (50 = straight, 60+ = shuffle feel).
- Bars column is the spec `bars` value; check against the loop length before export.
