# Przegląd muzyki (MT-10)

Arkusz odsłuchu to tabela `SHEET.md` w tym katalogu, generowana z manifestu `assets/data/music.json`.

## Jak wypełniać

1. Po każdej partii renderu: `python3 tools/music/build_manifest.py`, potem `node tools/qa/music-audit.js` (musi być zielony).
2. `python3 tools/music/review_sheet.py` tworzy lub odświeża `docs/music_review/SHEET.md`.
   Wypełnione kolumny (słuchawki, głośnik, mono, ocena, uwagi) są zachowywane dla istniejących id.
3. Odsłuch każdego utworu w trzech wariantach, zaznaczając `[x]`:
   - **słuchawki** (stereo, czysty dźwięk, sprawdź panoramę i szew pętli),
   - **głośnik laptopa** (bez basu, sprawdź, czy melodia i wyróżnik z promptu są słyszalne),
   - **mono** (sprawdź, czy stereo nie gubi elementów przy sumowaniu).
4. Ocena 1-5: 1 odrzucić, 2 przerobić, 3 do poprawy, 4 dobrze z drobnymi uwagami, 5 gotowe.
5. Uwagi konkretnie: takt, sekunda, głos (kod z palety), co brzmi źle.

Seed i specyfikacja nie zmieniają się po zatwierdzeniu odsłuchu. Poprawka idzie przez `tools/music/specs/<id>.json`
albo katalog `catalog_*.py`, a po niej ponowny render i nowy wiersz.

## Pliki

- `SHEET.md` arkusz (generowany, edytowany ręcznie tylko w kolumnach odsłuchu i oceny).
- Pomiary (LUFS, szczyt, długość, krawędzie pętli) pochodzą z manifestu, a nie z odsłuchu.
