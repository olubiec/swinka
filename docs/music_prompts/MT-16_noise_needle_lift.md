# MT-16 · noise_needle_lift · Szum: podniesienie igły (jednorazowy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_needle_lift.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_needle_lift.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 0.600 s (26460 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | nie: bez pętli |
| Seed | 55304 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. 0-250 ms: trzask winylu -36 dB, narastanie szumu szczotkowego.
2. 250-330 ms: nagły spadek poziomu o 30 dB (krzywa wykładnicza 80 ms).
3. 330-410 ms: końcowy „stuk” 140 Hz (-20 dB, sinus, zanik 80 ms).
4. 410-600 ms: cisza z ogonem pokoju (szum brązowy -60 dB).

## Odbiór

1. Początek i koniec w zerowym przejściu, brak kliknięcia.
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-16.md`.
