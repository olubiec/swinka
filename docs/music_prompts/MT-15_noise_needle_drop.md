# MT-15 · noise_needle_drop · Szum: opuszczenie igły (jednorazowy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_needle_drop.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_needle_drop.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 0.900 s (39690 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | nie: bez pętli; początek i koniec w zerowym przejściu |
| Seed | 55490 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. 0-40 ms: cisza (przed igłą).
2. 40-100 ms: cichy puls tonu 90 Hz (60 ms, -18 dB), sinus z zanikiem wykładniczym.
3. 100-350 ms: szum szczotkowy narastający (pasmo 2-8 kHz, od -50 do -30 dB).
4. 350-900 ms: szum rozpływa się w trzask winylu (ten sam generator co noise_vinyl_crackle, od -36 dB do poziomu pętli), ogon 100 ms bez cięcia.

## Odbiór

1. Początek i koniec w zerowym przejściu, brak kliknięcia.
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-15.md`.
