# PK-Q4: Owner test sheet (wave 3): Home parity, editor history, run, props
Zmieniaj: docs/qa/F3_OWNER_SHEET.md, docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p71-f3-owner-shots.js, docs/qa/shots, docs/opt/log/PK-Q4.md
Weryfikacja: node tools/qa/plan-audit.js && node --check tools/qa/ux-p71-f3-owner-shots.js && node tools/qa/ux-p71-f3-owner-shots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Write a one-page Windows checklist for the owner covering what only a human can verify after wave 3.

Steps
1. Napisz `docs/qa/F3_OWNER_SHEET.md`: tabela krok, jak sprawdzić, oczekiwany wynik, kolumna OK/NIE. Sekcje: (A) Home: świnka śpi w nocy (w domku nos wystaje), drzemie, pije, drapie się, biega, skacze, tańczy przy muzyce, ziewa, dwie śpią razem; reaguje na karmienie, głaskanie, sztuczki; chora nie biega; (B) edytor: Ctrl+Z/Ctrl+Y, przyciąganie; (C) wybieg w ogrodzie; (D) rekwizyty na pulpicie (DPI 125/150%, drugi monitor, pełny ekran); (E) dźwięki świata; (F) wydajność przy 3 świnkach.
2. Minimum 30 kroków. Każdy krok jedno zdanie, język angielski jak reszta `docs/qa/`.
3. Wskaż przy każdym kroku nazwę testu automatycznego, który to pokrywa, albo `manual only`.

Dodatkowo, wzorem Q2 (`docs/opt/log/PK-Q2.md`):
4. Dopisz w `docs/qa/UX_WAVE_CHECKS.md` sekcję "Fala 3: zachowania Home, edytor, wybieg, rekwizyty" (wiersze nowych `ux-p11x`/`ux-p12x` + 5-punktowa lista) w tym samym formacie co sekcja "Fala 2".
5. Napisz `tools/qa/ux-p71-f3-owner-shots.js` na wzór `tools/qa/ux-p70-owner-shots.js` (mock `seven`, 420x640, fallback `msedge`; popraw tam Q2 poprzez lekcje z commitów 4706bbf: odblokuj sceny przed zrzutem i ustaw wymiary płótna nakładki): zrzuty `docs/qa/shots/owner3-*.png` dla: świnka śpi w domku nocą, drzemka, picie, dwie śpią razem, bieg, edytor po Ctrl+Z, wybieg. Jeśli któreś zachowanie nie ma w mocku hooka, zrobiony zrzut wypisz jako `SKIP <id>`, nie wymyślaj.
6. W arkuszu, w sekcji, której dotyczą, przenieś nierozstrzygnięte uwagi właściciela z "Uwagi właściciela 24-28" (jeśli nadal otwarte po PK-B1).
7. Kroki z komfortem DPI (125/150%) i drugim monitorem oznacz `manual only`; zrzuty z `ux-p66-viewport-matrix.js` nie zastępują Windowsa.

Prohibited: editing code outside the files listed in Zmieniaj, data or tests, running git.

Log: `docs/opt/log/PK-Q4.md` (max 12 linii).
