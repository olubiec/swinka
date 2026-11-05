# MT-17 · noise_needle_skip · Szum: przeskok igły (jednorazowy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_needle_skip.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_needle_skip.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 0.350 s (15435 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | nie: bez pętli |
| Seed | 55552 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Szum pasmowy przesuwający się z 2 do 6 kHz w ciągu 120 ms (-30 dB).
2. Dwa pop-y -20 dB: w 0,00 s i 0,09 s.
3. Urwany ogon: 20 ms fade-out po 350 ms.

## Odbiór

1. Początek i koniec w zerowym przejściu, brak kliknięcia.
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-17.md`.
