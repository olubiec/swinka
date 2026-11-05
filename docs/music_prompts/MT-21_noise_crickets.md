# MT-21 · noise_crickets · Szum: świerszcze (pętla)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_crickets.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_crickets.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 16.000 s (705600 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | tak: pętla bezszwowa 16,000 s (okresy świerszczy wybrać dzielniki 16 s) |
| Seed | 46283 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Trylki 4,3 kHz po 3 impulsy (20 ms co 35 ms), 4-5 świerszczy w różnych panoramach, każdy ze stałym własnym tempem (±5%), poziom -34 dB.
2. Delikatne falowanie amplitudy 0,3 Hz ±2 dB; brak jednoczesnego startu.

## Odbiór

1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu).
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-21.md`.
