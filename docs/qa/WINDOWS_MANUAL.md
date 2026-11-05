# Ręczna lista kontrolna – Windows (S5 / D7)

Zakres: to, czego CI (`.github/workflows/windows.yml`) nie sprawdza: uruchomienie okna, DPI, ikony, instalację i długi bieg.
CI tylko buduje `Cuy.sln` (Release) i uruchamia testy Core; nie uruchamia aplikacji.

Przed przebiegiem: `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release`, potem `src/Cuy/bin/Release/Cuy.exe`.
Wersja, data, tester i wynik każdego punktu wpisać w kolumnie „Wynik” (PASS / FAIL / uwaga).

| # | Punkt | Oczekiwany wynik | Wynik |
|---|-------|------------------|-------|
| 1 | `Cuy.exe --selftest` z wiersza poleceń | Proces kończy się kodem 0, wynik SelfTest bez błędów | |
| 2 | Pierwsze uruchomienie (czysty `%AppData%\Cuy`) | Okno się otwiera, ekran startowy bez wyjątku | |
| 3 | DPI 100 % | Tekst i przyciski czytelne, bez obcięć, bez poziomego przewijania strony | |
| 4 | DPI 125 % | Jak w punkcie 3 | |
| 5 | DPI 150 % | Jak w punkcie 3 | |
| 6 | DPI 200 % | Jak w punkcie 3; przyciski rynku i dekoracji nie są za małe (znany problem 19 px, S1/K6) | |
| 7 | Ikona aplikacji (pasek zadań, Eksplorator, Alt+Tab) | Widoczna ikona z `src/Cuy/cuy.ico`, nie domyślna ikona WinForms | |
| 8 | Ikona w zasobniku (tray) | Ikona z `src/Cuy/cuy.ico`, menu działa, zamknięcie z zasobnika kończy proces | |
| 9 | Instalacja (instalator lub kopia do folderu użytkownika) | Program startuje z nowej ścieżki, skróty działają | |
| 10 | Aktualizacja z poprzedniej wersji | Zapis gry z poprzedniej wersji wczytany, brak utraty postępu | |
| 11 | Plik zapisu | Istnieje `%AppData%\Cuy\save.json`, po zapisie zmienia się czas modyfikacji | |
| 12 | Log | Istnieje `%LocalAppData%\Cuy\logs\cuy.log`, brak błędów krytycznych po całym przebiegu | |
| 13 | Cykl dzień/noc | Przejścia dnia i nocy bez migotania i bez zawieszenia | |
| 14 | Długie nazwy świnek | Nazwa obcięta lub zawinięta, nie wychodzi poza kartę | |
| 15 | Soak 30 minut | Okno działa bez zawieszenia, pamięć nie rośnie w sposób ciągły, log bez nowych wyjątków | |

## Soak (punkt 15)

Uruchomić `tools/qa/soak.js` z `SOAK_SECONDS=1800` w WebView (zgodnie z D7); kod wyjścia 1 oznacza FAIL (błąd strony lub wzrost węzłów DOM powyżej `SOAK_NODE_LIMIT`, domyślnie 200). Przeglądarkę można wskazać zmienną `CHROMIUM_PATH`. Podczas przebiegu zapisać:
- godzinę startu i końca,
- pamięć procesu `Cuy.exe` na starcie, po 15 min i na końcu (menedżer zadań),
- liczbę wpisów `ERROR` / `Exception` w `%LocalAppData%\Cuy\logs\cuy.log` przed i po przebiegu.

## Podpis

Tester: ____________  Data: ____________  Wersja (commit): ____________
