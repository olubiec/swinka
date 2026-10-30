# Start: 6 kroków

1. Skopiuj zawartość tego folderu do głównego katalogu repo (zachowaj ścieżki: `.github/`, `scripts/`, `docs/`, `tasks/`). Plik `examples/ci.yml` skopiuj do `.github/workflows/ci.yml` i dopasuj komendę testów (workflow musi się nazywać `CI`).
2. Wygeneruj klucz API Julesa (jules.google/settings) i dodaj go jako sekret repo `JULES_API_KEY` (Settings → Secrets and variables → Actions).
3. Dodaj sekret `LOOP_TOKEN`: PAT (fine-grained) tylko dla tego repo z uprawnieniami Contents, Pull requests, Issues, Actions, Variables: Read and write. Dzięki niemu scalenia uruchamiają kolejne workflowy.
4. W Jules połącz repo z GitHubem. Skopiuj `docs/GOALS.example.md` jako `docs/GOALS.md` i opisz, czym ma być projekt (to czyta planista).
5. Włącz Pages (Settings → Pages → `main` / `/docs`) dla podglądu: `https://<owner>.github.io/<repo>/dashboard.html`.
6. Uruchom: Actions → Jules Loop → Run workflow → `tick`. Dalej pętla działa sama (cron co 30 min).

Test lokalny (bez GitHuba i Julesa): `node scripts/jules-loop/test/simulate.mjs` (14 scenariuszy) i `node scripts/jules-loop/test/chaos.mjs` (losowe awarie, ok. 2 min).
Szczegóły: `scripts/jules-loop/README.md`, `docs/JAK_TO_DZIALA.md`. Blok do projektu Claude: `docs/CLAUDE_PROJECT_INSTRUCTIONS.md`.

## Wariant bez Julesa: Antigravity CLI (`agy`) w Actions

Gdy Jules przestanie działać (albo od razu): ustaw zmienną repo `LOOP_BACKEND` = `agy`. Pętla zamiast Julesa odpala workflow `.github/workflows/agent-run.yml`, który uruchamia `agy` na runnerze, commituje i otwiera PR.

1. Sekret `GEMINI_API_KEY`: klucz z Google AI Studio z włączonym rozliczeniem (kredyt $10/mies. z planu Pro idzie na to konto Cloud). Bez rozliczeń dostaniesz tylko darmowy tier z małymi limitami.
2. `LOOP_TOKEN` jest tu obowiązkowy (push i PR z PAT, żeby CI ruszyło).
3. Zmienne: `LOOP_BACKEND=agy`, `AGY_MODEL` (np. `Gemini 3.5 Flash (Low)`; puste = domyślny model agy, może być droższy), `LOOP_DAILY_BUDGET` (domyślnie 20 sesji/dobę), `LOOP_MAX_CONCURRENT` (domyślnie 4), `AGY_TIMEOUT_MIN` (60).
4. Na koncie Google ustaw budżet z alertem. W AI Studio najpewniejszy twardy limit to prepaid (saldo, które się kończy).
5. Test: `node scripts/jules-loop/test/agy.mjs`. UWAGA: testy używają atrapy GitHuba; same wywołania `agy` (klucz API, flagi, pseudo-terminal) nie były uruchomione na prawdziwej maszynie. Pierwszy przebieg zrób ręcznie i obejrzyj log.

## Ciągłe szukanie ulepszeń (domyślnie włączone, tryb autonomiczny)
- **Audyt:** przed planowaniem każdej fali pętla zbiera fakty (`npm audit`, `npm outdated`, TODO/FIXME w kodzie) i podaje je planiście. Wyłączenie: `LOOP_AUDIT=off`.
- **Inspiracje:** dopisz w `docs/GOALS.md` linię `Inspiracje: <fraza>`. Co `LOOP_INSPIRE_DAYS` (7) pętla szuka repozytoriów z licencją MIT/Apache-2.0/BSD i zapisuje kandydatów w issue „💡 Jules Loop: inspiracje do akceptacji” (same metadane). Zaznacz `[x]` przy tych, z których wolno czerpać wzorce (działa z telefonu). Bez zaznaczenia nic nie trafia do planu, a kod i tak nie jest kopiowany 1:1. Wyłączenie: `LOOP_INSPIRE=off`.
- **Scalanie po SHA:** merge przechodzi tylko dla dokładnie tego commita, który przeszedł CI i strażnika (jeśli agent dopisał commit w międzyczasie, GitHub odrzuci merge i pętla ponowi próbę).
- **Opcjonalna zgoda człowieka:** `LOOP_MERGE_LABEL=ok` sprawia, że zielony PR czeka na etykietę `ok`. Domyślnie wyłączone (pętla scala sama); po włączeniu pętla nie jedzie dalej bez Twojej etykiety.
- Testy: `node scripts/jules-loop/test/extras.mjs`.

## Budowanie z gotowych elementów (domyślnie włączone)
- Każde zadanie w `tasks/` ma linię `Szukaj: <2-5 angielskich słów>` (planista wpisuje ją sam; w zadaniach ręcznych dopisz ją sam). Przed startem sesji pętla szuka na GitHubie repozytoriów z wolną licencją (MIT, Apache-2.0, BSD, ISC, Unlicense, CC0; min. 50 gwiazdek, aktywne w ostatnich 2 latach, bez GPL i bez repo bez licencji) i dołącza listę do promptu. Agent ma: użyć gotowej biblioteki jako zależności, a fragment kodu wziąć tylko z zachowaniem licencji i z wpisem do `THIRD_PARTY.md`. Gdy nic nie pasuje, pisze od zera i zaznacza to w PR (`Gotowe: brak`).
- `Od zera: tak` w pliku zadania wyłącza to dla tego zadania.
- Planista dostaje też kandydatów na całe gotowe projekty/komponenty (linia `Inspiracje:` w `docs/GOALS.md`, issue „💡 Jules Loop: gotowe projekty…”). Pole `[ ]` = wolno korzystać, `[x]` = preferowane, `[-]` = odrzucone. `LOOP_INSPIRE_AUTO=off` wymaga zaznaczenia `[x]`.
- Zmienne: `LOOP_REUSE` (on/off), `LOOP_REUSE_MIN_STARS` (50), `LOOP_REUSE_LICENSES`. W dozwolonych zmianach spoza zakresu są teraz `package.json` i `THIRD_PARTY.md` (żeby dało się dodać zależność); lockfile'e już były.
- Uwaga: sama lista pochodzi z wyszukiwarki GitHuba po słowach kluczowych, więc jakość kandydatów bywa różna, a agent sam ocenia dopasowanie. Do opisów repo agent nie ma dostępu z orkiestratora (tylko nazwa, licencja i URL), ale treść pobranych repozytoriów jest niezaufana.
