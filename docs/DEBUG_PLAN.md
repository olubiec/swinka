# Cuy – pełny plan debugu (fale D0–D8)

Cel: żeby wersje 2.6.161–2.6.163 (poprawki po wydaniu) już się nie powtórzyły. Każdy błąd, który do tej pory trafił do użytkownika, ma tu swoją falę, test i bramkę przed release.

## 0. Błędy do tej pory (źródło planu)

| # | Błąd | Przyczyna | Czemu nie wyszedł przed release |
|---|------|-----------|--------------------------------|
| E1 | Okno domku nie otwierało się, brak komunikatu | wyjątki połykane po cichu w `HomeWindow` | brak testu otwarcia Home na realnym Windows |
| E2 | WebView2 Runtime brak na PC użytkownika | instalator go nie sprawdzał | testowano tylko na maszynie dev |
| E3 | Rzut za słaby (3x) | współczynnik prędkości 10 zamiast 30 w `DragVelocity.TossForce` | fizyka bez testów jednostkowych na wartości |
| E4 | Świnka lewituje nad paskiem po rzucie | `OffsetY = 0` przy lądowaniu | brak testu „stopy = krawędź paska” |
| E5 | Zacinanie rzutu/spadania | cień przebudowywany co klatkę, 2 odświeżenia na klatkę, EnumWindows co 100 ms, WM_TIMER 8 ms | brak pomiaru czasu klatki |
| E6 | Obrót zbyt gwałtowny, sztuczny | `turn_smooth` z `rotation.json` nieużywany | brak review animacji w ruchu |
| E7 | Self-test paczki padał | foldery ras, układ feature | self-test dopiero w CI releasu |
| E8 | Tag push zablokowany | polityka środowiska | proces release nieprzetestowany na sucho |
| E9 | Pory dnia (tint powłoki Home) | niedomknięta decyzja | brak specyfikacji |
| E10 | Kod C# nigdy nie kompilowany lokalnie | brak dotnet/Windows w sesji | pierwsza kompilacja dopiero w workflow |

Zasada naczelna: **żadna zmiana fizyki, okna lub instalatora nie idzie do release bez zielonej bramki G1–G4 (sekcja 10).**

## 1. Zasady dla każdego subagenta (wklej na początku KAŻDEGO promptu)

```
KONTEKST: Cuy, pulpitowy pet w WinForms (.NET Framework 4.8, net48), repo olubiec/swinka.
Nie ma tu dotnet ani Windows. NIE zgaduj, że kod się kompiluje: pisz minimalne, jawne zmiany,
sprawdzaj składnię C# czytając sąsiedni kod. Szukaj grepem, czytaj tylko potrzebne zakresy linii.
Nie czytaj: assets/, *.Designer.cs, Resources/animations.xml, phaser.min.js.
Nie rób refaktorów poza zadaniem. Nie dodawaj aliasów kompatybilności.
Wynik: (1) lista zmienionych plików, (2) co dokładnie zmieniono, (3) jak to zweryfikować
(test lub krok ręczny), (4) co NIE zostało zweryfikowane. Maks. 15 linii.
Nie pushuj, nie twórz PR – robi to koordynator.
```

## 2. Fala D0 – baza i narzędzia (musi być pierwsza, blokuje resztę)

Cel: móc mierzyć i testować zamiast zgadywać.

**D0.1 – Wydzielenie fizyki do Core (czysta, testowalna logika)**
```
Zadanie: wyodrębnij obliczenia rzutu i lądowania z src/Cuy/dotNet/FormPet.Motion.cs
(AdvanceToss) oraz DragVelocity z MotionTrack.cs do klasy w projekcie Core bez zależności
od WinForms (np. src/Cuy.Core/Physics/TossPhysics.cs): wejście = stan (x,y,vx,vy), dt w ms,
prostokąt ekranu, wysokość sprite'a, offset stóp, lista platform (okna/pasek jako Rectangle);
wyjście = nowy stan + flaga lądowania + typ (soft gdy vy<40, inaczej hard) + odbicie od krawędzi.
Zachowaj dokładnie jednostki: piksele na 30 ms, grawitacja 1.5 na jednostkę dt, dt=min(50,dt_ms)/30,
odbicie krawędzi współczynnik -0.3. FormPet ma tylko wołać tę klasę. Nie zmieniaj zachowania.
Uwaga na pułapkę E3 i E4: offset stóp (CurrentAnimation.Start.OffsetY) musi być parametrem.
Weryfikacja: nowy test w testach Core (patrz D1).
```

**D0.2 – Licznik czasu klatki (diagnostyka)**
```
Zadanie: dodaj do MotionTimer_Tick lekki pomiar: Stopwatch na tick, ring buffer 300 próbek,
log do %LocalAppData%\Cuy\logs\cuy.log po zakończeniu rzutu: min/średnia/p95/max czasu ticka
oraz liczba ticków z odstępem >20 ms. Włączany flagą środowiskową CUY_PERF=1 (domyślnie wyłączony,
zero narzutu gdy off). Nie alokuj w ticku.
Weryfikacja: log zawiera linię "toss-perf" po rzucie.
```

**D0.3 – Tryb diagnostyczny `--diag`**
```
Zadanie: w SelfTest.cs / Program.cs dodaj flagę --diag, która zapisuje do pliku JSON:
wersja, System.Environment.OSVersion, DPI i skala każdego monitora, położenie i wysokość
paska zadań (Screen.WorkingArea vs Bounds), obecność WebView2 Runtime (wersja z rejestru
lub CoreWebView2Environment.GetAvailableBrowserVersionString), ścieżkę zapisu, liczbę sprite'ów.
Nie uruchamiaj UI. Kod wyjścia 0.
Weryfikacja: self-test paczki w CI wywołuje --diag i artefakt trafia do wyników.
```

**D0.4 – Windowsowy runner dla każdego PR**
```
Zadanie: dodaj .github/workflows/ci.yml (windows-latest): build Release, 1059+ testów Core,
packaged --selftest, --diag, upload artefaktów. Uruchamiany na pull_request do main.
Release.yml zostaje workflow_dispatch. Dodaj wymóg: job "gate" zależy od wszystkich kroków.
Weryfikacja: PR testowy pokazuje zielony/czerwony wynik w < 10 min.
```

## 3. Fala D1 – testy jednostkowe fizyki (E3, E4)

**D1.1 – Testy rzutu**
```
Zadanie: w testach Core napisz testy dla TossPhysics: (a) rzut poziomy vx=30 px/30ms pokonuje
oczekiwany dystans po N ms (tolerancja 1 px), (b) siła skalowana x30 w DragVelocity: ruch
10 px w 10 ms daje vx=30, (c) dt ograniczone do 50 ms (pauza 500 ms = ruch jak 50 ms),
(d) odbicie od lewej i prawej krawędzi odwraca vx i mnoży przez -0.3, (e) wynik niezależny
od częstotliwości ticków: ta sama trajektoria (±2 px) dla kroku 8 ms, 16 ms i 33 ms.
```

**D1.2 – Testy lądowania**
```
Zadanie: testy: (a) po lądowaniu na dole ekranu PositionY + OffsetY + Height == Bottom (stopy
na pasku, bez lewitacji – regresja E4), (b) lądowanie na oknie: dolna krawędź sprite'a == Top okna,
(c) vy<40 => FallSoft, vy>=40 => FallHard (granica 39.9/40.0), (d) rzut w górę wraca i ląduje
dokładnie raz, (e) okno pod świnką znika w trakcie lecenia => spada do paska, (f) wysokie okno
poniżej zakresu >ground nie jest wybrane, (g) kilka monitorów: ekran z ujemnymi współrzędnymi.
```

**D1.3 – Testy chodzenia po pasku**
```
Zadanie: wyodrębnij krok chodzenia (FormPet.cs ok. linii 1195–1604) do funkcji testowalnych
tam, gdzie to bezpieczne; dla pozostałych napisz test własności na MotionTrack:
Sample monotoniczne w czasie, brak cofania, MoveTo z 15% zapasu nie powoduje zatrzymania
przed końcem ruchu (regresja E5), IsMoving poprawne na granicy duration, Follow przesuwa oba końce.
```

**D1.4 – Testy DragVelocity**
```
Zadanie: testy: okno próbek 80 ms, brak siły gdy ostatnia próbka starsza niż 80 ms (puszczenie
po postoju = brak rzutu), elapsed<8 ms => zero, próbki z tym samym czasem ignorowane,
bardzo szybki ruch nie daje NaN/Infinity (dodaj clamp max siły, jeśli go brakuje, np. 120 px/30ms).
```

## 4. Fala D2 – wydajność i płynność (E5)

**D2.1 – Pętla ruchu z wysoką dokładnością**
```
Zadanie: oceń czy WinForms Timer (WM_TIMER) wystarcza. Zmierz przez D0.2 (CUY_PERF=1).
Jeśli p95 odstępu ticków > 20 ms: zastąp motionTimer dedykowaną pętlą opartą o
System.Threading.Timer + Control.BeginInvoke lub o CompositionTarget-podobny wątek z
Stopwatch i Thread.Sleep(1) + SpinWait na końcówce, z timeBeginPeriod(1). Aktualizacja pozycji
okna tylko z wątku UI, pozycję wyliczaj z czasu (nie z liczby ticków). Zachowaj SetMotionTimer API.
```

**D2.2 – FallDetect: ograniczenie kosztu**
```
Zadanie: FallDetect (FormPet.cs ok. linii 1611) wołane co tick rzutu robi EnumWindows.
Zrób cache listy okien odświeżany co 50–100 ms w czasie rzutu (jedno wyliczenie na rzut + odświeżenie),
a w ticku sprawdzaj tylko prostokąty z cache. Zachowaj wynik i efekty uboczne (wybór okna, zwrot -1).
Test: dodany test Core na funkcji czystej wyboru platformy (z D0.1).
```

**D2.3 – Cień (ShadowForm)**
```
Zadanie: przejrzyj ShadowForm.cs: (a) zamiast GetHbitmap+UpdateLayeredWindow przy każdej zmianie,
trzymaj HBITMAP w cache i wołaj UpdateLayeredWindow tylko z nową pozycją gdy bitmapa się nie zmienia
(pptDst bez zmiany rozmiaru), (b) zrezygnuj z EnumWindows w cieniu: użyj cache z D2.2 przekazanego
z FormPet, (c) upewnij się, że ShadowForm.Update jest wołane maks. raz na tick, (d) usuń wyciek
GraphicsPath (brak Dispose). Zachowaj wygląd (kwantyzacja co 24 px jest OK).
```

**D2.4 – Przerysowanie sprite'a**
```
Zadanie: sprawdź pictureBox1: DoubleBuffered, brak Invalidate przy tej samej klatce, brak
RotateFlip w trakcie ruchu (flippedSprites cache wypełnij z wyprzedzeniem przy starcie, nie w ticku),
brak alokacji Bitmap w tickach. Zmierz GC: dodaj do CUY_PERF liczbę GC gen0/gen1 podczas rzutu.
```

**D2.5 – Pomiar końcowy**
```
Zadanie: skrypt tools/perf/toss-perf.ps1: uruchamia Cuy z CUY_PERF=1, symuluje rzut przez
SendInput (przeciągnij i puść z prędkością), czeka na linię toss-perf, wypisuje p95 i max.
Cel: p95 odstępu klatek <= 18 ms, max <= 40 ms, zero ticków >50 ms w 10 rzutach.
```

## 5. Fala D3 – animacje i obrót (E6)

**D3.1 – Użycie `turn_smooth`**
```
Zadanie: znajdź w assets/sprites/*/rotation.json definicję turn_smooth (czytaj tylko ten JSON,
nie binaria). Wpiąć ją w zmianę kierunku: zamiast natychmiastowego RotateFlip pokaż sekwencję
klatek obrotu (kolejność z JSON), czas 120–200 ms, w trakcie obrotu brak ruchu poziomego
(lub zwolnienie do 0 w pierwszej połowie i rozpęd w drugiej). Fallback gdy brak pliku: dotychczasowe
zachowanie.
```

**D3.2 – Ciągłość animacji**
```
Zadanie: sprawdź przejścia między animacjami (chodzenie→spadanie→lądowanie→idle):
brak skoków OffsetY (E4), pierwsza klatka następnej animacji bez przeskoku pozycji, ten sam
punkt odniesienia stóp. Zbuduj test Core: dla każdej pary animacji w animations.xml (czytaj XML
programowo w teście, nie ręcznie) sprawdź różnicę OffsetY na szwie <= 2 px.
```

**D3.3 – Spadanie i lądowanie jak w eSheep**
```
Zadanie: porównaj z oryginalnym eSheep (jednostki px/30 ms, grawitacja): spadanie z krawędzi okna
i z wysokości => FallSoft/FallHard, odbicie, "obudzenie" po twardym upadku. Spisz tabelę
parametrów w docs/PHYSICS.md (prędkości, progi, czasy animacji) i dopisz testy sprawdzające
każdą wartość z tabeli. Jeśli parametr z tabeli różni się od kodu, popraw kod i wpisz uzasadnienie.
```

## 6. Fala D4 – okno Home i WebView2 (E1, E2)

**D4.1 – Widoczne błędy wszędzie**
```
Zadanie: grep po catch { } i catch (Exception) bez logowania w src/Cuy. Każdy wyjątek ma być
(a) zalogowany do cuy.log z kontekstem, (b) w ścieżkach inicjowanych przez użytkownika pokazany
w MessageBox z krótką instrukcją i ścieżką logu. Dodaj test (analiza statyczna w tools/qa):
brak pustych catch w kodzie produkcyjnym poza listą wyjątków z komentarzem.
```

**D4.2 – Test otwarcia Home w CI**
```
Zadanie: rozszerz packaged --selftest o: utworzenie HomeWindow w trybie bezgłowym (offscreen),
załadowanie web/home, czekanie na zdarzenie NavigationCompleted i na sygnał gotowości z JS
(window.chrome.webview.postMessage({type:'ready'})), timeout 15 s. Niepowodzenie = czerwony CI.
Na runnerze windows-latest WebView2 Runtime jest dostępny; jeśli nie, krok instaluje bootstrapper.
```

**D4.3 – Ścieżki WebView2**
```
Zadanie: UserDataFolder musi być w %LocalAppData%\Cuy\webview (zapisywalny), nie obok exe
(Program Files / strefa tylko do odczytu). Obsłuż: brak runtime (komunikat + link + opcja
auto-instalacji bootstrappera), uszkodzony profil (usuń folder i ponów raz), Windows N, brak
internetu przy instalacji. Dodaj komunikaty po polsku i angielsku.
```

**D4.4 – Kliknięcie w domek**
```
Zadanie: prześledź ścieżkę od kliknięcia domku do widocznego okna: zdarzenie, wątek, TopMost,
okno na ekranie (nie poza ekranem po zmianie DPI/monitorów), Show+Activate+BringToFront,
reentrancja (podwójne kliknięcie nie otwiera dwóch). Dodaj log "home-open: start/ok/fail".
```

## 7. Fala D5 – instalator i aktualizacje (E2, E7, E8)

**D5.1 – Instalator**
```
Zadanie: przeczytaj installer/Cuy.iss. Sprawdź: instalacja per-user (bez admina), aktualizacja
na istniejącej instalacji (AppId stały, zamykanie działającego Cuy przez CloseApplications),
zachowanie %AppData%\Cuy\save.json, odinstalowanie pyta o dane gry, skróty, autostart opcjonalny,
instalacja WebView2 gdy brak (pobranie z weryfikacją i kodem wyjścia, czytelny błąd przy braku sieci),
wersja w plikach zgodna z AssemblyInfo. Dodaj test: tools/qa/iss-lint.js (stała AppId, wersja).
```

**D5.2 – Test instalatora w CI**
```
Zadanie: w ci.yml dodaj job: zbuduj instalator, zainstaluj cicho (/VERYSILENT /SUPPRESSMSGBOXES),
uruchom Cuy.exe --selftest z katalogu instalacji, zainstaluj ponownie nowszą wersję (aktualizacja)
i sprawdź zachowanie save.json (plik testowy), odinstaluj cicho, sprawdź brak śladów w katalogu.
```

**D5.3 – Aktualizacja w grze**
```
Zadanie: sprawdź mechanizm aktualizacji z portable.zip: pobieranie z GitHub Releases, weryfikacja
SHA256SUMS.txt, bezpieczna podmiana (plik tymczasowy, rollback gdy błąd), komunikat o wersji,
brak crashu przy braku sieci / limicie API. Test na mocku serwera HTTP w testach Core.
```

**D5.4 – Proces release**
```
Zadanie: zaktualizuj .github/workflows/release.yml: krok sprawdzający, że wersja w AssemblyInfo,
Cuy.iss i tag są zgodne; krok "dry run" (publish=false) wymagany wcześniej dla tego commita
(sprawdzany przez API); po publikacji job sprawdza, że release nie jest draftem i ma 4 pliki
(Setup, portable.zip, Cuy.exe, SHA256SUMS.txt) i że SHA256 pasują. Opisz procedurę w docs/RELEASE.md,
w tym obejście blokady push tagów (workflow_dispatch z main).
```

## 8. Fala D6 – jakość wejścia (kompilacja i styl)

**D6.1 – Kompilacja przed pushem**
```
Zadanie: dodaj tools/precheck.ps1 (Windows) i tools/precheck.sh (Linux: tylko lint) wywoływane przez
hook git pre-push lub instrukcję w AGENTS.md: build + testy Core. Dla sesji bez dotnet: obowiązkowy
PR i czekanie na ci.yml przed merge (E10) – wpisz to do AGENTS.md jako zasadę.
```

**D6.2 – Analizatory**
```
Zadanie: włącz w Cuy.csproj i Core: <Nullable> tam gdzie bezpiecznie, TreatWarningsAsErrors dla
wybranych ostrzeżeń (CS8632, CS0168, CS0219, CA2000 jako warning), .editorconfig. Nie zmieniaj
logiki, popraw tylko ostrzeżenia.
```

## 9. Fala D7 – testy na prawdziwym Windowsie (ręczna lista + automat UI)

**D7.1 – Automat UI (FlaUI / SendInput) – smoke**
```
Zadanie: tools/ui-smoke/ (PowerShell + UIAutomation lub mały projekt FlaUI): uruchom Cuy,
sprawdź obecność okna peta, kliknij domek, sprawdź obecność okna Home (tytuł), zamknij,
przeciągnij peta i puść (SendInput), sprawdź po 3 s że Y peta == dół WorkingArea - Height + OffsetY
(±2 px). Uruchamiane na windows-latest w sesji interaktywnej (jeśli runner nie wspiera, zostaje jako
skrypt lokalny z instrukcją).
```

**D7.2 – Lista ręczna dla użytkownika (docs/QA_WINDOWS.md)**
```
Zadanie: napisz listę kontrolną krok po kroku (po polsku), każdy punkt z oczekiwanym wynikiem:
1 instalacja czysta, 2 aktualizacja z poprzedniej, 3 WebView2 brak (symulacja), 4 klik domku,
5 rzut poziomy / pionowy / po skosie, 6 lądowanie na pasku (stopy na krawędzi, brak lewitacji),
7 lądowanie na oknie, 8 przesuwanie okna pod świnką, 9 pasek zadań na górze / z lewej / z prawej / auto-ukrywany,
10 dwa monitory, 11 skala DPI 100/125/150/200%, 12 tryb pełnoekranowy gry w tle, 13 zmiana rozdzielczości,
14 uśpienie/wybudzenie, 15 pamięć po godzinie (Menedżer zadań), 16 zamknięcie i ponowny start (zapis).
Dodaj kolumnę "wynik" i miejsce na dołączenie cuy.log.
```

## 10. Fala D8 – środowiska brzegowe

**D8.1 – Pasek zadań i ekran**
```
Zadanie: ScreenArea i ground muszą działać dla paska na górze/bokach, auto-hide, wielu monitorów
o różnym DPI (PerMonitorV2 w manifeście). Sprawdź manifest app.manifest i ustawienia DPI w Program.cs.
Testy Core na funkcji wyliczającej ground z (Bounds, WorkingArea) dla 8 układów.
```

**D8.2 – Zasoby i stabilność**
```
Zadanie: przegląd wycieków: Image/Bitmap bez Dispose, timery, hooki SetWinEventHook (odpinane w
Dispose), GDI handles (liczba w logu CUY_PERF co minutę), zdarzenia SystemEvents (odpinane).
Test długiego uruchomienia: pętla 10 000 rzutów w teście integracyjnym (bez UI), stały zakres pamięci.
```

**D8.3 – Odporność na dane**
```
Zadanie: uszkodzony save.json (obcięty, zła wersja, puste pole) => start z kopią zapasową i komunikat,
nie crash. Testy Core: fuzz kilkudziesięciu mutacji pliku zapisu, migracje z poprzednich wersji.
```

## 11. Bramki przed release (obowiązkowe)

- **G1 Build:** ci.yml zielone (build, 1059+ testów, selftest, --diag, test otwarcia Home).
- **G2 Fizyka:** testy D1 zielone, `toss-perf` p95 <= 18 ms na maszynie referencyjnej (zapisany log w PR).
- **G3 Instalator:** job instalacji/aktualizacji/odinstalowania zielony.
- **G4 Człowiek:** użytkownik (lub tester) przechodzi `docs/QA_WINDOWS.md` punkty 1, 4, 5, 6, 9, 11 i oznacza OK.
- **G5 Release:** dry-run (publish=false) zielony → publish=true → job sprawdza 4 pliki i SHA256.

## 12. Kolejność i zależności

1. D0 (wszystkie 4 równolegle, rozłączne pliki; D0.1 przed D1 i D2.2).
2. D1 równolegle (4 sesje) po D0.1; D4 i D5 równolegle z D1 (inne pliki).
3. D2 po D0.2 i D0.1 (D2.1–D2.4 sekwencyjnie na FormPet.Motion.cs; D2.3 osobno na ShadowForm.cs).
4. D3 po D1 (żeby testy łapały regresje).
5. D6, D8 równolegle z D3.
6. D7 na końcu; G4 wykonuje człowiek.

Pliki wspólne (FormPet.cs, FormPet.Motion.cs) edytuje naraz tylko jedna sesja.

## 13. Raport koordynatora po każdej fali

```
Wypisz: które zadania zielone/czerwone, linki do uruchomień CI, wyniki toss-perf (min/p95/max),
lista nowych testów i ich liczba, otwarte ryzyka. Jeśli bramka czerwona – napraw przed następną falą.
Podbij wersję w AssemblyInfo.cs i Cuy.iss tylko przy release.
```

## 14. Otwarte decyzje (do rozstrzygnięcia w D3/D8)

- E9: pory dnia w powłoce Home: tint z zegara systemowego (rano/dzień/wieczór/noc) czy ręczny przełącznik; domyślnie zegar.
- Wersja docelowa fizyki: pozostać przy jednostkach eSheep (px/30 ms) – zapisane w docs/PHYSICS.md.
