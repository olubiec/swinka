# PK-P8a: Core: pig profiles and manual reminders (wave P8a)
Zmieniaj: src/Cuy.Core/Care/CareState.cs, src/Cuy.Core/Care/CareInput.cs, src/Cuy.Core/Care/CareSchedule.cs, src/Cuy.Core/Pet.Care.cs, tests/Cuy.Core.Tests/CareProfileTests.cs, docs/opt/log/PK-P8a.md
Wymagane: tests/Cuy.Core.Tests/CareProfileTests.cs
Weryfikacja: dotnet build src/Cuy.Core/Cuy.Core.csproj -c Release && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~Care"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Core support for P8: editable data of each pig (birth or adoption date, starting weight), reminders that are switched on by hand only (in new games), and a weigh-in that closes the weigh reminder.
Depends on: Nothing in waves F1-F3. If `docs/opt/foundations/R8.md` exists, read its section 5 first; where it contradicts this prompt, follow R8 and write each difference in the log.

## Kontekst (fakty sprawdzone 11.11.2026, nie szukaj drugi raz)
- Stan opieki: `src/Cuy.Core/Care/CareState.cs` (`CareState` z `Settings`, `LastDoneUtc`, `SnoozedUntilUtc`, `History`, `Weights`, `Streaks`; `CareSettings { PigNames, TaskOverrides }`; `CareTaskOverride { Enabled = true, Time, Weekday, EveryDays }`; `WeightEntry { LocalDate, Pig, Grams }`; `Normalize()` uzupełnia nulle).
- Walidacja wejścia: `CareInput` (`TryPigName`, `TryGrams`, `TryTime`, `TryWeekday`, `TryEveryDays`, `TryDate(raw, todayLocal, out date)`: data `yyyy-MM-dd` od 2020-01-01 do dziś).
- Harmonogram: `CareSchedule.cs` (linia ~69: `if (!over.Enabled) return false;`). Definicje zadań: `assets/data/care.json` (`Tasks[]` z `WeightLog`, `Schedule`, `Time`, `Weekday`, `EveryDays`). Dodanie wagi: `Pet.AddWeight(pig, grams, localDate)` w `src/Cuy.Core/Pet.Care.cs:118`.
- Testy istniejące: `CareDataTests`, `CareInputTests`, `CareScheduleTests`, `StageCareTests`. Nie osłabiaj ich asercji.
- AGENTS.md: nowe pola zapisu tylko z bezpiecznymi domyślnymi; stary zapis ładuje się bez zmian zachowania.

## Steps
1. Dane świnki: dodaj `CarePigProfile { Name, BirthDate, AdoptedDate, BaselineGrams }` (daty jako `yyyy-MM-dd` lub null, `BaselineGrams` int? albo 0 = brak) i `CareSettings.Pigs` (`List<CarePigProfile>`). `Normalize()` uzupełnia null, usuwa profile bez świnki w `PigNames` i duplikaty nazw. W `CareInput` dodaj `TryProfile(name, birth, adopted, baselineGrams, todayLocal, out CarePigProfile)` (użyj `TryPigName`, `TryDate`, `TryGrams`; pusta data = null, adopcja nie wcześniejsza niż urodzenie). W `Pet.Care.cs` dodaj `SetPigProfile(...)` obok `AddWeight`, zwracające bool.
2. Przypomnienia ręcznie: dodaj `CareSettings.ManualOptIn` (`bool?`). Stary zapis (pole brak = null) zachowuje dotychczasowe zachowanie (zadania bez wpisu w `TaskOverrides` są włączone). Nowa gra ustawia `true`: wtedy zadanie bez wpisu w `TaskOverrides` albo z `Enabled = false` jest wyłączone i nie pojawia się jako należne. Znajdź miejsce tworzenia stanu nowej gry (grep `new CareState` i `GameState.Care.cs`); ustaw `true` tylko tam i w taki sposób, by wczytanie starego JSON go nie nadpisało (opisz mechanizm w logu).
3. Ważenie zamyka przypomnienie: sprawdź w `CareSchedule.cs` i `AddWeight`, czy wpis wagi oznacza zadania z `WeightLog = true` jako wykonane na dany dzień (`LastDoneUtc`, `History`). Jeśli nie, dodaj to w `AddWeight` (jedna historia na dzień, bez podwójnego liczenia streaka).
4. Testy FIRST, `CareProfileTests.cs` (deterministycznie, `ManualClock`): T1 profil poprawny zapisuje się i odczytuje po serializacji; T2 data z przyszłości i śmieciowa odrzucone; T3 adopcja przed urodzeniem odrzucona; T4 profil usuniętej świnki znika po `Normalize`; T5 nowa gra: żadne zadanie nie jest należne, dopóki nie włączono go w `TaskOverrides`; T6 stary JSON zapisu bez `ManualOptIn` zachowuje dotychczasowe zachowanie; T7 dodanie wagi zamyka przypomnienie ważenia w danym dniu i nie dubluje streaka; T8 granice `BaselineGrams` jak `TryGrams`.
5. Uruchom Weryfikacja; napraw do zielonego.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P8a.md` (max 10 lines: decisions, exact names others will use (`CarePigProfile`, `CareSettings.Pigs`, `ManualOptIn`, `Pet.SetPigProfile`), differences from R8, BLOCKED reason if any).
