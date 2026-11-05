"""Katalog 24 płyt: dane źródłowe do promptów (gen_prompts.py). Edytuj tu, nie w docs/music_prompts/."""

# Warstwa: (rola, głos, partia, dB, wzór, wejście_od_taktu | None, rejestr | None)
# role: mel, chd, bass, pad, tex, orn, extra, noise
SERIES = {
    1: dict(name="Siano & lofi", noise="noise_vinyl_crackle", noise_db=-38,
            fx="TAPE(0.2%) na całość, LP(9 kHz), REV-S 12%, VINYL(-46 dB) pod całością (cichutko)"),
    2: dict(name="Ogród", noise="noise_wind", noise_db=-30,
            fx="REV-M 14% na melodii, bez TAPE, bez VINYL; powietrzny, szeroki stereo"),
    3: dict(name="Nocne zabawy", noise="noise_room_tone", noise_db=-34,
            fx="REV-L 25% na melodii, TAPE(0.3%), LP(8 kHz); miękkie ataki"),
    4: dict(name="Retro 70-90", noise="eter", noise_db=-42,
            fx="CRUSH tylko na perkusji, REV-S 8%, bez TAPE (poza s4_kaseta); wolno P50 i ostrzejszy kit"),
}

R = {}


def rec(**kw):
    R[kw["id"]] = kw


rec(id="s1_poranek", mt=101, title="Poranek w sianie", series=1, rarity="common",
    root="C", mode="major", meter=4, tempi=(78, 70, 84, 62), bars=32, swing=58,
    prog="Cmaj9 | Am9 | Dm9 | G13 (x2) | Fmaj9 | Em7 | Dm9 | G13sus G13 (x2)",
    skel="pas", skelB="pas", drums=("lofi", dict(KICK=-12, HAT=-16, SNR=-14)),
    layers=[("mel", "P12", "melodia, dłuższe nuty pentatoniczne C-D-E-G-A", -3, "wg szkieletu 'pas'", None, None),
            ("chd", "EP", "akordy na „i” 2 i 4 (kroki 7 i 15 siatki 16)", -6, "krótkie, zanik 600 ms", None, None),
            ("bass", "TRI", "wolny puls: korzeń na 1, kwinta na 3", -4, "półnuty", None, None),
            ("noise", "noise_birds", "ćwierkanie w tle", -24, "pętla przez cały utwór", 1, None)],
    bridge="Fmaj9 | Em7 | Dm9 | Cmaj9/E | Fmaj9 | Gm9 | C13 | Fmaj9", counter=("GLK", -9),
    b2=dict(solo=("P12", "C5 E5 G5, jedna nuta na takt lub dwa"), noise=("noise_birds", -30, "zamiast winylu")),
    distinct="poranny lo-fi hip-hop z ptakami; winyl ledwo słyszalny", forbid="głośny werbel; basowy puls szybszy niż półnuty")

rec(id="s1_marchewka", mt=102, title="Marchewkowy beat", series=1, rarity="common",
    root="G", mode="major", meter=4, tempi=(84, 76, 91, 67), bars=36, swing=56,
    prog="Gmaj9 | Em9 | Cmaj9 | D13 (x2) | Bm7 | Em9 | Am9 | D13 (x2)",
    skel="std", skelB="std", drums=("lofi", dict(KICK=-12, SNR=-12, HAT=-14)),
    layers=[("mel", "P12", "frazy trzynutowe wskazujące w górę (G4 A4 B4, A4 B4 D5)", -3, "wg szkieletu 'std'", None, None),
            ("bass", "PIZ", "bas szarpany synkopowany", -3, "kroki 1, „i” 2, 3, „i” 4 (siatka 16: 1, 7, 9, 15)", None, None),
            ("chd", "EP", "akordy", -8, "na „i” 2 i 4", None, None)],
    drum_note="„chrupiący” hi-hat: otwarty hat 160 ms na „i” 4 (krok 15)",
    bridge="Em9 | Am9 | D13 | Gmaj9 | Cmaj9 | Am9 | D13sus D13 | Gmaj9", counter=("GLK", -9),
    b2=dict(solo=("PIZ", "powolne korzenie G2-D3, półnuty"), noise=None),
    distinct="chrupanie w hi-hat (otwarty hat na „i” 4)", forbid="szybkie nuty melodii (>ósemki)")

rec(id="s1_deszcz", mt=103, title="Deszcz na dachu", series=1, rarity="common",
    root="Eb", mode="major", meter=4, tempi=(66, 59, 71, 53), bars=28, swing=62,
    prog="Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 (x3)",
    skel="bal", skelB="pas", drums=("brush", dict(BRSH=-16)),
    layers=[("mel", "EP", "balladowy fortepian, melodia", -2, "wg szkieletu 'bal'", None, None),
            ("chd", "EP", "akordy rozłożone ósemkami", -6, "arpeggio w górę", None, None),
            ("bass", "TRI", "bas co 2 takty (korzeń, półnuta ligowana)", -6, "takty nieparzyste", None, None),
            ("noise", "noise_rain", "deszcz na dachu przez cały utwór", -26, "w A2: -22", 1, None)],
    bridge="Abmaj9 | Gm7 | Fm9 | Bb13 | Ebmaj9 | Cm9 | Fm9 | Bb13", counter=("BELL", -9),
    b2=dict(solo=("EP", "melodia w oktawie 4, długie nuty"), noise=("noise_rain", -20, "głośniejszy deszcz")),
    distinct="deszcz w tle, ballada jazzowa", forbid="stopa; solo dłuższe niż 4 takty")

rec(id="s1_kubek", mt=104, title="Kubek z parą", series=1, rarity="common",
    root="F", mode="major", meter=4, tempi=(92, 83, 99, 74), bars=40, swing=50,
    prog="Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 (x2) | Bbmaj9 | Am7 D7♭9 | Gm9 | C13 (x2)",
    skel="syn", skelB="syn", drums=("bossa", dict(BRSH=-12)),
    layers=[("bass", "TRI", "bossanowy bas", -4, "wzór (1, -, 5, 5) na 4 ćwierćnuty", None, None),
            ("chd", "P25", "akordy w rytmie bossy", -6, "ósemki X..X..X. (kroki 1,4,7 co pół taktu)", None, None),
            ("mel", "P12", "melodia lekka", -3, "wg szkieletu 'syn'", None, None),
            ("noise", "para", "para z kubka: szum różowy HP(3 kHz), obwiednia narastająca i opadająca co 4 takty", -30, "generowany w locie", 1, None)],
    bridge="Bbmaj9 | Am7 | Gm9 | C13 | Fmaj9 | Dm9 | Gm9 | C13", counter=("CEL", -9),
    b2=dict(solo=("BELL", "A5 C6 E6 rzadkie"), noise=("para", -30, "para zamiast winylu")),
    distinct="bossa nova z parą nad kubkiem", forbid="werbel; zbyt głośne miotełki")

rec(id="s1_nocna", mt=105, title="Nocna ścieżka", series=1, rarity="rare",
    root="D", mode="dorian", meter=4, tempi=(122, 110, 132, 98), bars=56, swing=66,
    prog="Dm9 | G13 | Dm9 | G13 (x2) | Em9 | A13 | Dm9*2 (x2)",
    skel="syn", skelB="syn", drums=("shuffle", dict(SNR=-12, KICK=-14, HAT=-14)),
    layers=[("bass", "TRI", "walking bass ćwierćnutami (korzeń-kwinta-przejście)", -3, "4 ćwierćnuty/takt", None, None),
            ("chd", "EP", "stabsy", -6, "na „i” 2 i 4", None, None),
            ("mel", "P12", "melodia dorycka (D-F-G-A-C)", -3, "wg szkieletu 'syn'", None, None),
            ("extra", "BELL", "dodatkowy głos płyty rzadkiej: blue-note (Ab jako przejście do G), pojedyncza nuta", -12, "co 8 taktów, 2. połowa taktu", 9, None)],
    drum_note="SNR to miotełkowy szum 3-8 kHz, miękki; KICK cicha tylko na 1",
    bridge="Gm9 | C13 | Fmaj9 | Bb13 | Em9 | A13 | Dm9 | A7♭9", counter=("GLK", -10),
    b2=dict(solo=("EP", "melodia dorycka D-F-G-A-C, długie nuty"), noise=None),
    distinct="blues dorycki, walking bass i blue-note dzwonka", forbid="werbel pełny; crash")

rec(id="s1_cichy", mt=106, title="Cichy kąt", series=1, rarity="common",
    root="C", mode="major", meter=4, tempi=(60, 54, 65, 48), bars=24, swing=50,
    prog="Cmaj7 | Am7 | Dm7 | G7 (x6)",
    skel="pas", skelB="pas", drums=None,
    layers=[("mel", "BOX", "melodia", -3, "wg szkieletu 'pas'", None, None),
            ("chd", "BOX", "akord rozłożony (arpeggio w górę, ósemki)", -6, "jedna nuta na ćwierćnutę", None, None),
            ("noise", "noise_room_tone", "cisza pokoju", -40, "ciągły", 1, None)],
    only_note="Tylko pozytywka: bez basu, bez pada, bez perkusji (także w B1).",
    bridge="Fmaj7 | Em7 | Dm7 | G7 | Am7 | Dm7 | G7sus G7 | Cmaj7", counter=("CEL", -9),
    b2=dict(solo=("BOX", "melodia z pozytywki, 1 nuta na takt"), noise=None, pad_db=-18),
    distinct="najprostsza płyta: sama pozytywka", forbid="każdy inny głos poza BOX/CEL/PAD (B2)")

# ---- seria 2
rec(id="s2_rosa", mt=107, title="Rosa", series=2, rarity="common",
    root="G", mode="major", meter=4, tempi=(72, 65, 78, 58), bars=32, swing=50,
    prog="Gmaj7 | Cmaj7 | Am7 | D7sus (x2) | Em7 | Bm7 | Cmaj7 | D7 (x2)",
    skel="pas", skelB="pas", drums=("gentle", dict(SHK=-22)),
    layers=[("mel", "P12", "melodia pastoralna", -3, "wg szkieletu 'pas'", None, None),
            ("orn", "BELL", "krople rosy: pojedyncze nuty losowo (G6, D6)", -10, "losowo z seed, 1 nuta na 1-3 takty", 3, None),
            ("pad", "PAD", "pad", -9, "długie akordy", None, None),
            ("bass", "TRI", "bas co 2 takty (korzeń)", -8, "takty nieparzyste", None, None)],
    drum_note="SHK ósemki rzadko (co drugi takt, tylko 4 uderzenia)",
    bridge="Em7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Bm7 | Am7 | D7sus D7", counter=("GLK", -9),
    b2=dict(solo=("BELL", "krople G6/D6, jedna nuta na 1-2 takty"), noise=("noise_birds", -30, None)),
    distinct="krople rosy (dzwonki)", forbid="perkusja inna niż rzadki SHK")

rec(id="s2_pietruszka", mt=108, title="Pietruszka funk", series=2, rarity="common",
    root="E", mode="minor", meter=4, tempi=(100, 90, 108, 80), bars=40, swing=54,
    prog="Em7 | A13 | Em7 | A13 (x2) | Cmaj7 | B7♭9 | Em7 | A13sus A13 (x2)",
    skel="stc", skelB="syn", drums=("funk16", dict(KICK=-3, SNR=-3, HAT=-12)),
    layers=[("bass", "TRI", "bas pulsowy staccato (16-ki)", -2, "wzór X.XX.X.X na ósemkach, 2× w takcie", None, None),
            ("chd", "P25", "stabsy „kurczak” z wah (LP z LFO 3 Hz, rezonans)", -5, "na „i” 2 i 4 oraz krok 16", None, None),
            ("mel", "P12", "melodia krótka", -4, "wg szkieletu 'stc'", None, None)],
    bridge="Cmaj7 | B7♭9 | Em7 | A13 | Dmaj7 | Dm7 G7 | Cmaj7 | B7♭9", counter=("XYL", -9),
    b2=dict(solo=("TRI", "długie nuty E2-B2"), noise=("noise_wind", -30, None)),
    distinct="staccato bas i wah", forbid="dzwonki; legato basu")

rec(id="s2_pszczoly", mt=109, title="Pszczoły", series=2, rarity="rare",
    root="A", mode="major", meter=4, tempi=(112, 101, 121, 90), bars=52, swing=50,
    prog="A | D | A | E7 (x2) | A | F#m | D | E7 A (x2)",
    skel="stc", skelB="syn", drums=("brush", dict(BRSH=-14, HAT=-14)),
    layers=[("mel", "BNJ", "melodia szybka, ósemki", -2, "wg szkieletu 'stc'", None, None),
            ("chd", "BNJ", "akord rozłożony", -8, "ósemki", None, None),
            ("bass", "TRI", "bas root-fifth", -5, "korzeń na 1, kwinta na 3", None, None),
            ("extra", "BUZZ", "dodatkowy głos płyty rzadkiej: bordun na A3 (sinus 220 Hz + FM 40 Hz), LFO panoramy 0,15 Hz", -14, "ciągły", 9, None)],
    bridge="D | E7 | A | F#m | D | A/C# E7 | D | E7", counter=("XYL", -9),
    b2=dict(solo=("BUZZ", "bordun A3 pływający w stereo"), noise=("noise_birds", -30, None)),
    distinct="bzyczący bordun, wchodzi od taktu 9", forbid="głośne BUZZ (nie przekracza -14 dB)")

rec(id="s2_wiatr", mt=110, title="Wiatr w trawie", series=2, rarity="common",
    root="D", mode="major", meter=4, tempi=(58, 52, 63, 46), bars=24, swing=50,
    prog="Dmaj9 | Bm7 | Gmaj9 | A13sus (x6)",
    skel="pas", skelB="pas", drums=None, mel_mode="sparse",
    layers=[("pad", "PAD", "pad szeroki, filtr przemiatany 600 Hz-2 kHz (LFO 0,05 Hz)", -3, "długie akordy", None, None),
            ("mel", "P12", "rzadka melodia: 1 nuta na takt", -8, "po motywie w taktach 1-2", None, None),
            ("noise", "noise_wind", "wiatr", -22, "pętla", 1, None)],
    bridge="Gmaj9 | A13sus | Bm7 | A13 | Dmaj9 | Bm7 | Gmaj9 | A13sus A13", counter=("TRI", -10),
    b1_extra="B1: dochodzi cichy bas TRI (-10) i SHK (-22)",
    b2=dict(solo=None, noise=("noise_wind", -18, "tylko PAD + wiatr")),
    distinct="szeroki pad i wiatr", forbid="perkusja w A1/A2; głośny bas")

rec(id="s2_dynia", mt=111, title="Dynia", series=2, rarity="common",
    root="F", mode="major", meter=4, tempi=(118, 106, 127, 94), bars=48, swing=50,
    prog="F | C7 | F | Bb F (x2) | Dm | Gm | C7 | F (x2)",
    skel="hop", skelB="std", drums=("polka", dict(KICK=-14, HAT=-16)),
    layers=[("mel", "ACC", "melodia akordeonowa (P25 + tremolo 6 Hz)", -3, "wg szkieletu 'hop'", None, None),
            ("bass", "TRI", "bas „oom”", -4, "ćwierćnuty 1 i 3", None, None),
            ("chd", "P25", "„pa” akordy", -6, "ćwierćnuty 2 i 4", None, None)],
    bridge="Bb | F/A | Gm | C7 | Dm | Bb | C7 | F", counter=("XYL", -9),
    b2=dict(solo=("ACC", "długie nuty, wolno"), noise=("noise_wind", -30, "jesienny wiatr")),
    distinct="polka „oom-pa”, akordeon", forbid="swing; syntetyczny kit")

rec(id="s2_jablka", mt=112, title="Zimowe jabłka", series=2, rarity="common",
    root="A", mode="minor", meter=3, tempi=(90, 81, 97, 72), bars=48, swing=50,
    prog="Am | Dm | E7 | Am (x2) | F | C | G | E7 (x2) | Am | Dm | E7 | Am",
    skel="wlz", skelB="wlz", drums=("waltz", dict(BRSH=-16)),
    layers=[("mel", "P12", "szarpnięcia melodii", -2, "wg szkieletu 'wlz'", None, None),
            ("bass", "TRI", "bas na 1", -4, "ćwierćnuta na 1", None, None),
            ("chd", "P12", "akord na 2-3", -8, "ćwierćnuty 2 i 3", None, None),
            ("orn", "BELL", "zimowe kryształki", -12, "pojedyncza nuta co 8 taktów (E6)", 5, None)],
    bridge="F | G | Am | E7 | F | Dm | E7 | Am", counter=("GLK", -9),
    b2=dict(solo=("P12", "melodia w oktawie 4, długie nuty"), noise=("noise_wind", -30, None)),
    distinct="folkowy walc zimowy z kryształkami", forbid="metrum 4/4; perkusja inna niż miotełki")

# ---- seria 3
rec(id="s3_ksiezyc", mt=113, title="Księżyc", series=3, rarity="common",
    root="F", mode="lydian", meter=4, tempi=(52, 47, 56, 42), bars=20, swing=50,
    prog="Fmaj7#11 | Gmaj7 | Fmaj7#11 | Em7 (x5)",
    skel="pas", skelB="pas", drums=None, tonic="Fmaj7#11",
    layers=[("mel", "BELL", "rozległa melodia, długie nuty (cel: A5 C6 E6 w 2. połowie)", -3, "wg szkieletu 'pas'", None, None),
            ("orn", "CEL", "dublowanie melodii oktawę wyżej", -8, "unison +12", 5, None),
            ("pad", "PAD", "pad", -10, "długie akordy", None, None)],
    fx_extra="REV-L 50% mokry na BELL/CEL (długi pogłos to wyróżnik)",
    bridge="Gmaj7 | Fmaj7#11 | Em7 | Dm9 | Gmaj7 | Am7 | Bbmaj7 | Fmaj7#11", counter=("GLK", -10),
    b2=dict(solo=("CEL", "gwiazdki w oktawie 6, rzadko"), noise=("noise_room_tone", -34, None)),
    distinct="długi pogłos, lidyjska #11", forbid="perkusja; bas")

rec(id="s3_swietliki", mt=114, title="Świetliki", series=3, rarity="rare",
    root="A", mode="major", meter=4, tempi=(90, 81, 97, 72), bars=40, swing=50,
    prog="Amaj7 | F#m9 | Dmaj9 | E6/9 (x2) | Bm9 | E13 | Amaj7 | D6/9 E (x2)",
    skel="bal", skelB="pas", drums=("dream", dict(KICK=-14, BRSH=-14)),
    layers=[("pad", "PAD", "pad szeroki", -4, "długie akordy", None, None),
            ("mel", "P12", "melodia długimi nutami", -4, "wg szkieletu 'bal'", None, None),
            ("bass", "TRI", "bas", -7, "korzeń na 1", None, None),
            ("extra", "BELL", "dodatkowy głos płyty rzadkiej: migoczące nuty, skala A, wysoko, 2-6 nut na takt, losowy pan każdej nuty", -17, "poziom losowy -14…-20 dB", 9, None)],
    bridge="Bm9 | E13 | Amaj7 | F#m9 | Dmaj9 | C#m7 | Bm9 | E6/9", counter=("GLK", -10),
    b2=dict(solo=("BELL", "migoczące nuty, 1-3 na takt"), noise=("noise_room_tone", -34, None)),
    distinct="migot dzwonków (świetliki)", forbid="ostre ataki; więcej niż 6 nut migotu na takt")

rec(id="s3_sowa", mt=115, title="Sowa", series=3, rarity="common",
    root="D", mode="minor", meter=4, tempi=(60, 54, 65, 48), bars=24, swing=50,
    prog="Dm | Bb | Gm | A7 (x6)",
    skel="pas", skelB="pas", drums=None,
    layers=[("mel", "BOX", "melodia kołysanki", -3, "wg szkieletu 'pas'", None, None),
            ("pad", "PAD", "pad niski na D2-A2", -8, "długie akordy w niskim rejestrze", None, "D2-A3"),
            ("bass", "TRI", "bas bardzo wolny", -10, "korzeń co 2 takty", None, None),
            ("orn", "BELL", "„hu-hu”: dwie nuty D5 A4", -10, "co 8 taktów, 2. połowa taktu", 5, None)],
    bridge="Gm | Dm | Bb | A7 | Gm | Bb | A7sus A7 | Dm", counter=("CEL", -10),
    b2=dict(solo=("BOX", "melodia, długie nuty"), noise=("noise_room_tone", -34, None)),
    distinct="straszkowa, ale łagodna: „hu-hu” sowy", forbid="skoki powyżej oktawy; głośny BELL")

rec(id="s3_kolysanka", mt=116, title="Kołysanka", series=3, rarity="common",
    root="C", mode="major", meter=4, tempi=(100, 90, 108, 80), bars=40, swing=50,
    prog="C | G | Am | F (x2) | C | Em | F | G7 (x2)",
    skel="std", skelB="std", drums=("gentle", dict(KICK=-18, SHK=-20)),
    layers=[("mel", "XYL", "melodia", -3, "wg szkieletu 'std'", None, None),
            ("chd", "BOX", "akompaniament", -6, "arpeggio ósemkami", None, None),
            ("bass", "PIZ", "bas pizzicato", -6, "ćwierćnuty 1 i 3", None, None)],
    drum_note="KICK bardzo miękka tylko na 1; SHK cichutko na ósemkach",
    bridge="F | G | Em | Am | Dm | G | C | G7", counter=("GLK", -9),
    b2=dict(solo=("BOX", "melodia, długie nuty"), noise=("noise_room_tone", -34, None)),
    distinct="zabawkowa orkiestra", forbid="werbel")

rec(id="s3_tupot", mt=117, title="Cichy tupot", series=3, rarity="common",
    root="G", mode="dorian", meter=4, tempi=(110, 99, 119, 88), bars=44, swing=50,
    prog="Gm7 | C13 | Gm7 | C13 (x2) | Dm7 | Gm7 | Cm7 | F13 (x2)",
    skel="stc", skelB="syn", drums=("glitch", dict(HAT=-14)),
    layers=[("mel", "P12", "szarpnięcia „na paluszkach”, staccato", -4, "ósemki co drugi krok", None, None),
            ("bass", "TRI", "bas", -5, "korzeń na 1 i „i” 3", None, None)],
    only_note="Brak warstwy akordowej: harmonię niosą bas i melodia.",
    fx_extra="GLITCH: co 4 takty 1-2 przerwy 80-200 ms z powtórzeniem poprzednich 30 ms (stutter); CRUSH tylko na HAT",
    bridge="Dm7 | G13 | Cm7 | F13 | Bbmaj7 | Am7♭5 | D7♭9 | Gm7", counter=("XYL", -9),
    b2=dict(solo=("P12", "pojedyncze szarpnięcia, ok. 1 na 2 takty"), noise=("noise_room_tone", -34, None)),
    distinct="krótkie przerwy glitch (stutter)", forbid="długie zawieszenia > 200 ms")

rec(id="s3_sen", mt=118, title="Sen o sianiu", series=3, rarity="common",
    root="F", mode="major", meter=4, tempi=(55, 50, 59, 44), bars=24, swing=50,
    prog="Fmaj7 | Am7 | Dm9 | Bbmaj7 (x6)",
    skel="pas", skelB="pas", drums=None, mel_mode="sparse",
    layers=[("pad", "PAD", "pad z falowaniem taśmy TAPE(0,5%), LFO 0,4 Hz", -2, "długie akordy", None, None),
            ("mel", "BELL", "rzadkie nuty", -10, "po motywie w taktach 1-2", None, None),
            ("noise", "taśma", "szum taśmy (biały LP 8 kHz)", -40, "ciągły", 1, None)],
    bridge="Bbmaj7 | Am7 | Gm9 | C13 | Fmaj7 | Dm9 | Bbmaj7 | C13sus", counter=("CEL", -10),
    b2=dict(solo=None, noise=("taśma", -40, "tylko PAD + falowanie")),
    distinct="falowanie taśmy (wow)", forbid="perkusja; nuty ostre")

# ---- seria 4
rec(id="s4_disco", mt=119, title="Disco gryzoń", series=4, rarity="unique",
    root="A", mode="minor", meter=4, tempi=(120, 108, 130, 96), bars=52, swing=50,
    prog="Am7 | Dm7 | G7 | Cmaj7 (x2) | Fmaj7 | Bm7♭5 | E7 | Am7 (x2)",
    skel="syn", skelB="syn", drums=("disco", dict(KICK=-3, HAT=-12, SNR=-6, SHK=-6)),
    layers=[("bass", "TRI", "bas oktawowy ósemkami (A2-A3)", -3, "ósemki oktawowe", None, None),
            ("mel", "P50", "melodia", -3, "wg szkieletu 'syn'", None, None),
            ("chd", "P25", "stabsy akordowe", -6, "na „i” 2 i 4", None, None),
            ("extra", "GLK", "dodatkowy głos płyty unikatowej: arpeggio cyklu kwintowego", -10, "co 8 taktów, 1 takt", 9, None)],
    drum_note="SNR+SHK klaski na 2 i 4; HAT otwarty na „i”",
    a2_note="A2 = dyskotekowy „lounge”: ta sama harmonia, bez perkusji",
    bridge="Fmaj7 | Em7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7♭5 | E7♭9", counter=("XYL", -9),
    b2=dict(solo=("P50", "melodia, długie nuty"), noise=("eter", -42, None)),
    distinct="four-on-the-floor i arpeggio cyklu kwintowego", forbid="werbel poza klaskami")

rec(id="s4_synth", mt=120, title="Synth fala", series=4, rarity="rare",
    root="E", mode="minor", meter=4, tempi=(105, 95, 113, 84), bars=48, swing=50,
    prog="Em | C | G | D (x4) | Am | C | D | Bm (x2)",
    skel="std", skelB="syn", drums=("four", dict(KICK=-4, SNR=-4, HAT=-14)),
    layers=[("pad", "PAD", "pad szeroki (7 trójkątów ±12 centów, atak 0,8 s)", -6, "długie akordy", None, None),
            ("tex", "P25", "arpeggio szesnastkami (E-G-B-E w górę i w dół)", -4, "16-ki ciągłe", None, None),
            ("bass", "TRI", "bas ósemkami", -3, "ósemki na korzeniu", None, None),
            ("mel", "P50", "melodia prowadząca (dodatkowy głos płyty rzadkiej)", -5, "wg szkieletu 'std'", None, None)],
    drum_note="SNR z gated reverb: ogon 250 ms ucięty",
    bridge="Am | C | D | Bm | Em | C | D | B7", counter=("GLK", -10),
    b2=dict(solo=("P25", "arpeggio zwolnione, 1 nuta na ćwierćnutę"), noise=("eter", -42, None)),
    distinct="synthwave z gated snare", forbid="saw; zbyt długi pogłos bez gate")

rec(id="s4_kaseta", mt=121, title="Kaseta mixtape", series=4, rarity="rare",
    root="D", mode="minor", meter=4, tempi=(100, 90, 108, 80), bars=44, swing=52,
    prog="Dm7 | G13 | Dm7 | G13 (x2) | Bbmaj7 | A7 | Dm7 | G13 (x2)",
    skel="stc", skelB="syn", drums=("funk16", dict(KICK=-3, SNR=-3, HAT=-12)),
    layers=[("bass", "TRI", "bas staccato, 16-ki", -3, "wzór X.XX.X.X", None, None),
            ("chd", "P25", "stabsy wah", -5, "na „i” 2 i 4", None, None),
            ("mel", "P12", "melodia", -4, "wg szkieletu 'stc'", None, None),
            ("extra", "BELL", "dodatkowy głos płyty rzadkiej: hook", -10, "co 8 taktów, 2 takty", 9, None)],
    fx_extra="WYPIEKANE w dźwięk: TAPE(0,6%), wow 0,5 Hz + flutter 6 Hz ±0,15%, szum taśmy -38 dB, LP(10 kHz), miękka saturacja; nie wyłączać falowania",
    bridge="Bbmaj7 | A7 | Gm7 | C13 | Fmaj7 | E7♭9 | A7sus | A7", counter=("XYL", -9),
    b2=dict(solo=("P12", "melodia, długie nuty"), noise=("eter", -38, "szum taśmy zamiast eteru")),
    distinct="falowanie taśmy wypieczone w dźwięk", forbid="wyłączanie falowania")

rec(id="s4_radio", mt=122, title="Radio FM", series=4, rarity="common",
    root="C", mode="major", meter=4, tempi=(96, 86, 104, 77), bars=40, swing=50,
    prog="C | Em | F | G (x2) | Am | Em | F | G (x2)",
    skel="bal", skelB="std", drums=("ballad", dict(KICK=-10, SNR=-12)),
    layers=[("mel", "P50", "melodia (pusty, radiowy, filtr 6 kHz)", -3, "wg szkieletu 'bal'", None, None),
            ("bass", "TRI", "bas", -5, "ćwierćnuty korzeń", None, None),
            ("pad", "PAD", "pad", -10, "długie akordy", None, None),
            ("noise", "eter", "szum eteru (biały HP(5 kHz)) z wolnym „strojeniem” (przesunięcie filtra, LFO 0,03 Hz)", -42, "ciągły", 1, None)],
    bridge="Am | F | C | G | Am | F | G | G7", counter=("GLK", -10),
    b2=dict(solo=("P50", "melodia, długie nuty"), noise=("eter", -36, "więcej eteru")),
    distinct="ballada radiowa ze strojeniem eteru", forbid="szybkie nuty; ostry kit")

rec(id="s4_arcade", mt=123, title="Arcade", series=4, rarity="common",
    root="G", mode="major", meter=4, tempi=(135, 122, 146, 108), bars=56, swing=50,
    prog="G | D | Em | C (x4) | Am | C | D | G (x2)",
    skel="stc", skelB="syn", drums=("four", dict(KICK=-3, SNR=-3, HAT=-12)),
    layers=[("bass", "TRI", "bas ósemkami", -3, "ósemki na korzeniu", None, None),
            ("mel", "P25", "melodia", -3, "wg szkieletu 'stc'", None, None),
            ("tex", "P50", "arpeggio", -8, "szesnastki w górę", None, None),
            ("orn", "GLK", "akcent", -10, "co 8 taktów", 9, None)],
    drum_note="HAT szesnastki z CRUSH",
    bridge="Am | Em | C | D | Am | C | D | D7", counter=("XYL", -9),
    b2=dict(solo=("P25", "melodia, długie nuty"), noise=("eter", -42, None)),
    distinct="chiptune dance", forbid="wolne zawieszenia w A1/B1")

rec(id="s4_taniec", mt=124, title="Taniec w klatce", series=4, rarity="unique",
    root="C", mode="minor", meter=4, tempi=(130, 117, 140, 104), bars=60, swing=50,
    prog="Cm | Ab | Eb | Bb (x4) | Fm | Ab | Bb | Cm (x2)",
    skel="stc", skelB="syn", drums=("four", dict(KICK=-3, SNR=-3, HAT=-12)), inv=True,
    layers=[("bass", "TRI", "bas ósemkami z synkopą", -3, "ósemki, synkopa na „i” 2", None, None),
            ("mel", "P50", "melodia własna (pentatonika c-moll), motyw Cuy w odwróceniu w taktach 1-2", -3, "wg szkieletu 'stc'", None, None),
            ("orn", "P25", "kontrmelodia", -8, "przeciwny kontur do melodii", 9, None),
            ("extra", "HAT", "dodatkowy głos płyty unikatowej: ciągły hi-hat szesnastkowy „szum eteru”", -16, "16-ki ciągłe", 5, None),
            ("orn", "GLK", "hook", -9, "co 4 takty", 9, None)],
    drum_note="CRUSH na całej perkusji",
    bridge="Fm | Ab | Bb | Cm | Eb | Ab | G7 | Cm", counter=("XYL", -9),
    b2=dict(solo=("P50", "melodia, długie nuty"), noise=("eter", -42, None)),
    distinct="najszybszy utwór w grze; własny motyw (nie Nyan Cat: nie zbliżać się do jego skali, rytmu i linii)",
    forbid="skala i rytm znanej piosenki o kocie")
