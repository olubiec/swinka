# MT-12 · jingle_birthday · Jingle urodzin

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
