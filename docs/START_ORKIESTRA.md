# Start wszystkich fal w Antigravity (orkiestra)

> **Opcjonalne.** Orkiestra startuje tylko na wyraźną prośbę użytkownika; agenci nie uruchamiają jej sami (`CLAUDE.md`, `AGENTS.md`).

Stan na 3.11.2026. Plan: `waves.yaml` (**46 fal, 162 zadania**), prompty: `docs/prompts/` (jeden plik na zadanie, wszystkie ścieżki `prompt_file` istnieją). Narzędzie: `tools/orkiestra`, konfiguracja: `orkiestra.toml` (agent `agy`, model `gemini-3-flash`, 2 zadania równolegle, 2 próby, `stop_on_failure = true`).
Pętla Julesa (`.github/workflows/jules-loop.yml`) jest wyłączona; nic w `tasks/` jej nie uruchomi (tam zostały tylko `BACKLOG.md` i `done/`).

## Przed pierwszym startem (raz)
1. `pip install -e tools/orkiestra` (Python 3.11+), `gh auth login`, sprawdź `agy models` i `agy -p "Reply with exactly: OK" --output-format json`.
2. Wejdź na gałąź `main`, zrób `git pull`, upewnij się, że drzewo robocze jest czyste.
3. `orkiestra validate` (oczekiwane: `OK: 46 fal, 162 zadań`) oraz `node tools/qa/plan-audit.js` (oczekiwane: `PLAN AUDIT OK`).
4. `orkiestra run --dry-run` pokazuje kolejność i polecenia bez uruchamiania agenta.

## Start
- Wszystko po kolei: `orkiestra run` (fale idą kolejno, zadania w fali równolegle, scalanie lokalne, `merge_mode = "local"`).
- Jedna fala: `orkiestra run --wave W12`; jedno zadanie: `orkiestra run --task W12-03`.
- Stan zapisuje `.orkiestra/state.json` (poza gitem): po przerwaniu `orkiestra run` kontynuuje, zadania gotowe się nie powtarzają.
- Zmiana planu w trakcie nie kasuje stanu (zadania są rozpoznawane po id).

## Kolejność fal (zależności są ścisłe, plan jest już w tej kolejności)
| Blok | Fale | Co dostaje gra |
|---|---|---|
| Testy i porządki | w-validation-tests, w-perf-tests, w-backlog-cleanup | testy danych i symulacji, wydajność, dokumentacja |
| Nazwane świnki | W11-W15 | adopcja, wiek, mnożniki, tryb pamięci |
| Świat | W16-W22 (z pod-falami a/b) | pokoje, ogród, farma, targ, ekonomia |
| Pokoje świnek i dom | W23-W30 (pod-fale a-e) | pokoje świnek, sypialnia, wędrowanie, wybieg, rekwizyty, sklep |
| Grafika w kodzie | W31-W33 | G10-G16: sprawdzanie assetów, ikona, UI 9-slice, światło i pory dnia, cienie świnek, lista `_x2`, weryfikacja końcowa |

Ostatnie zmiany porządkowe (3.11): usunięto z planu dwie fale już wykonane (`w-qa-tools`, `w-compat-tests`: pliki są w `main`); poprawiono zakres `files` w W17-08 (był nieistniejący plik); prompty W11 przeniesiono z `tasks/` do `docs/prompts/`; dodano fale W31-W33 (G10-G16 z `docs/PLAN.md`, wcześniej poza planem).

## Bramki po stronie człowieka (orkiestra ich nie zastąpi)
1. Po W14, W15, W22, W26, W30: test na Windowsie wg `TESTY_RECZNE.md`.
2. Po W33-01: potwierdź usunięcie 102 plików `assets/world/**/*_x2.png` wg `docs/X2_DELETE_LIST.md` (nic nie jest kasowane automatycznie).
3. Po W33-02: obejrzyj ekrany w grze (lista w `docs/VISUAL_LOG.md`).
4. Fala S (restyl świata) i zadania P0-P3 grafiki: `docs/GRAFIKA_KOLEJKA.md`; kod nie czeka na grafikę (glify zapasowe).

## Poza planem (świadomie)
- **Model działek farmy „trawnik → grządka/drzewko"** z `docs/PLAN.md` (sekcja „Pole i sad zależne od gracza"): zmienia stan zapisu farmy i ceny przeróbki, więc wymaga Twojej decyzji (koszt przeróbki działki, limit działek). Dopiero potem warto dopisać fale po W22.
- Z `tasks/BACKLOG.md` zostały pozycje niemożliwe do sprawdzenia lokalnie lub zbyt szerokie (cache CI, job `setup-sh`, przegląd martwego kodu i komentarzy TODO).
- Klucz Jules API leży w instrukcjach projektu Claude: unieważnij go (Jules nie jest już używany).
