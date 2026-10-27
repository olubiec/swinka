# Plan dla Julesa (przebudowany 27.10.2026)

Zasada przebudowy (z `Workflow Claude + Jules`): mniej, ale większych zadań (1 zadanie = 1 PR, ok. 300 linii, rozłączne pliki),
komenda akceptacji w każdym, rzeczy niesprawdzalne na Linuksie albo „na wyczucie” odpadają do backlogu, a spięcie fali robi
jedna sesja integracyjna z jednolinijkowego promptu, nie osobny plik zadania.

**Efekt: 35 niewykonanych zadań → 18, fal 7 → 4, cykli testów na Windowsie 4 → 3, plików do review w PR-ach ok. −50 %.**
Stare prompty zostały w `jules/archive/` (nic nie zginęło), odłożone funkcje mają pełne prompty w `jules/backlog/`.

## Jak to działa (bez zmian)
1. Kopiujesz pliki fali z `jules/tasks/` do `jules/queue/` i pushujesz na `main`; automat (`jules-dispatch.yml`) startuje 1 sesję Julesa na plik.
2. Przed akceptacją czytasz plan Julesa (odrzuć: pliki spoza zadania, nowa biblioteka, brak testów, przepisywanie na zapas).
3. PR-y mergujesz od najmniejszego do największego. Konflikty rozwiązuje sesja integracyjna.
4. Koniec fali: nowa sesja z promptem `Integracja WN: testy, build, napraw błędy, zaktualizuj jules/PLAN.md` (bez pliku zadania).
5. Wieczorem wolne sesje idą na `jules/BACKLOG.md`. Zły PR: feedback w tej samej sesji (szablon D), po 2 rundach nowa sesja, potem dzielenie zadania.

## Stan (27.10.2026)
Fale 0–1 i większość fali 2 scalone, F3-02, F3-04, F3-05 scalone. **F2-02 został cofnięty** (commit „Revert F2-02 (#30)”), F2-07 nie powstał.
Reszta starego planu (fale 3–8) nie ruszona. Research R1–R20 wdrożony (`RESEARCH.md`, `DECYZJE.md`).

## Fala 1: dokończenie wersji 1.1 (3 zadania; W1-01 i W1-02 razem, W1-03 po nich)
| Zadanie | Co daje | Zastępuje |
| --- | --- | --- |
| W1-01 | Kalendarz opieki: C# feature i przypomnienia od świnki (ponowna próba po cofnięciu #30) | F2-02 |
| W1-02 | Zabawki i menu Play | F2-07 |
| W1-03 | Spięcie funkcji Domku, usunięcie przykładów, smoke test łapiący błędy układu | F3-01 |
Po fali 1: sesja „Integracja W1” i test na Windowsie (`tools/build.ps1`). **To jest wersja 1.1, którą już można dać w prezencie.**
Odpada osobny F3-03 (paczka robi się raz, w W4-02; do 1.1 wystarcza obecny `tools/package.ps1`).

## Fala 2: silniki i gry (8 zadań, wszystkie razem; wymaga fali 1)
Rdzeń w Cuy.Core (testy dotnet) i pliki, których nikt inny w fali nie rusza. Dwa małe wyjątki w `HomeWindow.cs` (W2-05 pola stanu, W2-06 wiadomości): mergować od najmniejszego PR.
| Zadanie | Co daje | Zastępuje |
| --- | --- | --- |
| W2-01 | Kontrakt wtyczek zachowań pulpitu (`IDesktopBehavior`, host) | F4-09 |
| W2-02 | Silnik pamiętnika (Core, 48+ szablonów, testy) | F4-03 |
| W2-03 | Core: odblokowania więzi + paśnik z sianem (bez UI) | F4-05 (Core), F4-06 (Core) |
| W2-04 | Rzeczy zależne od etapu życia (miękkie jedzenie, ciepłe legowisko, gryzaki) | F8-04 |
| W2-05 | Hub gier: lista z pliku, limit dzienny, rekordy, ekran wyniku | F4-08 + F5-04 |
| W2-06 | Ustawienia: dźwięk, cisza nocna, nowa świnka z kopią zapisu, wybór monitora | F4-07 + F8-03 |
| W2-07 | Gra Veggie Memory (logika testowalna) | F5-03 |
| W2-08 | Gra Hay Maze (własny recursive backtracker, testowalny) | F5-02 |

## Fala 3: pulpit i ekrany (5 zadań, razem; wymaga fali 2)
Kolejność merge w fali: W3-03, W3-05, W3-04, W3-01, W3-02 (od najmniejszego). Konflikty w `HomeWindow.cs`/`app.js` zostawić integracji.
| Zadanie | Co daje | Zastępuje |
| --- | --- | --- |
| W3-01 | Wygląd świnki zależny od etapu życia na pulpicie + urodziny (tort, party, 100 koniczynek) | F4-01 + F4-02 |
| W3-02 | Ekrany Domku: Pamiętnik, Album, pasek więzi, wskaźnik siana (jedna sesja = jedno miejsce na wspólne pliki web) | F4-04 + UI z F4-05/F4-06 |
| W3-03 | Chowanie się przy pełnym ekranie (gry, filmy, prezentacje) | F6-03 |
| W3-04 | Strach przed machaną myszką + sztuczki odblokowywane więzią | F6-02 + F6-05 |
| W3-05 | Osiągnięcia (Core + ekran + dymek) | F8-01 |
Po fali 3: „Integracja W3” i drugi test na Windowsie (`TESTY_RECZNE.md`: SHAKE-01, fullscreen).

## Fala 4: finał (2 zadania; W4-02 po W4-01)
| Zadanie | Co daje | Zastępuje |
| --- | --- | --- |
| W4-01 | Strojenie ekonomii, więzi i tempa na symulacji 60 dni | F7-02 |
| W4-02 | Audyt „bez opcji deweloperskich”, self-test, paczka, licencje, dokumentacja, 40 testów ręcznych | F3-03 + F7-03 + F4-10 |
Zamiast F7-01 jest sesja „Integracja W4: rozszerz `features/index.json` i smoke test o diary, tricks, achievements”.

## Odłożone (jules/backlog/, wracają tylko jeśli będzie chęć po wersji 2.0)
| Pomysł | Dlaczego odpada teraz |
| --- | --- |
| F6-04 Pogoda | Jedyne użycie internetu, klient + atrybucja + lista miast za kosmetykę; łamie zasadę „bez sieci w czasie działania” |
| F6-06/07/08 Towarzysz (3 zadania) | Najdroższa funkcja: 3 sesje, druga postać na pulpicie, testy tylko ręczne na Windowsie |
| F6-00/01/09 Taniec do muzyki (3 zadania) | Podbicie NAudio + sesje audio Windows; nie do sprawdzenia na Linuksie, zero komendy akceptacji w CI |
| F5-01 Hay Hop | Platformówka = „game feel”, którego Jules nie oceni; zostają Memory i Maze (logika w testach) |
| F8-02 Etapy w Domku | Kosmetyka; pulpit (W3-01) już pokazuje etapy |
Pominięte jak wcześniej: instalator, liścik, ESP32, tryb deweloperski w paczce.

## Tabela starych numerów
F2-02→W1-01, F2-07→W1-02, F3-01→W1-03, F3-03→W4-02, F4-01→W3-01, F4-02→W3-01, F4-03→W2-02, F4-04→W3-02, F4-05→W2-03+W3-02,
F4-06→W2-03+W3-02, F4-07→W2-06, F4-08→W2-05, F4-09→W2-01, F4-10→W4-02, F5-01→backlog, F5-02→W2-08, F5-03→W2-07, F5-04→W2-05,
F6-00/01/04/06/07/08/09→backlog, F6-02→W3-04, F6-03→W3-03, F6-05→W3-04, F7-01→sesja „Integracja W4”, F7-02→W4-01, F7-03→W4-02,
F8-01→W3-05, F8-02→backlog, F8-03→W2-06, F8-04→W2-04.

## Raz w ustawieniach Julesa i GitHuba (checklista z workflow)
Skrypt środowiska (install + `dotnet test`), CI Fixer włączony, ochrona `main` z wymaganym zielonym CI, zmienne w ustawieniach Julesa (nie w repo),
opcjonalnie Gemini Code Assist na GitHubie (pierwszy review PR bez zużycia sesji).
