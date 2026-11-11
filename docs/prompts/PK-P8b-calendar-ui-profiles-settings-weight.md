# PK-P8b: Calendar UI: pig data, manual reminders, weight table, game-style tabs (wave P8b)
Zmieniaj: src/Cuy/dotNet/Features/CalendarFeature.cs, web/home/features/calendar/feature.js, web/home/features/calendar/feature.css, tools/qa/ux-p8-calendar.js, docs/opt/log/PK-P8b.md
Wymagane: tools/qa/ux-p8-calendar.js
Weryfikacja: node --check web/home/features/calendar/feature.js && node --check tools/qa/ux-p8-calendar.js && node tools/qa/ux-p8-calendar.js && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Show and edit the P8a data in the calendar window: pig data form, reminder switches with day and time (off by default in new games), weight table per pig, and tabs styled like the rest of the game instead of browser buttons.
Depends on: PK-P8a merged (`CarePigProfile`, `CareSettings.Pigs`, `ManualOptIn`, `Pet.SetPigProfile`; read `docs/opt/log/PK-P8a.md`). If `docs/opt/foundations/R8.md` exists, read its section 5; where it contradicts this prompt follow R8 and log the difference.

## Kontekst (fakty sprawdzone 11.11.2026, nie szukaj drugi raz)
- Most: `src/Cuy/dotNet/Features/CalendarFeature.cs`, `Id => "calendar"`, wiadomości `calendar_done`, `calendar_snooze`, `calendar_settings {pigs, tasks[]}` (waliduje `CareInput.CleanPigNames`, nieznane `id` zadań ignoruje z logiem), `calendar_weight {pig, grams, date}`, `calendar_weight_delete`. Błędne wejście = log `[Calendar] ignored ...`, bez wyjątku.
- Widok: `web/home/features/calendar/feature.js` (zakładki `today`, `month`, `weight`, `settings` w `renderTabs`, `renderToday`, `renderMonth`, `renderWeight`, `renderSettings`; stan demo na górze pliku służy jako mock w przeglądarce, brak osobnego `mock.js`), style `feature.css` (klasy `fc-tab`, `fc-btn`, `fc-weight-form`).
- Stan do widoku buduje `CalendarFeature.cs` (znajdź grepem funkcję budującą JSON stanu); dopisz w nim `profiles` (lista `{name, birthDate, adoptedDate, baselineGrams}`) i `manualOptIn`.
- Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`, `modalHtml`, `closeModal`, `pushState`); wzorzec: `tools/qa/ux-p2-player.js`. Testy rejestruje `tools/qa/ux-all.js` (nazwa pliku `ux-pN-*.js`, sprawdź czy wymaga wpisu).
- Styl gry: papier i drewno (zmienne `--ui-wood-*` w `web/home/style.css`, klasy przycisków używane w innych oknach); nie dodawaj zewnętrznych bibliotek ani czcionek.

## Steps
1. Most: dodaj wiadomość `calendar_profile {pig, birthDate, adoptedDate, baselineGrams}` -> `pet.SetPigProfile(...)` + zapis (`AutoSaver.SaveNow()`), błędne wejście loguje i ignoruje jak sąsiednie wiadomości. Dopisz `profiles` i `manualOptIn` do stanu wysyłanego do widoku.
2. Settings: sekcja "Your pigs" (imię + data urodzenia, data adopcji, waga wyjściowa w g; zapis wysyła `calendar_profile`); lista typów przypomnień z przełącznikiem włącz/wyłącz, dniem tygodnia i porą (istniejące pola `calendar_settings.tasks[]`). Przy `manualOptIn = true` wszystkie przełączniki są domyślnie wyłączone. Tekst przycisków i opisów po angielsku jak reszta okna.
3. Weight: formularz wpisu wartości (pig, gramy, data) i tabela historii na świnkę (max 10 ostatnich, najnowsze u góry, kolumna różnicy względem poprzedniego wpisu i względem wagi wyjściowej gdy jest); po zapisie wagi zadanie ważenia znika z zakładki Today (stan przychodzi z Core, nie licz po stronie JS).
4. Zakładki w stylu gry: zamiast domyślnych przycisków przeglądarki ramka z drewna i papieru (aktywna zakładka jaśniejsza, nieaktywna ciemniejsza, 1-px kontur `#3a1d17`, twarde narożniki), czytelny kontrast tekstu; wyłącznie CSS w `feature.css`.
5. Testy FIRST, `tools/qa/ux-p8-calendar.js` (mock przeglądarkowy): T1 zakładki mają klasę stylu gry, nie wyglądają jak `<button>` bez stylu (sprawdź `border-image` lub kolor tła z palety); T2 Settings w trybie `manualOptIn` pokazuje wszystkie przypomnienia wyłączone; T3 włączenie przypomnienia wysyła `calendar_settings` z właściwym `id`; T4 zapis danych świnki wysyła `calendar_profile` z poprawnymi polami; T5 wpis wagi dodaje wiersz do tabeli i wysyła `calendar_weight`; T6 po wpisie wagi zadanie ważenia znika z Today (mock odsyła nowy stan); T7 błędna waga (0 lub tekst) nie wysyła wiadomości; T8 brak błędów w konsoli.
6. Uruchom Weryfikacja; napraw do zielonego.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P8b.md` (max 10 lines: decisions, exact message and field names, differences from the plan, BLOCKED reason if any).
