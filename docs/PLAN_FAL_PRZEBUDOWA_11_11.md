# Przebudowa planu fal (11.11.2026)

Źródło: ostatni commit na GitHubie (`ec2b3ad`: brief dla grafika `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md`, fale P46 i P47 w `docs/PLAN_POPRAWEK_UX.md`) oraz przegląd kodu po falach P38-P45. `git fetch` 11.11: lokalny `main` równa się `origin/main`, nowszych wytycznych na GitHubie jeszcze nie ma (lokalnie jest tylko pusta linia dopisana na końcu briefu). Gdy dopiszesz kolejne uwagi, dodaj je do `docs/PLAN_POPRAWEK_UX.md` (mapa uwag) i wróć do tego pliku.

Zasady bez zmian: paczki i `waves.yaml` powstają z `docs/opt/packages.spec.json` przez `python3 tools/opt/gen_packages.py`, potem `node tools/qa/plan-audit.js` (po tej przebudowie: PLAN AUDIT OK, 125 paczek, 85 fal). Prompty nie są pisane ręcznie w `waves.yaml`.

## 1. Co wynika z przeglądu nowych wytycznych (do wiadomości właściciela)
1. **P46-01 miało złe ścieżki.** `src/Cuy.Core/Decor/*` i `GameState.Decor.cs` to stary system slotów (`Equipped`). Prawdziwy model to `WorldState.Rooms[<scena>]` (`RoomLayout` z `PlacedItem`) i `RoomLayoutOps` (`CanPlace/Place/Move/Remove`), obsługiwane przez `RoomsFeature.cs`. Poprawione w promptach P46.
2. **Stałe obiekty dziś to `blockers` namalowane w tle** (ogród: fontanna, ławka, rabaty, drzewa, norka, żywopłot; park: 14 wpisów; farma: płot, stodoła; targ: 3 stragany, tablica, skrzynki). Dlatego P46 wprowadza flagę `bg_clean` per scena: scena rysuje instancje dopiero, gdy jej tło jest czyste. Do tego czasu wygląda jak dotąd i nic się nie dubluje.
3. **Kolizja kolejności P43 i P46/P47.** P43 (klikalne stragany i grządki) w obecnych promptach ma sztywne prostokąty w danych, a brief i P46 mówią, że stragany i grządki mają być przestawialne. Hotspoty muszą więc wynikać z pozycji instancji. Decyzja: kolejność **P44 → P46 → P43**; prompty P43 poprawia badanie PK-R43.
4. **Rozmiary teł.** Brief wymaga 256x144 wszędzie. Dziś: pokoje 192x112 (z siatki, P45), park 384x192. 192x112 to proporcja 1,71, a 256x144 to 1,78, więc okno nadal by się lekko zmieniało. Badanie PK-R47 zdecyduje (a) siatka pokoju 16x9 pól, (b) stała ramka 16:9 wokół pokoju, (c) inne; oraz co zrobić z parkiem.
5. **Grafika z briefu w dużej części już jest** (ławka, brazier z wersją `_on`, pochodnia, latarnia, drzewko, krzew z jagodami, płot, grządki, stodoła, strzałki UI). Dlatego P46 i część P47 da się zrobić bez grafika; u grafika zamawiamy tylko to, czego R47 nie znajdzie (np. animację płomienia ogniska, stany hover paska, kępki trawy, stragany jako osobne sprite'y).
6. **P6/P7 są częściowo zrobione** przez P39/P40 (szuflada schowka, tryb Edit, przeszkody, ścieżki, `CanPlace`). Przed napisaniem promptów P5-P8 trzeba je zmniejszyć badaniem (sekcja 5).
7. **Stare fale W21-W33** (`PK-21`...`PK-33`) są nadal w `waves.yaml`, a `STAN_PROJEKTU.md` (4.11) mówi, że następna jest `PK-21`. Część (światło PK-32, pliki `_x2` PK-33, asset checker PK-31) pokrywa się z pracą P39-P45. **Nie ruszałem ich**; wymagają osobnej decyzji (sekcja 6, pytanie 3).

## 2. Wzorzec każdej fali (jak dotąd, rozszerzony o badanie i agentów testowych)
| Krok | Kto | Co robi | Wynik |
|---|---|---|---|
| R | agenci badawczy (tylko odczyt), równolegle | sprawdzają prompty z kodem, wypisują prawdziwe nazwy i linie, konflikty plików, decyzje z domyślnymi odpowiedziami | `docs/opt/foundations/<R>.md` + lista „Prompt fixes”; sprawdza `tools/qa/foundation-check.js` |
| Plan | czat planujący | stosuje poprawki do promptów i `packages.spec.json`, generator, audyt | nowe prompty |
| a, b, c | agenci implementujący (po jednym na paczkę, 1-6 punktów, rozłączne pliki) | najpierw testy, potem kod, log max 10 linii | commit orkiestry |
| t | agenci testowi (osobni, nie czytają testów implementujących) | piszą testy „na zepsucie”: Core, regresja przeglądarki, obraz; wady do logu, kodu nie poprawiają | `Skip = "DEFECT"` w testach + log |
| q1 | bramka | pełny build i `ux-all`, `web-smoke`, `check-assets`, `check-icons`, `run-exe-smoke`, każda komenda raz | tabela PASS/FAIL |
| q2 | arkusz właściciela | sekcja w `UX_WAVE_CHECKS.md` + zrzuty `docs/qa/shots/` | 3-5 punktów do sprawdzenia w grze |

## 3. Nowa kolejność i gotowość
Fale idą kolejno (wpisy w `waves.yaml`: `R1`, `P4a`, `P4b`, `P4q`, `P44a`, `P44b`, `P44q`, `P46a`, `P46b`, `P46c`, `P46t`, `P46q`, `P43a`...). Start sesji wg `docs/prompts/START_FALA.md` (dla fali `R1` i `P46t` te same zasady: równolegle wszystkie paczki wpisu).

| # | Fala | Zakres | Paczki i prompty | Gotowość |
|---|---|---|---|---|
| 1 | **R1** | badania: PK-R46 (obiekty plenerowe), PK-R43 (re-grounding P43), PK-R47 (grafika, tła, pokój 16x9, pasek) | 3 prompty napisane (`docs/prompts/PK-R*.md`) | **GOTOWE, startuj od tego** |
| 2 | **P4** | adopcja Kuki i Neda, jedno źródło wyglądu | PK-P4a, PK-P4b, PK-P4q: prompty były, bez zmian | **GOTOWE** (niezależne od reszty; można równolegle z R1 w osobnej sesji) |
| 3 | **P44** | przeciągnięcie świnki do krawędzi zmienia scenę | PK-P44a, PK-P44b, PK-P44q: poprawione dziś (`onDrop({x,y})`, kolejność) | **GOTOWE** |
| 4 | **P46** | zapisane instancje obiektów plenerowych, rysowanie, tryb Edit, agenci testowi | PK-P46a, b, c, t1, t2, q1, q2: napisane dziś | **GOTOWE po R1** (P46a czyta `R46.md`; przy braku pliku kończy BLOCKED) |
| 5 | **P43** | klikalne stragany, grządki, obiekty, koniec okien Farma i Targ | PK-P43a-f, q: prompty są, **do poprawy po PK-R43** | CZEKA na R1 i P46 (ok. 60% gotowe) |
| 6 | **P47** | czyste tła, brakujące sprite'y, pasek miejsc, ognisko | a (tła, u nas), b (sprite'y), c (pasek), d (ognisko i światło) | CZEKA na PK-R47; b i d częściowo na grafika |
| 7 | **P5** | wiele świnek: pokazywanie w scenach, przypięcie, druga na pulpicie | punkty P5-01..04 opisane; P5-01 zrobione (P31b/P38) | wymaga badania PK-R5; P5-04 (drugie okno na pulpicie) ryzykowne |
| 8 | **P6** | schowek: kategorie, wyszukiwanie, szablony pokoi; lampy i światło | P6-01..05 w dużej części zrobione przez P40; zostaje P6-06/07 i rozszerzenia | wymaga badania PK-R6 (zmniejszyć zakres) |
| 9 | **P7** | kolizje mebli, latarnie i pochodnie na noc, cienie, pogoda | P7-01/03 częściowo przez P39 (`blockers`, siatka, ścieżki) | wymaga badania PK-R7; zależy od P47d (grafika latarni) |
| 10 | **P8** | kalendarz opieki: dane świnek, przypomnienia, tabela wag, zakładki w stylu gry | P8-01..04 pełnie opisane w tabeli (Core + UI) | **niezależna**; prompty do napisania, badanie krótkie (PK-R8) |

### Najbliższe fale w liczbach (agenci)
| Fala | Badawczy | Implementujący | Testowi | Bramka i arkusz | Razem |
|---|---|---|---|---|---|
| R1 | 3 | 0 | 0 | 0 | 3 |
| P4 | 0 | 2 | 0 | q | 3 |
| P44 | 0 | 2 | 0 | q | 3 |
| P46 | (R46) | 3 (a, b, c) | 2 (t1 Core, t2 przeglądarka) | q1 + q2 | 7 |

## 4. Co robi każda paczka P46 (skrót; pełne prompty w `docs/prompts/`)
- **PK-P46a (Core).** `assets/data/outdoor_defaults.json` + `OutdoorDefaults` (wzorzec `EconomyConfig`), `OutdoorSeed.Seed(WorldState, placeId)` jednorazowo (nowe pole `WorldState.OutdoorSeeded`, domyślnie puste), uid `fx:<scena>:<id>`, blokada schowania obiektów związanych ze stanem gry (`fixture_locked`: stragany, grządki), flaga `Balance.OutdoorInstancesActive` (domyślnie wyłączona, włączana w `GameSession.Open`). Testy S1-S8 pierwsze.
- **PK-P46b (rysowanie).** `bg_clean` w `place_scenes.json`; `placedThings` zwraca instancje dla scen plenerowych; `def().blockers` z stóp instancji dla scen czystych; sceny nieczyste bez zmian. Testy D1-D8. Nie edytuje `canvas-pig.js` ani `places/feature.js` (zajęte przez P44).
- **PK-P46c (Edit).** Wybór, przesunięcie, obrót, schowanie na dworze; zakładka Outdoor w szufladzie; obiekty-fixture można przesuwać, nie schować (z komunikatem); widoczna podpowiedź w trybie Edit (uwaga właściciela z 10.11). Testy E1-E8.
- **PK-P46t1.** Niezależne testy Core „na zepsucie” (A1-A10: stary zapis, duplikaty uid, 100 cykli zapisu, usunięte nie wracają, brak pliku danych).
- **PK-P46t2.** Niezależna regresja przeglądarki (R1-R8: 5 scen x 4 pory dnia, rozmiar płótna, świnka chodzi, pasek miejsc, chip, wydajność).

## 5. Fale dalsze: co jest gotowe, czego brakuje
- **P43** (gotowe: 7 promptów, fakty zweryfikowane 8.11, decyzje D1-D13 w `docs/opt/foundations/P43-P44-briefs.md`). Brakuje: wiązania hotspotów z instancjami (R43 sekcja 2), kontroli nazw po P40 i P45. Po poprawkach pojedyncze paczki: a (dane), b (silnik), c (targ), d (farma), e (obiekty pokoi), f (koniec okien), q. **Uwaga:** P43e usuwa lampki z dworu (uwaga 10.11); P46 zostawia je do tego czasu.
- **P47** (gotowe: brief, mapa stara→nowa, istniejące sprite'y). Brakuje: wyniku R47. Podział: **P47a** czyste tła (u nas), **P47b** sprite'y (u nas lub grafik), **P47c** pasek miejsc (CSS + PNG), **P47d** ognisko i światło. Lista zamówienia dla grafika (dokładne nazwy plików) wychodzi z R47 sekcja 7. Do tego czasu NIE zamawiaj grafiki według starego briefu bez sprawdzenia, co już jest w `assets/world/`.
- **P5** (gotowe: opis i cele, kontrakt `places.pigMove/pigPin`, lokalizacja świnki w Core). Brakuje: badania, co z P5-02/03 zrobiły P38/P44; decyzji o P5-04 (drugie okno na pulpicie, ryzyko w `BrainController`).
- **P6** (gotowe: opis). Brakuje: zmniejszenia o to, co zrobiła P40 (szuflada, schowek, przesuwanie); zostają kategorie/wyszukiwanie/szablony pokoi i P6-06/07 (włączniki lamp, światło i cienie).
- **P7** (gotowe: opis P7-01..04). Brakuje: sprawdzenia, ile kolizji załatwiły `blockers`, `CanPlace` i P39c; latarnie i pochodnie wymagają grafiki z P47d.
- **P8** (gotowe: 4 zadania z kryteriami, osobne pliki `Care/*`, `features/calendar/*`). Najlepsza fala do wykonania równolegle, gdy sesje czekają na grafikę; wystarczy krótkie badanie i napisanie 4 promptów.

## 6. Decyzje właściciela (max 5; domyślne odpowiedzi w nawiasach)
1. Kolejność **P44 → P46 → P43** zamiast P43 przed P46 (tak).
2. Zamawianie grafiki dopiero po R47, w zakresie „czego brakuje” (tak). Czy grafik ma dostarczyć to samo, co generatory (tła), czy tylko to, czego nie umiemy narysować skryptem (tylko to).
3. Stare fale W21-W33 w `waves.yaml`: audyt i wycofanie powtórzeń z P39-P45 (oddzielna paczka badawcza PK-R21; domyślnie: nie ruszać, dopóki P43-P47 nie skończą).
4. Pokój 256x144: wybór między siatką 16x9 a stałą ramką (zdecyduje R47 z rekomendacją; ty akceptujesz).
5. Obiekty-fixture (stragany, grządki, stodoła): przesuwalne, ale nie do schowania (tak).

## 7. Jak ruszyć (dziś)
1. Zmerguj/commituj te zmiany (są lokalne: nic nie wypchnięto; `git status` pokazuje pliki), potem sesja dla fali **R1** wg `docs/prompts/START_FALA.md` (FALA = R1; po niej czytasz trzy pliki `docs/opt/foundations/R46.md`, `R43.md`, `R47.md`).
2. W osobnej sesji można równolegle puścić **P4** (pliki rozłączne z badaniami).
3. Po R1 wróć do czatu planującego: zastosuje „Prompt fixes”, dopisze P47 i poprawki P43, wygeneruje paczki; potem **P44**, **P46**, **P43**.
