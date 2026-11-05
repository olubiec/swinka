# MT-13 · jingle_stage · Jingle zmiany etapu życia

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
