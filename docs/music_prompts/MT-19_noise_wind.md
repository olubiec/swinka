# MT-19 · noise_wind · Szum: wiatr (pętla)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_wind.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_wind.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 14.000 s (617400 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | tak: pętla bezszwowa 14,000 s; okres LFO tak dobrany, by szew trafiał w tę samą fazę (14 s = 1,4 okresu 0,1 Hz → użyj 0,0714 Hz lub 0,1429 Hz) |
| Seed | 33201 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Szum różowy z filtrem pasmowym przemiatanym 300-900 Hz przez LFO 0,1 Hz (okres 10 s; szczyt co ~7 s przez drugi LFO 0,07 Hz).
2. Ledwo słyszalny gwizd: sinus 700 Hz, -48 dB, modulacja amplitudy 0,2 Hz.
3. Poziom podłoża -34 dB; żadne porywy powyżej -30 dB.

## Odbiór

1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu).
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-19.md`.
