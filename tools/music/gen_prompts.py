#!/usr/bin/env python3
"""Generuje docs/music_prompts/*.md z katalogów (catalog_records.py, catalog_loops.py).

Uruchom z korzenia repo:  python3 tools/music/gen_prompts.py
Prompty są ARTEFAKTEM: edytuj dane w catalog_*.py, nie wygenerowane pliki.
"""
import os
import sys
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import theory as T  # noqa: E402
from catalog_records import R, SERIES  # noqa: E402
from catalog_loops import L  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "music_prompts")
WARN = []

STYLE_BASE = ("Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. "
              "Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; "
              "P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. "
              "Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. "
              "Całość autorska, nie przypomina żadnej istniejącej piosenki.")

EN_VOICE = {
    "P12": "narrow 12.5% pulse wave (plucky, nasal)", "P25": "25% pulse wave (brass/piano-like)", "P50": "50% square wave (hollow, radio-like)",
    "TRI": "triangle wave (bass/pad)", "PAD": "detuned triangle pad", "BELL": "soft bell", "BOX": "music-box", "CEL": "celesta",
    "GLK": "glockenspiel", "XYL": "xylophone", "EP": "electric piano", "BNJ": "banjo-like pluck", "PIZ": "pizzicato bass",
    "HARP": "harp pluck", "ACC": "accordion-like reed", "BUZZ": "bee-like drone", "KICK": "soft kick", "SNR": "noise snare",
    "BRSH": "brush swishes", "HAT": "hi-hat", "SHK": "shaker",
}

DRUMS = {
    "lofi": dict(KICK="X.....X.........", SNR="....X.......X...", HAT="X.X.X.X.X.X.X.X.", steps=16),
    "lofi_soft": dict(KICK="X.....X.........", BRSH="....X.......X...", SHK="X.X.X.X.X.X.X.X.", steps=16),
    "brush": dict(BRSH="....X.......X...", HAT="X.X.X.X.X.X.X.X.", SHK="X.X.X.X.X.X.X.X.", steps=16),
    "bossa": dict(BRSH="X..X..X...X..X..", HAT="X.X.X.X.X.X.X.X.", KICK="X.....X.X.....X.", steps=16),
    "shuffle": dict(KICK="X.....X.....", SNR="...X.....X..", HAT="X.XX.XX.XX.X", BRSH="X.XX.XX.XX.X", steps=12),
    "polka": dict(KICK="X.......X.......", SNR="....X.......X...", HAT="X.X.X.X.X.X.X.X.", steps=16),
    "waltz": dict(KICK="X...........", BRSH="....X...X...", HAT="X.X.X.X.X.X.", steps=12),
    "gentle": dict(KICK="X...............", SHK="X.X.X.X.X.X.X.X.", BRSH="....X.......X...", steps=16),
    "dream": dict(KICK="X.......X.......", BRSH="....X.......X...", steps=16),
    "funk16": dict(KICK="X.....X..X......", SNR="....X.......X...", HAT="XXXXXXXXXXXXXXXX", steps=16),
    "four": dict(KICK="X...X...X...X...", SNR="....X.......X...", HAT="XXXXXXXXXXXXXXXX", steps=16),
    "four_simple": dict(KICK="X.......X.......", SNR="....X.......X...", HAT="X.X.X.X.X.X.X.X.", steps=16),
    "disco": dict(KICK="X...X...X...X...", SNR="....X.......X...", SHK="....X.......X...", HAT="..O...O...O...O.", steps=16),
    "ballad": dict(KICK="X.......X.......", SNR="....X.......X...", steps=16),
    "glitch": dict(HAT="X.XX.X.XX.X.XX.X", steps=16),
    "tick": dict(HAT="X...X...X...X...", KICK="X...............", SNR="............X.X.", steps=16),
    "offshk": dict(SHK="......X.......X.", steps=16),
}

SER_MODE = {"mel": "melodia", "chd": "akordy", "bass": "bas", "pad": "pad", "tex": "faktura", "orn": "ozdoba", "extra": "dodatkowy głos", "noise": "szum", "drums": "perkusja"}
PAN = {"mel": "0", "chd": "L 25", "bass": "0", "pad": "szeroko ±35", "tex": "R 20", "orn": "R 30", "extra": "losowo ±40", "noise": "szeroko ±50", "drums": "KICK 0, SNR 0, HAT R 20, SHK L 20, BRSH L 10"}
LUFS_BY_KIND = {"bed": -20, "theme": -18, "place": -18, "room": -18, "minigame": -16, "record": -16}


EN_CHAR = {
    "s1_poranek": "Morning lo-fi hip-hop with soft brushed beat and distant birds.", "s1_marchewka": "Bouncy plucked lo-fi beat with a crunchy open hi-hat.",
    "s1_deszcz": "Jazz ballad on electric piano with rain on a roof.", "s1_kubek": "Light bossa nova with steam-like noise swells.",
    "s1_nocna": "Midnight doriian blues with walking bass and a blue-note bell.", "s1_cichy": "Very sparse music-box only.",
    "s2_rosa": "Pastoral morning dew with high bell droplets.", "s2_pietruszka": "Staccato funk bass with wah stabs.",
    "s2_pszczoly": "Fast bluegrass-like pluck with a buzzing drone.", "s2_wiatr": "Wide airy pad and wind in grass.",
    "s2_dynia": "Accordion polka, oom-pa.", "s2_jablka": "Folk waltz with winter crystal chimes.",
    "s3_ksiezyc": "Moonlit lydian bells with long reverb.", "s3_swietliki": "Dream pop with twinkling fireflies.",
    "s3_sowa": "Gentle lullaby, soft owl hoots.", "s3_kolysanka": "Toy-orchestra lullaby.", "s3_tupot": "Tiptoe staccato with small glitch stutters.",
    "s3_sen": "Tape-warped ambient pad.", "s4_disco": "Disco with octave bass and clap, four on the floor.",
    "s4_synth": "Synthwave with arpeggios and gated snare.", "s4_kaseta": "Funk mixtape with baked-in tape wobble.",
    "s4_radio": "Chiptune radio ballad with FM static.", "s4_arcade": "Fast arcade chiptune dance.", "s4_taniec": "Fastest dance track, own original lead, minor.",
    "theme_cuy": "Warm signature theme, a minor to C major, bell and pulse lead.", "bed_morning": "Bright morning bed with birds.",
    "bed_day": "Almost silent daytime pad.", "bed_evening": "Evening lo-fi jazz with vinyl crackle.", "bed_night": "Night music box, barely there.",
    "place_garden_day": "Sunny banjo garden.", "place_garden_evening": "Warm mixolydian dusk with crickets.", "place_park": "Folk waltz in the park.",
    "place_farm": "Country shuffle with slide ornaments.", "place_market": "Swing market with a shop-bell tag.",
    "place_room_salon": "Cosy lo-fi salon.", "place_room_bedroom": "Slow lullaby in dorian.", "place_room_playroom": "Playful xylophone and music box.",
    "place_room_dorm": "Three-voice canon lullaby.", "place_room_kuki": "Pastoral meadow with wind.", "place_room_ned": "Swing snack nook with crunch figure.",
    "place_room_james": "Quietest hideout.", "place_room_glen": "Jazz ballad reading corner.", "place_room_racuch": "Hopping playful tune.",
    "place_room_default": "Neutral warm tune.", "mg_veggie_rain": "Bouncy upbeat chiptune.", "mg_hay_maze": "Tense but sweet minor ostinato.",
    "mg_veggie_memory": "Calm music box, no pressure.", "mg_nyan_cuy": "Fast original chiptune dance.", "mg_menu": "Short happy shuffle.",
}


def seed(i):
    return zlib.crc32(i.encode()) % 100000


def esc_pipe(s):
    return str(s).replace("|", "\\|")


def tonic_chord(r):
    return r.get("tonic") or T.default_tonic(r["root"], r["mode"])


def key_text(root, mode):
    return "%s %s" % (root.replace("b", "♭").replace("#", "♯"), T.MODE_PL[mode])


def expanded(prog):
    return T.parse_prog(prog)


def chord_at(cyc, b):
    return " ".join(cyc[(b - 1) % len(cyc)])


def chord_dict(chords, root, mode):
    seen = []
    for c in chords:
        if c not in seen:
            seen.append(c)
    rows = []
    for c in seen:
        notes, bass = T.chord_notes(c)
        rows.append("`%s` = %s%s" % (c, " ".join(notes), (" (bas %s)" % bass if bass else "")))
    return rows


def chord_lines(chords_by_bar, start=1):
    """chords_by_bar: lista akordów na takt (str) od taktu start; zwraca wiersze po 8 taktów."""
    lines = []
    for i in range(0, len(chords_by_bar), 8):
        chunk = chords_by_bar[i:i + 8]
        lines.append("takty %d-%d: " % (start + i, start + i + len(chunk) - 1) + " | ".join(chunk))
    return lines


def motif_text(root, mode, inv=False):
    degs = [5, 3, 2, 1] if inv else [1, 2, 3, 5]
    names = [T.note_name(root, mode, d)[0] for d in degs]
    return names


def sig_text(root, mode, shift=0):
    return " ".join(T.note_name(root, mode, d + shift)[0] for d in (2, 3, 5))


def melody_table(table, root, mode, shift, label):
    rows = ["| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |", "| --- | --- |"]
    for i, b in enumerate(table, 1):
        rows.append("| %d | %s |" % (i, T.render_bar(b, root, mode, shift)))
    best = {}
    for b in table:
        for d, t in T.parse_skel(b):
            if d != "r":
                nm, md = T.note_name(root, mode, int(d) + shift)
                best[md] = nm
    rows.append("")
    rows.append("Zakres %s: %s-%s." % (label, best[min(best)], best[max(best)]))
    return rows


def grid_rows(pattern, levels, meter, note=None):
    d = DRUMS[pattern]
    steps = d["steps"]
    hdr = "kroki: %s" % ("16 na takt (1 e & a)" if steps == 16 and meter == 4 else
                         "12 triolowych na takt (shuffle)" if steps == 12 and pattern == "shuffle" else "12 szesnastek na takt 3/4")
    rows = ["| Instrument | Poziom | Siatka (%s) |" % hdr, "| --- | --- | --- |"]
    for inst, db in levels.items():
        if inst in d:
            rows.append("| `%s` | %+d dB | `%s` |" % (inst, db, d[inst]))
        else:
            WARN.append("brak siatki %s w %s" % (inst, pattern))
    rows.append("")
    rows.append("`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`." + ((" " + note.rstrip(".") + ".") if note else ""))
    return rows


def default_reg(layer, root, mode):
    role, voice = layer[0], layer[1]
    if layer[6]:
        return layer[6]
    tn = T.note_name(root, mode, 1, 2)[0]
    if role == "bass":
        return "korzenie od %s, przejścia do oktawy 3 (nie poniżej E1)" % tn
    if role == "chd":
        return "voicing blisko, C3-G4 (nic poniżej C3)"
    if role == "pad":
        return "C3-C5, szeroko"
    if role == "mel":
        return "C4-G5 (wg szkieletu)"
    if role == "tex":
        return "oktawa 4-5"
    if role in ("orn", "extra"):
        return "oktawa 5-6"
    return "-"


def drums_in(r):
    return r.get("drums")


def layer_rows(layers, root, mode, default_enter=1, with_stem=False):
    hdr = "| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |"
    sep = "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
    if with_stem:
        hdr = hdr.replace("| # |", "| Stem | # |", 1)
        sep = "| --- " + sep
    rows = [hdr, sep]
    for i, ly in enumerate(layers, 1):
        enter = ly[5] if ly[5] else default_enter
        cells = [str(i), SER_MODE.get(ly[0], ly[0]), "`%s`" % ly[1], esc_pipe(ly[2]), default_reg(ly, root, mode),
                 esc_pipe(ly[4]), "%+d dB" % ly[3], str(enter), PAN.get(ly[0], "0")]
        if with_stem:
            cells = ["`%s`" % (ly[7] if len(ly) > 7 else "-")] + cells
        rows.append("| " + " | ".join(cells) + " |")
    return rows


def sec_lens_loop(n):
    if n == 16:
        return [8, 8]
    return T.section_lengths(n)


def name_sections(n):
    """Nazwy sekcji: A, A', B, A'', potem blokami od końca (ostatni zawsze typu A)."""
    lens = T.section_lengths(n) if n != 16 else [8, 8]
    names = ["A", "Aʹ", "B", "A″"][: min(len(lens), 4)]
    ext = lens[4:]
    if ext:
        labels = []
        a_names = ["A‴", "A‵", "A‶"]
        b_names = ["B′", "B″"]
        ai, bi = 0, 0
        typ_last = "A"
        seq = []
        for k in range(len(ext) - 1, -1, -1):
            typ = "A" if (len(ext) - 1 - k) % 2 == 0 else "B"
            seq.append(typ)
        seq.reverse()
        for t in seq:
            if t == "A":
                labels.append(a_names[ai]); ai += 1
            else:
                labels.append(b_names[bi]); bi += 1
        names += labels
    out, b = [], 1
    for nm, l in zip(names, lens):
        out.append((nm, b, b + l - 1))
        b += l
    return out


def is_b(name):
    return name.startswith("B")


def section_text(name, ln, r, role):
    if is_b(name):
        return "kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie)" if role == "rec_a1" else "kontrast: szkielet B"
    if name == "A":
        return "temat: szkielet A, takty 1-2 = motyw Cuy"
    if name == "Aʹ":
        return "temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu)"
    return "temat wraca w pełnej aranżacji (szkielet A)" if ln >= 4 else "temat"


def english_prompt(r, bpm, drum_on, voices, extra=""):
    key = "%s %s" % (r["root"], {"major": "major", "minor": "natural minor", "dorian": "dorian", "mixolydian": "mixolydian", "lydian": "lydian"}[r["mode"]])
    vs = ", ".join(EN_VOICE.get(v, v) for v in voices if v in EN_VOICE)
    return ("Cozy chiptune-lofi game music for a guinea-pig pet game, %s, %d BPM, %s time%s. Instruments: %s. %s"
            "No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. %s" %
            (key, bpm, "3/4" if r["meter"] == 3 else "4/4", (", swing %d%%" % r["swing"]) if r.get("swing", 50) > 50 else "", vs,
             "" if drum_on else "No drums. ", extra)).strip()


def common_block(r, i, kind):
    root, mode = r["root"], r["mode"]
    scale = T.scale_notes(root, mode)
    pent = T.pent_names(root, mode)
    mot = " ".join(motif_text(root, mode))
    sig = sig_text(root, mode)
    rows = ["| Parametr | Wartość |", "| --- | --- |",
            "| Tonacja | %s |" % key_text(root, mode),
            "| Gama | %s |" % " ".join(scale),
            "| Pentatonika (melodia) | %s |" % " ".join(pent),
            "| Motyw Cuy (stopnie 1 2 %s 5) | %s, rytm ♪ ♪ ♪ ♩. |" % ("♭3" if mode in T.MINORISH else "3", mot),
            "| Podpis Cuy (stopnie 2 3 5) | %s, rytm ♪ ♪ ♩ |" % sig,
            "| Akord toniczny | %s |" % tonic_chord(r),
            "| Metrum | %s |" % ("3/4" if r["meter"] == 3 else "4/4"),
            "| Swing | %d%% |" % r.get("swing", 50),
            "| Seed bazowy | %d (A1 +0, A2 +1, B1 +2, B2 +3) |" % seed(i)]
    return rows


def record_md(i, r):
    root, mode, meter = r["root"], r["mode"], r["meter"]
    beats = 4 if meter == 4 else 3
    a1, a2, b1, b2 = r["tempi"]
    N = r["bars"]
    ser = SERIES[r["series"]]
    cyc = expanded(r["prog"])
    drums = r.get("drums")
    inv = r.get("inv", False)
    shift = r.get("mel_shift", 0)
    A, B = list(T.SKEL_A[r["skel"]]), T.SKEL_B[r["skelB"]]
    if inv:
        A[0] = "5:.5 3:.5 2:.5 1:1.5 r:1"
        A[1] = "r:1 3:.5 2:.5 1:2"
    out = []
    w = out.append
    w("# MT-%d · %s · %s" % (r["mt"], i, r["title"]))
    w("")
    w("> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.")
    w("> Pliki wynikowe: `rec_%s_a1`, `rec_%s_a2`, `rec_%s_b1`, `rec_%s_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje)." % ((i,) * 4))
    w("> Seria %d (%s), rzadkość: **%s**." % (r["series"], ser["name"], r["rarity"]))
    w("")
    w("## 0. Styl wspólny (wkleić na początek każdego promptu)")
    w("")
    w("> " + STYLE_BASE)
    w("")
    w("## 1. Parametry wspólne dla czterech utworów")
    w("")
    out.extend(common_block(r, i, "record"))
    w("")
    w("Charakter płyty: **%s**." % r["distinct"])
    w("Efekty serii: %s." % ser["fx"] + ((" " + r["fx_extra"] + ".") if r.get("fx_extra") else ""))
    if r.get("only_note"):
        w("**Uwaga:** %s" % r["only_note"])
    w("")
    w("### 1.1 Słownik akordów")
    w("")
    chs = [c for bar in cyc for c in bar] + [c for bar in expanded(r["bridge"]) for c in bar] + [tonic_chord(r)]
    for row in chord_dict(chs, root, mode):
        w("- " + row)
    w("")
    w("### 1.2 Progresja (cykl)")
    w("")
    w("Cykl %d taktów, powtarzany; takt n gra akord (n−1 mod %d)+1. Zapis: `%s`" % (len(cyc), len(cyc), r["prog"]))
    w("")
    w("### 1.3 Melodia: szkielet A (temat) i B (kontrast)")
    w("")
    mel_mode = r.get("mel_mode")
    if inv:
        w("**Wariant płyty:** w taktach 1-2 motyw w ODWRÓCENIU (%s, rytm ♪ ♪ ♪ ♩.), reszta szkieletu bez zmian." % " ".join(motif_text(root, mode, True)))
        w("")
    w("Szkielet A `%s`:" % r["skel"])
    w("")
    out.extend(melody_table(A, root, mode, shift, "A"))
    w("")
    w("Szkielet B `%s`:" % r["skelB"])
    w("")
    out.extend(melody_table(B, root, mode, shift, "B"))
    w("")
    if mel_mode == "sparse":
        w("**Tryb rzadki tej płyty:** po motywie w taktach 1-2 melodia gra jedną nutę na takt (półnuta ligowana do końca taktu), nuta z pentatoniki, ruch ≤ 1 stopień pentatoniki od poprzedniej, wybór z `seed`; podpis w ostatnich 2 taktach. Szkielet A pełni rolę tylko dla taktów 1-2.")
        w("")
    w("Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 %s`), takt N = tonika (%s) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.\n" %
      (" ".join("%s·½" % n for n in sig_text(root, mode).split()[:2]) + " " + sig_text(root, mode).split()[2] + "·1", tonic_chord(r)))
    # ---- A1
    sec = name_sections(N)
    dA1 = T.seconds(N, a1, beats)
    w("---")
    w("")
    w("## 2. Utwór A1 (podpisowy): `rec_%s_a1`" % i)
    w("")
    w("- Tempo **%d BPM**, %s, **%d taktów**, czas **%.0f s** (%d:%02d)." % (a1, "3/4" if meter == 3 else "4/4", N, dA1, dA1 // 60, dA1 % 60))
    w("- Pierwsze 2 takty cytują motyw Cuy%s; ostatnie 2 takty: podpis i tonika." % (" (odwrócony)" if inv else ""))
    if not 90 <= dA1 <= 120:
        WARN.append("%s A1 %.0f s" % (i, dA1))
    w("")
    w("**Forma i aranżacja**")
    w("")
    w("| Takty | Sekcja | Melodia / aranżacja |")
    w("| --- | --- | --- |")
    for k_, (nm, s, e) in enumerate(sec):
        extra_ = ("; takt %d = podpis Cuy, takt %d = tonika %s trzymana, ogon pogłosu" % (N - 1, N, tonic_chord(r))) if k_ == len(sec) - 1 else ""
        w("| %d-%d | %s | %s%s |" % (s, e, nm, section_text(nm, e - s + 1, r, "rec_a1"), extra_))
    w("")
    w("**Akordy takt po takcie**")
    w("")
    bars = [chord_at(cyc, b) for b in range(1, N + 1)]
    bars[-1] = tonic_chord(r)
    for ln in chord_lines(bars):
        w("- " + ln)
    w("")
    w("**Warstwy**")
    w("")
    ly = list(r["layers"])
    out.extend(layer_rows(ly, root, mode))
    w("")
    if drums:
        w("**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na %d. ćwierćnucie)" % beats)
        w("")
        out.extend(grid_rows(drums[0], drums[1], meter, r.get("drum_note")))
    else:
        w("**Perkusja:** brak.")
    w("")
    w("**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).")
    w("")
    if r.get("a2_note"):
        pass
    voices = []
    for l_ in ly:
        if l_[1] in EN_VOICE and l_[1] not in voices:
            voices.append(l_[1])
    if drums:
        for k in drums[1]:
            if k in EN_VOICE and k not in voices:
                voices.append(k)
    w("**Prompt do zewnętrznego generatora (angielski):** " + english_prompt(r, a1, bool(drums), voices, "Opening two bars state a four-note motif (%s). %s" % (" ".join(motif_text(root, mode)), EN_CHAR.get(i, "") )))
    w("")
    w("**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: %s, (3) zakaz: %s, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5." % (r["distinct"], r["forbid"]))
    w("")
    # ---- A2
    N2 = N
    if T.seconds(N2, a2, beats) > 120:
        N2 = N - 4
        WARN.append("%s A2 skrócone do %d taktów (>120 s)" % (i, N2))
    sec2 = name_sections(N2)
    d2 = T.seconds(N2, a2, beats)
    w("---")
    w("")
    w("## 3. Utwór A2 (spokojny): `rec_%s_a2`" % i)
    w("")
    w("- Tempo **%d BPM**, **%d taktów**%s, czas **%.0f s**." % (a2, N2, (" (A1 minus 4: blok powtórki wycięty, by zmieścić się w 120 s)" if N2 != N else ""), d2))
    w("- Ta sama progresja i szkielety melodii co A1.")
    w("")
    w("**Zmiany względem A1 (obowiązkowe)**")
    w("")
    w("1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).")
    w("2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.")
    w("3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.")
    w("4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.")
    w("5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).")
    w("")
    w("**Forma:** " + "; ".join("%d-%d %s" % (s, e, nm) for nm, s, e in sec2) + ".")
    w("")
    w("**Akordy takt po takcie**")
    w("")
    cyc2 = [chord_at(cyc, b) for b in range(1, N2 + 1)]
    cyc2[-1] = tonic_chord(r)
    for ln in chord_lines(cyc2):
        w("- " + ln)
    w("")
    w("**Warstwy aktywne:** " + ", ".join("`%s` (%s, %+d dB)" % (l_[1], SER_MODE.get(l_[0], l_[0]), l_[3]) for l_ in ly if l_[0] != "extra" and l_[1] != "HAT") + ".")
    w("")
    w("**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.")
    w("")
    # ---- B1
    bridge = expanded(r["bridge"])
    assert len(bridge) == 8, (i, len(bridge))
    bridge_full = bridge
    ins = sum(l for l in T.section_lengths(N)[:3])
    bl = 8
    if T.seconds(N + 8, b1, beats) > 120:
        bl = 4
        bridge = bridge[:4]
    NB = N + bl
    dB1 = T.seconds(NB, b1, beats)
    w("---")
    w("")
    w("## 4. Utwór B1 (energiczny): `rec_%s_b1`" % i)
    w("")
    w("- Tempo **%d BPM**, **%d taktów** (A1 + mostek %d taktów po takcie %d%s), czas **%.0f s**." % (b1, NB, bl, ins, " — skrócony z 8, by zmieścić się w 120 s" if bl == 4 else "", dB1))
    if dB1 > 120:
        WARN.append("%s B1 %.0f s" % (i, dB1))
    w("- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.")
    w("")
    w("**Forma**")
    w("")
    w("| Takty | Sekcja | Opis |")
    w("| --- | --- | --- |")
    pos = 1
    for k, (nm, s, e) in enumerate(sec):
        l_ = e - s + 1
        w("| %d-%d | %s | %s |" % (pos, pos + l_ - 1, nm, section_text(nm, l_, r, "b1")))
        pos += l_
        if k == 2:
            w("| %d-%d | Mostek | szkielet B (takty %s) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |" % (pos, pos + bl - 1, "1-8" if bl == 8 else "5-8"))
            pos += bl
    w("")
    w("**Akordy takt po takcie** (mostek: `%s`)" % " | ".join(" ".join(x) for x in bridge))
    w("")
    chB = []
    for b in range(1, NB + 1):
        if b <= ins:
            chB.append(chord_at(cyc, b))
        elif b <= ins + bl:
            chB.append(" ".join(bridge[b - ins - 1]))
        else:
            chB.append(chord_at(cyc, b - bl))
    chB[-1] = tonic_chord(r)
    for ln in chord_lines(chB):
        w("- " + ln)
    w("")
    w("**Zmiany względem A1**")
    w("")
    cv = r["counter"]
    w("1. Kontrmelodia `%s` (%+d dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi." % (cv[0], cv[1]))
    if drums:
        lv = {k: v + 2 for k, v in drums[1].items()}
        w("2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):")
        w("")
        out.extend(grid_rows(drums[0], lv, meter, r.get("drum_note")))
    else:
        w("2. Płyta bez perkusji w A1: w B1 dochodzi cichy `SHK` (-22 dB, ósemki) i `BRSH` na 2 i 4 (-20 dB).")
    if r.get("b1_extra"):
        w("3. " + r["b1_extra"] + ".")
    w("")
    w("**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.")
    w("")
    # ---- B2
    nb2 = T.b2_bars(b2, beats)
    dB2 = T.seconds(nb2, b2, beats)
    if not 85 <= dB2 <= 120:
        WARN.append("%s B2 %.0f s" % (i, dB2))
    loop4 = cyc[:4]
    w("---")
    w("")
    w("## 5. Utwór B2 (nastrojowy): `rec_%s_b2`" % i)
    w("")
    w("- Tempo **%d BPM** (A1 × 0,8), **%d taktów**, czas **%.0f s**, bez perkusji." % (b2, nb2, dB2))
    w("- Pętla 4 akordów z pierwszych taktów A1: `%s`; powtarzana %d razy." % (" | ".join(" ".join(x) for x in loop4), nb2 // 4))
    w("")
    w("**Warstwy**")
    w("")
    bz = r["b2"]
    solo = bz["solo"]
    rows = ["| Warstwa | Głos | Poziom | Opis |", "| --- | --- | --- | --- |",
            "| pad | `PAD` | %+d dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |" % bz.get("pad_db", -6)]
    if solo:
        rows.append("| solo | `%s` | -3 dB | %s |" % (solo[0], solo[1]))
    n = bz["noise"]
    if n:
        rows.append("| szum | `%s` | %+d dB | %s |" % (n[0], n[1], n[2] or "szum serii"))
    else:
        rows.append("| szum | `%s` | %+d dB | szum serii (domyślny) |" % (ser["noise"], ser["noise_db"]))
    out.extend(rows)
    w("")
    w("**Przebieg**")
    w("")
    w("- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo%s." % ("" if solo else " (grany przez najwyższy głos padu)"))
    w("- Takty 3-%d: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki %s, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu." % (nb2 - 4, " ".join(T.pent_names(root, mode))))
    w("- Takty %d-%d: motyw Cuy w odwróceniu: %s, jedna nuta na takt (całe takty); ostatni takt: tonika %s, ogon zostaje." % (nb2 - 3, nb2, " ".join(motif_text(root, mode, True)), tonic_chord(r)))
    w("- Całość %s. Bez perkusji, bez basu rytmicznego." % ser["fx"].split(",")[0])
    w("")
    w("**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.")
    w("")
    w("---")
    w("")
    w("## 6. Odbiór płyty (wszystkie cztery)")
    w("")
    w("1. Cztery pliki OGG w `assets/music/records/%s/` (nazwy `rec_%s_{a1,a2,b1,b2}.ogg`).\n2. `node tools/qa/music-audit.js` zielony.\n3. Wiersz w `docs/music_review/MT-%d.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).\n4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.\n5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`)." % (i, i, r["mt"]))
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
def loop_md(i, r):
    root, mode, meter = r["root"], r["mode"], r["meter"]
    beats = 4 if meter == 4 else 3
    N, bpm = r["bars"], r["bpm"]
    cyc = expanded(r["prog"])
    shift = r.get("mel_shift", 0)
    sd = T.seconds(N, bpm, beats)
    out = []
    w = out.append
    w("# MT-%d · %s · %s" % (r["mt"], i, r["title"]))
    w("")
    w("> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.")
    w("> Plik wynikowy: %s (OGG, %d LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek)." % (
        "`assets/music/minigames/%s_{base,rhythm,lead}.ogg`" % i if r["kind"] == "minigame" and r["layers"] and len(r["layers"][0]) > 7 else "`assets/music/%s/%s.ogg`" % ({"bed": "beds", "place": "places", "room": "places", "minigame": "minigames", "theme": "home"}[r["kind"]], i), r["lufs"]))
    w("")
    w("## 0. Styl wspólny")
    w("")
    w("> " + STYLE_BASE)
    w("")
    w("## 1. Parametry")
    w("")
    rows = ["| Parametr | Wartość |", "| --- | --- |", "| Rola | %s |" % r["role"],
            "| Tempo | %d BPM%s |" % (bpm, " (3/4)" if meter == 3 else ""), "| Metrum | %s |" % ("3/4" if meter == 3 else "4/4"),
            "| Swing | %d%% |" % r.get("swing", 50), "| Takty | %d (%.0f s, %d:%02d) |" % (N, sd, sd // 60, sd % 60),
            "| Tonacja | %s |" % key_text(root, mode), "| Gama | %s |" % " ".join(T.scale_notes(root, mode)),
            "| Pentatonika | %s |" % " ".join(T.pent_names(root, mode)),
            "| Motyw Cuy | %s, ♪ ♪ ♪ ♩. |" % " ".join(motif_text(root, mode)),
            "| Podpis Cuy | %s, ♪ ♪ ♩ |" % sig_text(root, mode, shift),
            "| Głośność | %d LUFS |" % r["lufs"], "| Seed | %d |" % seed(i)]
    out.extend(rows)
    if r["kind"] in ("bed",) and not 120 <= sd <= 240:
        WARN.append("%s belka %.0f s poza 2-4 min" % (i, sd))
    if r["kind"] in ("place", "room") and not 60 <= sd <= 125:
        WARN.append("%s pętla %.0f s" % (i, sd))
    w("")
    w("Charakter: **%s**. Efekty: %s." % (r["distinct"], r["fx"]))
    w("")
    w("### 1.1 Słownik akordów")
    w("")
    for row in chord_dict([c for bar in cyc for c in bar], root, mode):
        w("- " + row)
    w("")
    w("### 1.2 Akordy takt po takcie")
    w("")
    allb = [chord_at(cyc, b) for b in range(1, N + 1)]
    if len(cyc) != N:
        w("(cykl %d taktów: `%s`)" % (len(cyc), r["prog"]))
        w("")
    for ln in chord_lines(allb):
        w("- " + ln)
    w("")
    # sekcje
    if r.get("form"):
        form = r["form"]
        w("### 1.3 Forma")
        w("")
        w("| Takty | Sekcja | Tonacja | Opis |")
        w("| --- | --- | --- | --- |")
        for nm, s, e, rt, md, ds in form:
            w("| %d-%d | %s | %s | %s |" % (s, e, nm, key_text(rt, md), ds))
        w("")
    else:
        sec = name_sections(N)
        w("### 1.3 Forma")
        w("")
        w("| Takty | Sekcja |")
        w("| --- | --- |")
        for nm, s, e in sec:
            w("| %d-%d | %s |" % (s, e, nm))
        w("")
    # melodia
    mm = r.get("mel_mode")
    w("### 1.4 Melodia")
    w("")
    if mm == "none":
        w("Brak melodii ciągłej i brak motywu Cuy.")
    elif mm in ("sparse1", "sparse2"):
        per = 1 if mm == "sparse1" else 2
        pent = " ".join(T.pent_names(root, mode))
        w("Tryb rzadki: **1 nuta na %s**, wartość = cały okres, pentatonika %s, start na 5. stopniu pentatoniki, ruch ≤ 1 stopień pentatoniki, wybór z `seed`; nuta zawsze zgodna z akordem (3., 5., 9. lub 6. stopień). Frazy symetryczne co 4 okresy (powtórzenie konturu)." % ("takt" if per == 1 else "2 takty", pent))
        if r.get("sig") and r["sig"] != "none":
            w("Podpis Cuy (%s) wchodzi zamiast zwykłej nuty w miejscach z sekcji „Podpis”." % sig_text(root, mode, shift))
    else:
        A = T.SKEL_A[r["skel"]]
        B = T.SKEL_B[r["skelB"]]
        forms = r.get("form")
        rt_b, md_b = root, mode
        if forms:
            for nm, s, e, rt, md, ds in forms:
                if nm.startswith("B"):
                    rt_b, md_b = rt, md
        if mm == "phrase24":
            w("Tryb fraz: melodia gra w oknach 2 taktów co 4 takty: takty 1-2 = szkielet A takty 1-2 (motyw), 5-6 = szkielet A takty 3-4, 9-10 = takty 5-6, 13-14 = takty 7-8. Pozostałe takty cisza.")
            w("")
        w("Szkielet A `%s`:" % r["skel"])
        w("")
        out.extend(melody_table(A, root, mode, shift, "A"))
        w("")
        if any(not x.startswith("A") for x in [n for n, _, _ in name_sections(N)]) or r.get("form"):
            w("Szkielet B `%s` (tonacja %s):" % (r["skelB"], key_text(rt_b, md_b)))
            w("")
            out.extend(melody_table(B, rt_b, md_b, shift, "B"))
            w("")
        w("Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.")
    w("")
    sg = r.get("sig", "none")
    w("### 1.5 Podpis Cuy")
    w("")
    if sg == "none":
        w("Brak podpisu w tym utworze.")
    else:
        bars_ = []
        if sg.startswith("bar"):
            bars_ = [int(x) for x in sg[3:].split("+")]
        w("Podpis (%s) w taktach: %s; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1)." % (
            sig_text(root, mode, shift) if not (r.get("form") and any(f[3] != root for f in r["form"])) else
            " / ".join("%s: %s" % (f[1], sig_text(f[3], f[4], shift)) for f in r["form"]),
            ", ".join(str(b) for b in bars_)))
    w("")
    w("## 2. Warstwy")
    w("")
    ly = r["layers"]
    has_stem = bool(ly and len(ly[0]) > 7)
    if has_stem:
        w("Każdy stem ma tę samą liczbę próbek, to samo tempo i te same punkty pętli; `_full` powstaje automatycznie (suma trzech stemów, bez pracy twórczej).")
        w("")
    out.extend(layer_rows(ly, root, mode, 1, has_stem))
    w("")
    if r.get("drums"):
        w("**Perkusja**")
        w("")
        out.extend(grid_rows(r["drums"][0], r["drums"][1], meter))
        w("")
    else:
        w("**Perkusja:** brak.")
        w("")
    w("**Przebieg / dynamika**")
    w("")
    for d in r.get("dyn", []):
        w("- " + d)
    w("- Pętla: %s." % r["loop_note"])
    w("")
    voices = []
    for l_ in ly:
        for v_ in l_[1].split("/"):
            if v_ in EN_VOICE and v_ not in voices:
                voices.append(v_)
    w("**Prompt do zewnętrznego generatora (angielski):** " + english_prompt(r, bpm, bool(r.get("drums")), voices, EN_CHAR.get(i, "") + " Seamless loop."))
    w("")
    w("**Zakaz:** %s." % r["forbid"])
    w("")
    w("**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: %s, (3) szew pętli niesłyszalny (test 5× pętli), (4) %d LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-%d.md`." % (r["distinct"], r["lufs"], r["mt"]))
    return "\n".join(out) + "\n"


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    for i, r in sorted(R.items(), key=lambda kv: kv[1]["mt"]):
        fn = "MT-%d_%s.md" % (r["mt"], i)
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            f.write(record_md(i, r))
        index.append((r["mt"], i, r["title"], "płyta, seria %d, %s, 4 utwory" % (r["series"], r["rarity"]), fn))
    for i, r in sorted(L.items(), key=lambda kv: kv[1]["mt"]):
        fn = "MT-%d_%s.md" % (r["mt"], i)
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            f.write(loop_md(i, r))
        index.append((r["mt"], i, r["title"], r["kind"], fn))
    # jingle i szumy: osobne moduły
    import catalog_special as S
    for mt, i, title, kind, body in S.items():
        fn = "MT-%d_%s.md" % (mt, i)
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            f.write(body)
        index.append((mt, i, title, kind, fn))
    index.sort()
    with open(os.path.join(OUT, "INDEX.md"), "w", encoding="utf-8") as f:
        f.write("# Prompty muzyczne: indeks\n\nWygenerowane przez `python3 tools/music/gen_prompts.py`. Jedno zadanie = jeden plik. Wspólna tabela głosów i zasady: `docs/music_prompts/README.md`.\n\n| ID | Plik/identyfikator | Tytuł | Rodzaj | Prompt |\n| --- | --- | --- | --- | --- |\n")
        for mt, i, title, kind, fn in index:
            f.write("| MT-%d | `%s` | %s | %s | [%s](%s) |\n" % (mt, i, title, kind, fn, fn))
    print("zapisano %d promptów" % len(index))
    for w_ in WARN:
        print("UWAGA:", w_)


if __name__ == "__main__":
    main()
