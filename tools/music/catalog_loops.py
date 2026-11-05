"""Katalog pętli: motyw, belki, miejsca, pokoje, minigry (dane do gen_prompts.py).

Warstwa: (rola, głos, partia, dB, wzór, wejście_od_taktu, rejestr[, stem]).
form: [(nazwa, od, do, root, mode, opis)] lub None (auto).
"""
L = {}


def loop(**kw):
    L[kw["id"]] = kw


def room(i, mt, title, **kw):
    loop(id=i, mt=mt, title=title, kind="room", lufs=kw.pop("lufs", -18), **kw)


# ---- motyw
loop(id="theme_cuy", mt=11, title="Motyw Cuy (także home_main)", kind="theme", lufs=-18,
     role="wizytówka gry; pętla głównego widoku Domku", root="A", mode="minor", meter=4, bpm=92, bars=32, swing=58,
     prog="Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | E7♭9 | Am9 | Fmaj9 | Em7 A7 | Dm9 | G13 | Cmaj9 | Am7 | Dm9 G7 | Dm9 G13",
     form=[("A", 1, 8, "A", "minor", "temat w a-moll"), ("B", 9, 16, "C", "major", "kontrast w C-dur"),
           ("Aʹ", 17, 24, "A", "minor", "temat w a-moll, wariacja"), ("B-zakończenie", 25, 32, "C", "major", "kontrast, wygaszenie ogona do początku")],
     skel="std", skelB="pas", sig="bar16+32",
     layers=[("mel", "BELL", "melodia, unison z P12 (BELL -3 dB względem P12)", 0, "wg szkieletu; takty 1-2 motyw pełny, 3-4 odpowiedź podpisem w dół, 5-8 swobodna linia pentatoniczna A-C-D-E-G, długie nuty", None, None),
             ("mel", "P12", "melodia unisono z BELL", 0, "jak BELL", None, None),
             ("chd", "EP", "akordy rozłożone w synkopie", -6, "„i” 2 i 4 (kroki 7 i 15 siatki 16)", None, None),
             ("bass", "TRI", "bas pizzicato (TRI + PIZ)", -4, "wzór bossa (1, -, 5, 5): korzeń na 1, kwinta na „i” 3; do taktu 8 tylko korzenie, od 9 pełny wzór", 1, None),
             ("orn", "GLK", "pojedyncze dźwięki ozdoby", -14, "co 4 takty, ostatnia ćwierćnuta taktu", 4, None)],
     drums=("lofi_soft", dict(BRSH=-12, SHK=-18, KICK=-14)),
     fx="REV-S 10% na całość; REV-M 18% na BELL",
     dyn=["takty 1-4: bez perkusji (wejście motywu)", "takt 5: wchodzą miotełki i shaker", "takt 9: bas pełny", "brak werbla i crashu"],
     loop_note="ostatni takt Dm9 G13 prowadzi do Am9 na początku; ogon pogłosu zawinięty",
     distinct="wizytówka: motyw Cuy wypowiedziany w pierwszych 2 taktach",
     forbid="melodia szybsza niż ósemki; blacha; crash")

# ---- belki
loop(id="bed_morning", mt=23, title="Belka rano (6-9)", kind="bed", lufs=-20,
     role="belka pulpitu rano; jeden głos prowadzący, bez perkusji",
     root="C", mode="major", meter=4, bpm=70, bars=48, swing=50,
     prog="Cmaj9*2 | Am9 | Fmaj9 | Cmaj9 | Em7 | Dm9 | G13sus (x3) | Gmaj9*2 | Em9 | Cmaj9 | Gmaj9 | Bm7 | Am9 | D13sus (x3)",
     form=[("C-dur", 1, 24, "C", "major", "trzy przebiegi 8-taktowego cyklu w C-dur"),
           ("G-dur", 25, 48, "G", "major", "trzy przebiegi cyklu w G-dur, powrót do C przy zapętleniu")],
     mel_mode="sparse2", sig="bar16+32+48",
     layers=[("pad", "PAD", "długie akordy", -6, "jeden akord na takt (lub 2 takty)", None, None),
             ("mel", "BELL", "rzadkie nuty pentatoniczne (C-D-E-G-A; w G-dur G-A-B-D-E)", -4, "1 nuta na 2 takty, półnuty", None, None),
             ("orn", "P12", "szarpnięcia", -10, "na „i” 3 co 4 takty", 3, None),
             ("noise", "noise_birds", "ćwierkanie", -20, "ciągłe", 5, None)],
     drums=None, fx="REV-L 24% na dzwonkach; jasny, szeroki stereo; bez basu poniżej 80 Hz (HP 80 Hz)",
     dyn=["takt 1: sam PAD", "takt 3: pierwsze nuty BELL", "takt 5: wejście ptaków", "podpis Cuy w BELL w taktach 16, 32 i 48 (-4 dB)"],
     loop_note="takt 48 (G-dur, D13sus) łączy się z taktem 1 (Cmaj9) przez wspólny PAD; ogon zawinięty",
     distinct="poranek: jasno, szeroko, ptaki", forbid="perkusja; linia melodyczna gęstsza niż ćwierćnuty")

loop(id="bed_day", mt=24, title="Belka dzień (9-17)", kind="bed", lufs=-20,
     role="najcichsza belka; prawie cisza, przyjazna drzemce",
     root="F", mode="major", meter=4, bpm=60, bars=48, swing=50,
     prog="Fmaj9*8 | Dm9*4 | Gm9*4 | Bbmaj9*4 | C13sus*4 | Fmaj9*8 | Dm9*4 | Gm9*4 | C13sus*4 | Fmaj9*4",
     mel_mode="none", sig="none",
     layers=[("pad", "PAD", "pad długi, wolne poruszenie filtra 0,03 Hz", -3, "ciągły, zmiana akordu zgodnie z mapą", None, None),
             ("noise", "noise_room_tone", "ton pokoju", -28, "ciągły", 1, None),
             ("orn", "P12", "pojedyncze szarpnięcie (nuta z akordu: F5, A5 lub C6)", -14, "co 6-10 s losowo (seed), nie na mocnej części", 5, None)],
     drums=None, fx="LP(5 kHz) na całość; REV-M 20%; dynamika prawie płaska",
     dyn=["brak melodii ciągłej i motywu Cuy", "najwyżej 1 zdarzenie P12 na 6 s"],
     loop_note="takt 48 (Fmaj9) = takt 1; PAD bez ataku przy zapętleniu",
     distinct="prawie cisza dla drzemki", forbid="dźwięki zwracające uwagę; rytmiczny bas")

loop(id="bed_evening", mt=25, title="Belka wieczór (17-22)", kind="bed", lufs=-20,
     role="lo-fi jazz wieczorny", root="Bb", mode="major", meter=4, bpm=76, bars=56, swing=64,
     prog="Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 F13 (x4) | Gm9 | Cm9 | F13 | Bbmaj9 | Em7♭5 A7♭9 | Dm9 G7 | Cm9 F13 | Bbmaj9 (x2) | Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 Bbmaj9",
     form=[("A", 1, 32, "Bb", "major", "A (16) x2; w 2. A ii-V-I na końcu (Cm9 F13 Bbmaj9)"),
           ("B", 33, 48, "G", "minor", "mostek w g-moll"), ("A-ogon", 49, 56, "Bb", "major", "powrót, ostatni takt Cm9 Bbmaj9")],
     mel_mode="sparse2", sig="none",
     layers=[("chd", "EP", "akordy rozłożone, voicing blisko", -3, "arpeggio ósemkami w swingu", None, None),
             ("mel", "EP", "melodia wyżej (A4-D5), nuty długie, wejście co drugi takt; można BELL", -5, "co 2 takty, półnuty; solo nie dłuższe niż 4 takty", 3, None),
             ("bass", "TRI", "walking bass ćwierćnutami (korzeń-kwinta-przejście)", -4, "4 ćwierćnuty", None, None),
             ("noise", "noise_vinyl_crackle", "trzask winylu", -42, "ciągły, bardzo cicho", 1, None)],
     drums=("brush", dict(BRSH=-14, SHK=-14)),
     fx="TAPE(0,2%) całość, LP(8 kHz), REV-S 12%",
     dyn=["co 8 taktów kadencja ii-V-I: Cm9 F13 Bbmaj9", "takt 1-2: sam EP", "takt 3: wejście melodii", "brak stopy"],
     loop_note="takt 56 prowadzi Cm9 -> Bbmaj9, pętla na takt 1 Bbmaj9",
     distinct="lo-fi jazz z trzaskiem winylu i ii-V-I", forbid="stopa; solo EP dłuższe niż 4 takty")

loop(id="bed_night", mt=26, title="Belka noc (22-6, tylko z włączonym „Muzyka w nocy”)", kind="bed", lufs=-20,
     role="pozytywka, prawie cisza", root="D", mode="dorian", meter=4, bpm=54, bars=36, swing=50,
     prog="Dm9*8 | Em7*4 | G6/D*4 | Dm9*8 | Bbmaj7*4 | C6/9*4 | Dm9*4",
     mel_mode="sparse1", sig="bar12+24+36",
     layers=[("mel", "BOX", "melodia pentatoniczna D-F-G-A-C, symetryczne frazy", -3, "1 nuta na takt, półnuta", None, None),
             ("pad", "PAD", "bardzo cichy pad na D3-A3", -16, "długie akordy", None, "D3-A3"),
             ("orn", "CEL", "gwiazdki: pojedyncze nuty 4 oktawy wyżej", -20, "losowo co 8-14 s", 5, None)],
     drums=None, fx="REV-L 30%, LP(4 kHz), bez basu; nic powyżej 5 kHz",
     dyn=["podpis Cuy w dorycku (D4 E4 F4) w BOX w taktach 12, 24, 36"],
     loop_note="takt 36 (Dm9) = takt 1",
     distinct="pozytywka nocna", forbid="puls rytmiczny; dźwięki jasne powyżej 5 kHz")

# ---- miejsca na zewnątrz
loop(id="place_garden_day", mt=27, title="Ogród dzień", kind="place", lufs=-18,
     role="ogród w dzień (w nocy filtr LP 1,8 kHz -6 dB w kodzie)", root="G", mode="major", meter=4, bpm=88, bars=32, swing=58,
     prog="G | Em7 | Cmaj7 | D7 (x2) | G | Bm7 | Am7 | D7sus D7 (x2)", skel="syn", skelB="std", sig="bar32",
     layers=[("mel", "BNJ", "melodia pentatoniczna G-A-B-D-E", -2, "szarpnięcie w synkopie („i” 2); wg szkieletu 'syn'", None, None),
             ("chd", "BNJ", "akord rozłożony", -8, "ósemki", None, None),
             ("bass", "TRI", "bas ćwierćnutami root-fifth", -5, "korzeń na 1, kwinta na 3", None, None),
             ("noise", "noise_birds", "ptaki", -22, "ciągłe", 1, None)],
     drums=("offshk", dict(SHK=-18)), fx="REV-S 10%", dyn=["podpis Cuy (A4 B4 D5) w takcie 32"],
     loop_note="takt 32 D7 -> takt 1 G", distinct="szarpnięcie banjo na synkopie", forbid="perkusja inna niż shaker/miotełki")

loop(id="place_garden_evening", mt=28, title="Ogród wieczór", kind="place", lufs=-18,
     role="ogród wieczorem", root="E", mode="mixolydian", meter=4, bpm=69, bars=32, swing=60,
     prog="E7 | D | A | E7 (x2) | E7 | Bm7 | A | E7 (x2)", skel="pas", skelB="pas", sig="bar32",
     layers=[("mel", "P12", "melodia długimi nutami, ciepły filtr 3 kHz", -3, "wg szkieletu 'pas'", None, None),
             ("pad", "PAD", "pad na E-B", -8, "długie akordy", None, None),
             ("bass", "TRI", "bas, wchodzi późno", -6, "korzeń na 1", 9, None),
             ("noise", "noise_crickets", "świerszcze", -22, "ciągłe", 1, None),
             ("orn", "BELL", "pojedyncza nuta G#5", -14, "co 8 taktów", 8, None)],
     drums=None, fx="REV-S 12%", dyn=["bas wchodzi od taktu 9, nie od razu"],
     loop_note="takt 32 -> takt 1 przez PAD", distinct="ocieplenie, wolniej, bas wchodzi późno", forbid="perkusja")

loop(id="place_park", mt=29, title="Park", kind="place", lufs=-18,
     role="park (3/4, folkowy walc)", root="D", mode="major", meter=3, bpm=96, bars=32, swing=50,
     prog="D | A7 | D | G | D | Bm | Em7 A7 | D (x2) | G | D | Em7 | A7 | D | Gmaj7 | A7 | D | D | A7 | D | G | D | Bm | Em7 A7 | D",
     skel="wlz", skelB="wlz", mel_shift=7, sig="bar32",
     layers=[("mel", "P12", "melodia prosta; motyw w taktach 1-2 (D5 E5 F#5 A5)", -2, "wg szkieletu 'wlz' o oktawę wyżej", None, None),
             ("chd", "P12", "akompaniament „oom-pa-pa”", -6, "akord na 2 i 3", None, None),
             ("bass", "TRI", "bas na 1", -5, "korzeń", None, None),
             ("noise", "dzieci", "dalekie głosy dzieci: szum formantowy 800/1500 Hz", -34, "losowo co 6-10 s, 1-2 s", 5, None)],
     drums=("waltz", dict(BRSH=-16)), fx="REV-S 10%", dyn=["akcent na „raz”"],
     loop_note="takt 32 D -> takt 1 D", distinct="akcent na „raz”, walc", forbid="ostry puls 50%")

loop(id="place_farm", mt=30, title="Farma", kind="place", lufs=-18,
     role="farma (shuffle, slide)", root="A", mode="major", meter=4, bpm=100, bars=32, swing=66,
     prog="A*4 | D*2 | A*2 | E7 | D | A | E7 (x2) | A | D | A | A | D | A | E7 | A",
     skel="syn", skelB="std", sig="bar32",
     layers=[("mel", "BNJ", "melodia + ślizgi P12 (portamento 90 ms)", -2, "wg szkieletu 'syn'; slide na ostatniej nucie fraz", None, None),
             ("chd", "BNJ", "akompaniament shuffle, trójdźwięk", -7, "ćwierć-triola", None, None),
             ("bass", "TRI", "bas root-fifth", -5, "korzeń na 1, kwinta na 3", None, None),
             ("orn", "P12", "kogutowe nawoływanie A5-E6", -8, "raz w takcie 17", 17, None)],
     drums=("shuffle", dict(BRSH=-14, HAT=-22)), fx="REV-S 10%",
     dyn=["takty 1-12: dwunastotaktowy blues (A A A A | D D A A | E7 D A E7), potem wariacja"],
     loop_note="takt 32 A -> takt 1 A", distinct="slide i kogut", forbid="banjo głośniejsze niż bas")

loop(id="place_market", mt=31, title="Targ (także sklep)", kind="place", lufs=-18,
     role="targ i sklep", root="Bb", mode="major", meter=4, bpm=116, bars=32, swing=64,
     prog="Bb6 | G7 | Cm7 F7 | Bb6 (x2) | Eb6 | Ebm6 | Bb/D G7 | Cm7 F7 (x2)", skel="syn", skelB="std", sig="bar32",
     layers=[("chd", "P25", "stabsy „blacha” (Bb D F A)", -4, "na „i” 2 i 4", None, None),
             ("mel", "P25", "melodia, sekwencje trzynutowe", -3, "wg szkieletu 'syn'", None, None),
             ("bass", "TRI", "walking bass", -4, "4 ćwierćnuty", None, None),
             ("orn", "BELL", "dzwonek sklepowy: dwie nuty E6 C6", -8, "ostatnia ćwierćnuta taktów 8, 16, 24, 32", 8, None)],
     drums=("brush", dict(BRSH=-12, HAT=-12)), fx="REV-S 10%", dyn=["tag dzwonka co 8 taktów"],
     loop_note="takt 32 -> takt 1", distinct="tag dzwonka sklepowego", forbid="werbel; tylko miotełki")

# ---- pokoje
room("place_room_salon", 32, "Pokój: salon", role="przytulne lo-fi, drewno i lampka", root="F", mode="major", meter=4, bpm=76, bars=32, swing=58,
     prog="Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 (x2) | Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13 (x2)", skel="bal", skelB="pas", sig="bar32",
     layers=[("mel", "EP", "melodia (pianino puls 25%)", -3, "4-nutowe frazy; wg szkieletu 'bal'", None, None),
             ("chd", "EP", "akordy", -6, "rozłożone", None, None),
             ("bass", "TRI", "bas", -5, "korzeń na 1 i 3", None, None),
             ("noise", "noise_vinyl_crackle", "ciepły trzask winylu na wejściu", -42, "takty 1-4: -34, potem -42", 1, None)],
     drums=("brush", dict(BRSH=-14)), fx="REV-S 12%", dyn=["trzask winylu głośniej w pierwszych 4 taktach"],
     loop_note="takt 32 -> 1", distinct="ciepły trzask winylu na wejściu", forbid="stopa")

room("place_room_bedroom", 33, "Pokój: sypialnia", role="wolna kołysanka", root="D", mode="dorian", meter=4, bpm=60, bars=24, swing=50,
     prog="Dm9 | Em7 | Gmaj7 | Dm9 (x6)", mel_mode="sparse1", sig="none",
     layers=[("mel", "BOX", "melodia D-F-G-A", -3, "1 nuta na takt, półnuta", None, None),
             ("pad", "PAD", "pad", -14, "długie akordy", None, None)],
     drums=None, fx="REV-L 28%", dyn=["brak basu"], loop_note="takt 24 -> 1", distinct="kołysanka", forbid="jakikolwiek puls")

room("place_room_playroom", 34, "Pokój: pokój zabaw", role="zabawna pozytywka i ksylofon", root="C", mode="major", meter=4, bpm=100, bars=32, swing=50,
     prog="C | G7 | C | F | C | Am | D7 G7 | C (x2) | F | C | G | C | F | Dm7 G7 | C | C | C | G7 | C | F | C | Am | D7 G7 | C",
     skel="hop", skelB="std", sig="bar32",
     layers=[("mel", "XYL", "melodia staccato, potem zabawne powtórki", -2, "wg szkieletu 'hop'", None, None),
             ("orn", "BOX", "kontrapunkt", -8, "długie nuty nad melodią", 9, None),
             ("bass", "TRI", "bas „skok”", -4, "korzeń-oktawa", None, None)],
     drums=("offshk", dict(SHK=-20)), fx="REV-S 8%", dyn=["staccato to wyróżnik"], loop_note="takt 32 -> 1",
     distinct="staccato, dzieciństwo", forbid="swing")

room("place_room_dorm", 35, "Pokój: wspólna sypialnia", role="miękka kołysanka zespołowa", root="G", mode="major", meter=4, bpm=64, bars=32, swing=50,
     prog="Gmaj9 | Em7 | Cmaj9 | D13 (x2) | Gmaj9 | Bm7 | Am7 | D13 (x2)", skel="pas", skelB="pas", sig="none",
     layers=[("mel", "BOX", "temat kanonu (od taktu 1)", -3, "szkielet 'pas', 8 taktów, powtarzany co 8", None, None),
             ("mel", "CEL", "ten sam temat, opóźnienie 2 takty", -6, "wejście takt 3", 3, None),
             ("mel", "P12", "ten sam temat, opóźnienie 4 takty, ciepły filtr 2 kHz", -9, "wejście takt 5", 5, None),
             ("pad", "PAD", "pad", -12, "długie akordy", None, None),
             ("bass", "TRI", "bas", -8, "korzeń na 1", 9, None)],
     drums=None, fx="REV-M 16%", dyn=["trzy głosy w kanonie"], loop_note="takt 32 -> 1", distinct="kanon trzygłosowy", forbid="perkusja")

room("place_room_kuki", 36, "Pokój: łąka (calm meadow)", role="pastoralny, przewiewny", root="G", mode="major", meter=4, bpm=72, bars=32, swing=50,
     prog="Gmaj7 | Cmaj7 | Am7 | D7sus (x2) | Em7 | Cmaj7 | Gmaj7/B | Am7 D7", skel="pas", skelB="pas", sig="bar32",
     layers=[("mel", "P12", "melodia pentatoniczna z ozdobnikami", -3, "wg szkieletu 'pas' + nuty przygodne", None, None),
             ("pad", "PAD", "pad", -9, "długie akordy", None, None),
             ("bass", "TRI", "bas co 2 takty", -8, "korzeń", None, None),
             ("noise", "noise_wind", "wiatr", -26, "ciągły", 1, None)],
     drums=None, fx="REV-M 14%", dyn=[], loop_note="takt 32 -> 1", distinct="wiatr", forbid="banjo (to ogród)")

room("place_room_ned", 37, "Pokój: kąt przekąsek (snack nook)", role="swing, chrupanie", root="Bb", mode="major", meter=4, bpm=104, bars=32, swing=62,
     prog="Bb6 | Gm7 | Cm7 F7 | Bb6 (x2) | Eb6 | Cm7 | Dm7 G7 | Cm7 F7 (x2)", skel="syn", skelB="std", sig="bar32",
     layers=[("mel", "P25", "melodia", -3, "wg szkieletu 'syn'", None, None),
             ("chd", "P25", "stabsy „blacha” (Bb D F)", -4, "na „i” 2 i 4", None, None),
             ("bass", "PIZ", "bas pizzicato walking", -3, "4 ćwierćnuty", None, None),
             ("orn", "XYL", "figura „chrupania”: 4 szesnastki staccato D6 D6 D6 D6", -8, "w taktach 8 i 24 na 4. ćwierćnucie", 8, None)],
     drums=("brush", dict(BRSH=-14)), fx="REV-S 10%", dyn=[], loop_note="takt 32 -> 1", distinct="motyw chrupania", forbid="dzwonki")

room("place_room_james", 38, "Pokój: kryjówka (safe hideout)", role="najciszej ze wszystkich pokoi", root="D", mode="dorian", meter=4, bpm=56, bars=24, swing=50,
     prog="Dm9 | Dm9 | Gmaj7 | Dm9 (x6)", mel_mode="sparse2", sig="none", lufs=-26,
     layers=[("mel", "BOX", "pojedyncze nuty D5, A5, F5", -6, "1 nuta na 2 takty", None, None),
             ("pad", "PAD", "pad", -18, "długie akordy", None, None),
             ("noise", "noise_room_tone", "ton pokoju", -34, "ciągły", 1, None)],
     drums=None, fx="REV-L 30%, LP(3,5 kHz)", dyn=["cel głośności -26 LUFS (nie -18)", "bez podpisu Cuy"],
     loop_note="takt 24 -> 1", distinct="najciszej: kryjówka", forbid="wszystko głośniejsze niż -26 LUFS")

room("place_room_glen", 39, "Pokój: kącik czytelniczy", role="ballada jazzowa", root="Eb", mode="major", meter=4, bpm=68, bars=32, swing=60,
     prog="Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 (x2) | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 (x2)", skel="bal", skelB="pas", sig="bar32",
     layers=[("mel", "EP", "melodia", -3, "wg szkieletu 'bal'", None, None),
             ("chd", "EP", "akordy", -3, "rozłożone", None, None),
             ("bass", "TRI", "bas co 2 takty", -7, "korzeń", None, None),
             ("orn", "BELL", "pojedyncze nuty w tle", -16, "co 4 takty", 3, None)],
     drums=("brush", dict(BRSH=-16)), fx="REV-S 12%", dyn=["odwrócone ii-V: Fm9 Bb13 przed Ebmaj9"],
     loop_note="takt 32 -> 1", distinct="odwrócone ii-V", forbid="szybkie przejścia")

room("place_room_racuch", 40, "Pokój: kącik zabaw", role="zabawny, skoczny", root="C", mode="major", meter=4, bpm=108, bars=32, swing=50,
     prog="C | F | G7 | C (x2) | Am | Dm7 | G7 | C (x2)", skel="hop", skelB="std", sig="bar32",
     layers=[("mel", "P12", "melodia z podskokami", -2, "wg szkieletu 'hop' (ósemka-pauza-ósemka)", None, None),
             ("orn", "XYL", "wsparcie pod spodem", -8, "co drugi takt", 3, None),
             ("bass", "TRI", "bas „skok” z oktawą", -4, "korzeń-oktawa", None, None)],
     drums=("offshk", dict(SHK=-20)), fx="REV-S 8%", dyn=[], loop_note="takt 32 -> 1", distinct="rytm podskoków", forbid="moll")

room("place_room_default", 41, "Pokój: domyślny (3 motywy bez nastroju)", role="ciepły neutralny", root="A", mode="major", meter=4, bpm=80, bars=32, swing=50,
     prog="Amaj9 | F#m9 | Dmaj9 | E13 (x2) | Amaj9 | C#m7 | Dmaj9 | E13sus E13 (x2)", skel="std", skelB="pas", sig="none",
     layers=[("mel", "P12", "melodia", -3, "wg szkieletu 'std'", None, None),
             ("bass", "TRI", "bas", -6, "korzeń na 1", None, None),
             ("orn", "BELL", "dzwonek", -10, "co 4 takty", 4, None),
             ("pad", "PAD", "pad", -12, "długie akordy", None, None)],
     drums=("offshk", dict(SHK=-22)), fx="REV-S 10%", dyn=[], loop_note="takt 32 -> 1",
     distinct="neutralność (nic charakterystycznego)", forbid="charakterystyczne ozdobniki")

# ---- minigry (stemy)
def mg(i, mt, title, **kw):
    loop(id=i, mt=mt, title=title, kind="minigame", lufs=-16, **kw)


mg("mg_veggie_rain", 42, "Minigra: Veggie Rain (3 stemy)", role="skoczny chiptune; +6 BPM na poziom w kodzie; ostatnie 15 s tempo +10% (zastępuje games_boss)",
   root="C", mode="major", meter=4, bpm=132, bars=16, swing=50, prog="C | G | Am | F | C | G | F | G7 (x2)", skel="hop", skelB="std", sig="bar16",
   layers=[("bass", "TRI", "bas ósemkami korzeń-oktawa", -3, "ósemki", 1, None, "base"),
           ("pad", "P25", "pad", -10, "długie akordy", 1, None, "base"),
           ("drums", "KICK/SNR/HAT", "kit szumowy", -3, "KICK 1 i 3, SNR 2 i 4, HAT ósemki -12, CRUSH tylko HAT", 1, None, "rhythm"),
           ("mel", "P25", "melodia radosna, motyw w taktach 1-2 i 9-10", -2, "wg szkieletu 'hop'", 1, None, "lead"),
           ("orn", "GLK", "wsparcie na akcentach", -8, "akcenty melodii", 1, None, "lead")],
   drums=("four_simple", dict(KICK=-3, SNR=-3, HAT=-12)), fx="REV-S 6%",
   dyn=["_base od startu, _rhythm po 10 s (kod), _lead po 25 s (kod)", "ostatnie 15 s: tempo +10% (kod)"],
   loop_note="takt 16 G7 -> 1 C", distinct="skoczność", forbid="melodia zdominowana przez bas")

mg("mg_hay_maze", 43, "Minigra: Hay Maze (3 stemy)", role="napięty, ale słodki; ostatnie 15 s +10 BPM",
   root="A", mode="minor", meter=4, bpm=108, bars=16, swing=50, prog="Am | Am | F | E7 (x4)", skel="std", skelB="syn", mel_mode="phrase24", sig="bar16",
   layers=[("bass", "TRI", "ostinato ósemkami A2-A2-E3-A2 (wzór 3-nutowy)", -3, "ósemki", 1, None, "base"),
           ("pad", "PAD", "cichy pad", -14, "długie akordy", 1, None, "base"),
           ("drums", "HAT/KICK/SNR", "tykanie", -8, "HAT ćwierćnuty -8, KICK na 1, co 4 takty fill SNR trzy uderzenia (-6)", 1, None, "rhythm"),
           ("mel", "P12", "rzadka melodia: jedna fraza 2 takty co 4 takty; motyw Cuy w molu (A4 B4 C5 E5) raz na pętlę", -2, "szkielet 'std' w oknach", 1, None, "lead")],
   drums=("tick", dict(HAT=-8, KICK=-8, SNR=-6)), fx="REV-S 6%",
   dyn=["_lead wchodzi z nowego wywołania onTimeLeft (kod)"], loop_note="takt 16 E7 -> 1 Am",
   distinct="ostinato basu", forbid="więcej niż 2 nuty melodii na takt")

mg("mg_veggie_memory", 44, "Minigra: Veggie Memory (3 stemy)", role="spokojna pozytywka, bez presji",
   root="F", mode="major", meter=4, bpm=72, bars=16, swing=50, prog="Fmaj7 | Dm7 | Gm7 | C7 (x4)", skel="pas", skelB="pas", sig="bar16",
   layers=[("pad", "PAD", "pad", -4, "długie akordy", 1, None, "base"),
           ("bass", "TRI", "bas co 2 takty", -8, "korzeń", 1, None, "base"),
           ("drums", "SHK/BRSH", "delikatne shaker i miotełki", -18, "SHK na „i”, BRSH na 2 i 4", 1, None, "rhythm"),
           ("mel", "BOX", "melodia", -3, "wg szkieletu 'pas'", 1, None, "lead"),
           ("orn", "CEL", "kontrapunkt", -9, "długie nuty", 1, None, "lead")],
   drums=("gentle", dict(SHK=-18, BRSH=-18)), fx="REV-M 14%",
   dyn=["_lead rośnie z poziomem (kod), tempo stałe"], loop_note="takt 16 -> 1",
   distinct="pozytywka", forbid="stopa; werbel; szybkie nuty")

mg("mg_nyan_cuy", 45, "Minigra: Nyan Cuy (3 stemy)", role="szybki taniec chiptune, własny motyw",
   root="E", mode="minor", meter=4, bpm=136, bars=16, swing=50, prog="Em | C | D | Bm (x2) | Em | Am | B7 | Em (x2)", skel="stc", skelB="syn", mel_shift=7, sig="bar16",
   layers=[("bass", "TRI", "bas z synkopą", -3, "1, „i” 2, 4", 1, None, "base"),
           ("pad", "P50", "pad akordowy (w tym utworze wolno P50)", -12, "długie akordy", 1, None, "base"),
           ("drums", "KICK/SNR/HAT", "pełny kit", -3, "KICK four-on-the-floor, SNR 2 i 4, HAT szesnastki -14, CRUSH", 1, None, "rhythm"),
           ("mel", "P25", "melodia własna, wędrowna (pentatonika e-moll); motyw w odwróceniu w taktach 13-14", -2, "wg szkieletu 'stc' o oktawę wyżej", 1, None, "lead"),
           ("orn", "GLK", "podwajanie przy wyniku 600 pkt", -8, "unison +12", 1, None, "lead")],
   drums=("four", dict(KICK=-3, SNR=-3, HAT=-14)), fx="REV-S 6%",
   dyn=["warstwy wg wyniku: 0 pkt _base, 200 _rhythm, 600 _lead (kod)"], loop_note="takt 16 -> 1",
   distinct="własny motyw tańca", forbid="skala i rytm znanej piosenki o kocie")

mg("mg_menu", 46, "Minigra: menu (bez stemów)", role="krótki wesoły shuffle",
   root="G", mode="major", meter=4, bpm=112, bars=16, swing=62, prog="G | Em7 | C | D7 (x4)", skel="hop", skelB="std", sig="bar16",
   layers=[("mel", "P25", "melodia", -2, "wg szkieletu 'hop'", 1, None),
           ("chd", "BNJ", "akompaniament", -8, "ósemki w shuffle", 1, None),
           ("bass", "TRI", "bas", -4, "korzeń na 1 i 3", 1, None),
           ("orn", "GLK", "akcent", -10, "ostatnia ćwierćnuta co 4. taktu", 4, None)],
   drums=("shuffle", dict(BRSH=-12, KICK=-14)), fx="REV-S 8%", dyn=[], loop_note="takt 16 -> 1",
   distinct="wesołość", forbid="napięcie")
