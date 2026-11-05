# MT-18 · noise_rain · Szum: deszcz na dachu (pętla)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_rain.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_rain.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 12.000 s (529200 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | tak: pętla bezszwowa 12,000 s |
| Seed | 32953 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Szum różowy z górnoprzepustem 400 Hz, -34 dB (podłoże).
2. Krople: losowe kliknięcia sinus 3-6 kHz, zanik 8 ms, gęstość 60 na sekundę, pan losowy ±0,8, poziom -40…-30 dB.
3. Co ~3 s „rozbryzg” 80 ms (szum pasmowy 1-4 kHz, -32 dB).
4. Dach: dodatkowy rezonans pasmowy 220 Hz (Q 4) -46 dB.

## Odbiór

1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu).
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-18.md`.
