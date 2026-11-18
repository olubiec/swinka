# PK-Q6: Owner test sheet (wave 4) and release readiness note
Zmieniaj: docs/qa/F4_OWNER_SHEET.md, docs/opt/log/PK-Q6.md
Weryfikacja: node tools/qa/plan-audit.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One-page Windows checklist for what only a human can verify after wave 4, plus a short note listing what remains before a release.

Steps
1. Napisz `docs/qa/F4_OWNER_SHEET.md`: tabela krok, jak sprawdzić, oczekiwany wynik, OK/NIE. Sekcje: (A) Hay Hop (granie, nagroda, limit dzienny); (B) towarzysz (ogród, park, przełącznik); (C) taniec przy muzyce; (D) pogoda na żywo (domyślnie wyłączona; zgoda; zapora; brak internetu; usunięcie lokalizacji; sprawdzenie w narzędziu sieciowym, że bez zgody nie ma ruchu); (E) etapy w Domku; (F) przejście całej gry po obu falach: adopcja, dom, ogród, farma, targ, park, edycja, sen, jedzenie.
2. Minimum 30 kroków, język angielski jak reszta `docs/qa/`; przy każdym nazwa testu automatycznego albo `manual only`.
3. W `docs/opt/log/PK-Q6.md` (max 15 linii) wypisz: co zostaje przed wydaniem (ręczne bramki Windows po falach W22, W26, W30, 2, 3 i 4; PK-23b BLOCKED; PK-21 częściowo; nowe DEFECT z bramki PK-Q5, jeśli log istnieje).

Prohibited: editing code, data or tests, running git.

Log: `docs/opt/log/PK-Q6.md`.
