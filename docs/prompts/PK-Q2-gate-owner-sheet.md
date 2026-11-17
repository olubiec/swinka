# PK-Q2: Owner test sheet and screenshots for the whole wave
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p70-owner-shots.js, docs/qa/shots, docs/opt/log/PK-Q2.md
Wymagane: tools/qa/ux-p70-owner-shots.js
Weryfikacja: node --check tools/qa/ux-p70-owner-shots.js && node tools/qa/ux-p70-owner-shots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Give the owner one short sheet with screenshots so the whole wave (P46, P47, P43, P5, P6, P7 and notes 24-28) can be judged by eye in minutes on Windows.

Depends on: wszystkie paczki kroków F2-1..F2-5 scalone; `docs/qa/shots/baseline/` z PK-T13 istnieje.

Produces (names other packages rely on): sekcje "Fala 2" w `docs/qa/UX_WAVE_CHECKS.md`; `docs/qa/shots/owner-*.png`.

## Steps
1. W `docs/qa/UX_WAVE_CHECKS.md` dodaj sekcje w formacie wcześniejszych: jedna na fale zadań (P46 obiekty plenerowe, P47 tła/pasek/kadr, P43 sceny interaktywne, P5 wiele świnek, P6 szuflada i światło, P7 lampy/zabawa/pogoda) z wierszem na plik `ux-p*` oraz 3-5 punktami do sprawdzenia ręcznie w grze (zrzuty: obiekty plenerowe w Edit; zmiana kupionej tapety i podłogi; lampka zachowuje efekt nocy gdy świnka podchodzi; okno nie ucięte od dołu na skali 100%/125%/150%; świnka tej samej wielkości po upgrade pokoju; przestawialna lampka pod ścianą; dwie świnki w scenie i przypięcie).
2. Osobna sekcja "Uwagi właściciela 24-28": jedna linia na uwagę z oczekiwanym efektem i nazwą testu, który ją pokrywa (PK-T9, PK-T7, PK-T6, PK-T5, PK-T9).
3. `tools/qa/ux-p70-owner-shots.js` (Playwright, mock `seven`, okno 420x640): `owner-<scena>.png` dla 5 scen, `owner-edit-drawer.png`, `owner-night-lamp.png`, `owner-two-pigs.png`.
4. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.

Log: write `docs/opt/log/PK-Q2.md` (max 10 linii).
