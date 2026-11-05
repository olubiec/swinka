# MT-22 · noise_room_tone · Szum: ton pokoju (pętla)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_room_tone.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_room_tone.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 10.000 s (441000 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | tak: pętla bezszwowa 10,000 s |
| Seed | 50065 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Szum brązowy z dolnoprzepustem 400 Hz, -50 dB.
2. Cichy rezonans 120 Hz (Q 6), -56 dB.
3. Okazjonalny „skrzyp” drewna: szum pasmowy 600 Hz (Q 8), 150 ms, -46 dB, co ~6 s (losowo ±2 s).

## Odbiór

1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu).
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-22.md`.
