# MT-20 · noise_birds · Szum: ptaki (pętla)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_special.py`. Nie edytuj ręcznie.

> Plik wynikowy: `noise_birds.ogg`. Warstwa generowana kodem (`tools/music/noise/noise_birds.py`), bez melodii, bez motywu Cuy.

## Parametry

| Parametr | Wartość |
| --- | --- |
| Długość | 20.000 s (882000 próbek @ 44,1 kHz) |
| Kanały | stereo |
| Pętla | tak: pętla bezszwowa 20,000 s; ćwierknięcie nie przecina szwu |
| Seed | 36239 |

Poziomy komponentów to RMS w dBFS **przed** miksem; plik NIE jest normalizowany do LUFS (poziom w miksie ustawia warstwa, która go używa). Szczyt pliku ≤ -3 dBFS. Format: OGG Vorbis q5, 44,1 kHz.

## Składniki

1. Pięć typów ćwierknięć: (1) sinus przemiatany 2,5→4,5 kHz, 60 ms; (2) trylek 3 impulsów 3,8 kHz, razem 120 ms; (3) „piu” 3→2,2 kHz, 140 ms; (4) krótkie „ci” 5 kHz, 25 ms; (5) dwugłos (dwa sinusy w odstępie kwinty).
2. Przerwy losowe 0,4-3 s; dwa ptaki naraz w różnych panoramach (L −0,6, R +0,6); poziom -30…-24 dB.
3. Zawsze obwiednia ADSR 3/20/50/40 ms; bez bardzo regularnego powtarzania tego samego typu dwa razy z rzędu.

## Odbiór

1. Szew pętli niesłyszalny w teście 5× pętli (brak kliknięcia, brak skoku poziomu).
2. Szczyt ≤ -3 dBFS; brak DC offset; widmo zgodne z opisem.
3. `node tools/qa/music-audit.js` zielony; wiersz w `docs/music_review/MT-20.md`.
