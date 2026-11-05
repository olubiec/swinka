# Raport testów przed wydaniem (bez muzyki)

Zakres: gameplay, ekonomia, grafika i pozostałe elementy Home. Muzyka wyłączona z zakresu.
Gałąź: `claude/friendly-hawking-5z7tef`. Kod gry testowany: `ebfdf84` (ta sama treść co `origin/main`). Narzędzia QA: do `3234e15`.
Środowisko: kontener cloud, Node 22, Chromium z `/opt/pw-browsers/chromium`. Testy Windows lokalnie niedostępne (folder `swinka-1` nieosiągalny z sesji cloud); zastąpione przebiegiem GitHub Actions.

## Podsumowanie

| Fala | Zakres | Wynik |
|---|---|---|
| 1 | dane, ścieżki, layout, a11y, plan | PASS (z długiem: 26 znanych błędów HTTP w `paths-test`) |
| 2 | ekonomia, grafika, CI, Windows, soak 60 s i 180 s | Ekonomia i grafika PASS; CI i Windows PASS na `main`; **perf-soak FAIL przy 60 s i 180 s** (patrz niżej) |
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
  - **perf-soak 180 s (ta sama seria, 203 kliknięcia):** FAIL. Podłoga DOM (po GC) 690 (pierwsza połowa) → 818 (druga), +128; listenery 111 → 163, +52. Odczyt końcowy: węzły 1238, podłoga po GC 1710, żywe elementy 560 (szczyt). Heap 6,7 → 9,9 MB. Stan gry: 14539 → 14558 B, **płaski**, więc wzrost nie jest tłumaczony stanem.
  - Korekta: wcześniejszy wniosek „stan płaski, nie ma wycieku” był zbyt pochopny. Podłoga rośnie monotonicznie w czasie. Różnica między podłogą po GC (1710) a żywymi elementami (560) oznacza, że część odłączonych węzłów jest nadal trzymana w pamięci. To wygląda na realny wyciek powiązany z akcjami gry.
  - Sonda pojedynczych funkcji (`tools/qa/feature-leak-probe.js`, 20 cykli otwierania i zamykania): brak wzrostu na cykl. `pigs` dał +296 węzłów i +19 listenerów zarówno przy 8, jak i przy 20 cyklach, czyli jednorazowe zamontowanie. Wzrost z soaka nie pochodzi więc z samego otwierania ekranów, tylko z interakcji akcji gry (sadzenie, rynek, farma, zakupy). Źródło nie zostało wskazane.
  - Zmiany w narzędziu: `a58156d` (stan gry w próbkach, reguła wyjaśniania przez stan z progiem 5%).
  - **Ponowny pomiar perf-soak 180 s (ten sam seed 4242, 194 kliknięcia):** FAIL. Podłoga DOM (po GC) 690 → 809, +119; listenery 111 → 163, +52; rAF stały (1 → 1). Stan gry 14543 → 14557 B, płaski. Heap 6,7 → 9,9 MB.
  - Badanie przyczyny (bez poprawki, bo źródła nie wskazano):
    - Akcje gry w izolacji (`tools/qa/action-leak-probe.js`, po 60–200 powtórzeń): stepper i zakup na rynku, zakładki rynku, zakładka sprzedaży, pasek miejsc (otwieranie ekranów), grządki i podlewanie na farmie, zakup w sklepie. Każda klasa osobno jest płaska lub oscyluje, bez monotonicznego wzrostu. Mieszana sekwencja tych pięciu akcji też oscyluje (węzły 879–1196, listenery 110–155). Wzrost pojawia się więc dopiero przy pełnej losowej sekwencji soaka.
    - Migawki sterty (CDP `HeapProfiler`) po 60 s: odłączone węzły to 70–300 elementów. Trzymają je głównie wpisy mapy `id` dokumentu (`TreeOrderedMap`), dwa obiekty `Range` i domknięcia z kontekstem (`btn` w pętli `renderPlacesBar` i w liście jedzenia). Są to ograniczone, nie rosnące zbiory.
    - Węzły tekstowe w widoku są zależne od stanu: ekrany zostają w DOM po zamknięciu modala (`modalBody` nie jest czyszczony przy zamknięciu), więc podłoga zależy od tego, który ekran był ostatnio otwarty. Nie widać w tym jednego, stale rosnącego elementu.
    - Znane, lecz niepotwierdzone w tym soaku: `features/vet/feature.js` dodaje `api.onMessage('toast')` przy każdym otwarciu i nie zdejmuje go przy zamknięciu (domknięcia trzymają `container`, nie odłączone węzły).
  - Nieznane: który element losowej sekwencji powoduje wzrost. Następny krok: migawki sterty w połowie i na końcu dłuższego przebiegu, porównanie węzłów odłączonych z różnicą ich trzymających.
  - Pozostałe skrypty QA po zmianach (bez zmian w kodzie gry): `web-smoke` OK, `resource-loss` OK, `econ-gate` OK, `economy-sim` exit 0, `feature-leak-probe` exit 0 (bez oceny).

## Fala 3 (muzyka pominięta)
- `soak.js` (60 s): 25 kliknięć, zero błędów JS, zero nieoczekiwanych 4xx. Heap 7,8 → 19,9 MB, węzły DOM 275 → 367. Wzrost heapu (7,8 → 19,9 MB) i węzłów (275 → 367) nie został przypisany do przyczyny; w tak krótkim przebiegu nie da się rozstrzygnąć, czy to wyciek. Wymaga dłuższego przebiegu (pozycja 1 poniżej).
- `resource-loss.js`: RESOURCE LOSS OK.
- `web-smoke.js`: WEB SMOKE OK. Brakujące `features/<id>/mock.js` są oczekiwane (opcjonalne w trybie mock).
- `screen-matrix.js`: exit 0; 68 przypadków przycięcia `.mp_title` („No records yet”) przy 360 px. Element odtwarzacza muzyki (poza zakresem).
- `visual-matrix.js`: exit 0; `BUTTON.mp_btn` 20×20 px (cel dotyku poniżej minimum). Element muzyki (poza zakresem).

## Otwarte pozycje
1. **perf-soak: FAIL przy 60 s i 180 s (ponownie potwierdzone: podłoga DOM 690 → 809, listenery 111 → 163).** Stan gry jest płaski, a pojedyncze klasy akcji gry nie rosną monotonicznie (`tools/qa/action-leak-probe.js`). Odłączone węzły są ograniczone (70–300 elementów w migawce), więc większość wzrostu to zawartość widoku zależna od ostatnio otwartego ekranu. Nieznane: która część losowej sekwencji daje monotoniczny wzrost. Kolejny krok: dłuższy przebieg z migawkami sterty w połowie i na końcu. **Blokuje wydanie**, dopóki nie zostanie wyjaśnione.
2. Odtwarzacz muzyki: `.mp_title` (przycięcie) i `mp_btn` (rozmiar) — do poprawy przy wydaniu muzyki.
3. `paths-test`: 26 znanych błędów HTTP.
4. Balans ekonomii: profile `exploit`/`smart` powyżej 365 dni; `casual` pierwszy L2 około dnia 90.
5. Testy Windows lokalnie: do powtórzenia na maszynie, gdzie działa `swinka-1`.

## Decyzja o wydaniu
- Decyzja właściciela: wydanie **z udokumentowanym znanym problemem** (pozycja 1 powyżej), bez poluzowania progów `tools/qa/perf-soak.js`.
- Znany problem: `perf-soak` 180 s kończy się FAIL. Podłoga DOM i listenerów rośnie w długiej sesji przy płaskim stanie gry. Badanie wskazuje ograniczoną retencję (70–300 odłączonych węzłów), a nie nieograniczony wyciek, ale tego nie udowodniono. Próba czyszczenia `modalBody` po zamknięciu ekranu nie pomogła i została cofnięta.
- Skutek dla gracza: możliwe większe zużycie pamięci i spadek płynności przy bardzo długich sesjach (godziny). Brak błędów JS ani crashy w testach.
- Do zrobienia po wydaniu: migawki sterty w połowie i na końcu przebiegu 180 s, porównanie odłączonych węzłów z ich trzymającymi.
- Kroki wydania wymagające Windows (poza sesją cloud): build Release (`tools/build.ps1 -Config Release`), spakowanie `Cuy_v1.zip`, publikacja GitHub Release, pomiar pamięci w długiej sesji na Windows.
