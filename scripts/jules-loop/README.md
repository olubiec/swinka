# Jules Loop: instalacja (5 minut)

Pętla: Haiku wypycha `tasks/W<n>-<id>-<nazwa>.md` na main → Jules buduje → strażnik zgodności z planem → CI zielone = merge, czerwone = poprawka przez Julesa → fala testów (generowana ze zmian) → CI na main → zapis do pliku stanu → następna fala.

## Pliki
- `.github/workflows/jules-loop.yml`
- `scripts/jules-loop/orchestrator.mjs`
- `examples/ci.yml` – wzór CI (filtry ścieżek + anulowanie starych przebiegów); nazwa workflow musi być `CI`
- repo musi mieć `AGENTS.md`

## Ustawienia
1. Secret `JULES_API_KEY` – klucz z jules.google.com/settings.
2. Secret `LOOP_TOKEN` (zalecany) – PAT: contents, pull requests, issues, actions, variables (read/write). Bez niego merge'e z github-actions nie uruchamiają kolejnych workflowów, a przy ochronie gałęzi nie zapiszesz pliku stanu.
3. Aplikacja Jules zainstalowana na repo.
4. Opcjonalne zmienne repo: `LOOP_CI_WORKFLOW` (ci.yml), `LOOP_MAX_CONCURRENT` (12), `LOOP_DAILY_BUDGET` (80), `LOOP_FIX_GRACE_MIN` (10), `LOOP_TEST_WAVE` (on/off), `LOOP_PLAN_GUARD` (on/off), `LOOP_STATE_FILE` (docs/PROJECT_STATE.md), `LOOP_SCOPE_ALLOW` (lockfile'e dozwolone poza zakresem).
5. Branch protection na main: wymagaj zielonego CI.

## Format zadania
```
# Tytuł
Cel: ...
Zmieniaj: src/a.js, tests/a.test.js
Wymagane: tests/a.test.js
Weryfikacja: npm test
```
- `Zmieniaj:` – jedyne pliki, które PR może ruszyć (plus `Wymagane`). Nakładanie się zakresów w jednej fali = fala odrzucona bez zużycia sesji.
- `Wymagane:` – pliki, które muszą się pojawić w PR-ze (np. test, dokument).

## Strażnik zgodności (przed każdym merge'em, bez tokenów Claude)
1. Pliki spoza `Zmieniaj`/`Wymagane` → Jules dostaje prośbę o cofnięcie.
2. Brak plików z `Wymagane` → prośba o dodanie.
3. Usunięte asercje (`expect`/`assert`…) bez zastąpienia → prośba o przywrócenie (też w falach testów i napraw).
Po 2 prośbach bez skutku: etykieta `needs-human` + powiadomienie.

## Pełna autonomia
- Każdy prompt kończy się blokiem „TRYB AUTONOMICZNY”: żadnych pytań, decyzje podejmuje Jules i opisuje je w PR. Plany są zatwierdzane automatycznie.
- Gdy Jules mimo to zapyta (`AWAITING_USER_FEEDBACK`), pętla odpowiada „zdecyduj sam”; po 3 pytaniach restartuje sesję.
- Limit czasu sesji: 120 min (`LOOP_SESSION_TIMEOUT_MIN`). Po nim Jules dostaje polecenie natychmiastowego zakończenia i otwarcia PR; jeśli po kolejnych 15 min (`LOOP_FORCE_GRACE_MIN`) nie ma PR, stara sesja jest usuwana i startuje nowa z krótszym zakresem. Po 2 nieudanych sesjach: `needs-human`.
- **Korekta następnej fali:** po zakończeniu każdej fali pętla uruchamia sesję Julesa, która aktualizuje pliki zadań kolejnej fali do faktycznego stanu kodu (ścieżki, nazwy, interfejsy, to, co już zrobiono). Ograniczenia: tylko istniejące pliki `tasks/W<n>-*.md`, `Zmieniaj` musi zostać i nie może się nakładać. Koszt: 1 sesja Julesa na falę. Gdy korekta się nie uda, fala rusza bez niej, bez pingu. Wyłączenie: `LOOP_REFRESH=off`.

## Sterowanie z telefonu
Komentarz w issue „🤖 Jules Loop: stan pętli” (GitHub Mobile): `/resume`, `/skip W2-03`, `/skip-wave`, `/pause`, `/go`, `/tick`. Pętla odpowiada reakcją 👍 i aktualizuje issue. Reagują tylko komentarze właściciela/współpracowników. Alternatywa: Actions → Jules Loop → Run workflow (także w GitHub Mobile).

## Tryb ciągły, bez człowieka (domyślny: `LOOP_AUTONOMOUS=on`)
Pętla nie ma stanu „czeka na człowieka”. Etykieta `needs-human` nie jest już używana (poza trybem `off`).

- **Samodzielne planowanie.** Gdy w `tasks/` nie ma niewykonanych fal, pętla uruchamia sesję Julesa „P<n>”, która czyta `AGENTS.md`, `docs/GOALS.md` (cele produktu, szablon w `docs/GOALS.example.md`), plik stanu i kod, po czym zapisuje nowe `tasks/W<n>-*.md`. Fokus rotuje: nowe funkcje, błędy i stabilność, testy, wydajność, UX i dostępność, bezpieczeństwo, dług techniczny, dokumentacja. PR planu jest sprawdzany (tylko nowe pliki zadań tej fali, max `LOOP_MAX_WAVE_TASKS`=8, `Zmieniaj` bez chronionych ścieżek i bez nakładania) i scalany. Gdy plan się nie uda, kolejna próba po 30 min, 60 min, 2 h... do 6 h. Pierwsza fala też powstaje sama: wystarczy uruchomić `/tick`.
- **Pierwsze, co robi pętla:** dopisuje zasady „bez pytań” do `AGENTS.md` (Jules czyta go sam) i dokleja je do każdego promptu. Pytania Julesa dostają odpowiedź „zdecyduj sam”.
- **Za trudne zadanie = rozbicie.** Przekroczony czas (120 min + 15 min na zakończenie), brak PR, ciągłe pytania, czerwone CI po prośbach o poprawkę, niezgodność z planem albo zawieszone CI: PR jest zamykany, a zadanie dzieli się na 3 etapy po kolei (podstawa, logika, dokończenie), każdy ze swoim promptem i zakresem `Zmieniaj`. W pliku zadania pojawia się adnotacja „Rozbite automatycznie”. Etap może być rozbity jeszcze raz (`LOOP_MAX_SPLIT_DEPTH`=2), potem zadanie jest porzucane, a pętla idzie dalej.
- **Nakładające się zakresy** nie odrzucają fali: zadania wykonują się po kolei.
- **Czerwony main po fali:** naprawa Julesa, druga naprawa, potem przerwy (60 min, 2 h... do 8 h) i próba „cofnij zmiany fali”. Brak CI na main lub CI, które nie startuje: sprawdzenie jest pomijane. Pętla nie czeka na człowieka.
- **Jedyny ping** to problem, którego pętla nie rozwiąże sama: zły klucz Julesa albo brak dostępu do repo (co 6 h, ponawia próbę co godzinę).
- **Hamulce:** `/pause` w issue pętli, etykieta `hold` na PR-ze, dzienny budżet sesji (`LOOP_DAILY_BUDGET`=80).

## Plik stanu projektu
`docs/PROJECT_STATE.md` – wpis dla każdego scalonego PR (co, efekt: +/− linii, pliki, CI, liczba poprawek) i dla zdarzeń pętli. Jeden commit `[skip ci]` na falę (oraz gdy pętla czeka na człowieka), żeby nie mnożyć commitów i przebiegów CI. Claude czyta ten plik na początku sesji zamiast pytać o stan.

## Powiadomienia (tylko gdy ktoś musi działać)
Pętla pinguje (`@wzmianka` w issue pętli) wyłącznie, gdy:
- zadanie wymaga człowieka (`needs-human`) albo CI na main jest czerwone po naprawach,
- fala została odrzucona przed startem,
- skończyły się fale i trzeba zaplanować następną (z podsumowaniem poprzedniej),
- nie da się zapisać pliku stanu.
Reszta (starty, merge'e, testy, pauzy limitów, poprawki) trafia tylko do pliku stanu i logu.

## Sterowanie
Actions → Jules Loop → Run workflow: `tick`, `resume`, `skip <ID>`, `skip-wave`, dry-run. Zdjęcie etykiety `needs-human` z PR wznawia zadanie.

## Podgląd (dashboard)

Plik `docs/dashboard.html` pokazuje na żywo: fazę, co pętla robi teraz, plan fali ze statusami zadań, kolejne fale z `tasks/`, zużycie sesji Julesa (24 h) i dziennik "co zrobił i z jakim efektem".

1. Settings → Pages → Deploy from branch → `main` `/docs`.
2. Otwórz `https://<owner>.github.io/<repo>/dashboard.html` (albo `...?repo=owner/nazwa`).
3. Repo prywatne lub szybsze odświeżanie: w "Ustawienia podglądu" wklej token tylko do odczytu (zapis lokalnie w przeglądarce). Bez tokena odświeża co 2 min, z tokenem co 30 s.

Dane pochodzą z issue śledzącego (`jules-loop`), więc podgląd nie zużywa limitów Claude ani minut Actions. Pojawi się po pierwszym ticku zaktualizowanego orchestratora. Na publicznym repo dane są publiczne.

## Backend `agy` (Antigravity CLI)
`LOOP_BACKEND=agy` podmienia Jules API na adapter w `orchestrator.mjs` (`agyApi`), który udaje sesje Julesa: start = `workflow_dispatch` na `agent-run.yml`, stan = status przebiegu, PR = gałąź `agy/<sid>`, prośba o poprawkę = kolejny przebieg `mode=amend`. Reszta pętli (fale, strażnik zgodności, CI, merge, dzielenie zadań) działa bez zmian.
Różnice: brak zatwierdzania planów i pytań (agent nie ma kogo pytać), komunikat `FORCE` nie dociera do trwającego przebiegu (jest twardy limit `AGY_TIMEOUT_MIN`, potem restart), prompt musi mieścić się w ok. 45 KB, przebiegi zużywają minuty Actions i tokeny API.

## Dodatki (audyt, inspiracje, merge po SHA)
`auditFacts()` zbiera fakty z narzędzi do promptu planu; `inspiration()` prowadzi issue z kandydatami (etykieta `jules-inspiration`) i zwraca tylko zaznaczone `[x]` (nazwa, licencja, URL; opis repo nie trafia do agenta, bo to niezaufany tekst). Merge wysyła `sha` głowy PR. Zmienne: `LOOP_AUDIT`, `LOOP_INSPIRE`, `LOOP_INSPIRE_DAYS`, `LOOP_MERGE_LABEL`.
