# MT-14 · noise_vinyl_crackle · Szum: trzask winylu (pętla)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_vinyl_crackle.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_vinyl_crackle.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 8.000 s (352800 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | tak: pętla bezszwowa 8,000 s (352 800 próbek); impulsy nie mogą przecinać punktu zszycia |
| Seed | 62589 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Impulsy Poissona 4-12 na sekundę (intensywność zmienia się wolno 0,2 Hz), amplituda lognormalna -42…-28 dB, długość impulsu 0,3-1,5 ms (kliknięcie: różnica dwóch wykładniczych).
2. Co ~2 s większy „pop” -24 dB (losowo ±0,5 s), długość do 3 ms.
3. Pod spodem szum brązowy -50 dB z górnoprzepustem 200 Hz.
4. Pan każdego impulsu losowy ±0,6. Brak regularności słyszalnej jako rytm (nie więcej niż 2 impulsy w odstępie < 20 ms).

## Odbiór

1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu).
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-14.md`.
