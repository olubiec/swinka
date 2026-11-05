# QA – decyzje do podjęcia (plan, bez wdrożenia)

Decyzje podjęte w imieniu właściciela. Nic z poniższego nie jest jeszcze wdrożone.

## D1. Klucz pokoju świnki (F1-01 / F2-01) – DECYZJA: kanoniczny klucz to `NamedId ?? Id`
- Powód: cały kod (`PigKey`, `EnsurePigRooms`, `AttachPigRooms`, web) już używa `NamedId ?? Id`; zmiana kodu na `Id` rozbiłaby świnki nazwane i istniejące zapisy.
- Plan: jedna poprawka asercji w `PigRoomsMigrationTests.ThreeRosterPigsGetThreeRooms_AndSecondCallCreatesNone` (`pig.Id` → `Pet.PigKey(pig)`). To wyjątek od zakazu AGENTS.md: zapisać go w `docs/PROJECT_STATE.md` jako zatwierdzony przez właściciela. Kod produkcyjny bez zmian.
- Weryfikacja: test przechodzi, pozostałe testy PigRooms bez zmian; Core ≥ 1026 zaliczonych.

## D2. Zaokrąglanie bonusu więzi w domku – DECYZJA: ułamkowe przenoszenie reszty
- Plan: pole `BondRemainder` (double, domyślnie 0, bez migracji wersji – brak pola = 0) w `Pet.Bond.cs`; `AddBondPoints` dodaje `gain * mnożnik + BondRemainder`, zapisuje część całkowitą, resztę odkłada.
- Testy: 100 przyrostów po 1 pkt przy bonusie 5% daje 105 (±1); zapis i odczyt zachowuje resztę.

## D3. Hak czasu pokoi `ApplyTime` (F5-05) – DECYZJA: nie wdrażać teraz
- Powód: brak zdefiniowanego zachowania, a zgadywanie dodaje kod bez wymagań.
- Plan: oznaczyć w `FIXES.md` jako „odłożone do projektu pory dnia w pokojach”; usunąć martwe wywołanie tylko jeśli okaże się niepodłączone.

## D4. Ekonomia (F2-02, F2-03, F5-08) – DECYZJA: strojenie sterowane symulacją
- Cel: pierwszy zakup typowego gracza ≤ 14–21 dni (dziś 51–90); profile `smart` i `exploit` osiągają kamień milowy w ≤ 365 dniach, `casual` w ≤ 540.
- Plan: (1) wystawić stałe dochodu/cen w jednym miejscu danych, (2) uruchomić istniejące profile symulacji i zapisać wyniki bazowe, (3) zmieniać najpierw ceny pierwszych przedmiotów (−40%), potem dochód z zadań (+50%), nie oba naraz, (4) po każdym kroku ponowić symulację, zatrzymać się przy spełnieniu celu, (5) opisać zmianę w `docs/qa/reports`. Nie zmieniać kosztów późnej gry bez osobnej symulacji.
- Ryzyko: inflacja; kontrola – profil `exploit` nie może kupić wszystkiego przed dniem 120.

## D5. Brakujące grafiki (E) i `web-smoke` – DECYZJA: lista dozwolonych braków
- Grafika zostaje u właściciela. Dla CI: plik `tools/qa/known-missing-assets.json` z trzema teksturami świateł; `web-smoke.js` ignoruje tylko wpisy z listy, każdy nowy 404 nadal kończy się błędem. Wpis usuwa się razem z dodaniem pliku.
- Cztery znane porażki testów: dwa `WorldAssetsTests` znikają po dostarczeniu grafik; `GameSessionWorldTests.Open_OldSaveWithEquippedDecor...` do osobnego zbadania (prawdopodobnie ten sam brak podłóg).

## D6. Drobne (F4-06, F3-04) – DECYZJA: jedna paczka porządkowa, niski priorytet
- Chip wspólnej sypialni: dopasować do stylu pozostałych chipów w `rooms/feature.css`, sprawdzić `visual-matrix` (4 viewporty).
- `mock.js` 404: dodać brakujące zasoby do mocka albo wyciszyć znany wzorzec w `soak.js`.

## D7. Windows (pakiet I) – DECYZJA: CI + lista kontrolna
- Dodać job Windows (build `Cuy.sln` Release z `tools/build.ps1`), żeby `SettingsFeature.cs` był kompilowany automatycznie.
- Ręczna lista: SelfTest, DPI 100/150/200%, instalacja i aktualizacja z wersji poprzedniej, 30-minutowy soak (`tools/qa/soak.js` z `SOAK_SECONDS=1800` w WebView), cykl dzień/noc, długie nazwy świnek.

## Kolejność wdrożenia (po Twojej zgodzie)
1. D1 + D2 (testy zielone) → 2. D5 → 3. D6 → 4. D4 (osobna wave, wymaga przeglądu wyników) → 5. D7. D3 pozostaje odłożone.
