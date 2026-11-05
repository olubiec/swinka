"""Jingle i szumy: zadania ze szczegółowym przebiegiem czasowym (używane przez gen_prompts.py)."""

COMMON = ("> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.\n\n")

NOISE_NOTE = ("Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, "
              "która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.")

NOISE = [
    (14, "noise_vinyl_crackle", "Szum: trzask winylu (pętla)", 8.0, "stereo", True,
     ["Impulsy Poissona 4-12 na sekundę (intensywność zmienia się wolno 0,2 Hz), amplituda lognormalna -42…-28 dB, długość impulsu 0,3-1,5 ms (kliknięcie: różnica dwóch wykładniczych).",
      "Co ~2 s większy „pop” -24 dB (losowo ±0,5 s), długość do 3 ms.",
      "Pod spodem szum brązowy -50 dB z górnoprzepustem 200 Hz.",
      "Pan każdego impulsu losowy ±0,6. Brak regularności słyszalnej jako rytm (nie więcej niż 2 impulsy w odstępie < 20 ms)."],
     "pętla bezszwowa 8,000 s (352 800 próbek); impulsy nie mogą przecinać punktu zszycia"),
    (15, "noise_needle_drop", "Szum: opuszczenie igły (jednorazowy)", 0.9, "stereo", False,
     ["0-40 ms: cisza (przed igłą).", "40-100 ms: cichy puls tonu 90 Hz (60 ms, -18 dB), sinus z zanikiem wykładniczym.",
      "100-350 ms: szum szczotkowy narastający (pasmo 2-8 kHz, od -50 do -30 dB).", "350-900 ms: szum rozpływa się w trzask winylu (ten sam generator co noise_vinyl_crackle, od -36 dB do poziomu pętli), ogon 100 ms bez cięcia."],
     "bez pętli; początek i koniec w zerowym przejściu"),
    (16, "noise_needle_lift", "Szum: podniesienie igły (jednorazowy)", 0.6, "stereo", False,
     ["0-250 ms: trzask winylu -36 dB, narastanie szumu szczotkowego.", "250-330 ms: nagły spadek poziomu o 30 dB (krzywa wykładnicza 80 ms).",
      "330-410 ms: końcowy „stuk” 140 Hz (-20 dB, sinus, zanik 80 ms).", "410-600 ms: cisza z ogonem pokoju (szum brązowy -60 dB)."],
     "bez pętli"),
    (17, "noise_needle_skip", "Szum: przeskok igły (jednorazowy)", 0.35, "stereo", False,
     ["Szum pasmowy przesuwający się z 2 do 6 kHz w ciągu 120 ms (-30 dB).", "Dwa pop-y -20 dB: w 0,00 s i 0,09 s.", "Urwany ogon: 20 ms fade-out po 350 ms."],
     "bez pętli"),
    (18, "noise_rain", "Szum: deszcz na dachu (pętla)", 12.0, "stereo", True,
     ["Szum różowy z górnoprzepustem 400 Hz, -34 dB (podłoże).", "Krople: losowe kliknięcia sinus 3-6 kHz, zanik 8 ms, gęstość 60 na sekundę, pan losowy ±0,8, poziom -40…-30 dB.",
      "Co ~3 s „rozbryzg” 80 ms (szum pasmowy 1-4 kHz, -32 dB).", "Dach: dodatkowy rezonans pasmowy 220 Hz (Q 4) -46 dB."],
     "pętla bezszwowa 12,000 s"),
    (19, "noise_wind", "Szum: wiatr (pętla)", 14.0, "stereo", True,
     ["Szum różowy z filtrem pasmowym przemiatanym 300-900 Hz przez LFO 0,1 Hz (okres 10 s; szczyt co ~7 s przez drugi LFO 0,07 Hz).",
      "Ledwo słyszalny gwizd: sinus 700 Hz, -48 dB, modulacja amplitudy 0,2 Hz.", "Poziom podłoża -34 dB; żadne porywy powyżej -30 dB."],
     "pętla bezszwowa 14,000 s; okres LFO tak dobrany, by szew trafiał w tę samą fazę (14 s = 1,4 okresu 0,1 Hz → użyj 0,0714 Hz lub 0,1429 Hz)"),
    (20, "noise_birds", "Szum: ptaki (pętla)", 20.0, "stereo", True,
     ["Pięć typów ćwierknięć: (1) sinus przemiatany 2,5→4,5 kHz, 60 ms; (2) trylek 3 impulsów 3,8 kHz, razem 120 ms; (3) „piu” 3→2,2 kHz, 140 ms; (4) krótkie „ci” 5 kHz, 25 ms; (5) dwugłos (dwa sinusy w odstępie kwinty).",
      "Przerwy losowe 0,4-3 s; dwa ptaki naraz w różnych panoramach (L −0,6, R +0,6); poziom -30…-24 dB.", "Zawsze obwiednia ADSR 3/20/50/40 ms; bez bardzo regularnego powtarzania tego samego typu dwa razy z rzędu."],
     "pętla bezszwowa 20,000 s; ćwierknięcie nie przecina szwu"),
    (21, "noise_crickets", "Szum: świerszcze (pętla)", 16.0, "stereo", True,
     ["Trylki 4,3 kHz po 3 impulsy (20 ms co 35 ms), 4-5 świerszczy w różnych panoramach, każdy ze stałym własnym tempem (±5%), poziom -34 dB.", "Delikatne falowanie amplitudy 0,3 Hz ±2 dB; brak jednoczesnego startu."],
     "pętla bezszwowa 16,000 s (okresy świerszczy wybrać dzielniki 16 s)"),
    (22, "noise_room_tone", "Szum: ton pokoju (pętla)", 10.0, "stereo", True,
     ["Szum brązowy z dolnoprzepustem 400 Hz, -50 dB.", "Cichy rezonans 120 Hz (Q 6), -56 dB.", "Okazjonalny „skrzyp” drewna: szum pasmowy 600 Hz (Q 8), 150 ms, -46 dB, co ~6 s (losowo ±2 s)."],
     "pętla bezszwowa 10,000 s"),
]


def noise_md(mt, i, title, dur, ch, loop, parts, lp):
    n = int(round(dur * 44100))
    out = ["# MT-%d · %s · %s" % (mt, i, title), "", COMMON.rstrip(), "",
           "> Plik wynikowy: `%s.ogg`. Warstwa generowana kodem (`tools/music/noise/%s.py`), bez melodii, bez motywu Cuy." % (i, i), "",
           "## Parametry", "", "| Parametr | Wartość |", "| --- | --- |",
           "| Długość | %.3f s (%d próbek @ 44,1 kHz) |" % (dur, n), "| Kanały | %s |" % ch, "| Pętla | %s |" % ("tak: " + lp if loop else "nie: " + lp),
           "| Seed | %d |" % (abs(hash(i)) % 100000 if False else sum(map(ord, i)) * 31 % 100000), "", NOISE_NOTE, "", "## Składniki", ""]
    for k, p in enumerate(parts, 1):
        out.append("%d. %s" % (k, p))
    out += ["", "## Odbiór", "", "1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu)." if loop else "1. Początek i koniec w zerowym przejściu, brak kliknięcia.",
            "2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.", "3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-%d.md`." % mt]
    return "\n".join(out) + "\n"


JB = """# MT-12 · jingle_birthday · Jingle urodzin

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.
> Plik wynikowy: `jingle_birthday.ogg` (OGG, **mono**, -14 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu wliczony). Zdarzenie `Birthday` (`Pet.cs:177`).

## Parametry

| Parametr | Wartość |
| --- | --- |
| Tempo | 108 BPM (ósemka = 0,278 s, ćwierćnuta = 0,556 s), 4/4 |
| Tonacja | C-dur (C D E F G A B), motyw C5 D5 E5 G5, podpis D5 E5 G5 |
| Długość | 5,00 s razem z ogonem |
| Seed | 12012 |

## Przebieg (czas bezwzględny)

| Czas | Wydarzenie | Głos | Nuty / rytm | Poziom |
| --- | --- | --- | --- | --- |
| 0,00-0,83 s | trójdźwięk w górę | `GLK` | C5 (0,00 s) E5 (0,28 s) G5 (0,56 s), ósemki | 0 dB |
| 0,83-2,50 s | motyw Cuy pełny | `GLK` + `P12` (oktawa niżej, C4 D4 E4 G4) | C5 (0,83) D5 (1,11) E5 (1,39) G5 (1,67, trzymana do 2,50) | `GLK` 0 dB, `P12` -6 dB |
| 2,50-3,61 s | odpowiedź „imprezowa” | róg `P25` staccato | G4 (2,50) G4 (2,78) C5 (3,06, trzymana do 3,61), „tu-tu-tuu” | -4 dB |
| 2,50-3,61 s | arpeggio pod spodem | `XYL` | C5 E5 G5 C6 ósemkami od 2,50 s | -10 dB |
| 3,61-5,00 s | akord końcowy | `GLK`/`BELL` | Cmaj9 = C4 E4 G4 D5 przytrzymany; na wierzchu `BELL` G5, zanik 1,2 s | akord -2 dB, `BELL` -3 dB |
| 0,00 i 3,61 s | bas | `TRI` | C3, długa nuta (pierwszy i ostatni akord) | -8 dB |
| 2,00-4,00 s | konfetti | `SHK` | szum 6-10 kHz rozproszony, pan losowy, gęstość rosnąca i malejąca | -20 dB |

Efekty: `REV-M` 16%. Wyjście mono (suma bez zmiany barwy).

## Odbiór

1. Całość 5,0 s ±0,1; koniec ogona w ciszy.
2. Motyw Cuy rozpoznawalny po 0,83 s; żadna cudza melodia (bez „Happy Birthday”).
3. Brak perkusji z werblem.
4. `music-audit.js` zielony; wiersz w `docs/music_review/MT-12.md`.
"""

JS = """# MT-13 · jingle_stage · Jingle zmiany etapu życia

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.
> Plik wynikowy: `jingle_stage.ogg` (OGG, **mono**, -14 LUFS, szczyt ≤ -1 dBTP, bez pętli). Zdarzenie `StageChanged` (`Pet.cs:163`).

## Parametry

| Parametr | Wartość |
| --- | --- |
| Tempo | 96 BPM (ósemka = 0,3125 s, ćwierćnuta = 0,625 s), 4/4 |
| Tonacja | G-dur (G A B C D E F#), podpis A4 B4 D5 (stopnie 2 3 5) |
| Długość | 4,90 s razem z ogonem (maks. 5 s) |
| Seed | 13013 |

## Przebieg (wersja bazowa)

| Czas | Wydarzenie | Głos | Nuty / rytm | Poziom |
| --- | --- | --- | --- | --- |
| 0,00-1,56 s | arpeggio w górę | `GLK` | G4 (0,00) B4 (0,31) D5 (0,63) G5 (0,94) B5 (1,25), ósemki | 0 dB |
| 1,56-2,81 s | podpis Cuy | `BELL` + `P12` | A4 (1,56) B4 (1,88) D5 (2,19, ćwierćnuta do 2,81) | `BELL` -3 dB, `P12` -6 dB |
| 2,81-4,31 s | akord przytrzymany | `BELL`/`GLK` | Gmaj9 = G3 B3 D4 F#4 A4, 1,5 s | -3 dB |
| 3,50-4,10 s | „uśmiech” | `HARP` | glissando w dół G6→G5 (0,6 s) | -12 dB |
| 4,31-4,90 s | ogon pogłosu | | `REV-M` 16% | |

## Warianty (kodem, bez nowych plików; opis w `music.json` → `arrangements`)

| Wariant | Zmiana |
| --- | --- |
| Baby | wszystko o oktawę wyżej, `CEL` zamiast `BELL` |
| Legend | złota warstwa: `HARP` podwaja podpis oktawę wyżej, `PAD` na D4 pod spodem (-14 dB) |
| Senior | tempo ×0,85 (długość ≤ 5 s: przytrzymanie akordu skrócone do 1,0 s) |
| pozostałe | wersja bazowa |

## Odbiór

1. Długość ≤ 5,0 s dla każdego wariantu, bez perkusji.
2. Podpis Cuy słyszalny w 1,56-2,81 s.
3. `music-audit.js` zielony; wiersz w `docs/music_review/MT-13.md`.
"""


def items():
    out = [(12, "jingle_birthday", "Jingle urodzin", "jingle", JB), (13, "jingle_stage", "Jingle zmiany etapu", "jingle", JS)]
    for mt, i, title, dur, ch, loop, parts, lp in NOISE:
        out.append((mt, i, title, "szum", noise_md(mt, i, title, dur, ch, loop, parts, lp)))
    return out
