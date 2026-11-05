# Raport testów przed wydaniem (bez muzyki)

Zakres: gameplay, ekonomia, grafika i pozostałe elementy Home. Muzyka wyłączona z zakresu.
Gałąź: `claude/friendly-hawking-5z7tef`. Kod gry testowany: `ebfdf84` (ta sama treść co `origin/main`). Narzędzia QA: do `3234e15`.
Środowisko: kontener cloud, Node 22, Chromium z `/opt/pw-browsers/chromium`. Testy Windows lokalnie niedostępne (folder `swinka-1` nieosiągalny z sesji cloud); zastąpione przebiegiem GitHub Actions.

## Podsumowanie

| Fala | Zakres | Wynik |
|---|---|---|
| 1 | dane, ścieżki, layout, a11y, plan | PASS (z długiem: 26 znanych błędów HTTP w `paths-test`) |
| 2 | ekonomia, grafika, CI, Windows, soak 60 s | Ekonomia i grafika PASS; CI i Windows PASS na `main`; **perf-soak FAIL** (patrz niżej) |
| 3 | soak, resource-loss, web-smoke, screen-matrix, visual-matrix | PASS (exit 0), z uwagami w muzyce |

## Fala 1
- `data-check`, `paths-test`, `layout.selftest`, `a11y-check`, `plan-audit`: PASS.
- `paths-test`: 26 znanych/otwartych błędów HTTP (dług, nie regresja).

## Fala 2
- `econ-gate`: OK.
- `econ-sim`, `economy-sim`: exit 0. Obserwacje balansu: profile `exploit` i `smart` przekraczają 365 dni na kilku kamieniach milowych; profil `casual` dociera do pierwszego pokoju L2 około dnia 90.
- Grafika: `anim-test` (60 animacji x 5 etapów), `check-assets`, `check-css-vars`, `check-icons`, `lights-test`, `minigame-fit-check` (veggie_rain, nyan_cuy, veggie_memory, hay_maze), `palette-test`: wszystkie OK.
- CI (`ci.yml`) i Windows (`windows.yml`) na `main`: success.
- **perf-soak (60 s, 15 s rozgrzewki, 75 kliknięć):** FAIL.
  - Węzły DOM, piętro: 690 (pierwsza połowa) → 754 (druga), +64. Start 633, koniec 769.
  - Listenery, piętro: 111 → 130 (+19), poniżej progu +25.
  - Rozmiar stanu gry (`getState()`): 14542 → 14540 B. **Stan płaski.**
  - Heap: 6,5 MB po rozgrzewce, 8,4 MB na końcu.
  - Ustalenia: hipoteza „wzrost stanu gry” **nie potwierdziła się**. Izolowane sondy (otwieranie i zamykanie każdej funkcji, zakładki rynku) nie wykazały liniowego wzrostu. Przyczyna nieznana; nie potwierdzony wyciek.
  - Zmiany w narzędziu: `a58156d` (stan gry w próbkach, reguła wyjaśniania przez stan z progiem 5%).

## Fala 3 (muzyka pominięta)
- `soak.js` (60 s): 25 kliknięć, zero błędów JS, zero nieoczekiwanych 4xx. Heap 7,8 → 19,9 MB, węzły DOM 275 → 367. Wzrost heapu (7,8 → 19,9 MB) i węzłów (275 → 367) nie został przypisany do przyczyny; w tak krótkim przebiegu nie da się rozstrzygnąć, czy to wyciek. Wymaga dłuższego przebiegu (pozycja 1 poniżej).
- `resource-loss.js`: RESOURCE LOSS OK.
- `web-smoke.js`: WEB SMOKE OK. Brakujące `features/<id>/mock.js` są oczekiwane (opcjonalne w trybie mock).
- `screen-matrix.js`: exit 0; 68 przypadków przycięcia `.mp_title` („No records yet”) przy 360 px. Element odtwarzacza muzyki (poza zakresem).
- `visual-matrix.js`: exit 0; `BUTTON.mp_btn` 20×20 px (cel dotyku poniżej minimum). Element muzyki (poza zakresem).

## Otwarte pozycje
1. perf-soak: FAIL +64 węzły DOM przy płaskim stanie gry. Potrzebne: dłuższy przebieg (180 s) i sonda pojedynczych akcji. Nie blokuje wydania bez decyzji właściciela.
2. Odtwarzacz muzyki: `.mp_title` (przycięcie) i `mp_btn` (rozmiar) — do poprawy przy wydaniu muzyki.
3. `paths-test`: 26 znanych błędów HTTP.
4. Balans ekonomii: profile `exploit`/`smart` powyżej 365 dni; `casual` pierwszy L2 około dnia 90.
5. Testy Windows lokalnie: do powtórzenia na maszynie, gdzie działa `swinka-1`.
